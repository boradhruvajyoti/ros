import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware';
import { getBanquetEvents, createBanquetEvent } from '../../controllers/catering.controller';

const router = Router();

router.use(auth());
router.get('/events', getBanquetEvents);
router.post('/events', createBanquetEvent);

export default router;
