import { Request, Response } from 'express';
import { poolPromise, sql } from '../db';
import { AuthRequest } from '../middleware/auth.middleware';
import { crearNotificacion } from './notifications.controller';

// GET /api/candidates/search — búsqueda pública de candidatos para oferentes
export const searchCandidates = async (req: AuthRequest, res: Response) => {
    try {
        const { query, habilidades, profesion, experienciaFilter } = req.query as Record<string, string>;

        const pool = await poolPromise;
        if (!pool) return res.status(500).json({ message: 'Error de BD' });

        let sqlQuery = `
            SELECT 
                pp.id,
                pp.usuario_id,
                pp.nombre,
                pp.apellido,
                pp.habilidades,
                pp.experiencia,
                pp.cv_url,
                u.email
            FROM PerfilesPostulantes pp
            INNER JOIN Usuarios u ON pp.usuario_id = u.id
            WHERE pp.es_publico = 1
        `;

        const request = pool.request();

        if (query) {
            sqlQuery += ` AND (pp.nombre LIKE @query OR pp.apellido LIKE @query OR pp.habilidades LIKE @query OR pp.experiencia LIKE @query)`;
            request.input('query', sql.VarChar, `%${query}%`);
        }
        if (habilidades) {
            sqlQuery += ` AND pp.habilidades LIKE @habilidades`;
            request.input('habilidades', sql.VarChar, `%${habilidades}%`);
        }
        if (profesion) {
            sqlQuery += ` AND pp.experiencia LIKE @profesion`;
            request.input('profesion', sql.VarChar, `%${profesion}%`);
        }
        // Since both profession and experience use the "experiencia" field or CV text right now,
        // we'll apply it to 'experiencia' and 'habilidades' for a wider match
        if (experienciaFilter) {
            sqlQuery += ` AND (pp.experiencia LIKE @experienciaFiltro OR pp.habilidades LIKE @experienciaFiltro)`;
            request.input('experienciaFiltro', sql.VarChar, `%${experienciaFilter}%`);
        }

        sqlQuery += ` ORDER BY pp.id DESC`;
        const result = await request.query(sqlQuery);

        // Perfil público anónimo: iniciales del nombre
        const candidatos = result.recordset.map((c: any) => ({
            id: c.id,
            usuario_id: c.usuario_id,
            nombre: c.nombre ? c.nombre[0] + '.' : 'A.',
            apellido: c.apellido ? c.apellido[0] + '.' : '',
            habilidades: c.habilidades,
            experiencia: c.experiencia,
            // Email completo para poder contactar por fuera, según el pedido
            emailParcial: c.email || '',
        }));

        res.json(candidatos);
    } catch (error) {
        console.error('Error searching candidates:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// GET /api/candidates/for-offer/:offerId — candidatos que se postularon (datos COMPLETOS)
export const getCandidatesForOffer = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'No autenticado' });

        const { offerId } = req.params;
        const pool = await poolPromise;
        if (!pool) return res.status(500).json({ message: 'Error de BD' });

        // Solo se puede ver si la oferta pertenece a este usuario oferente
        const offerCheck = await pool.request()
            .input('offerId', sql.Int, parseInt(offerId))
            .input('userId', sql.Int, userId)
            .query(`SELECT o.Id FROM Offers o
                    INNER JOIN PerfilesEmpresas pe ON pe.usuario_id = @userId
                    WHERE o.Id = @offerId`);

        if (offerCheck.recordset.length === 0) {
            return res.status(403).json({ message: 'No autorizado para ver esta oferta' });
        }

        const result = await pool.request()
            .input('offerId', sql.Int, parseInt(offerId))
            .query(`SELECT 
                    pp.id as candidatoId,
                    pp.nombre,
                    pp.apellido,
                    pp.habilidades,
                    pp.experiencia,
                    pp.cv_url,
                    pp.telefono,
                    u.email
                FROM Applications a
                INNER JOIN Usuarios u ON a.userId = u.id
                INNER JOIN PerfilesPostulantes pp ON pp.usuario_id = u.id
                WHERE a.offerId = @offerId
                ORDER BY a.createdAt DESC`);

        res.json(result.recordset);
    } catch (error) {
        console.error('Error getting candidates for offer:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// POST /api/candidates/postular — postulante se postula a una oferta
export const postularAOferta = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'No autenticado' });
        if (req.user?.role !== 'postulante') return res.status(403).json({ message: 'Solo postulantes pueden postularse' });

        const { offerId } = req.body;
        if (!offerId) return res.status(400).json({ message: 'offerId requerido' });

        const pool = await poolPromise;
        if (!pool) return res.status(500).json({ message: 'Error de BD' });

        // Verificar postulación duplicada
        const existente = await pool.request()
            .input('userId', sql.Int, userId)
            .input('offerId', sql.Int, offerId)
            .query('SELECT id FROM Applications WHERE userId = @userId AND offerId = @offerId');

        if (existente.recordset.length > 0) {
            return res.status(409).json({ message: 'Ya te postulaste a esta oferta' });
        }

        await pool.request()
            .input('userId', sql.Int, userId)
            .input('offerId', sql.Int, offerId)
            .query('INSERT INTO Applications (userId, offerId) VALUES (@userId, @offerId)');

        // Notificar al oferente
        try {
            const offerResult = await pool.request()
                .input('offerId', sql.Int, offerId)
                .query(`SELECT o.title, pe.usuario_id as oferenteUserId
                        FROM Offers o
                        INNER JOIN PerfilesEmpresas pe ON pe.usuario_id = o.CompanyId
                        WHERE o.Id = @offerId`);

            if (offerResult.recordset.length > 0) {
                const { title, oferenteUserId } = offerResult.recordset[0];
                const ppRes = await pool.request()
                    .input('userId', sql.Int, userId)
                    .query('SELECT nombre, apellido FROM PerfilesPostulantes WHERE usuario_id = @userId');
                const pp = ppRes.recordset[0];
                const nombre = pp ? `${pp.nombre} ${pp.apellido}` : 'Un candidato';

                await crearNotificacion(pool, oferenteUserId, 'nueva_postulacion',
                    `Nueva postulación a "${title}"`,
                    `${nombre} se postuló a tu oferta. Revisá tu panel.`,
                    { offerId, postulanteId: userId }
                );
            }
        } catch (e) {
            console.error('Error notifying offer owner:', e);
        }

        res.status(201).json({ message: 'Postulación enviada exitosamente' });
    } catch (error) {
        console.error('Error posting application:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// GET /api/candidates/oferente/:id — perfil público del oferente (para PerfilOferente page)
export const getPerfilOferente = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const pool = await poolPromise;
        if (!pool) return res.status(500).json({ message: 'Error de BD' });

        const result = await pool.request()
            .input('id', sql.Int, parseInt(id))
            .query(`SELECT pe.nombre_empresa, pe.descripcion, pe.ubicacion, pe.sitio_web
                    FROM PerfilesEmpresas pe WHERE pe.usuario_id = @id`);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Perfil no encontrado' });
        }

        res.json(result.recordset[0]);
    } catch (error) {
        console.error('Error getting employer profile:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};