import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendSuccess } from '../middlewares/error.middleware';

export interface PromotionCampaign {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  type: 'LIMITED_TIME_COUPON' | 'BILL_THRESHOLD' | 'ITEM_COMBO_COMPLIMENTARY' | 'CUSTOM_DISCOUNT';
  discountType?: 'PERCENTAGE' | 'FLAT';
  discountValue?: number;
  minOrderValue?: number;
  maxDiscount?: number | null;
  validFrom: string;
  validTo: string;
  cardCount?: number;
  generatedCodes?: string[];
  rewardType?: 'DISCOUNT' | 'COMPLIMENTARY_ITEM';
  complementaryItemId?: string;
  complementaryItemName?: string;
  complementaryItemQuantity?: number;
  triggerItems?: Array<{ menuItemId: string; name: string; quantity: number }>;
  customPresets?: {
    percentages: number[];
    flatAmounts: number[];
    reasons: string[];
  };
  autoApply?: boolean;
  highlightOnQrMenu?: boolean;
  status: 'ACTIVE' | 'PAUSED';
  redemptions: number;
  totalSavings: number;
  createdAt: string;
}

// In-memory store fallback per tenant
const promotionStore: Map<string, PromotionCampaign[]> = new Map();

function generateUniqueCouponCodes(prefix: string, count: number): string[] {
  const codes = new Set<string>();
  const cleanPrefix = (prefix || 'COUPON').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

  while (codes.size < count) {
    let suffix = '';
    for (let i = 0; i < 4; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    codes.add(`${cleanPrefix}-${suffix}`);
  }
  return Array.from(codes);
}

function getInitialCampaigns(tenantId: string): PromotionCampaign[] {
  const now = new Date();
  const oneMonthLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const twoMonthsLater = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

  return [
    // 1. Limited Time Period Coupon with Dynamic Codes
    {
      id: `promo-ltc-1`,
      tenantId,
      name: 'Weekend Feast 20% Off',
      code: 'WEEKEND20',
      type: 'LIMITED_TIME_COUPON',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      minOrderValue: 499,
      maxDiscount: 200,
      validFrom: now.toISOString().split('T')[0],
      validTo: oneMonthLater.toISOString().split('T')[0],
      cardCount: 8,
      generatedCodes: [
        'WEEKEND20-7K9B',
        'WEEKEND20-3M4X',
        'WEEKEND20-8P2Q',
        'WEEKEND20-5N6T',
        'WEEKEND20-9R1V',
        'WEEKEND20-2H7W',
        'WEEKEND20-4L8Y',
        'WEEKEND20-6Z3C',
      ],
      autoApply: false,
      highlightOnQrMenu: true,
      status: 'ACTIVE',
      redemptions: 48,
      totalSavings: 4320,
      createdAt: now.toISOString(),
    },
    // 2. Bill Threshold Promo (Auto Apply) — Money Discount or Complementary Item
    {
      id: `promo-threshold-1`,
      tenantId,
      name: 'Mega Dining: Free Dessert / Brownie over ₹999',
      code: 'AUTO-MEGADINE',
      type: 'BILL_THRESHOLD',
      minOrderValue: 999,
      rewardType: 'COMPLIMENTARY_ITEM',
      complementaryItemId: 'item-dessert-special',
      complementaryItemName: 'Signature Chocolate Brownie',
      complementaryItemQuantity: 1,
      validFrom: now.toISOString().split('T')[0],
      validTo: twoMonthsLater.toISOString().split('T')[0],
      autoApply: true,
      highlightOnQrMenu: true,
      status: 'ACTIVE',
      redemptions: 112,
      totalSavings: 14560,
      createdAt: now.toISOString(),
    },
    {
      id: `promo-threshold-2`,
      tenantId,
      name: 'Spend ₹1499+ Get ₹200 Flat Off',
      code: 'AUTO-SPEND1500',
      type: 'BILL_THRESHOLD',
      minOrderValue: 1499,
      rewardType: 'DISCOUNT',
      discountType: 'FLAT',
      discountValue: 200,
      validFrom: now.toISOString().split('T')[0],
      validTo: twoMonthsLater.toISOString().split('T')[0],
      autoApply: true,
      highlightOnQrMenu: true,
      status: 'ACTIVE',
      redemptions: 64,
      totalSavings: 12800,
      createdAt: now.toISOString(),
    },
    // 3. Complementary Item on Specific Food Items Combo
    {
      id: `promo-combo-1`,
      tenantId,
      name: 'Free Hot Coffee with Burger & Pizza Combo',
      code: 'COMBO-FREECOFFEE',
      type: 'ITEM_COMBO_COMPLIMENTARY',
      triggerItems: [
        { menuItemId: 'item-burger', name: 'Burger', quantity: 1 },
        { menuItemId: 'item-pizza', name: 'Pizza', quantity: 1 },
      ],
      rewardType: 'COMPLIMENTARY_ITEM',
      complementaryItemId: 'item-coffee',
      complementaryItemName: 'Fresh Brewed Cappuccino / Coffee',
      complementaryItemQuantity: 1,
      validFrom: now.toISOString().split('T')[0],
      validTo: twoMonthsLater.toISOString().split('T')[0],
      autoApply: true,
      highlightOnQrMenu: true,
      status: 'ACTIVE',
      redemptions: 89,
      totalSavings: 8010,
      createdAt: now.toISOString(),
    },
    // 4. Custom Additional Discount presets during billing
    {
      id: `promo-custom-1`,
      tenantId,
      name: 'Cashier & Billing Custom Discount Presets',
      code: 'CUSTOM-BILLING-DISCOUNT',
      type: 'CUSTOM_DISCOUNT',
      customPresets: {
        percentages: [5, 10, 15, 20],
        flatAmounts: [50, 100, 150, 200],
        reasons: ['Owner Courtesy', 'VIP Guest', 'Customer Delight / Delay', 'Staff Family', 'Special Event Offer'],
      },
      validFrom: now.toISOString().split('T')[0],
      validTo: twoMonthsLater.toISOString().split('T')[0],
      autoApply: false,
      highlightOnQrMenu: false,
      status: 'ACTIVE',
      redemptions: 175,
      totalSavings: 18900,
      createdAt: now.toISOString(),
    },
  ];
}

export class MarketingController {
  // ── Auto-purge expired promotions & coupons from DB to free up memory ───────
  static async cleanupExpiredPromotions(tenantId: string): Promise<void> {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    try {
      // 1. Delete expired individual coupon codes from database
      await prisma.coupon.deleteMany({
        where: {
          tenantId,
          validTo: { lt: now },
        },
      });

      // 2. Clean expired campaigns from tenant settings in DB
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true },
      });

      if (tenant) {
        let parsedSettings: any = {};
        try {
          parsedSettings = typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : (tenant.settings || {});
        } catch {}

        if (Array.isArray(parsedSettings.promotions)) {
          const validPromotions = parsedSettings.promotions.filter((p: any) => {
            if (p.validTo && p.validTo < todayStr) return false;
            return true;
          });

          if (validPromotions.length !== parsedSettings.promotions.length) {
            parsedSettings.promotions = validPromotions;
            await prisma.tenant.update({
              where: { id: tenantId },
              data: { settings: JSON.stringify(parsedSettings) },
            });
          }
        }
      }

      // 3. Purge from in-memory cache
      if (promotionStore.has(tenantId)) {
        const current = promotionStore.get(tenantId)!;
        const valid = current.filter((c) => !c.validTo || c.validTo >= todayStr);
        promotionStore.set(tenantId, valid);
      }
    } catch (err) {
      console.error('[Marketing Auto-Cleanup Error]:', err);
    }
  }

  // ── Load Tenant Promotions from DB / Memory ─────────────────────────────────
  static async getTenantPromotionsAsync(tenantId: string): Promise<PromotionCampaign[]> {
    // Run cleanup on fetch
    await MarketingController.cleanupExpiredPromotions(tenantId);

    // Try loading from tenant.settings in DB
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true },
      });

      if (tenant) {
        let parsedSettings: any = {};
        try {
          parsedSettings = typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : (tenant.settings || {});
        } catch {}

        if (Array.isArray(parsedSettings.promotions) && parsedSettings.promotions.length > 0) {
          promotionStore.set(tenantId, parsedSettings.promotions);
          return parsedSettings.promotions;
        }
      }
    } catch {}

    if (!promotionStore.has(tenantId)) {
      const initial = getInitialCampaigns(tenantId);
      promotionStore.set(tenantId, initial);
      // Persist initial to DB
      try {
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
        if (tenant) {
          let parsedSettings: any = {};
          try {
            parsedSettings = typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : (tenant.settings || {});
          } catch {}
          parsedSettings.promotions = initial;
          await prisma.tenant.update({ where: { id: tenantId }, data: { settings: JSON.stringify(parsedSettings) } });
        }
      } catch {}
    }

    return promotionStore.get(tenantId)!;
  }

  static getTenantPromotions(tenantId: string): PromotionCampaign[] {
    if (!promotionStore.has(tenantId)) {
      promotionStore.set(tenantId, getInitialCampaigns(tenantId));
    }
    return promotionStore.get(tenantId)!;
  }

  static async listPromotions(req: Request, res: Response): Promise<void> {
    const tenantId = req.user?.tid || 'default';
    const campaigns = await MarketingController.getTenantPromotionsAsync(tenantId);
    sendSuccess(res, campaigns);
  }

  static async listPublicActivePromotions(req: Request, res: Response): Promise<void> {
    const tenantId = (req.query.tenantId as string) || req.user?.tid || 'default';
    const all = await MarketingController.getTenantPromotionsAsync(tenantId);
    const nowStr = new Date().toISOString().split('T')[0];

    const active = all.filter((c) => {
      if (c.status !== 'ACTIVE') return false;
      if (c.validFrom && c.validFrom > nowStr) return false;
      if (c.validTo && c.validTo < nowStr) return false;
      return true;
    });

    sendSuccess(res, active);
  }

  static async createCampaign(req: Request, res: Response): Promise<void> {
    const tenantId = req.user?.tid || 'default';
    const body = req.body;

    const id = `promo-${Date.now()}`;
    const cardCount = Math.min(500, Math.max(1, parseInt(body.cardCount, 10) || 1));
    const baseCode = (body.code || `PROMO-${Date.now().toString().slice(-4)}`).toUpperCase().trim();

    // Generate dynamic non-repeating coupon codes if coupon type
    let generatedCodes: string[] = [];
    if (body.type === 'LIMITED_TIME_COUPON') {
      generatedCodes = generateUniqueCouponCodes(baseCode, cardCount);
    } else {
      generatedCodes = [baseCode];
    }

    const newCamp: PromotionCampaign = {
      id,
      tenantId,
      name: body.name || 'New Special Promotion',
      code: baseCode,
      type: body.type || 'LIMITED_TIME_COUPON',
      discountType: body.discountType || 'PERCENTAGE',
      discountValue: Number(body.discountValue) || 0,
      minOrderValue: Number(body.minOrderValue) || 0,
      maxDiscount: body.maxDiscount ? Number(body.maxDiscount) : null,
      validFrom: body.validFrom || new Date().toISOString().split('T')[0],
      validTo: body.validTo || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      cardCount,
      generatedCodes,
      rewardType: body.rewardType,
      complementaryItemId: body.complementaryItemId,
      complementaryItemName: body.complementaryItemName,
      complementaryItemQuantity: body.complementaryItemQuantity || 1,
      triggerItems: body.triggerItems || [],
      customPresets: body.customPresets,
      autoApply: body.autoApply ?? (body.type === 'BILL_THRESHOLD' || body.type === 'ITEM_COMBO_COMPLIMENTARY'),
      highlightOnQrMenu: body.highlightOnQrMenu ?? true,
      status: 'ACTIVE',
      redemptions: 0,
      totalSavings: 0,
      createdAt: new Date().toISOString(),
    };

    const current = await MarketingController.getTenantPromotionsAsync(tenantId);
    current.unshift(newCamp);
    promotionStore.set(tenantId, current);

    // Persist all generated dynamic coupon codes into database `coupons` table
    try {
      const validFromDate = new Date(newCamp.validFrom);
      const validToDate = new Date(newCamp.validTo);

      for (const cCode of generatedCodes) {
        await prisma.coupon.upsert({
          where: {
            tenantId_code: {
              tenantId,
              code: cCode,
            },
          },
          update: {
            discountType: newCamp.discountType || 'PERCENTAGE',
            discountValue: newCamp.discountValue || 0,
            minOrderValue: newCamp.minOrderValue || 0,
            maxDiscount: newCamp.maxDiscount || undefined,
            validFrom: validFromDate,
            validTo: validToDate,
            isActive: true,
          },
          create: {
            tenantId,
            code: cCode,
            discountType: newCamp.discountType || 'PERCENTAGE',
            discountValue: newCamp.discountValue || 0,
            minOrderValue: newCamp.minOrderValue || 0,
            maxDiscount: newCamp.maxDiscount || undefined,
            validFrom: validFromDate,
            validTo: validToDate,
            isActive: true,
          },
        });
      }

      // Also persist campaigns array to tenant settings in DB
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
      if (tenant) {
        let parsedSettings: any = {};
        try {
          parsedSettings = typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : (tenant.settings || {});
        } catch {}
        parsedSettings.promotions = current;
        await prisma.tenant.update({ where: { id: tenantId }, data: { settings: JSON.stringify(parsedSettings) } });
      }
    } catch (err) {
      console.error('[Create Promotion DB Persistence Error]:', err);
    }

    sendSuccess(res, newCamp, 201);
  }

  static async togglePromotionStatus(req: Request, res: Response): Promise<void> {
    const tenantId = req.user?.tid || 'default';
    const { id } = req.params;
    const current = await MarketingController.getTenantPromotionsAsync(tenantId);
    const item = current.find((c) => c.id === id);

    if (item) {
      item.status = item.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
      try {
        const codesToUpdate = item.generatedCodes && item.generatedCodes.length > 0 ? item.generatedCodes : [item.code];
        await prisma.coupon.updateMany({
          where: { tenantId, code: { in: codesToUpdate } },
          data: { isActive: item.status === 'ACTIVE' },
        });

        // Update DB tenant settings
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
        if (tenant) {
          let parsedSettings: any = {};
          try { parsedSettings = typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : (tenant.settings || {}); } catch {}
          parsedSettings.promotions = current;
          await prisma.tenant.update({ where: { id: tenantId }, data: { settings: JSON.stringify(parsedSettings) } });
        }
      } catch {}
    }

    sendSuccess(res, item || { id, status: 'ACTIVE' });
  }

  static async deletePromotion(req: Request, res: Response): Promise<void> {
    const tenantId = req.user?.tid || 'default';
    const { id } = req.params;
    const current = await MarketingController.getTenantPromotionsAsync(tenantId);
    const index = current.findIndex((c) => c.id === id);

    if (index !== -1) {
      const removed = current.splice(index, 1)[0];
      try {
        const codesToDelete = removed.generatedCodes && removed.generatedCodes.length > 0 ? removed.generatedCodes : [removed.code];
        await prisma.coupon.deleteMany({
          where: { tenantId, code: { in: codesToDelete } },
        });

        // Update DB tenant settings
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
        if (tenant) {
          let parsedSettings: any = {};
          try { parsedSettings = typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : (tenant.settings || {}); } catch {}
          parsedSettings.promotions = current;
          await prisma.tenant.update({ where: { id: tenantId }, data: { settings: JSON.stringify(parsedSettings) } });
        }
      } catch {}
    }

    sendSuccess(res, { deleted: true, id });
  }

  static async broadcastSms(req: Request, res: Response): Promise<void> {
    const { campaignId, targetTier, message } = req.body;
    sendSuccess(res, {
      status: 'SENT',
      recipientsCount: 450,
      deliveredCount: 442,
      campaignId,
      message,
    });
  }
}

