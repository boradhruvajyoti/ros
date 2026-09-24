import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';
import { SuperAdminController } from '../../controllers/superadmin.controller';

const router = Router();
router.use(auth());

router.get('/',                    requirePermission('tenants:manage'), asyncHandler(SuperAdminController.getOverview));
router.post('/provision',          requirePermission('tenants:manage'), asyncHandler(SuperAdminController.provisionTenant));
router.get('/current',             asyncHandler(SuperAdminController.getCurrentTenant));
router.patch('/current',           asyncHandler(SuperAdminController.updateCurrentTenant));
router.patch('/:id/status',        requirePermission('tenants:manage'), asyncHandler(SuperAdminController.updateTenantStatus));

export default router;
