import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware';
import { getCellarInventory, getPairingRecommendations } from '../../controllers/cellar.controller';

const router = Router();

router.use(auth());
router.get('/inventory', getCellarInventory);
router.get('/pairings', getPairingRecommendations);

export default router;
