// =============================================================================
// Payment Routes
// =============================================================================

import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';
import { PaymentController } from '../../controllers/payment.controller';

const router = Router();

router.use(auth());

router.post('/', requirePermission('payments:create'), asyncHandler(PaymentController.addPayment));
router.post('/refund', requirePermission('payments:refund'), asyncHandler(PaymentController.refund));
router.get('/', requirePermission('payments:view'), asyncHandler(PaymentController.listPayments));

export default router;
