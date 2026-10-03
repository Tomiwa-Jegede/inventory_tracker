import express from 'express';
import cors from 'cors';
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
import { dbMode } from './db/pool.js';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'inventory-tracker-backend', milestone: 'M5-stop', db: dbMode() });
  });

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
  app.use('/uploads', express.static('uploads'));

  return app;
}
