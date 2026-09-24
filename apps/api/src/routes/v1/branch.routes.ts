import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware';
import { asyncHandler, sendSuccess } from '../../middlewares/error.middleware';
const router = Router();
router.use(auth());
router.get('/', asyncHandler(async (_req, res) => { sendSuccess(res, []); }));
export default router;
