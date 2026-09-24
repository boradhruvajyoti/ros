import { Request, Response } from 'express';
import { sendSuccess } from '../middlewares/error.middleware';

export class TransferController {
  static async listTransfers(req: Request, res: Response): Promise<void> {
    const transfers = [
      {
        id: 'TRF-2026-089',
        transferNumber: 'TRF-089',
        sourceBranch: 'Central Commissary & Warehouse',
        destBranch: 'Main Branch - Indiranagar',
        status: 'IN_TRANSIT',
        itemCount: 8,
        totalUnits: 140,
        dispatchedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        driverName: 'Ramesh Transport (KA-01-AB-1234)',
        expectedDelivery: new Date(Date.now() + 3600000 * 1).toISOString(),
        items: [
          { name: 'Fresh Malai Paneer', qty: 25, unit: 'KG' },
          { name: 'Amul Salted Butter', qty: 20, unit: 'KG' },
          { name: 'Royal Basmati Rice XXL', qty: 80, unit: 'KG' },
          { name: 'House Special Garam Masala', qty: 15, unit: 'KG' },
        ],
      },
      {
        id: 'TRF-2026-088',
        transferNumber: 'TRF-088',
        sourceBranch: 'Main Branch - Indiranagar',
        destBranch: 'Koramangala Outlet',
        status: 'COMPLETED',
        itemCount: 3,
        totalUnits: 45,
        dispatchedAt: new Date(Date.now() - 86400000).toISOString(),
        receivedAt: new Date(Date.now() - 86400000 + 7200000).toISOString(),
        driverName: 'QuickLogistics Van 4',
        items: [
          { name: 'Farm Tomatoes', qty: 30, unit: 'KG' },
          { name: 'Red Onions', qty: 15, unit: 'KG' },
        ],
      },
    ];

    sendSuccess(res, transfers);
  }

  static async createTransfer(req: Request, res: Response): Promise<void> {
    const { sourceBranch, destBranch, items } = req.body;
    const transferNumber = `TRF-${Math.floor(100 + Math.random() * 900)}`;
    sendSuccess(res, {
      id: `TRF-2026-${transferNumber}`,
      transferNumber,
      sourceBranch: sourceBranch || 'Central Commissary & Warehouse',
      destBranch: destBranch || 'Main Branch - Indiranagar',
      status: 'DISPATCHED',
      itemCount: items?.length || 3,
      dispatchedAt: new Date().toISOString(),
    }, 201);
  }

  static async receiveTransfer(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    sendSuccess(res, {
      id,
      status: 'COMPLETED',
      receivedAt: new Date().toISOString(),
      message: 'Stock updated in destination branch inventory',
    });
  }
}
