import 'dotenv/config';
import config from './config.js'; // validates env first — throws on bad/missing secrets
import { createApp } from './app.js';
import { ensureBootstrap, seedDemo } from './db/repo.js';
import { closePool, dbMode } from './db/pool.js';

const app = createApp();
const server = app.listen(config.port, async () => {
  // Never log secrets or connection strings.
  console.log(`backend listening on :${config.port} (env=${config.nodeEnv} db=${dbMode()} storage=${config.r2.configured ? 'r2' : 'local'})`);
  try {
    await ensureBootstrap();
    await seedDemo();
  } catch (e) {
    console.error('startup task failed:', e.message);
  }
});

// Render sends SIGTERM on deploy: drain, then release pg connections.
function shutdown(signal) {
  console.log(`${signal} received, shutting down...`);
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
