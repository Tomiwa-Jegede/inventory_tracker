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

test('M3: weekly/monthly set-aside, February, mid-cycle change forward-only, slow-day shortfall', async () => {
  resetStore();
  const app = createApp();
  const server = await listen(app);
  const base = `http://localhost:${server.address().port}`;
  try {
    const login = await api(base, '/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'owner@demo.test' }) });
    const H = { Authorization: `Bearer ${login.body.token}` };

    const freezer = await api(base, '/api/overheads', {
      method: 'POST', headers: H,
      body: JSON.stringify({ name: 'Freezer', amount_minor: 700000, frequency: 'weekly', next_due_date: '2026-10-09' }),
    });
    assert.equal(freezer.status, 201);

    const rent = await api(base, '/api/overheads', {
      method: 'POST', headers: H,
      body: JSON.stringify({ name: 'Rent', amount_minor: 3000000, frequency: 'monthly', next_due_date: '2026-11-01' }),
    });
    assert.equal(rent.status, 201);

    // Weekly 700000 / 7 = 100000/day
    const oct2 = await api(base, '/api/reports/daily?sale_date=2026-10-02', { headers: H });
    const fzLine = oct2.body.setAsideLines.find((l) => l.name === 'Freezer');
    assert.equal(fzLine.daily_minor, 100000);
    // October has 31 days: 3000000/31 = 96774
    const rentOct = oct2.body.setAsideLines.find((l) => l.name === 'Rent');
    assert.equal(rentOct.daily_minor, Math.round(3000000 / 31));

    // February 2026 has 28 days: need a February-dated check via direct math
    const feb = await api(base, '/api/reports/daily?sale_date=2026-02-15', { headers: H });
    const rentFeb = feb.body.setAsideLines.find((l) => l.name === 'Rent');
    assert.equal(rentFeb.daily_minor, Math.round(3000000 / 28));

    // Rent increase mid-cycle: forward only — past day unchanged
    const before = (await api(base, '/api/reports/daily?sale_date=2026-10-02', { headers: H })).body.setAside_minor;
    await api(base, `/api/overheads/${rent.body.id}`, {
      method: 'PATCH', headers: H, body: JSON.stringify({ amount_minor: 3600000, reason: 'rent increase' }),
    });
    // NOTE: in-memory history uses today as from_date; past date 2026-10-02 keeps old rule
    const afterPast = (await api(base, '/api/reports/daily?sale_date=2026-10-02', { headers: H })).body.setAside_minor;
    assert.equal(afterPast, before);

    // Slow day: no sales, set-aside still accrues → negative net + shortfall
    const slow = await api(base, '/api/reports/daily?sale_date=2026-10-03', { headers: H });
    assert.ok(slow.body.setAside_minor > 0);
    assert.equal(slow.body.gross_minor, 0);
    assert.ok(slow.body.net_minor < 0);
    assert.ok(slow.body.shortfall_minor > 0);
  } finally {
    server.close();
  }
});
