// Repository: identical async API over memory store (dev/pilot) and Postgres (prod).
// Routes must use this file — never touch store arrays or pg directly.
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import config from '../config.js';
import { store, audit as memAudit } from '../store.js';
import { query, dbMode } from './pool.js';

export const usePg = () => dbMode() === 'pg';

// ---------- businesses ----------
export async function createBusiness({ name, currency, timezone }) {
  const row = {
    name,
    currency: currency || config.defaultCurrency,
    timezone: timezone || config.defaultTimezone,
  };
  if (!usePg()) {
    const b = { id: `b-${randomUUID().slice(0, 8)}`, created_at: new Date().toISOString(), ...row };
    store.businesses.push(b);
    await ensureOptionDefaults(b.id);
    return b;
  }
  const r = await query(`INSERT INTO businesses (name, currency, timezone) VALUES ($1,$2,$3) RETURNING *`, [row.name, row.currency, row.timezone]);
  await ensureOptionDefaults(r.rows[0].id);
  return r.rows[0];
}

export async function findBusinessById(id) {
  if (!usePg()) return store.businesses.find((b) => String(b.id) === String(id)) || null;
  const r = await query(`SELECT * FROM businesses WHERE id=$1`, [id]);
  return r.rows[0] || null;
}

export async function countUsers() {
  if (!usePg()) return store.users.length;
  const r = await query(`SELECT COUNT(*)::int AS n FROM users`);
  return Number(r.rows[0].n);
}

// One-time bootstrap: on an empty database with BOOTSTRAP_* env set, create
// the first business + owner (with a real password hash). Remove the
// BOOTSTRAP_OWNER_PASSWORD variable after first login.
export async function ensureBootstrap() {
  if ((await countUsers()) > 0) return null;
  const { businessName, ownerName, ownerEmail, ownerPassword } = config.bootstrap;
  if (!businessName || !ownerName || !ownerEmail || !ownerPassword) {
    console.log('No users exist and BOOTSTRAP_* is not fully set — skipping bootstrap. Set BOOTSTRAP_BUSINESS_NAME/_OWNER_NAME/_OWNER_EMAIL/_OWNER_PASSWORD to create the first owner.');
    return null;
  }
  if (ownerPassword.length < 8) throw new Error('BOOTSTRAP_OWNER_PASSWORD must be 8+ chars.');
  const business = await createBusiness({ name: businessName });
  const password_hash = await bcrypt.hash(ownerPassword, 10);
  const owner = await createUser({ business_id: business.id, name: ownerName, email: ownerEmail, role: 'owner', password_hash });
  console.log(`Bootstrapped business "${business.name}" with owner ${owner.email}. Remove BOOTSTRAP_OWNER_PASSWORD from env now.`);
  return { business, owner };
}

// ---------- demo seed (DEV/STAGING ONLY — gated by SEED_DEMO=true) ----------
// This is the single intentional exception to the "no demo data in source"
// rule: it only runs when explicitly enabled, and production refuses to boot
// with SEED_DEMO=true (see src/config.js).
export const PG_SEED = {
  business1: '11111111-1111-1111-1111-111111111111',
  business2: '22222222-2222-2222-2222-222222222222',
  owner1: 'a0000000-0000-4000-8000-000000000001',
  staff1: 'a0000000-0000-4000-8000-000000000002',
  owner2: 'a0000000-0000-4000-8000-000000000003',
};

const DEMO_BUSINESSES = [
  { pgId: PG_SEED.business1, memId: 'seed-demo-business', name: 'Demo Food Business' },
  { pgId: PG_SEED.business2, memId: 'seed-second-business', name: 'Second Shop (isolation test)' },
];
const DEMO_USERS = [
  { pgId: PG_SEED.owner1, biz: 0, name: 'Owner', email: 'owner@demo.test', role: 'owner' },
  { pgId: PG_SEED.staff1, biz: 0, name: 'Staff', email: 'staff@demo.test', role: 'staff' },
  { pgId: PG_SEED.owner2, biz: 1, name: 'Owner 2', email: 'owner2@demo.test', role: 'owner' },
];

export async function seedDemo() {
  if (!config.seedDemo) return;
  const password_hash = await bcrypt.hash(config.seedDemoPassword, 10);
  if (!usePg()) {
    for (const b of DEMO_BUSINESSES) {
      if (!store.businesses.find((x) => x.id === b.memId)) {
        store.businesses.push({ id: b.memId, name: b.name, currency: config.defaultCurrency, timezone: config.defaultTimezone });
      }
    }
    for (const u of DEMO_USERS) {
      if (!store.users.find((x) => x.email === u.email)) {
        store.users.push({ id: `seed-${u.email}`, business_id: DEMO_BUSINESSES[u.biz].memId, name: u.name, email: u.email, role: u.role, password_hash });
      }
    }
    console.log('Demo seed ensured (memory mode).');
    return;
  }
  for (const b of DEMO_BUSINESSES) {
    await query(`INSERT INTO businesses (id, name, currency, timezone) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING`, [b.pgId, b.name, config.defaultCurrency, config.defaultTimezone]);
  }
  for (const u of DEMO_USERS) {
    await query(
      `INSERT INTO users (id, business_id, name, email, role, password_hash) VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET password_hash=EXCLUDED.password_hash`,
      [u.pgId, DEMO_BUSINESSES[u.biz].pgId, u.name, u.email, u.role, password_hash]
    );
  }
  console.log('Demo seed ensured (pg mode).');
}

// ---------- users ----------
export async function findUserByEmail(email) {
  if (!usePg()) return store.users.find((u) => u.email === email) || null;
  const r = await query(`SELECT * FROM users WHERE email=$1`, [email]);
  return r.rows[0] || null;
}

export async function findUserById(id) {
  if (!usePg()) return store.users.find((u) => u.id === id) || null;
  const r = await query(`SELECT * FROM users WHERE id=$1`, [id]);
  return r.rows[0] || null;
}

export async function createUser({ business_id, name, email, role, password_hash }) {
  if (!usePg()) {
    const user = { id: `u-${Date.now()}`, business_id, name, email, role, ...(password_hash ? { password_hash } : {}) };
    store.users.push(user);
    return user;
  }
  const r = await query(
    `INSERT INTO users (business_id, name, email, role, password_hash) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [business_id, name, email, role, password_hash || null]
  );
  return r.rows[0];
}

// ---------- products ----------
export async function listProducts(business_id, includeArchived) {
  if (!usePg()) {
    return store.products.filter((p) => p.business_id === business_id && (includeArchived || p.is_active !== false));
  }
  const r = await query(
    includeArchived
      ? `SELECT * FROM products WHERE business_id=$1 ORDER BY created_at`
      : `SELECT * FROM products WHERE business_id=$1 AND is_active<>false ORDER BY created_at`,
    [business_id]
  );
  return r.rows;
}

export async function createProduct({ business_id, name, category, price_minor, tracks_stock }) {
  if (!usePg()) {
    const p = { id: `p-${Date.now()}`, business_id, name, category: category || 'General', price_minor, tracks_stock: tracks_stock !== false, is_active: true, created_at: new Date().toISOString() };
    store.products.push(p);
    await upsertOption(business_id, 'category', p.category);
    return p;
  }
  const r = await query(
    `INSERT INTO products (business_id, name, category, price_minor, tracks_stock) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [business_id, name, category || 'General', price_minor, tracks_stock !== false]
  );
  await upsertOption(business_id, 'category', r.rows[0].category);
  return r.rows[0];
}

export async function findProduct(id, business_id) {
  if (!usePg()) return store.products.find((p) => p.id === id && p.business_id === business_id) || null;
  const r = await query(`SELECT * FROM products WHERE id=$1 AND business_id=$2`, [id, business_id]);
  return r.rows[0] || null;
}

export async function updateProduct(id, business_id, patch) {
  if (!usePg()) {
    const p = store.products.find((x) => x.id === id && x.business_id === business_id);
    if (!p) return null;
    Object.assign(p, patch);
    return p;
  }
  const keys = Object.keys(patch);
  if (!keys.length) return findProduct(id, business_id);
  const sets = keys.map((k, i) => `${k}=$${i + 3}`).join(', ');
  const r = await query(`UPDATE products SET ${sets} WHERE id=$1 AND business_id=$2 RETURNING *`, [id, business_id, ...keys.map((k) => patch[k])]);
  return r.rows[0] || null;
}

// ---------- sales ----------
export async function createSale(s) {
  if (!usePg()) {
    const sale = { id: `s-${Date.now()}-${Math.floor(Math.random() * 1000)}`, created_at: new Date().toISOString(), ...s };
    store.sales.push(sale);
    return sale;
  }
  const r = await query(
    `INSERT INTO sales (business_id, product_id, sale_date, qty, price_minor, total_minor, material_cost_minor, profit_minor, receipt_photo_url, receipt_key, entered_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [s.business_id, s.product_id, s.sale_date, s.qty, s.price_minor, s.total_minor, s.material_cost_minor || 0, s.profit_minor ?? (s.total_minor - (s.material_cost_minor || 0)), s.receipt_photo_url || null, s.receipt_key || null, s.entered_by || null]
  );
  return r.rows[0];
}

export async function listSales(business_id, sale_date) {
  if (!usePg()) {
    return store.sales.filter((s) => s.business_id === business_id && (!sale_date || s.sale_date === sale_date));
  }
  const r = sale_date
    ? await query(`SELECT * FROM sales WHERE business_id=$1 AND sale_date=$2 ORDER BY created_at`, [business_id, sale_date])
    : await query(`SELECT * FROM sales WHERE business_id=$1 ORDER BY created_at`, [business_id]);
  return r.rows;
}

export async function findSale(id, business_id) {
  if (!usePg()) return store.sales.find((s) => s.id === id && s.business_id === business_id) || null;
  const r = await query(`SELECT * FROM sales WHERE id=$1 AND business_id=$2`, [id, business_id]);
  return r.rows[0] || null;
}

export async function updateSale(id, business_id, patch) {
  if (!usePg()) {
    const s = store.sales.find((x) => x.id === id && x.business_id === business_id);
    if (!s) return null;
    Object.assign(s, patch);
    return s;
  }
  const keys = Object.keys(patch);
  const sets = keys.map((k, i) => `${k}=$${i + 3}`).join(', ');
  const r = await query(`UPDATE sales SET ${sets} WHERE id=$1 AND business_id=$2 RETURNING *`, [id, business_id, ...keys.map((k) => patch[k])]);
  return r.rows[0] || null;
}

// ---------- day totals ----------
export async function createDayTotal({ business_id, sale_date, total_minor, note, entered_by }) {
  if (!usePg()) {
    const e = { id: `t-${Date.now()}`, business_id, sale_date, total_minor, note: note || null, entered_by, created_at: new Date().toISOString() };
    store.dayTotals.push(e);
    return e;
  }
  const r = await query(
    `INSERT INTO day_totals (business_id, sale_date, total_minor, note, entered_by) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [business_id, sale_date, total_minor, note || null, entered_by || null]
  );
  return r.rows[0];
}

export async function listDayTotals(business_id, sale_date) {
  if (!usePg()) {
    return store.dayTotals.filter((t) => t.business_id === business_id && (!sale_date || t.sale_date === sale_date)).map((t) => ({ superseded: false, ...t }));
  }
  const r = sale_date
    ? await query(`SELECT *, COALESCE(superseded, false) AS superseded FROM day_totals WHERE business_id=$1 AND sale_date=$2`, [business_id, sale_date])
    : await query(`SELECT *, COALESCE(superseded, false) AS superseded FROM day_totals WHERE business_id=$1`, [business_id]);
  return r.rows;
}

// Replace rule (owner decision 2026-10-03): morning-after breakdown supersedes
// the quick total. Marks all active quick totals for the date superseded and
// returns them; closes exclude superseded rows but still list them.
export async function supersedeDayTotals(business_id, sale_date) {
  if (!usePg()) {
    const rows = store.dayTotals.filter((t) => t.business_id === business_id && t.sale_date === sale_date && !t.superseded);
    for (const t of rows) t.superseded = true;
    return rows;
  }
  const r = await query(`UPDATE day_totals SET superseded=true WHERE business_id=$1 AND sale_date=$2 AND COALESCE(superseded, false)=false RETURNING *`, [business_id, sale_date]);
  return r.rows;
}

// ---------- ingredients ----------
export async function listIngredients(business_id) {
  if (!usePg()) return store.ingredients.filter((i) => i.business_id === business_id);
  const r = await query(`SELECT * FROM ingredients WHERE business_id=$1 ORDER BY created_at`, [business_id]);
  return r.rows.map((x) => ({ ...x, stock_qty: Number(x.stock_qty), low_stock_level: Number(x.low_stock_level) }));
}

export async function createIngredient({ business_id, name, unit, low_stock_level }) {
  if (!usePg()) {
    const ing = { id: `g-${Date.now()}`, business_id, name, unit: unit || 'piece', stock_qty: 0, low_stock_level: Number(low_stock_level) || 0, created_at: new Date().toISOString() };
    store.ingredients.push(ing);
    await upsertOption(business_id, 'unit', ing.unit);
    return ing;
  }
  const r = await query(`INSERT INTO ingredients (business_id, name, unit, low_stock_level) VALUES ($1,$2,$3,$4) RETURNING *`, [business_id, name, unit || 'piece', Number(low_stock_level) || 0]);
  await upsertOption(business_id, 'unit', r.rows[0].unit || unit || 'piece');
  return { ...r.rows[0], stock_qty: Number(r.rows[0].stock_qty) };
}

export async function findIngredient(id, business_id) {
  if (!usePg()) return store.ingredients.find((i) => i.id === id && i.business_id === business_id) || null;
  const r = await query(`SELECT * FROM ingredients WHERE id=$1 AND business_id=$2`, [id, business_id]);
  if (!r.rows[0]) return null;
  return { ...r.rows[0], stock_qty: Number(r.rows[0].stock_qty) };
}

export async function changeStock(id, business_id, delta) {
  if (!usePg()) {
    const ing = store.ingredients.find((i) => i.id === id && i.business_id === business_id);
    if (!ing) return null;
    ing.stock_qty += delta;
    return ing;
  }
  const r = await query(`UPDATE ingredients SET stock_qty = stock_qty + $3 WHERE id=$1 AND business_id=$2 RETURNING *`, [id, business_id, delta]);
  if (!r.rows[0]) return null;
  return { ...r.rows[0], stock_qty: Number(r.rows[0].stock_qty) };
}

// ---------- purchases ----------
export async function listPurchases(business_id) {
  if (!usePg()) return store.purchases.filter((p) => p.business_id === business_id);
  const r = await query(`SELECT * FROM purchases WHERE business_id=$1 ORDER BY purchase_date DESC, created_at DESC`, [business_id]);
  return r.rows.map((x) => ({ ...x, qty: Number(x.qty) }));
}

export async function createPurchase({ business_id, ingredient_id, qty, total_minor, purchase_date, supplier, note, entered_by }) {
  const cost_per_unit_minor = Math.round(total_minor / qty);
  if (!usePg()) {
    const p = { id: `u-${Date.now()}`, business_id, ingredient_id, qty, total_minor, cost_per_unit_minor, purchase_date, supplier: supplier || null, note: note || null, entered_by, created_at: new Date().toISOString() };
    store.purchases.push(p);
    const ing = store.ingredients.find((i) => i.id === ingredient_id);
    if (ing) ing.stock_qty += qty;
    if (p.supplier) await upsertOption(business_id, 'supplier', p.supplier);
    return p;
  }
  const r = await query(
    `INSERT INTO purchases (business_id, ingredient_id, qty, total_minor, cost_per_unit_minor, purchase_date, supplier, note, entered_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [business_id, ingredient_id, qty, total_minor, cost_per_unit_minor, purchase_date, supplier || null, note || null, entered_by || null]
  );
  await query(`UPDATE ingredients SET stock_qty = stock_qty + $1 WHERE id=$2`, [qty, ingredient_id]);
  if (r.rows[0].supplier) await upsertOption(business_id, 'supplier', r.rows[0].supplier);
  return { ...r.rows[0], qty: Number(r.rows[0].qty) };
}

export async function latestCostPerUnit(ingredient_id, business_id) {
  if (!usePg()) {
    const ps = store.purchases.filter((p) => p.ingredient_id === ingredient_id && (!business_id || p.business_id === business_id));
    if (!ps.length) return 0;
    ps.sort((a, b) => (a.purchase_date < b.purchase_date ? 1 : a.purchase_date > b.purchase_date ? -1 : a.created_at < b.created_at ? 1 : -1));
    return ps[0].cost_per_unit_minor || 0;
  }
  const r = await query(`SELECT cost_per_unit_minor FROM purchases WHERE ingredient_id=$1 ORDER BY purchase_date DESC, created_at DESC LIMIT 1`, [ingredient_id]);
  return r.rows[0]?.cost_per_unit_minor || 0;
}

// ---------- recipes ----------
export async function listRecipes(business_id, product_id) {
  if (!usePg()) {
    return store.recipes.filter((r) => r.business_id === business_id && (!product_id || r.product_id === product_id));
  }
  const r = product_id
    ? await query(`SELECT * FROM recipes WHERE business_id=$1 AND product_id=$2`, [business_id, product_id])
    : await query(`SELECT * FROM recipes WHERE business_id=$1`, [business_id]);
  return r.rows.map((x) => ({ ...x, qty_per_sale: Number(x.qty_per_sale) }));
}

export async function upsertRecipe({ business_id, product_id, ingredient_id, qty_per_sale }) {
  if (!usePg()) {
    const ex = store.recipes.find((r) => r.product_id === product_id && r.ingredient_id === ingredient_id);
    if (ex) { ex.qty_per_sale = qty_per_sale; return ex; }
    const line = { id: `r-${Date.now()}`, business_id, product_id, ingredient_id, qty_per_sale };
    store.recipes.push(line);
    return line;
  }
  const r = await query(
    `INSERT INTO recipes (business_id, product_id, ingredient_id, qty_per_sale) VALUES ($1,$2,$3,$4)
     ON CONFLICT (product_id, ingredient_id) DO UPDATE SET qty_per_sale=EXCLUDED.qty_per_sale RETURNING *`,
    [business_id, product_id, ingredient_id, qty_per_sale]
  );
  return { ...r.rows[0], qty_per_sale: Number(r.rows[0].qty_per_sale) };
}

export async function deleteRecipe(id, business_id) {
  if (!usePg()) {
    const idx = store.recipes.findIndex((r) => r.id === id && r.business_id === business_id);
    if (idx < 0) return false;
    store.recipes.splice(idx, 1);
    return true;
  }
  const r = await query(`DELETE FROM recipes WHERE id=$1 AND business_id=$2`, [id, business_id]);
  return r.rowCount > 0;
}

// ---------- overheads ----------
export async function listOverheads(business_id) {
  if (!usePg()) return store.overheads.filter((o) => o.business_id === business_id);
  const r = await query(`SELECT * FROM overheads WHERE business_id=$1 ORDER BY created_at`, [business_id]);
  const out = [];
  for (const o of r.rows) {
    const h = await query(`SELECT amount_minor, frequency, custom_days, from_date::text AS from_date FROM overhead_history WHERE overhead_id=$1 ORDER BY from_date`, [o.id]);
    out.push({ ...o, history: h.rows });
  }
  return out;
}

export async function createOverhead({ business_id, name, amount_minor, frequency, custom_days, next_due_date }) {
  const today = new Date().toISOString().slice(0, 10);
  if (!usePg()) {
    const o = { id: `o-${Date.now()}`, business_id, name, amount_minor, frequency, custom_days: frequency === 'custom' ? Number(custom_days) : null, next_due_date, is_active: true, created_at: new Date().toISOString(), history: [{ amount_minor, frequency, custom_days: frequency === 'custom' ? Number(custom_days) : null, from_date: today }] };
    store.overheads.push(o);
    await upsertOption(business_id, 'overhead_name', name);
    return o;
  }
  const r = await query(`INSERT INTO overheads (business_id, name, amount_minor, frequency, custom_days, next_due_date) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [business_id, name, amount_minor, frequency, frequency === 'custom' ? Number(custom_days) : null, next_due_date]);
  await query(`INSERT INTO overhead_history (overhead_id, amount_minor, frequency, custom_days, from_date) VALUES ($1,$2,$3,$4,$5)`, [r.rows[0].id, amount_minor, frequency, frequency === 'custom' ? Number(custom_days) : null, today]);
  await upsertOption(business_id, 'overhead_name', name);
  return { ...r.rows[0], history: [{ amount_minor, frequency, custom_days: frequency === 'custom' ? Number(custom_days) : null, from_date: today }] };
}

export async function findOverhead(id, business_id) {
  const list = await listOverheads(business_id);
  return list.find((o) => String(o.id) === String(id)) || null;
}

export async function updateOverhead(id, business_id, patch) {
  if (!usePg()) {
    const o = store.overheads.find((x) => x.id === id && x.business_id === business_id);
    if (!o) return null;
    const before = { ...o };
    const today = new Date().toISOString().slice(0, 10);
    let ruleChanged = false;
    for (const k of ['name', 'next_due_date', 'is_active', 'amount_minor', 'frequency', 'custom_days']) {
      if (patch[k] !== undefined) { o[k] = patch[k]; if (['amount_minor', 'frequency', 'custom_days'].includes(k)) ruleChanged = true; }
    }
    if (ruleChanged) o.history.push({ amount_minor: o.amount_minor, frequency: o.frequency, custom_days: o.custom_days, from_date: today });
    return { before, after: { ...o } };
  }
  const o = await findOverhead(id, business_id);
  if (!o) return null;
  const before = { ...o };
  const sets = [];
  const vals = [];
  let i = 3;
  for (const k of ['name', 'amount_minor', 'frequency', 'custom_days', 'next_due_date', 'is_active']) {
    if (patch[k] !== undefined) { sets.push(`${k}=$${i++}`); vals.push(patch[k]); }
  }
  if (sets.length) await query(`UPDATE overheads SET ${sets.join(', ')} WHERE id=$1 AND business_id=$2`, [id, business_id, ...vals]);
  if (patch.amount_minor !== undefined || patch.frequency !== undefined || patch.custom_days !== undefined) {
    const cur = await findOverhead(id, business_id);
    const today = new Date().toISOString().slice(0, 10);
    await query(`INSERT INTO overhead_history (overhead_id, amount_minor, frequency, custom_days, from_date) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (overhead_id, from_date) DO UPDATE SET amount_minor=EXCLUDED.amount_minor, frequency=EXCLUDED.frequency, custom_days=EXCLUDED.custom_days`, [id, cur.amount_minor, cur.frequency, cur.custom_days, today]);
  }
  const after = await findOverhead(id, business_id);
  return { before, after };
}

export async function overheadPaidTotal(overhead_id) {
  if (!usePg()) return store.overheadPayments.filter((p) => p.overhead_id === overhead_id).reduce((s, p) => s + p.amount_minor, 0);
  const r = await query(`SELECT COALESCE(SUM(amount_minor),0)::int AS total FROM overhead_payments WHERE overhead_id=$1`, [overhead_id]);
  return Number(r.rows[0].total);
}

export async function createOverheadPayment({ business_id, overhead_id, amount_minor, paid_date, note, entered_by }) {
  if (!usePg()) {
    const pay = { id: `op-${Date.now()}`, business_id, overhead_id, amount_minor, paid_date, note: note || null, entered_by, created_at: new Date().toISOString() };
    store.overheadPayments.push(pay);
    return pay;
  }
  const r = await query(`INSERT INTO overhead_payments (business_id, overhead_id, amount_minor, paid_date, note, entered_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [business_id, overhead_id, amount_minor, paid_date, note || null, entered_by || null]);
  return r.rows[0];
}

// ---------- recurring ----------
export async function listRecurring(business_id) {
  if (!usePg()) return store.recurringRules.filter((r) => r.business_id === business_id);
  const r = await query(`SELECT * FROM recurring_rules WHERE business_id=$1 ORDER BY next_due_date`, [business_id]);
  return r.rows;
}

export async function createRecurring({ business_id, name, amount_minor, interval_days, next_due_date }) {
  if (!usePg()) {
    const rule = { id: `rr-${Date.now()}`, business_id, name, amount_minor, interval_days, next_due_date, is_active: true };
    store.recurringRules.push(rule);
    await upsertOption(business_id, 'expense_name', name);
    return rule;
  }
  const r = await query(`INSERT INTO recurring_rules (business_id, name, amount_minor, interval_days, next_due_date) VALUES ($1,$2,$3,$4,$5) RETURNING *`, [business_id, name, amount_minor, interval_days, next_due_date]);
  await upsertOption(business_id, 'expense_name', name);
  return r.rows[0];
}

// ---------- adjustments ----------
export async function createAdjustment({ business_id, type, sale_date, amount_minor, reason, note, entered_by }) {
  if (!usePg()) {
    const adj = { id: `adj-${Date.now()}`, business_id, type: type || 'adjustment', sale_date, amount_minor, reason, note: note || null, entered_by, created_at: new Date().toISOString() };
    store.adjustments.push(adj);
    return adj;
  }
  const r = await query(`INSERT INTO adjustments (business_id, type, sale_date, amount_minor, reason, note, entered_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [business_id, type || 'adjustment', sale_date, amount_minor, reason, note || null, entered_by || null]);
  return r.rows[0];
}

export async function listAdjustments(business_id, sale_date) {
  if (!usePg()) return store.adjustments.filter((a) => a.business_id === business_id && (!sale_date || a.sale_date === sale_date));
  const r = sale_date
    ? await query(`SELECT * FROM adjustments WHERE business_id=$1 AND sale_date=$2`, [business_id, sale_date])
    : await query(`SELECT * FROM adjustments WHERE business_id=$1`, [business_id]);
  return r.rows;
}

// ---------- audit ----------
export async function logAudit({ business_id, actor, action, target, before, after, reason, note }) {
  if (!usePg()) {
    memAudit({ business_id, actor, action, target, before, after, reason, note: note || null });
    return;
  }
  await query(`INSERT INTO audit_log (business_id, actor, action, target, before_json, after_json, reason, note) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [business_id, actor || null, action, target || null, before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null, reason || null, note || null]);
}

export async function listAudit(business_id, limit = 100) {
  if (!usePg()) return store.auditLog.filter((a) => a.business_id === business_id).slice(-limit);
  const r = await query(`SELECT id, business_id, actor, action, target, before_json AS "before", after_json AS "after", reason, note, created_at FROM audit_log WHERE business_id=$1 ORDER BY created_at DESC LIMIT $2`, [business_id, limit]);
  return r.rows.reverse();
}

// ---------- receipts ledger (R2 object keys, never full URLs) ----------
export async function createReceipt({ business_id, object_key, mime, size_bytes }) {
  if (!usePg()) {
    const r = { id: `rc-${randomUUID().slice(0, 8)}`, business_id, object_key, mime: mime || null, size_bytes: size_bytes ?? null, created_at: new Date().toISOString() };
    store.receipts.push(r);
    return r;
  }
  const r = await query(
    `INSERT INTO receipts (business_id, object_key, mime, size_bytes) VALUES ($1,$2,$3,$4) RETURNING *`,
    [business_id, object_key, mime || null, size_bytes ?? null]
  );
  return r.rows[0];
}

export async function findReceipt(id, business_id) {
  if (!usePg()) return store.receipts.find((r) => String(r.id) === String(id) && r.business_id === business_id) || null;
  const r = await query(`SELECT * FROM receipts WHERE id=$1 AND business_id=$2`, [id, business_id]);
  return r.rows[0] || null;
}

// Delete-on-entry: remove the ledger row after its object is deleted.
// Returns the deleted row (with object_key) or null if already gone.
export async function deleteReceipt(id, business_id) {
  if (!usePg()) {
    const idx = store.receipts.findIndex((r) => String(r.id) === String(id) && r.business_id === business_id);
    if (idx < 0) return null;
    return store.receipts.splice(idx, 1)[0];
  }
  const r = await query(`DELETE FROM receipts WHERE id=$1 AND business_id=$2 RETURNING *`, [id, business_id]);
  return r.rows[0] || null;
}

// ---------- misc ----------
export async function createStockAdjustment({ business_id, ingredient_id, qty_change, reason, entered_by }) {
  if (!usePg()) {
    const adj = { id: `w-${Date.now()}`, business_id, ingredient_id, qty_change, reason, entered_by, created_at: new Date().toISOString() };
    store.stockAdjustments.push(adj);
    return adj;
  }
  const r = await query(`INSERT INTO stock_adjustments (business_id, ingredient_id, qty_change, reason, entered_by) VALUES ($1,$2,$3,$4,$5) RETURNING *`, [business_id, ingredient_id, qty_change, reason, entered_by || null]);
  return r.rows[0];
}

export async function createOcrAttempt({ business_id, receipt_photo_url, suggestions }) {
  if (!usePg()) {
    const a = { id: `ocr-${Date.now()}`, business_id, receipt_photo_url: receipt_photo_url || null, suggestions, created_at: new Date().toISOString() };
    store.ocrLog.push(a);
    return a;
  }
  const r = await query(`INSERT INTO ocr_log (business_id, receipt_photo_url, suggestions) VALUES ($1,$2,$3) RETURNING *`, [business_id, receipt_photo_url || null, JSON.stringify(suggestions)]);
  return r.rows[0];
}

export function newId(prefix) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

// ---------- lookup options ("don't type" dropdowns) ----------
// Drives pickers; existing TEXT columns stay the source of record.
export const OPTION_KINDS = ['category', 'unit', 'supplier', 'overhead_name', 'expense_name', 'edit_reason'];

// Rename propagation target per kind (TEXT column kept in sync).
const KIND_COLUMNS = {
  category: { table: 'products', column: 'category' },
  unit: { table: 'ingredients', column: 'unit' },
  supplier: { table: 'purchases', column: 'supplier' },
  overhead_name: { table: 'overheads', column: 'name' },
  expense_name: { table: 'recurring_rules', column: 'name' },
  edit_reason: null,
};

export function normOpt(v) {
  return String(v == null ? '' : v).trim().replace(/\s+/g, ' ');
}

export async function listOptions(business_id, kind, includeArchived = false) {
  if (!OPTION_KINDS.includes(kind)) return [];
  if (!usePg()) {
    return store.lookupOptions
      .filter((o) => o.business_id === business_id && o.kind === kind && (includeArchived || !o.archived))
      .sort((a, b) => (a.last_used_at < b.last_used_at ? 1 : -1));
  }
  const r = await query(`SELECT * FROM lookup_options WHERE business_id=$1 AND kind=$2 AND ($3 OR archived=false) ORDER BY last_used_at DESC`, [business_id, kind, includeArchived]);
  return r.rows;
}

export async function findOption(id, business_id) {
  if (!usePg()) return store.lookupOptions.find((o) => String(o.id) === String(id) && o.business_id === business_id) || null;
  const r = await query(`SELECT * FROM lookup_options WHERE id=$1 AND business_id=$2`, [id, business_id]);
  return r.rows[0] || null;
}

// Learn a value: case-insensitive match touches last_used_at, else create.
export async function upsertOption(business_id, kind, value) {
  const v = normOpt(value);
  if (!OPTION_KINDS.includes(kind) || !v) return null;
  if (!usePg()) {
    const hit = store.lookupOptions.find((o) => o.business_id === business_id && o.kind === kind && o.value.toLowerCase() === v.toLowerCase());
    if (hit) {
      hit.archived = false;
      hit.last_used_at = new Date().toISOString();
      return hit;
    }
    const o = { id: `opt-${randomUUID().slice(0, 8)}`, business_id, kind, value: v, archived: false, last_used_at: new Date().toISOString(), created_at: new Date().toISOString() };
    store.lookupOptions.push(o);
    return o;
  }
  const hit = await query(`SELECT * FROM lookup_options WHERE business_id=$1 AND kind=$2 AND lower(value)=lower($3)`, [business_id, kind, v]);
  if (hit.rows[0]) {
    const r = await query(`UPDATE lookup_options SET archived=false, last_used_at=now() WHERE id=$1 RETURNING *`, [hit.rows[0].id]);
    return r.rows[0];
  }
  const r = await query(`INSERT INTO lookup_options (business_id, kind, value) VALUES ($1,$2,$3) RETURNING *`, [business_id, kind, v]);
  return r.rows[0];
}

// Seed unit + edit-reason defaults for a business (idempotent; env-owned).
export async function ensureOptionDefaults(business_id) {
  for (const v of config.defaultUnits || []) await upsertOption(business_id, 'unit', v);
  for (const v of config.defaultEditReasons || []) await upsertOption(business_id, 'edit_reason', v);
}

// Backfill dropdowns from existing distinct TEXT values (runs at boot + tests).
export async function backfillOptions(business_id) {
  if (!usePg()) {
    for (const p of store.products.filter((x) => x.business_id === business_id && normOpt(x.category))) await upsertOption(business_id, 'category', p.category);
    for (const i of store.ingredients.filter((x) => x.business_id === business_id && normOpt(x.unit))) await upsertOption(business_id, 'unit', i.unit);
    for (const p of store.purchases.filter((x) => x.business_id === business_id && normOpt(x.supplier))) await upsertOption(business_id, 'supplier', p.supplier);
    for (const o of store.overheads.filter((x) => x.business_id === business_id && normOpt(x.name))) await upsertOption(business_id, 'overhead_name', o.name);
    for (const r of store.recurringRules.filter((x) => x.business_id === business_id && normOpt(x.name))) await upsertOption(business_id, 'expense_name', r.name);
    return;
  }
  for (const [kind, col] of [['category', 'category'], ['unit', 'unit'], ['supplier', 'supplier']]) {
    const { table, column } = KIND_COLUMNS[kind];
    void col;
    const rows = await query(`SELECT DISTINCT btrim(${column}) AS v FROM ${table} WHERE business_id=$1 AND btrim(${column}) <> ''`, [business_id]);
    for (const r of rows.rows) await upsertOption(business_id, kind, r.v);
  }
  for (const [kind, table] of [['overhead_name', 'overheads'], ['expense_name', 'recurring_rules']]) {
    const rows = await query(`SELECT DISTINCT btrim(name) AS v FROM ${table} WHERE business_id=$1 AND btrim(name) <> ''`, [business_id]);
    for (const r of rows.rows) await upsertOption(business_id, kind, r.v);
  }
}

export async function backfillAllBusinesses() {
  const ids = usePg()
    ? (await query(`SELECT id FROM businesses`)).rows.map((r) => r.id)
    : store.businesses.map((b) => b.id);
  for (const id of ids) {
    await ensureOptionDefaults(id);
    await backfillOptions(id);
  }
}

// Rename or archive. Renames propagate to the matching TEXT column in one
// transaction (pg) so reports stay grouped; memory mirrors the same steps.
export async function renameOption(id, business_id, { value, archived }) {
  const opt = await findOption(id, business_id);
  if (!opt) return null;
  const target = KIND_COLUMNS[opt.kind];
  if (value !== undefined) {
    const v = normOpt(value);
    if (!v) return null;
    const dupe = (await listOptions(business_id, opt.kind)).find((o) => String(o.id) !== String(id) && o.value.toLowerCase() === v.toLowerCase());
    if (dupe) return { conflict: dupe };
    if (!usePg()) {
      if (target && !opt.archived) {
        const cols = { products: store.products, ingredients: store.ingredients, purchases: store.purchases, overheads: store.overheads, recurringRules: store.recurringRules };
        for (const row of cols[target.table].filter((r) => r.business_id === business_id && String(r[target.column] ?? '').toLowerCase() === opt.value.toLowerCase())) {
          row[target.column] = v;
        }
      }
      opt.value = v;
      if (archived !== undefined) opt.archived = archived !== false;
      opt.last_used_at = new Date().toISOString();
      return { option: opt };
    }
    await query('BEGIN');
    try {
      if (target) {
        await query(`UPDATE ${target.table} SET ${target.column}=$1 WHERE business_id=$2 AND lower(${target.column})=lower($3)`, [v, business_id, opt.value]);
      }
      const r = await query(`UPDATE lookup_options SET value=$1, archived=COALESCE($2, archived), last_used_at=now() WHERE id=$3 RETURNING *`,
        [v, archived === undefined ? null : archived !== false, id]);
      await query('COMMIT');
      return { option: r.rows[0] };
    } catch (e) {
      await query('ROLLBACK');
      throw e;
    }
  }
  if (archived !== undefined) {
    if (!usePg()) {
      opt.archived = archived !== false;
      return { option: opt };
    }
    const r = await query(`UPDATE lookup_options SET archived=$1 WHERE id=$2 RETURNING *`, [archived !== false, id]);
    return { option: r.rows[0] };
  }
  return { option: opt };
}
