// =============================================================================
// Gift Cards, Prepaid Wallets & Digital Membership Controller
// =============================================================================

import { Request, Response } from 'express';
import { sendSuccess } from '../middlewares/error.middleware';

export class GiftCardController {
  static async listGiftCards(req: Request, res: Response): Promise<void> {
    const giftCards = [
      {
        id: 'GC-9081-2241',
        cardNumber: 'ROS-GIFT-9081',
        recipientName: 'Ananya Sharma',
        recipientPhone: '+91 98765 43210',
        initialBalance: 5000,
        currentBalance: 3200,
        status: 'ACTIVE',
        issuedAt: '2026-08-15',
        expiryDate: '2027-08-15',
        lastUsedAt: 'Yesterday at Table T5',
      },
      {
        id: 'GC-4412-8871',
        cardNumber: 'ROS-GIFT-4412',
        recipientName: 'Rohan Mehra',
        recipientPhone: '+91 91234 56789',
        initialBalance: 2500,
        currentBalance: 2500,
        status: 'ACTIVE',
        issuedAt: '2026-09-01',
        expiryDate: '2027-09-01',
      },
      {
        id: 'GC-1102-3399',
        cardNumber: 'ROS-GIFT-1102',
        recipientName: 'Corporate Banquet Gifting',
        recipientPhone: '+91 99001 22334',
        initialBalance: 10000,
        currentBalance: 0,
        status: 'REDEEMED',
        issuedAt: '2026-07-20',
        expiryDate: '2027-07-20',
      },
    ];

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
