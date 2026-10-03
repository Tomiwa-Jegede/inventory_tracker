import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

let pool = null;

export function dbMode() {
  return process.env.DATABASE_URL ? 'pg' : 'memory';
}

export function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

export async function query(text, params) {
  const p = getPool();
  if (!p) throw new Error('DATABASE_URL not set — running in memory mode');
  return p.query(text, params);
}
