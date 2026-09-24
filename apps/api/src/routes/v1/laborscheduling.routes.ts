import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware';
import { getLaborRoster, autoGenerateOptimalRoster } from '../../controllers/laborscheduling.controller';

const router = Router();

router.use(auth());
router.get('/roster', getLaborRoster);
router.post('/auto-optimize', autoGenerateOptimalRoster);

export default router;
