import { Router } from 'express';
import { SuperAdminController } from '../../controllers/superadmin.controller';
import { auth } from '../../middlewares/auth.middleware';
import { requirePlatformSuperAdmin } from '../../middlewares/rbac.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';

const router = Router();
router.use(auth());

router.get('/overview',            requirePlatformSuperAdmin(), asyncHandler(SuperAdminController.getOverview));
router.get('/tenants',             requirePlatformSuperAdmin(), asyncHandler(SuperAdminController.listTenants));
router.get('/',                    requirePlatformSuperAdmin(), asyncHandler(SuperAdminController.getOverview));
router.post('/provision',          requirePlatformSuperAdmin(), asyncHandler(SuperAdminController.provisionTenant));

router.get('/plans',               requirePlatformSuperAdmin(), asyncHandler(SuperAdminController.getPlans));
router.post('/plans',              requirePlatformSuperAdmin(), asyncHandler(SuperAdminController.createPlan));
router.patch('/plans/:id',         requirePlatformSuperAdmin(), asyncHandler(SuperAdminController.updatePlan));
router.delete('/plans/:id',        requirePlatformSuperAdmin(), asyncHandler(SuperAdminController.deletePlan));

router.get('/platform-details',    requirePlatformSuperAdmin(), asyncHandler(SuperAdminController.getPlatformDetails));
router.patch('/platform-details',  requirePlatformSuperAdmin(), asyncHandler(SuperAdminController.updatePlatformDetails));

router.patch('/tenants/:id/status',requirePlatformSuperAdmin(), asyncHandler(SuperAdminController.updateTenantStatus));
router.delete('/tenants/:id',      requirePlatformSuperAdmin(), asyncHandler(SuperAdminController.deleteTenant));
router.post('/cache/purge',         requirePlatformSuperAdmin(), asyncHandler(SuperAdminController.purgeAllCache));

// Telegram Bot Automation Settings
router.get('/telegram-config',     requirePlatformSuperAdmin(), asyncHandler(SuperAdminController.getTelegramConfig));
router.post('/telegram-config',    requirePlatformSuperAdmin(), asyncHandler(SuperAdminController.updateTelegramConfig));
router.post('/telegram-test',      requirePlatformSuperAdmin(), asyncHandler(SuperAdminController.testTelegramBot));

export default router;

