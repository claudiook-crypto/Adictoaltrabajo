import { Response } from 'express';
import { poolPromise, sql } from '../db';
import { AuthRequest } from '../middleware/auth.middleware';
import { crearNotificacion } from './notifications.controller';

// ─────────────────────────────────────────────────────────────────
// GET /api/ofertas/publicas — listado público de ofertas (postulantes)
// ─────────────────────────────────────────────────────────────────
export const getOfertasPublicas = async (req: AuthRequest, res: Response) => {
    try {
        const { query, zona, modalidad, categoria, salarioMin, salarioMax, experiencia } =
            req.query as Record<string, string>;

        const pool = await poolPromise;
        if (!pool) return res.status(500).json({ message: 'Error de BD' });

        let sqlQuery = `
            SELECT
                o.id,
                o.titulo,
                o.descripcion,
                o.zona,
                o.modalidad,
                o.tipo_contrato,
                o.experiencia,
                o.categoria,
                o.salario,
                o.salario_valor,
                o.estado,
                o.creado_en,
                pe.nombre_empresa as empresa,
                pe.descripcion    as empresa_descripcion,
                pe.usuario_id     as empresa_usuario_id
            FROM Ofertas o
            INNER JOIN PerfilesEmpresas pe ON pe.id = o.empresa_id
            WHERE o.estado = 'Activa'
        `;

        const request = pool.request();

        if (query) {
            sqlQuery += ` AND (o.titulo LIKE @query OR o.descripcion LIKE @query OR pe.nombre_empresa LIKE @query)`;
            request.input('query', sql.NVarChar, `%${query}%`);
        }
        if (zona && zona !== 'Todas') {
            sqlQuery += ` AND o.zona = @zona`;
            request.input('zona', sql.NVarChar, zona);
        }
        if (modalidad) {
            sqlQuery += ` AND o.modalidad = @modalidad`;
            request.input('modalidad', sql.NVarChar, modalidad);
        }
        if (categoria && categoria !== 'Todas') {
            sqlQuery += ` AND o.categoria = @categoria`;
            request.input('categoria', sql.NVarChar, categoria);
        }
        if (experiencia && experiencia !== 'Todas') {
            sqlQuery += ` AND o.experiencia = @experiencia`;
            request.input('experiencia', sql.NVarChar, experiencia);
        }
        if (salarioMin) {
            sqlQuery += ` AND (o.salario_valor >= @salarioMin OR o.salario_valor = 0)`;
            request.input('salarioMin', sql.Int, parseInt(salarioMin));
        }
        if (salarioMax) {
            sqlQuery += ` AND o.salario_valor <= @salarioMax`;
            request.input('salarioMax', sql.Int, parseInt(salarioMax));
        }

        sqlQuery += ` ORDER BY o.creado_en DESC`;
        const result = await request.query(sqlQuery);
        res.json(result.recordset);
    } catch (error) {
        console.error('Error getting public offers:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// ─────────────────────────────────────────────────────────────────
// GET /api/ofertas/mis-ofertas — ofertas del oferente autenticado
// ─────────────────────────────────────────────────────────────────
export const getMisOfertas = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'No autenticado' });

        const pool = await poolPromise;
        if (!pool) return res.status(500).json({ message: 'Error de BD' });

        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT
                    o.id,
                    o.titulo,
                    o.descripcion,
                    o.zona,
                    o.modalidad,
                    o.tipo_contrato,
                    o.experiencia,
                    o.categoria,
                    o.salario,
                    o.salario_valor,
                    o.estado,
                    o.creado_en,
                    (SELECT COUNT(*) FROM Postulaciones p WHERE p.oferta_id = o.id) as total_postulantes
                FROM Ofertas o
                INNER JOIN PerfilesEmpresas pe ON pe.id = o.empresa_id
                WHERE pe.usuario_id = @userId
                ORDER BY o.creado_en DESC
            `);

        res.json(result.recordset);
    } catch (error) {
        console.error('Error getting my offers:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// ─────────────────────────────────────────────────────────────────
// POST /api/ofertas — crear una oferta nueva (oferente)
// ─────────────────────────────────────────────────────────────────
export const crearOferta = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'No autenticado' });
        if (req.user?.role !== 'oferente') return res.status(403).json({ message: 'Solo oferentes pueden publicar ofertas' });

        const { titulo, descripcion, zona, modalidad, tipoContrato, experiencia, categoria, salario, salarioValor } = req.body;

        if (!titulo || !descripcion) {
            return res.status(400).json({ message: 'Título y descripción son obligatorios' });
        }

        const pool = await poolPromise;
        if (!pool) return res.status(500).json({ message: 'Error de BD' });

        // Obtener empresa_id a partir del usuario
        const empresaResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query('SELECT id FROM PerfilesEmpresas WHERE usuario_id = @userId');

        if (empresaResult.recordset.length === 0) {
            return res.status(404).json({ message: 'Perfil de empresa no encontrado' });
        }

        const empresaId = empresaResult.recordset[0].id;

        const insertResult = await pool.request()
            .input('empresaId',    sql.Int,      empresaId)
            .input('titulo',       sql.NVarChar,  titulo)
            .input('descripcion',  sql.NVarChar,  descripcion)
            .input('zona',         sql.NVarChar,  zona || null)
            .input('modalidad',    sql.NVarChar,  modalidad || null)
            .input('tipoContrato', sql.NVarChar,  tipoContrato || null)
            .input('experiencia',  sql.NVarChar,  experiencia || null)
            .input('categoria',    sql.NVarChar,  categoria || null)
            .input('salario',      sql.NVarChar,  salario || null)
            .input('salarioValor', sql.Int,        salarioValor || 0)
            .query(`
                INSERT INTO Ofertas
                    (empresa_id, titulo, descripcion, zona, modalidad, tipo_contrato,
                     experiencia, categoria, salario, salario_valor)
                OUTPUT INSERTED.id
                VALUES
                    (@empresaId, @titulo, @descripcion, @zona, @modalidad, @tipoContrato,
                     @experiencia, @categoria, @salario, @salarioValor)
            `);

        res.status(201).json({
            message: 'Oferta creada exitosamente',
            id: insertResult.recordset[0].id
        });
    } catch (error) {
        console.error('Error creating offer:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// ─────────────────────────────────────────────────────────────────
// PUT /api/ofertas/:id — editar una oferta (oferente dueño)
// ─────────────────────────────────────────────────────────────────
export const editarOferta = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'No autenticado' });

        const { id } = req.params;
        const { titulo, descripcion, zona, modalidad, tipoContrato, experiencia, categoria, salario, salarioValor, estado } = req.body;

        const pool = await poolPromise;
        if (!pool) return res.status(500).json({ message: 'Error de BD' });

        // Verificar que la oferta pertenece al oferente
        const check = await pool.request()
            .input('id', sql.Int, parseInt(id))
            .input('userId', sql.Int, userId)
            .query(`SELECT o.id FROM Ofertas o
                    INNER JOIN PerfilesEmpresas pe ON pe.id = o.empresa_id
                    WHERE o.id = @id AND pe.usuario_id = @userId`);

        if (check.recordset.length === 0) {
            return res.status(403).json({ message: 'No autorizado para editar esta oferta' });
        }

        await pool.request()
            .input('id',           sql.Int,      parseInt(id))
            .input('titulo',       sql.NVarChar,  titulo)
            .input('descripcion',  sql.NVarChar,  descripcion)
            .input('zona',         sql.NVarChar,  zona || null)
            .input('modalidad',    sql.NVarChar,  modalidad || null)
            .input('tipoContrato', sql.NVarChar,  tipoContrato || null)
            .input('experiencia',  sql.NVarChar,  experiencia || null)
            .input('categoria',    sql.NVarChar,  categoria || null)
            .input('salario',      sql.NVarChar,  salario || null)
            .input('salarioValor', sql.Int,        salarioValor || 0)
            .input('estado',       sql.NVarChar,  estado || 'Activa')
            .query(`
                UPDATE Ofertas SET
                    titulo        = @titulo,
                    descripcion   = @descripcion,
                    zona          = @zona,
                    modalidad     = @modalidad,
                    tipo_contrato = @tipoContrato,
                    experiencia   = @experiencia,
                    categoria     = @categoria,
                    salario       = @salario,
                    salario_valor = @salarioValor,
                    estado        = @estado
                WHERE id = @id
            `);

        res.json({ message: 'Oferta actualizada exitosamente' });
    } catch (error) {
        console.error('Error updating offer:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// ─────────────────────────────────────────────────────────────────
// DELETE /api/ofertas/:id — eliminar una oferta (oferente dueño)
// ─────────────────────────────────────────────────────────────────
export const eliminarOferta = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'No autenticado' });

        const { id } = req.params;
        const pool = await poolPromise;
        if (!pool) return res.status(500).json({ message: 'Error de BD' });

        const check = await pool.request()
            .input('id', sql.Int, parseInt(id))
            .input('userId', sql.Int, userId)
            .query(`SELECT o.id FROM Ofertas o
                    INNER JOIN PerfilesEmpresas pe ON pe.id = o.empresa_id
                    WHERE o.id = @id AND pe.usuario_id = @userId`);

        if (check.recordset.length === 0) {
            return res.status(403).json({ message: 'No autorizado para eliminar esta oferta' });
        }

        await pool.request()
            .input('id', sql.Int, parseInt(id))
            .query('DELETE FROM Ofertas WHERE id = @id');

        res.json({ message: 'Oferta eliminada exitosamente' });
    } catch (error) {
        console.error('Error deleting offer:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// ─────────────────────────────────────────────────────────────────
// GET /api/ofertas/:id/postulantes — ver candidatos de una oferta (oferente)
// ─────────────────────────────────────────────────────────────────
export const getPostulantesDeOferta = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'No autenticado' });

        const { id } = req.params;
        const pool = await poolPromise;
        if (!pool) return res.status(500).json({ message: 'Error de BD' });

        // Verificar que la oferta es del oferente
        const check = await pool.request()
            .input('id', sql.Int, parseInt(id))
            .input('userId', sql.Int, userId)
            .query(`SELECT o.id FROM Ofertas o
                    INNER JOIN PerfilesEmpresas pe ON pe.id = o.empresa_id
                    WHERE o.id = @id AND pe.usuario_id = @userId`);

        if (check.recordset.length === 0) {
            return res.status(403).json({ message: 'No autorizado para ver esta oferta' });
        }

        const result = await pool.request()
            .input('ofertaId', sql.Int, parseInt(id))
            .query(`
                SELECT
                    pp.id           as candidato_id,
                    pp.nombre,
                    pp.apellido,
                    pp.habilidades,
                    pp.experiencia  as experiencia_candidato,
                    pp.cv_url,
                    pp.foto_url,
                    pp.telefono,
                    u.email,
                    p.estado        as estado_postulacion,
                    p.creado_en     as fecha_postulacion,
                    p.visto,
                    u.id            as usuario_id
                FROM Postulaciones p
                INNER JOIN Usuarios u       ON u.id = p.usuario_id
                INNER JOIN PerfilesPostulantes pp ON pp.usuario_id = u.id
                WHERE p.oferta_id = @ofertaId
                ORDER BY p.creado_en DESC
            `);

        res.json(result.recordset);
    } catch (error) {
        console.error('Error getting applicants:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// ─────────────────────────────────────────────────────────────────
// POST /api/ofertas/:id/postular — postulante se postula a una oferta
// ─────────────────────────────────────────────────────────────────
export const postularseAOferta = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'No autenticado' });
        if (req.user?.role !== 'postulante') {
            return res.status(403).json({ message: 'Solo postulantes pueden postularse' });
        }

        const { id } = req.params;
        const pool = await poolPromise;
        if (!pool) return res.status(500).json({ message: 'Error de BD' });

        // Verificar que la oferta existe y está activa
        const oferta = await pool.request()
            .input('id', sql.Int, parseInt(id))
            .query(`SELECT o.id, o.titulo, pe.usuario_id as oferente_user_id, pe.nombre_empresa
                    FROM Ofertas o
                    INNER JOIN PerfilesEmpresas pe ON pe.id = o.empresa_id
                    WHERE o.id = @id AND o.estado = 'Activa'`);

        if (oferta.recordset.length === 0) {
            return res.status(404).json({ message: 'Oferta no encontrada o no disponible' });
        }

        // Verificar postulación duplicada
        const existente = await pool.request()
            .input('ofertaId', sql.Int, parseInt(id))
            .input('userId', sql.Int, userId)
            .query('SELECT id FROM Postulaciones WHERE oferta_id = @ofertaId AND usuario_id = @userId');

        if (existente.recordset.length > 0) {
            return res.status(409).json({ message: 'Ya te postulaste a esta oferta' });
        }

        await pool.request()
            .input('ofertaId', sql.Int, parseInt(id))
            .input('userId', sql.Int, userId)
            .query('INSERT INTO Postulaciones (oferta_id, usuario_id) VALUES (@ofertaId, @userId)');

        // Notificar al oferente
        try {
            const { titulo, oferente_user_id, nombre_empresa } = oferta.recordset[0];
            const ppRes = await pool.request()
                .input('userId', sql.Int, userId)
                .query('SELECT nombre, apellido FROM PerfilesPostulantes WHERE usuario_id = @userId');
            const pp = ppRes.recordset[0];
            const nombre = pp ? `${pp.nombre} ${pp.apellido}` : 'Un candidato';

            await crearNotificacion(
                pool, oferente_user_id, 'nueva_postulacion',
                `Nueva postulación a "${titulo}"`,
                `${nombre} se postuló a tu oferta. Revisá tu panel.`,
                { ofertaId: parseInt(id), postulanteUserId: userId }
            );
        } catch (e) {
            console.error('Error notificando al oferente:', e);
        }

        res.status(201).json({ message: 'Postulación enviada exitosamente' });
    } catch (error) {
        console.error('Error applying to offer:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// ─────────────────────────────────────────────────────────────────
// GET /api/ofertas/mis-postulaciones — postulaciones del postulante
// ─────────────────────────────────────────────────────────────────
export const getMisPostulaciones = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'No autenticado' });

        const pool = await poolPromise;
        if (!pool) return res.status(500).json({ message: 'Error de BD' });

        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT
                    p.id as postulacion_id,
                    p.estado,
                    p.creado_en as fecha_postulacion,
                    o.id as oferta_id,
                    o.titulo,
                    o.zona,
                    o.modalidad,
                    o.salario,
                    o.estado as estado_oferta,
                    pe.nombre_empresa as empresa,
                    p.cv_url,
                    'postulacion' as tipo
                FROM Postulaciones p
                INNER JOIN Ofertas o ON o.id = p.oferta_id
                INNER JOIN PerfilesEmpresas pe ON pe.id = o.empresa_id
                WHERE p.usuario_id = @userId

                UNION ALL

                SELECT
                    s.id as postulacion_id,
                    'Sugerencia Aceptada' as estado,
                    s.creada_en as fecha_postulacion,
                    0 as oferta_id,
                    'Sugerencia Directa' as titulo,
                    pe.ubicacion as zona,
                    '' as modalidad,
                    '' as salario,
                    'Activa' as estado_oferta,
                    pe.nombre_empresa as empresa,
                    s.cv_url,
                    'sugerencia' as tipo
                FROM SugerenciasContacto s
                INNER JOIN PerfilesEmpresas pe ON pe.usuario_id = s.oferente_id
                WHERE s.postulante_id = @userId AND s.estado = 'Aceptada'

                ORDER BY fecha_postulacion DESC
            `);

        res.json(result.recordset);
    } catch (error) {
        console.error('Error getting my applications:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

export const marcarPostulacionVisto = async (req: AuthRequest, res: Response) => {
    try {
        const { ofertaId, usuarioId } = req.body;
        
        const pool = await poolPromise;
        if (!pool) return res.status(500).json({ message: 'Error de BD' });

        await pool.request()
            .input('ofertaId', sql.Int, ofertaId)
            .input('usuarioId', sql.Int, usuarioId)
            .query(`UPDATE Postulaciones SET visto = 1 WHERE oferta_id = @ofertaId AND usuario_id = @usuarioId`);

        res.json({ message: 'Postulación marcada como vista' });
    } catch (error) {
        console.error('Error marcarPostulacionVisto:', error);
        res.status(500).json({ message: 'Error al marcar como visto' });
    }
};


export const cancelarPostulacion = async (req: AuthRequest, res: Response) => {
    try {
        const postulacionId = req.params.postulacionId;
        const userId = req.user?.id;
        
        if (!userId) return res.status(401).json({ message: 'No autenticado' });

        const pool = await poolPromise;
        if (!pool) return res.status(500).json({ message: 'Error de BD' });

        // Verificar que la postulacion pertenece al usuario
        const checkRes = await pool.request()
            .input('postulacionId', sql.Int, postulacionId)
            .input('userId', sql.Int, userId)
            .query(`SELECT 1 FROM Postulaciones WHERE id = @postulacionId AND usuario_id = @userId`);
            
        if (checkRes.recordset.length === 0) {
            return res.status(403).json({ message: 'No autorizado para cancelar esta postulación' });
        }

        await pool.request()
            .input('postulacionId', sql.Int, postulacionId)
            .query(`DELETE FROM Postulaciones WHERE id = @postulacionId`);

        res.json({ message: 'Postulación cancelada con éxito' });
    } catch (error) {
        console.error('Error al cancelar postulación:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// PUT /api/ofertas/postulaciones/:id/cv - Modificar el CV de una postulación o sugerencia
export const modificarCVPostulacion = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'No autenticado' });

        const { id } = req.params;
        const { cvUrl, tipo } = req.body; // tipo: 'postulacion' o 'sugerencia'

        if (!cvUrl || !tipo) return res.status(400).json({ message: 'Faltan datos' });

        const pool = await poolPromise;
        if (!pool) return res.status(500).json({ message: 'Error de BD' });

        if (tipo === 'sugerencia') {
            await pool.request()
                .input('id', sql.Int, parseInt(id))
                .input('userId', sql.Int, userId)
                .input('cvUrl', sql.NVarChar, cvUrl)
                .query(`UPDATE SugerenciasContacto SET cv_url = @cvUrl WHERE id = @id AND postulante_id = @userId`);
        } else {
            await pool.request()
                .input('id', sql.Int, parseInt(id))
                .input('userId', sql.Int, userId)
                .input('cvUrl', sql.NVarChar, cvUrl)
                .query(`UPDATE Postulaciones SET cv_url = @cvUrl WHERE id = @id AND usuario_id = @userId`);
        }

        res.json({ message: 'CV actualizado correctamente' });
    } catch (error) {
        console.error('Error updating CV:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};
