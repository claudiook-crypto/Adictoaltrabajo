const fs = require('fs');

// Add endpoint to get sent suggestions
let notifCtrl = fs.readFileSync('backend/src/controllers/notifications.controller.ts', 'utf8');
const endpoint = `
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
`;
notifCtrl += endpoint;
fs.writeFileSync('backend/src/controllers/notifications.controller.ts', notifCtrl);
console.log("Endpoint added");

// Add route
let routes = fs.readFileSync('backend/src/routes/notifications.routes.ts', 'utf8');
routes = routes.replace(
  'getEstadoSugerencia }',
  'getEstadoSugerencia, getSugerenciasEnviadas }'
);
routes = routes.replace(
  "router.get('/sugerencia/:oferenteId/estado', authenticate, getEstadoSugerencia);",
  "router.get('/sugerencia/:oferenteId/estado', authenticate, getEstadoSugerencia);\nrouter.get('/sugerencias/enviadas', authenticate, getSugerenciasEnviadas);"
);
fs.writeFileSync('backend/src/routes/notifications.routes.ts', routes);
console.log("Route added");

// Update BuscarCandidatos to load sent suggestions on mount
let buscar = fs.readFileSync('frontend/src/pages/oferente/BuscarCandidatos.tsx', 'utf8');
buscar = buscar.replace(
  "import React, { useState } from 'react';",
  "import React, { useState, useEffect } from 'react';"
);
buscar = buscar.replace(
  'const [showConfig, setShowConfig] = useState(true);',
  `const [showConfig, setShowConfig] = useState(true);

  useEffect(() => {
    // Cargar sugerencias ya enviadas al montar
    const cargarEnviadas = async () => {
      try {
        const res = await fetch('/api/notifications/sugerencias/enviadas', {
          headers: { Authorization: \`Bearer \${token}\` }
        });
        if (res.ok) {
          const data = await res.json();
          const map: Record<number, boolean> = {};
          data.postulanteIds.forEach((id: number) => { map[id] = true; });
          setSugerenciaEnviada(map);
        }
      } catch { /* silencioso */ }
    };
    if (token) cargarEnviadas();
  }, [token]);`
);
fs.writeFileSync('frontend/src/pages/oferente/BuscarCandidatos.tsx', buscar);
console.log("BuscarCandidatos updated");
