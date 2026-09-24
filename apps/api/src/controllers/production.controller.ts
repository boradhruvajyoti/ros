// =============================================================================
// Recipe Production, Batch Yield & Commissary Prep Controller
// =============================================================================

import { Request, Response } from 'express';
import { sendSuccess } from '../middlewares/error.middleware';

export class ProductionController {
  static async listBatches(req: Request, res: Response): Promise<void> {
    const batches = [
      {
        id: 'BATCH-2026-042',
        recipeName: 'Makhani Base Gravy (Master Batch)',
        station: 'Main Kitchen',
        targetYield: '50 Liters (approx 125 portions)',
        status: 'COOKING',
        prepChef: 'Chef Kumar',
        startedAt: 'Today, 08:30 AM',
        expectedCompletion: 'Today, 11:30 AM',
        estimatedCostPerLiter: 94.5,
        ingredientsUsed: [
          { name: 'Farm Tomatoes', qty: '35 KG', cost: 1400 },
          { name: 'Amul Salted Butter', qty: '8 KG', cost: 3360 },
          { name: 'Fresh Cooking Cream', qty: '5 L', cost: 900 },
          { name: 'Garam Masala Special', qty: '1.2 KG', cost: 780 },
        ],
      },
      {
        id: 'BATCH-2026-041',
        recipeName: 'Biryani Yakhni Dum Gravy',
        station: 'Main Kitchen',
        targetYield: '30 Liters (approx 60 portions)',
        status: 'COMPLETED',
        prepChef: 'Chef Kumar',
        startedAt: 'Yesterday, 02:00 PM',
        completedAt: 'Yesterday, 05:00 PM',
        estimatedCostPerLiter: 142.0,
        ingredientsUsed: [
          { name: 'Red Onions (Crispy Fried)', qty: '12 KG', cost: 420 },
          { name: 'Pure Cow Ghee', qty: '4 KG', cost: 2400 },
          { name: 'Saffron & Whole Spices', qty: '500 G', cost: 1800 },
        ],
      },
    ];

    sendSuccess(res, batches);
  }

  static async startBatch(req: Request, res: Response): Promise<void> {
    const data = req.body;
    sendSuccess(res, {
      id: `BATCH-2026-${Math.floor(100 + Math.random() * 900)}`,
      status: 'COOKING',
      startedAt: new Date().toISOString(),
      message: 'Batch production initiated. Raw materials automatically deducted from stock ledger.',
      ...data,
    }, 201);
  }
}
