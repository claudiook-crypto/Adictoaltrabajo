"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchOfertas = exports.matchCandidatos = void 0;
const genai_1 = require("@google/genai");
const db_1 = require("../db");
const apiKey = process.env.GEMINI_API_KEY || 'AQ.Ab8RN6JGrZcIv79LIko9KXHPBvuR9D-ExVyjvMLx8vtNCjbwEQ';
const ai = new genai_1.GoogleGenAI({ apiKey });
// POST /api/match/candidatos — IA rankea candidatos para una oferta (para oferentes)
const matchCandidatos = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ message: 'No autenticado' });
        const { ofertaDescripcion, candidatos } = req.body;
        if (!ofertaDescripcion || !candidatos || !Array.isArray(candidatos)) {
            return res.status(400).json({ message: 'ofertaDescripcion y candidatos[] son requeridos' });
        }
        const prompt = `Eres un asistente de RRHH. Analiza qué tan compatible es cada candidato para el siguiente puesto de trabajo.

OFERTA DE TRABAJO:
${ofertaDescripcion}

CANDIDATOS:
${candidatos.map((c, i) => `
Candidato ${i + 1} (ID: ${c.id || c.candidato_id}):
- Habilidades: ${c.habilidades || 'No especificadas'}
- Experiencia: ${c.experiencia || c.experiencia_candidato || 'No especificada'}
`).join('\n')}

Donde score es del 0 al 100 según compatibilidad con la oferta.`;
        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: genai_1.Type.ARRAY,
                    items: {
                        type: genai_1.Type.OBJECT,
                        properties: {
                            id: { type: genai_1.Type.STRING, description: "El ID del candidato evaluado" },
                            score: { type: genai_1.Type.INTEGER, description: "Compatibilidad del 0 al 100" },
                            razon: { type: genai_1.Type.STRING, description: "Breve explicación en español" }
                        }
                    }
                }
            }
        });
        let scores = [];
        try {
            scores = JSON.parse(response.text || '[]');
        }
        catch {
            scores = candidatos.map((c) => ({ id: String(c.id || c.candidato_id), score: 50, razon: 'No se pudo calcular' }));
        }
        // Merge scores into candidates
        const resultado = candidatos.map((c) => {
            const candId = String(c.id || c.candidato_id);
            const scoreData = scores.find((s) => String(s.id) === candId);
            return {
                ...c,
                matchScore: scoreData?.score ?? 50,
                matchRazon: scoreData?.razon ?? '',
            };
        }).sort((a, b) => b.matchScore - a.matchScore);
        res.json(resultado);
    }
    catch (error) {
        console.error('Error matching candidatos:', error);
        res.status(500).json({ message: 'Error en la IA' });
    }
};
exports.matchCandidatos = matchCandidatos;
// POST /api/match/ofertas — IA rankea ofertas para el perfil del postulante
const matchOfertas = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ message: 'No autenticado' });
        const { ofertas } = req.body;
        if (!ofertas || !Array.isArray(ofertas)) {
            return res.status(400).json({ message: 'ofertas[] requerido' });
        }
        const pool = await db_1.poolPromise;
        if (!pool)
            return res.status(500).json({ message: 'Error de BD' });
        // Obtener perfil del postulante
        const profileResult = await pool.request()
            .input('userId', db_1.sql.Int, userId)
            .query('SELECT habilidades, experiencia FROM PerfilesPostulantes WHERE usuario_id = @userId');
        const perfil = profileResult.recordset[0];
        if (!perfil) {
            return res.json(ofertas.map((o) => ({ ...o, matchScore: 50, matchRazon: '' })));
        }
        const prompt = `Eres un asistente de búsqueda de empleo. Analiza qué tan compatible es el candidato con cada oferta de trabajo.

PERFIL DEL CANDIDATO:
- Habilidades: ${perfil.habilidades || 'No especificadas'}
- Experiencia: ${perfil.experiencia || 'No especificada'}

OFERTAS DISPONIBLES:
${ofertas.slice(0, 15).map((o, i) => `
Oferta ${i + 1} (ID: ${o.id}):
- Título: ${o.title || o.titulo}
- Descripción: ${o.description || o.descripcion || ''}
- Modalidad: ${o.type || o.modalidad || ''}
- Zona: ${o.zona || ''}
`).join('\n')}

Asigna un score del 0 al 100 según la compatibilidad del candidato con la oferta.`;
        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: genai_1.Type.ARRAY,
                    items: {
                        type: genai_1.Type.OBJECT,
                        properties: {
                            id: { type: genai_1.Type.STRING, description: "El ID de la oferta evaluada" },
                            score: { type: genai_1.Type.INTEGER, description: "Compatibilidad del 0 al 100" },
                            razon: { type: genai_1.Type.STRING, description: "Breve explicación en español" }
                        }
                    }
                }
            }
        });
        let scores = [];
        try {
            scores = JSON.parse(response.text || '[]');
        }
        catch {
            scores = ofertas.map((o) => ({ id: String(o.id), score: 50, razon: '' }));
        }
        const resultado = ofertas.map((o) => {
            const scoreData = scores.find((s) => String(s.id) === String(o.id));
            return {
                ...o,
                matchScore: scoreData?.score ?? 50,
                matchRazon: scoreData?.razon ?? '',
            };
        }).sort((a, b) => b.matchScore - a.matchScore);
        res.json(resultado);
    }
    catch (error) {
        console.error('Error matching ofertas:', error);
        res.status(500).json({ message: 'Error en la IA' });
    }
};
exports.matchOfertas = matchOfertas;
