import { Router } from 'express';
import * as controller from '../controllers/transportController.js';
import { asyncHandler } from '../middleware/errors.js';
import { validateBody, validateId } from '../middleware/validate.js';

const router = Router();
router.get('/', asyncHandler(controller.list('trips')));
router.post('/', validateBody({ routeId: { type: 'string', required: true }, type: { type: 'enum', values: ['Morning pickup', 'Afternoon drop'], required: true }, eta: { type: 'string', required: true }, date: { type: 'date' } }), asyncHandler(controller.createTrip));
router.patch('/:id/status', validateId, validateBody({ status: { type: 'enum', values: ['Scheduled', 'In progress', 'Completed'], required: true } }), asyncHandler(controller.updateTripStatus));
router.patch('/:id/attendance', validateId, validateBody({ studentId: { type: 'string', required: true }, status: { type: 'enum', values: ['Upcoming', 'Picked up', 'Dropped off'], required: true } }), asyncHandler(controller.updateAttendance));
export default router;
