const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const env = require('./env');

let pool = null;
let sqliteDb = null;
let isPostgres = false;

// Initialize Database connection
async function initDb() {
  // If user provided DATABASE_URL or standard PG env, attempt PostgreSQL first
  try {
    const pgConfig = env.DATABASE_URL
      ? { connectionString: env.DATABASE_URL }
      : {
          user: env.PGUSER,
          host: env.PGHOST,
          database: env.PGDATABASE,
          password: env.PGPASSWORD,
          port: env.PGPORT,
          connectionTimeoutMillis: 3000,
        };

    const testPool = new Pool(pgConfig);
    // Quick test ping
    await testPool.query('SELECT 1 AS test');
    pool = testPool;
    isPostgres = true;
    console.log('✅ Connected to PostgreSQL database successfully.');

    // Run schema migration for PG
    const schemaSql = fs.readFileSync(
      path.join(__dirname, '../models/schema.sql'),
      'utf8'
    );
    await pool.query(schemaSql);
    console.log('✅ PostgreSQL tables verified / created.');
  } catch (pgError) {
    console.warn(`⚠️ PostgreSQL connection not available (${pgError.message}).`);
    console.log('🔄 Initializing SQLite database for seamless zero-config local run...');

    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = path.join(dataDir, 'monitoring.sqlite');
    sqliteDb = new sqlite3.Database(dbPath);
    isPostgres = false;

    // Create SQLite tables matching PostgreSQL schema
    await runSqlite(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user' NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await runSqlite(`
      CREATE TABLE IF NOT EXISTS monitored_apis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        method TEXT DEFAULT 'GET' NOT NULL,
        headers TEXT DEFAULT '{}',
        request_body TEXT DEFAULT '',
        expected_status_code INTEGER DEFAULT 200,
        check_interval TEXT DEFAULT '5m',
        timeout_ms INTEGER DEFAULT 5000,
        is_active INTEGER DEFAULT 1,
        current_status TEXT DEFAULT 'UNKNOWN',
        last_checked_at DATETIME,
        last_response_time_ms INTEGER DEFAULT 0,
        consecutive_failures INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await runSqlite(`
      CREATE TABLE IF NOT EXISTS health_check_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        api_id INTEGER NOT NULL REFERENCES monitored_apis(id) ON DELETE CASCADE,
        status TEXT NOT NULL,
        response_time_ms INTEGER NOT NULL,
        status_code INTEGER,
        is_success INTEGER NOT NULL,
        failure_reason TEXT,
        response_snippet TEXT,
        checked_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await runSqlite(`CREATE INDEX IF NOT EXISTS idx_monitored_apis_user ON monitored_apis(user_id);`);
    await runSqlite(`CREATE INDEX IF NOT EXISTS idx_health_logs_api ON health_check_logs(api_id, checked_at DESC);`);

    console.log('✅ SQLite database initialized at:', dbPath);
  }
}

function runSqlite(sql, params = []) {
  return new Promise((resolve, reject) => {
    sqliteDb.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function allSqlite(sql, params = []) {
  return new Promise((resolve, reject) => {
    sqliteDb.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// Unified query runner with parameter translation ($1 -> ?)
async function query(sqlText, params = []) {
  if (isPostgres && pool) {
    const res = await pool.query(sqlText, params);
    return {
      rows: res.rows,
      rowCount: res.rowCount,
    };
  }

  // SQLite translation
  let sqliteSql = sqlText;
  let translatedSql = sqliteSql.replace(/\$(\d+)/g, '?');
  // Handle RETURNING id for SQLite
  const isInsert = /^\s*INSERT\s+INTO/i.test(translatedSql);
  const hasReturning = /RETURNING\s+(.+)$/i.test(translatedSql);
  if (hasReturning) {
    translatedSql = translatedSql.replace(/RETURNING\s+.+$/i, '').trim();
  }

  // Convert boolean values in params for SQLite
  const adaptedParams = params.map((p) => {
    if (typeof p === 'boolean') return p ? 1 : 0;
    return p;
  });

  if (/^\s*(SELECT|PRAGMA)/i.test(translatedSql)) {
    const rows = await allSqlite(translatedSql, adaptedParams);
    return { rows, rowCount: rows.length };
  } else {
    const res = await runSqlite(translatedSql, adaptedParams);
    let rows = [];
    if (isInsert && hasReturning) {
      rows = [{ id: res.lastID }];
    }
    return {
      rows,
      rowCount: res.changes,
      insertId: res.lastID,
    };
  }
}

module.exports = {
  initDb,
  query,
  getIsPostgres: () => isPostgres,
};
