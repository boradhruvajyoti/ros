// =============================================================================
// Expense Controller — Cash vouchers and operational costs
// =============================================================================

import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendSuccess } from '../middlewares/error.middleware';
import { generateULID } from '@ros/utils';
import { z } from 'zod';

const createExpenseSchema = z.object({
  categoryId: z.string().optional(),
  amount: z.number().positive(),
  date: z.string().optional(),
  paymentMode: z.enum(['CASH', 'BANK', 'UPI', 'CARD']),
  vendor: z.string().optional(),
  description: z.string().min(1),
  receiptUrl: z.string().optional(),
});

export class ExpenseController {
  static async listExpenses(req: Request, res: Response) {
    const expenses = await prisma.expense.findMany({
      where: { tenantId: req.user!.tid, branchId: req.user!.bid! },
      include: { category: true },
      orderBy: { date: 'desc' },
      take: 100,
    });
    sendSuccess(res, expenses);
  }

  static async createExpense(req: Request, res: Response) {
    const data = createExpenseSchema.parse(req.body);

    // Find or default category
    let categoryId = data.categoryId;
    if (!categoryId) {
      const defaultCategory = await prisma.expenseCategory.findFirst({
        where: { tenantId: req.user!.tid },
      });
      if (defaultCategory) {
        categoryId = defaultCategory.id;
      } else {
        const createdCat = await prisma.expenseCategory.create({
          data: { tenantId: req.user!.tid, name: 'General Operating Expenses' },
        });
        categoryId = createdCat.id;
      }
    }

    const expense = await prisma.expense.create({
      data: {
        id: generateULID(),
        tenantId: req.user!.tid,
        branchId: req.user!.bid!,
        categoryId,
        amount: data.amount,
        date: data.date ? new Date(data.date) : new Date(),
        paymentMode: data.paymentMode,
        vendor: data.vendor || null,
        description: data.description,
        receiptUrl: data.receiptUrl || null,
        status: 'APPROVED',
        createdBy: req.user!.sub,
      },
    });

    sendSuccess(res, expense, 201);
  }

  static async getSummary(req: Request, res: Response) {
    const expenses = await prisma.expense.findMany({
      where: { tenantId: req.user!.tid, branchId: req.user!.bid! },
      include: { category: true },
    });

    const totalExpense = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const byCategory = expenses.reduce((acc: Record<string, number>, e) => {
      const catName = e.category?.name || 'Uncategorized';
      acc[catName] = (acc[catName] || 0) + Number(e.amount);
      return acc;
    }, {});

    sendSuccess(res, {
      totalExpense,
      count: expenses.length,
      byCategory,
      recentExpenses: expenses.slice(0, 10),
    });
  }
}
