import 'dotenv/config';
import { createApp } from './app.js';
import { ensureSeed } from './db/repo.js';
import { dbMode } from './db/pool.js';

const app = createApp();
const port = process.env.PORT || 4000;
app.listen(port, async () => {
  console.log(`backend listening on :${port} (db=${dbMode()})`);
  try {
    await ensureSeed();
  } catch (e) {
    console.error('seed failed:', e.message);
  }
});
