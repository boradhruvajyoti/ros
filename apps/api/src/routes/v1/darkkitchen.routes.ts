import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware';
import { getDarkKitchenStatus, updateOrderStatus } from '../../controllers/darkkitchen.controller';

const router = Router();

router.use(auth());
router.get('/status', getDarkKitchenStatus);
router.patch('/orders/:orderId/status', updateOrderStatus);

export default router;
