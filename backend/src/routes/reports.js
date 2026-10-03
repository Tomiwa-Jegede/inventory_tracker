import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { listAdjustments, listDayTotals, listIngredients, listOverheads, listSales } from '../db/repo.js';
import { dailySetAside } from '../m3.js';

const router = Router();
router.use(requireAuth);

async function dailyClose(business_id, sale_date) {
  const sales = await listSales(business_id, sale_date);
  const dayTotals = await listDayTotals(business_id, sale_date);
  const itemsTotal = sales.reduce((sum, s) => sum + Number(s.total_minor), 0);
  const quickTotal = dayTotals.reduce((sum, t) => sum + Number(t.total_minor), 0);
  const materialTotal = sales.reduce((sum, s) => sum + Number(s.material_cost_minor || 0), 0);
  const byProduct = {};
  for (const s of sales) {
    const profit = s.profit_minor ?? (s.total_minor - (s.material_cost_minor || 0));
    byProduct[s.product_id] = byProduct[s.product_id] || { product_id: s.product_id, qty: 0, total_minor: 0, material_cost_minor: 0, profit_minor: 0 };
    byProduct[s.product_id].qty += Number(s.qty);
    byProduct[s.product_id].total_minor += Number(s.total_minor);
    byProduct[s.product_id].material_cost_minor += Number(s.material_cost_minor || 0);
    byProduct[s.product_id].profit_minor += Number(profit);
  }
  const gross_minor = Object.values(byProduct).reduce((sum, b) => sum + b.profit_minor, 0);
  const overheads = await listOverheads(business_id);
  const setAsideLines = overheads.map((o) => ({ overhead_id: o.id, name: o.name, daily_minor: dailySetAside(o, sale_date) }));
  const setAside_minor = setAsideLines.reduce((s, l) => s + l.daily_minor, 0);
  const adjustments = await listAdjustments(business_id, sale_date);
  const adjustments_minor = adjustments.reduce((s, a) => s + Number(a.amount_minor), 0);
  const net_minor = gross_minor - setAside_minor - adjustments_minor;
  return {
    sale_date,
    itemsTotal_minor: itemsTotal,
    quickTotal_minor: quickTotal,
    total_minor: itemsTotal + quickTotal,
    materialTotal_minor: materialTotal,
    gross_minor,
    setAside_minor,
    adjustments_minor,
    adjustments,
    net_minor,
    shortfall_minor: net_minor < 0 ? -net_minor : 0,
    setAsideLines,
    count: sales.length,
    breakdown: Object.values(byProduct),
    hasQuickTotal: dayTotals.length > 0,
  };
}

// Frozen sale-time costs, never rewritten. Net = gross - set-aside - adjustments.
router.get('/daily', async (req, res) => {
  const sale_date = req.query.sale_date || new Date().toISOString().slice(0, 10);
  res.json(await dailyClose(req.user.business_id, sale_date));
});

// Stock remaining with low-stock flag.
router.get('/stock', async (req, res) => {
  const rows = await listIngredients(req.user.business_id);
  res.json(rows.map((i) => ({ ...i, low: Number(i.stock_qty) <= Number(i.low_stock_level || 0) })));
});

// Trends: per-day closes. Missing days (no data) distinct from zero.
router.get('/trends', async (req, res) => {
  const from = req.query.from;
  const to = req.query.to || from || new Date().toISOString().slice(0, 10);
  if (!from) return res.status(400).json({ error: 'from date required (YYYY-MM-DD)' });
  const days = [];
  for (let d = from; d <= to; d = addDay(d)) {
    const sales = await listSales(req.user.business_id, d);
    const qts = await listDayTotals(req.user.business_id, d);
    if (!sales.length && !qts.length) {
      days.push({ sale_date: d, status: 'missing', total_minor: 0, gross_minor: 0, net_minor: 0 });
      continue;
    }
    const c = await dailyClose(req.user.business_id, d);
    days.push({ sale_date: d, status: 'complete', total_minor: c.total_minor, gross_minor: c.gross_minor, setAside_minor: c.setAside_minor, net_minor: c.net_minor });
  }
  const sum = (k) => days.reduce((s, d) => s + (d[k] || 0), 0);
  res.json({ from, to, days, totals: { total_minor: sum('total_minor'), gross_minor: sum('gross_minor'), net_minor: sum('net_minor') } });
});

function addDay(d) {
  const x = new Date(d + 'T00:00:00Z');
  x.setUTCDate(x.getUTCDate() + 1);
  return x.toISOString().slice(0, 10);
}

export default router;
