// =============================================================================
// AI Kitchen Expediter, Plating QA & Pass Management Controller
// =============================================================================

import { Request, Response } from 'express';
import { sendSuccess } from '../middlewares/error.middleware';

export class ExpediterController {
  static async getPassQueue(req: Request, res: Response): Promise<void> {
    const passItems = [
      {
        id: 'PASS-1001',
        orderNumber: 'ORD-1001',
        table: 'T2',
        dishName: 'Butter Chicken (Half) + 2 Butter Naan',
        station: 'Main Kitchen',
        heatLampTimerSeconds: 42,
        maxHoldSeconds: 180,
        assignedWaiter: 'Priya Waiter',
        aiInspectionStatus: 'PASSED',
        aiQualityConfidence: 98.4,
        temperatureEstimate: '74°C (Hot)',
        garnishVerified: true,
        portionMatch: '100% standard',
      },
      {
        id: 'PASS-1002',
        orderNumber: 'ORD-1004',
        table: 'T5',
        dishName: 'Paneer Tikka (Tandoori Platter)',
        station: 'Tandoor & Starters',
        heatLampTimerSeconds: 18,
        maxHoldSeconds: 180,
        assignedWaiter: 'Priya Waiter',
        aiInspectionStatus: 'PASSED',
        aiQualityConfidence: 96.2,
        temperatureEstimate: '82°C (Fresh off skewer)',
        garnishVerified: true,
        portionMatch: '8/8 pieces verified',
      },
      {
        id: 'PASS-1003',
        orderNumber: 'ORD-1006',
        table: 'T3',
        dishName: 'Special Chicken Dum Biryani (Double)',
        station: 'Main Kitchen',
        heatLampTimerSeconds: 110,
        maxHoldSeconds: 180,
        assignedWaiter: 'Raj Cashier (Expediter)',
        aiInspectionStatus: 'PASSED',
        aiQualityConfidence: 99.1,
        temperatureEstimate: '71°C',
        garnishVerified: true,
        portionMatch: 'Boiled egg & mirchi ka salan present',
      },
    ];

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
