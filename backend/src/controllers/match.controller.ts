import { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { poolPromise, sql } from '../db';
import { AuthRequest } from '../middleware/auth.middleware';

const apiKey = process.env.GEMINI_API_KEY || 'AQ.Ab8RN6JGrZcIv79LIko9KXHPBvuR9D-ExVyjvMLx8vtNCjbwEQ';
const ai = new GoogleGenAI({ apiKey });

// POST /api/match/candidatos — IA rankea candidatos para una oferta (para oferentes)
export const matchCandidatos = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'No autenticado' });

        const { ofertaDescripcion, candidatos } = req.body;

        if (!ofertaDescripcion || !candidatos || !Array.isArray(candidatos)) {
            return res.status(400).json({ message: 'ofertaDescripcion y candidatos[] son requeridos' });
        }

        const prompt = `Eres un asistente de RRHH. Analiza qué tan compatible es cada candidato para el siguiente puesto de trabajo.

OFERTA DE TRABAJO:
${ofertaDescripcion}

CANDIDATOS:
${candidatos.map((c: any, i: number) => `
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
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING, description: "El ID del candidato evaluado" },
                            score: { type: Type.INTEGER, description: "Compatibilidad del 0 al 100" },
                            razon: { type: Type.STRING, description: "Breve explicación en español" }
                        }
                    }
                }
            }
        });

        let scores: any[] = [];
        try {
            scores = JSON.parse(response.text || '[]');
        } catch {
            scores = candidatos.map((c: any) => ({ id: String(c.id || c.candidato_id), score: 50, razon: 'No se pudo calcular' }));
        }

        // Merge scores into candidates
        const resultado = candidatos.map((c: any) => {
            const candId = String(c.id || c.candidato_id);
            const scoreData = scores.find((s: any) => String(s.id) === candId);
            return {
                ...c,
                matchScore: scoreData?.score ?? 50,
                matchRazon: scoreData?.razon ?? '',
            };
        }).sort((a: any, b: any) => b.matchScore - a.matchScore);

        res.json(resultado);
    } catch (error) {
        console.error('Error matching candidatos:', error);
        res.status(500).json({ message: 'Error en la IA' });
    }
};

// POST /api/match/ofertas — IA rankea ofertas para el perfil del postulante
export const matchOfertas = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'No autenticado' });

        const { ofertas } = req.body;
        if (!ofertas || !Array.isArray(ofertas)) {
            return res.status(400).json({ message: 'ofertas[] requerido' });
        }

        const pool = await poolPromise;
        if (!pool) return res.status(500).json({ message: 'Error de BD' });

        // Obtener perfil del postulante
        const profileResult = await pool.request()
            .input('userId', sql.Int, userId)
            .query('SELECT habilidades, experiencia FROM PerfilesPostulantes WHERE usuario_id = @userId');

        const perfil = profileResult.recordset[0];

        if (!perfil) {
            return res.json(ofertas.map((o: any) => ({ ...o, matchScore: 50, matchRazon: '' })));
        }

        const prompt = `Eres un asistente de búsqueda de empleo. Analiza qué tan compatible es el candidato con cada oferta de trabajo.

PERFIL DEL CANDIDATO:
- Habilidades: ${perfil.habilidades || 'No especificadas'}
- Experiencia: ${perfil.experiencia || 'No especificada'}

OFERTAS DISPONIBLES:
${ofertas.slice(0, 15).map((o: any, i: number) => `
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
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING, description: "El ID de la oferta evaluada" },
                            score: { type: Type.INTEGER, description: "Compatibilidad del 0 al 100" },
                            razon: { type: Type.STRING, description: "Breve explicación en español" }
                        }
                    }
                }
            }
        });

        let scores: any[] = [];
        try {
            scores = JSON.parse(response.text || '[]');
        } catch {
            scores = ofertas.map((o: any) => ({ id: String(o.id), score: 50, razon: '' }));
        }

        const resultado = ofertas.map((o: any) => {
            const scoreData = scores.find((s: any) => String(s.id) === String(o.id));
            return {
                ...o,
                matchScore: scoreData?.score ?? 50,
                matchRazon: scoreData?.razon ?? '',
            };
        }).sort((a: any, b: any) => b.matchScore - a.matchScore);

        res.json(resultado);
    } catch (error) {
        console.error('Error matching ofertas:', error);
        res.status(500).json({ message: 'Error en la IA' });
    }
};

