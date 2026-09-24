import { Router } from 'express';
import { AiController } from '../../controllers/ai.controller';
import { auth } from '../../middlewares/auth.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';

const router = Router();
router.use(auth());

router.get('/forecast', asyncHandler(AiController.getForecast));
router.get('/demand-forecast', asyncHandler(AiController.getForecast));
router.get('/sales-forecast', asyncHandler(AiController.getForecast));
router.get('/recommendations', asyncHandler(AiController.getRecommendations));
router.get('/', asyncHandler(AiController.getForecast));
router.post('/optimize-shifts', asyncHandler(AiController.optimizeShiftSchedule));

export default router;
