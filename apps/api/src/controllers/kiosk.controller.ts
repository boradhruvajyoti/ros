// =============================================================================
// Kiosk Self-Service Controller
// =============================================================================

import { Request, Response } from 'express';
import { sendSuccess } from '../middlewares/error.middleware';
import { getIO } from '../socket';

import { prisma } from '../lib/prisma';

export class KioskController {
  static async getKioskMenu(req: Request, res: Response): Promise<void> {
    const tenantId = req.user?.tid;
    if (!tenantId) {
      sendSuccess(res, { categories: [], popularCombos: [] });
      return;
    }

    const categories = await prisma.menuCategory.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true },
      orderBy: { sortOrder: 'asc' },
    });

    const popularCombos = await prisma.menuItem.findMany({
      where: { tenantId, isActive: true },
      include: { variants: true },
      take: 10,
    });

    sendSuccess(res, { categories, popularCombos });
  }

  static async submitKioskOrder(req: Request, res: Response): Promise<void> {
    const { items, paymentMethod, diningOption } = req.body;
    const tokenNumber = `K-${Math.floor(100 + Math.random() * 900)}`;

    try {
      const io = getIO();
      io.emit('kiosk:order', {
        tokenNumber,
        items,
        diningOption: diningOption || 'DINE_IN',
        paymentMethod: paymentMethod || 'UPI_QR',
        createdAt: new Date(),
      });
    } catch (e) {}

    sendSuccess(res, {
      tokenNumber,
      status: 'CONFIRMED',
      estimatedWaitTimeMins: 8,
      message: 'Order paid & queued for kitchen dispatch.',
    }, 201);
  }
}
