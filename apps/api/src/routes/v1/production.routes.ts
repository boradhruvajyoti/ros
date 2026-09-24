import { Router } from 'express';
import { ProductionController } from '../../controllers/production.controller';
import { auth } from '../../middlewares/auth.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';

const router = Router();
router.use(auth());

router.get('/batches', asyncHandler(ProductionController.listBatches));
router.post('/batches', asyncHandler(ProductionController.startBatch));

export default router;
