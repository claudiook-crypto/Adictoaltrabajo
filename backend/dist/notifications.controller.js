"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = exports.markAsRead = exports.getNotifications = void 0;
const db_1 = require("../db");
// Obtener notificaciones del usuario autenticado
const getNotifications = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'No autenticado' });
        }
        const pool = await db_1.poolPromise;
        if (!pool)
            return res.status(500).json({ message: 'Error de BD' });
        const result = await pool.request()
            .input('userId', db_1.sql.Int, userId)
            .query(`
                SELECT * FROM Notifications 
                WHERE UserId = @userId 
                ORDER BY CreatedAt DESC
            `);
        res.json(result.recordset);
    }
    catch (error) {
        console.error('Error getting notifications:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};
exports.getNotifications = getNotifications;
// Marcar notificación como leída
const markAsRead = async (req, res) => {
    try {
        const notificationId = req.params.id;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'No autenticado' });
        }
        const pool = await db_1.poolPromise;
        if (!pool)
            return res.status(500).json({ message: 'Error de BD' });
        await pool.request()
            .input('id', db_1.sql.Int, parseInt(notificationId))
            .input('userId', db_1.sql.Int, userId)
            .query('UPDATE Notifications SET IsRead = 1 WHERE Id = @id AND UserId = @userId');
        res.json({ message: 'Notificación marcada como leída' });
    }
    catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};
exports.markAsRead = markAsRead;
// Crear notificación (interno)
const createNotification = async (userId, title, content) => {
    try {
        const pool = await db_1.poolPromise;
        if (!pool)
            return;
        await pool.request()
            .input('userId', db_1.sql.Int, userId)
            .input('title', db_1.sql.NVarChar, title)
            .input('content', db_1.sql.NVarChar, content)
            .query('INSERT INTO Notifications (UserId, Title, Content) VALUES (@userId, @title, @content)');
    }
    catch (error) {
        console.error('Error creating notification:', error);
    }
};
exports.createNotification = createNotification;
