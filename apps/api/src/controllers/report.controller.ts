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

  static async getFinancialAnalytics(req: Request, res: Response) {
    const tenantId = req.user!.tid;
    const branchId = req.user!.bid!;

    const [orders, expenses, expenseCategories] = await Promise.all([
      prisma.order.findMany({
        where: {
          tenantId,
          branchId,
          status: { notIn: ['CANCELLED', 'VOIDED'] },
        },
        select: {
          id: true,
          total: true,
          subtotal: true,
          taxAmount: true,
          discountAmount: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.expense.findMany({
        where: {
          tenantId,
          branchId,
          status: 'APPROVED',
        },
        include: {
          category: true,
        },
        orderBy: { date: 'asc' },
      }),
      prisma.expenseCategory.findMany({
        where: { tenantId },
        select: { id: true, name: true },
      }),
    ]);

    // Format helper functions
    const getDayKey = (d: Date) => d.toISOString().slice(0, 10);
    const getMonthKey = (d: Date) => d.toISOString().slice(0, 7);
    const getWeekKey = (d: Date) => {
      const tempDate = new Date(d.getTime());
      tempDate.setHours(0, 0, 0, 0);
      tempDate.setDate(tempDate.getDate() + 4 - (tempDate.getDay() || 7));
      const yearStart = new Date(tempDate.getFullYear(), 0, 1);
      const weekNo = Math.ceil((((tempDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      return `${tempDate.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    };

    // Build Daily Data (Last 14 days or dynamic)
    const dailyMap: Record<string, { revenue: number; expenses: number; ordersCount: number }> = {};
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      dailyMap[getDayKey(d)] = { revenue: 0, expenses: 0, ordersCount: 0 };
    }

    // Build Monthly Data (Last 12 months)
    const monthlyMap: Record<string, { revenue: number; expenses: number; ordersCount: number }> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthlyMap[getMonthKey(d)] = { revenue: 0, expenses: 0, ordersCount: 0 };
    }

    // Build Weekly Data (Last 8 weeks)
    const weeklyMap: Record<string, { revenue: number; expenses: number; ordersCount: number }> = {};
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 7 * 86400000);
      weeklyMap[getWeekKey(d)] = { revenue: 0, expenses: 0, ordersCount: 0 };
    }

    // Aggregate Orders
    for (const order of orders) {
      const dateObj = new Date(order.createdAt);
      const dayK = getDayKey(dateObj);
      const monthK = getMonthKey(dateObj);
      const weekK = getWeekKey(dateObj);
      const orderAmount = Number(order.total || 0);

      if (dailyMap[dayK]) {
        dailyMap[dayK].revenue += orderAmount;
        dailyMap[dayK].ordersCount += 1;
      }
      if (monthlyMap[monthK]) {
        monthlyMap[monthK].revenue += orderAmount;
        monthlyMap[monthK].ordersCount += 1;
      }
      if (weeklyMap[weekK]) {
        weeklyMap[weekK].revenue += orderAmount;
        weeklyMap[weekK].ordersCount += 1;
      }
    }

    // Aggregate Expenses
    const expenseBreakdownMap: Record<string, number> = {};
    for (const exp of expenses) {
      const dateObj = new Date(exp.date || exp.createdAt);
      const dayK = getDayKey(dateObj);
      const monthK = getMonthKey(dateObj);
      const weekK = getWeekKey(dateObj);
      const expAmount = Number(exp.amount || 0);
      const catName = exp.category?.name || 'General Overheads';

      expenseBreakdownMap[catName] = (expenseBreakdownMap[catName] || 0) + expAmount;

      if (dailyMap[dayK]) {
        dailyMap[dayK].expenses += expAmount;
      }
      if (monthlyMap[monthK]) {
        monthlyMap[monthK].expenses += expAmount;
      }
      if (weeklyMap[weekK]) {
        weeklyMap[weekK].expenses += expAmount;
      }
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const daily = Object.entries(dailyMap).map(([date, val]) => {
      const [y, m, d] = date.split('-');
      const pnl = val.revenue - val.expenses;
      const margin = val.revenue > 0 ? Math.round((pnl / val.revenue) * 1000) / 10 : 0;
      return {
        key: date,
        label: `${parseInt(d)} ${monthNames[parseInt(m) - 1]}`,
        revenue: Math.round(val.revenue),
        expenses: Math.round(val.expenses),
        pnl: Math.round(pnl),
        margin,
        ordersCount: val.ordersCount,
      };
    });

    const weekly = Object.entries(weeklyMap).map(([week, val]) => {
      const pnl = val.revenue - val.expenses;
      const margin = val.revenue > 0 ? Math.round((pnl / val.revenue) * 1000) / 10 : 0;
      return {
        key: week,
        label: week.replace('-', ' '),
        revenue: Math.round(val.revenue),
        expenses: Math.round(val.expenses),
        pnl: Math.round(pnl),
        margin,
        ordersCount: val.ordersCount,
      };
    });

    const monthly = Object.entries(monthlyMap).map(([month, val]) => {
      const [y, m] = month.split('-');
      const pnl = val.revenue - val.expenses;
      const margin = val.revenue > 0 ? Math.round((pnl / val.revenue) * 1000) / 10 : 0;
      return {
        key: month,
        label: `${monthNames[parseInt(m) - 1]} ${y.slice(2)}`,
        revenue: Math.round(val.revenue),
        expenses: Math.round(val.expenses),
        pnl: Math.round(pnl),
        margin,
        ordersCount: val.ordersCount,
      };
    });

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const netPnl = totalRevenue - totalExpenses;
    const overallMargin = totalRevenue > 0 ? Math.round((netPnl / totalRevenue) * 1000) / 10 : 0;

    const expenseCategoryBreakdown = Object.entries(expenseBreakdownMap).map(([name, amount]) => ({
      name,
      amount: Math.round(amount),
      percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 1000) / 10 : 0,
    }));

    sendSuccess(res, {
      summary: {
        totalRevenue: Math.round(totalRevenue),
        totalExpenses: Math.round(totalExpenses),
        netPnl: Math.round(netPnl),
        profitMargin: overallMargin,
        totalOrders: orders.length,
        avgOrderValue: orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0,
        isProfitable: netPnl >= 0,
      },
      daily,
      weekly,
      monthly,
      expenseCategoryBreakdown,
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
