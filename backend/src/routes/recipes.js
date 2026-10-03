import { Router } from 'express';
import { deleteRecipe, findIngredient, findProduct, listRecipes, upsertRecipe } from '../db/repo.js';
import { requireAuth, requireOwner } from '../auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  res.json(await listRecipes(req.user.business_id, req.query.product_id));
});

router.post('/', requireOwner, async (req, res) => {
  const { product_id, ingredient_id, qty_per_sale } = req.body || {};
  if (!product_id || !ingredient_id || typeof qty_per_sale !== 'number' || qty_per_sale <= 0) {
    return res.status(400).json({ error: 'product_id, ingredient_id, qty_per_sale (>0) required' });
  }
  const product = await findProduct(product_id, req.user.business_id);
  const ing = await findIngredient(ingredient_id, req.user.business_id);
  if (!product || !ing) return res.status(404).json({ error: 'product or ingredient not found' });
  const line = await upsertRecipe({ business_id: req.user.business_id, product_id, ingredient_id, qty_per_sale });
  res.status(201).json(line);
});

router.delete('/:id', requireOwner, async (req, res) => {
  const ok = await deleteRecipe(req.params.id, req.user.business_id);
  if (!ok) return res.status(404).json({ error: 'not found' });
  res.json({ ok: true });
});

export default router;
