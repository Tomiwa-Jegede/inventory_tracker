import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { login, listen, api, seedUsers, authHeader, TEST_PASSWORD } from './helpers.js';
import { store } from '../src/store.js';

test('Auth: register with password + JWT login + wrong password rejected', async () => {
  await seedUsers();
  const app = createApp();
  const server = await listen(app);
  const base = `http://localhost:${server.address().port}`;
  try {
    const owner = await login(base, 'owner@test.local');
    assert.equal(owner.status, 200);
    // Login response carries the business record (currency/timezone source).
    assert.equal(owner.body.business.currency, 'NGN');
    assert.equal(owner.body.business.timezone, 'Africa/Lagos');
    const H = authHeader(owner.body.token);

    const reg = await api(base, '/api/auth/register', {
      method: 'POST', headers: H,
      body: JSON.stringify({ name: 'New Staff', email: 'new@test.local', password: 'secret123', role: 'staff' }),
    });
    assert.equal(reg.status, 201);
    assert.ok(!reg.body.user.password_hash);

    const jwtLogin = await login(base, 'new@test.local', 'secret123');
    assert.equal(jwtLogin.status, 200);
    assert.ok(jwtLogin.body.token.split('.').length === 3);

    const bad = await login(base, 'new@test.local', 'wrongpass');
    assert.equal(bad.status, 401);

    // Staff JWT cannot create products
    const denied = await api(base, '/api/products', {
      method: 'POST', headers: authHeader(jwtLogin.body.token),
      body: JSON.stringify({ name: 'X', price_minor: 100 }),
    });
    assert.equal(denied.status, 403);
    assert.ok(store.users.find((u) => u.email === 'new@test.local').password_hash);
  } finally {
    server.close();
  }
});

test('Auth: no login works without a password; forged tokens rejected', async () => {
  await seedUsers();
  const app = createApp();
  const server = await listen(app);
  const base = `http://localhost:${server.address().port}`;
  try {
    // No password → 401, even for a real account.
    const noPass = await api(base, '/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'owner@test.local' }) });
    assert.equal(noPass.status, 401);

    // Unknown email → same generic error (no account enumeration).
    const unknown = await login(base, 'nobody@test.local', 'whatever123');
    assert.equal(unknown.status, 401);
    assert.equal(unknown.body.error, 'invalid credentials');

    // Forged legacy base64 token (userId:role:businessId) → 401.
    const forged = Buffer.from('test-owner-1:owner:test-biz-1').toString('base64');
    const res = await api(base, '/api/products', { headers: authHeader(forged) });
    assert.equal(res.status, 401);

    // Garbage token → 401.
    const garbage = await api(base, '/api/products', { headers: authHeader('not-a-jwt') });
    assert.equal(garbage.status, 401);
    void TEST_PASSWORD;
  } finally {
    server.close();
  }
});

test('CORS: only configured origins get through from a browser', async () => {
  await seedUsers();
  const app = createApp();
  const server = await listen(app);
  const base = `http://localhost:${server.address().port}`;
  try {
    const evil = await fetch(`${base}/api/products`, { headers: { Origin: 'https://evil.example.com' } });
    assert.equal(evil.status, 403);
    const dev = await fetch(`${base}/api/products`, { headers: { Origin: 'http://localhost:5173' } });
    assert.notEqual(dev.status, 403);
    assert.ok((dev.headers.get('access-control-allow-origin') || '').includes('localhost'));
  } finally {
    server.close();
  }
});

test('Auth: GET /api/auth/me returns user + business prefs', async () => {
  await seedUsers();
  const app = createApp();
  const server = await listen(app);
  const base = `http://localhost:${server.address().port}`;
  try {
    const owner = await login(base, 'owner@test.local');
    const me = await api(base, '/api/auth/me', { headers: authHeader(owner.body.token) });
    assert.equal(me.status, 200);
    assert.equal(me.body.user.email, 'owner@test.local');
    assert.equal(me.body.business.currency, 'NGN');

    const anon = await api(base, '/api/auth/me');
    assert.equal(anon.status, 401);
  } finally {
    server.close();
  }
});
