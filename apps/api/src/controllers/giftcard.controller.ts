// =============================================================================
// Gift Cards, Prepaid Wallets & Digital Membership Controller
// =============================================================================

import { Request, Response } from 'express';
import { sendSuccess } from '../middlewares/error.middleware';

export class GiftCardController {
  static async listGiftCards(req: Request, res: Response): Promise<void> {
    const giftCards: any[] = [];
    sendSuccess(res, giftCards);
  }

  static async issueCard(req: Request, res: Response): Promise<void> {
    const data = req.body;
    const cardNo = `ROS-GIFT-${Math.floor(1000 + Math.random() * 9000)}`;
    sendSuccess(res, {
      id: `GC-${Date.now()}`,
      cardNumber: cardNo,
      status: 'ACTIVE',
      currentBalance: data.amount || 2000,
      issuedAt: new Date().toISOString(),
      ...data,
    }, 201);
  }

  static async redeemBalance(req: Request, res: Response): Promise<void> {
    const { cardNumber, amount } = req.body;
    sendSuccess(res, {
      cardNumber,
      amountDeducted: amount,
      remainingBalance: 1200,
      message: 'Gift card balance redeemed successfully.',
    });
  }
}
