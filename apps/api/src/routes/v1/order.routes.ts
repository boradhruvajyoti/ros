// =============================================================================
// Order routes
// =============================================================================

import { Router } from 'express';
import { OrderController } from '../../controllers/order.controller';
import { auth } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';

const router = Router();

router.use(auth());

router.get('/',                  requirePermission('orders:view'),   asyncHandler(OrderController.list));
router.get('/active',            requirePermission('orders:view'),   asyncHandler(OrderController.listActive));
router.post('/',                 requirePermission('orders:create'), asyncHandler(OrderController.create));
router.get('/:id',               requirePermission('orders:view'),   asyncHandler(OrderController.getOne));
router.patch('/:id/status',      requirePermission('orders:edit'),   asyncHandler(OrderController.updateStatus));
router.post('/:id/status',       requirePermission('orders:edit'),   asyncHandler(OrderController.updateStatus));
router.put('/:id/items',         requirePermission('orders:edit'),   asyncHandler(OrderController.updateItems));
router.patch('/:id/items',       requirePermission('orders:edit'),   asyncHandler(OrderController.updateItems));
router.post('/:id/items',        requirePermission('orders:edit'),   asyncHandler(OrderController.addItem));
router.delete('/:id/items/:itemId', requirePermission('orders:void'), asyncHandler(OrderController.voidItem));
router.post('/:id/discount',     requirePermission('discount:apply'), asyncHandler(OrderController.applyDiscount));
router.post('/:id/payments',     requirePermission('payments:create'), asyncHandler(OrderController.addPayment));
router.post('/:id/refund',       requirePermission('orders:refund'), asyncHandler(OrderController.refund));
router.get('/:id/invoice',       requirePermission('orders:view'),   asyncHandler(OrderController.getInvoice));
router.post('/:id/kots',         requirePermission('orders:edit'),   asyncHandler(OrderController.sendToKitchen));
router.get('/:id/kots',          requirePermission('kitchen:view'),  asyncHandler(OrderController.getKots));

export default router;
