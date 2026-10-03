import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { resetStore, store } from '../src/store.js';

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

async function api(base, path, opts = {}) {
  const res = await fetch(`${base}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

test('Auth: register with password + JWT login + wrong password rejected', async () => {
  resetStore();
  const app = createApp();
  const server = await listen(app);
  const base = `http://localhost:${server.address().port}`;
  try {
    const demo = await api(base, '/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'owner@demo.test' }) });
    assert.equal(demo.status, 200);
    const H = { Authorization: `Bearer ${demo.body.token}` };

    const reg = await api(base, '/api/auth/register', {
      method: 'POST', headers: H,
      body: JSON.stringify({ name: 'New Staff', email: 'new@demo.test', password: 'secret123', role: 'staff' }),
    });
    assert.equal(reg.status, 201);
    assert.ok(!reg.body.user.password_hash);

    const jwtLogin = await api(base, '/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'new@demo.test', password: 'secret123' }) });
    assert.equal(jwtLogin.status, 200);
    assert.ok(jwtLogin.body.token.split('.').length === 3);

    const bad = await api(base, '/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'new@demo.test', password: 'wrongpass' }) });
    assert.equal(bad.status, 401);

    // Staff JWT cannot create products
    const denied = await api(base, '/api/products', {
      method: 'POST', headers: { Authorization: `Bearer ${jwtLogin.body.token}` },
      body: JSON.stringify({ name: 'X', price_minor: 100 }),
    });
    assert.equal(denied.status, 403);
    assert.ok(store.users.find((u) => u.email === 'new@demo.test').password_hash);
  } finally {
    server.close();
  }
});
