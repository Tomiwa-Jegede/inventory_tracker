import { Router } from 'express';
import { createOverhead, createOverheadPayment, listOverheads, logAudit, overheadPaidTotal, updateOverhead } from '../db/repo.js';
import { requireAuth, requireOwner } from '../auth.js';
import { dailySetAside } from '../m3.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const rows = await listOverheads(req.user.business_id);
  const today = new Date().toISOString().slice(0, 10);
  res.json(await Promise.all(rows.map(async (o) => ({ ...o, daily_minor: dailySetAside(o, today), paid_minor: await overheadPaidTotal(o.id) }))));
});

router.post('/', requireOwner, async (req, res) => {
  const { name, amount_minor, frequency = 'monthly', custom_days, next_due_date } = req.body || {};
  if (!name || !Number.isInteger(amount_minor) || amount_minor < 0 || !next_due_date) {
    return res.status(400).json({ error: 'name, integer amount_minor, next_due_date required' });
  }
  if (!['daily', 'weekly', 'monthly', 'custom'].includes(frequency)) return res.status(400).json({ error: 'bad frequency' });
  const o = await createOverhead({ business_id: req.user.business_id, name, amount_minor, frequency, custom_days, next_due_date });
  await logAudit({ business_id: req.user.business_id, actor: req.user.id, action: 'overhead.create', target: o.id, before: null, after: o, reason: 'setup' });
  res.status(201).json(o);
});

router.patch('/:id', requireOwner, async (req, res) => {
  const { name, amount_minor, frequency, custom_days, next_due_date, is_active } = req.body || {};
  const patch = {};
  if (name !== undefined) patch.name = name;
  if (next_due_date !== undefined) patch.next_due_date = next_due_date;
  if (is_active !== undefined) patch.is_active = is_active !== false;
  if (amount_minor !== undefined) patch.amount_minor = amount_minor;
  if (frequency !== undefined) patch.frequency = frequency;
  if (custom_days !== undefined) patch.custom_days = Number(custom_days);
  const result = await updateOverhead(req.params.id, req.user.business_id, patch);
  if (!result) return res.status(404).json({ error: 'not found' });
  await logAudit({ business_id: req.user.business_id, actor: req.user.id, action: 'overhead.update', target: req.params.id, before: result.before, after: result.after, reason: req.body.reason || 'update' });
  res.json(result.after);
});

router.post('/:id/payments', requireOwner, async (req, res) => {
  const { amount_minor, paid_date, note } = req.body || {};
  if (!Number.isInteger(amount_minor)) return res.status(400).json({ error: 'integer amount_minor required' });
  const pay = await createOverheadPayment({
    business_id: req.user.business_id, overhead_id: req.params.id, amount_minor,
    paid_date: paid_date || new Date().toISOString().slice(0, 10), note, entered_by: req.user.id,
  });
  await logAudit({ business_id: req.user.business_id, actor: req.user.id, action: 'overhead.pay', target: req.params.id, before: null, after: pay, reason: note || 'payment' });
  res.status(201).json(pay);
});

export default router;
