import { Router } from 'express';
import { DriveThruController } from '../../controllers/drivethru.controller';
import { auth } from '../../middlewares/auth.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';

const router = Router();
router.use(auth());

router.get('/status', asyncHandler(DriveThruController.getLaneStatus));
router.post('/handoff', asyncHandler(DriveThruController.completeHandoff));

export default router;
