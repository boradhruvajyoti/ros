import { Router } from 'express';
import { HardwareController } from '../../controllers/hardware.controller';
import { auth } from '../../middlewares/auth.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';

const router = Router();
router.use(auth());

router.get('/devices', asyncHandler(HardwareController.listDevices));
router.post('/devices', asyncHandler(HardwareController.createDevice));
router.delete('/devices/:id', asyncHandler(HardwareController.deleteDevice));
router.post('/test-print', asyncHandler(HardwareController.testPrint));
router.post('/cash-drawer/kick', asyncHandler(HardwareController.kickCashDrawer));

export default router;
