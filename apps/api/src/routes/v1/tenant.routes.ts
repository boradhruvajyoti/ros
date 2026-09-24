import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware';
import { requirePlatformSuperAdmin } from '../../middlewares/rbac.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';
import { SuperAdminController } from '../../controllers/superadmin.controller';

const router = Router();
router.use(auth());

// Global Overview & Provisioning (Platform Owner only)
router.get('/',                    requirePlatformSuperAdmin(), asyncHandler(SuperAdminController.getOverview));
router.post('/provision',          requirePlatformSuperAdmin(), asyncHandler(SuperAdminController.provisionTenant));

// SaaS Pricing Plans Management
router.get('/plans',               requirePlatformSuperAdmin(), asyncHandler(SuperAdminController.getPlans));
router.post('/plans',              requirePlatformSuperAdmin(), asyncHandler(SuperAdminController.createPlan));
router.patch('/plans/:id',         requirePlatformSuperAdmin(), asyncHandler(SuperAdminController.updatePlan));
router.delete('/plans/:id',        requirePlatformSuperAdmin(), asyncHandler(SuperAdminController.deletePlan));

// Platform Config & Infrastructure Details
router.get('/platform-details',    requirePlatformSuperAdmin(), asyncHandler(SuperAdminController.getPlatformDetails));
router.patch('/platform-details',  requirePlatformSuperAdmin(), asyncHandler(SuperAdminController.updatePlatformDetails));

// Current Tenant Context (Available to any authenticated tenant user for their own restaurant)
router.get('/current',             asyncHandler(SuperAdminController.getCurrentTenant));
router.patch('/current',           asyncHandler(SuperAdminController.updateCurrentTenant));

// Individual Tenant Administration
router.patch('/:id/status',        requirePlatformSuperAdmin(), asyncHandler(SuperAdminController.updateTenantStatus));
router.patch('/:id',               requirePlatformSuperAdmin(), asyncHandler(SuperAdminController.updateTenant));
router.delete('/:id',              requirePlatformSuperAdmin(), asyncHandler(SuperAdminController.deleteTenant));

export default router;

