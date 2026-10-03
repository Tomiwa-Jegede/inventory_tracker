import express from 'express';
import cors from 'cors';
import multer from 'multer';
import config from './config.js';
import authRouter from './routes/auth.js';
import productsRouter from './routes/products.js';
import salesRouter from './routes/sales.js';
import receiptsRouter from './routes/receipts.js';
import reportsRouter from './routes/reports.js';
import ingredientsRouter from './routes/ingredients.js';
import purchasesRouter from './routes/purchases.js';
import recipesRouter from './routes/recipes.js';
import overheadsRouter from './routes/overheads.js';
import recurringRouter from './routes/recurring.js';
import adjustmentsRouter from './routes/adjustments.js';
import editsRouter from './routes/edits.js';
import ocrRouter from './routes/ocr.js';
import alertsRouter from './routes/alerts.js';
import { dbMode, pingDb } from './db/pool.js';
import { storageMode } from './storage.js';

// Minimal security headers (helmet-equivalent subset, no extra dependency).
function securityHeaders(_req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  next();
}

// Tiny in-memory login rate limiter: slows brute-force password guessing.
// (Resets on restart; sufficient for this scale. Use Redis if multi-instance.)
const loginAttempts = new Map();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX = 20;
export function loginRateLimit(req, res, next) {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now - entry.start > LOGIN_WINDOW_MS) {
    loginAttempts.set(ip, { start: now, count: 1 });
    return next();
  }
  entry.count += 1;
  if (entry.count > LOGIN_MAX) {
    return res.status(429).json({ error: 'too many login attempts, try again later' });
  }
  next();
}

function corsOptions() {
  // Dev default: local Vite origins. Production requires CORS_ORIGINS.
  const allowed = config.corsOrigins.length > 0
    ? config.corsOrigins
    : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:8080'];
  const localhostRe = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;
  return {
    origin: (origin, cb) => {
      // Same-origin / curl / mobile clients send no Origin header.
      if (!origin) return cb(null, true);
      if (allowed.includes(origin)) return cb(null, true);
      // Dev convenience: any localhost port (Vite picks free ports).
      if (config.corsOrigins.length === 0 && localhostRe.test(origin)) return cb(null, true);
      return cb(new Error('CORS: origin not allowed'));
    },
  };
}

export function createApp() {
  const app = express();
  // Behind Render's reverse proxy: correct req.ip + HTTPS detection.
  app.set('trust proxy', 1);
  app.use(securityHeaders);
  app.use(cors(corsOptions()));
  app.use(express.json({ limit: config.jsonBodyLimit }));

  app.get('/health', async (_req, res) => {
    const mode = dbMode();
    if (mode !== 'pg') return res.json({ ok: true, service: 'inventory-tracker-backend', db: mode, storage: storageMode() });
    try {
      await pingDb();
      res.json({ ok: true, service: 'inventory-tracker-backend', db: mode, storage: storageMode() });
    } catch (err) {
      res.status(503).json({ ok: false, service: 'inventory-tracker-backend', db: 'unreachable', error: err.message });
    }
  });

  app.use('/api/auth/login', loginRateLimit);
  app.use('/api/auth', authRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/sales', salesRouter);
  app.use('/api/receipts', receiptsRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/ingredients', ingredientsRouter);
  app.use('/api/purchases', purchasesRouter);
  app.use('/api/recipes', recipesRouter);
  app.use('/api/overheads', overheadsRouter);
  app.use('/api/recurring', recurringRouter);
  app.use('/api/adjustments', adjustmentsRouter);
  app.use('/api', editsRouter);
  app.use('/api/ocr', ocrRouter);
  app.use('/api/alerts', alertsRouter);
  // Local-dev storage only. R2 mode serves receipts via signed URLs instead.
  if (storageMode() === 'local') {
    app.use('/uploads', express.static('uploads'));
  }

  // Multer/file errors → clean JSON instead of HTML crash pages.
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof multer.MulterError) return res.status(400).json({ error: err.message });
    if (err?.message === 'CORS: origin not allowed') return res.status(403).json({ error: 'origin not allowed' });
    console.error('unhandled error:', err.message);
    res.status(500).json({ error: 'internal error' });
  });

  return app;
}
