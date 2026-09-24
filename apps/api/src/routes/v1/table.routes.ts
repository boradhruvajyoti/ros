// =============================================================================
// Table routes — Dining Room, Floor Map & Public Table QR
// =============================================================================

import { Router } from 'express';
import { TableController } from '../../controllers/table.controller';
import { auth } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';

const router = Router();

// ── Public Guest QR Routes (Unauthenticated) ──────────────────────────────────
router.get('/public/qr/:token', asyncHandler(TableController.getPublicTableDetails));
router.post('/public/qr/:token/order', asyncHandler(TableController.submitPublicTableOrder));
router.get('/public/qr/:token/orders/:orderId', asyncHandler(TableController.getPublicOrderStatus));

// ── Authenticated Staff Routes ────────────────────────────────────────────────
router.use(auth());

router.get('/floors',                requirePermission('tables:view'),   asyncHandler(TableController.listFloors));
router.post('/floors',               requirePermission('tables:create'), asyncHandler(TableController.createFloor));
router.patch('/floors/:id',          requirePermission('tables:edit'),   asyncHandler(TableController.updateFloor));

router.get('/',                      requirePermission('tables:view'),   asyncHandler(TableController.list));
router.post('/',                     requirePermission('tables:create'), asyncHandler(TableController.create));
router.get('/:id',                   requirePermission('tables:view'),   asyncHandler(TableController.getOne));
router.patch('/:id',                 requirePermission('tables:edit'),   asyncHandler(TableController.update));
router.patch('/:id/status',          requirePermission('tables:edit'),   asyncHandler(TableController.updateStatus));
router.delete('/:id',                requirePermission('tables:delete'), asyncHandler(TableController.delete));
router.post('/:id/qr',               requirePermission('tables:edit'),   asyncHandler(TableController.generateQr));

export default router;
