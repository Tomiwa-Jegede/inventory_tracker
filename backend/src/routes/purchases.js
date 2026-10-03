import { Router } from 'express';
import { createPurchase, findIngredient, listPurchases, logAudit } from '../db/repo.js';
import { requireAuth, requireOwner } from '../auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  res.json(await listPurchases(req.user.business_id));
});

router.post('/', requireOwner, async (req, res) => {
  const { ingredient_id, qty, total_minor, purchase_date, supplier, note } = req.body || {};
  if (!ingredient_id || typeof qty !== 'number' || qty <= 0 || !Number.isInteger(total_minor) || total_minor < 0) {
    return res.status(400).json({ error: 'ingredient_id, qty (>0 number), integer total_minor >= 0 required' });
  }
  const ing = await findIngredient(ingredient_id, req.user.business_id);
  if (!ing) return res.status(404).json({ error: 'ingredient not found' });
  const purchase = await createPurchase({
    business_id: req.user.business_id, ingredient_id, qty, total_minor,
    purchase_date: purchase_date || new Date().toISOString().slice(0, 10),
    supplier, note, entered_by: req.user.id,
  });
  await logAudit({ business_id: req.user.business_id, actor: req.user.id, action: 'purchase.create', target: purchase.id, before: null, after: purchase, reason: 'purchase' });
  res.status(201).json(purchase);
});

export default router;
