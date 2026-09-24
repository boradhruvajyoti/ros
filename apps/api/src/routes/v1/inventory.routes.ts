// =============================================================================
// Inventory Routes
// =============================================================================

import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';
import { InventoryController } from '../../controllers/inventory.controller';
import { ProcurementController } from '../../controllers/procurement.controller';

const router = Router();

router.use(auth());

router.get('/ingredients', requirePermission('inventory:view'), asyncHandler(InventoryController.listIngredients));
router.post('/ingredients', requirePermission('inventory:adjust'), asyncHandler(InventoryController.createIngredient));
router.get('/items', requirePermission('inventory:view'), asyncHandler(InventoryController.listIngredients));
router.post('/items', requirePermission('inventory:adjust'), asyncHandler(InventoryController.createIngredient));
router.get('/stock', requirePermission('inventory:view'), asyncHandler(InventoryController.listIngredients));
router.get('/', requirePermission('inventory:view'), asyncHandler(InventoryController.listIngredients));
router.post('/adjust', requirePermission('inventory:adjust'), asyncHandler(InventoryController.adjustStock));

// Procurement cross-links
router.get('/suppliers', requirePermission('procurement:view'), asyncHandler(ProcurementController.listSuppliers));
router.post('/suppliers', requirePermission('procurement:create'), asyncHandler(ProcurementController.createSupplier));
router.get('/purchase-orders', requirePermission('procurement:view'), asyncHandler(ProcurementController.listPurchaseOrders));
router.post('/purchase-orders', requirePermission('procurement:create'), asyncHandler(ProcurementController.createPurchaseOrder));

export default router;
