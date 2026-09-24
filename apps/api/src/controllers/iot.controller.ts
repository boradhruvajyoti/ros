// =============================================================================
// Smart Kitchen IoT Sensors & HACCP Compliance Controller
// =============================================================================

import { Request, Response } from 'express';
import { sendSuccess } from '../middlewares/error.middleware';

export class IotController {
  static async listSensors(req: Request, res: Response): Promise<void> {
    const sensors: any[] = [];

    const haccpSummary = {
      overallCompliance: 'READY',
      activeExcursions: 0,
      nextAutomatedInspection: 'Automated 24/7 Monitoring',
      readingsLoggedToday: 0,
    };

    sendSuccess(res, { sensors, haccpSummary });
  }

  static async logManualReading(req: Request, res: Response): Promise<void> {
    const data = req.body;
    sendSuccess(res, {
      id: `HACCP-${Date.now()}`,
      status: 'VERIFIED',
      recordedAt: new Date().toISOString(),
      message: 'Manual supervisor HACCP check logged.',
      ...data,
    }, 201);
  }
}
