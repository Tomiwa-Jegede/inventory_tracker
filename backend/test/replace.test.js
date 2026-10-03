import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { login, listen, api, seedUsers, authHeader } from './helpers.js';

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32, 0),
]);

async function upload(base, token, buffer = PNG) {
  const form = new FormData();
  form.append('receipt', new Blob([buffer], { type: 'image/png' }), 'r.png');
  const res = await fetch(`${base}/api/receipts/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

test('Replace: backfill supersedes quick total; close shows one truthful number', async () => {
  await seedUsers();
  const app = createApp();
  const server = await listen(app);
  const base = `http://localhost:${server.address().port}`;
  try {
    const owner = await login(base, 'owner@test.local');
    const H = authHeader(owner.body.token);
    const D = '2026-10-02';

    const prod = await api(base, '/api/products', { method: 'POST', headers: H, body: JSON.stringify({ name: 'Burger', price_minor: 100000 }) });
    assert.equal(prod.status, 201);

    const quick = await api(base, '/api/sales/day-total', { method: 'POST', headers: H, body: JSON.stringify({ sale_date: D, total_minor: 45000 }) });
    assert.equal(quick.status, 201);

    const sale = await api(base, '/api/sales', { method: 'POST', headers: H, body: JSON.stringify({ product_id: prod.body.id, sale_date: D, qty: 1 }) });
    assert.equal(sale.status, 201);
    assert.deepEqual(sale.body.superseded_quick_totals, [{ id: quick.body.id, total_minor: 45000 }]);

    const daily = await api(base, `/api/reports/daily?sale_date=${D}`, { headers: H });
    assert.equal(daily.body.total_minor, 100000);
    assert.equal(daily.body.quickTotal_minor, 0);
    assert.equal(daily.body.hasQuickTotal, false);
    assert.deepEqual(daily.body.supersededTotals, [{ id: quick.body.id, total_minor: 45000 }]);

    // Second backfill same day: nothing left to supersede.
    const sale2 = await api(base, '/api/sales', { method: 'POST', headers: H, body: JSON.stringify({ product_id: prod.body.id, sale_date: D, qty: 1 }) });
    assert.equal(sale2.status, 201);
    assert.equal(sale2.body.superseded_quick_totals, undefined);

    const audit = await api(base, '/api/audit', { headers: H });
    assert.ok(audit.body.some((a) => a.action === 'day_total.superseded' && a.reason === 'backfill replaces quick total'));
  } finally {
    server.close();
  }
});

test('Delete-on-entry: receipt consumed by sale save; discard path works', async () => {
  await seedUsers();
  const app = createApp();
  const server = await listen(app);
  const base = `http://localhost:${server.address().port}`;
  try {
    const owner = await login(base, 'owner@test.local');
    const H = authHeader(owner.body.token);

    const prod = await api(base, '/api/products', { method: 'POST', headers: H, body: JSON.stringify({ name: 'Fries', price_minor: 50000 }) });
    const up = await upload(base, owner.body.token);
    assert.equal(up.status, 201);

    const sale = await api(base, '/api/sales', {
      method: 'POST', headers: H,
      body: JSON.stringify({ product_id: prod.body.id, sale_date: '2026-10-03', qty: 1, receipt_id: up.body.id }),
    });
    assert.equal(sale.status, 201);
    assert.equal(sale.body.receipt_consumed, up.body.id);
    assert.equal(sale.body.receipt_key, null);

    const gone = await api(base, `/api/receipts/${up.body.id}/url`, { headers: H });
    assert.equal(gone.status, 404);

    const up2 = await upload(base, owner.body.token);
    const del = await api(base, `/api/receipts/${up2.body.id}`, { method: 'DELETE', headers: H });
    assert.equal(del.status, 200);
    const gone2 = await api(base, `/api/receipts/${up2.body.id}/url`, { headers: H });
    assert.equal(gone2.status, 404);
  } finally {
    server.close();
  }
});
