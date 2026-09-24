import { Router } from 'express';
import { TransferController } from '../../controllers/transfer.controller';
import { auth } from '../../middlewares/auth.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';

const router = Router();
router.use(auth());

router.get('/', asyncHandler(TransferController.listTransfers));
router.post('/', asyncHandler(TransferController.createTransfer));
router.post('/:id/receive', asyncHandler(TransferController.receiveTransfer));

export default router;
