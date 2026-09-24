// =============================================================================
// Staff Routes
// =============================================================================

import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';
import { StaffController } from '../../controllers/staff.controller';

const router = Router();

router.use(auth());

router.get('/employees', requirePermission('staff:view'), asyncHandler(StaffController.listEmployees));
router.get('/roles', requirePermission('roles:view'), asyncHandler(StaffController.listRoles));
router.get('/shifts', requirePermission('staff:view'), asyncHandler(StaffController.listShifts));
router.get('/attendance', requirePermission('attendance:view'), asyncHandler(StaffController.listAttendance));
router.post('/attendance', requirePermission('attendance:manage'), asyncHandler(StaffController.punchAttendance));
router.get('/', requirePermission('staff:view'), asyncHandler(StaffController.listEmployees));
router.post('/employees', requirePermission('staff:create'), asyncHandler(StaffController.createEmployee));
router.post('/', requirePermission('staff:create'), asyncHandler(StaffController.createEmployee));

export default router;
