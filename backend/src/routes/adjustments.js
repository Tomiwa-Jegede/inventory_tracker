import { Router } from 'express';
import { createAdjustment, listAdjustments, logAudit } from '../db/repo.js';
import { requireAuth, requireOwner } from '../auth.js';

const REASONS = ['discount', 'refund', 'waste', 'spoilage', 'comp', 'correction', 'other'];

const router = Router();
router.use(requireAuth);

router.post('/', requireOwner, async (req, res) => {
  const { type, sale_date, amount_minor, reason, note } = req.body || {};
  if (!REASONS.includes(reason)) return res.status(400).json({ error: `reason must be one of ${REASONS.join(', ')}` });
  if (!Number.isInteger(amount_minor) || amount_minor < 0) return res.status(400).json({ error: 'integer amount_minor >= 0 required' });
  const adj = await createAdjustment({
    business_id: req.user.business_id, type, sale_date: sale_date || new Date().toISOString().slice(0, 10),
    amount_minor, reason, note, entered_by: req.user.id,
  });
  await logAudit({ business_id: req.user.business_id, actor: req.user.id, action: 'adjustment.create', target: adj.id, before: null, after: adj, reason });
  res.status(201).json(adj);
});

router.get('/', async (req, res) => {
  res.json(await listAdjustments(req.user.business_id, req.query.sale_date));
});

export default router;
