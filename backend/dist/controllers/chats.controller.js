"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bloquearUsuario = exports.obtenerMensajes = exports.obtenerChats = exports.enviarMensaje = exports.sugerirMensajeReclutamiento = void 0;
const db_1 = require("../db");
const notifications_controller_1 = require("./notifications.controller");
const genai_1 = require("@google/genai");
const ai = new genai_1.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
// Iniciar un chat (Oferente) y/o sugerir mensajes
const sugerirMensajeReclutamiento = async (req, res) => {
    try {
        const { ofertaId, postulanteId } = req.body;
        const oferenteId = req.user?.id;
        if (!oferenteId || req.user?.role !== 'oferente') {
            return res.status(403).json({ message: 'Solo oferentes pueden usar esto' });
        }
        const pool = await db_1.poolPromise;
        if (!pool)
            return res.status(500).json({ message: 'Error de BD' });
        // Obtener datos de la oferta
        const ofertaRes = await pool.request()
            .input('ofertaId', db_1.sql.Int, ofertaId)
            .query('SELECT titulo, descripcion, empresa_id FROM Ofertas WHERE id = @ofertaId');
        if (ofertaRes.recordset.length === 0)
            return res.status(404).json({ message: 'Oferta no encontrada' });
        const oferta = ofertaRes.recordset[0];
        // Obtener datos de la empresa
        const empresaRes = await pool.request()
            .input('empresaId', db_1.sql.Int, oferta.empresa_id)
            .query('SELECT nombre_empresa FROM PerfilesEmpresas WHERE id = @empresaId');
        const nombreEmpresa = empresaRes.recordset[0]?.nombre_empresa || 'la empresa';
        // Obtener datos del postulante
        const postRes = await pool.request()
            .input('postulanteId', db_1.sql.Int, postulanteId)
            .query('SELECT nombre FROM PerfilesPostulantes WHERE usuario_id = @postulanteId');
        const nombrePostulante = postRes.recordset[0]?.nombre || 'Candidato';
        // IA prompt
        const prompt = `Actúa como un reclutador profesional de la empresa "${nombreEmpresa}". 
        Estás buscando reclutar a "${nombrePostulante}" para el puesto de "${oferta.titulo}". 
        Descripción del puesto: "${oferta.descripcion}".
        
        Genera 3 opciones cortas, amigables y profesionales (máximo 2 líneas cada una) para enviar como primer mensaje de chat al candidato, invitándolo a conversar sobre el puesto.
        Separa las opciones con '|||'. No agregues texto adicional, solo las opciones.`;
        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: prompt,
        });
        // @ts-ignore - The SDK types might have text as string or function
        const textResponse = typeof response.text === 'function' ? response.text() : (response.text || '');
        const opciones = textResponse.split('|||').map((s) => s.trim()).filter((s) => s);
        res.json({ sugerencias: opciones });
    }
    catch (error) {
        console.error('Error sugiriendo mensaje:', error);
        res.status(500).json({ message: 'Error interno' });
    }
};
exports.sugerirMensajeReclutamiento = sugerirMensajeReclutamiento;
const enviarMensaje = async (req, res) => {
    try {
        const { receptorId, ofertaId, contenido } = req.body;
        const remitenteId = req.user?.id;
        if (!remitenteId)
            return res.status(401).json({ message: 'No autenticado' });
        const pool = await db_1.poolPromise;
        if (!pool)
            return res.status(500).json({ message: 'Error de BD' });
        // Verificar si hay bloqueo
        const blockRes = await pool.request()
            .input('r1', db_1.sql.Int, remitenteId)
            .input('r2', db_1.sql.Int, receptorId)
            .query(`SELECT 1 FROM Bloqueos WHERE 
                (bloqueador_id = @r1 AND bloqueado_id = @r2) OR 
                (bloqueador_id = @r2 AND bloqueado_id = @r1)`);
        if (blockRes.recordset.length > 0) {
            return res.status(403).json({ message: 'No puedes enviar mensajes a este usuario' });
        }
        // Buscar o crear chat
        let chatId = req.body.chatId;
        if (!chatId) {
            // Buscar si ya existe el chat entre ambos para esa oferta
            const chatRes = await pool.request()
                .input('rem', db_1.sql.Int, remitenteId)
                .input('rec', db_1.sql.Int, receptorId)
                .input('oferta', db_1.sql.Int, ofertaId || null)
                .query(`SELECT id FROM Chats WHERE 
                    ((oferente_id = @rem AND postulante_id = @rec) OR 
                     (oferente_id = @rec AND postulante_id = @rem)) 
                    AND (oferta_id = @oferta OR (@oferta IS NULL AND oferta_id IS NULL))`);
            if (chatRes.recordset.length > 0) {
                chatId = chatRes.recordset[0].id;
            }
            else {
                // Crear nuevo chat
                // Determinamos quién es el oferente (el que inicia el chat, según req.user.role)
                const oferenteId = req.user?.role === 'oferente' ? remitenteId : receptorId;
                const postulanteId = req.user?.role === 'oferente' ? receptorId : remitenteId;
                const newChat = await pool.request()
                    .input('oferenteId', db_1.sql.Int, oferenteId)
                    .input('postulanteId', db_1.sql.Int, postulanteId)
                    .input('ofertaId', db_1.sql.Int, ofertaId || null)
                    .query(`INSERT INTO Chats (oferente_id, postulante_id, oferta_id) 
                            OUTPUT INSERTED.id 
                            VALUES (@oferenteId, @postulanteId, @ofertaId)`);
                chatId = newChat.recordset[0].id;
            }
        }
        // Insertar mensaje
        await pool.request()
            .input('chatId', db_1.sql.Int, chatId)
            .input('remitenteId', db_1.sql.Int, remitenteId)
            .input('contenido', db_1.sql.NVarChar, contenido)
            .query(`INSERT INTO Mensajes (chat_id, remitente_id, contenido) 
                    VALUES (@chatId, @remitenteId, @contenido);
                    UPDATE Chats SET ultimo_mensaje_fecha = GETDATE() WHERE id = @chatId;`);
        // Notificar al receptor
        const userName = req.user?.role === 'oferente' ? 'Un oferente' : 'Un candidato'; // Mejorar con nombre real
        await (0, notifications_controller_1.crearNotificacion)(pool, receptorId, 'nuevo_mensaje', 'Nuevo mensaje', `${userName} te ha enviado un mensaje`, { chatId });
        res.status(201).json({ message: 'Mensaje enviado', chatId });
    }
    catch (error) {
        console.error('Error enviando mensaje:', error);
        res.status(500).json({ message: 'Error interno' });
    }
};
exports.enviarMensaje = enviarMensaje;
const obtenerChats = async (req, res) => {
    try {
        const userId = req.user?.id;
        const role = req.user?.role;
        if (!userId)
            return res.status(401).json({ message: 'No autenticado' });
        const pool = await db_1.poolPromise;
        if (!pool)
            return res.status(500).json({ message: 'Error de BD' });
        // Mostrar con quién estoy chateando
        const query = `
            SELECT c.id as chat_id, c.ultimo_mensaje_fecha, c.oferta_id, o.titulo as oferta_titulo,
                   u.id as otro_usuario_id,
                   ISNULL(pe.nombre_empresa, pp.nombre + ' ' + pp.apellido) as otro_usuario_nombre,
                   ISNULL(pe.logo_url, pp.foto_url) as otro_usuario_foto,
                   (SELECT TOP 1 contenido FROM Mensajes m WHERE m.chat_id = c.id ORDER BY creado_en DESC) as ultimo_mensaje,
                   (SELECT COUNT(*) FROM Mensajes m WHERE m.chat_id = c.id AND m.leido = 0 AND m.remitente_id != @userId) as no_leidos
            FROM Chats c
            LEFT JOIN Ofertas o ON c.oferta_id = o.id
            INNER JOIN Usuarios u ON u.id = CASE WHEN c.oferente_id = @userId THEN c.postulante_id ELSE c.oferente_id END
            LEFT JOIN PerfilesEmpresas pe ON pe.usuario_id = u.id AND u.rol = 'oferente'
            LEFT JOIN PerfilesPostulantes pp ON pp.usuario_id = u.id AND u.rol = 'postulante'
            WHERE c.oferente_id = @userId OR c.postulante_id = @userId
            ORDER BY c.ultimo_mensaje_fecha DESC
        `;
        const result = await pool.request()
            .input('userId', db_1.sql.Int, userId)
            .query(query);
        res.json(result.recordset);
    }
    catch (error) {
        console.error('Error obteniendo chats:', error);
        res.status(500).json({ message: 'Error interno' });
    }
};
exports.obtenerChats = obtenerChats;
const obtenerMensajes = async (req, res) => {
    try {
        const userId = req.user?.id;
        const chatId = req.params.chatId;
        if (!userId)
            return res.status(401).json({ message: 'No autenticado' });
        const pool = await db_1.poolPromise;
        if (!pool)
            return res.status(500).json({ message: 'Error de BD' });
        // Verificar acceso al chat
        const chatCheck = await pool.request()
            .input('chatId', db_1.sql.Int, chatId)
            .input('userId', db_1.sql.Int, userId)
            .query('SELECT 1 FROM Chats WHERE id = @chatId AND (oferente_id = @userId OR postulante_id = @userId)');
        if (chatCheck.recordset.length === 0)
            return res.status(403).json({ message: 'Acceso denegado' });
        // Marcar como leidos
        await pool.request()
            .input('chatId', db_1.sql.Int, chatId)
            .input('userId', db_1.sql.Int, userId)
            .query('UPDATE Mensajes SET leido = 1 WHERE chat_id = @chatId AND remitente_id != @userId');
        const msjs = await pool.request()
            .input('chatId', db_1.sql.Int, chatId)
            .query(`SELECT id, remitente_id, contenido, creado_en, leido 
                    FROM Mensajes WHERE chat_id = @chatId ORDER BY creado_en ASC`);
        res.json(msjs.recordset);
    }
    catch (error) {
        console.error('Error obteniendo mensajes:', error);
        res.status(500).json({ message: 'Error interno' });
    }
};
exports.obtenerMensajes = obtenerMensajes;
const bloquearUsuario = async (req, res) => {
    try {
        const bloqueadorId = req.user?.id;
        const { bloqueadoId } = req.body;
        if (!bloqueadorId)
            return res.status(401).json({ message: 'No autenticado' });
        const pool = await db_1.poolPromise;
        if (!pool)
            return res.status(500).json({ message: 'Error de BD' });
        await pool.request()
            .input('b1', db_1.sql.Int, bloqueadorId)
            .input('b2', db_1.sql.Int, bloqueadoId)
            .query(`IF NOT EXISTS (SELECT 1 FROM Bloqueos WHERE bloqueador_id = @b1 AND bloqueado_id = @b2)
                    INSERT INTO Bloqueos (bloqueador_id, bloqueado_id) VALUES (@b1, @b2)`);
        res.json({ message: 'Usuario bloqueado' });
    }
    catch (error) {
        console.error('Error bloqueando usuario:', error);
        res.status(500).json({ message: 'Error interno' });
    }
};
exports.bloquearUsuario = bloquearUsuario;
