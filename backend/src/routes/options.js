import { Router } from 'express';
import { OPTION_KINDS, findOption, listOptions, normOpt, renameOption, upsertOption } from '../db/repo.js';
import { requireAuth, requireOwner } from '../auth.js';

const router = Router();
router.use(requireAuth);

// Staff may read; only owners add/rename/archive (403 otherwise).
router.get('/', async (req, res) => {
  const { kind } = req.query;
  if (!OPTION_KINDS.includes(kind)) return res.status(400).json({ error: `kind must be one of ${OPTION_KINDS.join(', ')}` });
  res.json(await listOptions(req.user.business_id, kind, req.query.include_archived === '1'));
});

router.post('/', requireOwner, async (req, res) => {
  const { kind, value } = req.body || {};
  if (!OPTION_KINDS.includes(kind) || !normOpt(value)) {
    return res.status(400).json({ error: 'kind and non-empty value required' });
  }
  res.status(201).json(await upsertOption(req.user.business_id, kind, value));
});

router.patch('/:id', requireOwner, async (req, res) => {
  const { value, archived } = req.body || {};
  if (value === undefined && archived === undefined) {
    return res.status(400).json({ error: 'value and/or archived required' });
  }
  const result = await renameOption(req.params.id, req.user.business_id, { value, archived });
  if (!result) return res.status(404).json({ error: 'not found' });
  if (result.conflict) return res.status(409).json({ error: 'another option already has that value', existing: result.conflict });
  res.json(result.option);
});

export default router;
