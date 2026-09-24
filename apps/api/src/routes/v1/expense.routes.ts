// =============================================================================
// Expense Routes
// =============================================================================

import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';
import { ExpenseController } from '../../controllers/expense.controller';

const router = Router();

router.use(auth());

router.get('/summary', requirePermission('expenses:view'), asyncHandler(ExpenseController.getSummary));
router.get('/', requirePermission('expenses:view'), asyncHandler(ExpenseController.listExpenses));
router.post('/', requirePermission('expenses:create'), asyncHandler(ExpenseController.createExpense));

export default router;
