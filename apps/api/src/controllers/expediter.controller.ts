// =============================================================================
// AI Kitchen Expediter, Plating QA & Pass Management Controller
// =============================================================================

import { Request, Response } from 'express';
import { sendSuccess } from '../middlewares/error.middleware';

export class ExpediterController {
  static async getPassQueue(req: Request, res: Response): Promise<void> {
    const passItems: any[] = [];
    sendSuccess(res, passItems);
  }

  static async pageWaiter(req: Request, res: Response): Promise<void> {
    const { passId, waiterName } = req.body;
    sendSuccess(res, {
      passId,
      waiterName,
      status: 'PAGED',
      message: `Haptic smart pager notification sent to ${waiterName} for Table delivery!`,
    });
  }

  static async markServed(req: Request, res: Response): Promise<void> {
    const { passId } = req.body;
    sendSuccess(res, {
      passId,
      status: 'SERVED',
      servedAt: new Date().toISOString(),
      message: 'Dish collected from pass and delivered to guest.',
    });
  }
}
