import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { backfillAllBusinesses } from '../src/db/repo.js';
import { login, listen, api, seedUsers, authHeader } from './helpers.js';

test('Options: backfill + learn + duplicates + staff 403 + rename propagation + edit-reason enforcement', async () => {
  await seedUsers();
  await backfillAllBusinesses();
  const app = createApp();
  const server = await listen(app);
  const base = `http://localhost:${server.address().port}`;
  try {
    const owner = authHeader((await login(base, 'owner@test.local')).body.token);
    const staff = authHeader((await login(base, 'staff@test.local')).body.token);

    // Seeded defaults land on day one
    const units = await api(base, '/api/options?kind=unit', { headers: owner });
    assert.equal(units.status, 200);
    assert.ok(units.body.some((o) => o.value === 'kg'));
    const reasons = await api(base, '/api/options?kind=edit_reason', { headers: owner });
    assert.ok(reasons.body.some((o) => o.value === 'Miscounted'));

    // Bad kind rejected
    assert.equal((await api(base, '/api/options?kind=nope', { headers: owner })).status, 400);

    // Auto-learn: product category appears without an explicit POST
    await api(base, '/api/products', { method: 'POST', headers: owner, body: JSON.stringify({ name: 'Burger', category: 'Food', price_minor: 1000 }) });
    const cats = await api(base, '/api/options?kind=category', { headers: owner });
    assert.ok(cats.body.some((o) => o.value === 'Food'));

    // Case-insensitive duplicate returns the existing row, no second row
    const dup = await api(base, '/api/options', { method: 'POST', headers: owner, body: JSON.stringify({ kind: 'category', value: ' food ' }) });
    assert.equal(dup.status, 201);
    assert.equal(dup.body.value, 'Food');
    const cats2 = await api(base, '/api/options?kind=category', { headers: owner });
    assert.equal(cats2.body.filter((o) => o.value.toLowerCase() === 'food').length, 1);

    // Staff can read but not add/rename
    assert.equal((await api(base, '/api/options?kind=unit', { headers: staff })).status, 200);
    assert.equal((await api(base, '/api/options', { method: 'POST', headers: staff, body: JSON.stringify({ kind: 'unit', value: 'sneaky' }) })).status, 403);
    assert.equal((await api(base, `/api/options/${dup.body.id}`, { method: 'PATCH', headers: staff, body: JSON.stringify({ value: 'Sneaky' }) })).status, 403);

    // Rename propagates to the TEXT column so reports stay grouped
    const renamed = await api(base, `/api/options/${dup.body.id}`, { method: 'PATCH', headers: owner, body: JSON.stringify({ value: 'Meals' }) });
    assert.equal(renamed.status, 200);
    const prods = await api(base, '/api/products?include_archived=1', { headers: owner });
    assert.ok(prods.body.some((p) => p.category === 'Meals'));
    assert.ok(!(await api(base, '/api/options?kind=category', { headers: owner })).body.some((o) => o.value === 'Food'));

    // Archive hides from dropdowns
    const kg = units.body.find((o) => o.value === 'kg');
    assert.equal((await api(base, `/api/options/${kg.id}`, { method: 'PATCH', headers: owner, body: JSON.stringify({ archived: true }) })).status, 200);
    assert.ok(!(await api(base, '/api/options?kind=unit', { headers: owner })).body.some((o) => o.value === 'kg'));

    // Sale edits: listed reason works, unlisted fails, Other needs a note
    const prod = await api(base, '/api/products', { method: 'POST', headers: owner, body: JSON.stringify({ name: 'Fries', price_minor: 500 }) });
    const sale = await api(base, '/api/sales', { method: 'POST', headers: owner, body: JSON.stringify({ product_id: prod.body.id, sale_date: '2026-10-03', qty: 2 }) });
    assert.equal((await api(base, `/api/sales/${sale.body.id}`, { method: 'PATCH', headers: owner, body: JSON.stringify({ qty: 1, reason: 'nope' }) })).status, 400);
    assert.equal((await api(base, `/api/sales/${sale.body.id}`, { method: 'PATCH', headers: owner, body: JSON.stringify({ qty: 1, reason: 'Other' }) })).status, 400);
    const other = await api(base, `/api/sales/${sale.body.id}`, { method: 'PATCH', headers: owner, body: JSON.stringify({ qty: 1, reason: 'Other', note: 'customer swapped item' }) });
    assert.equal(other.status, 200);
    const audit = await api(base, '/api/audit', { headers: owner });
    assert.ok(audit.body.some((a) => a.action === 'sale.edit' && a.reason === 'Other' && a.note === 'customer swapped item'));
  } finally {
    server.close();
  }
});
