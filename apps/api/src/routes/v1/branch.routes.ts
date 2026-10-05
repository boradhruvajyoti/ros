// =============================================================================
// Branch / Outlet Routes — Multi-Outlet REST API
// =============================================================================

import { Router } from 'express';
import { auth } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';
import { BranchController } from '../../controllers/branch.controller';

const router = Router();
router.use(auth());

// List & details
router.get('/', asyncHandler(BranchController.listBranches));
router.get('/:id', asyncHandler(BranchController.getBranch));
router.get('/:id/stats', asyncHandler(BranchController.getBranchStats));

// Switch active branch
router.post('/switch', asyncHandler(BranchController.switchBranch));

// Management (Owners / Admins / Super Admins)
router.post('/', requirePermission('branches:create', 'settings:edit'), asyncHandler(BranchController.createBranch));
router.patch('/:id', requirePermission('branches:edit', 'settings:edit'), asyncHandler(BranchController.updateBranch));
router.delete('/:id', requirePermission('branches:create', 'settings:edit'), asyncHandler(BranchController.deleteBranch));

export default router;
