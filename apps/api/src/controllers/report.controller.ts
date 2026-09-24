// =============================================================================
// Report Controller — Financial Intelligence & Analytics
// =============================================================================

import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendSuccess } from '../middlewares/error.middleware';

export class ReportController {
  static async getSummary(req: Request, res: Response) {
    const tenantId = req.user!.tid;
    const branchId = req.user!.bid!;

    const [orders, expenses, tablesCount] = await Promise.all([
      prisma.order.findMany({
        where: { tenantId, branchId, status: { notIn: ['CANCELLED', 'VOIDED'] } },
        select: { total: true, subtotal: true, taxAmount: true, type: true, createdAt: true },
      }),
      prisma.expense.findMany({
        where: { tenantId, branchId, status: 'APPROVED' },
        select: { amount: true, category: true },
      }),
      prisma.restaurantTable.count({
        where: { tenantId, branchId, isActive: true },
      }),
    ]);

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const grossProfit = totalRevenue * 0.7; // ~70% gross margin standard
    const netProfit = grossProfit - totalExpenses;

    sendSuccess(res, {
      totalRevenue,
      totalOrders: orders.length,
      totalExpenses,
      grossProfit,
      netProfit,
      activeTables: tablesCount,
    });
  }

  static async getSalesReport(req: Request, res: Response) {
    const tenantId = req.user!.tid;
    const branchId = req.user!.bid!;

    const orders = await prisma.order.findMany({
      where: { tenantId, branchId, status: { notIn: ['CANCELLED', 'VOIDED'] } },
      include: {
        items: { include: { menuItem: true } },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const totalSales = orders.reduce((s, o) => s + Number(o.total), 0);
    const dineInCount = orders.filter((o) => o.type === 'DINE_IN').length;
    const takeawayCount = orders.filter((o) => o.type === 'TAKEAWAY').length;
    const deliveryCount = orders.filter((o) => o.type === 'DELIVERY' || o.type === 'ONLINE').length;

    sendSuccess(res, {
      totalSales,
      totalOrders: orders.length,
      breakdown: {
        dineIn: dineInCount,
        takeaway: takeawayCount,
        delivery: deliveryCount,
      },
      recentOrders: orders.slice(0, 20),
    });
  }

  static async getPaymentReport(req: Request, res: Response) {
    const tenantId = req.user!.tid;
    const branchId = req.user!.bid!;

    const payments = await prisma.payment.findMany({
      where: { tenantId, branchId, status: 'SUCCESS' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const byMethod = payments.reduce((acc: Record<string, number>, p) => {
      acc[p.method] = (acc[p.method] || 0) + Number(p.amount);
      return acc;
    }, {});

    const totalCollected = payments.reduce((s, p) => s + Number(p.amount), 0);

    sendSuccess(res, {
      totalCollected,
      count: payments.length,
      byMethod,
      payments: payments.slice(0, 20),
    });
  }

  static async getTaxReport(req: Request, res: Response) {
    const tenantId = req.user!.tid;
    const branchId = req.user!.bid!;

    const orders = await prisma.order.findMany({
      where: { tenantId, branchId, status: { notIn: ['CANCELLED', 'VOIDED'] } },
      select: { subtotal: true, taxAmount: true, total: true },
    });

    const taxableSales = orders.reduce((s, o) => s + Number(o.subtotal), 0);
    const totalTax = orders.reduce((s, o) => s + Number(o.taxAmount), 0);
    const cgst = totalTax / 2;
    const sgst = totalTax / 2;

    sendSuccess(res, {
      taxableSales,
      totalTax,
      cgst,
      sgst,
      totalGrossSales: taxableSales + totalTax,
      filingPeriod: new Date().toISOString().slice(0, 7),
    });
  }
}
