const fs = require('fs');
let txt = fs.readFileSync('backend/src/controllers/ofertas.controller.ts', 'utf8');

const newFunc = `export const getMisPostulaciones = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'No autenticado' });

        const pool = await poolPromise;
        if (!pool) return res.status(500).json({ message: 'Error de BD' });

        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(\`
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
            \`);

        res.json(result.recordset);
    } catch (error) {`;

txt = txt.replace(/export const getMisPostulaciones[\s\S]*?res\.json\(result\.recordset\);\r?\n    } catch \(error\) {/m, newFunc);
fs.writeFileSync('backend/src/controllers/ofertas.controller.ts', txt);
console.log("Done");
