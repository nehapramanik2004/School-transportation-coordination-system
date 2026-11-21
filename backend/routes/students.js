import { Router } from 'express';
import * as controller from '../controllers/transportController.js';
import { asyncHandler } from '../middleware/errors.js';
import { validateBody, validateId } from '../middleware/validate.js';

const router = Router();
const studentRules = {
  name: { type: 'string', required: true }, grade: { type: 'string', required: true },
  parent: { type: 'string', required: true }, phone: { type: 'phone', required: true },
  routeId: { type: 'string', required: true }, stop: { type: 'string', required: true },
  pickup: { type: 'string', required: true }
};
router.get('/', asyncHandler(controller.list('students')));
router.post('/', validateBody(studentRules), asyncHandler(controller.createStudent));
router.patch('/:id', validateId, validateBody(Object.fromEntries(Object.entries(studentRules).map(([key, rule]) => [key, { ...rule, required: false }]))), asyncHandler(controller.updateStudent));
router.delete('/:id', validateId, asyncHandler(controller.deleteStudent));
export default router;
