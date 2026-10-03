import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { listIngredients, listOverheads, listRecurring } from '../db/repo.js';
import { occurrences } from './recurring.js';

const router = Router();
router.use(requireAuth);

// Read-only alerts. No auto-order, no payments.
router.get('/', async (req, res) => {
  const ingredients = await listIngredients(req.user.business_id);
  const lowStock = ingredients
    .filter((i) => Number(i.stock_qty) <= Number(i.low_stock_level || 0))
    .map((i) => ({ ingredient_id: i.id, name: i.name, stock_qty: Number(i.stock_qty), unit: i.unit }));
  const today = new Date().toISOString().slice(0, 10);
  const overheads = await listOverheads(req.user.business_id);
  const upcomingOverheads = overheads
    .filter((o) => o.is_active !== false && o.next_due_date >= today)
    .sort((a, b) => (a.next_due_date < b.next_due_date ? -1 : 1))
    .slice(0, 5)
    .map((o) => ({ overhead_id: o.id, name: o.name, next_due_date: o.next_due_date, amount_minor: o.amount_minor }));
  const rules = (await listRecurring(req.user.business_id)).filter((r) => r.is_active !== false);
  const upcomingRecurring = rules.flatMap((r) => occurrences(r, today, 2)).sort((a, b) => (a.due_date < b.due_date ? -1 : 1)).slice(0, 5);
  res.json({ lowStock, upcomingOverheads, upcomingRecurring });
});

export default router;
