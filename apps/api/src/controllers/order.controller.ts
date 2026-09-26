// =============================================================================
// Order Controller
// =============================================================================

import { Request, Response } from 'express';
import { OrderService } from '../services/order.service';
import { PaymentService } from '../services/payment.service';
import { sendSuccess, AppError } from '../middlewares/error.middleware';
import { ErrorCodes } from '@ros/shared-types';
import { writeAuditLog, AuditActions } from '../middlewares/audit.middleware';
import { emitToRoom } from '../socket';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { generateInvoicePdf } from '../services/invoice.service';
import { TelegramService } from '../services/telegram.service';

const createOrderSchema = z.object({
  type: z.enum(['DINE_IN', 'TAKEAWAY', 'PICKUP', 'DELIVERY', 'ONLINE', 'ROOM_SERVICE', 'DRIVE_THRU', 'CATERING', 'AGGREGATOR_ZOMATO', 'AGGREGATOR_SWIGGY']).optional(),
  orderType: z.enum(['DINE_IN', 'TAKEAWAY', 'PICKUP', 'DELIVERY', 'ONLINE', 'ROOM_SERVICE', 'DRIVE_THRU', 'CATERING', 'AGGREGATOR_ZOMATO', 'AGGREGATOR_SWIGGY']).optional(),
  status: z.enum(['DRAFT', 'CONFIRMED', 'SENT_TO_KITCHEN']).optional(),
  tableId: z.string().optional(),
  customerId: z.string().optional(),
  waiterId: z.string().optional(),
  notes: z.string().max(1000).optional(),
  clientId: z.string().optional(),
  items: z.array(z.object({
    menuItemId: z.string(),
    variantId:  z.string().optional(),
    quantity:   z.number().int().positive().max(999),
    unitPrice:  z.number().nonnegative().optional(),
    notes:      z.string().max(500).optional(),
    modifierIds: z.array(z.string()).optional(),
  })).min(0),
  subtotal: z.number().nonnegative().optional(),
  taxAmount: z.number().nonnegative().optional(),
  discountAmount: z.number().nonnegative().optional(),
  serviceCharge: z.number().nonnegative().optional(),
  finalAmount: z.number().nonnegative().optional(),
});

const statusSchema = z.object({
  status: z.enum([
    'DRAFT','CONFIRMED','SENT_TO_KITCHEN','PREPARING','READY',
    'SERVED','BILLED','PARTIALLY_PAID','PAID','COMPLETED',
    'CANCELLED','VOIDED','REFUNDED','PARTIALLY_REFUNDED',
  ]),
  reason: z.string().max(500).optional(),
});

const addPaymentSchema = z.object({
  method: z.enum(['CASH','UPI','CARD','BANK_TRANSFER','WALLET','CREDIT']),
  amount: z.number().positive(),
  referenceNumber: z.string().max(255).optional(),
});

const discountSchema = z.object({
  type: z.enum(['PERCENTAGE', 'FLAT']),
  value: z.number().positive(),
  reason: z.string().max(500).optional(),
});

const updateOrderItemsSchema = z.object({
  items: z.array(z.object({
    menuItemId: z.string(),
    variantId: z.string().optional(),
    quantity: z.number().int().positive().max(999),
    unitPrice: z.number().nonnegative().optional(),
    notes: z.string().max(500).optional(),
    modifierIds: z.array(z.string()).optional(),
  })).min(1),
  sendToKitchen: z.boolean().optional(),
  notes: z.string().max(1000).optional(),
});

function getOrderService(req: Request): OrderService {
  return new OrderService(req.user!.tid, req.user!.bid);
}

export class OrderController {
  static async list(req: Request, res: Response): Promise<void> {
    const svc = getOrderService(req);
    const { status, type, tableId, from, to, page, limit } = req.query;
    const result = await svc.listOrders({
      status: status as string,
      type: type as any,
      tableId: tableId as string,
      dateFrom: from ? new Date(from as string) : undefined,
      dateTo:   to   ? new Date(to as string)   : undefined,
      page:  page  ? parseInt(page as string, 10)  : 1,
      limit: limit ? parseInt(limit as string, 10) : 50,
    });
    sendSuccess(res, result);
  }

  static async listActive(req: Request, res: Response): Promise<void> {
    const svc = getOrderService(req);
    const branchFilter = req.user!.bid && req.user!.bid !== 'default-branch'
      ? { branchId: req.user!.bid }
      : {};

    const orders = await prisma.order.findMany({
      where: {
        tenantId: req.user!.tid,
        ...branchFilter,
        status: {
          in: ['DRAFT', 'CONFIRMED', 'SENT_TO_KITCHEN', 'PREPARING', 'READY', 'SERVED', 'BILLED', 'PARTIALLY_PAID'],
        },
      },
      include: {
        table: true,
        customer: true,
        items: {
          include: {
            menuItem: true,
            variant: true,
            modifiers: true,
          },
        },
        kots: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    sendSuccess(res, orders);
  }

  static async create(req: Request, res: Response): Promise<void> {
    const dto = createOrderSchema.parse(req.body);
    const orderPayload = {
      ...dto,
      type: (dto.type || dto.orderType || 'DINE_IN') as any,
      status: dto.status,
    };
    const svc = getOrderService(req);
    const order = await svc.createOrder(orderPayload, req.user!.sub);

    await writeAuditLog(req, {
      action: AuditActions.ORDER_CREATE,
      entity: 'Order',
      entityId: order.id,
      newValue: { orderNumber: order.orderNumber, type: order.type },
    });

    sendSuccess(res, order, 201);
  }

  static async getOne(req: Request, res: Response): Promise<void> {
    const svc = getOrderService(req);
    const order = await svc.getOrder(req.params.id);
    sendSuccess(res, order);
  }

  static async updateStatus(req: Request, res: Response): Promise<void> {
    const dto = statusSchema.parse(req.body);
    const svc = getOrderService(req);
    const order = await svc.updateStatus(req.params.id, {
      ...dto,
      userId: req.user!.sub,
    });

    await writeAuditLog(req, {
      action: AuditActions.ORDER_STATUS_CHANGE,
      entity: 'Order',
      entityId: req.params.id,
      newValue: { status: dto.status, reason: dto.reason },
    });

    if (dto.status === 'SERVED') {
      const fullOrder = await prisma.order.findUnique({
        where: { id: req.params.id },
        include: { table: true },
      });
      TelegramService.sendNotificationToTenant(
        req.user!.tid,
        'FOOD_SERVED',
        `🥗 <b>Food Served to Table!</b>\n\n• <b>Order #:</b> #${fullOrder?.orderNumber || order.orderNumber}\n• <b>Table:</b> ${fullOrder?.table?.name || 'Counter / Takeaway'}\n• <b>Served By:</b> ${req.user!.email || 'Staff'}`
      ).catch((e) => console.error('[Telegram Food Served Trigger Error]:', e));
    } else if (dto.status === 'CANCELLED' || dto.status === 'VOIDED') {
      const fullOrder = await prisma.order.findUnique({
        where: { id: req.params.id },
        include: { table: true },
      });
      TelegramService.sendNotificationToTenant(
        req.user!.tid,
        'ORDER_CANCELLED_TABLES',
        `❌ <b>Order Cancelled on Tables View</b>\n\n• <b>Order #:</b> #${fullOrder?.orderNumber || order.orderNumber}\n• <b>Table:</b> ${fullOrder?.table?.name || 'Counter / Takeaway'}\n• <b>Reason:</b> ${dto.reason || 'Cancelled on floor'}\n• <b>By:</b> ${req.user!.email || 'Staff'}`
      ).catch((e) => console.error('[Telegram Cancel Tables Trigger Error]:', e));
    }

    sendSuccess(res, order);
  }

  static async updateItems(req: Request, res: Response): Promise<void> {
    const dto = updateOrderItemsSchema.parse(req.body);
    const svc = getOrderService(req);
    const order = await svc.updateOrderItems(req.params.id, dto, req.user!.sub);

    await writeAuditLog(req, {
      action: AuditActions.ORDER_UPDATE,
      entity: 'Order',
      entityId: req.params.id,
      newValue: { itemCount: dto.items.length, sendToKitchen: dto.sendToKitchen },
    });

    sendSuccess(res, order);
  }

  static async cancelItem(req: Request, res: Response): Promise<void> {
    const { reason } = z.object({ reason: z.string().max(500).optional() }).parse(req.body || {});
    const { id: orderId, itemId } = req.params;

    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId: req.user!.tid },
      include: { table: true },
    });
    if (!order) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Order not found', 404);
    }

    if (['PAID', 'COMPLETED', 'CANCELLED', 'VOIDED'].includes(order.status)) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        `Cannot cancel item because order is already ${order.status}`,
        400
      );
    }

    const item = await prisma.orderItem.findFirst({
      where: { id: itemId, orderId, status: { notIn: ['VOIDED', 'CANCELLED'] } },
      include: { menuItem: true, variant: true },
    });
    if (!item) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Item not found or already cancelled', 404);
    }

    const old = { ...item };
    const cancelNote = reason ? `[Cancelled: ${reason}]` : '[Cancelled by Staff]';

    // 1. Mark OrderItem as CANCELLED
    await prisma.orderItem.update({
      where: { id: itemId },
      data: {
        status: 'CANCELLED',
        notes: item.notes ? `${item.notes} ${cancelNote}` : cancelNote,
      },
    });

    // 2. Mark any matching OrderKotItem records as CANCELLED
    const kotItems = await prisma.orderKotItem.findMany({
      where: { orderItemId: itemId, status: { not: 'CANCELLED' } },
      include: { kot: true },
    });

    for (const ki of kotItems) {
      await prisma.orderKotItem.update({
        where: { id: ki.id },
        data: { status: 'CANCELLED' },
      });

      emitToRoom(req.user!.tid, req.user!.bid, {
        type: 'KOT_ITEM_STATUS_CHANGED',
        payload: { kotItemId: ki.id, kotId: ki.kotId, status: 'CANCELLED' },
      });

      // Check remaining active items in this KOT
      const activeSiblingItems = await prisma.orderKotItem.findMany({
        where: { kotId: ki.kotId, status: { not: 'CANCELLED' } },
      });

      if (activeSiblingItems.length === 0) {
        await prisma.orderKot.update({
          where: { id: ki.kotId },
          data: { status: 'CANCELLED' },
        });

        emitToRoom(req.user!.tid, req.user!.bid, {
          type: 'KOT_STATUS_CHANGED',
          payload: { kotId: ki.kotId, status: 'CANCELLED', stationId: ki.kot.kitchenStationId || 'default' },
        });
      }
    }

    // 3. Recalculate order totals dynamically
    const svc = getOrderService(req);
    const updatedOrder = await svc.recalculateTotals(orderId);

    // 4. Check remaining active items in the entire order
    const remainingActiveItems = await prisma.orderItem.findMany({
      where: { orderId, status: { notIn: ['VOIDED', 'CANCELLED'] } },
    });

    let newOrderStatus: string | null = null;
    if (remainingActiveItems.length === 0) {
      // If ALL items are cancelled, cancel the whole order & release table
      newOrderStatus = 'CANCELLED';
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancellationReason: reason ? `Item Cancelled: ${reason}` : 'All items cancelled by staff',
        },
      });

      if (order.tableId) {
        await prisma.restaurantTable.update({
          where: { id: order.tableId },
          data: { status: 'AVAILABLE' },
        });
        emitToRoom(req.user!.tid, req.user!.bid, {
          type: 'TABLE_STATUS_CHANGED',
          payload: { tableId: order.tableId, status: 'AVAILABLE' },
        });
      }
    } else {
      // Check if all remaining KOTs are served
      const activeKots = await prisma.orderKot.findMany({
        where: { orderId, status: { not: 'CANCELLED' } },
      });
      if (activeKots.length > 0 && activeKots.every((k) => k.status === 'SERVED')) {
        newOrderStatus = 'SERVED';
        await prisma.order.update({
          where: { id: orderId },
          data: { status: 'SERVED' },
        });
      }
    }

    if (newOrderStatus && newOrderStatus !== order.status) {
      emitToRoom(req.user!.tid, req.user!.bid, {
        type: 'ORDER_STATUS_CHANGED',
        payload: {
          orderId,
          orderNumber: order.orderNumber,
          status: newOrderStatus as any,
        },
      });
    }

    emitToRoom(req.user!.tid, req.user!.bid, {
      type: 'ORDER_UPDATED',
      payload: {
        orderId,
        orderNumber: order.orderNumber,
        total: Number(updatedOrder?.total || 0),
        itemCount: remainingActiveItems.length,
      },
    });

    await writeAuditLog(req, {
      action: AuditActions.ORDER_ITEM_VOID,
      entity: 'OrderItem',
      entityId: itemId,
      previousValue: old as any,
      newValue: { status: 'CANCELLED', reason },
    });

    // Dispatch Telegram Bot Notification (ORDER_CANCELLED_TABLES)
    TelegramService.sendNotificationToTenant(
      req.user!.tid,
      'ORDER_CANCELLED_TABLES',
      `❌ <b>Item Cancelled on Tables View</b>\n\n• <b>Order #:</b> #${order.orderNumber}\n• <b>Table:</b> ${order.table?.name || 'Counter / Takeaway'}\n• <b>Item:</b> ${item.quantity}x ${item.menuItem?.name || 'Item'}${item.variant?.name ? ` (${item.variant.name})` : ''}\n• <b>Reason:</b> ${reason || 'Cancelled by staff'}\n• <b>By:</b> ${req.user!.email || 'Staff'}`
    ).catch((e) => console.error('[Telegram Cancel Tables Trigger Error]:', e));

    const refreshedOrder = await svc.getOrder(orderId);
    sendSuccess(res, refreshedOrder);
  }

  static async voidItem(req: Request, res: Response): Promise<void> {
    return OrderController.cancelItem(req, res);
  }

  static async addItem(req: Request, res: Response): Promise<void> {
    // TODO: implement add-item-to-existing-order flow
    sendSuccess(res, { message: 'Not yet implemented' });
  }

  static async applyDiscount(req: Request, res: Response): Promise<void> {
    const dto = discountSchema.parse(req.body);
    const orderId = req.params.id;

    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId: req.user!.tid },
    });
    if (!order) throw new Error('Order not found');

    const amount = dto.type === 'PERCENTAGE'
      ? (Number(order.subtotal) * dto.value) / 100
      : dto.value;

    await prisma.appliedDiscount.create({
      data: { orderId, type: dto.type, amount, reason: dto.reason, appliedBy: req.user!.sub },
    });

    const svc = getOrderService(req);
    await svc.recalculateTotals(orderId);

    await writeAuditLog(req, {
      action: AuditActions.ORDER_DISCOUNT,
      entity: 'Order',
      entityId: orderId,
      newValue: { type: dto.type, value: dto.value, amount, reason: dto.reason },
    });

    sendSuccess(res, { message: 'Discount applied', amount });
  }

  static async addPayment(req: Request, res: Response): Promise<void> {
    const dto = addPaymentSchema.parse(req.body);
    const orderId = req.params.id;
    const paymentSvc = new PaymentService(req.user!.tid, req.user!.bid);
    const payment = await paymentSvc.addPayment(orderId, dto, req.user!.sub);

    await writeAuditLog(req, {
      action: AuditActions.PAYMENT_CREATE,
      entity: 'Payment',
      entityId: payment.id,
      newValue: { method: dto.method, amount: dto.amount },
    });

    sendSuccess(res, payment, 201);
  }

  static async refund(req: Request, res: Response): Promise<void> {
    const dto = z.object({
      paymentId: z.string().uuid(),
      amount:    z.number().positive(),
      reason:    z.string().max(500).optional(),
      refundMethod: z.string().optional(),
    }).parse(req.body);

    const paymentSvc = new PaymentService(req.user!.tid, req.user!.bid);
    const refund = await paymentSvc.refund(req.params.id, dto, req.user!.sub);

    await writeAuditLog(req, {
      action: AuditActions.PAYMENT_REFUND,
      entity: 'Payment',
      entityId: dto.paymentId,
      newValue: { amount: dto.amount, reason: dto.reason },
    });

    sendSuccess(res, refund, 201);
  }

  static async getInvoice(req: Request, res: Response): Promise<void> {
    const svc = getOrderService(req);
    const order = await svc.getOrder(req.params.id);
    const pdf = await generateInvoicePdf(order);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${order.orderNumber}.pdf"`);
    pdf.pipe(res);
    pdf.end();
  }

  static async addRunningKot(req: Request, res: Response): Promise<void> {
    const dto = z.object({
      items: z.array(z.object({
        menuItemId: z.string(),
        variantId: z.string().optional(),
        quantity: z.number().int().positive().max(999),
        unitPrice: z.number().nonnegative().optional(),
        notes: z.string().max(500).optional(),
        modifierIds: z.array(z.string()).optional(),
      })).min(1),
    }).parse(req.body);

    const svc = getOrderService(req);
    const order = await svc.addRunningKot(req.params.id, dto.items, req.user!.sub);

    await writeAuditLog(req, {
      action: AuditActions.ORDER_UPDATE,
      entity: 'Order',
      entityId: req.params.id,
      newValue: { runningKot: true, itemCount: dto.items.length },
    });

    sendSuccess(res, order, 201);
  }

  static async getKots(req: Request, res: Response): Promise<void> {
    const kots = await prisma.orderKot.findMany({
      where: { orderId: req.params.id },
      include: {
        kitchenStation: true,
        items: {
          include: {
            orderItem: {
              include: {
                menuItem: { select: { name: true } },
                variant:  { select: { name: true } },
                modifiers: true,
              },
            },
          },
        },
      },
    });
    sendSuccess(res, kots);
  }
}
