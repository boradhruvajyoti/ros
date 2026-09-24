// =============================================================================
// Payment Controller
// =============================================================================

import { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';
import { sendSuccess } from '../middlewares/error.middleware';
import { writeAuditLog, AuditActions } from '../middlewares/audit.middleware';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const addPaymentSchema = z.object({
  orderId: z.string(),
  method: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'WALLET', 'CREDIT']),
  amount: z.number().positive(),
  referenceNumber: z.string().max(255).optional(),
});

const refundPaymentSchema = z.object({
  orderId: z.string(),
  paymentId: z.string(),
  amount: z.number().positive(),
  reason: z.string().max(500).optional(),
  refundMethod: z.string().max(30).optional(),
});

export class PaymentController {
  static async addPayment(req: Request, res: Response) {
    const data = addPaymentSchema.parse(req.body);
    const service = new PaymentService(req.user!.tid, req.user!.bid!);
    const payment = await service.addPayment(
      data.orderId,
      { method: data.method, amount: data.amount, referenceNumber: data.referenceNumber },
      req.user!.sub
    );

    writeAuditLog(req, {
      action: AuditActions.PAYMENT_CREATE,
      entity: 'Payment',
      entityId: payment.id,
      newValue: { orderId: data.orderId, amount: data.amount, method: data.method },
    });

    sendSuccess(res, payment, 201);
  }

  static async refund(req: Request, res: Response) {
    const data = refundPaymentSchema.parse(req.body);
    const service = new PaymentService(req.user!.tid, req.user!.bid!);
    const refund = await service.refund(
      data.orderId,
      {
        paymentId: data.paymentId,
        amount: data.amount,
        reason: data.reason,
        refundMethod: data.refundMethod,
      },
      req.user!.sub
    );

    writeAuditLog(req, {
      action: AuditActions.PAYMENT_REFUND,
      entity: 'Refund',
      entityId: refund.id,
      newValue: { orderId: data.orderId, paymentId: data.paymentId, amount: data.amount },
    });

    sendSuccess(res, refund, 201);
  }

  static async listPayments(req: Request, res: Response) {
    const { orderId } = req.query;
    const where: any = {
      tenantId: req.user!.tid,
      branchId: req.user!.bid!,
    };
    if (orderId) where.orderId = String(orderId);

    const payments = await prisma.payment.findMany({
      where,
      include: { refunds: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    sendSuccess(res, payments);
  }
}
