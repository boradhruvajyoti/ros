// =============================================================================
// Drive-Thru, Curbside Pickup & Lane Optimization Controller
// =============================================================================

import { Request, Response } from 'express';
import { sendSuccess } from '../middlewares/error.middleware';

export class DriveThruController {
  static async getLaneStatus(req: Request, res: Response): Promise<void> {
    const queue: any[] = [];

    const stats = {
      avgSpeedOfServiceSeconds: 0,
      todayVehiclesServed: 0,
      targetSlaCompliance: '100%',
      activeDriveThruRevenue: 0,
    };

    sendSuccess(res, { queue, stats });
  }

  static async completeHandoff(req: Request, res: Response): Promise<void> {
    const { orderId } = req.body;
    sendSuccess(res, {
      orderId,
      status: 'HANDED_OFF',
      completedAt: new Date().toISOString(),
      message: 'Vehicle handoff completed. Lane sensor cleared.',
    });
  }
}
