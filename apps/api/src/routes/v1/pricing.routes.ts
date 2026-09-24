import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware';
import { getDynamicPricingOverview, toggleRule } from '../../controllers/pricing.controller';

const router = Router();

router.use(auth());
router.get('/overview', getDynamicPricingOverview);
router.patch('/rules/:ruleId/toggle', toggleRule);

export default router;
