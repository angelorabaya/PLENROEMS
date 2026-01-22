const sql = require('mssql');

/**
 * Logs a user activity to the database.
 * @param {import('mssql').ConnectionPool} pool - The MSSQL connection pool.
 * @param {object} req - The Express request object.
 * @param {object} details - Activity details.
 * @param {string} details.action - The action type (e.g., 'CREATE', 'UPDATE', 'DELETE').
 * @param {string} details.tableName - The name of the table affected.
 * @param {string} details.recordId - The ID of the record affected.
 * @param {object} [details.oldValues] - The data before the change (optional).
 * @param {object} [details.newValues] - The data after the change (optional).
 */
const logActivity = async (pool, req, { action, tableName, recordId, oldValues, newValues }) => {
    try {
        if (!pool) {
            console.warn('⚠️ Audit Log skipped: Database pool not available.');
            return;
        }

        // User mapping strategy:
        // 1. Check Custom Headers (sent by api.js)
        // 2. Check req.user / req.body (fallbacks)

        let userId = req.headers['x-log-user'];
        let userName = req.headers['x-log-cname'];

        if (!userId) {
            userId = req.user?.log_user || req.body?.log_user || 'System';
        }

        if (!userName) {
            userName = req.user?.log_cname || req.body?.log_cname || 'System User';
        }

        const ip = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('User-Agent');

        const request = pool.request();

        // Use Node.js time to ensure consistency with application server time
        const createdAt = new Date();
        console.log('📝 Audit Log Inserting:', { action, tableName, createdAt: createdAt.toLocaleString() });

        request.input('UserID', sql.NVarChar(255), userId);
        request.input('UserName', sql.NVarChar(255), userName);
        request.input('ActionType', sql.NVarChar(50), action);
        request.input('TableName', sql.NVarChar(100), tableName);
        request.input('RecordID', sql.NVarChar(100), recordId ? String(recordId) : null);
        request.input('OldValues', sql.NVarChar(sql.MAX), oldValues ? JSON.stringify(oldValues) : null);
        request.input('NewValues', sql.NVarChar(sql.MAX), newValues ? JSON.stringify(newValues) : null);
        request.input('IPAddress', sql.NVarChar(50), ip);
        request.input('UserAgent', sql.NVarChar(sql.MAX), userAgent);
        request.input('CreatedAt', sql.DateTime2, createdAt);

        // Fire and forget - don't await this if you don't want to block the response
        // But catching errors is important.
        await request.query(`
            INSERT INTO ActivityLogs (UserID, UserName, ActionType, TableName, RecordID, OldValues, NewValues, IPAddress, UserAgent, CreatedAt)
            VALUES (@UserID, @UserName, @ActionType, @TableName, @RecordID, @OldValues, @NewValues, @IPAddress, @UserAgent, @CreatedAt)
        `);

    } catch (err) {
        console.error("❌ Audit Log Error:", err.message);
        console.error("Stack:", err.stack);
    }
};

module.exports = { logActivity };
