import { Router } from 'express';
import { FranchiseController } from '../../controllers/franchise.controller';
import { auth } from '../../middlewares/auth.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';

const router = Router();
router.use(auth());

router.get('/overview', asyncHandler(FranchiseController.getOverview));
router.post('/generate-invoice', asyncHandler(FranchiseController.generateInvoice));

export default router;
