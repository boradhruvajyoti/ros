import { Router } from 'express';
import { MarketingController } from '../../controllers/marketing.controller';
import { auth } from '../../middlewares/auth.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';

const router = Router();
router.use(auth());

router.get('/promotions', asyncHandler(MarketingController.listPromotions));
router.post('/promotions', asyncHandler(MarketingController.createCampaign));
router.post('/broadcast', asyncHandler(MarketingController.broadcastSms));

export default router;
