import { Router } from 'express';
import { KioskController } from '../../controllers/kiosk.controller';
import { asyncHandler } from '../../middlewares/error.middleware';

const router = Router();

// Public kiosk endpoints (touch screen client)
router.get('/menu', asyncHandler(KioskController.getKioskMenu));
router.post('/order', asyncHandler(KioskController.submitKioskOrder));

export default router;
