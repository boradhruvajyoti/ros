// =============================================================================
// Procurement Controller — Suppliers, POs, and GRNs
// =============================================================================

import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendSuccess } from '../middlewares/error.middleware';
import { generateULID } from '@ros/utils';
import { z } from 'zod';

const createSupplierSchema = z.object({
  name: z.string().min(1),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  gstin: z.string().optional(),
  paymentTerms: z.string().optional(),
});

const createPoSchema = z.object({
  supplierId: z.string(),
  expectedDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    ingredientId: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
  })).min(1),
});

export class ProcurementController {
  static async listSuppliers(req: Request, res: Response) {
    const suppliers = await prisma.supplier.findMany({
      where: { tenantId: req.user!.tid, isActive: true },
      orderBy: { name: 'asc' },
    });
    sendSuccess(res, suppliers);
  }

  static async createSupplier(req: Request, res: Response) {
    const data = createSupplierSchema.parse(req.body);
    const supplier = await prisma.supplier.create({
      data: {
        ...data,
        tenantId: req.user!.tid,
      },
    });
    sendSuccess(res, supplier, 201);
  }

  static async listPurchaseOrders(req: Request, res: Response) {
    const pos = await prisma.purchaseOrder.findMany({
      where: { tenantId: req.user!.tid, branchId: req.user!.bid! },
      include: { supplier: true, items: true },
      orderBy: { createdAt: 'desc' },
    });
    sendSuccess(res, pos);
  }

  static async createPurchaseOrder(req: Request, res: Response) {
    const data = createPoSchema.parse(req.body);
    const totalAmount = data.items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
    const poNumber = `PO-${Date.now().toString().slice(-6)}`;

    const po = await prisma.purchaseOrder.create({
      data: {
        id: generateULID(),
        tenantId: req.user!.tid,
        branchId: req.user!.bid!,
        supplierId: data.supplierId,
        poNumber,
        status: 'SENT',
        totalAmount,
        expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
        notes: data.notes || null,
        createdBy: req.user!.sub,
        items: {
          create: data.items.map((i) => ({
            ingredientId: i.ingredientId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            lineTotal: i.quantity * i.unitPrice,
          })),
        },
      },
      include: { items: true, supplier: true },
    });

    sendSuccess(res, po, 201);
  }
}
