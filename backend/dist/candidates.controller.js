"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCandidatesForOffer = exports.searchCandidates = void 0;
const db_1 = require("../db");
// Buscar candidatos públicos (para oferentes). Solo retorna datos públicos/anónimos.
const searchCandidates = async (req, res) => {
    try {
        const { query, zone, skills, profession } = req.body;
        const pool = await db_1.poolPromise;
        if (!pool)
            return res.status(500).json({ message: 'Error de BD' });
        let sqlQuery = `
            SELECT 
                c.Id,
                c.FirstName,
                c.LastName,
                c.Zone,
                c.Profession,
                c.Skills,
                c.Phone,
                c.CreatedAt
            FROM Candidates c
            WHERE 1 = 1
        `;
        const request = pool.request();
        if (query) {
            sqlQuery += ` AND (
                c.FirstName LIKE @query OR 
                c.LastName LIKE @query OR 
                c.Profession LIKE @query OR 
                c.Skills LIKE @query
            )`;
            request.input('query', db_1.sql.NVarChar, `%${query}%`);
        }
        if (zone) {
            sqlQuery += ` AND c.Zone = @zone`;
            request.input('zone', db_1.sql.NVarChar, zone);
        }
        if (skills) {
            sqlQuery += ` AND c.Skills LIKE @skills`;
            request.input('skills', db_1.sql.NVarChar, `%${skills}%`);
        }
        if (profession) {
            sqlQuery += ` AND c.Profession = @profession`;
            request.input('profession', db_1.sql.NVarChar, profession);
        }
        sqlQuery += ` ORDER BY c.CreatedAt DESC`;
        const result = await request.query(sqlQuery);
        res.json(result.recordset);
    }
    catch (error) {
        console.error('Error searching candidates:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};
exports.searchCandidates = searchCandidates;
// Ver candidatos que se han postulado a una oferta específica del oferente autenticado.
// Retorna datos completos (incluyendo email del usuario) solo para those who applied.
const getCandidatesForOffer = async (req, res) => {
    try {
        const { offerId } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'No autenticado' });
        }
        const pool = await db_1.poolPromise;
        if (!pool)
            return res.status(500).json({ message: 'Error de BD' });
        // Verify the offer belongs to this company
        const offerCheck = await pool.request()
            .input('offerId', db_1.sql.Int, parseInt(offerId))
            .input('userId', db_1.sql.Int, userId)
            .query(`
                SELECT o.Id FROM Offers o
                INNER JOIN Companies c ON o.CompanyId = c.Id
                WHERE o.Id = @offerId AND c.UserId = @userId
            `);
        if (offerCheck.recordset.length === 0) {
            return res.status(403).json({ message: 'No autorizado para ver esta oferta' });
        }
        // Get candidates who applied to this offer with full details
        const result = await pool.request()
            .input('offerId', db_1.sql.Int, parseInt(offerId))
            .query(`
                SELECT 
                    c.Id as CandidateId,
                    c.FirstName,
                    c.LastName,
                    c.Zone,
                    c.Profession,
                    c.Skills,
                    c.Phone,
                    c.ResumeUrl,
                    u.Email,
                    a.Status as ApplicationStatus,
                    a.CreatedAt as ApplicationDate
                FROM Applications a
                INNER JOIN Candidates c ON a.CandidateId = c.Id
                INNER JOIN Users u ON c.UserId = u.Id
                WHERE a.OfferId = @offerId
                ORDER BY a.CreatedAt DESC
            `);
        res.json(result.recordset);
    }
    catch (error) {
        console.error('Error getting candidates for offer:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};
exports.getCandidatesForOffer = getCandidatesForOffer;
