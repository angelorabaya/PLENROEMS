const sql = require('mssql');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
const envPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const config = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'YourPassword123',
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_NAME || 'PLENRO',
    authentication: {
        type: 'default'
    },
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableKeepAlive: true,
        connectionTimeout: 30000,
        requestTimeout: 30000
    }
};

async function alterTable() {
    try {
        const pool = await sql.connect(config);
        console.log('Connected to database...');

        // 1. Drop the index on UserID first (if it exists) because you can't alter a column that is indexed
        try {
            await pool.request().query("DROP INDEX IX_ActivityLogs_UserID ON ActivityLogs");
            console.log('Index IX_ActivityLogs_UserID dropped.');
        } catch (e) {
            console.log('Index drop skipped (likely didn\'t exist):', e.message);
        }

        // 2. Alter the column
        // Converting INT to NVARCHAR might operate fine if table is empty or has compatible data.
        // If it has actual INTs, they cast to string okay.
        await pool.request().query("ALTER TABLE ActivityLogs ALTER COLUMN UserID NVARCHAR(255) NULL");
        console.log('Column UserID altered to NVARCHAR(255).');

        // 3. Re-create the index
        await pool.request().query("CREATE INDEX IX_ActivityLogs_UserID ON ActivityLogs(UserID)");
        console.log('Index IX_ActivityLogs_UserID re-created.');

        await pool.close();
    } catch (err) {
        console.error('Error altering table:', err);
    }
}

alterTable();
