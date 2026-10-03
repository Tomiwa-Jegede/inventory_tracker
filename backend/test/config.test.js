import test from 'node:test';
import assert from 'node:assert/strict';
import { validateConfig } from '../src/config.js';

const SECRET = 'test-secret-0123456789abcdef-test!!';

function baseEnv() {
  return { NODE_ENV: 'test', AUTH_SECRET: SECRET };
}

test('Config: production refuses to start without AUTH_SECRET or DATABASE_URL', () => {
  assert.throws(() => validateConfig({ NODE_ENV: 'production', DATABASE_URL: 'postgres://x' }), /AUTH_SECRET/);
  assert.throws(() => validateConfig({ NODE_ENV: 'production', AUTH_SECRET: SECRET }), /DATABASE_URL/);
  assert.throws(() => validateConfig({ NODE_ENV: 'production', AUTH_SECRET: 'short', DATABASE_URL: 'postgres://x' }), /32\+ chars/);
});

test('Config: production requires CORS_ORIGINS and R2, refuses demo flags', () => {
  const prod = { NODE_ENV: 'production', AUTH_SECRET: SECRET, DATABASE_URL: 'postgres://x' };
  assert.throws(() => validateConfig(prod), /CORS_ORIGINS/);
  assert.throws(() => validateConfig({ ...prod, CORS_ORIGINS: 'https://a.pages.dev' }), /R2/);
  const full = { ...prod, CORS_ORIGINS: 'https://a.pages.dev', R2_ACCOUNT_ID: 'a', R2_ACCESS_KEY_ID: 'b', R2_SECRET_ACCESS_KEY: 'c', R2_BUCKET: 'd' };
  assert.doesNotThrow(() => validateConfig(full));
  assert.throws(() => validateConfig({ ...full, ALLOW_DEMO_LOGIN: 'true' }), /ALLOW_DEMO_LOGIN/);
  assert.throws(() => validateConfig({ ...full, SEED_DEMO: 'true' }), /SEED_DEMO/);
});

test('Config: SEED_DEMO requires a password; non-prod allows memory mode', () => {
  assert.throws(() => validateConfig({ ...baseEnv(), SEED_DEMO: 'true' }), /SEED_DEMO_PASSWORD/);
  const cfg = validateConfig({ ...baseEnv(), SEED_DEMO: 'true', SEED_DEMO_PASSWORD: 'demo-pass-1' });
  assert.equal(cfg.seedDemo, true);
  const mem = validateConfig(baseEnv());
  assert.equal(mem.databaseUrl, null);
  assert.deepEqual(mem.corsOrigins, []);
});
