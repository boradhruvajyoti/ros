// =============================================================================
// Franchise Royalty & Multi-Brand Settlement Controller
// =============================================================================

import { Request, Response } from 'express';
import { sendSuccess } from '../middlewares/error.middleware';

export class FranchiseController {
  static async getOverview(req: Request, res: Response): Promise<void> {
    const franchises = [
      {
        id: 'FRAN-001',
        name: 'Spice Garden - Koramangala 80ft Rd',
        franchisee: 'Gowda Hospitality Pvt Ltd',
        city: 'Bangalore',
        monthlyGrossSales: 1850000,
        royaltyRate: 5.0, // 5%
        marketingFundRate: 2.0, // 2%
        royaltyPayable: 92500,
        marketingPayable: 37000,
        totalDue: 129500,
        settlementStatus: 'PAID',
        auditScore: '96.8% (Grade A)',
      },
      {
        id: 'FRAN-002',
        name: 'Spice Garden - Whitefield EPIP',
        franchisee: 'Apex Food Services LLP',
        city: 'Bangalore',
        monthlyGrossSales: 2240000,
        royaltyRate: 5.0,
        marketingFundRate: 2.0,
        royaltyPayable: 112000,
        marketingPayable: 44800,
        totalDue: 156800,
        settlementStatus: 'PENDING_INVOICE',
        auditScore: '94.2% (Grade A)',
      },
      {
        id: 'FRAN-003',
        name: 'Spice Garden - Hyderabad Hitech City',
        franchisee: 'Deccan Dine Holdings',
        city: 'Hyderabad',
        monthlyGrossSales: 2890000,
        royaltyRate: 5.5,
        marketingFundRate: 2.0,
        royaltyPayable: 158950,
        marketingPayable: 57800,
        totalDue: 216750,
        settlementStatus: 'PAID',
        auditScore: '98.5% (Grade A+)',
      },
    ];

    const stats = {
      totalFranchiseNetworkRevenue: 6980000,
      totalRoyaltiesCollectedMonth: 363450,
      marketingFundPool: 139600,
      activeFranchiseLocations: 3,
      avgQsrAuditScore: '96.5%',
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
