"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const genai_1 = require("@google/genai");
const apiKey = process.env.GEMINI_API_KEY || 'AQ.Ab8RN6JGrZcIv79LIko9KXHPBvuR9D-ExVyjvMLx8vtNCjbwEQ';
const ai = new genai_1.GoogleGenAI({ apiKey });
async function test() {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{
                    role: 'user',
                    parts: [
                        { text: 'Extrae: firstName, lastName, profession, skills (separadas por coma), phone del siguiente texto: Juan Perez, programador, sabe react y node, tel 12345678' }
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
        console.log(response.text);
    }
    catch (e) {
        console.error("ERROR CAUGHT:");
        console.error(e);
    }
}
test();
