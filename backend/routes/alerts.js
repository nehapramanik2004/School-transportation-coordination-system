import { Router } from 'express';
import * as controller from '../controllers/transportController.js';
import { asyncHandler } from '../middleware/errors.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();
router.get('/', asyncHandler(controller.list('alerts')));
router.post('/', validateBody({ type: { type: 'enum', values: ['Emergency', 'Delay', 'Pickup', 'Drop', 'Info'], required: true }, title: { type: 'string', required: true }, detail: { type: 'string' } }), asyncHandler(controller.createAlert));
router.patch('/read', asyncHandler(controller.markAlertsRead));
export default router;
