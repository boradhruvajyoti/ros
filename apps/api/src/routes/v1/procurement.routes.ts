// =============================================================================
// Procurement Routes
// =============================================================================

import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';
import { ProcurementController } from '../../controllers/procurement.controller';

const router = Router();

router.use(auth());

router.get('/suppliers', requirePermission('procurement:view'), asyncHandler(ProcurementController.listSuppliers));
router.post('/suppliers', requirePermission('procurement:create'), asyncHandler(ProcurementController.createSupplier));
router.get('/orders', requirePermission('procurement:view'), asyncHandler(ProcurementController.listPurchaseOrders));
router.get('/purchase-orders', requirePermission('procurement:view'), asyncHandler(ProcurementController.listPurchaseOrders));
router.post('/orders', requirePermission('procurement:create'), asyncHandler(ProcurementController.createPurchaseOrder));
router.post('/purchase-orders', requirePermission('procurement:create'), asyncHandler(ProcurementController.createPurchaseOrder));

export default router;
