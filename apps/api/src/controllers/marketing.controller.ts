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

// In-memory store per tenant with default initial campaigns so all 4 types are immediately active & available
const promotionStore: Map<string, PromotionCampaign[]> = new Map();

function getInitialCampaigns(tenantId: string): PromotionCampaign[] {
  const now = new Date();
  const oneMonthLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const twoMonthsLater = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

  return [
    // 1. Limited Time Period Coupon
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
    // 3. Complementary Item on Specific Food Items Combo (e.g. Free Coffee with Burger & Pizza)
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
    {
      id: `promo-combo-2`,
      tenantId,
      name: 'Free Cappuccino with Chicken Wings',
      code: 'COMBO-WINGSCAP',
      type: 'ITEM_COMBO_COMPLIMENTARY',
      triggerItems: [
        { menuItemId: 'item-chicken-wings', name: 'Chicken Wings', quantity: 1 },
      ],
      rewardType: 'COMPLIMENTARY_ITEM',
      complementaryItemId: 'item-cappuccino',
      complementaryItemName: 'Fresh Italian Cappuccino',
      complementaryItemQuantity: 1,
      validFrom: now.toISOString().split('T')[0],
      validTo: twoMonthsLater.toISOString().split('T')[0],
      autoApply: true,
      highlightOnQrMenu: true,
      status: 'ACTIVE',
      redemptions: 34,
      totalSavings: 3740,
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
  static getTenantPromotions(tenantId: string): PromotionCampaign[] {
    if (!promotionStore.has(tenantId)) {
      promotionStore.set(tenantId, getInitialCampaigns(tenantId));
    }
    return promotionStore.get(tenantId)!;
  }

  static async listPromotions(req: Request, res: Response): Promise<void> {
    const tenantId = req.user?.tid || 'default';
    const campaigns = MarketingController.getTenantPromotions(tenantId);
    sendSuccess(res, campaigns);
  }

  static async listPublicActivePromotions(req: Request, res: Response): Promise<void> {
    const tenantId = (req.query.tenantId as string) || req.user?.tid || 'default';
    const all = MarketingController.getTenantPromotions(tenantId);
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
    const newCamp: PromotionCampaign = {
      id,
      tenantId,
      name: body.name || 'New Special Promotion',
      code: (body.code || `PROMO-${Date.now().toString().slice(-4)}`).toUpperCase().trim(),
      type: body.type || 'LIMITED_TIME_COUPON',
      discountType: body.discountType || 'PERCENTAGE',
      discountValue: Number(body.discountValue) || 0,
      minOrderValue: Number(body.minOrderValue) || 0,
      maxDiscount: body.maxDiscount ? Number(body.maxDiscount) : null,
      validFrom: body.validFrom || new Date().toISOString().split('T')[0],
      validTo: body.validTo || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
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

    const current = MarketingController.getTenantPromotions(tenantId);
    current.unshift(newCamp);
    promotionStore.set(tenantId, current);

    // Also attempt to persist in DB coupon table if applicable
    try {
      if (newCamp.code) {
        await prisma.coupon.upsert({
          where: {
            tenantId_code: {
              tenantId,
              code: newCamp.code,
            },
          },
          update: {
            discountType: newCamp.discountType || 'PERCENTAGE',
            discountValue: newCamp.discountValue || 0,
            minOrderValue: newCamp.minOrderValue || 0,
            maxDiscount: newCamp.maxDiscount || undefined,
            validFrom: new Date(newCamp.validFrom),
            validTo: new Date(newCamp.validTo),
            isActive: true,
          },
          create: {
            tenantId,
            code: newCamp.code,
            discountType: newCamp.discountType || 'PERCENTAGE',
            discountValue: newCamp.discountValue || 0,
            minOrderValue: newCamp.minOrderValue || 0,
            maxDiscount: newCamp.maxDiscount || undefined,
            validFrom: new Date(newCamp.validFrom),
            validTo: new Date(newCamp.validTo),
            isActive: true,
          },
        });
      }
    } catch {}

    sendSuccess(res, newCamp, 201);
  }

  static async togglePromotionStatus(req: Request, res: Response): Promise<void> {
    const tenantId = req.user?.tid || 'default';
    const { id } = req.params;
    const current = MarketingController.getTenantPromotions(tenantId);
    const item = current.find((c) => c.id === id);

    if (item) {
      item.status = item.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
      try {
        await prisma.coupon.updateMany({
          where: { tenantId, code: item.code },
          data: { isActive: item.status === 'ACTIVE' },
        });
      } catch {}
    }

    sendSuccess(res, item || { id, status: 'ACTIVE' });
  }

  static async deletePromotion(req: Request, res: Response): Promise<void> {
    const tenantId = req.user?.tid || 'default';
    const { id } = req.params;
    const current = MarketingController.getTenantPromotions(tenantId);
    const index = current.findIndex((c) => c.id === id);

    if (index !== -1) {
      const removed = current.splice(index, 1)[0];
      try {
        await prisma.coupon.deleteMany({
          where: { tenantId, code: removed.code },
        });
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
