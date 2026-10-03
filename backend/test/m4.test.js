import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { backfillAllBusinesses } from '../src/db/repo.js';
import { login, listen, api, seedUsers, authHeader } from './helpers.js';

test('M4: every-3-days projection + trends sum + edit with audit + reason-coded refund', async () => {
  await seedUsers();
  await backfillAllBusinesses();
  const app = createApp();
  const server = await listen(app);
  const base = `http://localhost:${server.address().port}`;
  try {
    const ownerLogin = await login(base, 'owner@test.local');
    const H = authHeader(ownerLogin.body.token);

    const charcoal = await api(base, '/api/recurring', {
      method: 'POST', headers: H,
      body: JSON.stringify({ name: 'Charcoal', amount_minor: 300000, interval_days: 3, next_due_date: '2026-01-30' }),
    });
    assert.equal(charcoal.status, 201);
    const up = await api(base, '/api/recurring/upcoming?from=2026-01-30&count=5', { headers: H });
    const dates = up.body.map((o) => o.due_date);
    assert.deepEqual(dates, ['2026-01-30', '2026-02-02', '2026-02-05', '2026-02-08', '2026-02-11']);

    const prod = await api(base, '/api/products', { method: 'POST', headers: H, body: JSON.stringify({ name: 'Burger', price_minor: 100000 }) });
    const s1 = await api(base, '/api/sales', { method: 'POST', headers: H, body: JSON.stringify({ product_id: prod.body.id, sale_date: '2026-10-06', qty: 2 }) });
    await api(base, '/api/sales', { method: 'POST', headers: H, body: JSON.stringify({ product_id: prod.body.id, sale_date: '2026-10-07', qty: 1 }) });

    // Edit last Tuesday with a listed reason
    const edit = await api(base, `/api/sales/${s1.body.id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ qty: 3, reason: 'Miscounted' }) });
    assert.equal(edit.status, 200);
    assert.equal(edit.body.qty, 3);
    const noReason = await api(base, `/api/sales/${s1.body.id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ qty: 4 }) });
    assert.equal(noReason.status, 400);
    const badSaleReason = await api(base, `/api/sales/${s1.body.id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ qty: 4, reason: 'missed one' }) });
    assert.equal(badSaleReason.status, 400);

    const audit = await api(base, '/api/audit', { headers: H });
    assert.ok(audit.body.some((a) => a.action === 'sale.edit' && a.reason === 'Miscounted'));

    // Refund with reason explains difference
    const refund = await api(base, '/api/adjustments', { method: 'POST', headers: H, body: JSON.stringify({ type: 'refund', sale_date: '2026-10-07', amount_minor: 50000, reason: 'refund' }) });
    assert.equal(refund.status, 201);
    const badReason = await api(base, '/api/adjustments', { method: 'POST', headers: H, body: JSON.stringify({ sale_date: '2026-10-07', amount_minor: 1, reason: 'nope' }) });
    assert.equal(badReason.status, 400);

    const trends = await api(base, '/api/reports/trends?from=2026-10-06&to=2026-10-08', { headers: H });
    assert.equal(trends.body.days.length, 3);
    assert.equal(trends.body.days[2].status, 'missing');
    const sum = trends.body.days.reduce((s, d) => s + d.total_minor, 0);
    assert.equal(trends.body.totals.total_minor, sum);
  } finally {
    server.close();
  }
});
