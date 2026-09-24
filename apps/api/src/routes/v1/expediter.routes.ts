import { Router } from 'express';
import { ExpediterController } from '../../controllers/expediter.controller';
import { auth } from '../../middlewares/auth.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';

const router = Router();
router.use(auth());

router.get('/queue', asyncHandler(ExpediterController.getPassQueue));
router.get('/pass', asyncHandler(ExpediterController.getPassQueue));
router.get('/', asyncHandler(ExpediterController.getPassQueue));
router.post('/page-waiter', asyncHandler(ExpediterController.pageWaiter));
router.post('/mark-served', asyncHandler(ExpediterController.markServed));

export default router;
