import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware';
import { getTaxOverview, generateEInvoice } from '../../controllers/taxeway.controller';

const router = Router();

router.use(auth());
router.get('/overview', getTaxOverview);
router.post('/e-invoice', generateEInvoice);

export default router;
