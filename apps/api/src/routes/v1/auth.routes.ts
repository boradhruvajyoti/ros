// =============================================================================
// Auth routes
// =============================================================================

import { Router } from 'express';
import { AuthController } from '../../controllers/auth.controller';
import { auth } from '../../middlewares/auth.middleware';
import { authRateLimit } from '../../middlewares/rateLimit.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';

const router = Router();

router.post('/onboard',      authRateLimit, asyncHandler(AuthController.onboard));
router.post('/parse-menu',   authRateLimit, asyncHandler(AuthController.parseMenu));
router.post('/login',        authRateLimit, asyncHandler(AuthController.login));
router.post('/logout',       auth(), asyncHandler(AuthController.logout));
router.post('/refresh',      asyncHandler(AuthController.refresh));
router.post('/forgot-password', authRateLimit, asyncHandler(AuthController.forgotPassword));
router.post('/reset-password',  authRateLimit, asyncHandler(AuthController.resetPassword));
router.get('/me',            auth(), asyncHandler(AuthController.me));
router.patch('/me/password', auth(), asyncHandler(AuthController.changePassword));
router.post('/switch-branch', auth(), asyncHandler(AuthController.switchBranch));
router.post('/switch-tenant', auth(), asyncHandler(AuthController.switchTenant));

export default router;
