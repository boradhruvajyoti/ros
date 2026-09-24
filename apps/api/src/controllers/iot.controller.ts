// =============================================================================
// Smart Kitchen IoT Sensors & HACCP Compliance Controller
// =============================================================================

import { Request, Response } from 'express';
import { sendSuccess } from '../middlewares/error.middleware';

export class IotController {
  static async listSensors(req: Request, res: Response): Promise<void> {
    const sensors = [
      {
        id: 'IOT-FREEZER-01',
        name: 'Walk-In Deep Meat Freezer',
        type: 'TEMPERATURE_PROBE',
        location: 'Cold Storage Room 1',
        currentTemp: -18.4,
        targetMin: -22.0,
        targetMax: -15.0,
        unit: '°C',
        status: 'NORMAL',
        batteryLevel: '94%',
        lastReading: '10s ago',
        haccpCompliant: true,
      },
      {
        id: 'IOT-CHILLER-02',
        name: 'Dairy & Vegetable Chiller',
        type: 'TEMPERATURE_PROBE',
        location: 'Prep Kitchen Island',
        currentTemp: 3.2,
        targetMin: 1.0,
        targetMax: 4.5,
        unit: '°C',
        status: 'NORMAL',
        batteryLevel: '88%',
        lastReading: '8s ago',
        haccpCompliant: true,
      },
      {
        id: 'IOT-WARMER-03',
        name: 'Pass Heat-Lamp Hot Holding Warmer',
        type: 'TEMPERATURE_PROBE',
        location: 'Kitchen Pass Window',
        currentTemp: 68.5,
        targetMin: 65.0,
        targetMax: 85.0,
        unit: '°C',
        status: 'NORMAL',
        batteryLevel: 'AC_POWER',
        lastReading: '5s ago',
        haccpCompliant: true,
      },
      {
        id: 'IOT-FRYER-04',
        name: 'Commercial Deep Fryer #1 (Oil Quality TPM)',
        type: 'TPM_OIL_QUALITY',
        location: 'Fry Station',
        currentTpm: 16.5,
        maxTpmThreshold: 24.0,
        unit: '% TPM',
        status: 'GOOD',
        oilDaysUsed: 2,
        lastReading: '1 min ago',
        haccpCompliant: true,
      },
    ];

    const haccpSummary = {
      overallCompliance: '100% PASS',
      activeExcursions: 0,
      nextAutomatedInspection: 'Tomorrow 06:00 AM',
      readingsLoggedToday: 2880,
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
