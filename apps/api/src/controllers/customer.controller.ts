// =============================================================================
// Customer Controller — Profiles, Loyalty, and Preferences
// =============================================================================

import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendSuccess } from '../middlewares/error.middleware';
import { z } from 'zod';

const createCustomerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(5),
  email: z.string().email().optional().or(z.literal('')),
  preferences: z.string().optional(),
  address: z.string().optional(),
});

export class CustomerController {
  static async listCustomers(req: Request, res: Response) {
    const customers = await prisma.customer.findMany({
      where: {
        tenantId: req.user!.tid,
        isActive: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    sendSuccess(res, customers);
  }

  static async createCustomer(req: Request, res: Response) {
    const data = createCustomerSchema.parse(req.body);
    const customer = await prisma.customer.upsert({
      where: {
        tenantId_phone: {
          tenantId: req.user!.tid,
          phone: data.phone,
        },
      },
      create: {
        tenantId: req.user!.tid,
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        preferences: data.preferences || null,
        address: data.address || null,
      },
      update: {
        name: data.name,
        email: data.email || null,
        preferences: data.preferences || null,
        address: data.address || null,
      },
    });
    sendSuccess(res, customer, 201);
  }
}
