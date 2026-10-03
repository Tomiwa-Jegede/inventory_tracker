import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { requireAuth } from '../auth.js';

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('images only'));
  },
});

const router = Router();
router.use(requireAuth);

// Backup only in M1 — no OCR. Returns a URL to attach to a sale.
router.post('/upload', upload.single('receipt'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'receipt file required' });
  const url = `/uploads/${req.file.filename}${path.extname(req.file.originalname || '')}`;
  res.status(201).json({ url, filename: req.file.filename });
});

export default router;
