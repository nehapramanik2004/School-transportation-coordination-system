import { Router } from 'express';
import * as controller from '../controllers/transportController.js';
import { asyncHandler } from '../middleware/errors.js';
import { validateBody, validateId } from '../middleware/validate.js';

const router = Router();
const rules = { name: { type: 'string', required: true }, phone: { type: 'phone', required: true }, routeId: { type: 'string' }, busId: { type: 'string' } };
router.get('/', asyncHandler(controller.list('drivers')));
router.post('/', validateBody(rules), asyncHandler(controller.createDriver));
router.patch('/:id', validateId, validateBody(Object.fromEntries(Object.entries(rules).map(([key, rule]) => [key, { ...rule, required: false }]))), asyncHandler(controller.updateDriver));
router.delete('/:id', validateId, asyncHandler(controller.deleteDriver));
export default router;
