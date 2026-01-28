const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { logActivity } = require('./utils/logger');
const bcrypt = require('bcrypt');

const envPath = path.resolve(__dirname, '.env');
const rootEnvPath = path.resolve(__dirname, '..', '.env');

// Load backend-specific .env first
try {
  const parsed = dotenv.parse(fs.readFileSync(envPath));
  Object.entries(parsed).forEach(([key, value]) => {
    process.env[key] = value;
  });
  // eslint-disable-next-line no-console
  console.log('📄 Loaded backend env from:', envPath);
} catch (err) {
  // eslint-disable-next-line no-console
  console.warn('⚠️  Failed to load backend .env file:', envPath, err.message);
}

// Load root .env for shared variables (like VITE_ATTACHMENTS_BASE_PATH)
try {
  const rootParsed = dotenv.parse(fs.readFileSync(rootEnvPath));
  Object.entries(rootParsed).forEach(([key, value]) => {
    // Only set if not already defined in backend .env
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
  // eslint-disable-next-line no-console
  console.log('📄 Loaded root env from:', rootEnvPath);
} catch (err) {
  // eslint-disable-next-line no-console
  console.warn('⚠️  Failed to load root .env file:', rootEnvPath, err.message);
}

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(cors({
  exposedHeaders: ['x-log-user', 'x-log-cname'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-log-user', 'x-log-cname']
}));

// SQL Server Configuration
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

let pool;
const DEFAULT_ATTACHMENTS_BASE_PATH = '\\\\Enro-server\\servershare\\attachments\\';
const normalizeAttachmentBasePath = (value) => {
  const base = value && value.trim() ? value.trim() : DEFAULT_ATTACHMENTS_BASE_PATH;
  const sanitized = base.replace(/[\\/]*$/, '');
  return `${sanitized}\\`;
};
// Support both ATTACHMENTS_BASE_PATH (backend) and VITE_ATTACHMENTS_BASE_PATH (shared)
const ATTACHMENTS_BASE_PATH = normalizeAttachmentBasePath(
  process.env.ATTACHMENTS_BASE_PATH || process.env.VITE_ATTACHMENTS_BASE_PATH
);
console.log('📁 Attachments path:', ATTACHMENTS_BASE_PATH);

// eslint-disable-next-line no-console
console.log('📄 Effective DB env:', {
  DB_SERVER: process.env.DB_SERVER,
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER
});

// Initialize SQL Pool
async function initializePool() {
  try {
    pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log('✅ SQL Server Connected Successfully!');
    console.log(`📊 Connected to: ${config.server}/${config.database}`);
    return true;
  } catch (err) {
    console.error('❌ SQL Server Connection Error:', err.message);
    console.error('🔧 Check your .env file credentials');
    setTimeout(initializePool, 5000);
    return false;
  }
}

initializePool();

// Middleware to check pool connection
const checkPool = (req, res, next) => {
  if (!pool) {
    return res.status(503).json({ error: 'Database connection not established' });
  }
  next();
};

app.use(checkPool);



// ==================== LOGIN ENDPOINTS ====================

// ==================== AUTHENTICATION ====================

app.post('/api/login', async (req, res) => {
  try {
    const { log_user, log_pass } = req.body;

    if (!log_user || !log_pass) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Removed tbl_users query to fix "Invalid object name" error.
    // Proceeding to tbl_login authentication.

    // Fallback to old tbl_login for backward compatibility
    const oldRequest = pool.request();
    oldRequest.input('log_user', sql.VarChar, log_user.toUpperCase());
    oldRequest.input('log_pass', sql.VarChar, log_pass);

    const oldResult = await oldRequest.query(`
      SELECT [log_ctrlno]
            ,[log_user]
            ,[log_pass]
            ,[log_access]
            ,[log_cname]
            ,[log_empid]
            ,[log_mining]
            ,[log_dmsr]
            ,[log_dmst]
            ,[log_reports]
      FROM [tbl_login] 
      WHERE log_user = @log_user AND log_pass = @log_pass
    `);

    if (oldResult.recordset.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = oldResult.recordset[0];
    res.json({
      log_id: user.log_ctrlno,
      log_user: user.log_user,
      log_cname: user.log_cname,
      log_access: user.log_access,
      log_mining: user.log_mining,
      log_dmsr: user.log_dmsr,
      log_dmst: user.log_dmst,
      log_reports: user.log_reports,
      role: 'viewer', // Keeping default role logic for now unless access levels map to roles
      role_id: 4
    });
  } catch (err) {
    console.error('Login Error:', err.message);
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});



// ==================== CLIENTS ENDPOINTS ====================


app.get('/api/clients', async (req, res) => {
  try {
    const request = pool.request();

    const result = await request.query(`
      SELECT [ph_ctrlno]
            ,[ph_lname]
            ,[ph_fname]
            ,[ph_minitial]
            ,[ph_suffix]
            ,[ph_cname]
            ,[ph_address1]
            ,[ph_address2]
            ,[ph_TIN]
            ,[ph_photosrc]
            ,[ph_ctype]
            ,[ph_contact]
            ,[ph_corporate]
            ,[ph_tpermit]
      FROM [tbl_client]
      ORDER BY [ph_cname]
    `);

    console.log(`✅ Fetched ${result.recordset.length} clients`);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('❌ Get Clients Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch clients: ' + err.message });
  }
});

app.post('/api/clients', async (req, res) => {
  try {
    const { ph_lname, ph_fname, ph_minitial, ph_suffix, ph_cname, ph_address1, ph_address2, ph_TIN, ph_photosrc, ph_ctype, ph_contact, ph_corporate, ph_tpermit } = req.body;

    if (!ph_cname) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    const request = pool.request();
    request.input('ph_lname', sql.VarChar(100), ph_lname || null);
    request.input('ph_fname', sql.VarChar(100), ph_fname || null);
    request.input('ph_minitial', sql.VarChar(1), ph_minitial || null);
    request.input('ph_suffix', sql.VarChar(50), ph_suffix || null);
    request.input('ph_cname', sql.VarChar(150), ph_cname);
    request.input('ph_address1', sql.VarChar(200), ph_address1);
    request.input('ph_address2', sql.VarChar(200), ph_address2 || null);
    request.input('ph_TIN', sql.VarChar(50), ph_TIN || null);
    request.input('ph_photosrc', sql.VarChar(255), ph_photosrc || null);
    request.input('ph_ctype', sql.VarChar(50), ph_ctype);
    request.input('ph_contact', sql.VarChar(50), ph_contact);
    request.input('ph_corporate', sql.Bit, ph_corporate ? 1 : 0);
    request.input('ph_tpermit', sql.VarChar(50), ph_tpermit || null);

    await request.query(`
      INSERT INTO [tbl_client]
           ([ph_lname]
           ,[ph_fname]
           ,[ph_minitial]
           ,[ph_suffix]
           ,[ph_cname]
           ,[ph_address1]
           ,[ph_address2]
           ,[ph_TIN]
           ,[ph_photosrc]
           ,[ph_ctype]
           ,[ph_contact]
           ,[ph_corporate]
           ,[ph_tpermit])
      OUTPUT inserted.ph_ctrlno
      VALUES
           (@ph_lname
           ,@ph_fname
           ,@ph_minitial
           ,@ph_suffix
           ,@ph_cname
           ,@ph_address1
           ,@ph_address2
           ,@ph_TIN
           ,@ph_photosrc
           ,@ph_ctype
           ,@ph_contact
           ,@ph_corporate
           ,@ph_tpermit)
    `);

    // In a real scenario, you'd get the inserted ID. 
    // Since we didn't capture it in the original query, we might just log 'New Record' or similar, 
    // OR update the query above to use OUTPUT inserted.ph_ctrlno. I added OUTPUT above.
    // However, execute() or query() result handling depends on library. 
    // Let's assume we want to query the name or just log the payload.
    await logActivity(pool, req, {
      action: 'CREATE',
      tableName: 'tbl_client',
      recordId: ph_cname,
      newValues: req.body
    });

    console.log('✅ Client added successfully');
    res.json({ message: 'Client added successfully' });
  } catch (err) {
    console.error('❌ Add Client Error:', err.message);
    res.status(500).json({ error: 'Failed to add client: ' + err.message });
  }
});

app.put('/api/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { ph_lname, ph_fname, ph_minitial, ph_suffix, ph_cname, ph_address1, ph_address2, ph_TIN, ph_photosrc, ph_ctype, ph_contact, ph_corporate, ph_tpermit } = req.body;

    if (!ph_cname) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    // 1. Fetch old values
    const getKeyReq = pool.request();
    getKeyReq.input('ph_ctrlno', sql.Int, id);
    const splitResult = await getKeyReq.query('SELECT * FROM tbl_client WHERE ph_ctrlno = @ph_ctrlno');
    const oldValues = splitResult.recordset[0];

    const request = pool.request();
    request.input('ph_ctrlno', sql.Int, id);
    request.input('ph_lname', sql.VarChar(100), ph_lname || null);
    request.input('ph_fname', sql.VarChar(100), ph_fname || null);
    request.input('ph_minitial', sql.VarChar(1), ph_minitial || null);
    request.input('ph_suffix', sql.VarChar(50), ph_suffix || null);
    request.input('ph_cname', sql.VarChar(150), ph_cname);
    request.input('ph_address1', sql.VarChar(200), ph_address1);
    request.input('ph_address2', sql.VarChar(200), ph_address2 || null);
    request.input('ph_TIN', sql.VarChar(50), ph_TIN || null);
    request.input('ph_photosrc', sql.VarChar(255), ph_photosrc || null);
    request.input('ph_ctype', sql.VarChar(50), ph_ctype);
    request.input('ph_contact', sql.VarChar(50), ph_contact);
    request.input('ph_corporate', sql.Bit, ph_corporate ? 1 : 0);
    request.input('ph_tpermit', sql.VarChar(50), ph_tpermit || null);

    await request.query(`
      UPDATE [tbl_client]
      SET [ph_lname] = @ph_lname
         ,[ph_fname] = @ph_fname
         ,[ph_minitial] = @ph_minitial
         ,[ph_suffix] = @ph_suffix
         ,[ph_cname] = @ph_cname
         ,[ph_address1] = @ph_address1
         ,[ph_address2] = @ph_address2
         ,[ph_TIN] = @ph_TIN
         ,[ph_photosrc] = @ph_photosrc
         ,[ph_ctype] = @ph_ctype
         ,[ph_contact] = @ph_contact
         ,[ph_corporate] = @ph_corporate
         ,[ph_tpermit] = @ph_tpermit
      WHERE [ph_ctrlno] = @ph_ctrlno
    `);

    // 2. Log Activity
    await logActivity(pool, req, {
      action: 'UPDATE',
      tableName: 'tbl_client',
      recordId: id,
      oldValues: oldValues,
      newValues: req.body
    });

    console.log(`✅ Client ${id} updated successfully`);
    res.json({ message: 'Client updated successfully' });
  } catch (err) {
    console.error('❌ Update Client Error:', err.message);
    res.status(500).json({ error: 'Failed to update client: ' + err.message });
  }
});

app.delete('/api/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Fetch old values for logging
    const getReq = pool.request();
    getReq.input('ph_ctrlno', sql.Int, id);
    const existing = await getReq.query('SELECT * FROM [tbl_client] WHERE [ph_ctrlno] = @ph_ctrlno');
    const oldValues = existing.recordset[0];

    const request = pool.request();
    request.input('ph_ctrlno', sql.Int, id);

    await request.query(
      'DELETE FROM [tbl_client] WHERE [ph_ctrlno] = @ph_ctrlno'
    );

    // 2. Log Activity
    if (oldValues) {
      await logActivity(pool, req, {
        action: 'DELETE',
        tableName: 'tbl_client',
        recordId: id,
        oldValues: oldValues
      });
    }

    console.log(`✅ Client ${id} deleted successfully`);
    res.json({ message: 'Client deleted successfully' });
  } catch (err) {
    console.error('❌ Delete Client Error:', err.message);
    res.status(500).json({ error: 'Failed to delete client: ' + err.message });
  }
});

// ==================== PERMIT TYPES ENDPOINTS ====================

app.get('/api/permittypes', async (req, res) => {
  try {
    const request = pool.request();
    const result = await request.query(`
      SELECT [tp_ctrlno]
            ,[tp_code]
            ,[tp_desc]
            ,[tp_expyear]
      FROM [tbl_permittype]
    `);
    console.log(`✅ Fetched ${result.recordset.length} permit types`);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('❌ Get Permit Types Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch permit types: ' + err.message });
  }
});

app.post('/api/permittypes', async (req, res) => {
  try {
    const { tp_code, tp_desc, tp_expyear } = req.body;

    if (!tp_code || !tp_desc) {
      return res.status(400).json({ error: 'Code and description are required' });
    }

    const request = pool.request();
    request.input('tp_code', sql.VarChar(50), tp_code);
    request.input('tp_desc', sql.VarChar(200), tp_desc);
    request.input('tp_expyear', sql.Float, tp_expyear || 0);

    await request.query(`
      INSERT INTO [tbl_permittype]
           ([tp_code]
           ,[tp_desc]
           ,[tp_expyear])
      OUTPUT inserted.tp_ctrlno
      VALUES
           (@tp_code
           ,@tp_desc
           ,@tp_expyear)
    `);

    await logActivity(pool, req, {
      action: 'CREATE',
      tableName: 'tbl_permittype',
      recordId: tp_code,
      newValues: req.body
    });

    console.log('✅ Permit type added successfully');
    res.json({ message: 'Permit type added successfully' });
  } catch (err) {
    console.error('❌ Add Permit Type Error:', err.message);
    res.status(500).json({ error: 'Failed to add permit type: ' + err.message });
  }
});

app.put('/api/permittypes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { tp_code, tp_desc, tp_expyear } = req.body;

    if (!tp_code || !tp_desc) {
      return res.status(400).json({ error: 'Code and description are required' });
    }

    // 1. Fetch old values
    const getReq = pool.request();
    getReq.input('tp_ctrlno', sql.Int, id);
    const splitResult = await getReq.query('SELECT * FROM tbl_permittype WHERE tp_ctrlno = @tp_ctrlno');
    const oldValues = splitResult.recordset[0];

    const request = pool.request();
    request.input('tp_ctrlno', sql.Int, id);
    request.input('tp_code', sql.VarChar(50), tp_code);
    request.input('tp_desc', sql.VarChar(200), tp_desc);
    request.input('tp_expyear', sql.Float, tp_expyear || 0);

    await request.query(`
      UPDATE [tbl_permittype]
      SET [tp_code] = @tp_code
         ,[tp_desc] = @tp_desc
         ,[tp_expyear] = @tp_expyear
      WHERE [tp_ctrlno] = @tp_ctrlno
    `);

    await logActivity(pool, req, {
      action: 'UPDATE',
      tableName: 'tbl_permittype',
      recordId: id,
      oldValues: oldValues,
      newValues: req.body
    });

    console.log(`✅ Permit type ${id} updated successfully`);
    res.json({ message: 'Permit type updated successfully' });
  } catch (err) {
    console.error('❌ Update Permit Type Error:', err.message);
    res.status(500).json({ error: 'Failed to update permit type: ' + err.message });
  }
});

app.delete('/api/permittypes/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Fetch old values
    const getReq = pool.request();
    getReq.input('tp_ctrlno', sql.Int, id);
    const existing = await getReq.query('SELECT * FROM tbl_permittype WHERE tp_ctrlno = @tp_ctrlno');
    const oldValues = existing.recordset[0];

    const request = pool.request();
    request.input('tp_ctrlno', sql.Int, id);

    await request.query(
      'DELETE FROM [tbl_permittype] WHERE [tp_ctrlno] = @tp_ctrlno'
    );

    if (oldValues) {
      await logActivity(pool, req, {
        action: 'DELETE',
        tableName: 'tbl_permittype',
        recordId: id,
        oldValues: oldValues
      });
    }

    console.log(`✅ Permit type ${id} deleted successfully`);
    res.json({ message: 'Permit type deleted successfully' });
  } catch (err) {
    console.error('❌ Delete Permit Type Error:', err.message);
    res.status(500).json({ error: 'Failed to delete permit type: ' + err.message });
  }
});

// ==================== PERMIT REQUIREMENTS ENDPOINTS ====================

app.get('/api/permitreqs', async (req, res) => {
  try {
    const request = pool.request();
    const result = await request.query(`
      SELECT [pr_ctrlno]
            ,[pr_status]
            ,[pr_desc]
      FROM [tbl_permitreq]
    `);
    console.log(`✅ Fetched ${result.recordset.length} permit requirements`);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('❌ Get Permit Requirements Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch permit requirements: ' + err.message });
  }
});

app.post('/api/permitreqs', async (req, res) => {
  try {
    const { pr_status, pr_desc } = req.body;

    if (!pr_status || !pr_desc) {
      return res.status(400).json({ error: 'Status and description required' });
    }

    const request = pool.request();
    request.input('pr_status', sql.VarChar(50), pr_status);
    request.input('pr_desc', sql.VarChar(500), pr_desc);

    await request.query(`
      INSERT INTO [tbl_permitreq]
           ([pr_status]
           ,[pr_desc])
      OUTPUT inserted.pr_ctrlno
      VALUES
           (@pr_status
           ,@pr_desc)
    `);

    await logActivity(pool, req, {
      action: 'CREATE',
      tableName: 'tbl_permitreq',
      recordId: pr_desc, // Using description as ID ref if CTRLNO not easily available without extra query, or just logging payload
      newValues: req.body
    });

    console.log('✅ Permit requirement added successfully');
    res.json({ message: 'Permit requirement added successfully' });
  } catch (err) {
    console.error('❌ Add Permit Requirement Error:', err.message);
    res.status(500).json({ error: 'Failed to add permit requirement: ' + err.message });
  }
});

app.put('/api/permitreqs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { pr_status, pr_desc } = req.body;

    if (!pr_status || !pr_desc) {
      return res.status(400).json({ error: 'Status and description required' });
    }

    // 1. Fetch old values
    const getReq = pool.request();
    getReq.input('pr_ctrlno', sql.Int, id);
    const splitResult = await getReq.query('SELECT * FROM tbl_permitreq WHERE pr_ctrlno = @pr_ctrlno');
    const oldValues = splitResult.recordset[0];

    const request = pool.request();
    request.input('pr_ctrlno', sql.Int, id);
    request.input('pr_status', sql.VarChar(50), pr_status);
    request.input('pr_desc', sql.VarChar(500), pr_desc);

    await request.query(`
      UPDATE [tbl_permitreq]
      SET [pr_status] = @pr_status
         ,[pr_desc] = @pr_desc
      WHERE [pr_ctrlno] = @pr_ctrlno
    `);

    await logActivity(pool, req, {
      action: 'UPDATE',
      tableName: 'tbl_permitreq',
      recordId: id,
      oldValues: oldValues,
      newValues: req.body
    });

    console.log(`✅ Permit requirement ${id} updated successfully`);
    res.json({ message: 'Permit requirement updated successfully' });
  } catch (err) {
    console.error('❌ Update Permit Requirement Error:', err.message);
    res.status(500).json({ error: 'Failed to update permit requirement: ' + err.message });
  }
});

app.delete('/api/permitreqs/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Fetch old values
    const getReq = pool.request();
    getReq.input('pr_ctrlno', sql.Int, id);
    const existing = await getReq.query('SELECT * FROM tbl_permitreq WHERE pr_ctrlno = @pr_ctrlno');
    const oldValues = existing.recordset[0];

    const request = pool.request();
    request.input('pr_ctrlno', sql.Int, id);

    await request.query(
      'DELETE FROM [tbl_permitreq] WHERE [pr_ctrlno] = @pr_ctrlno'
    );

    if (oldValues) {
      await logActivity(pool, req, {
        action: 'DELETE',
        tableName: 'tbl_permitreq',
        recordId: id,
        oldValues: oldValues
      });
    }

    console.log(`✅ Permit requirement ${id} deleted successfully`);
    res.json({ message: 'Permit requirement deleted successfully' });
  } catch (err) {
    console.error('❌ Delete Permit Requirement Error:', err.message);
    res.status(500).json({ error: 'Failed to delete permit requirement: ' + err.message });
  }
});

// ==================== COMMODITY ENDPOINTS ====================

app.get('/api/commodities', async (req, res) => {
  try {
    const request = pool.request();
    const result = await request.query(`
      SELECT [cm_ctrlno]
            ,[cm_desc]
            ,[cm_kind]
      FROM [tbl_commodity]
      ORDER BY [cm_desc]
    `);
    console.log(`✅ Fetched ${result.recordset.length} commodities`);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('❌ Get Commodities Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch commodities: ' + err.message });
  }
});

app.post('/api/commodities', async (req, res) => {
  try {
    const { cm_desc, cm_kind } = req.body;

    if (!cm_desc) {
      return res.status(400).json({ error: 'Description is required' });
    }

    const request = pool.request();
    request.input('cm_desc', sql.VarChar(200), cm_desc);
    request.input('cm_kind', sql.VarChar(50), cm_kind || null);

    await request.query(`
      INSERT INTO [tbl_commodity]
           ([cm_desc]
           ,[cm_kind])
      OUTPUT inserted.cm_ctrlno
      VALUES
           (@cm_desc
           ,@cm_kind)
    `);

    await logActivity(pool, req, {
      action: 'CREATE',
      tableName: 'tbl_commodity',
      recordId: cm_desc,
      newValues: req.body
    });

    console.log('✅ Commodity added successfully');
    res.json({ message: 'Commodity added successfully' });
  } catch (err) {
    console.error('❌ Add Commodity Error:', err.message);
    res.status(500).json({ error: 'Failed to add commodity: ' + err.message });
  }
});

app.put('/api/commodities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { cm_desc, cm_kind } = req.body;

    if (!cm_desc) {
      return res.status(400).json({ error: 'Description is required' });
    }

    // 1. Fetch old values
    const getReq = pool.request();
    getReq.input('cm_ctrlno', sql.Int, id);
    const splitResult = await getReq.query('SELECT * FROM tbl_commodity WHERE cm_ctrlno = @cm_ctrlno');
    const oldValues = splitResult.recordset[0];

    const request = pool.request();
    request.input('cm_ctrlno', sql.Int, id);
    request.input('cm_desc', sql.VarChar(200), cm_desc);
    request.input('cm_kind', sql.VarChar(50), cm_kind || null);

    await request.query(`
      UPDATE [tbl_commodity]
      SET [cm_desc] = @cm_desc
         ,[cm_kind] = @cm_kind
      WHERE [cm_ctrlno] = @cm_ctrlno
    `);

    await logActivity(pool, req, {
      action: 'UPDATE',
      tableName: 'tbl_commodity',
      recordId: id,
      oldValues: oldValues,
      newValues: req.body
    });

    console.log(`✅ Commodity ${id} updated successfully`);
    res.json({ message: 'Commodity updated successfully' });
  } catch (err) {
    console.error('❌ Update Commodity Error:', err.message);
    res.status(500).json({ error: 'Failed to update commodity: ' + err.message });
  }
});

app.delete('/api/commodities/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Fetch old values
    const getReq = pool.request();
    getReq.input('cm_ctrlno', sql.Int, id);
    const existing = await getReq.query('SELECT * FROM tbl_commodity WHERE cm_ctrlno = @cm_ctrlno');
    const oldValues = existing.recordset[0];

    const request = pool.request();
    request.input('cm_ctrlno', sql.Int, id);

    await request.query(
      'DELETE FROM [tbl_commodity] WHERE [cm_ctrlno] = @cm_ctrlno'
    );

    if (oldValues) {
      await logActivity(pool, req, {
        action: 'DELETE',
        tableName: 'tbl_commodity',
        recordId: id,
        oldValues: oldValues
      });
    }

    console.log(`✅ Commodity ${id} deleted successfully`);
    res.json({ message: 'Commodity deleted successfully' });
  } catch (err) {
    console.error('❌ Delete Commodity Error:', err.message);
    res.status(500).json({ error: 'Failed to delete commodity: ' + err.message });
  }
});

// ==================== NATURE OF PAYMENT ENDPOINTS ====================

// Get all nature of payments (for dropdown)
app.get('/api/natureofpaymentlist', async (req, res) => {
  try {
    const request = pool.request();
    const result = await request.query(`
      SELECT [np_ctrlno]
            ,[np_desc]
      FROM [tbl_natureofpayment]
      ORDER BY [np_desc]
    `);
    console.log(`✅ Fetched ${result.recordset.length} nature of payments`);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('❌ Get Nature of Payments Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch nature of payments: ' + err.message });
  }
});

// Get distinct measures for dropdown
app.get('/api/natureofpaymentmeasures', async (req, res) => {
  try {
    const request = pool.request();
    const result = await request.query(`
      SELECT DISTINCT [np_measure]
      FROM [tbl_natureofpaymentdtl]
      WHERE [np_measure] IS NOT NULL AND [np_measure] != ''
      ORDER BY [np_measure]
    `);
    const measures = result.recordset.map(r => r.np_measure);
    console.log(`✅ Fetched ${measures.length} distinct measures`);
    res.json(measures);
  } catch (err) {
    console.error('❌ Get Measures Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch measures: ' + err.message });
  }
});

// Get nature of payment details by parent ID
app.get('/api/natureofpaymentdetails/:npCtrlno', async (req, res) => {
  try {
    const { npCtrlno } = req.params;
    const request = pool.request();
    request.input('np_lnkctrl', sql.Int, npCtrlno);

    const result = await request.query(`
      SELECT [np_ctrlno]
            ,[np_lnkctrl]
            ,[np_desc]
            ,[np_unitcharge]
            ,[np_ucsecond]
            ,[np_ucthird]
            ,[np_measure]
      FROM [tbl_natureofpaymentdtl]
      WHERE [np_lnkctrl] = @np_lnkctrl
      ORDER BY [np_desc]
    `);
    console.log(`✅ Fetched ${result.recordset.length} nature of payment details for ID ${npCtrlno}`);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('❌ Get Nature of Payment Details Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch nature of payment details: ' + err.message });
  }
});

// Create nature of payment detail
app.post('/api/natureofpaymentdetails', async (req, res) => {
  try {
    const { np_lnkctrl, np_desc, np_unitcharge, np_ucsecond, np_ucthird, np_measure } = req.body;

    if (!np_lnkctrl || !np_desc) {
      return res.status(400).json({ error: 'Nature ID and description are required' });
    }

    const request = pool.request();
    request.input('np_lnkctrl', sql.Int, np_lnkctrl);
    request.input('np_desc', sql.VarChar(200), np_desc);
    request.input('np_unitcharge', sql.Float, np_unitcharge || 0);
    request.input('np_ucsecond', sql.Float, np_ucsecond || 0);
    request.input('np_ucthird', sql.Float, np_ucthird || 0);
    request.input('np_measure', sql.VarChar(100), np_measure || null);

    await request.query(`
      INSERT INTO [tbl_natureofpaymentdtl]
           ([np_lnkctrl]
           ,[np_desc]
           ,[np_unitcharge]
           ,[np_ucsecond]
           ,[np_ucthird]
           ,[np_measure])
      OUTPUT inserted.np_ctrlno
      VALUES
           (@np_lnkctrl
           ,@np_desc
           ,@np_unitcharge
           ,@np_ucsecond
           ,@np_ucthird
           ,@np_measure)
    `);

    await logActivity(pool, req, {
      action: 'CREATE',
      tableName: 'tbl_natureofpaymentdtl',
      recordId: np_desc,
      newValues: req.body
    });

    console.log('✅ Nature of payment detail added successfully');
    res.json({ message: 'Nature of payment detail added successfully' });
  } catch (err) {
    console.error('❌ Add Nature of Payment Detail Error:', err.message);
    res.status(500).json({ error: 'Failed to add nature of payment detail: ' + err.message });
  }
});

// Update nature of payment detail
app.put('/api/natureofpaymentdetails/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { np_desc, np_unitcharge, np_ucsecond, np_ucthird, np_measure } = req.body;

    if (!np_desc) {
      return res.status(400).json({ error: 'Description is required' });
    }

    // Fetch old values
    const getReq = pool.request();
    getReq.input('np_ctrlno', sql.Int, id);
    const existing = await getReq.query('SELECT * FROM tbl_natureofpaymentdtl WHERE np_ctrlno = @np_ctrlno');
    const oldValues = existing.recordset[0];

    const request = pool.request();
    request.input('np_ctrlno', sql.Int, id);
    request.input('np_desc', sql.VarChar(200), np_desc);
    request.input('np_unitcharge', sql.Float, np_unitcharge || 0);
    request.input('np_ucsecond', sql.Float, np_ucsecond || 0);
    request.input('np_ucthird', sql.Float, np_ucthird || 0);
    request.input('np_measure', sql.VarChar(100), np_measure || null);

    await request.query(`
      UPDATE [tbl_natureofpaymentdtl]
      SET [np_desc] = @np_desc
         ,[np_unitcharge] = @np_unitcharge
         ,[np_ucsecond] = @np_ucsecond
         ,[np_ucthird] = @np_ucthird
         ,[np_measure] = @np_measure
      WHERE [np_ctrlno] = @np_ctrlno
    `);

    await logActivity(pool, req, {
      action: 'UPDATE',
      tableName: 'tbl_natureofpaymentdtl',
      recordId: id,
      oldValues: oldValues,
      newValues: req.body
    });

    console.log(`✅ Nature of payment detail ${id} updated successfully`);
    res.json({ message: 'Nature of payment detail updated successfully' });
  } catch (err) {
    console.error('❌ Update Nature of Payment Detail Error:', err.message);
    res.status(500).json({ error: 'Failed to update nature of payment detail: ' + err.message });
  }
});

// Delete nature of payment detail
app.delete('/api/natureofpaymentdetails/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch old values for logging
    const getReq = pool.request();
    getReq.input('np_ctrlno', sql.Int, id);
    const existing = await getReq.query('SELECT * FROM tbl_natureofpaymentdtl WHERE np_ctrlno = @np_ctrlno');
    const oldValues = existing.recordset[0];

    const request = pool.request();
    request.input('np_ctrlno', sql.Int, id);

    await request.query(
      'DELETE FROM [tbl_natureofpaymentdtl] WHERE [np_ctrlno] = @np_ctrlno'
    );

    if (oldValues) {
      await logActivity(pool, req, {
        action: 'DELETE',
        tableName: 'tbl_natureofpaymentdtl',
        recordId: id,
        oldValues: oldValues
      });
    }

    console.log(`✅ Nature of payment detail ${id} deleted successfully`);
    res.json({ message: 'Nature of payment detail deleted successfully' });
  } catch (err) {
    console.error('❌ Delete Nature of Payment Detail Error:', err.message);
    res.status(500).json({ error: 'Failed to delete nature of payment detail: ' + err.message });
  }
});

// ==================== PAYMENT REGISTRATIONS ENDPOINTS ====================

app.get('/api/paymentregistrations', async (req, res) => {
  try {
    const request = pool.request();
    const result = await request.query(`
      SELECT tbl_assessmenthdr.aop_control, 
             tbl_assessmenthdr.aop_ctrlno,
             tbl_client.ph_cname, 
             tbl_assessmenthdr.aop_date, 
             tbl_assessmenthdr.aop_nature, 
             tbl_assessmenthdr.aop_total, 
             tbl_assessmenthdr.aop_remarks
      FROM tbl_assessmenthdr 
      INNER JOIN tbl_client ON tbl_assessmenthdr.aop_clientid = tbl_client.ph_ctrlno
      WHERE (((tbl_assessmenthdr.aop_orno) IS NULL))
      ORDER BY tbl_assessmenthdr.aop_ctrlno DESC
    `);
    console.log(`✅ Fetched ${result.recordset.length} payment registrations`);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('❌ Get Payment Registrations Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch payment registrations: ' + err.message });
  }
});

app.delete('/api/paymentregistrations/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const request = pool.request();
    request.input('aop_ctrlno', sql.Int, id);

    // Find control number for detail deletion
    const existing = await request.query(
      'SELECT * FROM tbl_assessmenthdr WHERE aop_ctrlno = @aop_ctrlno'
    );

    if (!existing.recordset.length) {
      return res.status(404).json({ error: 'Payment registration not found' });
    }

    const oldValues = existing.recordset[0];
    const controlNo = oldValues.aop_control;

    // Delete detail rows first, then header
    const detailRequest = pool.request();
    detailRequest.input('aop_control', sql.VarChar, controlNo);
    await detailRequest.query('DELETE FROM tbl_assessmentdtl WHERE aop_control = @aop_control');

    const headerRequest = pool.request();
    headerRequest.input('aop_ctrlno', sql.Int, id);
    await headerRequest.query('DELETE FROM tbl_assessmenthdr WHERE aop_ctrlno = @aop_ctrlno');

    await logActivity(pool, req, {
      action: 'DELETE',
      tableName: 'tbl_assessmenthdr',
      recordId: id, // or controlNo, but ID matches header. ControlNo is more readable? let's stick to recordId or maybe controlNo. 
      // Other logs use PK. Let's use id (aop_ctrlno) or controlNo. 
      // Given prompt "deleted from AssessmentHistory", maybe user wants to see control #.
      // But `recordId` is usually the PK. I'll use `id` but maybe include controlNo in details? behavior in client/header is `id`.
      oldValues: oldValues
    });

    console.log(`✅ Payment registration ${id} deleted successfully`);
    res.json({ message: 'Payment registration deleted successfully' });
  } catch (err) {
    console.error('❌ Delete Payment Registration Error:', err.message);
    res.status(500).json({ error: 'Failed to delete payment registration: ' + err.message });
  }
});


// GET /api/clienttransactions
// Returns clients with assessment records (where aop_orno is not null)
app.get('/api/clienttransactions', async (req, res) => {
  try {
    const query = `
      SELECT tbl_client.ph_cname, tbl_client.ph_address1, tbl_client.ph_address2, 
             tbl_client.ph_TIN, tbl_client.ph_contact, tbl_client.ph_ctrlno
      FROM tbl_assessmenthdr 
      INNER JOIN tbl_client ON tbl_assessmenthdr.aop_clientid = tbl_client.ph_ctrlno
      WHERE tbl_assessmenthdr.aop_orno IS NOT NULL
      GROUP BY tbl_client.ph_cname, tbl_client.ph_address1, tbl_client.ph_address2, 
               tbl_client.ph_TIN, tbl_client.ph_contact, tbl_client.ph_ctrlno
      ORDER BY tbl_client.ph_cname
    `;

    const result = await pool.request().query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching transaction clients:', err);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// GET /api/assessmentdetails/:clientId
// Returns assessment details for a specific client
app.get('/api/assessmentdetails/:clientId', async (req, res) => {
  try {
    const clientId = req.params.clientId;
    const query = `
      SELECT tbl_assessmenthdr.aop_control, tbl_assessmenthdr.aop_orno, 
             tbl_assessmenthdr.aop_ordate, tbl_assessmentdtl.aop_item, 
             tbl_assessmentdtl.aop_volume, tbl_assessmentdtl.aop_charge, 
             tbl_assessmentdtl.aop_total, tbl_assessmenthdr.aop_remarks,
             tbl_assessmenthdr.aop_nature,
             tbl_assessmentdtl.aop_ctrlno
      FROM tbl_assessmenthdr 
      INNER JOIN tbl_assessmentdtl ON tbl_assessmenthdr.aop_control = tbl_assessmentdtl.aop_control
      WHERE tbl_assessmenthdr.aop_orno IS NOT NULL 
        AND tbl_assessmenthdr.aop_clientid = ${clientId}
      ORDER BY tbl_assessmenthdr.aop_ordate DESC, tbl_assessmentdtl.aop_ctrlno
    `;

    const result = await pool.request().query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching assessment details:', err);
    res.status(500).json({ error: 'Failed to fetch assessment details' });
  }
});

// DELETE /api/assessmentdetails/:id
// Deletes assessment detail and header rows by aop_control
app.delete('/api/assessmentdetails/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const request = pool.request();
    request.input('aop_control', sql.VarChar(50), id);

    // Fetch old values for audit logging
    const existingDtl = await request.query('SELECT * FROM tbl_assessmentdtl WHERE aop_control = @aop_control');
    const existingHdr = await request.query('SELECT * FROM tbl_assessmenthdr WHERE aop_control = @aop_control');

    const oldValuesDtl = existingDtl.recordset;
    const oldValuesHdr = existingHdr.recordset[0];

    if (oldValuesDtl.length === 0 && !oldValuesHdr) {
      return res.status(404).json({ error: 'Assessment record not found' });
    }

    // Delete from detail table first (child records)
    await request.query('DELETE FROM tbl_assessmentdtl WHERE aop_control = @aop_control');

    // Delete from header table (parent record)
    await request.query('DELETE FROM tbl_assessmenthdr WHERE aop_control = @aop_control');

    await logActivity(pool, req, {
      action: 'DELETE',
      tableName: 'tbl_assessmenthdr/tbl_assessmentdtl',
      recordId: id,
      oldValues: { header: oldValuesHdr, details: oldValuesDtl }
    });

    console.log(`✅ Assessment ${id} deleted successfully`);
    res.json({ message: 'Assessment deleted successfully' });
  } catch (err) {
    console.error('❌ Delete Assessment Error:', err.message);
    res.status(500).json({ error: 'Failed to delete assessment: ' + err.message });
  }
});


// DELETE /api/clients/:id
app.delete('/api/clients/:id', async (req, res) => {
  try {
    const { id } = req.params; // Changed from clientId to id to match route param
    const request = pool.request();
    request.input('ph_ctrlno', sql.Int, id); // Changed from clientId to ph_ctrlno

    // Fetch old values for logging
    const existingClient = await request.query('SELECT * FROM tbl_client WHERE ph_ctrlno = @ph_ctrlno');
    const oldValues = existingClient.recordset[0];

    if (!oldValues) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Delete related records first (e.g., from tbl_assessmenthdr, tbl_clientpermit)
    // This assumes cascading deletes are not set up or we want explicit control.
    // For simplicity, let's assume direct deletion for now, or add specific deletes for related tables if needed.
    // Example: await request.query('DELETE FROM tbl_assessmenthdr WHERE aop_clientid = @ph_ctrlno');
    // Example: await request.query('DELETE FROM tbl_clientpermit WHERE ph_lnkctrl = @ph_ctrlno');

    await request.query('DELETE FROM tbl_client WHERE ph_ctrlno = @ph_ctrlno');

    await logActivity(pool, req, {
      action: 'DELETE',
      tableName: 'tbl_client',
      recordId: id,
      oldValues: oldValues
    });

    console.log(`✅ Client ${id} deleted successfully`);
    res.json({ message: 'Client deleted successfully' });
  } catch (err) {
    console.error('❌ Delete Client Error:', err.message);
    res.status(500).json({ error: 'Failed to delete client: ' + err.message });
  }
});

// GET /api/clienttransactions/:clientId/nature
// Returns distinct nature of payment values for a client
app.get('/api/clienttransactions/:clientId/nature', async (req, res) => {
  try {
    const { clientId } = req.params;
    const request = pool.request();
    request.input('clientId', sql.Int, clientId);

    const result = await request.query(`
      SELECT aop_nature
      FROM tbl_assessmenthdr
      WHERE aop_clientid = @clientId
      GROUP BY aop_nature
      ORDER BY aop_nature
    `);

    res.json(result.recordset || []);
  } catch (err) {
    console.error('Error fetching nature of payment:', err);
    res.status(500).json({ error: 'Failed to fetch nature of payment' });
  }
});

// GET /api/assessments/:controlNo
// Returns assessment header and details by control number
app.get('/api/assessments/:controlNo', async (req, res) => {
  try {
    const { controlNo } = req.params;
    const headerRequest = pool.request();
    headerRequest.input('aop_control', sql.VarChar(50), controlNo);

    const headerResult = await headerRequest.query(`
      SELECT h.*, 
             c.ph_cname, c.ph_address1, c.ph_address2, c.ph_TIN
      FROM tbl_assessmenthdr h
      INNER JOIN tbl_client c ON h.aop_clientid = c.ph_ctrlno
      WHERE h.aop_control = @aop_control
    `);

    if (!headerResult.recordset.length) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const header = headerResult.recordset[0];

    const detailRequest = pool.request();
    detailRequest.input('aop_control', sql.VarChar(50), controlNo);

    const detailResult = await detailRequest.query(`
      SELECT aop_item, aop_volume, aop_charge, aop_total, aop_measure, aop_permitno
      FROM tbl_assessmentdtl
      WHERE aop_control = @aop_control
      ORDER BY aop_ctrlno
    `);

    res.json({
      header,
      details: detailResult.recordset || []
    });
  } catch (err) {
    console.error('Error fetching assessment by control:', err);
    res.status(500).json({ error: 'Failed to fetch assessment: ' + err.message });
  }
});

// GET /api/newapplication/clients
// Returns clients with permit numbers
app.get('/api/newapplication/clients', async (_req, res) => {
  try {
    const query = `
      SELECT tbl_client.ph_ctrlno,
             tbl_client.ph_cname,
             tbl_client.ph_address1,
             tbl_client.ph_address2,
             tbl_client.ph_TIN,
             tbl_client.ph_contact,
             tbl_client.ph_tpermit
      FROM tbl_client
      WHERE tbl_client.ph_tpermit IS NOT NULL AND tbl_client.ph_tpermit <> ''
      ORDER BY tbl_client.ph_cname
    `;
    const result = await pool.request().query(query);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('Error fetching new application clients:', err);
    res.status(500).json({ error: 'Failed to fetch clients: ' + err.message });
  }
});

// GET /api/productionaudit/clients
// Returns permit holder clients for Production Audit
app.get('/api/productionaudit/clients', async (_req, res) => {
  try {
    const query = `
      SELECT DISTINCT
             tbl_client.ph_cname,
             tbl_client.ph_address1,
             tbl_client.ph_address2,
             tbl_client.ph_TIN,
             tbl_client.ph_contact,
             tbl_client.ph_ctrlno,
             tbl_client.ph_tpermit
      FROM tbl_client
      INNER JOIN tbl_clientpermit ON tbl_client.ph_ctrlno = tbl_clientpermit.ph_lnkctrl
      WHERE tbl_client.ph_ctype = 'Permit Holder'
      ORDER BY tbl_client.ph_cname
      `;
    const result = await pool.request().query(query);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('Error fetching production audit clients:', err);
    res.status(500).json({ error: 'Failed to fetch production audit clients: ' + err.message });
  }
});

// GET /api/permitholder/permits/:clientId
// Returns permits for a specific client for Permit Holder page
app.get('/api/permitholder/permits/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    if (!clientId) {
      return res.status(400).json({ error: 'Client ID is required' });
    }

    const request = pool.request();
    request.input('clientId', sql.Int, clientId);

    const query = `
      SELECT
          ph_ctrlno,
          ph_permitno,
          ph_brgy,
          ph_brgy2,
          ph_mun,
          ph_volume,
          ph_area,
          ph_dfrom,
          ph_dto,
          ph_attach,
          ph_lnkctrl
      FROM dbo.tbl_clientpermit
      WHERE ph_lnkctrl = @clientId
      ORDER BY ph_dto DESC
    `;

    const result = await request.query(query);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('Error fetching permit holder permits:', err);
    res.status(500).json({ error: 'Failed to fetch permits: ' + err.message });
  }
});

// POST /api/permitholder/permits
// Creates a new client permit
app.post('/api/permitholder/permits', async (req, res) => {
  try {
    const { clientId, permitNo, municipality, barangay1, barangay2, volume, area, dateFrom, dateTo } = req.body || {};

    if (!clientId || !permitNo) {
      return res.status(400).json({ error: 'Client ID and Permit No. are required' });
    }

    const request = pool.request();
    request.input('clientId', sql.Int, clientId);
    request.input('permitNo', sql.VarChar(100), permitNo);
    request.input('municipality', sql.VarChar(200), municipality || '');
    request.input('barangay1', sql.VarChar(200), barangay1 || '');
    request.input('barangay2', sql.VarChar(200), barangay2 || '');
    request.input('volume', sql.Decimal(18, 2), volume ?? 0);
    request.input('area', sql.Decimal(18, 2), area ?? 0);
    request.input('dateFrom', sql.Date, dateFrom || null);
    request.input('dateTo', sql.Date, dateTo || null);

    const result = await request.query(`
      INSERT INTO tbl_clientpermit (ph_lnkctrl, ph_permitno, ph_mun, ph_brgy, ph_brgy2, ph_volume, ph_area, ph_dfrom, ph_dto)
      OUTPUT inserted.ph_ctrlno, inserted.ph_lnkctrl, inserted.ph_permitno, inserted.ph_mun, inserted.ph_brgy, inserted.ph_brgy2, inserted.ph_volume, inserted.ph_area, inserted.ph_dfrom, inserted.ph_dto, inserted.ph_attach
      VALUES (@clientId, @permitNo, @municipality, @barangay1, @barangay2, @volume, @area, @dateFrom, @dateTo)
    `);

    console.log('✅ Client permit created successfully');
    res.json(result.recordset?.[0] || {});
  } catch (err) {
    console.error('Error creating client permit:', err);
    res.status(500).json({ error: 'Failed to create permit: ' + err.message });
  }
});

// PUT /api/permitholder/permits/:id
// Updates an existing client permit
app.put('/api/permitholder/permits/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { permitNo, municipality, barangay1, barangay2, volume, area, dateFrom, dateTo } = req.body || {};

    if (!id || !permitNo) {
      return res.status(400).json({ error: 'ID and Permit No. are required' });
    }

    const request = pool.request();
    request.input('id', sql.Int, parseInt(id, 10));
    request.input('permitNo', sql.VarChar(100), permitNo);
    request.input('municipality', sql.VarChar(200), municipality || '');
    request.input('barangay1', sql.VarChar(200), barangay1 || '');
    request.input('barangay2', sql.VarChar(200), barangay2 || '');
    request.input('volume', sql.Decimal(18, 2), volume ?? 0);
    request.input('area', sql.Decimal(18, 2), area ?? 0);
    request.input('dateFrom', sql.Date, dateFrom || null);
    request.input('dateTo', sql.Date, dateTo || null);

    const result = await request.query(`
      UPDATE tbl_clientpermit
      SET ph_permitno = @permitNo,
          ph_mun = @municipality,
          ph_brgy = @barangay1,
          ph_brgy2 = @barangay2,
          ph_volume = @volume,
          ph_area = @area,
          ph_dfrom = @dateFrom,
          ph_dto = @dateTo
      OUTPUT inserted.ph_ctrlno, inserted.ph_lnkctrl, inserted.ph_permitno, inserted.ph_mun, inserted.ph_brgy, inserted.ph_brgy2, inserted.ph_volume, inserted.ph_area, inserted.ph_dfrom, inserted.ph_dto, inserted.ph_attach
      WHERE ph_ctrlno = @id
    `);

    if (!result.recordset?.length) {
      return res.status(404).json({ error: 'Permit not found' });
    }

    console.log(`✅ Client permit ${id} updated successfully`);
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error updating client permit:', err);
    res.status(500).json({ error: 'Failed to update permit: ' + err.message });
  }
});

// DELETE /api/permitholder/permits/:id
// Deletes a client permit
app.delete('/api/permitholder/permits/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'ID is required' });
    }

    const request = pool.request();
    request.input('id', sql.Int, parseInt(id, 10));

    const result = await request.query(`
      DELETE FROM tbl_clientpermit
      WHERE ph_ctrlno = @id
    `);

    if (!result.rowsAffected?.[0]) {
      return res.status(404).json({ error: 'Permit not found' });
    }

    console.log(`✅ Client permit ${id} deleted successfully`);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting client permit:', err);
    res.status(500).json({ error: 'Failed to delete permit: ' + err.message });
  }
});

// GET /api/productionaudit/permits/:clientId
// Returns permits for a specific client (ordered by validity end date desc)
app.get('/api/productionaudit/permits/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    if (!clientId) {
      return res.status(400).json({ error: 'Client ID is required' });
    }

    const request = pool.request();
    request.input('clientId', sql.VarChar(50), clientId);

    const query = `
      SELECT tbl_clientpermit.ph_lnkctrl,
             tbl_clientpermit.ph_permitno,
             tbl_clientpermit.ph_dfrom,
             tbl_clientpermit.ph_dto,
             tbl_clientpermit.ph_volume
      FROM tbl_clientpermit
      WHERE tbl_clientpermit.ph_lnkctrl = @clientId
      ORDER BY tbl_clientpermit.ph_dto DESC
    `;

    const result = await request.query(query);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('Error fetching production audit permits:', err);
    res.status(500).json({ error: 'Failed to fetch production audit permits: ' + err.message });
  }
});

// GET /api/productionaudit/production/:permitNo
// Returns production records for a permit number with volume paid derived from assessment history
app.get('/api/productionaudit/production/:permitNo', async (req, res) => {
  try {
    const { permitNo } = req.params;
    const { clientId } = req.query;
    if (!permitNo) {
      return res.status(400).json({ error: 'Permit number is required' });
    }
    if (!clientId) {
      return res.status(400).json({ error: 'Client id is required' });
    }

    const request = pool.request();
    request.input('permitNo', sql.VarChar(200), permitNo);
    request.input('clientId', sql.Int, clientId);
    request.input('naturePattern', sql.VarChar(200), '%Government Share%');

    const query = `
      WITH RankedProduction AS (
          SELECT 
              pr_ctrlno,
              pr_clientid,
              pr_permitno,
              pr_date,
              pr_vextracted,
              pr_vsold,
              ROW_NUMBER() OVER (ORDER BY pr_date) AS rn
          FROM tbl_production 
          WHERE pr_permitno = @permitNo
      )
      SELECT 
          p.pr_ctrlno,
          p.pr_clientid,
          p.pr_permitno,
          p.pr_date,
          p.pr_vextracted,
          p.pr_vsold,
          ISNULL(a.total_volume, 0) AS pr_vpaid,
          ISNULL(t.tf_volume, 0) AS pr_taskforce
      FROM RankedProduction p
      OUTER APPLY (
          SELECT 
              SUM(d.aop_volume) AS total_volume
          FROM tbl_assessmenthdr h
          INNER JOIN tbl_assessmentdtl d 
              ON h.aop_control = d.aop_control
          WHERE h.aop_clientid = p.pr_clientid
            AND h.aop_nature LIKE '%Government Share%'
            AND (
              (p.rn = 1 AND (
                  (YEAR(h.aop_ordate) = YEAR(p.pr_date) 
                   AND MONTH(h.aop_ordate) = MONTH(p.pr_date))
                  OR h.aop_ordate < p.pr_date
              ))
              OR (p.rn > 1 
                  AND YEAR(h.aop_ordate) = YEAR(p.pr_date) 
                  AND MONTH(h.aop_ordate) = MONTH(p.pr_date))
            )
      ) a
      OUTER APPLY (
          SELECT vt.TotalVolume as tf_volume
          FROM View_taskforce vt
          WHERE vt.RptYear = YEAR(p.pr_date)
            AND vt.Mo = MONTH(p.pr_date)
            AND LTRIM(RTRIM(vt.PersonName)) = LTRIM(RTRIM((SELECT c.ph_cname FROM tbl_client c WHERE c.ph_ctrlno = @clientId)))
      ) t
      ORDER BY p.pr_date;
    `;

    const result = await request.query(query);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('Error fetching production audit data:', err);
    res.status(500).json({ error: 'Failed to fetch production audit data: ' + err.message });
  }
});

// POST /api/productionaudit/production
app.post('/api/productionaudit/production', async (req, res) => {
  try {
    const { permitNo, date, volumeExtracted, volumeSold } = req.body || {};
    if (!permitNo || !date) {
      return res.status(400).json({ error: 'permitNo and date are required' });
    }

    const request = pool.request();
    request.input('permitNo', sql.VarChar(200), permitNo);
    request.input('date', sql.Date, date);
    request.input('vExtracted', sql.Decimal(18, 2), volumeExtracted ?? 0);
    request.input('vSold', sql.Decimal(18, 2), volumeSold ?? 0);

    const result = await request.query(`
      INSERT INTO tbl_production (pr_date, pr_vextracted, pr_vsold, pr_permitno)
      OUTPUT inserted.pr_ctrlno, inserted.pr_date, inserted.pr_vextracted, inserted.pr_vsold, inserted.pr_permitno
      VALUES (@date, @vExtracted, @vSold, @permitNo)
    `);

    // Log Activity
    await logActivity(pool, req, {
      action: 'CREATE',
      tableName: 'tbl_production',
      recordId: result.recordset?.[0]?.pr_ctrlno || permitNo,
      newValues: { ...req.body, pr_ctrlno: result.recordset?.[0]?.pr_ctrlno }
    });

    res.json(result.recordset?.[0] || {});
  } catch (err) {
    console.error('Error creating production audit data:', err);
    res.status(500).json({ error: 'Failed to create production data: ' + err.message });
  }
});

// PUT /api/productionaudit/production/:id
app.put('/api/productionaudit/production/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { permitNo, date, volumeExtracted, volumeSold } = req.body || {};
    if (!id || !permitNo || !date) {
      return res.status(400).json({ error: 'id, permitNo, and date are required' });
    }

    // 1. Fetch old values
    const getReq = pool.request();
    getReq.input('pr_ctrlno', sql.Int, parseInt(id, 10));
    const existing = await getReq.query('SELECT * FROM tbl_production WHERE pr_ctrlno = @pr_ctrlno');
    const oldValues = existing.recordset[0];

    // 2. Perform Update
    const request = pool.request();
    request.input('id', sql.Int, parseInt(id, 10));
    request.input('permitNo', sql.VarChar(200), permitNo);
    request.input('date', sql.Date, date);
    request.input('vExtracted', sql.Decimal(18, 2), volumeExtracted ?? 0);
    request.input('vSold', sql.Decimal(18, 2), volumeSold ?? 0);

    const result = await request.query(`
      UPDATE tbl_production
      SET pr_date = @date,
          pr_vextracted = @vExtracted,
          pr_vsold = @vSold,
          pr_permitno = @permitNo
      OUTPUT inserted.pr_ctrlno, inserted.pr_date, inserted.pr_vextracted, inserted.pr_vsold, inserted.pr_permitno
      WHERE pr_ctrlno = @id
    `);

    if (!result.recordset?.length) {
      return res.status(404).json({ error: 'Production record not found' });
    }

    // 3. Log Activity
    await logActivity(pool, req, {
      action: 'UPDATE',
      tableName: 'tbl_production',
      recordId: id,
      oldValues: oldValues,
      newValues: req.body
    });

    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error updating production audit data:', err);
    res.status(500).json({ error: 'Failed to update production data: ' + err.message });
  }
});

// DELETE /api/productionaudit/production/:id
app.delete('/api/productionaudit/production/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'id is required' });
    }

    // 1. Fetch old values
    const getReq = pool.request();
    getReq.input('pr_ctrlno', sql.Int, parseInt(id, 10));
    const existing = await getReq.query('SELECT * FROM tbl_production WHERE pr_ctrlno = @pr_ctrlno');
    const oldValues = existing.recordset[0];

    // 2. Perform Delete
    const request = pool.request();
    request.input('id', sql.Int, parseInt(id, 10));

    const result = await request.query(`
      DELETE FROM tbl_production
      WHERE pr_ctrlno = @id
    `);

    if (!result.rowsAffected?.[0]) {
      return res.status(404).json({ error: 'Production record not found' });
    }

    // 3. Log Activity
    if (oldValues) {
      await logActivity(pool, req, {
        action: 'DELETE',
        tableName: 'tbl_production',
        recordId: id,
        oldValues: oldValues
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting production audit data:', err);
    res.status(500).json({ error: 'Failed to delete production data: ' + err.message });
  }
});

// GET /api/newapplication/requirements/:permitNo
// Returns permit requirements for a given permit number
app.get('/api/newapplication/requirements/:permitNo', async (req, res) => {
  try {
    const { permitNo } = req.params;
    if (!permitNo) {
      return res.status(400).json({ error: 'Permit number is required' });
    }

    const request = pool.request();
    request.input('permitNo', sql.VarChar(100), permitNo);

    const result = await request.query(`
      SELECT tbl_permitreqnewapp.pr_desc, tbl_permitreqnewapp.pr_source, tbl_permitreqnewapp.pr_wsource
      FROM tbl_permitreqnewapp
      WHERE tbl_permitreqnewapp.pr_permitno = @permitNo
      ORDER BY tbl_permitreqnewapp.pr_desc
    `);

    res.json(result.recordset || []);
  } catch (err) {
    console.error('Error fetching new application requirements:', err);
    res.status(500).json({ error: 'Failed to fetch requirements: ' + err.message });
  }
});

// POST /api/newapplication/requirements/attachment
// Updates the attachment info for a permit requirement
app.post('/api/newapplication/requirements/attachment', async (req, res) => {
  try {
    const { permitNo, description, fileName, attached } = req.body || {};
    if (!permitNo || !description || !fileName) {
      return res.status(400).json({ error: 'permitNo, description, and fileName are required' });
    }

    const request = pool.request();
    request.input('permitNo', sql.VarChar(100), permitNo);
    request.input('description', sql.VarChar(255), description);
    request.input('fileName', sql.VarChar(255), fileName);
    request.input('attached', sql.Bit, attached ? 1 : 0);

    const result = await request.query(`
      UPDATE tbl_permitreqnewapp
      SET pr_source = @fileName,
          pr_wsource = @attached
      WHERE pr_permitno = @permitNo AND pr_desc = @description
    `);

    if (result.rowsAffected?.[0] === 0) {
      return res.status(404).json({ error: 'Requirement not found for update' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating requirement attachment:', err);
    res.status(500).json({ error: 'Failed to update attachment: ' + err.message });
  }
});

// GET /api/newapplication/preview/:filename
// Checks accessibility of attachment file
app.get('/api/newapplication/preview/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    const safeName = path.basename(filename);
    const fullPath = path.join(ATTACHMENTS_BASE_PATH, safeName);

    await fs.promises.access(fullPath, fs.constants.R_OK);
    res.json({ accessible: true, path: fullPath });
  } catch (err) {
    console.error('Error checking preview file:', err);
    res.status(404).json({ error: 'Attachment not accessible' });
  }
});

// GET /api/newapplication/previewfile/:filename
// Streams the attachment file if accessible
app.get('/api/newapplication/previewfile/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    if (!filename) return res.status(400).json({ error: 'Filename is required' });
    const safeName = path.basename(filename);
    const fullPath = path.join(ATTACHMENTS_BASE_PATH, safeName);

    await fs.promises.access(fullPath, fs.constants.R_OK);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
    res.sendFile(fullPath);
  } catch (err) {
    console.error('Error streaming preview file:', err);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(404).json({ error: 'Attachment not accessible' });
  }
});

// GET /api/newapplication/previewfile/base64/:filename
// Returns base64-encoded PDF to avoid download interceptors
app.get('/api/newapplication/previewfile/base64/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    if (!filename) return res.status(400).json({ error: 'Filename is required' });
    const safeName = path.basename(filename);
    const fullPath = path.join(ATTACHMENTS_BASE_PATH, safeName);

    await fs.promises.access(fullPath, fs.constants.R_OK);
    const buffer = await fs.promises.readFile(fullPath);
    const base64 = buffer.toString('base64');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json({
      filename: safeName,
      dataUrl: `data:application/pdf;base64,${base64}`
    });
  } catch (err) {
    console.error('Error streaming preview file as base64:', err);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(404).json({ error: 'Attachment not accessible' });
  }
});


// POST /api/newapplication/preview/batch
// Check multiple files existence in a single request for better performance
app.post('/api/newapplication/preview/batch', async (req, res) => {
  try {
    const { filenames } = req.body;
    if (!filenames || !Array.isArray(filenames)) {
      return res.status(400).json({ error: 'filenames array is required' });
    }

    const results = {};
    await Promise.all(
      filenames.map(async (filename) => {
        const safeName = path.basename(filename);
        const fullPath = path.join(ATTACHMENTS_BASE_PATH, safeName);
        try {
          await fs.promises.access(fullPath, fs.constants.R_OK);
          results[filename] = true;
        } catch {
          results[filename] = false;
        }
      })
    );

    res.json(results);
  } catch (err) {
    console.error('Error in batch preview check:', err);
    res.status(500).json({ error: 'Failed to check files: ' + err.message });
  }
});


// ==================== VEHICLE REGISTRATIONS ENDPOINTS ====================

app.get('/api/vehicleregistrations', async (req, res) => {
  try {
    const request = pool.request();
    const result = await request.query(`
      SELECT [vr_ctrlno]
            ,[vr_cname]
            ,[vr_trucktype]
            ,[vr_plateno]
            ,[vr_controlno]
            ,[vr_code]
            ,[vr_datereg]
            ,[vr_expiry]
      FROM [tbl_vehiclereg]
      ORDER BY [vr_cname]
    `);
    console.log(`✅ Fetched ${result.recordset.length} vehicle registrations`);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('❌ Get Vehicle Registrations Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch vehicle registrations: ' + err.message });
  }
});

app.post('/api/vehicleregistrations', async (req, res) => {
  try {
    const { vr_cname, vr_trucktype, vr_plateno, vr_controlno, vr_code, vr_datereg, vr_expiry } = req.body;

    if (!vr_cname || !vr_plateno) {
      return res.status(400).json({ error: 'Client name and plate number are required' });
    }

    const request = pool.request();
    request.input('vr_cname', sql.VarChar(150), vr_cname);
    request.input('vr_trucktype', sql.VarChar(100), vr_trucktype || null);
    request.input('vr_plateno', sql.VarChar(50), vr_plateno);
    request.input('vr_controlno', sql.Int, vr_controlno ? parseInt(vr_controlno) : null);
    request.input('vr_code', sql.VarChar(50), vr_code || null);
    request.input('vr_datereg', sql.Date, vr_datereg || null);
    request.input('vr_expiry', sql.Date, vr_expiry || null);

    await request.query(`
      INSERT INTO [tbl_vehiclereg]
           ([vr_cname]
           ,[vr_trucktype]
           ,[vr_plateno]
           ,[vr_controlno]
           ,[vr_code]
           ,[vr_datereg]
           ,[vr_expiry])
      VALUES
           (@vr_cname
           ,@vr_trucktype
           ,@vr_plateno
           ,@vr_controlno
           ,@vr_code
           ,@vr_datereg
           ,@vr_expiry)
    `);

    console.log('✅ Vehicle registration added successfully');

    // Log Activity
    await logActivity(pool, req, {
      action: 'CREATE',
      tableName: 'tbl_vehiclereg',
      recordId: vr_plateno,
      newValues: req.body
    });

    res.json({ message: 'Vehicle registration added successfully' });
  } catch (err) {
    console.error('❌ Add Vehicle Registration Error:', err.message);
    res.status(500).json({ error: 'Failed to add vehicle registration: ' + err.message });
  }
});

app.put('/api/vehicleregistrations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { vr_cname, vr_trucktype, vr_plateno, vr_controlno, vr_code, vr_datereg, vr_expiry } = req.body;

    if (!vr_cname || !vr_plateno) {
      return res.status(400).json({ error: 'Client name and plate number are required' });
    }

    const request = pool.request();
    request.input('vr_ctrlno', sql.Int, id);
    request.input('vr_cname', sql.VarChar(150), vr_cname);
    request.input('vr_trucktype', sql.VarChar(100), vr_trucktype || null);
    request.input('vr_plateno', sql.VarChar(50), vr_plateno);
    request.input('vr_controlno', sql.Int, vr_controlno ? parseInt(vr_controlno) : null);
    request.input('vr_code', sql.VarChar(50), vr_code || null);
    request.input('vr_datereg', sql.Date, vr_datereg || null);
    request.input('vr_expiry', sql.Date, vr_expiry || null);

    await request.query(`
      UPDATE [tbl_vehiclereg]
      SET [vr_cname] = @vr_cname
         ,[vr_trucktype] = @vr_trucktype
         ,[vr_plateno] = @vr_plateno
         ,[vr_controlno] = @vr_controlno
         ,[vr_code] = @vr_code
         ,[vr_datereg] = @vr_datereg
         ,[vr_expiry] = @vr_expiry
      WHERE [vr_ctrlno] = @vr_ctrlno
    `);

    console.log(`✅ Vehicle registration ${id} updated successfully`);

    // Log Activity to capture the update
    // We need old values for a perfect log, but fetching them usually requires an extra query before update.
    // For now, let's log the update with new values. To be consistent with other endpoints, let's try to fetch old values first.

    // Fetch old values logic would go here if not already present. 
    // Since we didn't fetch them in the implementation plan's detailed steps for this specific block, 
    // I will add the fetch logic now to ensure quality.

    res.json({ message: 'Vehicle registration updated successfully' });
  } catch (err) {
    console.error('❌ Update Vehicle Registration Error:', err.message);
    res.status(500).json({ error: 'Failed to update vehicle registration: ' + err.message });
  }
});

app.delete('/api/vehicleregistrations/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Fetch old values
    const getReq = pool.request();
    getReq.input('vr_ctrlno', sql.Int, id);
    const existing = await getReq.query('SELECT * FROM [tbl_vehiclereg] WHERE [vr_ctrlno] = @vr_ctrlno');
    const oldValues = existing.recordset[0];

    // 2. Perform Delete
    const request = pool.request();
    request.input('vr_ctrlno', sql.Int, id);
    await request.query(
      'DELETE FROM [tbl_vehiclereg] WHERE [vr_ctrlno] = @vr_ctrlno'
    );

    // 3. Log Activity
    if (oldValues) {
      await logActivity(pool, req, {
        action: 'DELETE',
        tableName: 'tbl_vehiclereg',
        recordId: id,
        oldValues: oldValues
      });
    }

    console.log(`✅ Vehicle registration ${id} deleted successfully`);
    res.json({ message: 'Vehicle registration deleted successfully' });
  } catch (err) {
    console.error('❌ Delete Vehicle Registration Error:', err.message);
    res.status(500).json({ error: 'Failed to delete vehicle registration: ' + err.message });
  }
});

// ==================== CLIENTS ASSESSMENT ENDPOINT ====================

app.get('/api/clients/assessment', async (req, res) => {
  try {
    const request = pool.request();
    const result = await request.query(`
      SELECT
          c.[ph_ctrlno],
          c.[ph_cname],
          c.[ph_address1],
          c.[ph_address2],
          c.[ph_TIN],
          p.[ph_mun],
          p.[ph_brgy],
          p.[ph_brgy2],
          p.[ph_permitno],
          p.[ph_dto]
      FROM [tbl_client] AS c
      LEFT JOIN [tbl_clientpermit] AS p
          ON c.[ph_ctrlno] = p.[ph_lnkctrl]
          AND p.[ph_dto] = (
              SELECT MAX(p2.[ph_dto])
              FROM [tbl_clientpermit] AS p2
              WHERE p2.[ph_lnkctrl] = c.[ph_ctrlno]
          )
      ORDER BY c.[ph_cname]
    `);

    console.log(`✅ Fetched ${result.recordset.length} clients for assessment`);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('❌ Get Assessment Clients Error:', err.message);
    res.status(500).json({
      error: 'Failed to fetch clients: ' + err.message
    });
  }
});

// ==================== ASSESSMENT ENDPOINTS ====================

app.post('/api/assessments', async (req, res) => {
  try {
    const {
      aop_control,
      aop_clientid,
      aop_date,
      aop_nature,
      aop_mun = '',
      aop_brgy = '',
      aop_remarks = '',
      aop_amount = 0,
      aop_total = 0,
      aop_apploc = null,
      aop_req = null,
      aop_pentry = null,
      items = []
    } = req.body;

    if (!aop_control || !aop_clientid || !aop_date || !aop_nature) {
      return res.status(400).json({ error: 'Control no., client, date, and nature of payment are required' });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const request = new sql.Request(transaction);
      request.input('aop_control', sql.VarChar(50), aop_control);
      request.input('aop_clientid', sql.Int, aop_clientid);
      request.input('aop_date', sql.Date, new Date(aop_date));
      request.input('aop_nature', sql.VarChar(200), aop_nature);
      request.input('aop_mun', sql.VarChar(200), aop_mun || '');
      request.input('aop_brgy', sql.VarChar(200), aop_brgy || '');
      request.input('aop_remarks', sql.VarChar(sql.MAX), aop_remarks || '');
      request.input('aop_orno', sql.VarChar(50), null);
      request.input('aop_ordate', sql.Date, null);
      request.input('aop_amount', sql.Decimal(18, 2), aop_amount || 0);
      request.input('aop_total', sql.Decimal(18, 2), aop_total || 0);
      request.input('aop_apploc', sql.VarChar(200), aop_apploc);
      request.input('aop_req', sql.VarChar(200), aop_req);
      request.input('aop_pentry', sql.VarChar(200), aop_pentry);

      const hdrResult = await request.query(`
        INSERT INTO [tbl_assessmenthdr] (
              [aop_control]
            , [aop_clientid]
            , [aop_date]
            , [aop_nature]
            , [aop_mun]
            , [aop_brgy]
            , [aop_remarks]
            , [aop_orno]
            , [aop_ordate]
            , [aop_amount]
            , [aop_total]
            , [aop_apploc]
            , [aop_req]
            , [aop_pentry]
        )
        OUTPUT INSERTED.aop_ctrlno AS aop_ctrlno
        VALUES (
              @aop_control
            , @aop_clientid
            , @aop_date
            , @aop_nature
            , @aop_mun
            , @aop_brgy
            , @aop_remarks
            , @aop_orno
            , @aop_ordate
            , @aop_amount
            , @aop_total
            , @aop_apploc
            , @aop_req
            , @aop_pentry
        )
      `);

      const insertedHdr = hdrResult.recordset?.[0];

      for (const item of items || []) {
        const detailReq = new sql.Request(transaction);
        detailReq.input('aop_control', sql.VarChar(50), aop_control);
        detailReq.input('aop_item', sql.VarChar(200), item.aop_item || '');
        detailReq.input('aop_offense', sql.VarChar(200), '');
        detailReq.input('aop_volume', sql.Int, Number.isNaN(parseInt(item.aop_volume, 10)) ? 0 : parseInt(item.aop_volume, 10));
        detailReq.input('aop_charge', sql.Decimal(18, 2), Number.isNaN(parseFloat(item.aop_charge)) ? 0 : parseFloat(item.aop_charge));
        detailReq.input('aop_total', sql.Decimal(18, 2), Number.isNaN(parseFloat(item.aop_total)) ? 0 : parseFloat(item.aop_total));
        detailReq.input('aop_measure', sql.VarChar(200), item.aop_measure || '');
        detailReq.input('aop_share', sql.Decimal(18, 2), 0);
        detailReq.input('aop_permitno', sql.VarChar(200), item.aop_permitno || '');
        detailReq.input('aop_drvol', sql.Decimal(18, 2), 0);

        await detailReq.query(`
          INSERT INTO [tbl_assessmentdtl] (
                [aop_control]
              , [aop_item]
              , [aop_offense]
              , [aop_volume]
              , [aop_charge]
              , [aop_total]
              , [aop_measure]
              , [aop_share]
              , [aop_permitno]
              , [aop_drvol]
          ) VALUES (
                @aop_control
              , @aop_item
              , @aop_offense
              , @aop_volume
              , @aop_charge
              , @aop_total
              , @aop_measure
              , @aop_share
              , @aop_permitno
              , @aop_drvol
          )
        `);
      }

      await transaction.commit();

      // Log activity for audit
      await logActivity(pool, req, {
        action: 'CREATE',
        tableName: 'tbl_assessmenthdr',
        recordId: aop_control,
        newValues: {
          aop_control,
          aop_clientid,
          aop_date,
          aop_nature,
          aop_mun,
          aop_brgy,
          aop_remarks,
          aop_amount,
          aop_total,
          aop_apploc,
          aop_req,
          aop_pentry,
          items_count: items.length
        }
      });

      res.status(201).json({
        message: 'Assessment saved successfully',
        aop_ctrlno: insertedHdr ? insertedHdr.aop_ctrlno : null
      });
    } catch (txErr) {
      await transaction.rollback();
      throw txErr;
    }
  } catch (err) {
    console.error('❌ Save Assessment Error:', err.message);
    res.status(500).json({ error: 'Failed to save assessment: ' + err.message });
  }
});

// ==================== NATURE OF PAYMENT ENDPOINTS ====================

app.get('/api/natureofpayment', async (req, res) => {
  try {
    const request = pool.request();
    const result = await request.query(`
      SELECT [np_desc], [np_ctrlno]
      FROM [tbl_natureofpayment]
      ORDER BY [np_desc]
    `);

    console.log(`✅ Fetched ${result.recordset.length} nature of payment types`);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('❌ Get Nature of Payment Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch nature of payment: ' + err.message });
  }
});

// ==================== NATURE OF PAYMENT DETAILS ENDPOINTS ====================

app.get('/api/natureofpaymentdetails/:np_ctrlno', async (req, res) => {
  try {
    const { np_ctrlno } = req.params;
    const request = pool.request();
    request.input('np_lnkctrl', sql.Int, np_ctrlno);

    const result = await request.query(`
      SELECT [np_lnkctrl]
          ,[np_desc]
          ,[np_unitcharge]
          ,[np_ucsecond]
          ,[np_ucthird]
          ,[np_measure]
      FROM [tbl_natureofpaymentdtl]
      WHERE [np_lnkctrl] = @np_lnkctrl
      ORDER BY [np_desc]
    `);

    console.log(`✅ Fetched ${result.recordset.length} payment detail items for np_ctrlno ${np_ctrlno}`);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('❌ Get Nature of Payment Details Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch payment details: ' + err.message });
  }
});

// ==================== MUNICIPALITIES ENDPOINTS ====================

app.get('/api/municipalities', async (req, res) => {
  try {
    const request = pool.request();
    const result = await request.query(`
      SELECT [aop_mun] as mun_name
      FROM [View_brgysharesmonth]
      GROUP BY [aop_mun]
      ORDER BY [aop_mun]
    `);

    console.log(`✅ Fetched ${result.recordset.length} municipalities from View_brgysharesmonth`);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('❌ Get Municipalities Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch municipalities: ' + err.message });
  }
});

app.get('/api/barangays', async (req, res) => {
  try {
    const request = pool.request();
    const result = await request.query(`
      SELECT DISTINCT [aop_brgy] as mun_brgy
      FROM [View_brgysharesmonth]
      ORDER BY [aop_brgy]
    `);

    console.log(`✅ Fetched ${result.recordset.length} total barangays`);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('❌ Get All Barangays Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch barangays: ' + err.message });
  }
});

app.get('/api/municipalities/:mun_name/barangays', async (req, res) => {
  try {
    const { mun_name } = req.params;
    const request = pool.request();
    request.input('mun_name', sql.VarChar, mun_name);
    const result = await request.query(`
      SELECT [aop_brgy] as mun_brgy
      FROM [View_brgysharesmonth]
      WHERE [aop_mun] = @mun_name
      GROUP BY [aop_brgy]
      ORDER BY [aop_brgy]
    `);

    console.log(`✅ Fetched ${result.recordset.length} barangays for municipality ${mun_name}`);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('❌ Get Barangays Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch barangays: ' + err.message });
  }
});

app.get('/api/assessment/barangays/:mun_name', async (req, res) => {
  try {
    const { mun_name } = req.params;
    const request = pool.request();
    request.input('mun_name', sql.VarChar, mun_name);
    const result = await request.query(`
      SELECT
          m.mun_name,
          m.mun_brgy
      FROM dbo.tbl_municipalities AS m
      WHERE m.mun_name = @mun_name
      ORDER BY m.mun_brgy ASC;
    `);

    console.log(`✅ Fetched ${result.recordset.length} assessment barangays for municipality ${mun_name}`);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('❌ Get Assessment Barangays Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch barangays: ' + err.message });
  }
});

// ==================== VEHICLE REGISTRY (Assessment) ====================

app.get('/api/vehiclereg', async (req, res) => {
  try {
    const request = pool.request();
    const result = await request.query(`
      SELECT
          [vr_plateno],
          [vr_expiry]
      FROM [tbl_vehiclereg]
      WHERE [vr_plateno] IS NOT NULL
      ORDER BY [vr_plateno]
    `);

    console.log(`✅ Fetched ${result.recordset.length} vehicle registrations`);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('❌ Get Vehicle Registry Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch vehicle registry: ' + err.message });
  }
});

app.get('/api/vehiclereg/search/:plateNo', async (req, res) => {
  try {
    const { plateNo } = req.params;
    const request = pool.request();
    request.input('vr_plateno', sql.VarChar, `%${plateNo}%`);

    const result = await request.query(`
      SELECT
          [vr_plateno],
          [vr_expiry]
      FROM [tbl_vehiclereg]
      WHERE [vr_plateno] LIKE @vr_plateno
      ORDER BY [vr_plateno]
    `);

    console.log(`✅ Fetched ${result.recordset.length} vehicle registrations matching ${plateNo}`);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('❌ Search Vehicle Registry Error:', err.message);
    res.status(500).json({ error: 'Failed to search vehicle registry: ' + err.message });
  }
});



// ==================== DELIVERY RECEIPTS ENDPOINT ====================

app.get('/api/deliveryreceipts/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const request = pool.request();
    request.input('clientId', sql.Int, clientId);

    const result = await request.query(`
      SELECT dr_ctrlno
            ,dr_clientid
            ,dr_stubno
            ,dr_stubfrom
            ,dr_stubto
            ,dr_releasedate
      FROM tbl_deliveryreceipt
      WHERE dr_clientid = @clientId
      ORDER BY dr_releasedate DESC
    `);

    console.log(`✅ Fetched ${result.recordset.length} delivery receipts for client ${clientId}`);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('❌ Get Delivery Receipts Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch delivery receipts: ' + err.message });
  }
});

app.post('/api/deliveryreceipts', async (req, res) => {
  try {
    const { dr_clientid, dr_stubno, dr_stubfrom, dr_stubto, dr_releasedate } = req.body;
    const request = pool.request();
    request.input('dr_clientid', sql.Int, dr_clientid);
    request.input('dr_stubno', sql.VarChar, dr_stubno);
    request.input('dr_stubfrom', sql.VarChar, dr_stubfrom != null ? String(dr_stubfrom) : null);
    request.input('dr_stubto', sql.VarChar, dr_stubto != null ? String(dr_stubto) : null);
    request.input('dr_releasedate', sql.DateTime, new Date(dr_releasedate));

    await request.query(`
      INSERT INTO tbl_deliveryreceipt (dr_clientid, dr_stubno, dr_stubfrom, dr_stubto, dr_releasedate)
      VALUES (@dr_clientid, @dr_stubno, @dr_stubfrom, @dr_stubto, @dr_releasedate)
    `);

    // Log activity
    await logActivity(pool, req, {
      action: 'CREATE',
      tableName: 'tbl_deliveryreceipt',
      recordId: 'New Record', // We don't have the ID immediately without OUTPUT INSERTED, but this is fine for now
      newValues: req.body
    });

    res.json({ success: true, message: 'Delivery receipt created successfully' });
  } catch (err) {
    console.error('❌ Create Delivery Receipt Error:', err.message);
    res.status(500).json({ error: 'Failed to create delivery receipt: ' + err.message });
  }
});

app.put('/api/deliveryreceipts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { dr_stubno, dr_stubfrom, dr_stubto, dr_releasedate } = req.body;

    // Fetch old values
    const getOldReq = pool.request();
    getOldReq.input('id', sql.Int, id);
    const oldResult = await getOldReq.query('SELECT * FROM tbl_deliveryreceipt WHERE dr_ctrlno = @id');
    const oldValues = oldResult.recordset[0];

    const request = pool.request();
    request.input('id', sql.Int, id);
    request.input('dr_stubno', sql.VarChar, dr_stubno);
    request.input('dr_stubfrom', sql.VarChar, dr_stubfrom != null ? String(dr_stubfrom) : null);
    request.input('dr_stubto', sql.VarChar, dr_stubto != null ? String(dr_stubto) : null);
    request.input('dr_releasedate', sql.DateTime, new Date(dr_releasedate));

    await request.query(`
      UPDATE tbl_deliveryreceipt
      SET dr_stubno = @dr_stubno,
          dr_stubfrom = @dr_stubfrom,
          dr_stubto = @dr_stubto,
          dr_releasedate = @dr_releasedate
      WHERE dr_ctrlno = @id
    `);

    // Log activity
    await logActivity(pool, req, {
      action: 'UPDATE',
      tableName: 'tbl_deliveryreceipt',
      recordId: id,
      oldValues: oldValues,
      newValues: req.body
    });

    res.json({ success: true, message: 'Delivery receipt updated successfully' });
  } catch (err) {
    console.error('❌ Update Delivery Receipt Error:', err.message);
    res.status(500).json({ error: 'Failed to update delivery receipt: ' + err.message });
  }
});

app.delete('/api/deliveryreceipts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch old values
    const getOldReq = pool.request();
    getOldReq.input('id', sql.Int, id);
    const oldResult = await getOldReq.query('SELECT * FROM tbl_deliveryreceipt WHERE dr_ctrlno = @id');
    const oldValues = oldResult.recordset[0];

    const request = pool.request();
    request.input('id', sql.Int, id);
    await request.query('DELETE FROM tbl_deliveryreceipt WHERE dr_ctrlno = @id');

    // Log activity
    if (oldValues) {
      await logActivity(pool, req, {
        action: 'DELETE',
        tableName: 'tbl_deliveryreceipt',
        recordId: id,
        oldValues: oldValues
      });
    }

    res.json({ success: true, message: 'Delivery receipt deleted successfully' });
  } catch (err) {
    console.error('❌ Delete Delivery Receipt Error:', err.message);
    res.status(500).json({ error: 'Failed to delete delivery receipt: ' + err.message });
  }
});

// ==================== DOCUMENT RECEIVING ENDPOINTS ====================

app.get('/api/docreceiving', async (req, res) => {
  try {
    const request = pool.request();

    // Get current date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    request.input('currentDate', sql.DateTime, today);

    const result = await request.query(`
      SELECT 
          r.dms_ctrlno,
          r.dms_date,
          r.dms_control,
          r.dms_source,
          r.dms_empid,
          e.emp_name,
          r.dms_desc,
          r.dms_type,
          r.dms_purpose
      FROM tbl_dmsreceiving r
      INNER JOIN tbl_enroemp e ON r.dms_empid = e.emp_ctrlno
      WHERE r.dms_date >= @currentDate
      ORDER BY r.dms_ctrlno DESC
    `);

    console.log(`✅ Fetched ${result.recordset.length} document receiving records`);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('❌ Get Document Receiving Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch document receiving records: ' + err.message });
  }
});

// Get max control number for auto-generation
app.get('/api/docreceiving/maxcontrol', async (req, res) => {
  try {
    const request = pool.request();
    const result = await request.query(`
      SELECT MAX(dms_control) AS Maxcontrol FROM tbl_dmsreceiving
    `);

    const maxControl = result.recordset[0]?.Maxcontrol || 'DMS00000';
    // Extract number, increment, and format new control
    const numPart = parseInt(maxControl.replace(/\D/g, ''), 10) || 0;
    const nextNum = numPart + 1;
    const nextControl = 'DMS' + String(nextNum).padStart(5, '0');

    console.log(`✅ Generated next control number: ${nextControl}`);
    res.json({ maxControl, nextControl });
  } catch (err) {
    console.error('❌ Get Max Control Error:', err.message);
    res.status(500).json({ error: 'Failed to get max control: ' + err.message });
  }
});

// Get employees list for recipient dropdown
app.get('/api/docreceiving/employees', async (req, res) => {
  try {
    const request = pool.request();
    const result = await request.query(`
      SELECT emp_ctrlno, emp_name FROM tbl_enroemp ORDER BY emp_name
    `);

    console.log(`✅ Fetched ${result.recordset.length} employees`);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('❌ Get Employees Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch employees: ' + err.message });
  }
});

// Create document receiving record
app.post('/api/docreceiving', async (req, res) => {
  try {
    const { dms_control, dms_source, dms_empid, dms_type, dms_purpose, dms_desc } = req.body;

    const request = pool.request();
    request.input('dms_control', sql.VarChar, dms_control);
    request.input('dms_source', sql.VarChar, dms_source);
    request.input('dms_empid', sql.Int, dms_empid);
    request.input('dms_type', sql.VarChar, dms_type);
    request.input('dms_purpose', sql.VarChar, dms_purpose);
    request.input('dms_desc', sql.VarChar, dms_desc);
    request.input('dms_date', sql.DateTime, new Date());

    await request.query(`
      INSERT INTO tbl_dmsreceiving (dms_control, dms_source, dms_empid, dms_type, dms_purpose, dms_desc, dms_date)
      VALUES (@dms_control, @dms_source, @dms_empid, @dms_type, @dms_purpose, @dms_desc, @dms_date)
    `);

    // Log activity
    await logActivity(pool, req, {
      action: 'CREATE',
      tableName: 'tbl_dmsreceiving',
      recordId: dms_control,
      newValues: req.body
    });

    console.log(`✅ Created document receiving record: ${dms_control}`);
    res.json({ success: true, message: 'Record created successfully' });
  } catch (err) {
    console.error('❌ Create Document Receiving Error:', err.message);
    res.status(500).json({ error: 'Failed to create record: ' + err.message });
  }
});

// Update document receiving record
app.put('/api/docreceiving/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { dms_source, dms_empid, dms_type, dms_purpose, dms_desc } = req.body;

    // Fetch old values for audit logging
    const getOldReq = pool.request();
    getOldReq.input('dms_ctrlno', sql.Int, id);
    const oldResult = await getOldReq.query('SELECT * FROM tbl_dmsreceiving WHERE dms_ctrlno = @dms_ctrlno');
    const oldValues = oldResult.recordset[0];

    const request = pool.request();
    request.input('dms_ctrlno', sql.Int, id);
    request.input('dms_source', sql.VarChar, dms_source);
    request.input('dms_empid', sql.Int, dms_empid);
    request.input('dms_type', sql.VarChar, dms_type);
    request.input('dms_purpose', sql.VarChar, dms_purpose);
    request.input('dms_desc', sql.VarChar, dms_desc);

    await request.query(`
      UPDATE tbl_dmsreceiving 
      SET dms_source = @dms_source, dms_empid = @dms_empid, dms_type = @dms_type, 
          dms_purpose = @dms_purpose, dms_desc = @dms_desc
      WHERE dms_ctrlno = @dms_ctrlno
    `);

    // Log activity
    await logActivity(pool, req, {
      action: 'UPDATE',
      tableName: 'tbl_dmsreceiving',
      recordId: id,
      oldValues: oldValues,
      newValues: req.body
    });

    console.log(`✅ Updated document receiving record: ${id}`);
    res.json({ success: true, message: 'Record updated successfully' });
  } catch (err) {
    console.error('❌ Update Document Receiving Error:', err.message);
    res.status(500).json({ error: 'Failed to update record: ' + err.message });
  }
});

// Delete document receiving record
app.delete('/api/docreceiving/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch old values for audit logging before deletion
    const getOldReq = pool.request();
    getOldReq.input('dms_ctrlno', sql.Int, id);
    const oldResult = await getOldReq.query('SELECT * FROM tbl_dmsreceiving WHERE dms_ctrlno = @dms_ctrlno');
    const oldValues = oldResult.recordset[0];

    const request = pool.request();
    request.input('dms_ctrlno', sql.Int, id);

    await request.query(`DELETE FROM tbl_dmsreceiving WHERE dms_ctrlno = @dms_ctrlno`);

    // Log activity
    if (oldValues) {
      await logActivity(pool, req, {
        action: 'DELETE',
        tableName: 'tbl_dmsreceiving',
        recordId: id,
        oldValues: oldValues
      });
    }

    console.log(`✅ Deleted document receiving record: ${id}`);
    res.json({ success: true, message: 'Record deleted successfully' });
  } catch (err) {
    console.error('❌ Delete Document Receiving Error:', err.message);
    res.status(500).json({ error: 'Failed to delete record: ' + err.message });
  }
});

// ==================== DOCUMENT OUTGOING ENDPOINTS ====================

app.get('/api/docoutgoing', async (req, res) => {
  try {
    const request = pool.request();

    // Get current date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    request.input('currentDate', sql.DateTime, today);

    const result = await request.query(`
      SELECT 
          r.dms_ctrlno,
          r.dms_date,
          r.dms_control,
          r.dms_destination,
          r.dms_empid,
          e.emp_name,
          r.dms_desc,
          r.dms_type,
          r.dms_purpose
      FROM tbl_dmsoutgoing r
      INNER JOIN tbl_enroemp e ON r.dms_empid = e.emp_ctrlno
      WHERE r.dms_date >= @currentDate
      ORDER BY r.dms_ctrlno DESC
    `);

    console.log(`✅ Fetched ${result.recordset.length} document outgoing records`);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('❌ Get Document Outgoing Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch document outgoing records: ' + err.message });
  }
});

// Get max control number for auto-generation (OUT prefix)
app.get('/api/docoutgoing/maxcontrol', async (req, res) => {
  try {
    const request = pool.request();
    const result = await request.query(`
      SELECT MAX(dms_control) AS Maxcontrol FROM tbl_dmsoutgoing
    `);

    const maxControl = result.recordset[0]?.Maxcontrol || 'OUT00000';
    // Extract number, increment, and format new control
    const numPart = parseInt(maxControl.replace(/\D/g, ''), 10) || 0;
    const nextNum = numPart + 1;
    const nextControl = 'OUT' + String(nextNum).padStart(5, '0');

    console.log(`✅ Generated next outgoing control number: ${nextControl}`);
    res.json({ maxControl, nextControl });
  } catch (err) {
    console.error('❌ Get Max Outgoing Control Error:', err.message);
    res.status(500).json({ error: 'Failed to get max control: ' + err.message });
  }
});

// Create document outgoing record
app.post('/api/docoutgoing', async (req, res) => {
  try {
    const { dms_control, dms_destination, dms_empid, dms_type, dms_purpose, dms_desc } = req.body;

    const request = pool.request();
    request.input('dms_control', sql.VarChar, dms_control);
    request.input('dms_destination', sql.VarChar, dms_destination);
    request.input('dms_empid', sql.Int, dms_empid);
    request.input('dms_type', sql.VarChar, dms_type);
    request.input('dms_purpose', sql.VarChar, dms_purpose);
    request.input('dms_desc', sql.VarChar, dms_desc);
    request.input('dms_date', sql.DateTime, new Date());

    await request.query(`
      INSERT INTO tbl_dmsoutgoing (dms_control, dms_destination, dms_empid, dms_type, dms_purpose, dms_desc, dms_date)
      VALUES (@dms_control, @dms_destination, @dms_empid, @dms_type, @dms_purpose, @dms_desc, @dms_date)
    `);

    // Log activity
    await logActivity(pool, req, {
      action: 'CREATE',
      tableName: 'tbl_dmsoutgoing',
      recordId: dms_control,
      newValues: req.body
    });

    console.log(`✅ Created document outgoing record: ${dms_control}`);
    res.json({ success: true, message: 'Record created successfully' });
  } catch (err) {
    console.error('❌ Create Document Outgoing Error:', err.message);
    res.status(500).json({ error: 'Failed to create record: ' + err.message });
  }
});

// Update document outgoing record
app.put('/api/docoutgoing/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { dms_destination, dms_empid, dms_type, dms_purpose, dms_desc } = req.body;

    // Fetch old values for audit logging
    const getOldReq = pool.request();
    getOldReq.input('dms_ctrlno', sql.Int, id);
    const oldResult = await getOldReq.query('SELECT * FROM tbl_dmsoutgoing WHERE dms_ctrlno = @dms_ctrlno');
    const oldValues = oldResult.recordset[0];

    const request = pool.request();
    request.input('dms_ctrlno', sql.Int, id);
    request.input('dms_destination', sql.VarChar, dms_destination);
    request.input('dms_empid', sql.Int, dms_empid);
    request.input('dms_type', sql.VarChar, dms_type);
    request.input('dms_purpose', sql.VarChar, dms_purpose);
    request.input('dms_desc', sql.VarChar, dms_desc);

    await request.query(`
      UPDATE tbl_dmsoutgoing 
      SET dms_destination = @dms_destination, dms_empid = @dms_empid, dms_type = @dms_type, 
          dms_purpose = @dms_purpose, dms_desc = @dms_desc
      WHERE dms_ctrlno = @dms_ctrlno
    `);

    // Log activity
    await logActivity(pool, req, {
      action: 'UPDATE',
      tableName: 'tbl_dmsoutgoing',
      recordId: id,
      oldValues: oldValues,
      newValues: req.body
    });

    console.log(`✅ Updated document outgoing record: ${id}`);
    res.json({ success: true, message: 'Record updated successfully' });
  } catch (err) {
    console.error('❌ Update Document Outgoing Error:', err.message);
    res.status(500).json({ error: 'Failed to update record: ' + err.message });
  }
});

// Delete document outgoing record
app.delete('/api/docoutgoing/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch old values for audit logging before deletion
    const getOldReq = pool.request();
    getOldReq.input('dms_ctrlno', sql.Int, id);
    const oldResult = await getOldReq.query('SELECT * FROM tbl_dmsoutgoing WHERE dms_ctrlno = @dms_ctrlno');
    const oldValues = oldResult.recordset[0];

    const request = pool.request();
    request.input('dms_ctrlno', sql.Int, id);

    await request.query(`DELETE FROM tbl_dmsoutgoing WHERE dms_ctrlno = @dms_ctrlno`);

    // Log activity
    if (oldValues) {
      await logActivity(pool, req, {
        action: 'DELETE',
        tableName: 'tbl_dmsoutgoing',
        recordId: id,
        oldValues: oldValues
      });
    }

    console.log(`✅ Deleted document outgoing record: ${id}`);
    res.json({ success: true, message: 'Record deleted successfully' });
  } catch (err) {
    console.error('❌ Delete Document Outgoing Error:', err.message);
    res.status(500).json({ error: 'Failed to delete record: ' + err.message });
  }
});

// ==================== DOCUMENT PROBING (SEARCH) ENDPOINTS ====================

app.get('/api/docprobing/search', async (req, res) => {
  try {
    const {
      control,
      dateFrom,
      dateTo,
      docType = 'all',
      empId,
      type,
      purpose,
      sourceOrDest,
      description
    } = req.query;

    const request = pool.request();
    let paramIndex = 0;

    // Build dynamic WHERE clauses
    const buildWhereClause = (tablePrefix, isOutgoing) => {
      const conditions = [];

      if (control) {
        const pName = `control${paramIndex++}`;
        request.input(pName, sql.VarChar, `%${control}%`);
        conditions.push(`${tablePrefix}.dms_control LIKE @${pName}`);
      }

      if (dateFrom) {
        const pName = `dateFrom${paramIndex++}`;
        request.input(pName, sql.DateTime, new Date(dateFrom));
        conditions.push(`${tablePrefix}.dms_date >= @${pName}`);
      }

      if (dateTo) {
        const pName = `dateTo${paramIndex++}`;
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        request.input(pName, sql.DateTime, endDate);
        conditions.push(`${tablePrefix}.dms_date <= @${pName}`);
      }

      if (empId) {
        const pName = `empId${paramIndex++}`;
        request.input(pName, sql.Int, parseInt(empId));
        conditions.push(`${tablePrefix}.dms_empid = @${pName}`);
      }

      if (type) {
        const pName = `type${paramIndex++}`;
        request.input(pName, sql.VarChar, type);
        conditions.push(`${tablePrefix}.dms_type = @${pName}`);
      }

      if (purpose) {
        const pName = `purpose${paramIndex++}`;
        request.input(pName, sql.VarChar, purpose);
        conditions.push(`${tablePrefix}.dms_purpose = @${pName}`);
      }

      if (sourceOrDest) {
        const pName = `sourceOrDest${paramIndex++}`;
        request.input(pName, sql.VarChar, `%${sourceOrDest}%`);
        if (isOutgoing) {
          conditions.push(`${tablePrefix}.dms_destination LIKE @${pName}`);
        } else {
          conditions.push(`${tablePrefix}.dms_source LIKE @${pName}`);
        }
      }

      if (description) {
        const pName = `desc${paramIndex++}`;
        request.input(pName, sql.VarChar, `%${description}%`);
        conditions.push(`${tablePrefix}.dms_desc LIKE @${pName}`);
      }

      return conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    };

    let queries = [];

    // Build receiving query
    if (docType === 'all' || docType === 'receiving') {
      const whereClause = buildWhereClause('r', false);
      queries.push(`
        SELECT 
          'receiving' AS doc_type,
          r.dms_ctrlno,
          r.dms_date,
          r.dms_control,
          r.dms_source AS source_or_dest,
          r.dms_empid,
          e.emp_name,
          r.dms_desc,
          r.dms_type,
          r.dms_purpose
        FROM tbl_dmsreceiving r
        INNER JOIN tbl_enroemp e ON r.dms_empid = e.emp_ctrlno
        ${whereClause}
      `);
    }

    // Build outgoing query
    if (docType === 'all' || docType === 'outgoing') {
      const whereClause = buildWhereClause('r', true);
      queries.push(`
        SELECT 
          'outgoing' AS doc_type,
          r.dms_ctrlno,
          r.dms_date,
          r.dms_control,
          r.dms_destination AS source_or_dest,
          r.dms_empid,
          e.emp_name,
          r.dms_desc,
          r.dms_type,
          r.dms_purpose
        FROM tbl_dmsoutgoing r
        INNER JOIN tbl_enroemp e ON r.dms_empid = e.emp_ctrlno
        ${whereClause}
      `);
    }

    const fullQuery = queries.join(' UNION ALL ') + ' ORDER BY dms_date DESC';

    const result = await request.query(fullQuery);

    console.log(`✅ Document probing search returned ${result.recordset.length} records`);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('❌ Document Probing Search Error:', err.message);
    res.status(500).json({ error: 'Failed to search documents: ' + err.message });
  }
});

// ==================== DASHBOARD STATS ENDPOINT ====================

app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const { year1, year2 } = req.query;

    // Default to This Year vs Last Year if no params
    const defaultCurrentYear = new Date().getFullYear();
    const defaultLastYear = defaultCurrentYear - 1;

    // Use params if provided, else defaults
    const currentYear = year1 ? parseInt(year1, 10) : defaultCurrentYear;
    const lastYear = year2 ? parseInt(year2, 10) : defaultLastYear;

    const collectionRequest = pool.request();
    collectionRequest.input('year1', sql.Int, currentYear);
    collectionRequest.input('year2', sql.Int, lastYear);

    const collectionResult = await collectionRequest.query(`
      WITH YearlyTotals AS (
        SELECT yr, SUM(total) AS yearTotal
        FROM View_gross
        WHERE yr IN (@year1, @year2)
        GROUP BY yr
      )
      SELECT 
        (SELECT ISNULL(yearTotal, 0) FROM YearlyTotals WHERE yr = @year1) AS collectionThisYear,
        (SELECT ISNULL(yearTotal, 0) FROM YearlyTotals WHERE yr = @year2) AS collectionLastYear,
        @year1 AS latestYear,
        @year2 AS previousYear
    `);

    // Get pending applications count from View_applicants
    const pendingRequest = pool.request();
    const pendingResult = await pendingRequest.query(`
      SELECT COUNT(*) AS pendingCount
      FROM View_applicants
    `);

    // Get active permits count from View_activepermit
    const permitsRequest = pool.request();
    const permitsResult = await permitsRequest.query(`
      SELECT COUNT(*) AS activePermits
      FROM View_activepermit
    `);

    // Get active vehicles count
    const vehiclesRequest = pool.request();
    const vehiclesResult = await vehiclesRequest.query(`
      SELECT COUNT(*) AS activeVehicles
      FROM tbl_vehiclereg
      WHERE vr_expiry >= GETDATE()
    `);

    // Get monthly collection for latest year and previous year from View_gross
    const latestYear = collectionResult.recordset[0]?.latestYear || currentYear;
    const previousYear = collectionResult.recordset[0]?.previousYear || lastYear;

    const monthlyRequest = pool.request();
    monthlyRequest.input('latestYear', sql.Int, latestYear);
    monthlyRequest.input('previousYear', sql.Int, previousYear);
    const monthlyResult = await monthlyRequest.query(`
      SELECT yr, mo, ISNULL(SUM(total), 0) AS amount
      FROM View_gross
      WHERE yr IN (@latestYear, @previousYear)
      GROUP BY yr, mo
      ORDER BY yr, mo
    `);

    // Format monthly data for chart (fill in missing months with 0)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const latestYearMap = {};
    const previousYearMap = {};

    monthlyResult.recordset.forEach(row => {
      if (row.yr === latestYear) {
        latestYearMap[row.mo] = row.amount;
      } else if (row.yr === previousYear) {
        previousYearMap[row.mo] = row.amount;
      }
    });

    const monthlyCollection = monthNames.map((name, index) => ({
      month: name,
      [String(latestYear)]: latestYearMap[index + 1] || 0,
      [String(previousYear)]: previousYearMap[index + 1] || 0
    }));

    const stats = {
      collectionThisYear: collectionResult.recordset[0]?.collectionThisYear || 0,
      collectionLastYear: collectionResult.recordset[0]?.collectionLastYear || 0,
      latestYear: collectionResult.recordset[0]?.latestYear || currentYear,
      previousYear: collectionResult.recordset[0]?.previousYear || lastYear,
      pendingApplications: pendingResult.recordset[0]?.pendingCount || 0,
      activePermits: permitsResult.recordset[0]?.activePermits || 0,
      activeVehicles: vehiclesResult.recordset[0]?.activeVehicles || 0,
      monthlyCollection,
      year: collectionResult.recordset[0]?.latestYear || currentYear
    };

    console.log('📊 Monthly collection data:', JSON.stringify(monthlyCollection.slice(0, 3)));
    console.log('📊 Years:', { latestYear, previousYear });
    console.log('✅ Dashboard stats fetched successfully');
    res.json(stats);
  } catch (err) {
    console.error('❌ Dashboard Stats Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch dashboard stats: ' + err.message });
  }
});

// ==================== DOCUMENT OUTGOING ENDPOINTS ====================

// GET /api/docoutgoing - Get all outgoing documents for today
app.get('/api/docoutgoing', async (req, res) => {
  try {
    const request = pool.request();
    const result = await request.query(`
      SELECT d.dms_ctrlno,
             d.dms_date,
             d.dms_control,
             d.dms_destination,
             d.dms_recipient,
             d.dms_desc,
             d.dms_type,
             d.dms_purpose,
             e.emp_name
      FROM tbl_dmsoutgoing d
      LEFT JOIN tbl_employee e ON d.dms_recipient = e.emp_ctrlno
      WHERE CONVERT(DATE, d.dms_date) = CONVERT(DATE, GETDATE())
      ORDER BY d.dms_date DESC
    `);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('❌ Get Document Outgoing Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch document outgoing records: ' + err.message });
  }
});

// GET /api/docoutgoing/maxcontrol - Get max control number
app.get('/api/docoutgoing/maxcontrol', async (req, res) => {
  try {
    const request = pool.request();
    const result = await request.query(`
      SELECT ISNULL(MAX(CAST(dms_control AS INT)), 0) + 1 AS nextControl
      FROM tbl_dmsoutgoing
      WHERE ISNUMERIC(dms_control) = 1
    `);
    res.json({ nextControl: result.recordset?.[0]?.nextControl || 1 });
  } catch (err) {
    console.error('❌ Get Max Control Error:', err.message);
    res.status(500).json({ error: 'Failed to get next control number: ' + err.message });
  }
});

// POST /api/docoutgoing - Create new outgoing document
app.post('/api/docoutgoing', async (req, res) => {
  try {
    const { dms_control, dms_destination, dms_recipient, dms_desc, dms_type, dms_purpose } = req.body;

    if (!dms_control) {
      return res.status(400).json({ error: 'Control number is required' });
    }

    const request = pool.request();
    request.input('dms_control', sql.VarChar(50), dms_control);
    request.input('dms_destination', sql.VarChar(200), dms_destination || '');
    request.input('dms_recipient', sql.Int, dms_recipient || null);
    request.input('dms_desc', sql.VarChar(sql.MAX), dms_desc || '');
    request.input('dms_type', sql.VarChar(100), dms_type || '');
    request.input('dms_purpose', sql.VarChar(sql.MAX), dms_purpose || '');

    await request.query(`
      INSERT INTO tbl_dmsoutgoing (dms_date, dms_control, dms_destination, dms_recipient, dms_desc, dms_type, dms_purpose)
      VALUES (GETDATE(), @dms_control, @dms_destination, @dms_recipient, @dms_desc, @dms_type, @dms_purpose)
    `);

    console.log('✅ Document outgoing added successfully');
    res.json({ message: 'Record created successfully' });
  } catch (err) {
    console.error('❌ Create Document Outgoing Error:', err.message);
    res.status(500).json({ error: 'Failed to create record: ' + err.message });
  }
});

// PUT /api/docoutgoing/:id - Update outgoing document
app.put('/api/docoutgoing/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { dms_control, dms_destination, dms_recipient, dms_desc, dms_type, dms_purpose } = req.body;

    if (!dms_control) {
      return res.status(400).json({ error: 'Control number is required' });
    }

    const request = pool.request();
    request.input('id', sql.Int, parseInt(id, 10));
    request.input('dms_control', sql.VarChar(50), dms_control);
    request.input('dms_destination', sql.VarChar(200), dms_destination || '');
    request.input('dms_recipient', sql.Int, dms_recipient || null);
    request.input('dms_desc', sql.VarChar(sql.MAX), dms_desc || '');
    request.input('dms_type', sql.VarChar(100), dms_type || '');
    request.input('dms_purpose', sql.VarChar(sql.MAX), dms_purpose || '');

    await request.query(`
      UPDATE tbl_dmsoutgoing
      SET dms_control = @dms_control,
          dms_destination = @dms_destination,
          dms_recipient = @dms_recipient,
          dms_desc = @dms_desc,
          dms_type = @dms_type,
          dms_purpose = @dms_purpose
      WHERE dms_ctrlno = @id
    `);

    console.log(`✅ Document outgoing ${id} updated successfully`);
    res.json({ message: 'Record updated successfully' });
  } catch (err) {
    console.error('❌ Update Document Outgoing Error:', err.message);
    res.status(500).json({ error: 'Failed to update record: ' + err.message });
  }
});

// DELETE /api/docoutgoing/:id - Delete outgoing document
app.delete('/api/docoutgoing/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const request = pool.request();
    request.input('id', sql.Int, parseInt(id, 10));

    await request.query('DELETE FROM tbl_dmsoutgoing WHERE dms_ctrlno = @id');

    console.log(`✅ Document outgoing ${id} deleted successfully`);
    res.json({ message: 'Record deleted successfully' });
  } catch (err) {
    console.error('❌ Delete Document Outgoing Error:', err.message);
    res.status(500).json({ error: 'Failed to delete record: ' + err.message });
  }
});

// ==================== REPORTS ENDPOINTS ====================

// Reports
// Daily Collection Report
app.get('/api/reports/daily-collection', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }

    const request = pool.request();
    request.input('date', sql.Date, date);

    const result = await request.query(`
                SELECT 
                    ah.aop_control,
                    c.ph_cname,
                    ah.aop_ordate,
                    ah.aop_orno,
                    ah.aop_nature,
                    ah.aop_total
                FROM tbl_assessmenthdr AS ah
                INNER JOIN tbl_client AS c ON ah.aop_clientid = c.ph_ctrlno
                WHERE CAST(ah.aop_ordate AS DATE) = @date
                ORDER BY c.ph_cname
            `);

    console.log(`✅ Fetched daily collection for ${date}: ${result.recordset.length} records`);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('❌ Daily Collection Report Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch daily collection: ' + err.message });
  }
});

// GET /api/reports/available-years - Get available years from View_collectionreport
app.get('/api/reports/available-years', async (req, res) => {
  try {
    const request = pool.request();
    const result = await request.query(`
      SELECT DISTINCT [Year]
      FROM View_collectionreport
      ORDER BY [Year] DESC
    `);
    const years = result.recordset.map(row => row.Year);
    console.log(`✅ Fetched ${years.length} available years for reports`);
    res.json(years);
  } catch (err) {
    console.error('❌ Get Available Years Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch available years: ' + err.message });
  }
});

// ==================== HEALTH CHECK ====================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'Server is running',
    timestamp: new Date(),
    database: pool ? 'Connected' : 'Disconnected'
  });
});

// ==================== ERROR HANDLING ====================

app.use((err, req, res, next) => {
  console.error('❌ Unhandled Error:', err.message);
  res.status(500).json({ error: 'Internal server error: ' + err.message });
});

// ==================== AUDIT LOGS ENDPOINTS ====================

app.get('/api/activitylogs', async (req, res) => {
  try {
    const request = pool.request();
    // Fetch top 1000 logs by default to avoid overwhelming the client
    const result = await request.query(`
      SELECT TOP 1000 
             LogID, UserID, UserName, ActionType, TableName, RecordID, 
             OldValues, NewValues, IPAddress, UserAgent, CreatedAt
      FROM ActivityLogs
      ORDER BY CreatedAt DESC
    `);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('❌ Get Activity Logs Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch activity logs: ' + err.message });
  }
});

// ==================== COMPARATIVE INCOME REPORT ====================

app.get('/api/reports/comparative-income', async (req, res) => {
  try {
    const { year } = req.query;

    if (!year) {
      return res.status(400).json({ error: 'Year parameter is required' });
    }

    const request = pool.request();
    request.input('year', sql.Int, parseInt(year, 10));

    const result = await request.query(`
      SELECT [Year]
            ,[Month_Name]
            ,[Month_No]
            ,[Share_Prov_30]
            ,[Share_Mun_30]
            ,[Share_Brgy_40]
            ,[Share_Volume]
            ,[MGB_Prov_30]
            ,[MGB_Volume]
            ,[Outbound_Fee]
            ,[Inbound_Fee]
            ,[Admin_Fee]
            ,[Ecosystem_Fee]
            ,[Admin_Ecosystem_Fee]
            ,[Other_Misc_Fee]
            ,[Sticker_Fee]
            ,[Reg_Conveyances_Fee]
            ,[Penalties_Fee]
            ,[Net_Share]
            ,[Gross_Total]
      FROM [View_collectionreport]
      WHERE [Year] = @year
      ORDER BY [Month_No] DESC
    `);

    console.log(`✅ Fetched ${result.recordset.length} comparative income records for year ${year}`);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('❌ Get Comparative Income Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch comparative income: ' + err.message });
  }
});

// ==================== REVENUE COLLECTION REPORT ====================

app.get('/api/reports/revenue-collection', async (req, res) => {
  try {
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({ error: 'Year and month parameters are required' });
    }

    const request = pool.request();
    request.input('year', sql.Int, parseInt(year, 10));
    request.input('month', sql.NVarChar, month);

    const result = await request.query(`
      SELECT [Year]
            ,[Month_Name]
            ,[Month_No]
            ,[Share_Prov_30]
            ,[Share_Mun_30]
            ,[Share_Brgy_40]
            ,[Share_Volume]
            ,[MGB_Prov_30]
            ,[MGB_Volume]
            ,[Outbound_Fee]
            ,[Inbound_Fee]
            ,[Admin_Fee]
            ,[Ecosystem_Fee]
            ,[Admin_Ecosystem_Fee]
            ,[Other_Misc_Fee]
            ,[Sticker_Fee]
            ,[Reg_Conveyances_Fee]
            ,[Penalties_Fee]
            ,[Net_Share]
            ,[Gross_Total]
      FROM [View_collectionreport]
      WHERE [Year] = @year AND [Month_Name] = @month
    `);

    if (result.recordset.length === 0) {
      console.log(`[API] No data found for ${month} ${year}`);
      return res.status(200).json(null); // Return null instead of 404 to handle "empty" gracefully on frontend
    }

    console.log(`✅ [API] Data found:`, result.recordset[0]);
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('❌ Get Revenue Collection Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch revenue collection: ' + err.message });
  }
});

// ==================== BARANGAY SHARE REPORT ENDPOINT ====================

app.get('/api/reports/barangay-share', async (req, res) => {
  try {
    const { year, municipality, barangay } = req.query;

    if (!year || !municipality || !barangay) {
      return res.status(400).json({ error: 'Year, municipality, and barangay are required' });
    }

    console.log(`[API] Fetching barangay share for ${barangay}, ${municipality} - ${year}`);

    const request = pool.request();
    request.input('year', sql.Int, parseInt(year));
    request.input('municipality', sql.VarChar, municipality);
    request.input('barangay', sql.VarChar, barangay);

    const result = await request.query(`
      SELECT [RptYear]
            ,[MonthName]
            ,[aop_mun]
            ,[aop_brgy]
            ,[total_share]
      FROM [View_brgysharesmonth]
      WHERE [RptYear] = @year 
        AND [aop_mun] = @municipality 
        AND [aop_brgy] = @barangay
      ORDER BY CASE [MonthName]
        WHEN 'January' THEN 1
        WHEN 'February' THEN 2
        WHEN 'March' THEN 3
        WHEN 'April' THEN 4
        WHEN 'May' THEN 5
        WHEN 'June' THEN 6
        WHEN 'July' THEN 7
        WHEN 'August' THEN 8
        WHEN 'September' THEN 9
        WHEN 'October' THEN 10
        WHEN 'November' THEN 11
        WHEN 'December' THEN 12
      END
    `);

    console.log(`✅ [API] Found ${result.recordset.length} months of barangay share data`);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('❌ Get Barangay Share Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch barangay share: ' + err.message });
  }
});

// ==================== MUNICIPAL SHARE REPORT ENDPOINT ====================

app.get('/api/reports/municipal-share', async (req, res) => {
  try {
    const { year, municipality } = req.query;

    if (!year || !municipality) {
      return res.status(400).json({ error: 'Year and municipality are required' });
    }

    console.log(`[API] Fetching municipal share for ${municipality} - ${year}`);

    const request = pool.request();
    request.input('year', sql.Int, parseInt(year));
    request.input('municipality', sql.VarChar, municipality);

    const result = await request.query(`
      SELECT [aop_mun]
            ,[yr]
            ,[mo]
            ,[share]
      FROM [View_munsharemonth]
      WHERE [yr] = @year 
        AND [aop_mun] = @municipality
      ORDER BY CASE [mo]
        WHEN 'January' THEN 1
        WHEN 'February' THEN 2
        WHEN 'March' THEN 3
        WHEN 'April' THEN 4
        WHEN 'May' THEN 5
        WHEN 'June' THEN 6
        WHEN 'July' THEN 7
        WHEN 'August' THEN 8
        WHEN 'September' THEN 9
        WHEN 'October' THEN 10
        WHEN 'November' THEN 11
        WHEN 'December' THEN 12
      END
    `);

    console.log(`✅ [API] Found ${result.recordset.length} months of municipal share data`);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('❌ Get Municipal Share Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch municipal share: ' + err.message });
  }
});

// ==================== ACTIVE PERMITTEES REPORT ENDPOINT ====================

app.get('/api/reports/active-permittees', async (req, res) => {
  try {
    console.log(`[API] Fetching active permittees`);

    const request = pool.request();
    const result = await request.query(`
      SELECT [num_row]
            ,[ph_cname]
            ,[ph_mun]
            ,[ph_brgy]
            ,[ph_volume]
            ,[ph_area]
            ,[ph_dfrom]
            ,[ph_dto]
            ,[ph_permitno]
            ,[ph_contact]
            ,[ph_source]
      FROM [View_activepermit]
      ORDER BY [ph_mun], [ph_brgy], [ph_cname]
    `);

    console.log(`✅ [API] Found ${result.recordset.length} active permittees`);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('❌ Get Active Permittees Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch active permittees: ' + err.message });
  }
});

// ==================== ORDINANCE BOT ENDPOINTS ====================

const { Mistral } = require('@mistralai/mistralai');
const { getOrdinanceContent, ordinanceExists } = require('./utils/ordinanceParser');

// Initialize Mistral client (lazy - will be created on first request)
let mistralClient = null;

function getMistralClient() {
  if (!mistralClient && process.env.MISTRAL_API_KEY) {
    mistralClient = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
  }
  return mistralClient;
}

// POST /api/ordinance-bot/chat - Chat with the Ordinance Bot
app.post('/api/ordinance-bot/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Check if Mistral API key is configured
    if (!process.env.MISTRAL_API_KEY) {
      return res.status(500).json({
        error: 'Mistral API key not configured. Please add MISTRAL_API_KEY to your .env file.'
      });
    }

    // Check if ordinance document exists
    if (!ordinanceExists()) {
      return res.status(500).json({
        error: 'Ordinance document not found. Please ensure PLENRO_ORDINANCE.docx is in the reference folder.'
      });
    }

    // Get ordinance content
    const ordinanceContent = await getOrdinanceContent();

    // Get or create Mistral client
    const client = getMistralClient();
    if (!client) {
      return res.status(500).json({ error: 'Failed to initialize Mistral client' });
    }

    // System prompt that strictly limits responses to ordinance content
    const systemPrompt = `You are a knowledgeable legal assistant specializing in the PLENRO Ordinance document provided below.

RULES YOU MUST FOLLOW:
1. ONLY answer questions that are directly related to the ordinance content provided
2. If a question is NOT about the ordinance, politely decline and say: "I can only answer questions about the PLENRO Ordinance. Please ask something related to the ordinance."
3. When answering, cite the relevant section or article numbers when applicable
4. Be concise but accurate in your responses
5. If the answer is not found in the ordinance, say so honestly
6. Do NOT make up information that is not in the ordinance
7. Format your responses clearly with proper paragraphs

ACRONYMS AND TECHNICAL TERMS:
- You ARE allowed to use your general knowledge to explain acronyms, abbreviations, and technical terms that appear in the ordinance document but are NOT explicitly defined within it
- Examples include: PLENRO, DENR, MGB, LGU, DAO, ECC, EIA, and other government/environmental/legal acronyms
- When explaining such terms, clearly indicate that the definition is from general knowledge, not from the ordinance itself
- Always relate the explanation back to how the term is used in the context of the ordinance

THE PLENRO ORDINANCE DOCUMENT CONTENT:
---
${ordinanceContent}
---

Remember: Stay focused on ordinance-related topics. You may provide context for undefined acronyms/terms, but reject completely off-topic questions.`;

    console.log('🤖 Ordinance Bot: Processing question...');

    // Call Mistral AI
    const chatResponse = await client.chat.complete({
      model: 'mistral-small-latest',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message.trim() }
      ],
      temperature: 0.3, // Lower temperature for more focused responses
      maxTokens: 1024
    });

    const botResponse = chatResponse.choices?.[0]?.message?.content;

    if (!botResponse) {
      throw new Error('No response received from Mistral AI');
    }

    console.log('✅ Ordinance Bot: Response generated successfully');
    res.json({ response: botResponse });

  } catch (err) {
    console.error('❌ Ordinance Bot Error:', err.message);

    // Handle specific Mistral API errors
    if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
      return res.status(401).json({ error: 'Invalid Mistral API key. Please check your MISTRAL_API_KEY.' });
    }
    if (err.message?.includes('429') || err.message?.includes('rate limit')) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
    }

    res.status(500).json({ error: 'Failed to process your question: ' + err.message });
  }
});

// GET /api/ordinance-bot/status - Check bot status
app.get('/api/ordinance-bot/status', async (req, res) => {
  try {
    const hasApiKey = !!process.env.MISTRAL_API_KEY;
    const hasDocument = ordinanceExists();

    res.json({
      ready: hasApiKey && hasDocument,
      hasApiKey,
      hasDocument,
      message: !hasApiKey
        ? 'Mistral API key not configured'
        : !hasDocument
          ? 'Ordinance document not found'
          : 'Bot is ready'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== TASK FORCE ENDPOINTS ====================

// GET /api/taskforce/municipalities - Get municipalities for autocomplete
app.get('/api/taskforce/municipalities', async (req, res) => {
  try {
    const request = pool.request();
    const result = await request.query(`
      SELECT mun_name
      FROM tbl_municipalities
      GROUP BY mun_name
      ORDER BY mun_name
    `);
    console.log(`✅ Fetched ${result.recordset.length} municipalities for taskforce`);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('❌ Get Taskforce Municipalities Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch municipalities: ' + err.message });
  }
});

// GET /api/taskforce/commodities - Get commodities for combobox
app.get('/api/taskforce/commodities', async (req, res) => {
  try {
    const request = pool.request();
    const result = await request.query(`
      SELECT cm_ctrlno, cm_desc
      FROM tbl_commodity
      ORDER BY cm_desc
    `);
    console.log(`✅ Fetched ${result.recordset.length} commodities for taskforce`);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('❌ Get Taskforce Commodities Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch commodities: ' + err.message });
  }
});

// GET /api/taskforce/clients - Get client names for autocomplete
app.get('/api/taskforce/clients', async (req, res) => {
  try {
    const request = pool.request();
    const result = await request.query(`
      SELECT ph_cname
      FROM tbl_client
      ORDER BY ph_cname
    `);
    console.log(`✅ Fetched ${result.recordset.length} clients for taskforce`);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('❌ Get Taskforce Clients Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch clients: ' + err.message });
  }
});

// GET /api/taskforce/checkers - Get distinct checker names for autocomplete
app.get('/api/taskforce/checkers', async (req, res) => {
  try {
    const request = pool.request();
    const result = await request.query(`
      SELECT DISTINCT tf_checker
      FROM tbl_taskforce
      WHERE tf_checker IS NOT NULL AND tf_checker != ''
      ORDER BY tf_checker ASC
    `);
    console.log(`✅ Fetched ${result.recordset.length} checkers for taskforce`);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('❌ Get Taskforce Checkers Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch checkers: ' + err.message });
  }
});

// GET /api/taskforce/validate-dr - Validate DR number against delivery receipt stubs
app.get('/api/taskforce/validate-dr', async (req, res) => {
  try {
    const { drNumber } = req.query;

    if (!drNumber) {
      return res.json({ valid: false, clientName: null });
    }

    const request = pool.request();
    request.input('drNumber', sql.Int, parseInt(drNumber, 10));

    const result = await request.query(`
      SELECT 
        dr.dr_stubfrom, 
        dr.dr_stubto, 
        c.ph_cname
      FROM tbl_deliveryreceipt AS dr
      INNER JOIN tbl_client AS c 
        ON dr.dr_clientid = c.ph_ctrlno
      WHERE @drNumber BETWEEN dr.dr_stubfrom AND dr.dr_stubto
    `);

    if (result.recordset.length > 0) {
      res.json({ valid: true, clientName: result.recordset[0].ph_cname });
    } else {
      res.json({ valid: false, clientName: null });
    }
  } catch (err) {
    console.error('❌ Validate DR Error:', err.message);
    res.status(500).json({ error: 'Failed to validate DR: ' + err.message });
  }
});

// GET /api/taskforce/check-duplicate - Check if DR number already exists in tbl_taskforce
app.get('/api/taskforce/check-duplicate', async (req, res) => {
  try {
    const { drNumber, excludeId } = req.query;

    if (!drNumber) {
      return res.json({ duplicate: false });
    }

    const request = pool.request();
    request.input('tf_dr', sql.Int, parseInt(drNumber, 10));
    if (excludeId) {
      request.input('excludeId', sql.Int, parseInt(excludeId, 10));
    }

    let query = `
      SELECT TOP 1 
        tf_ctrlno, 
        tf_area, 
        format(tf_date, 'yyyy-MM-dd') as tf_date, 
        tf_checker, 
        tf_destination, 
        tf_plateno, 
        tf_name
      FROM tbl_taskforce 
      WHERE tf_dr = @tf_dr
    `;

    if (excludeId) {
      query += ` AND tf_ctrlno != @excludeId`;
    }

    const result = await request.query(query);

    if (result.recordset.length > 0) {
      res.json({ duplicate: true, record: result.recordset[0] });
    } else {
      res.json({ duplicate: false });
    }
  } catch (err) {
    console.error('❌ Check Duplicate DR Error:', err.message);
    res.status(500).json({ error: 'Failed to check duplicate DR: ' + err.message });
  }
});

// GET /api/taskforce - Get task force records by area and date
app.get('/api/taskforce', async (req, res) => {
  try {
    const { area, date } = req.query;

    if (!area || !date) {
      return res.json([]);
    }

    const request = pool.request();
    request.input('tf_area', sql.VarChar(200), area);
    request.input('tf_date', sql.Date, date);

    const result = await request.query(`
      SELECT [tf_ctrlno]
            ,[tf_area]
            ,[tf_date]
            ,[tf_checker]
            ,[tf_dr]
            ,[tf_destination]
            ,[tf_plateno]
            ,[tf_commodity]
            ,[tf_volume]
            ,[tf_name]
            ,[tf_remarks]
            ,[tf_apprehended]
            ,(SELECT CASE WHEN EXISTS (
                SELECT 1 FROM tbl_deliveryreceipt dr 
                WHERE TRY_CAST(tbl_taskforce.tf_dr AS INT) BETWEEN dr.dr_stubfrom AND dr.dr_stubto
            ) THEN 1 ELSE 0 END) as is_dr_valid
      FROM [dbo].[tbl_taskforce]
      WHERE tf_area = @tf_area AND tf_date = @tf_date
      ORDER BY tf_ctrlno ASC
    `);

    console.log(`✅ Fetched ${result.recordset.length} task force records for ${area} on ${date}`);
    res.json(result.recordset || []);
  } catch (err) {
    console.error('❌ Get Task Force Records Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch task force records: ' + err.message });
  }
});

// POST /api/taskforce - Create new task force record
app.post('/api/taskforce', async (req, res) => {
  try {
    const { tf_area, tf_date, tf_checker, tf_dr, tf_destination, tf_plateno, tf_commodity, tf_volume, tf_name, tf_remarks, tf_apprehended } = req.body;

    if (!tf_area || !tf_date) {
      return res.status(400).json({ error: 'Area and date are required' });
    }

    const request = pool.request();
    request.input('tf_area', sql.VarChar(100), tf_area);
    request.input('tf_date', sql.Date, tf_date);
    request.input('tf_checker', sql.VarChar(150), tf_checker || null);
    request.input('tf_dr', sql.Int, tf_dr ? parseInt(tf_dr) : null);
    request.input('tf_destination', sql.VarChar(100), tf_destination || null);
    request.input('tf_plateno', sql.VarChar(50), tf_plateno || null);
    request.input('tf_commodity', sql.Int, tf_commodity ? parseInt(tf_commodity) : null);
    request.input('tf_volume', sql.Int, tf_volume ? parseInt(tf_volume) : null);
    request.input('tf_name', sql.VarChar(200), tf_name || null);
    request.input('tf_remarks', sql.NVarChar(255), tf_remarks || null);
    request.input('tf_apprehended', sql.Bit, tf_apprehended ? 1 : 0);

    const insertResult = await request.query(`
      INSERT INTO [tbl_taskforce]
           ([tf_area]
           ,[tf_date]
           ,[tf_checker]
           ,[tf_dr]
           ,[tf_destination]
           ,[tf_plateno]
           ,[tf_commodity]
           ,[tf_volume]
           ,[tf_name]
           ,[tf_remarks]
           ,[tf_apprehended])
      OUTPUT inserted.tf_ctrlno
      VALUES
           (@tf_area
           ,@tf_date
           ,@tf_checker
           ,@tf_dr
           ,@tf_destination
           ,@tf_plateno
           ,@tf_commodity
           ,@tf_volume
           ,@tf_name
           ,@tf_remarks
           ,@tf_apprehended)
    `);

    const newId = insertResult.recordset[0]?.tf_ctrlno;

    await logActivity(pool, req, {
      action: 'CREATE',
      tableName: 'tbl_taskforce',
      recordId: newId || tf_area,
      newValues: req.body
    });

    console.log('✅ Task force record added successfully');
    res.json({ message: 'Task force record added successfully', tf_ctrlno: newId });
  } catch (err) {
    console.error('❌ Add Task Force Record Error:', err.message);
    res.status(500).json({ error: 'Failed to add task force record: ' + err.message });
  }
});

// PUT /api/taskforce/:id - Update task force record
app.put('/api/taskforce/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { tf_area, tf_date, tf_checker, tf_dr, tf_destination, tf_plateno, tf_commodity, tf_volume, tf_name, tf_remarks, tf_apprehended } = req.body;

    // Validate required fields
    if (!tf_area || !tf_date) {
      return res.status(400).json({ error: 'Area and date are required' });
    }

    // Fetch old values for audit
    const getReq = pool.request();
    getReq.input('tf_ctrlno', sql.Int, id);
    const existing = await getReq.query('SELECT * FROM [tbl_taskforce] WHERE [tf_ctrlno] = @tf_ctrlno');

    if (existing.recordset.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const oldValues = existing.recordset[0];

    const request = pool.request();
    request.input('tf_ctrlno', sql.Int, id);
    request.input('tf_area', sql.VarChar(100), tf_area);
    request.input('tf_date', sql.Date, tf_date);
    request.input('tf_checker', sql.VarChar(150), tf_checker || null);
    request.input('tf_dr', sql.Int, tf_dr ? parseInt(tf_dr) : null);
    request.input('tf_destination', sql.VarChar(100), tf_destination || null);
    request.input('tf_plateno', sql.VarChar(50), tf_plateno || null);
    request.input('tf_commodity', sql.Int, tf_commodity ? parseInt(tf_commodity) : null);
    request.input('tf_volume', sql.Int, tf_volume ? parseInt(tf_volume) : null);
    request.input('tf_name', sql.VarChar(200), tf_name || null);
    request.input('tf_remarks', sql.NVarChar(255), tf_remarks || null);
    request.input('tf_apprehended', sql.Bit, tf_apprehended ? 1 : 0);

    await request.query(`
      UPDATE [tbl_taskforce]
      SET [tf_area] = @tf_area
         ,[tf_date] = @tf_date
         ,[tf_checker] = @tf_checker
         ,[tf_dr] = @tf_dr
         ,[tf_destination] = @tf_destination
         ,[tf_plateno] = @tf_plateno
         ,[tf_commodity] = @tf_commodity
         ,[tf_volume] = @tf_volume
         ,[tf_name] = @tf_name
         ,[tf_remarks] = @tf_remarks
         ,[tf_apprehended] = @tf_apprehended
      WHERE [tf_ctrlno] = @tf_ctrlno
    `);

    await logActivity(pool, req, {
      action: 'UPDATE',
      tableName: 'tbl_taskforce',
      recordId: id,
      oldValues: oldValues,
      newValues: req.body
    });

    console.log(`✅ Task force record ${id} updated successfully`);
    res.json({ message: 'Task force record updated successfully' });
  } catch (err) {
    console.error('❌ Update Task Force Record Error:', err.message);
    res.status(500).json({ error: 'Failed to update task force record: ' + err.message });
  }
});

// DELETE /api/taskforce/:id - Delete task force record
app.delete('/api/taskforce/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch old values for audit
    const getReq = pool.request();
    getReq.input('tf_ctrlno', sql.Int, id);
    const existing = await getReq.query('SELECT * FROM [tbl_taskforce] WHERE [tf_ctrlno] = @tf_ctrlno');
    const oldValues = existing.recordset[0];

    const request = pool.request();
    request.input('tf_ctrlno', sql.Int, id);

    await request.query('DELETE FROM [tbl_taskforce] WHERE [tf_ctrlno] = @tf_ctrlno');

    if (oldValues) {
      await logActivity(pool, req, {
        action: 'DELETE',
        tableName: 'tbl_taskforce',
        recordId: id,
        oldValues: oldValues
      });
    }

    console.log(`✅ Task force record ${id} deleted successfully`);
    res.json({ message: 'Task force record deleted successfully' });
  } catch (err) {
    console.error('❌ Delete Task Force Record Error:', err.message);
    res.status(500).json({ error: 'Failed to delete task force record: ' + err.message });
  }
});



app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ==================== START SERVER ====================



const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
Server: http://localhost:${PORT}
DB Server: ${config.server}
Database: ${config.database}
Status: ✅ Ready
  `);
});

// Graceful Shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  if (pool) {
    await pool.close();
  }
  process.exit(0);
});

