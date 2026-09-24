import { Router } from 'express';
import { FeedbackController } from '../../controllers/feedback.controller';
import { auth } from '../../middlewares/auth.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';

const router = Router();

// Public feedback submission endpoint (e.g. from QR code scan)
router.post('/submit', asyncHandler(FeedbackController.submitReview));
router.post('/', asyncHandler(FeedbackController.submitReview));

// Authenticated staff/manager reviews viewing
router.get('/reviews', auth(), asyncHandler(FeedbackController.listReviews));
router.get('/stats', auth(), asyncHandler(FeedbackController.getStats));
router.get('/', auth(), asyncHandler(FeedbackController.listReviews));

export default router;
