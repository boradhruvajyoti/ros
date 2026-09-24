import { Router } from 'express';
import { IotController } from '../../controllers/iot.controller';
import { auth } from '../../middlewares/auth.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';

const router = Router();
router.use(auth());

router.get('/sensors', asyncHandler(IotController.listSensors));
router.get('/telemetry', asyncHandler(IotController.listSensors));
router.get('/', asyncHandler(IotController.listSensors));
router.post('/manual-reading', asyncHandler(IotController.logManualReading));

export default router;
