import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware';
import { getSustainabilityMetrics, logWasteEntry } from '../../controllers/sustainability.controller';

const router = Router();

router.use(auth());
router.get('/metrics', getSustainabilityMetrics);
router.post('/waste-log', logWasteEntry);

export default router;
