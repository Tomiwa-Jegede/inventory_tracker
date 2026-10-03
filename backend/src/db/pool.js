import pg from 'pg';
import config from '../config.js';

const { Pool } = pg;

let pool = null;

export function dbMode() {
  return config.databaseUrl ? 'pg' : 'memory';
}

// Neon suspends idle databases: the first query after idle can take 1s+.
// Generous connect timeout + retry-once keeps cold starts from crashing boot.
function buildPool() {
  const url = config.databaseUrl;
  const hasSslParam = /[?&]sslmode=/i.test(url);
  const options = {
    connectionString: url,
    max: config.dbPoolMax,
    connectionTimeoutMillis: 10000,
    // Well under Neon's ~5min idle timeout so we recycle first.
    idleTimeoutMillis: 60000,
  };
  if (!hasSslParam) {
    const useSsl = /localhost|127\.0\.0\.1/.test(url) ? false : true;
    if (useSsl) options.ssl = { require: true };
  }
  const p = new Pool(options);
  // A dropped idle connection must never crash the process.
  p.on('error', (err) => {
    console.error('pg pool error (connection recycled):', err.message);
  });
  return p;
}

export function getPool() {
  if (!config.databaseUrl) return null;
  if (!pool) pool = buildPool();
  return pool;
}

const RETRYABLE = ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'];
function isRetryable(err) {
  if (!err) return false;
  if (RETRYABLE.includes(err.code)) return true;
  return /connection (terminated|reset|refused)|timeout|too many clients/i.test(err.message || '');
}

export async function query(text, params) {
  const p = getPool();
  if (!p) throw new Error('DATABASE_URL not set — running in memory mode');
  try {
    return await p.query(text, params);
  } catch (err) {
    // Retry once on connection-level failures: covers the Neon wake-from-sleep race.
    if (!isRetryable(err)) throw err;
    await new Promise((r) => setTimeout(r, 1500));
    return p.query(text, params);
  }
}

export async function pingDb() {
  const r = await query('SELECT 1 AS ok');
  return r.rows?.[0]?.ok === 1;
}

export async function closePool() {
  if (pool) {
    await pool.end().catch(() => {});
    pool = null;
  }
}
