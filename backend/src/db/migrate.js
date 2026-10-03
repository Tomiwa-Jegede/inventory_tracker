import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import config from '../config.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
// New changes ship as NEW numbered files — never edit an applied one.
const files = ['schema-m1.sql', 'schema-m2.sql', 'schema-m3.sql', 'schema-m4.sql', 'schema-m5.sql', 'schema-m6.sql'];

const connectionString = config.databaseUrlUnpooled;
if (!connectionString) {
  console.log('Neither DATABASE_URL_UNPOOLED nor DATABASE_URL set — skipping migrate (memory mode).');
  process.exit(0);
}

const hasSslParam = /[?&]sslmode=/i.test(connectionString);
const pool = new pg.Pool({
  connectionString,
  max: 1,
  connectionTimeoutMillis: 15000,
  ...(hasSslParam ? {} : (/localhost|127\.0\.0\.1/.test(connectionString) ? {} : { ssl: { require: true } })),
});
pool.on('error', (err) => console.error('migrate pool error:', err.message));

await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`);

for (const f of files) {
  const done = await pool.query(`SELECT 1 FROM schema_migrations WHERE filename=$1`, [f]);
  if (done.rowCount > 0) {
    console.log(`skipping ${f} (already applied)`);
    continue;
  }
  const sql = fs.readFileSync(path.join(dir, f), 'utf8');
  console.log(`applying ${f}...`);
  await pool.query(sql);
  await pool.query(`INSERT INTO schema_migrations (filename) VALUES ($1)`, [f]);
}
console.log('migrate done.');
await pool.end();
