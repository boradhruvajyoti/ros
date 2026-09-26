// =============================================================================
// Report Routes
// =============================================================================

import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';
import { ReportController } from '../../controllers/report.controller';

const router = Router();

router.use(auth());

router.get('/summary', requirePermission('reports:view'), asyncHandler(ReportController.getSummary));
router.get('/financial-analytics', requirePermission('reports:view'), asyncHandler(ReportController.getFinancialAnalytics));
router.get('/daily-summary', requirePermission('reports:view'), asyncHandler(ReportController.getSummary));
router.get('/sales', requirePermission('reports:view'), asyncHandler(ReportController.getSalesReport));
router.get('/payments', requirePermission('reports:view'), asyncHandler(ReportController.getPaymentReport));
router.get('/tax', requirePermission('reports:view'), asyncHandler(ReportController.getTaxReport));
router.post('/telegram/daily-sales', requirePermission('reports:export'), asyncHandler(ReportController.triggerDailySalesTelegram));
router.post('/telegram/daily-expenses', requirePermission('reports:export'), asyncHandler(ReportController.triggerDailyExpensesTelegram));
router.post('/telegram/monthly', requirePermission('reports:export'), asyncHandler(ReportController.triggerMonthlyReportTelegram));
router.get('/', requirePermission('reports:view'), asyncHandler(ReportController.getSummary));

export default router;
