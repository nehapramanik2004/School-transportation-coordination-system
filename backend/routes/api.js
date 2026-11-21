import { Router } from 'express';
import { readDatabase } from '../data/database.js';
import { asyncHandler, HttpError } from '../middleware/errors.js';
import * as controller from '../controllers/transportController.js';
import { demoLoginAvailable, readSession } from '../auth/session.js';
import auth from './auth.js';
import { requireRoles, requireSession } from '../middleware/auth.js';
import students from './students.js';
import drivers from './drivers.js';
import buses from './buses.js';
import routes from './routes.js';
import trips from './trips.js';
import alerts from './alerts.js';

const api = Router();
api.get('/health', async (req, res, next) => {
  try {
    const db = await readDatabase();
    res.json({ ok: true, storage: process.env.DATA_STORE === 'postgres' ? 'Neon PostgreSQL' : 'local JSON file', demoMode: db.settings?.demoMode !== false, gps: 'simulated demo data' });
  } catch (error) { next(error); }
});
api.use('/auth', auth);
api.get('/bootstrap', (req, res, next) => {
  req.user = readSession(req);
  if (!req.user && demoLoginAvailable()) req.user = { role: 'admin', guest: true };
  if (!req.user) return next(new HttpError(401, 'Please sign in to continue.'));
  return asyncHandler(controller.bootstrap)(req, res, next);
});
api.use(requireSession);
api.get('/summary', requireRoles('admin'), asyncHandler(controller.summary));
api.use('/students', requireRoles('admin'), students);
api.use('/drivers', requireRoles('admin'), drivers);
api.use('/buses', requireRoles('admin'), buses);
api.use('/routes', requireRoles('admin'), routes);
api.use('/trips', (req, res, next) => {
  if (req.method === 'GET' || req.user.role === 'admin') return next();
  if (req.user.role === 'driver' && req.method === 'PATCH' && /^\/[^/]+\/(status|attendance)$/.test(req.path)) return next();
  return res.status(403).json({ error: 'This account does not have access to that trip action.' });
}, trips);
api.use('/alerts', (req, res, next) => {
  if (req.method === 'GET' || req.user.role === 'admin') return next();
  if (req.user.role === 'driver' && req.method === 'POST' && ['Emergency', 'Delay'].includes(req.body?.type)) return next();
  return res.status(403).json({ error: 'This account does not have access to that alert action.' });
}, alerts);
export default api;
