import { Router } from 'express';
import { AuditController } from '../../controllers/audit.controller';
import { auth } from '../../middlewares/auth.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';

const router = Router();
router.use(auth());

router.get('/logs', asyncHandler(AuditController.listLogs));
router.get('/', asyncHandler(AuditController.listLogs));

export default router;
