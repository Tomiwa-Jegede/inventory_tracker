import { Router } from 'express';
import { createRecurring, listRecurring, logAudit } from '../db/repo.js';
import { requireAuth, requireOwner } from '../auth.js';

export function occurrences(rule, fromStr, count) {
  const out = [];
  let d = rule.next_due_date;
  while (d < fromStr) d = addDays(d, rule.interval_days);
  for (let i = 0; i < count; i++) {
    out.push({ rule_id: rule.id, name: rule.name, due_date: d, amount_minor: rule.amount_minor });
    d = addDays(d, rule.interval_days);
  }
  return out;
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + Number(n));
  return d.toISOString().slice(0, 10);
}

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  res.json(await listRecurring(req.user.business_id));
});

router.post('/', requireOwner, async (req, res) => {
  const { name, amount_minor, interval_days, next_due_date } = req.body || {};
  if (!name || !Number.isInteger(amount_minor) || !Number.isInteger(interval_days) || interval_days <= 0 || !next_due_date) {
    return res.status(400).json({ error: 'name, integer amount_minor, integer interval_days>0, next_due_date required' });
  }
  const rule = await createRecurring({ business_id: req.user.business_id, name, amount_minor, interval_days, next_due_date });
  await logAudit({ business_id: req.user.business_id, actor: req.user.id, action: 'recurring.create', target: rule.id, before: null, after: rule, reason: 'setup' });
  res.status(201).json(rule);
});

router.get('/upcoming', async (req, res) => {
  const from = req.query.from || new Date().toISOString().slice(0, 10);
  const count = Math.min(Number(req.query.count) || 5, 30);
  const rules = (await listRecurring(req.user.business_id)).filter((r) => r.is_active !== false);
  res.json(rules.flatMap((r) => occurrences(r, from, count)).sort((a, b) => (a.due_date < b.due_date ? -1 : 1)));
});

export default router;
