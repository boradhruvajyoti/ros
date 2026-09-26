// =============================================================================
// Inventory Controller — Stock Levels, Movements & Wastage
// =============================================================================

import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendSuccess } from '../middlewares/error.middleware';
import { writeAuditLog, AuditActions } from '../middlewares/audit.middleware';
import { TelegramService } from '../services/telegram.service';
import { generateULID } from '@ros/utils';
import { z } from 'zod';

const createIngredientSchema = z.object({
  name: z.string().min(1),
  unit: z.string().min(1),
  costPerUnit: z.number().nonnegative().optional(),
  currentStock: z.number().nonnegative().optional(),
  lowStockThreshold: z.number().nonnegative().optional(),
  reorderLevel: z.number().nonnegative().optional(),
  categoryName: z.string().optional(),
});

const adjustStockSchema = z.object({
  ingredientId: z.string(),
  movementType: z.enum(['STOCK_IN', 'WASTAGE', 'ADJUSTMENT', 'RETURN']),
  quantity: z.number(),
  unitCost: z.number().optional(),
  batchNumber: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export class InventoryController {
  static async listIngredients(req: Request, res: Response) {
    const ingredients = await prisma.ingredient.findMany({
      where: {
        tenantId: req.user!.tid,
        branchId: req.user!.bid!,
        isActive: true,
      },
      include: { category: true },
      orderBy: { name: 'asc' },
    });

    sendSuccess(res, ingredients);
  }

  static async createIngredient(req: Request, res: Response) {
    const data = createIngredientSchema.parse(req.body);

    let categoryId: string | undefined;
    if (data.categoryName) {
      let cat = await prisma.ingredientCategory.findFirst({
        where: {
          tenantId: req.user!.tid,
          branchId: req.user!.bid!,
          name: data.categoryName,
        },
      });
      if (!cat) {
        cat = await prisma.ingredientCategory.create({
          data: {
            tenantId: req.user!.tid,
            branchId: req.user!.bid!,
            name: data.categoryName,
          },
        });
      }
      categoryId = cat.id;
    }

    const ingredient = await prisma.ingredient.create({
      data: {
        tenantId: req.user!.tid,
        branchId: req.user!.bid!,
        name: data.name,
        unit: data.unit.toUpperCase(),
        costPerUnit: data.costPerUnit || 0,
        currentStock: data.currentStock || 0,
        lowStockThreshold: data.lowStockThreshold || 0,
        reorderLevel: data.reorderLevel || 0,
        categoryId: categoryId || null,
      },
      include: { category: true },
    });

    // Dispatch Telegram Bot Notification (INVENTORY_MODIFIED)
    TelegramService.sendNotificationToTenant(
      req.user!.tid,
      'INVENTORY_MODIFIED',
      `📦 <b>New Inventory Stock Item Added!</b>\n\n• <b>Item:</b> ${ingredient.name}\n• <b>Current Stock:</b> ${ingredient.currentStock} ${ingredient.unit}\n• <b>Cost/Unit:</b> ₹${ingredient.costPerUnit}\n• <b>Added By:</b> ${req.user!.email || 'Staff'}`
    ).catch((e) => console.error('[Telegram Inventory Alert Error]:', e));

    sendSuccess(res, ingredient, 201);
  }

  static async adjustStock(req: Request, res: Response) {
    const data = adjustStockSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      const ingredient = await tx.ingredient.findFirst({
        where: { id: data.ingredientId, tenantId: req.user!.tid },
      });
      if (!ingredient) throw new Error('Ingredient not found');

      const isOutflow = ['WASTAGE', 'RETURN'].includes(data.movementType);
      const delta = isOutflow ? -Math.abs(data.quantity) : data.quantity;
      const newStock = Math.max(0, Number(ingredient.currentStock) + delta);

      const ledger = await tx.stockLedger.create({
        data: {
          id: generateULID(),
          tenantId: req.user!.tid,
          branchId: req.user!.bid!,
          ingredientId: data.ingredientId,
          movementType: data.movementType,
          quantity: delta,
          unitCost: data.unitCost || ingredient.costPerUnit,
          batchNumber: data.batchNumber || null,
          notes: data.notes || null,
          createdBy: req.user!.sub,
        },
      });

      const updated = await tx.ingredient.update({
        where: { id: data.ingredientId },
        data: { currentStock: newStock },
        include: { category: true },
      });

      return { ledger, ingredient: updated };
    });

    writeAuditLog(req, {
      action: AuditActions.INVENTORY_ADJUST,
      entity: 'Ingredient',
      entityId: data.ingredientId,
      newValue: { type: data.movementType, quantity: data.quantity },
    });

    // Dispatch Telegram Bot Notification (INVENTORY_MODIFIED)
    TelegramService.sendNotificationToTenant(
      req.user!.tid,
      'INVENTORY_MODIFIED',
      `📦 <b>Inventory Stock Adjusted</b>\n\n• <b>Item:</b> ${result.ingredient.name}\n• <b>Movement:</b> ${data.movementType}\n• <b>Change:</b> ${data.quantity} ${result.ingredient.unit}\n• <b>New Level:</b> ${result.ingredient.currentStock} ${result.ingredient.unit}\n• <b>Notes:</b> ${data.notes || 'None'}\n• <b>By:</b> ${req.user!.email || 'Staff'}`
    ).catch((e) => console.error('[Telegram Inventory Alert Error]:', e));

    sendSuccess(res, result, 201);
  }
}
