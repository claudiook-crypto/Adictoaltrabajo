const fs = require('fs');
let txt = fs.readFileSync('backend/src/controllers/notifications.controller.ts', 'utf8');

const newEndpoint = `
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
            .query(\`SELECT estado FROM SugerenciasContacto WHERE oferente_id = @oferenteId AND postulante_id = @postulanteId\`);

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
`;

txt += newEndpoint;
fs.writeFileSync('backend/src/controllers/notifications.controller.ts', txt);
console.log("Done");
