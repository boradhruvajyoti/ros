import { Router } from 'express';
import { GiftCardController } from '../../controllers/giftcard.controller';
import { auth } from '../../middlewares/auth.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';

const router = Router();
router.use(auth());

router.get('/cards', asyncHandler(GiftCardController.listGiftCards));
router.post('/cards', asyncHandler(GiftCardController.issueCard));
router.post('/redeem', asyncHandler(GiftCardController.redeemBalance));

export default router;
