import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool } from './pool.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const files = ['schema-m1.sql', 'schema-m2.sql', 'schema-m3.sql', 'schema-m4.sql', 'schema-m5.sql'];

const pool = getPool();
if (!pool) {
  console.log('DATABASE_URL not set — skipping migrate (memory mode).');
  process.exit(0);
}

await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
for (const f of files) {
  const sql = fs.readFileSync(path.join(dir, f), 'utf8');
  console.log(`applying ${f}...`);
  await pool.query(sql);
}
const { ensureSeed } = await import('./repo.js');
await ensureSeed();
console.log('seed ensured.');
console.log('migrate done.');
await pool.end();
