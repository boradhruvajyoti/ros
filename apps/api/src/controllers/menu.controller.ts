// =============================================================================
// Menu Controller
// =============================================================================

import { Request, Response } from 'express';
import { sendSuccess, AppError } from '../middlewares/error.middleware';
import { prisma } from '../lib/prisma';
import { cacheGet, cacheSet, cacheDel, CacheKeys } from '../lib/redis';
import { MenuParserService } from '../services/menu-parser.service';
import { TelegramService } from '../services/telegram.service';
import { z } from 'zod';

const categorySchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.string().uuid().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

const itemSchema = z.object({
  categoryId: z.string().uuid(),
  kitchenStationId: z.string().uuid().optional().nullable(),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  sku: z.string().max(100).optional().nullable(),
  barcode: z.string().max(100).optional().nullable(),
  foodType: z.enum(['VEG', 'NON_VEG', 'EGG', 'VEGAN']).default('VEG'),
  spiceLevel: z.enum(['NONE', 'MILD', 'MEDIUM', 'HOT', 'VERY_HOT']).default('NONE'),
  allergens: z.array(z.string()).default([]),
  preparationTimeMins: z.number().int().positive().optional().nullable(),
  isAvailable: z.boolean().default(true),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  variants: z.array(z.object({
    name: z.string().min(1).max(100),
    price: z.number().nonnegative(),
    cost: z.number().nonnegative().default(0),
    isActive: z.boolean().default(true),
    sortOrder: z.number().int().default(0),
  })).min(1, 'At least one variant required'),
});

const modifierGroupSchema = z.object({
  name: z.string().min(1).max(255),
  minSelections: z.number().int().nonnegative().default(0),
  maxSelections: z.number().int().positive().default(1),
  isRequired: z.boolean().default(false),
});

const modifierSchema = z.object({
  name: z.string().min(1).max(255),
  price: z.number().nonnegative().default(0),
  sortOrder: z.number().int().default(0),
});

export class MenuController {
  // ── Categories ─────────────────────────────────────────────────────────────
  static async listCategories(req: Request, res: Response): Promise<void> {
    const categories = await prisma.menuCategory.findMany({
      where: { tenantId: req.user!.tid, isActive: true },
      include: {
        parent: { select: { id: true, name: true } },
        children: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    sendSuccess(res, categories);
  }

  static async createCategory(req: Request, res: Response): Promise<void> {
    const dto = categorySchema.parse(req.body);
    const category = await prisma.menuCategory.create({
      data: { ...dto, tenantId: req.user!.tid, branchId: req.user!.bid },
      include: {
        parent: { select: { id: true, name: true } },
        children: true,
      },
    });
    await cacheDel(CacheKeys.menu(req.user!.tid, req.user!.bid));
    sendSuccess(res, category, 201);
  }

  static async updateCategory(req: Request, res: Response): Promise<void> {
    const dto = categorySchema.partial().parse(req.body);
    const category = await prisma.menuCategory.update({
      where: { id: req.params.id },
      data: dto,
      include: {
        parent: { select: { id: true, name: true } },
        children: true,
      },
    });
    await cacheDel(CacheKeys.menu(req.user!.tid, req.user!.bid));
    sendSuccess(res, category);
  }

  static async deleteCategory(req: Request, res: Response): Promise<void> {
    await prisma.menuCategory.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    // Also deactivate children if any
    await prisma.menuCategory.updateMany({
      where: { parentId: req.params.id },
      data: { isActive: false },
    });
    await cacheDel(CacheKeys.menu(req.user!.tid, req.user!.bid));
    sendSuccess(res, { message: 'Category and subcategories deactivated' });
  }

  // ── Items ──────────────────────────────────────────────────────────────────
  static async listItems(req: Request, res: Response): Promise<void> {
    const { categoryId, search, isActive } = req.query;
    const items = await prisma.menuItem.findMany({
      where: {
        tenantId: req.user!.tid,
        ...(categoryId ? { categoryId: categoryId as string } : {}),
        ...(isActive === 'all'
          ? {}
          : isActive !== undefined
            ? { isActive: isActive === 'true' }
            : { isActive: true }),
        ...(search ? { name: { contains: search as string } } : {}),
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            parentId: true,
            parent: { select: { id: true, name: true } },
          },
        },
        kitchenStation: { select: { id: true, name: true } },
        variants: { orderBy: { sortOrder: 'asc' } },
        modifierGroups: { include: { modifierGroup: { include: { modifiers: { where: { isActive: true } } } } } },
      },
      orderBy: [{ categoryId: 'asc' }, { sortOrder: 'asc' }],
    });
    sendSuccess(res, items);
  }

  static async createItem(req: Request, res: Response): Promise<void> {
    const dto = itemSchema.parse(req.body);
    const { variants, ...itemData } = dto;

    const item = await prisma.menuItem.create({
      data: {
        ...itemData,
        allergens: itemData.allergens ? JSON.stringify(itemData.allergens) : undefined,
        tenantId: req.user!.tid,
        branchId: req.user!.bid,
        variants: { create: variants },
      } as any,
      include: { variants: true },
    });
    await cacheDel(CacheKeys.menu(req.user!.tid, req.user!.bid));

    // Dispatch Telegram Bot Notification (MENU_MODIFIED)
    TelegramService.getUserName(req.user, 'Admin').then((userName) => {
      TelegramService.sendNotificationToTenant(
        req.user!.tid,
        'MENU_MODIFIED',
        `🍽️ <b>New Menu Dish Added!</b>\n\n• <b>Name:</b> ${item.name}\n• <b>Type:</b> ${item.foodType}\n• <b>Base Price:</b> ₹${variants[0]?.price || 0}\n• <b>Added By:</b> ${userName}`
      ).catch((e) => console.error('[Telegram Menu Alert Error]:', e));
    });

    sendSuccess(res, item, 201);
  }

  static async getItem(req: Request, res: Response): Promise<void> {
    const item = await prisma.menuItem.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tid },
      include: {
        variants: { orderBy: { sortOrder: 'asc' } },
        modifierGroups: { include: { modifierGroup: { include: { modifiers: true } } } },
        kitchenStation: true,
        recipes: { where: { isActive: true }, include: { ingredients: { include: { ingredient: true } } } },
      },
    });
    sendSuccess(res, item);
  }

  static async updateItem(req: Request, res: Response): Promise<void> {
    const dto = itemSchema.partial().parse(req.body);
    const { variants, allergens, ...itemData } = dto;
    const item = await prisma.menuItem.update({
      where: { id: req.params.id },
      data: {
        ...itemData,
        ...(allergens !== undefined ? { allergens: JSON.stringify(allergens) } : {}),
      } as any,
    });
    await cacheDel(CacheKeys.menu(req.user!.tid, req.user!.bid));

    // Dispatch Telegram Bot Notification (MENU_MODIFIED)
    TelegramService.getUserName(req.user, 'Admin').then((userName) => {
      TelegramService.sendNotificationToTenant(
        req.user!.tid,
        'MENU_MODIFIED',
        `🍽️ <b>Menu Dish Updated</b>\n\n• <b>Name:</b> ${item.name}\n• <b>Status:</b> ${item.isActive ? 'Active' : 'Archived'}\n• <b>Updated By:</b> ${userName}`
      ).catch((e) => console.error('[Telegram Menu Alert Error]:', e));
    });

    sendSuccess(res, item);
  }

  static async deleteItem(req: Request, res: Response): Promise<void> {
    const item = await prisma.menuItem.findUnique({ where: { id: req.params.id } });
    await prisma.menuItem.updateMany({
      where: { id: req.params.id, tenantId: req.user!.tid },
      data: { isActive: false },
    });
    await cacheDel(CacheKeys.menu(req.user!.tid, req.user!.bid));

    // Dispatch Telegram Bot Notification (MENU_MODIFIED)
    TelegramService.getUserName(req.user, 'Admin').then((userName) => {
      TelegramService.sendNotificationToTenant(
        req.user!.tid,
        'MENU_MODIFIED',
        `🍽️ <b>Menu Dish Deleted</b>\n\n• <b>Name:</b> ${item?.name || req.params.id}\n• <b>Deleted By:</b> ${userName}`
      ).catch((e) => console.error('[Telegram Menu Alert Error]:', e));
    });

    sendSuccess(res, { message: 'Item deleted from active menu' });
  }

  static async batchDeleteItems(req: Request, res: Response): Promise<void> {
    const { ids } = z.object({ ids: z.array(z.string()).min(1) }).parse(req.body);
    const result = await prisma.menuItem.updateMany({
      where: {
        id: { in: ids },
        tenantId: req.user!.tid,
      },
      data: { isActive: false },
    });
    await cacheDel(CacheKeys.menu(req.user!.tid, req.user!.bid));

    TelegramService.getUserName(req.user, 'Admin').then((userName) => {
      TelegramService.sendNotificationToTenant(
        req.user!.tid,
        'MENU_MODIFIED',
        `🍽️ <b>Batch Menu Items Removed</b>\n\n• <b>Total Removed:</b> ${result.count} items\n• <b>Action By:</b> ${userName}`
      ).catch((e) => console.error('[Telegram Menu Alert Error]:', e));
    });

    sendSuccess(res, { count: result.count, message: `${result.count} items deleted from active menu.` });
  }

  static async toggleAvailability(req: Request, res: Response): Promise<void> {
    const { isAvailable } = z.object({ isAvailable: z.boolean() }).parse(req.body);
    const item = await prisma.menuItem.findUnique({ where: { id: req.params.id } });
    await prisma.menuItem.updateMany({
      where: { id: req.params.id, tenantId: req.user!.tid },
      data: { isAvailable },
    });
    await cacheDel(CacheKeys.menu(req.user!.tid, req.user!.bid));

    TelegramService.getUserName(req.user, 'Admin').then((userName) => {
      TelegramService.sendNotificationToTenant(
        req.user!.tid,
        'MENU_MODIFIED',
        `🍽️ <b>Menu Availability Changed</b>\n\n• <b>Item:</b> ${item?.name || 'Dish'}\n• <b>Availability:</b> ${isAvailable ? '✅ In Stock' : '❌ Out of Stock (86ed)'}\n• <b>By:</b> ${userName}`
      ).catch((e) => console.error('[Telegram Menu Alert Error]:', e));
    });

    sendSuccess(res, { isAvailable });
  }

  // ── Variants ───────────────────────────────────────────────────────────────
  static async addVariant(req: Request, res: Response): Promise<void> {
    const dto = z.object({ name: z.string(), price: z.number().nonnegative(), cost: z.number().nonnegative().default(0) }).parse(req.body);
    const variant = await prisma.menuItemVariant.create({
      data: { menuItemId: req.params.id, ...dto },
    });
    await cacheDel(CacheKeys.menu(req.user!.tid, req.user!.bid));
    sendSuccess(res, variant, 201);
  }

  static async updateVariant(req: Request, res: Response): Promise<void> {
    const dto = z.object({ name: z.string().optional(), price: z.number().nonnegative().optional(), cost: z.number().nonnegative().optional(), isActive: z.boolean().optional() }).parse(req.body);
    const variant = await prisma.menuItemVariant.update({ where: { id: req.params.id }, data: dto });
    sendSuccess(res, variant);
  }

  static async deleteVariant(req: Request, res: Response): Promise<void> {
    await prisma.menuItemVariant.update({ where: { id: req.params.id }, data: { isActive: false } });
    sendSuccess(res, { message: 'Variant deactivated' });
  }

  // ── Modifier Groups ─────────────────────────────────────────────────────────
  static async listModifierGroups(req: Request, res: Response): Promise<void> {
    const groups = await prisma.modifierGroup.findMany({
      where: { tenantId: req.user!.tid, isActive: true },
      include: { modifiers: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } },
    });
    sendSuccess(res, groups);
  }

  static async createModifierGroup(req: Request, res: Response): Promise<void> {
    const dto = modifierGroupSchema.parse(req.body);
    const group = await prisma.modifierGroup.create({
      data: { ...dto, tenantId: req.user!.tid },
    });
    sendSuccess(res, group, 201);
  }

  static async updateModifierGroup(req: Request, res: Response): Promise<void> {
    const dto = modifierGroupSchema.partial().parse(req.body);
    const group = await prisma.modifierGroup.update({ where: { id: req.params.id }, data: dto });
    sendSuccess(res, group);
  }

  static async deleteModifierGroup(req: Request, res: Response): Promise<void> {
    await prisma.modifierGroup.update({ where: { id: req.params.id }, data: { isActive: false } });
    sendSuccess(res, { message: 'Modifier group deactivated' });
  }

  static async addModifier(req: Request, res: Response): Promise<void> {
    const dto = modifierSchema.parse(req.body);
    const modifier = await prisma.modifier.create({ data: { modifierGroupId: req.params.id, ...dto } });
    sendSuccess(res, modifier, 201);
  }

  // ── POS Menu (cached, optimized) ───────────────────────────────────────────
  static async getPosMenu(req: Request, res: Response): Promise<void> {
    const cacheKey = CacheKeys.menu(req.user!.tid, req.user!.bid);
    const cached = await cacheGet(cacheKey);
    if (cached) { sendSuccess(res, cached); return; }

    const categories = await prisma.menuCategory.findMany({
      where: { tenantId: req.user!.tid, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          where: { isActive: true, isAvailable: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            variants: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
            modifierGroups: {
              orderBy: { sortOrder: 'asc' },
              include: {
                modifierGroup: {
                  include: { modifiers: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } },
                },
              },
            },
          },
        },
      },
    });

    await cacheSet(cacheKey, categories, 300); // 5-min cache
    sendSuccess(res, categories);
  }

  // ── Upload & Local Server OCR Parser (Zero Retention) ─────────────────────
  static async parseUpload(req: Request, res: Response): Promise<void> {
    const { imageBase64, fileName, mimeType, sampleText } = req.body;
    if (!imageBase64 && !sampleText) {
      throw new AppError('VALIDATION_ERROR', 'Please provide an image (imageBase64) or sampleText', 400);
    }

    const result = await MenuParserService.parseMenuUpload({
      imageBase64,
      fileName,
      mimeType,
      sampleText,
    });

    sendSuccess(res, result);
  }

  static async batchImport(req: Request, res: Response): Promise<void> {
    const { categories } = req.body;
    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      throw new AppError('VALIDATION_ERROR', 'Invalid or empty categories list for import', 400);
    }

    const tenantId = req.user!.tid;
    const branchId = req.user!.bid;

    const defaultStation = await prisma.kitchenStation.findFirst({
      where: { tenantId, branchId, isActive: true },
    });

    const createdCategories = [];

    for (let catIdx = 0; catIdx < categories.length; catIdx++) {
      const cat = categories[catIdx];
      
      // Check if category already exists or create new
      let category = await prisma.menuCategory.findFirst({
        where: { tenantId, name: cat.name, isActive: true },
      });

      if (!category) {
        category = await prisma.menuCategory.create({
          data: {
            tenantId,
            branchId,
            name: cat.name,
            sortOrder: catIdx + 1,
            isActive: true,
          },
        });
      }

      const createdItems = [];
      if (cat.items && Array.isArray(cat.items)) {
        for (let itemIdx = 0; itemIdx < cat.items.length; itemIdx++) {
          const item = cat.items[itemIdx];
          const variantsData = (item.variants && item.variants.length > 0)
            ? item.variants.map((v: any, vIdx: number) => ({
                name: v.name,
                price: Number(v.price) || 0,
                cost: (Number(v.price) || 0) * 0.35,
                sortOrder: vIdx + 1,
                isActive: true,
              }))
            : [
                {
                  name: 'Standard Portion',
                  price: Number(item.price) || 200,
                  cost: (Number(item.price) || 200) * 0.35,
                  sortOrder: 1,
                  isActive: true,
                },
              ];

          const createdItem = await prisma.menuItem.create({
            data: {
              tenantId,
              branchId,
              categoryId: category.id,
              kitchenStationId: defaultStation?.id || null,
              name: item.name,
              description: item.description || '',
              foodType: item.foodType || 'VEG',
              spiceLevel: item.foodType === 'NON_VEG' ? 'MEDIUM' : 'MILD',
              preparationTimeMins: 15,
              isAvailable: true,
              isActive: true,
              sortOrder: itemIdx + 1,
              variants: {
                create: variantsData,
              },
            },
            include: { variants: true },
          });

          createdItems.push(createdItem);
        }
      }

      createdCategories.push({ ...category, items: createdItems });
    }

    await cacheDel(CacheKeys.menu(tenantId, branchId));

    sendSuccess(res, {
      message: `Successfully imported ${createdCategories.length} categories with items & variants.`,
      categories: createdCategories,
    }, 201);
  }
}
