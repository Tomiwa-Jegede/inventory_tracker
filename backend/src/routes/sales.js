import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { deleteReceiptObject } from '../storage.js';
import { changeStock, createDayTotal, createSale, deleteReceipt, findProduct, findReceipt, latestCostPerUnit, listDayTotals, listRecipes, listSales, logAudit, supersedeDayTotals } from '../db/repo.js';

const router = Router();
router.use(requireAuth);

async function costAndDeductPg(business_id, product_id, qty) {
  const lines = await listRecipes(business_id, product_id);
  let material_cost_minor = 0;
  const shortages = [];
  for (const line of lines) {
    const need = Number(line.qty_per_sale) * qty;
    const unitCost = await latestCostPerUnit(line.ingredient_id, business_id);
    material_cost_minor += Math.round(need * unitCost);
    const ing = await changeStock(line.ingredient_id, business_id, -need);
    if (ing && Number(ing.stock_qty) < 0) shortages.push({ ingredient_id: ing.id, name: ing.name, stock_qty: Number(ing.stock_qty) });
  }
  return { material_cost_minor, shortages };
}

// Item sale: price copied from product at sale time (never rewritten later).
// Delete-on-entry: pass receipt_id and the transcribed photo is deleted right
// after the sale saves — nothing retained. receipt_key/photo_url are forced
// null on that path so no dangling refs survive.
router.post('/', async (req, res) => {
  const { product_id, sale_date, qty, receipt_photo_url, receipt_key, receipt_id } = req.body || {};
  if (!product_id || !sale_date || !qty) {
    return res.status(400).json({ error: 'product_id, sale_date, qty required' });
  }
  const product = await findProduct(product_id, req.user.business_id);
  if (!product) return res.status(404).json({ error: 'product not found' });
  if (!Number.isInteger(qty) || qty <= 0) return res.status(400).json({ error: 'qty must be integer > 0' });
  const { material_cost_minor, shortages } = await costAndDeductPg(req.user.business_id, product.id, qty);
  const sale = await createSale({
    business_id: req.user.business_id,
    product_id,
    sale_date,
    qty,
    price_minor: product.price_minor,
    total_minor: qty * product.price_minor,
    material_cost_minor,
    profit_minor: qty * product.price_minor - material_cost_minor,
    receipt_photo_url: receipt_id ? null : (receipt_photo_url || null),
    receipt_key: receipt_id ? null : (receipt_key || null),
    entered_by: req.user.id,
  });
  let receipt_consumed = null;
  if (receipt_id) {
    const rc = await findReceipt(receipt_id, req.user.business_id);
    if (rc) {
      try {
        await deleteReceiptObject(rc.object_key);
      } catch (e) {
        console.error('receipt object delete failed:', e.message);
      }
      await deleteReceipt(receipt_id, req.user.business_id);
      await logAudit({ business_id: req.user.business_id, actor: req.user.id, action: 'receipt.consumed', target: receipt_id, before: { object_key: rc.object_key }, after: null, reason: 'delete-on-entry' });
      receipt_consumed = receipt_id;
    }
  }
  const out = { ...sale };
  if (shortages.length) out.shortage_warning = shortages;
  if (receipt_consumed) out.receipt_consumed = receipt_consumed;
  // Replace rule: backfill supersedes the day's quick totals so the close
  // shows one truthful number. Superseded rows stay visible in history.
  const superseded = await supersedeDayTotals(req.user.business_id, sale_date);
  if (superseded.length) {
    await logAudit({ business_id: req.user.business_id, actor: req.user.id, action: 'day_total.superseded', target: sale.id, before: superseded.map((t) => ({ id: t.id, total_minor: t.total_minor })), after: null, reason: 'backfill replaces quick total' });
    out.superseded_quick_totals = superseded.map((t) => ({ id: t.id, total_minor: Number(t.total_minor) }));
  }
  res.status(201).json(out);
});

// Quick total for busy hours (no breakdown).
router.post('/day-total', async (req, res) => {
  const { sale_date, total_minor, note } = req.body || {};
  if (!sale_date || total_minor == null || !Number.isInteger(total_minor) || total_minor < 0) {
    return res.status(400).json({ error: 'sale_date and integer total_minor >= 0 required' });
  }
  const entry = await createDayTotal({ business_id: req.user.business_id, sale_date, total_minor, note, entered_by: req.user.id });
  res.status(201).json(entry);
});

router.get('/', async (req, res) => {
  const { sale_date } = req.query;
  const sales = await listSales(req.user.business_id, sale_date);
  const dayTotals = await listDayTotals(req.user.business_id, sale_date);
  res.json({ sales, dayTotals });
});

export default router;
