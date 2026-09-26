// =============================================================================
// Menu routes
// =============================================================================

import { Router } from 'express';
import { MenuController } from '../../controllers/menu.controller';
import { auth } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';
import { asyncHandler } from '../../middlewares/error.middleware';

const router = Router();
router.use(auth());

// Categories & POS Menu
router.get('/pos-menu',               requirePermission('menu:view', 'orders:create', 'orders:view', 'tables:view'),   asyncHandler(MenuController.getPosMenu));
router.get('/categories',             requirePermission('menu:view', 'orders:create', 'orders:view', 'tables:view'),   asyncHandler(MenuController.listCategories));
router.post('/categories',            requirePermission('menu:create'), asyncHandler(MenuController.createCategory));
router.patch('/categories/:id',       requirePermission('menu:edit'),   asyncHandler(MenuController.updateCategory));
router.delete('/categories/:id',      requirePermission('menu:delete'), asyncHandler(MenuController.deleteCategory));

// Items
router.get('/items',                  requirePermission('menu:view', 'orders:create', 'orders:view', 'tables:view'),   asyncHandler(MenuController.listItems));
router.post('/items',                 requirePermission('menu:create'), asyncHandler(MenuController.createItem));
router.post('/items/batch-delete',    requirePermission('menu:delete'), asyncHandler(MenuController.batchDeleteItems));
router.delete('/items/batch',         requirePermission('menu:delete'), asyncHandler(MenuController.batchDeleteItems));
router.get('/items/:id',              requirePermission('menu:view', 'orders:create', 'orders:view', 'tables:view'),   asyncHandler(MenuController.getItem));
router.patch('/items/:id',            requirePermission('menu:edit'),   asyncHandler(MenuController.updateItem));
router.delete('/items/:id',           requirePermission('menu:delete'), asyncHandler(MenuController.deleteItem));
router.patch('/items/:id/availability', requirePermission('menu:edit'), asyncHandler(MenuController.toggleAvailability));

// Variants
router.post('/items/:id/variants',    requirePermission('menu:edit'),   asyncHandler(MenuController.addVariant));
router.patch('/variants/:id',         requirePermission('menu:edit'),   asyncHandler(MenuController.updateVariant));
router.delete('/variants/:id',        requirePermission('menu:delete'), asyncHandler(MenuController.deleteVariant));

// Modifier groups
router.get('/modifier-groups',        requirePermission('menu:view', 'orders:create', 'orders:view', 'tables:view'),   asyncHandler(MenuController.listModifierGroups));
router.get('/modifiers',              requirePermission('menu:view', 'orders:create', 'orders:view', 'tables:view'),   asyncHandler(MenuController.listModifierGroups));
router.post('/modifier-groups',       requirePermission('menu:create'), asyncHandler(MenuController.createModifierGroup));
router.post('/modifiers',              requirePermission('menu:create'), asyncHandler(MenuController.createModifierGroup));
router.patch('/modifier-groups/:id',  requirePermission('menu:edit'),   asyncHandler(MenuController.updateModifierGroup));
router.delete('/modifier-groups/:id', requirePermission('menu:delete'), asyncHandler(MenuController.deleteModifierGroup));
router.post('/modifier-groups/:id/modifiers', requirePermission('menu:edit'), asyncHandler(MenuController.addModifier));

// Upload OCR Parser & Batch Import (zero server image retention)
router.post('/upload-parse',          requirePermission('menu:create'), asyncHandler(MenuController.parseUpload));
router.post('/batch-import',          requirePermission('menu:create'), asyncHandler(MenuController.batchImport));

// Export Menu in PDF (zero server file retention)
router.get('/export-pdf',             requirePermission('menu:view', 'orders:view'),   asyncHandler(MenuController.exportMenuPdf));

export default router;
