import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';
import { SuperAdminController } from '../../controllers/superadmin.controller';

const router = Router();
router.use(auth());

// Global Overview & Provisioning
router.get('/',                    requirePermission('tenants:manage'), asyncHandler(SuperAdminController.getOverview));
router.post('/provision',          requirePermission('tenants:manage'), asyncHandler(SuperAdminController.provisionTenant));

// SaaS Pricing Plans Management
router.get('/plans',               requirePermission('tenants:manage'), asyncHandler(SuperAdminController.getPlans));
router.post('/plans',              requirePermission('tenants:manage'), asyncHandler(SuperAdminController.createPlan));
router.patch('/plans/:id',         requirePermission('tenants:manage'), asyncHandler(SuperAdminController.updatePlan));
router.delete('/plans/:id',        requirePermission('tenants:manage'), asyncHandler(SuperAdminController.deletePlan));

// Platform Config & Infrastructure Details
router.get('/platform-details',    requirePermission('tenants:manage'), asyncHandler(SuperAdminController.getPlatformDetails));
router.patch('/platform-details',  requirePermission('tenants:manage'), asyncHandler(SuperAdminController.updatePlatformDetails));

// Current Tenant Context
router.get('/current',             asyncHandler(SuperAdminController.getCurrentTenant));
router.patch('/current',           asyncHandler(SuperAdminController.updateCurrentTenant));

// Individual Tenant Administration
router.patch('/:id/status',        requirePermission('tenants:manage'), asyncHandler(SuperAdminController.updateTenantStatus));
router.patch('/:id',               requirePermission('tenants:manage'), asyncHandler(SuperAdminController.updateTenant));
router.delete('/:id',              requirePermission('tenants:manage'), asyncHandler(SuperAdminController.deleteTenant));

export default router;

