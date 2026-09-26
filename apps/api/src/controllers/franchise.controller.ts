// =============================================================================
// Franchise Royalty & Multi-Brand Settlement Controller
// =============================================================================

import { Request, Response } from 'express';
import { sendSuccess } from '../middlewares/error.middleware';
import { prisma } from '../lib/prisma';

export class FranchiseController {
  static async getOverview(req: Request, res: Response): Promise<void> {
    const tenantId = req.user!.tid;

    const branches = await prisma.branch.findMany({
      where: { tenantId, isActive: true },
      include: {
        orders: {
          where: { status: { in: ['PAID', 'COMPLETED'] } },
          select: { total: true },
        },
      },
    });

    const franchises = branches.map((b) => {
      const grossSales = b.orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
      const royaltyRate = 0.05;
      const brandFundRate = 0.02;
      const royaltyDue = Math.round(grossSales * royaltyRate);
      const brandFundDue = Math.round(grossSales * brandFundRate);
      const totalDue = royaltyDue + brandFundDue;

      return {
        id: b.id,
        name: b.name,
        code: b.id.slice(-6).toUpperCase(),
        brand: b.name,
        franchisee: b.name,
        city: b.address || 'Branch Location',
        grossSales,
        royaltyRate,
        brandFundRate,
        royaltyDue,
        brandFundDue,
        totalDue,
        status: totalDue > 0 ? 'PENDING' : 'SETTLED',
        slaScore: 100,
        lastSettlement: 'N/A',
      };
    });

    const totalGrossSales = franchises.reduce((acc, f) => acc + f.grossSales, 0);
    const totalRoyalties = franchises.reduce((acc, f) => acc + f.royaltyDue, 0);
    const totalBrandFund = franchises.reduce((acc, f) => acc + f.brandFundDue, 0);

    const stats = {
      totalFranchiseNetworkRevenue: totalGrossSales,
      totalRoyaltiesCollectedMonth: totalRoyalties,
      marketingFundPool: totalBrandFund,
      activeFranchiseLocations: franchises.length,
      avgQsrAuditScore: '100%',
    };

    sendSuccess(res, { franchises, stats });
  }

  static async generateInvoice(req: Request, res: Response): Promise<void> {
    const { franchiseId } = req.body;
    sendSuccess(res, {
      invoiceNumber: `INV-ROY-${Math.floor(1000 + Math.random() * 9000)}`,
      franchiseId,
      status: 'ISSUED',
      dueDate: new Date(Date.now() + 86400000 * 15).toISOString(),
      message: 'Monthly royalty & brand fund invoice generated.',
    });
  }
}
