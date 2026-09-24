import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware';
import { getVIPCheckIns, simulateVIPCheckIn } from '../../controllers/vipbiometrics.controller';

const router = Router();

router.use(auth());
router.get('/checkins', getVIPCheckIns);
router.post('/simulate', simulateVIPCheckIn);

export default router;
