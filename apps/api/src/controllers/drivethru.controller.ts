// =============================================================================
// Drive-Thru, Curbside Pickup & Lane Optimization Controller
// =============================================================================

import { Request, Response } from 'express';
import { sendSuccess } from '../middlewares/error.middleware';

export class DriveThruController {
  static async getLaneStatus(req: Request, res: Response): Promise<void> {
    const queue = [
      {
        id: 'DT-101',
        orderNumber: 'DT-101',
        vehicleDesc: 'White Honda City (KA-05-MN-9921)',
        lane: 'Lane 1 (Express)',
        position: 'WINDOW_PAYMENT',
        total: 680,
        itemsCount: 3,
        durationSeconds: 58,
        targetSlaSeconds: 90,
        status: 'BAG_READY',
      },
      {
        id: 'DT-102',
        orderNumber: 'DT-102',
        vehicleDesc: 'Grey Hyundai Creta (KA-03-JJ-4412)',
        lane: 'Lane 1 (Express)',
        position: 'SPEAKER_ORDERING',
        total: 420,
        itemsCount: 2,
        durationSeconds: 24,
        targetSlaSeconds: 90,
        status: 'ORDER_IN_PROGRESS',
      },
      {
        id: 'CS-201',
        orderNumber: 'CS-201',
        vehicleDesc: 'Red Kia Seltos (Bay #3)',
        lane: 'Curbside Bay 3',
        position: 'CURBSIDE_BAY',
        total: 1250,
        itemsCount: 5,
        durationSeconds: 110,
        targetSlaSeconds: 180,
        status: 'RUNNER_DISPATCHED',
      },
    ];

    const stats = {
      avgSpeedOfServiceSeconds: 72,
      todayVehiclesServed: 184,
      targetSlaCompliance: '96.4%',
      activeDriveThruRevenue: 68400,
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
