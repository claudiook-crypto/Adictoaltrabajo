"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const cv_routes_1 = __importDefault(require("./routes/cv.routes"));
const candidates_routes_1 = __importDefault(require("./routes/candidates.routes"));
const notifications_routes_1 = __importDefault(require("./routes/notifications.routes"));
const match_routes_1 = __importDefault(require("./routes/match.routes"));
const ofertas_routes_1 = __importDefault(require("./routes/ofertas.routes"));
const chats_routes_1 = __importDefault(require("./routes/chats.routes"));
const dotenv_1 = __importDefault(require("dotenv"));
const corsMiddleware = require('cors');
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use(corsMiddleware({ origin: '*' }));
app.use(express_1.default.json());
// Servir archivos subidos (CVs)
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// Rutas
app.get('/', (_req, res) => res.send('Adicto al Trabajo API is running'));
app.use('/api/auth', auth_routes_1.default);
app.use('/api/cv', cv_routes_1.default);
app.use('/api/candidates', candidates_routes_1.default);
app.use('/api/notifications', notifications_routes_1.default);
app.use('/api/match', match_routes_1.default);
app.use('/api/ofertas', ofertas_routes_1.default);
app.use('/api/chats', chats_routes_1.default);
const db_1 = require("./db");
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    // Auto-cierre de ofertas de más de 30 días (se ejecuta cada 24 horas)
    setInterval(async () => {
        try {
            const pool = await db_1.poolPromise;
            if (pool) {
                const result = await pool.request().query(`
                    UPDATE Ofertas 
                    SET estado = 'Cerrada' 
                    WHERE estado != 'Cerrada' 
                    AND DATEDIFF(day, creado_en, GETDATE()) > 30
                `);
                if (result.rowsAffected[0] > 0) {
                    console.log(`[Auto-Clean] Se cerraron automáticamente ${result.rowsAffected[0]} ofertas antiguas.`);
                }
            }
        }
        catch (error) {
            console.error('[Auto-Clean] Error cerrando ofertas antiguas:', error);
        }
    }, 24 * 60 * 60 * 1000); // 24 horas
});
