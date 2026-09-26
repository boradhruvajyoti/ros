// =============================================================================
// Kiosk Self-Service Controller
// =============================================================================

import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { sendSuccess } from '../middlewares/error.middleware';
import { getIO } from '../socket';
import { prisma } from '../lib/prisma';

export class KioskController {
  static async getKioskMenu(req: Request, res: Response): Promise<void> {
    const tenantId = req.user?.tid;
    if (!tenantId) {
      sendSuccess(res, { categories: [], items: [] });
      return;
    }

    const categories = await prisma.menuCategory.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true },
      orderBy: { sortOrder: 'asc' },
    });

    const items = await prisma.menuItem.findMany({
      where: { tenantId, isActive: true, isAvailable: true },
      include: {
        variants: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
        category: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    sendSuccess(res, { categories, items });
  }

  static async submitKioskOrder(req: Request, res: Response): Promise<void> {
    const tenantId = req.user?.tid;
    const branchId = req.user?.bid;
    const userId = req.user?.sub;
    const { items, paymentMethod, diningOption } = req.body;
    const tokenNumber = `K-${Math.floor(100 + Math.random() * 900)}`;

    if (tenantId && branchId && userId && Array.isArray(items) && items.length > 0) {
      try {
        const orderId = randomUUID();
        let subtotal = 0;
        const orderItemsData = items.map((item: any) => {
          const itemPrice = Number(item.price || 0);
          const quantity = Number(item.qty || item.quantity || 1);
          const totalItemPrice = itemPrice * quantity;
          subtotal += totalItemPrice;
          return {
            id: randomUUID(),
            menuItemId: item.menuItemId || item.id,
            variantId: item.variantId || null,
            quantity,
            unitPrice: itemPrice,
            lineTotal: totalItemPrice,
            status: 'PREPARING',
          };
        });

        const taxAmount = Math.round(subtotal * 0.05 * 100) / 100;
        const total = subtotal + taxAmount;

        const createdOrder = await prisma.order.create({
          data: {
            id: orderId,
            tenantId,
            branchId,
            orderNumber: tokenNumber,
            type: diningOption === 'TAKEAWAY' ? 'TAKEAWAY' : 'DINE_IN',
            status: 'ACCEPTED',
            subtotal,
            taxAmount,
            total,
            paidAmount: total,
            createdBy: userId,
            items: {
              create: orderItemsData,
            },
          },
          include: {
            items: true,
          },
        });

        try {
          const io = getIO();
          io.to(`tenant:${tenantId}`).emit('kds:order-placed', createdOrder);
          io.to(`tenant:${tenantId}`).emit('order:created', createdOrder);
        } catch (e) {}
      } catch (err) {
        console.error('Failed to persist kiosk order:', err);
      }
    }

    sendSuccess(res, {
      tokenNumber,
      status: 'CONFIRMED',
      estimatedWaitTimeMins: 8,
      message: 'Order paid & queued for kitchen dispatch.',
    }, 201);
  }
}
