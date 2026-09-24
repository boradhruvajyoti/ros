import { Router } from 'express';
import { IntegrationsController } from '../../controllers/integrations.controller';
import { auth } from '../../middlewares/auth.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';

const router = Router();
router.use(auth());

router.get('/channels', asyncHandler(IntegrationsController.getChannels));
router.get('/status', asyncHandler(IntegrationsController.getChannels));
router.get('/', asyncHandler(IntegrationsController.getChannels));
router.post('/auto-accept', asyncHandler(IntegrationsController.toggleAutoAccept));
router.post('/sync-menu', asyncHandler(IntegrationsController.syncMenu));
router.post('/simulate-order', asyncHandler(IntegrationsController.simulateIncomingOrder));

export default router;
