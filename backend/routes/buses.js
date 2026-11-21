import { Router } from 'express';
import * as controller from '../controllers/transportController.js';
import { asyncHandler } from '../middleware/errors.js';
import { validateBody, validateId } from '../middleware/validate.js';

const router = Router();
const rules = {
  number: { type: 'string', required: true }, label: { type: 'string', required: true },
  capacity: { type: 'number', integer: true, min: 1, required: true }, status: { type: 'enum', values: ['Ready', 'On route', 'Maintenance'] }
};
router.get('/', asyncHandler(controller.list('buses')));
router.post('/', validateBody(rules), asyncHandler(controller.createBus));
router.patch('/:id', validateId, validateBody(Object.fromEntries(Object.entries(rules).map(([key, rule]) => [key, { ...rule, required: false }]))), asyncHandler(controller.updateBus));
router.delete('/:id', validateId, asyncHandler(controller.deleteBus));
export default router;
