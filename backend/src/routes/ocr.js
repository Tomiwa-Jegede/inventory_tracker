import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { createOcrAttempt, listProducts } from '../db/repo.js';

const router = Router();
router.use(requireAuth);

// STUB only. No provider, no auto-post. Human must confirm via sales entry.
router.post('/suggest', async (req, res) => {
  const { receipt_photo_url } = req.body || {};
  const products = (await listProducts(req.user.business_id, false)).slice(0, 50);
  const byPrice = {};
  for (const p of products) {
    byPrice[p.price_minor] = byPrice[p.price_minor] || [];
    byPrice[p.price_minor].push({ product_id: p.id, name: p.name });
  }
  const suggestions = products.slice(0, 5).map((p) => ({
    product_id: p.id,
    name: p.name,
    qty: 1,
    confidence: 0.4,
    ambiguous_with: (byPrice[p.price_minor] || []).filter((x) => String(x.product_id) !== String(p.id)).map((x) => x.name),
  }));
  const attempt = await createOcrAttempt({ business_id: req.user.business_id, receipt_photo_url: receipt_photo_url || null, suggestions });
  res.json({ ...attempt, suggestions, note: 'STUB: human must confirm via sales entry. Never auto-posts.' });
});

export default router;
