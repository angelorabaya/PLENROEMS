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

async function createTable() {
    try {
        const pool = await sql.connect(config);
        console.log('Connected to database...');

        const tableSchema = `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ActivityLogs' AND xtype='U')
      BEGIN
          CREATE TABLE ActivityLogs (
              LogID BIGINT IDENTITY(1,1) PRIMARY KEY,
              UserID INT NULL,
              UserName NVARCHAR(255) NULL,
              ActionType NVARCHAR(50) NOT NULL,
              TableName NVARCHAR(100) NULL,
              RecordID NVARCHAR(100) NULL,
              OldValues NVARCHAR(MAX) NULL,
              NewValues NVARCHAR(MAX) NULL,
              IPAddress NVARCHAR(50) NULL,
              UserAgent NVARCHAR(MAX) NULL,
              CreatedAt DATETIME2 DEFAULT GETDATE()
          );
          
          CREATE INDEX IX_ActivityLogs_TableName_RecordID ON ActivityLogs(TableName, RecordID);
          CREATE INDEX IX_ActivityLogs_UserID ON ActivityLogs(UserID);
          CREATE INDEX IX_ActivityLogs_CreatedAt ON ActivityLogs(CreatedAt);
          
          PRINT 'Table ActivityLogs created successfully.';
      END
      ELSE
      BEGIN
          PRINT 'Table ActivityLogs already exists.';
      END
    `;

        await pool.request().query(tableSchema);
        console.log('Schema update script executed.');

        await pool.close();
    } catch (err) {
        console.error('Error creating table:', err);
    }
}

createTable();
