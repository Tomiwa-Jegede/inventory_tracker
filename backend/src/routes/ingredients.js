import { Router } from 'express';
import { changeStock, createIngredient, createStockAdjustment, findIngredient, listIngredients, logAudit } from '../db/repo.js';
import { requireAuth, requireOwner } from '../auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  res.json(await listIngredients(req.user.business_id));
});

router.post('/', requireOwner, async (req, res) => {
  const { name, unit = 'piece', low_stock_level = 0 } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  res.status(201).json(await createIngredient({ business_id: req.user.business_id, name, unit, low_stock_level }));
});

// Waste / spoilage adjustment with reason.
router.post('/:id/adjust', requireOwner, async (req, res) => {
  const ing = await findIngredient(req.params.id, req.user.business_id);
  if (!ing) return res.status(404).json({ error: 'not found' });
  const { qty_change, reason } = req.body || {};
  if (typeof qty_change !== 'number' || !reason) return res.status(400).json({ error: 'qty_change (number) + reason required' });
  const updated = await changeStock(ing.id, req.user.business_id, qty_change);
  const adj = await createStockAdjustment({ business_id: req.user.business_id, ingredient_id: ing.id, qty_change, reason, entered_by: req.user.id });
  await logAudit({ business_id: req.user.business_id, actor: req.user.id, action: 'stock.adjust', target: ing.id, before: null, after: adj, reason });
  res.status(201).json({ ingredient: updated, adjustment: adj });
});

export default router;
