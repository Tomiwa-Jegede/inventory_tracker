import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { login, listen, api, seedUsers, authHeader } from './helpers.js';

test('M1: owner setup + staff blocked + sales + daily total', async () => {
  await seedUsers();
  const app = createApp();
  const server = await listen(app);
  const base = `http://localhost:${server.address().port}`;
  try {
    const ownerLogin = await login(base, 'owner@test.local');
    assert.equal(ownerLogin.status, 200);
    const staffLogin = await login(base, 'staff@test.local');
    assert.equal(staffLogin.status, 200);
    const ownerH = authHeader(ownerLogin.body.token);
    const staffH = authHeader(staffLogin.body.token);

    const burger = await api(base, '/api/products', {
      method: 'POST', headers: ownerH,
      body: JSON.stringify({ name: 'Burger', category: 'Food', price_minor: 250000 }),
    });
    assert.equal(burger.status, 201);

    const staffCreate = await api(base, '/api/products', {
      method: 'POST', headers: staffH,
      body: JSON.stringify({ name: 'Nope', price_minor: 100 }),
    });
    assert.equal(staffCreate.status, 403);

    const sale = await api(base, '/api/sales', {
      method: 'POST', headers: staffH,
      body: JSON.stringify({ product_id: burger.body.id, sale_date: '2026-10-02', qty: 2 }),
    });
    assert.equal(sale.status, 201);
    assert.equal(sale.body.total_minor, 500000);
    assert.equal(sale.body.price_minor, 250000);

    await api(base, `/api/products/${burger.body.id}`, {
      method: 'PATCH', headers: ownerH, body: JSON.stringify({ price_minor: 300000 }),
    });
    const list = await api(base, '/api/sales?sale_date=2026-10-02', { headers: ownerH });
    assert.equal(list.body.sales[0].price_minor, 250000);

    const daily = await api(base, '/api/reports/daily?sale_date=2026-10-02', { headers: ownerH });
    assert.equal(daily.body.total_minor, 500000);

    const quick = await api(base, '/api/sales/day-total', {
      method: 'POST', headers: staffH,
      body: JSON.stringify({ sale_date: '2026-10-02', total_minor: 10000 }),
    });
    assert.equal(quick.status, 201);
    const daily2 = await api(base, '/api/reports/daily?sale_date=2026-10-02', { headers: ownerH });
    assert.equal(daily2.body.total_minor, 510000);
  } finally {
    server.close();
  }
});

test('M2: purchases + recipe + stock deduct + per-product profit + service no-recipe', async () => {
  await seedUsers();
  const app = createApp();
  const server = await listen(app);
  const base = `http://localhost:${server.address().port}`;
  try {
    const ownerLogin = await login(base, 'owner@test.local');
    const H = authHeader(ownerLogin.body.token);

    const bun = await api(base, '/api/ingredients', { method: 'POST', headers: H, body: JSON.stringify({ name: 'Bun', unit: 'piece' }) });
    const patty = await api(base, '/api/ingredients', { method: 'POST', headers: H, body: JSON.stringify({ name: 'Patty', unit: 'piece' }) });
    assert.equal(bun.status, 201);

    const pb = await api(base, '/api/purchases', { method: 'POST', headers: H, body: JSON.stringify({ ingredient_id: bun.body.id, qty: 10, total_minor: 5000, purchase_date: '2026-10-01', supplier: 'Bakery' }) });
    assert.equal(pb.body.cost_per_unit_minor, 500);
    const pp = await api(base, '/api/purchases', { method: 'POST', headers: H, body: JSON.stringify({ ingredient_id: patty.body.id, qty: 10, total_minor: 15000, purchase_date: '2026-10-01' }) });
    assert.equal(pp.body.cost_per_unit_minor, 1500);

    const burger = await api(base, '/api/products', { method: 'POST', headers: H, body: JSON.stringify({ name: 'Burger', price_minor: 250000 }) });
    await api(base, '/api/recipes', { method: 'POST', headers: H, body: JSON.stringify({ product_id: burger.body.id, ingredient_id: bun.body.id, qty_per_sale: 1 }) });
    await api(base, '/api/recipes', { method: 'POST', headers: H, body: JSON.stringify({ product_id: burger.body.id, ingredient_id: patty.body.id, qty_per_sale: 1 }) });

    const haircut = await api(base, '/api/products', { method: 'POST', headers: H, body: JSON.stringify({ name: 'Haircut', price_minor: 500000 }) });

    for (let i = 0; i < 5; i++) {
      await api(base, '/api/sales', { method: 'POST', headers: H, body: JSON.stringify({ product_id: burger.body.id, sale_date: '2026-10-02', qty: 1 }) });
    }
    await api(base, '/api/sales', { method: 'POST', headers: H, body: JSON.stringify({ product_id: haircut.body.id, sale_date: '2026-10-02', qty: 1 }) });

    const stock = await api(base, '/api/reports/stock', { headers: H });
    const bunLeft = stock.body.find((s) => s.id === bun.body.id);
    assert.equal(bunLeft.stock_qty, 5);

    const daily = await api(base, '/api/reports/daily?sale_date=2026-10-02', { headers: H });
    // 5 burgers: sales 1250000, material 5*(500+1500)=10000, profit 1240000; haircut profit 500000; gross 1740000
    assert.equal(daily.body.gross_minor, 1740000);
    const bLine = daily.body.breakdown.find((b) => b.product_id === burger.body.id);
    assert.equal(bLine.profit_minor, 1240000);

    // Mid-week price change does not rewrite old sale cost
    await api(base, '/api/purchases', { method: 'POST', headers: H, body: JSON.stringify({ ingredient_id: bun.body.id, qty: 10, total_minor: 10000, purchase_date: '2026-10-03' }) });
    const dailyAgain = await api(base, '/api/reports/daily?sale_date=2026-10-02', { headers: H });
    assert.equal(dailyAgain.body.gross_minor, 1740000);
  } finally {
    server.close();
  }
});
