import { Router } from 'express';
import * as controller from '../controllers/transportController.js';
import { asyncHandler } from '../middleware/errors.js';
import { validateBody, validateId } from '../middleware/validate.js';

const router = Router();
const rules = {
  name: { type: 'string', required: true }, color: { type: 'enum', values: ['blue', 'purple', 'orange'], required: true },
  busId: { type: 'string' }, driverId: { type: 'string' }, stops: { type: 'array', items: 'string', minLength: 2, required: true },
  startTime: { type: 'string', required: true }, duration: { type: 'string', required: true },
  status: { type: 'enum', values: ['Active', 'Paused'] }
};
router.get('/', asyncHandler(controller.list('routes')));
router.post('/', validateBody(rules), asyncHandler(controller.createRoute));
router.patch('/:id', validateId, validateBody(Object.fromEntries(Object.entries(rules).map(([key, rule]) => [key, { ...rule, required: false }]))), asyncHandler(controller.updateRoute));
router.delete('/:id', validateId, asyncHandler(controller.deleteRoute));
export default router;
