"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadImage = exports.uploadCV = exports.parseCV = void 0;
const genai_1 = require("@google/genai");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const apiKey = process.env.GEMINI_API_KEY || 'AQ.Ab8RN6JGrZcIv79LIko9KXHPBvuR9D-ExVyjvMLx8vtNCjbwEQ';
const ai = new genai_1.GoogleGenAI({ apiKey });
// Helper para guardar archivo
const saveFileLocally = (buffer, originalName, prefix = 'file') => {
    const uploadsDir = path_1.default.join(__dirname, '../../uploads');
    if (!fs_1.default.existsSync(uploadsDir))
        fs_1.default.mkdirSync(uploadsDir, { recursive: true });
    const ext = path_1.default.extname(originalName) || '';
    const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`;
    const filePath = path_1.default.join(uploadsDir, fileName);
    fs_1.default.writeFileSync(filePath, buffer);
    return `/uploads/${fileName}`;
};
const parseCV = async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ message: 'No file uploaded' });
        const mimeType = req.file.mimetype;
        if (mimeType !== 'application/pdf') {
            return res.status(400).json({ message: 'Por ahora solo soportamos archivos PDF.' });
        }
        // 1. Guardar archivo localmente
        const cvUrl = saveFileLocally(req.file.buffer, req.file.originalname, 'cv');
        // 2. Parsear con IA — intentar con schema estructurado primero, fallback a texto plano
        let parsed = {};
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
                        type: genai_1.Type.OBJECT,
                        properties: {
                            firstName: { type: genai_1.Type.STRING },
                            lastName: { type: genai_1.Type.STRING },
                            profession: { type: genai_1.Type.STRING },
                            skills: { type: genai_1.Type.STRING },
                            phone: { type: genai_1.Type.STRING }
                        }
                    }
                }
            });
            parsed = JSON.parse(response.text || '{}');
        }
        catch (schemaErr) {
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
    }
    catch (error) {
        console.error('Error parsing CV:', error);
        res.status(500).json({ message: 'Error procesando el CV' });
    }
};
exports.parseCV = parseCV;
const uploadCV = async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ message: 'No file uploaded' });
        const mimeType = req.file.mimetype;
        if (mimeType !== 'application/pdf') {
            return res.status(400).json({ message: 'Solo PDF.' });
        }
        const cvUrl = saveFileLocally(req.file.buffer, req.file.originalname, 'cv');
        res.json({ cvUrl });
    }
    catch (error) {
        console.error('Error uploading CV:', error);
        res.status(500).json({ message: 'Error subiendo CV' });
    }
};
exports.uploadCV = uploadCV;
const uploadImage = async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ message: 'No file uploaded' });
        const mimeType = req.file.mimetype;
        if (!mimeType.startsWith('image/')) {
            return res.status(400).json({ message: 'Solo imágenes.' });
        }
        const imageUrl = saveFileLocally(req.file.buffer, req.file.originalname, 'img');
        res.json({ imageUrl });
    }
    catch (error) {
        console.error('Error uploading Image:', error);
        res.status(500).json({ message: 'Error subiendo Imagen' });
    }
};
exports.uploadImage = uploadImage;
