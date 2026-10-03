import { Router } from 'express';
import { listProducts, createProduct, findProduct, updateProduct } from '../db/repo.js';
import { requireAuth, requireOwner } from '../auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const rows = await listProducts(req.user.business_id, req.query.include_archived === '1');
  res.json(rows);
});

router.post('/', requireOwner, async (req, res) => {
  const { name, category = 'General', price_minor, tracks_stock = true } = req.body || {};
  if (!name || price_minor == null || !Number.isInteger(price_minor) || price_minor < 0) {
    return res.status(400).json({ error: 'name and integer price_minor >= 0 required' });
  }
  const product = await createProduct({ business_id: req.user.business_id, name, category, price_minor, tracks_stock });
  res.status(201).json(product);
});

router.patch('/:id', requireOwner, async (req, res) => {
  const { name, category, price_minor, tracks_stock, is_active } = req.body || {};
  const patch = {};
  if (name !== undefined) patch.name = name;
  if (category !== undefined) patch.category = category;
  if (price_minor !== undefined) {
    if (!Number.isInteger(price_minor) || price_minor < 0) return res.status(400).json({ error: 'price_minor must be integer >= 0' });
    patch.price_minor = price_minor;
  }
  if (tracks_stock !== undefined) patch.tracks_stock = tracks_stock !== false;
  if (is_active !== undefined) patch.is_active = is_active !== false;
  const product = await updateProduct(req.params.id, req.user.business_id, patch);
  if (!product) return res.status(404).json({ error: 'not found' });
  res.json(product);
});

export async function __findProduct(id, business_id) {
  return findProduct(id, business_id);
}

export default router;
