const fs = require('fs');
let content = fs.readFileSync('backend/src/controllers/chats.controller.ts', 'utf8');
const lines = content.split(/\r?\n/);

const newBlock = `        // Obtener datos de la empresa
        const empresaRes = await pool.request()
            .input('oferenteId', sql.Int, oferenteId)
            .query('SELECT nombre_empresa FROM PerfilesEmpresas WHERE usuario_id = @oferenteId');
        const nombreEmpresa = empresaRes.recordset[0]?.nombre_empresa || 'la empresa';

        // Obtener datos de la oferta (si existe)
        let tituloOferta = 'una posición en nuestro equipo';
        let descOferta = '';
        if (ofertaId && ofertaId > 0) {
            const ofertaRes = await pool.request()
                .input('ofertaId', sql.Int, ofertaId)
                .query('SELECT titulo, descripcion FROM Ofertas WHERE id = @ofertaId');
            if (ofertaRes.recordset.length > 0) {
                tituloOferta = ofertaRes.recordset[0].titulo;
                descOferta = ofertaRes.recordset[0].descripcion;
            }
        }

        // Obtener datos del postulante
        const postRes = await pool.request()
            .input('postulanteId', sql.Int, postulanteId)
            .query('SELECT nombre FROM PerfilesPostulantes WHERE usuario_id = @postulanteId');
        const nombrePostulante = postRes.recordset[0]?.nombre || 'Candidato';

        // IA prompt
        const prompt = \`Actúa como un reclutador profesional de la empresa "\${nombreEmpresa}". Estás buscando contactar a "\${nombrePostulante}" para "\${tituloOferta}". \${descOferta ? \`Descripción del puesto: "\${descOferta}".\` : "Es un contacto directo por su perfil interesante."} Genera 3 opciones cortas, amigables y profesionales (máximo 2 líneas cada una) para enviar como primer mensaje de chat al candidato, invitándolo a conversar sobre el puesto. Separa las opciones con "|||". No agregues texto adicional, solo las opciones.\`;`;

const newLines = [
  ...lines.slice(0, 21),
  newBlock,
  ...lines.slice(48)
];

fs.writeFileSync('backend/src/controllers/chats.controller.ts', newLines.join('\n'));
console.log("Done");
