import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { poolPromise, sql } from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_123';

export interface AuthRequest extends Request {
    user?: { id: number; role: string };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ message: 'No autenticado - token requerido' });
        }

        const decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: string };
        
        // Verify user exists in Usuarios table
        const pool = await poolPromise;
        if (!pool) return res.status(500).json({ message: 'Error de BD' });

        const result = await pool.request()
            .input('id', sql.Int, decoded.id)
            .query(`SELECT u.id, r.nombre as rol
                    FROM Usuarios u
                    INNER JOIN Roles r ON u.rol_id = r.id
                    WHERE u.id = @id`);

        if (result.recordset.length === 0) {
            return res.status(401).json({ message: 'Usuario no encontrado' });
        }

        const roleMap: Record<string, string> = { Postulante: 'postulante', Empresa: 'oferente', Admin: 'admin' };
        req.user = { id: result.recordset[0].id, role: roleMap[result.recordset[0].rol] || decoded.role };
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({ message: 'Token inválido o expirado' });
    }
};

export const requireRole = (...allowedRoles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ message: 'No autenticado' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: 'No autorizado para esta acción' });
        }

        next();
    };
};