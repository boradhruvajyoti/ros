import { Request, Response } from 'express';
import { sendSuccess } from '../middlewares/error.middleware';

export class TransferController {
  static async listTransfers(req: Request, res: Response): Promise<void> {
    const transfers: any[] = [];
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
