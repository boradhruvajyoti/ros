// =============================================================================
// Payment Service
// =============================================================================

import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/error.middleware';
import { ErrorCodes } from '@ros/shared-types';
import { addAmounts, toAmount } from '@ros/utils';
import { generateULID } from '@ros/utils';
import { emitToRoom } from '../socket';

export class PaymentService {
  private tenantId: string;
  private branchId: string;

  constructor(tenantId: string, branchId: string) {
    this.tenantId = tenantId;
    this.branchId = branchId;
  }

  async addPayment(
    orderId: string,
    dto: { method: string; amount: number; referenceNumber?: string },
    createdBy: string
  ) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId: this.tenantId },
      include: { payments: { where: { status: 'COMPLETED' } } },
    });

    if (!order) throw new AppError(ErrorCodes.NOT_FOUND, 'Order not found', 404);

    if (['VOIDED', 'REFUNDED', 'CANCELLED'].includes(order.status)) {
      throw new AppError(ErrorCodes.ORDER_ALREADY_PAID, 'Order cannot accept payment in current state', 422);
    }

    const alreadyPaid = order.payments.reduce((s, p) => addAmounts(s, p.amount), 0);
    const totalDue = toAmount(order.total);
    const newPaid = addAmounts(alreadyPaid, dto.amount);

    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          id: generateULID(),
          orderId,
          tenantId: this.tenantId,
          branchId: this.branchId,
          method: dto.method,
          amount: dto.amount,
          referenceNumber: dto.referenceNumber || null,
          status: 'COMPLETED',
          createdBy,
        },
      });

      // Determine new order status
      let newOrderStatus: string;
      const overpaid = newPaid >= totalDue;

      if (overpaid) {
        newOrderStatus = 'PAID';
      } else {
        newOrderStatus = 'PARTIALLY_PAID';
      }

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: newOrderStatus,
          paidAmount: newPaid,
          statusHistory: {
            create: {
              fromStatus: order.status,
              toStatus: newOrderStatus,
              changedBy: createdBy,
              reason: `Payment: ${dto.method} ₹${dto.amount}`,
            },
          },
        },
      });

      // Record cash movement if cash payment
      if (dto.method === 'CASH') {
        const openSession = await tx.cashSession.findFirst({
          where: { tenantId: this.tenantId, branchId: this.branchId, closedAt: null },
        });
        if (openSession) {
          await tx.cashMovement.create({
            data: {
              sessionId: openSession.id,
              tenantId: this.tenantId,
              branchId: this.branchId,
              type: 'SALE',
              amount: dto.amount,
              referenceId: orderId,
              notes: `Order ${order.orderNumber}`,
              createdBy,
            },
          });
          await tx.cashSession.update({
            where: { id: openSession.id },
            data: { expectedBalance: { increment: dto.amount } },
          });
        }
      }

      // Release table to AVAILABLE directly when order is fully paid
      if (overpaid && order.tableId) {
        await tx.restaurantTable.update({
          where: { id: order.tableId },
          data: { status: 'AVAILABLE' },
        });
        emitToRoom(this.tenantId, this.branchId, {
          type: 'TABLE_STATUS_CHANGED',
          payload: { tableId: order.tableId, status: 'AVAILABLE' },
        });
      }

      emitToRoom(this.tenantId, this.branchId, {
        type: 'PAYMENT_COMPLETED',
        payload: { orderId, amount: dto.amount, method: dto.method },
      });

      return payment;
    });
  }

  async refund(
    orderId: string,
    dto: { paymentId: string; amount: number; reason?: string; refundMethod?: string },
    approvedBy: string
  ) {
    const payment = await prisma.payment.findFirst({
      where: { id: dto.paymentId, orderId, tenantId: this.tenantId },
    });

    if (!payment) throw new AppError(ErrorCodes.NOT_FOUND, 'Payment not found', 404);

    const totalRefunded = await prisma.refund.aggregate({
      where: { paymentId: dto.paymentId },
      _sum: { amount: true },
    });

    const alreadyRefunded = toAmount(totalRefunded._sum.amount || 0);
    const maxRefund = toAmount(payment.amount) - alreadyRefunded;

    if (dto.amount > maxRefund) {
      throw new AppError(ErrorCodes.PAYMENT_AMOUNT_MISMATCH, `Maximum refundable amount is ₹${maxRefund}`, 422);
    }

    return prisma.$transaction(async (tx) => {
      const refund = await tx.refund.create({
        data: {
          paymentId: dto.paymentId,
          orderId,
          amount: dto.amount,
          reason: dto.reason,
          refundMethod: dto.refundMethod || payment.method,
          approvedBy,
        },
      });

      // Update order status
      const newRefunded = addAmounts(alreadyRefunded, dto.amount);
      const newStatus = newRefunded >= toAmount(payment.amount) ? 'REFUNDED' : 'PARTIALLY_REFUNDED';

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: newStatus,
          statusHistory: {
            create: {
              fromStatus: 'PAID',
              toStatus: newStatus,
              changedBy: approvedBy,
              reason: dto.reason,
            },
          },
        },
      });

      await tx.payment.update({
        where: { id: dto.paymentId },
        data: { status: newStatus === 'REFUNDED' ? 'REFUNDED' : 'PARTIALLY_REFUNDED' },
      });

      return refund;
    });
  }
}
