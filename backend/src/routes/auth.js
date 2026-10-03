import { Router } from 'express';
import { loginHandler, registerHandler, requireAuth } from '../auth.js';

const router = Router();
router.post('/login', loginHandler);
router.post('/register', requireAuth, registerHandler);

export default router;
