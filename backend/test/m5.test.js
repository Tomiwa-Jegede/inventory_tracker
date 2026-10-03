import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { resetStore } from '../src/store.js';

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

test('M5 stop: OCR stub never auto-posts + isolation + low-stock alert', async () => {
  resetStore();
  const app = createApp();
  const server = await listen(app);
  const base = `http://localhost:${server.address().port}`;
  try {
    const o1 = await api(base, '/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'owner@demo.test' }) });
    const o2 = await api(base, '/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'owner2@demo.test' }) });
    const H1 = { Authorization: `Bearer ${o1.body.token}` };
    const H2 = { Authorization: `Bearer ${o2.body.token}` };

    const p1 = await api(base, '/api/products', { method: 'POST', headers: H1, body: JSON.stringify({ name: 'Burger', price_minor: 100000 }) });
    const p2 = await api(base, '/api/products', { method: 'POST', headers: H1, body: JSON.stringify({ name: 'Toast', price_minor: 100000 }) });
    assert.equal(p1.status, 201);

    const salesBefore = await api(base, '/api/sales?sale_date=2026-10-02', { headers: H1 });
    const countBefore = salesBefore.body.sales.length;

    const ocr = await api(base, '/api/ocr/suggest', { method: 'POST', headers: H1, body: JSON.stringify({ receipt_photo_url: '/uploads/x.jpg' }) });
    assert.equal(ocr.status, 200);
    assert.ok(ocr.body.note.includes('Never auto-posts'));
    // Same-price ambiguity surfaced
    const toastSug = ocr.body.suggestions.find((s) => s.name === 'Toast');
    assert.ok(toastSug.ambiguous_with.includes('Burger'));

    const salesAfter = await api(base, '/api/sales?sale_date=2026-10-02', { headers: H1 });
    assert.equal(salesAfter.body.sales.length, countBefore);

    // Isolation: second business sees zero of first business data
    const otherProducts = await api(base, '/api/products', { headers: H2 });
    assert.deepEqual(otherProducts.body, []);
    const otherSales = await api(base, '/api/sales?sale_date=2026-10-02', { headers: H2 });
    assert.deepEqual(otherSales.body.sales, []);

    // Low-stock alert
    const ing = await api(base, '/api/ingredients', { method: 'POST', headers: H1, body: JSON.stringify({ name: 'Bun', unit: 'piece', low_stock_level: 5 }) });
    const alerts = await api(base, '/api/alerts', { headers: H1 });
    assert.ok(alerts.body.lowStock.some((l) => l.name === 'Bun'));
    void p2;
  } finally {
    server.close();
  }
});
