"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_123';
const authenticate = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ message: 'No autenticado - token requerido' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Verify user exists in Usuarios table
        const pool = await db_1.poolPromise;
        if (!pool)
            return res.status(500).json({ message: 'Error de BD' });
        const result = await pool.request()
            .input('id', db_1.sql.Int, decoded.id)
            .query(`SELECT u.id, r.nombre as rol
                    FROM Usuarios u
                    INNER JOIN Roles r ON u.rol_id = r.id
                    WHERE u.id = @id`);
        if (result.recordset.length === 0) {
            return res.status(401).json({ message: 'Usuario no encontrado' });
        }
        const roleMap = { Postulante: 'postulante', Empresa: 'oferente', Admin: 'admin' };
        req.user = { id: result.recordset[0].id, role: roleMap[result.recordset[0].rol] || decoded.role };
        next();
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({ message: 'Token inválido o expirado' });
    }
};
exports.authenticate = authenticate;
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'No autenticado' });
        }
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: 'No autorizado para esta acción' });
        }
        next();
    };
};
exports.requireRole = requireRole;
