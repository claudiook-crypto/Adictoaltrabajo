import { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import fs from 'fs';
import path from 'path';

const apiKey = process.env.GEMINI_API_KEY || 'AQ.Ab8RN6JGrZcIv79LIko9KXHPBvuR9D-ExVyjvMLx8vtNCjbwEQ';
const ai = new GoogleGenAI({ apiKey });

// Helper para guardar archivo
const saveFileLocally = (buffer: Buffer, originalName: string, prefix: string = 'file') => {
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    
    const ext = path.extname(originalName) || '';
    const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${fileName}`;
};

export const parseCV = async (req: Request, res: Response) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const mimeType = req.file.mimetype;
        if (mimeType !== 'application/pdf') {
            return res.status(400).json({ message: 'Por ahora solo soportamos archivos PDF.' });
        }

        // 1. Guardar archivo localmente
        const cvUrl = saveFileLocally(req.file.buffer, req.file.originalname, 'cv');

        // 2. Parsear con IA — intentar con schema estructurado primero, fallback a texto plano
        let parsed: any = {};
        const base64Data = req.file.buffer.toString('base64');
        const promptText = `Analiza este CV/Currículum y extrae la siguiente información en formato JSON:
- firstName: nombre de pila
- lastName: apellido
- profession: profesión u oficio principal
- skills: habilidades separadas por coma
- phone: número de teléfono

Responde SOLO con el JSON, sin markdown ni explicaciones.`;

        try {
            // Intento 1: con responseSchema
            const response = await ai.models.generateContent({
                model: 'gemini-3.5-flash',
                contents: [{
                    role: 'user',
                    parts: [
                        { inlineData: { data: base64Data, mimeType } },
                        { text: promptText }
                    ]
                }],
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            firstName: { type: Type.STRING },
                            lastName: { type: Type.STRING },
                            profession: { type: Type.STRING },
                            skills: { type: Type.STRING },
                            phone: { type: Type.STRING }
                        }
                    }
                }
            });
            parsed = JSON.parse(response.text || '{}');
        } catch (schemaErr) {
            console.warn('Schema mode failed, falling back to plain text:', schemaErr);
            // Intento 2: sin responseSchema (texto plano)
            const response2 = await ai.models.generateContent({
                model: 'gemini-3.5-flash',
                contents: [{
                    role: 'user',
                    parts: [
                        { inlineData: { data: base64Data, mimeType } },
                        { text: promptText }
                    ]
                }]
            });
            const raw = (response2.text || '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            parsed = JSON.parse(raw);
        }
        
        // 3. Devolver parseado + URL
        res.json({ ...parsed, cvUrl });

    } catch (error) {
        console.error('Error parsing CV:', error);
        res.status(500).json({ message: 'Error procesando el CV' });
    }
};

export const uploadCV = async (req: Request, res: Response) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
        
        const mimeType = req.file.mimetype;
        if (mimeType !== 'application/pdf') {
            return res.status(400).json({ message: 'Solo PDF.' });
        }

        const cvUrl = saveFileLocally(req.file.buffer, req.file.originalname, 'cv');
        res.json({ cvUrl });
    } catch (error) {
        console.error('Error uploading CV:', error);
        res.status(500).json({ message: 'Error subiendo CV' });
    }
};

export const uploadImage = async (req: Request, res: Response) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
        
        const mimeType = req.file.mimetype;
        if (!mimeType.startsWith('image/')) {
            return res.status(400).json({ message: 'Solo imágenes.' });
        }

        const imageUrl = saveFileLocally(req.file.buffer, req.file.originalname, 'img');
        res.json({ imageUrl });
    } catch (error) {
        console.error('Error uploading Image:', error);
        res.status(500).json({ message: 'Error subiendo Imagen' });
    }
};
