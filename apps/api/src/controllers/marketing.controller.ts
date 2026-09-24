import { Request, Response } from 'express';
import { sendSuccess } from '../middlewares/error.middleware';

export class MarketingController {
  static async listPromotions(req: Request, res: Response): Promise<void> {
    const campaigns = [
      {
        id: 'camp-happy-hours',
        name: 'Happy Hours 20% Off',
        code: 'HAPPY20',
        type: 'PERCENTAGE',
        discountValue: 20,
        minOrderValue: 499,
        maxDiscount: 200,
        timing: 'Mon-Thu, 16:00 - 19:00',
        status: 'ACTIVE',
        redemptions: 142,
        totalSavings: 24650,
      },
      {
        id: 'camp-weekend-bogo',
        name: 'Weekend Biryani Feast (BOGO)',
        code: 'BIRYANIFEST',
        type: 'BOGO',
        discountValue: 100,
        minOrderValue: 699,
        timing: 'Fri-Sun, All Day',
        status: 'ACTIVE',
        redemptions: 89,
        totalSavings: 31061,
      },
      {
        id: 'camp-welcome-first',
        name: 'Welcome New Guest ₹150 Flat Off',
        code: 'FIRST150',
        type: 'FLAT',
        discountValue: 150,
        minOrderValue: 500,
        status: 'ACTIVE',
        redemptions: 320,
        totalSavings: 48000,
      },
      {
        id: 'camp-vip-points-2x',
        name: 'VIP Loyalty 2x Point Booster',
        code: 'VIPDOUBLE',
        type: 'LOYALTY_BOOST',
        discountValue: 2,
        status: 'ACTIVE',
        redemptions: 64,
        totalSavings: 12800,
      },
    ];

    sendSuccess(res, campaigns);
  }

  static async createCampaign(req: Request, res: Response): Promise<void> {
    const data = req.body;
    sendSuccess(res, {
      id: `camp-${Date.now()}`,
      status: 'ACTIVE',
      redemptions: 0,
      totalSavings: 0,
      ...data,
    }, 201);
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
