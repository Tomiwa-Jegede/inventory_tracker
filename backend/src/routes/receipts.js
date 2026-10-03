import { Router } from 'express';
import multer from 'multer';
import config from '../config.js';
import { requireAuth } from '../auth.js';
import { putReceipt, signedReceiptUrl, storageMode } from '../storage.js';
import { createReceipt, findReceipt } from '../db/repo.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('images only'));
  },
});

const router = Router();
router.use(requireAuth);

// Backup only — no OCR. Returns a receipt id + storage key to attach to a sale.
router.post('/upload', upload.single('receipt'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'receipt file required' });
    const stored = await putReceipt({ businessId: req.user.business_id, buffer: req.file.buffer, mime: req.file.mimetype });
    const receipt = await createReceipt({
      business_id: req.user.business_id,
      object_key: stored.key,
      mime: stored.mime,
      size_bytes: stored.size,
    });
    res.status(201).json({ id: receipt.id, key: stored.key, ...(stored.localPath ? { localPath: stored.localPath } : {}) });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// Resolve a sale-attached object KEY to a view URL. The key embeds the
// business id ({business_id}/yyyy/mm/uuid.ext); keys outside the caller's
// business are rejected without touching storage.
router.get('/url', async (req, res) => {
  const key = String(req.query.key || '');
  if (!key || !key.startsWith(`${req.user.business_id}/`)) {
    return res.status(404).json({ error: 'receipt not found' });
  }
  if (storageMode() === 'r2') {
    const url = await signedReceiptUrl(key);
    return res.json({ url, expiresIn: 300 });
  }
  const filename = key.split('/').pop();
  return res.json({ url: `/uploads/${req.user.business_id}/${filename}`, expiresIn: null });
});

// Authenticated, business-scoped, short-lived view URL. Bucket stays private.
router.get('/:id/url', async (req, res) => {
  const receipt = await findReceipt(req.params.id, req.user.business_id);
  if (!receipt) return res.status(404).json({ error: 'receipt not found' });
  if (storageMode() === 'r2') {
    const url = await signedReceiptUrl(receipt.object_key);
    return res.json({ url, expiresIn: 300 });
  }
  const filename = receipt.object_key.split('/').pop();
  return res.json({ url: `/uploads/${req.user.business_id}/${filename}`, expiresIn: null });
});

export default router;
