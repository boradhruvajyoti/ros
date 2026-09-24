import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware';
import { getVoiceCalls, simulateInboundCall } from '../../controllers/voice.controller';

const router = Router();

router.use(auth());
router.get('/calls', getVoiceCalls);
router.post('/simulate', simulateInboundCall);

export default router;
