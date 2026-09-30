import { Router } from 'express';
import { MarketingController } from '../../controllers/marketing.controller';
import { auth } from '../../middlewares/auth.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';

const router = Router();

// ── Public Endpoint for QR Menu & Customer Standee ──────────────────────────
router.get('/public/active', asyncHandler(MarketingController.listPublicActivePromotions));

// ── Authenticated Staff / Admin Routes ───────────────────────────────────────
router.use(auth());

router.get('/promotions', asyncHandler(MarketingController.listPromotions));
router.post('/promotions', asyncHandler(MarketingController.createCampaign));
router.patch('/promotions/:id/status', asyncHandler(MarketingController.togglePromotionStatus));
router.delete('/promotions/:id', asyncHandler(MarketingController.deletePromotion));
router.post('/broadcast', asyncHandler(MarketingController.broadcastSms));

export default router;

