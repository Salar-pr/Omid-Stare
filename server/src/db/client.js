'use strict';
/**
 * db/client — یک pool اشتراکی + instance Drizzle روی schema.
 * Transactionها (سفارش/کوپن) مستقیم از pool.client() استفاده می‌کنند تا کنترل دقیق BEGIN/COMMIT/ROLLBACK داشته باشند.
 */
const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');
const config = require('../config');
const schema = require('./schema');

const pool = new Pool({
  connectionString: config.databaseUrl,
  max: config.dbPool.max,
  idleTimeoutMillis: config.dbPool.idleTimeoutMillis,
  connectionTimeoutMillis: config.dbPool.connectionTimeoutMillis,
});

pool.on('error', (err) => {
  // logger در app.js؛ اینجا فقط اینکه connection خام مرده ثبت می‌شود (بدون leak)
  console.error('[db] idle client error:', err.message);
});

const db = drizzle(pool, { schema });

async function checkConnection() {
  const t = Date.now();
  await pool.query('SELECT 1');
  return { up: true, latencyMs: Date.now() - t };
}

module.exports = { pool, db, checkConnection, schema };
