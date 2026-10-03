import { Router } from 'express';
import { changeStock, findSale, latestCostPerUnit, listAudit, listOptions, listRecipes, logAudit, updateSale } from '../db/repo.js';
import { requireAuth, requireOwner } from '../auth.js';

const router = Router();
router.use(requireAuth);

// Edit a past item sale: qty change with a listed reason (+ note for Other).
router.patch('/sales/:id', requireOwner, async (req, res) => {
  const sale = await findSale(req.params.id, req.user.business_id);
  if (!sale) return res.status(404).json({ error: 'not found' });
  const { qty, reason, note } = req.body || {};
  if (!reason) return res.status(400).json({ error: 'reason required for money edits' });
  const allowed = (await listOptions(req.user.business_id, 'edit_reason')).map((o) => o.value);
  if (!allowed.includes(reason)) return res.status(400).json({ error: 'reason must be one of the saved edit reasons' });
  if (reason === 'Other' && !String(note || '').trim()) {
    return res.status(400).json({ error: 'a note is required when the reason is Other' });
  }
  const before = { ...sale };
  if (qty !== undefined) {
    if (!Number.isInteger(qty) || qty <= 0) return res.status(400).json({ error: 'qty integer > 0' });
    const recipeLines = await listRecipes(req.user.business_id, sale.product_id);
    for (const line of recipeLines) {
      const diff = Number(line.qty_per_sale) * sale.qty - Number(line.qty_per_sale) * qty;
      await changeStock(line.ingredient_id, req.user.business_id, diff);
    }
    let mat = 0;
    for (const line of recipeLines) mat += Math.round(Number(line.qty_per_sale) * qty * await latestCostPerUnit(line.ingredient_id, req.user.business_id));
    await updateSale(sale.id, req.user.business_id, { qty, total_minor: qty * sale.price_minor, material_cost_minor: mat, profit_minor: qty * sale.price_minor - mat });
  }
  const after = await findSale(req.params.id, req.user.business_id);
  await logAudit({ business_id: req.user.business_id, actor: req.user.id, action: 'sale.edit', target: sale.id, before, after, reason, note: reason === 'Other' ? String(note).trim() : null });
  res.json(after);
});

router.get('/audit', requireOwner, async (req, res) => {
  res.json(await listAudit(req.user.business_id));
});

export default router;
