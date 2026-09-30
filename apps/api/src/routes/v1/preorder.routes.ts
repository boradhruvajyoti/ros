// =============================================================================
// Pre-Order Routes — Public Welcome Page, Pre-Order Placement & Token Tracking
// =============================================================================

import { Router } from 'express';
import { PreOrderController } from '../../controllers/preorder.controller';
import { asyncHandler } from '../../middlewares/error.middleware';

const router = Router();

// Public Restaurant Details & Menu for Pre-Order by Slug
router.get('/restaurants/:slug', asyncHandler(PreOrderController.getRestaurantBySlug));

// Public Pre-Order Placement
router.post('/restaurants/:slug/order', asyncHandler(PreOrderController.submitPreOrder));

// Public Order Tracking by Unique Token
router.get('/track/:token', asyncHandler(PreOrderController.getOrderByTrackingToken));

// Public Payment Link Completion
router.post('/track/:token/pay', asyncHandler(PreOrderController.processPreOrderPayment));

export default router;
