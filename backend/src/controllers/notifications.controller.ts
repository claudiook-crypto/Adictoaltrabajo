import { Request, Response } from 'express';
import { poolPromise, sql } from '../db';
import { AuthRequest } from '../middleware/auth.middleware';

// GET /api/notifications/mis — obtener notificaciones del usuario autenticado
export const getMisNotificaciones = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'No autenticado' });

        const pool = await poolPromise;
        if (!pool) return res.status(500).json({ message: 'Error de BD' });

        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`SELECT id, tipo, titulo, contenido, leida, data_extra, creada_en
                    FROM Notificaciones WHERE usuario_id = @userId
                    ORDER BY creada_en DESC`);

        res.json(result.recordset);
    } catch (error) {
        console.error('Error getting notifications:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// PATCH /api/notifications/:id/read — marcar como leída
export const marcarLeida = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'No autenticado' });

        const { id } = req.params;
        const pool = await poolPromise;
        if (!pool) return res.status(500).json({ message: 'Error de BD' });

        await pool.request()
            .input('id', sql.Int, parseInt(id))
            .input('userId', sql.Int, userId)
            .query('UPDATE Notificaciones SET leida = 1 WHERE id = @id AND usuario_id = @userId');

        res.json({ message: 'Notificación marcada como leída' });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// PATCH /api/notifications/read-all — marcar todas como leídas
export const marcarTodasLeidas = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'No autenticado' });

        const pool = await poolPromise;
        if (!pool) return res.status(500).json({ message: 'Error de BD' });

        await pool.request()
            .input('userId', sql.Int, userId)
            .query('UPDATE Notificaciones SET leida = 1 WHERE usuario_id = @userId');

        res.json({ message: 'Todas marcadas como leídas' });
    } catch (error) {
        console.error('Error marking all as read:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// POST /api/notifications/sugerencia — oferente envía sugerencia a postulante
export const enviarSugerencia = async (req: AuthRequest, res: Response) => {
    try {
        const oferenteId = req.user?.id;
        if (!oferenteId) return res.status(401).json({ message: 'No autenticado' });
        if (req.user?.role !== 'oferente') return res.status(403).json({ message: 'Solo oferentes pueden enviar sugerencias' });

        const { postulanteId } = req.body;
        if (!postulanteId) return res.status(400).json({ message: 'postulanteId requerido' });

        const pool = await poolPromise;
        if (!pool) return res.status(500).json({ message: 'Error de BD' });

        // Obtener info del oferente
        const oferenteResult = await pool.request()
            .input('id', sql.Int, oferenteId)
            .query(`SELECT pe.nombre_empresa, pe.ubicacion, pe.descripcion, u.avatar 
                    FROM PerfilesEmpresas pe 
                    LEFT JOIN Usuarios u ON pe.usuario_id = u.id 
                    WHERE pe.usuario_id = @id`);

        const empresa = oferenteResult.recordset[0];
        const nombreEmpresa = empresa?.nombre_empresa || 'Una empresa';

        // Verificar que no se haya enviado ya una sugerencia
        const existente = await pool.request()
            .input('oferenteId', sql.Int, oferenteId)
            .input('postulanteId', sql.Int, parseInt(postulanteId))
            .query('SELECT id FROM SugerenciasContacto WHERE oferente_id = @oferenteId AND postulante_id = @postulanteId');

        if (existente.recordset.length > 0) {
            return res.status(409).json({ message: 'Ya enviaste una sugerencia a este candidato' });
        }

        // Guardar sugerencia
        await pool.request()
            .input('oferenteId', sql.Int, oferenteId)
            .input('postulanteId', sql.Int, parseInt(postulanteId))
            .input('mensaje', sql.NVarChar, `${nombreEmpresa} está interesada en tu perfil`)
            .query(`INSERT INTO SugerenciasContacto (oferente_id, postulante_id, mensaje) VALUES (@oferenteId, @postulanteId, @mensaje)`);

        // Crear notificación para el postulante
        await pool.request()
            .input('userId', sql.Int, parseInt(postulanteId))
            .input('tipo', sql.VarChar, 'interes_oferente')
            .input('titulo', sql.VarChar, `${nombreEmpresa} está interesada en vos`)
            .input('contenido', sql.NVarChar, 'Tocá aquí para ver el perfil de la empresa y enviar tu CV')
            .input('dataExtra', sql.NVarChar, JSON.stringify({ 
                oferenteId,
                nombreEmpresa,
                ubicacion: empresa?.ubicacion || '',
                descripcion: empresa?.descripcion ? empresa.descripcion.substring(0, 120) + '...' : '',
                avatar: empresa?.avatar || ''
            }))
            .query(`INSERT INTO Notificaciones (usuario_id, tipo, titulo, contenido, data_extra) 
                    VALUES (@userId, @tipo, @titulo, @contenido, @dataExtra)`);

        res.json({ message: 'Sugerencia enviada exitosamente' });
    } catch (error) {
        console.error('Error sending suggestion:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// Función interna: crear notificación para un usuario
export const crearNotificacion = async (
    pool: any,
    usuarioId: number,
    tipo: string,
    titulo: string,
    contenido: string,
    dataExtra?: object
) => {
    try {
        await pool.request()
            .input('userId', sql.Int, usuarioId)
            .input('tipo', sql.VarChar, tipo)
            .input('titulo', sql.VarChar, titulo)
            .input('contenido', sql.NVarChar, contenido)
            .input('dataExtra', sql.NVarChar, dataExtra ? JSON.stringify(dataExtra) : null)
            .query(`INSERT INTO Notificaciones (usuario_id, tipo, titulo, contenido, data_extra)
                    VALUES (@userId, @tipo, @titulo, @contenido, @dataExtra)`);
    } catch (e) {
        console.error('Error creating notification:', e);
    }
};


// POST /api/notifications/sugerencia/responder - Postulante envía su CV
export const responderSugerencia = async (req: AuthRequest, res: Response) => {
    try {
        const postulanteId = req.user?.id;
        if (!postulanteId) return res.status(401).json({ message: 'No autenticado' });

        const { oferenteId } = req.body;
        let { cvUrl } = req.body;
        if (!oferenteId) return res.status(400).json({ message: 'oferenteId requerido' });

        const pool = await poolPromise;
        if (!pool) return res.status(500).json({ message: 'Error de BD' });

        // Si no se envió cvUrl, buscar el CV del perfil del postulante
        if (!cvUrl) {
            const cvResult = await pool.request()
                .input('postulanteId', sql.Int, postulanteId)
                .query('SELECT cv_url FROM PerfilesPostulantes WHERE usuario_id = @postulanteId');
            cvUrl = cvResult.recordset[0]?.cv_url;
        }

        if (!cvUrl) {
            return res.status(400).json({ message: 'No tenés un CV cargado. Subí uno primero desde tu perfil o seleccioná un archivo.' });
        }

        // Marcar la sugerencia como aceptada y guardar CV
        await pool.request()
            .input('oferenteId', sql.Int, parseInt(oferenteId))
            .input('postulanteId', sql.Int, postulanteId)
            .input('cvUrl', sql.NVarChar, cvUrl)
            .query(`UPDATE SugerenciasContacto 
                    SET estado = 'Aceptada', cv_url = @cvUrl 
                    WHERE oferente_id = @oferenteId AND postulante_id = @postulanteId`);

        // Notificar al oferente - usar PerfilesPostulantes para el nombre
        const postResult = await pool.request()
            .input('id', sql.Int, postulanteId)
            .query(`SELECT nombre, apellido FROM PerfilesPostulantes WHERE usuario_id = @id`);
        const pp = postResult.recordset[0];
        const nombre = pp ? `${pp.nombre} ${pp.apellido || ''}`.trim() : 'Un candidato';
        
        await crearNotificacion(pool, parseInt(oferenteId), 'cv_recibido', 'CV Recibido', `${nombre} ha enviado su CV a tu sugerencia`, { postulanteId });

        res.json({ message: 'CV enviado exitosamente' });
    } catch (error) {
        console.error('Error responding suggestion:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// GET /api/notifications/sugerencias/oferente - Obtener sugerencias aceptadas
export const getRespuestasSugerencias = async (req: AuthRequest, res: Response) => {
    try {
        const oferenteId = req.user?.id;
        if (!oferenteId) return res.status(401).json({ message: 'No autenticado' });

        const pool = await poolPromise;
        if (!pool) return res.status(500).json({ message: 'Error de BD' });

        const result = await pool.request()
            .input('oferenteId', sql.Int, oferenteId)
            .query(`SELECT s.id, s.postulante_id, s.cv_url, s.estado, s.creada_en,
                           u.email,
                           p.nombre, p.apellido, p.habilidades, p.experiencia, p.foto_url
                    FROM SugerenciasContacto s
                    JOIN Usuarios u ON s.postulante_id = u.id
                    LEFT JOIN PerfilesPostulantes p ON u.id = p.usuario_id
                    WHERE s.oferente_id = @oferenteId AND s.estado = 'Aceptada'
                    ORDER BY s.creada_en DESC`);

        res.json(result.recordset);
    } catch (error) {
        console.error('Error getting responses:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};
// GET /api/notifications/sugerencia/:oferenteId/estado
export const getEstadoSugerencia = async (req: AuthRequest, res: Response) => {
    try {
        const postulanteId = req.user?.id;
        if (!postulanteId) return res.status(401).json({ message: 'No autenticado' });

        const { oferenteId } = req.params;
        const pool = await poolPromise;
        if (!pool) return res.status(500).json({ message: 'Error de BD' });

        const result = await pool.request()
            .input('oferenteId', sql.Int, parseInt(oferenteId))
            .input('postulanteId', sql.Int, postulanteId)
            .query(`SELECT estado FROM SugerenciasContacto WHERE oferente_id = @oferenteId AND postulante_id = @postulanteId`);

        if (result.recordset.length > 0) {
            res.json({ estado: result.recordset[0].estado });
        } else {
            res.json({ estado: null });
        }
    } catch (error) {
        console.error('Error getting status:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// GET /api/notifications/sugerencias/enviadas - Get postulante IDs the oferente has sent suggestions to
export const getSugerenciasEnviadas = async (req: AuthRequest, res: Response) => {
    try {
        const oferenteId = req.user?.id;
        if (!oferenteId) return res.status(401).json({ message: 'No autenticado' });

        const pool = await poolPromise;
        if (!pool) return res.status(500).json({ message: 'Error de BD' });

        const result = await pool.request()
            .input('oferenteId', sql.Int, oferenteId)
            .query('SELECT postulante_id FROM SugerenciasContacto WHERE oferente_id = @oferenteId');

        const ids = result.recordset.map((r: any) => r.postulante_id);
        res.json({ postulanteIds: ids });
    } catch (error) {
        console.error('Error getting sent suggestions:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};
