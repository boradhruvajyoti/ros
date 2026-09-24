import { Router } from 'express';
import { SuperAdminController } from '../../controllers/superadmin.controller';
import { auth } from '../../middlewares/auth.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';

const router = Router();
router.use(auth());

router.get('/overview', asyncHandler(SuperAdminController.getOverview));
router.get('/tenants', asyncHandler(SuperAdminController.listTenants));
router.get('/', asyncHandler(SuperAdminController.getOverview));
router.post('/provision', asyncHandler(SuperAdminController.provisionTenant));
router.patch('/tenants/:id', asyncHandler(SuperAdminController.updateTenantStatus));

export default router;
