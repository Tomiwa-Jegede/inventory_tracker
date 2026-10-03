import { Router } from 'express';
import { loginHandler, meHandler, registerHandler, requireAuth } from '../auth.js';

const router = Router();
router.post('/login', loginHandler);
router.get('/me', requireAuth, meHandler);
router.post('/register', requireAuth, registerHandler);

export default router;
