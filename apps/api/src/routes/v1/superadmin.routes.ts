import { Router } from 'express';
import { SuperAdminController } from '../../controllers/superadmin.controller';
import { auth } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';

const router = Router();
router.use(auth());

router.get('/overview',            requirePermission('tenants:manage'), asyncHandler(SuperAdminController.getOverview));
router.get('/tenants',             requirePermission('tenants:manage'), asyncHandler(SuperAdminController.listTenants));
router.get('/',                    requirePermission('tenants:manage'), asyncHandler(SuperAdminController.getOverview));
router.post('/provision',          requirePermission('tenants:manage'), asyncHandler(SuperAdminController.provisionTenant));

router.get('/plans',               requirePermission('tenants:manage'), asyncHandler(SuperAdminController.getPlans));
router.post('/plans',              requirePermission('tenants:manage'), asyncHandler(SuperAdminController.createPlan));
router.patch('/plans/:id',         requirePermission('tenants:manage'), asyncHandler(SuperAdminController.updatePlan));
router.delete('/plans/:id',        requirePermission('tenants:manage'), asyncHandler(SuperAdminController.deletePlan));

router.get('/platform-details',    requirePermission('tenants:manage'), asyncHandler(SuperAdminController.getPlatformDetails));
router.patch('/platform-details',  requirePermission('tenants:manage'), asyncHandler(SuperAdminController.updatePlatformDetails));

router.patch('/tenants/:id/status',requirePermission('tenants:manage'), asyncHandler(SuperAdminController.updateTenantStatus));
router.patch('/tenants/:id',       requirePermission('tenants:manage'), asyncHandler(SuperAdminController.updateTenant));
router.delete('/tenants/:id',      requirePermission('tenants:manage'), asyncHandler(SuperAdminController.deleteTenant));

export default router;

