import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import api from './routes/api.js';
import { validateAuthConfiguration } from './auth/session.js';
import { ensureDatabase } from './data/database.js';
import { errorHandler, notFound } from './middleware/errors.js';

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, '../.env.local'), override: false, quiet: true });

export function createApp() {
  validateAuthConfiguration();
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: process.env.FRONTEND_ORIGIN?.split(',') || ['http://localhost:5173'], credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.get('/', (req, res) => res.json({ name: 'Northview School Transport API', docs: '/api/health' }));
  app.use('/api', api);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

ensureDatabase();
const app = createApp();
const port = Number(process.env.PORT || 3000);
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => console.log(`Northview Transport API listening at http://localhost:${port}`));
}

export default app;
