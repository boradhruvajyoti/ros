import { Request, Response } from 'express';
import { sendSuccess } from '../middlewares/error.middleware';

export class MarketingController {
  static async listPromotions(req: Request, res: Response): Promise<void> {
    const campaigns: any[] = [];
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
