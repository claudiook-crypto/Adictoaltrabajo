"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.googleLogin = exports.register = exports.updateProfile = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_123';
const ROL_ID = { postulante: 1, oferente: 2, admin: 3 };
const ROL_NAME = { Postulante: 'postulante', Empresa: 'oferente', Admin: 'admin' };
/** Guarda un log de inicio de sesión */
async function saveLoginLog(pool, usuarioId, email, metodo, ip) {
    try {
        await pool.request()
            .input('usuarioId', db_1.sql.Int, usuarioId)
            .input('email', db_1.sql.VarChar, email)
            .input('metodo', db_1.sql.VarChar, metodo)
            .input('ip', db_1.sql.VarChar, ip || 'desconocida')
            .query(`INSERT INTO LoginLogs (usuario_id, email, metodo, ip) VALUES (@usuarioId, @email, @metodo, @ip)`);
    }
    catch (e) {
        console.error('Error guardando login log:', e);
    }
}
const updateProfile = async (req, res) => {
    try {
        const userId = req.user?.id;
        const role = req.user?.role;
        if (!userId)
            return res.status(401).json({ message: 'No autenticado' });
        const pool = await db_1.poolPromise;
        if (!pool)
            return res.status(500).json({ message: 'Error de BD' });
        if (role === 'postulante') {
            const { firstName, lastName, profession, skills, phone, zone, esPublico, cvUrl, fotoUrl } = req.body;
            await pool.request()
                .input('userId', db_1.sql.Int, userId)
                .input('nombre', db_1.sql.VarChar, firstName)
                .input('apellido', db_1.sql.VarChar, lastName)
                .input('habilidades', db_1.sql.VarChar, skills)
                .input('experiencia', db_1.sql.VarChar, profession)
                .input('telefono', db_1.sql.VarChar, phone)
                .input('esPublico', db_1.sql.Bit, esPublico === true ? 1 : 0)
                .input('cvUrl', db_1.sql.VarChar, cvUrl || null)
                .input('fotoUrl', db_1.sql.VarChar, fotoUrl || null)
                .query(`
                    UPDATE PerfilesPostulantes 
                    SET nombre = @nombre, 
                        apellido = @apellido, 
                        habilidades = @habilidades, 
                        experiencia = @experiencia, 
                        telefono = @telefono,
                        es_publico = @esPublico,
                        cv_url = @cvUrl,
                        foto_url = @fotoUrl
                    WHERE usuario_id = @userId
                `);
        }
        else if (role === 'oferente') {
            const { companyName, description, phone, zone, tipoOferente } = req.body;
            await pool.request()
                .input('userId', db_1.sql.Int, userId)
                .input('nombreEmpresa', db_1.sql.VarChar, companyName)
                .input('descripcion', db_1.sql.VarChar, description)
                .input('ubicacion', db_1.sql.VarChar, zone)
                .input('tipoOferente', db_1.sql.VarChar, tipoOferente || 'Empresa')
                .query(`
                    UPDATE PerfilesEmpresas 
                    SET nombre_empresa = @nombreEmpresa, 
                        descripcion = @descripcion, 
                        ubicacion = @ubicacion,
                        tipo_oferente = @tipoOferente
                    WHERE usuario_id = @userId
                `);
        }
        res.json({ message: 'Perfil actualizado exitosamente' });
    }
    catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};
exports.updateProfile = updateProfile;
const register = async (req, res) => {
    try {
        const { email, password, role, firstName, lastName, companyName } = req.body;
        if (!email || !password || !role) {
            return res.status(400).json({ message: 'Email, password y role son obligatorios' });
        }
        const rolId = ROL_ID[role];
        if (!rolId)
            return res.status(400).json({ message: 'Rol inválido' });
        const pool = await db_1.poolPromise;
        if (!pool)
            return res.status(500).json({ message: 'Error de BD' });
        // Check if user exists - tell them explicitly and check roles
        const checkUser = await pool.request()
            .input('email', db_1.sql.VarChar, email)
            .query('SELECT u.id, r.nombre as rol FROM Usuarios u INNER JOIN Roles r ON u.rol_id = r.id WHERE u.email = @email');
        if (checkUser.recordset.length > 0) {
            const dbRole = checkUser.recordset[0].rol;
            const existingRole = ROL_NAME[dbRole] || 'postulante';
            if (existingRole !== role) {
                const requestedRoleName = role === 'oferente' ? 'Empresa/Oferente' : 'Postulante';
                const existingRoleName = existingRole === 'oferente' ? 'Empresa/Oferente' : 'Postulante';
                return res.status(409).json({
                    message: `Este correo ya está en uso por una cuenta de ${existingRoleName}. Por favor, utilizá otro correo para registrarte como ${requestedRoleName}.`,
                    code: 'ROLE_CONFLICT',
                    email
                });
            }
            return res.status(409).json({
                message: 'Esta cuenta ya está registrada. ¿Querés iniciar sesión?',
                code: 'ALREADY_REGISTERED',
                email
            });
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const displayName = role === 'postulante'
            ? `${firstName || 'Usuario'} ${lastName || ''}`.trim()
            : (companyName || 'Mi Empresa/Servicio');
        // Insert into Usuarios
        const insertUser = await pool.request()
            .input('email', db_1.sql.VarChar, email)
            .input('password', db_1.sql.VarChar, hashedPassword)
            .input('rolId', db_1.sql.Int, rolId)
            .query(`INSERT INTO Usuarios (email, password, rol_id) OUTPUT INSERTED.id VALUES (@email, @password, @rolId)`);
        const userId = insertUser.recordset[0].id;
        // Insert Profile based on role
        if (role === 'postulante') {
            await pool.request()
                .input('userId', db_1.sql.Int, userId)
                .input('nombre', db_1.sql.VarChar, firstName || 'Usuario')
                .input('apellido', db_1.sql.VarChar, lastName || 'Nuevo')
                .query(`INSERT INTO PerfilesPostulantes (usuario_id, nombre, apellido) VALUES (@userId, @nombre, @apellido)`);
        }
        else if (role === 'oferente') {
            await pool.request()
                .input('userId', db_1.sql.Int, userId)
                .input('nombreEmpresa', db_1.sql.VarChar, companyName || 'Mi Empresa/Servicio')
                .query(`INSERT INTO PerfilesEmpresas (usuario_id, nombre_empresa) VALUES (@userId, @nombreEmpresa)`);
        }
        const token = jsonwebtoken_1.default.sign({ id: userId, role }, JWT_SECRET, { expiresIn: '1d' });
        res.status(201).json({ token, user: { id: userId, email, role, name: displayName } });
    }
    catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};
exports.register = register;
const googleLogin = async (req, res) => {
    try {
        const { email, name, googleId } = req.body;
        const ip = req.ip || req.connection.remoteAddress || 'desconocida';
        const pool = await db_1.poolPromise;
        if (!pool)
            return res.status(500).json({ message: 'Error de BD' });
        const result = await pool.request()
            .input('email', db_1.sql.VarChar, email)
            .query(`SELECT u.id, u.email, r.nombre as rol FROM Usuarios u
                    INNER JOIN Roles r ON u.rol_id = r.id WHERE u.email = @email`);
        const user = result.recordset[0];
        if (!user) {
            return res.status(404).json({
                message: 'No encontramos una cuenta con este email de Google. ¿Querés registrarte?',
                code: 'NOT_REGISTERED',
                email,
                name
            });
        }
        // Update google_id if not set
        if (googleId) {
            await pool.request()
                .input('googleId', db_1.sql.VarChar, googleId)
                .input('id', db_1.sql.Int, user.id)
                .query('UPDATE Usuarios SET google_id = @googleId WHERE id = @id AND google_id IS NULL');
        }
        const role = ROL_NAME[user.rol] || 'postulante';
        await saveLoginLog(pool, user.id, email, 'google', ip);
        // Fetch profile data
        let profileData = {};
        if (role === 'postulante') {
            const prof = await pool.request().input('id', db_1.sql.Int, user.id).query('SELECT nombre, apellido, habilidades, experiencia, telefono, es_publico, cv_url, foto_url FROM PerfilesPostulantes WHERE usuario_id = @id');
            if (prof.recordset.length > 0) {
                const p = prof.recordset[0];
                profileData = {
                    firstName: p.nombre,
                    lastName: p.apellido,
                    name: `${p.nombre} ${p.apellido}`.trim(),
                    skills: p.habilidades,
                    profession: p.experiencia,
                    phone: p.telefono,
                    esPublico: p.es_publico,
                    cvUrl: p.cv_url,
                    fotoUrl: p.foto_url
                };
            }
        }
        else if (role === 'oferente') {
            const prof = await pool.request().input('id', db_1.sql.Int, user.id).query('SELECT nombre_empresa, descripcion, ubicacion, tipo_oferente FROM PerfilesEmpresas WHERE usuario_id = @id');
            if (prof.recordset.length > 0) {
                const p = prof.recordset[0];
                profileData = {
                    companyName: p.nombre_empresa,
                    name: p.nombre_empresa,
                    description: p.descripcion,
                    zone: p.ubicacion,
                    tipoOferente: p.tipo_oferente
                };
            }
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, role }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, user: { id: user.id, email: user.email, role, ...profileData } });
    }
    catch (error) {
        console.error('Google login error:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};
exports.googleLogin = googleLogin;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const ip = req.ip || req.connection.remoteAddress || 'desconocida';
        const pool = await db_1.poolPromise;
        if (!pool)
            return res.status(500).json({ message: 'Error de BD' });
        const result = await pool.request()
            .input('email', db_1.sql.VarChar, email)
            .query(`SELECT u.id, u.email, u.password, r.nombre as rol FROM Usuarios u
                    INNER JOIN Roles r ON u.rol_id = r.id WHERE u.email = @email`);
        const user = result.recordset[0];
        if (!user) {
            return res.status(404).json({
                message: 'Esta cuenta no está registrada. ¿Querés registrarte?',
                code: 'NOT_REGISTERED',
                email
            });
        }
        if (!user.password) {
            return res.status(400).json({
                message: 'Esta cuenta fue creada con Google. Usá "Acceder con Google" para ingresar.',
                code: 'USE_GOOGLE'
            });
        }
        const validPassword = await bcrypt_1.default.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Credenciales inválidas' });
        }
        const role = ROL_NAME[user.rol] || 'postulante';
        await saveLoginLog(pool, user.id, email, 'email', ip);
        // Fetch profile data
        let profileData = {};
        if (role === 'postulante') {
            const prof = await pool.request().input('id', db_1.sql.Int, user.id).query('SELECT nombre, apellido, habilidades, experiencia, telefono, es_publico, cv_url, foto_url FROM PerfilesPostulantes WHERE usuario_id = @id');
            if (prof.recordset.length > 0) {
                const p = prof.recordset[0];
                profileData = {
                    firstName: p.nombre,
                    lastName: p.apellido,
                    name: `${p.nombre} ${p.apellido}`.trim(),
                    skills: p.habilidades,
                    profession: p.experiencia,
                    phone: p.telefono,
                    esPublico: p.es_publico,
                    cvUrl: p.cv_url,
                    fotoUrl: p.foto_url
                };
            }
        }
        else if (role === 'oferente') {
            const prof = await pool.request().input('id', db_1.sql.Int, user.id).query('SELECT nombre_empresa, descripcion, ubicacion, tipo_oferente FROM PerfilesEmpresas WHERE usuario_id = @id');
            if (prof.recordset.length > 0) {
                const p = prof.recordset[0];
                profileData = {
                    companyName: p.nombre_empresa,
                    name: p.nombre_empresa,
                    description: p.descripcion,
                    zone: p.ubicacion,
                    tipoOferente: p.tipo_oferente
                };
            }
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, role }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, user: { id: user.id, email: user.email, role, ...profileData } });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};
exports.login = login;
