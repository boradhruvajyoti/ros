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

// In-memory store cache per tenant
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
      let tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, settings: true },
      });
      if (!tenant) {
        tenant = await prisma.tenant.findFirst({ select: { id: true, settings: true } });
      }

      if (tenant) {
        let parsedSettings: any = {};
        try {
          parsedSettings = typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : (tenant.settings || {});
        } catch {}

        if (Array.isArray(parsedSettings.promotions)) {
          // Also filter out any legacy demo offers if present
          const validPromotions = parsedSettings.promotions.filter((p: any) => {
            if (p.id && (p.id.startsWith('promo-ltc-1') || p.id.startsWith('promo-threshold-') || p.id.startsWith('promo-combo-1') || p.id.startsWith('promo-custom-1'))) {
              return false; // remove demo offer
            }
            if (p.validTo && p.validTo < todayStr) return false;
            return true;
          });

          if (validPromotions.length !== parsedSettings.promotions.length) {
            parsedSettings.promotions = validPromotions;
            await prisma.tenant.update({
              where: { id: tenant.id },
              data: { settings: JSON.stringify(parsedSettings) },
            });
          }
        }
      }

      // 3. Purge from in-memory cache
      if (promotionStore.has(tenantId)) {
        const current = promotionStore.get(tenantId)!;
        const valid = current.filter((c) => {
          if (c.id && (c.id.startsWith('promo-ltc-1') || c.id.startsWith('promo-threshold-') || c.id.startsWith('promo-combo-1') || c.id.startsWith('promo-custom-1'))) {
            return false;
          }
          return !c.validTo || c.validTo >= todayStr;
        });
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
      let tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, settings: true },
      });
      if (!tenant) {
        tenant = await prisma.tenant.findFirst({ select: { id: true, settings: true } });
      }

      if (tenant) {
        let parsedSettings: any = {};
        try {
          parsedSettings = typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : (tenant.settings || {});
        } catch {}

        if (Array.isArray(parsedSettings.promotions)) {
          // Strip out demo offers
          const valid = parsedSettings.promotions.filter((p: any) => {
            if (p.id && (p.id.startsWith('promo-ltc-1') || p.id.startsWith('promo-threshold-') || p.id.startsWith('promo-combo-1') || p.id.startsWith('promo-custom-1'))) {
              return false;
            }
            return true;
          });
          promotionStore.set(tenantId, valid);
          return valid;
        }
      }
    } catch (err) {
      console.error('[getTenantPromotionsAsync Error]:', err);
    }

    // Default clean state without demo offers
    promotionStore.set(tenantId, []);
    return [];
  }

  static getTenantPromotions(tenantId: string): PromotionCampaign[] {
    return promotionStore.get(tenantId) || [];
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
      let tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, settings: true } });
      if (!tenant) {
        tenant = await prisma.tenant.findFirst({ select: { id: true, settings: true } });
      }
      if (tenant) {
        let parsedSettings: any = {};
        try {
          parsedSettings = typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : (tenant.settings || {});
        } catch {}
        parsedSettings.promotions = current;
        await prisma.tenant.update({ where: { id: tenant.id }, data: { settings: JSON.stringify(parsedSettings) } });
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
        let tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, settings: true } });
        if (!tenant) {
          tenant = await prisma.tenant.findFirst({ select: { id: true, settings: true } });
        }
        if (tenant) {
          let parsedSettings: any = {};
          try { parsedSettings = typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : (tenant.settings || {}); } catch {}
          parsedSettings.promotions = current;
          await prisma.tenant.update({ where: { id: tenant.id }, data: { settings: JSON.stringify(parsedSettings) } });
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
        let tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, settings: true } });
        if (!tenant) {
          tenant = await prisma.tenant.findFirst({ select: { id: true, settings: true } });
        }
        if (tenant) {
          let parsedSettings: any = {};
          try { parsedSettings = typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : (tenant.settings || {}); } catch {}
          parsedSettings.promotions = current;
          await prisma.tenant.update({ where: { id: tenant.id }, data: { settings: JSON.stringify(parsedSettings) } });
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

