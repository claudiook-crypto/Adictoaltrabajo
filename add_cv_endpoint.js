const fs = require('fs');
let txt = fs.readFileSync('backend/src/controllers/ofertas.controller.ts', 'utf8');

const newEndpoint = `
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
                .query(\`UPDATE SugerenciasContacto SET cv_url = @cvUrl WHERE id = @id AND postulante_id = @userId\`);
        } else {
            await pool.request()
                .input('id', sql.Int, parseInt(id))
                .input('userId', sql.Int, userId)
                .input('cvUrl', sql.NVarChar, cvUrl)
                .query(\`UPDATE Postulaciones SET cv_url = @cvUrl WHERE id = @id AND usuario_id = @userId\`);
        }

        res.json({ message: 'CV actualizado correctamente' });
    } catch (error) {
        console.error('Error updating CV:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};
`;

txt += newEndpoint;
fs.writeFileSync('backend/src/controllers/ofertas.controller.ts', txt);
console.log("Done adding new endpoint");
