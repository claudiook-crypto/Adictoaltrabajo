import express from 'express';
import path from 'path';
import authRoutes from './routes/auth.routes';
import cvRoutes from './routes/cv.routes';
import candidatesRoutes from './routes/candidates.routes';
import notificationsRoutes from './routes/notifications.routes';
import matchRoutes from './routes/match.routes';
import ofertasRoutes from './routes/ofertas.routes';
import chatsRoutes from './routes/chats.routes';
import dotenv from 'dotenv';
const corsMiddleware = require('cors');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(corsMiddleware({ origin: '*' }));
app.use(express.json());

// Servir archivos subidos (CVs)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rutas
app.get('/', (_req, res) => res.send('Adicto al Trabajo API is running'));
app.use('/api/auth', authRoutes);
app.use('/api/cv', cvRoutes);
app.use('/api/candidates', candidatesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/ofertas', ofertasRoutes);
app.use('/api/chats', chatsRoutes);

import { poolPromise } from './db';

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    
    // Auto-cierre de ofertas de más de 30 días (se ejecuta cada 24 horas)
    setInterval(async () => {
        try {
            const pool = await poolPromise;
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
        } catch (error) {
            console.error('[Auto-Clean] Error cerrando ofertas antiguas:', error);
        }
    }, 24 * 60 * 60 * 1000); // 24 horas
});