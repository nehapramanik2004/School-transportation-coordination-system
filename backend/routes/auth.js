import { Router } from 'express';
import { asyncHandler } from '../middleware/errors.js';
import { demoLogin, demoLoginAvailable, login, logout, session } from '../auth/session.js';

const router = Router();
router.post('/login', asyncHandler(login));
router.post('/demo-login', asyncHandler(demoLogin));
router.get('/session', session);
router.get('/mode', (_req, res) => res.json({ demoLoginAvailable: demoLoginAvailable() }));
router.post('/logout', logout);
export default router;
