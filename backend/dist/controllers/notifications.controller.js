"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crearNotificacion = exports.enviarSugerencia = exports.marcarTodasLeidas = exports.marcarLeida = exports.getMisNotificaciones = void 0;
const db_1 = require("../db");
// GET /api/notifications/mis — obtener notificaciones del usuario autenticado
const getMisNotificaciones = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ message: 'No autenticado' });
        const pool = await db_1.poolPromise;
        if (!pool)
            return res.status(500).json({ message: 'Error de BD' });
        const result = await pool.request()
            .input('userId', db_1.sql.Int, userId)
            .query(`SELECT id, tipo, titulo, contenido, leida, data_extra, creada_en
                    FROM Notificaciones WHERE usuario_id = @userId
                    ORDER BY creada_en DESC`);
        res.json(result.recordset);
    }
    catch (error) {
        console.error('Error getting notifications:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};
exports.getMisNotificaciones = getMisNotificaciones;
// PATCH /api/notifications/:id/read — marcar como leída
const marcarLeida = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ message: 'No autenticado' });
        const { id } = req.params;
        const pool = await db_1.poolPromise;
        if (!pool)
            return res.status(500).json({ message: 'Error de BD' });
        await pool.request()
            .input('id', db_1.sql.Int, parseInt(id))
            .input('userId', db_1.sql.Int, userId)
            .query('UPDATE Notificaciones SET leida = 1 WHERE id = @id AND usuario_id = @userId');
        res.json({ message: 'Notificación marcada como leída' });
    }
    catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};
exports.marcarLeida = marcarLeida;
// PATCH /api/notifications/read-all — marcar todas como leídas
const marcarTodasLeidas = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ message: 'No autenticado' });
        const pool = await db_1.poolPromise;
        if (!pool)
            return res.status(500).json({ message: 'Error de BD' });
        await pool.request()
            .input('userId', db_1.sql.Int, userId)
            .query('UPDATE Notificaciones SET leida = 1 WHERE usuario_id = @userId');
        res.json({ message: 'Todas marcadas como leídas' });
    }
    catch (error) {
        console.error('Error marking all as read:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};
exports.marcarTodasLeidas = marcarTodasLeidas;
// POST /api/notifications/sugerencia — oferente envía sugerencia a postulante
const enviarSugerencia = async (req, res) => {
    try {
        const oferenteId = req.user?.id;
        if (!oferenteId)
            return res.status(401).json({ message: 'No autenticado' });
        if (req.user?.role !== 'oferente')
            return res.status(403).json({ message: 'Solo oferentes pueden enviar sugerencias' });
        const { postulanteId } = req.body;
        if (!postulanteId)
            return res.status(400).json({ message: 'postulanteId requerido' });
        const pool = await db_1.poolPromise;
        if (!pool)
            return res.status(500).json({ message: 'Error de BD' });
        // Obtener nombre del oferente
        const oferenteResult = await pool.request()
            .input('id', db_1.sql.Int, oferenteId)
            .query(`SELECT pe.nombre_empresa FROM PerfilesEmpresas pe WHERE pe.usuario_id = @id`);
        const nombreEmpresa = oferenteResult.recordset[0]?.nombre_empresa || 'Una empresa';
        // Verificar que no se haya enviado ya una sugerencia
        const existente = await pool.request()
            .input('oferenteId', db_1.sql.Int, oferenteId)
            .input('postulanteId', db_1.sql.Int, parseInt(postulanteId))
            .query('SELECT id FROM SugerenciasContacto WHERE oferente_id = @oferenteId AND postulante_id = @postulanteId');
        if (existente.recordset.length > 0) {
            return res.status(409).json({ message: 'Ya enviaste una sugerencia a este candidato' });
        }
        // Guardar sugerencia
        await pool.request()
            .input('oferenteId', db_1.sql.Int, oferenteId)
            .input('postulanteId', db_1.sql.Int, parseInt(postulanteId))
            .input('mensaje', db_1.sql.NVarChar, `${nombreEmpresa} está interesada en tu perfil`)
            .query(`INSERT INTO SugerenciasContacto (oferente_id, postulante_id, mensaje) VALUES (@oferenteId, @postulanteId, @mensaje)`);
        // Crear notificación para el postulante
        await pool.request()
            .input('userId', db_1.sql.Int, parseInt(postulanteId))
            .input('tipo', db_1.sql.VarChar, 'interes_oferente')
            .input('titulo', db_1.sql.VarChar, `${nombreEmpresa} está interesada en vos`)
            .input('contenido', db_1.sql.NVarChar, 'Tocá aquí para ver el perfil de la empresa y enviar tu CV')
            .input('dataExtra', db_1.sql.NVarChar, JSON.stringify({ oferenteId }))
            .query(`INSERT INTO Notificaciones (usuario_id, tipo, titulo, contenido, data_extra) 
                    VALUES (@userId, @tipo, @titulo, @contenido, @dataExtra)`);
        res.json({ message: 'Sugerencia enviada exitosamente' });
    }
    catch (error) {
        console.error('Error sending suggestion:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};
exports.enviarSugerencia = enviarSugerencia;
// Función interna: crear notificación para un usuario
const crearNotificacion = async (pool, usuarioId, tipo, titulo, contenido, dataExtra) => {
    try {
        await pool.request()
            .input('userId', db_1.sql.Int, usuarioId)
            .input('tipo', db_1.sql.VarChar, tipo)
            .input('titulo', db_1.sql.VarChar, titulo)
            .input('contenido', db_1.sql.NVarChar, contenido)
            .input('dataExtra', db_1.sql.NVarChar, dataExtra ? JSON.stringify(dataExtra) : null)
            .query(`INSERT INTO Notificaciones (usuario_id, tipo, titulo, contenido, data_extra)
                    VALUES (@userId, @tipo, @titulo, @contenido, @dataExtra)`);
    }
    catch (e) {
        console.error('Error creating notification:', e);
    }
};
exports.crearNotificacion = crearNotificacion;
