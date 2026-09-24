// =============================================================================
// Kitchen routes
// =============================================================================

import { Router } from 'express';
import { KitchenController } from '../../controllers/kitchen.controller';
import { auth } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';

const router = Router();
router.use(auth());

router.get('/stations',               requirePermission('kitchen:view'),   asyncHandler(KitchenController.listStations));
router.post('/stations',              requirePermission('settings:edit'),  asyncHandler(KitchenController.createStation));
router.patch('/stations/:id',         requirePermission('settings:edit'),  asyncHandler(KitchenController.updateStation));

router.get('/queue',                  requirePermission('kitchen:view'),   asyncHandler(KitchenController.getQueue));
router.get('/kots',                   requirePermission('kitchen:view'),   asyncHandler(KitchenController.getQueue));
router.get('/',                       requirePermission('kitchen:view'),   asyncHandler(KitchenController.getQueue));
router.patch('/kots/:kotId/status',   requirePermission('kitchen:update'), asyncHandler(KitchenController.updateKotStatus));
router.patch('/kots/:kotId/items/:itemId/status', requirePermission('kitchen:update'), asyncHandler(KitchenController.updateKotItemStatus));

export default router;
