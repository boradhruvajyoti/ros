// =============================================================================
// Kiosk Self-Service Controller
// =============================================================================

import { Request, Response } from 'express';
import { sendSuccess } from '../middlewares/error.middleware';
import { getIO } from '../socket';

export class KioskController {
  static async getKioskMenu(req: Request, res: Response): Promise<void> {
    const categories = [
      { id: 'cat-combos', name: 'Meal Combos & Value Boxes', icon: 'Sparkles' },
      { id: 'cat-burgers', name: 'Biryani & Bowls', icon: 'Utensils' },
      { id: 'cat-starters', name: 'Hot Starters & Wings', icon: 'Flame' },
      { id: 'cat-drinks', name: 'Beverages & Shakes', icon: 'Coffee' },
      { id: 'cat-desserts', name: 'Desserts & Ice Cream', icon: 'Heart' },
    ];

    const popularCombos = [
      {
        id: 'combo-01',
        name: 'Royal Biryani Meal for 1',
        description: 'Chicken Dum Biryani + Fresh Lime Soda + 1 Gulab Jamun',
        price: 399,
        originalPrice: 480,
        imageUrl: '/images/combo1.jpg',
        calories: '650 kcal',
        foodType: 'NON_VEG',
      },
      {
        id: 'combo-02',
        name: 'Makhani Feast Combo',
        description: 'Paneer Tikka Makhani + 2 Butter Naan + Mango Lassi',
        price: 349,
        originalPrice: 420,
        imageUrl: '/images/combo2.jpg',
        calories: '580 kcal',
        foodType: 'VEG',
      },
      {
        id: 'combo-03',
        name: 'Family Tandoor Platter',
        description: 'Paneer Tikka (Full) + Chicken 65 (Full) + 4 Naans + 2 Lassi',
        price: 999,
        originalPrice: 1250,
        imageUrl: '/images/combo3.jpg',
        calories: '1450 kcal',
        foodType: 'NON_VEG',
      },
    ];

    sendSuccess(res, { categories, popularCombos });
  }

  static async submitKioskOrder(req: Request, res: Response): Promise<void> {
    const { items, paymentMethod, diningOption } = req.body;
    const tokenNumber = `K-${Math.floor(100 + Math.random() * 900)}`;

    try {
      const io = getIO();
      io.emit('kiosk:order', {
        tokenNumber,
        items,
        diningOption: diningOption || 'DINE_IN',
        paymentMethod: paymentMethod || 'UPI_QR',
        createdAt: new Date(),
      });
    } catch (e) {}

    sendSuccess(res, {
      tokenNumber,
      status: 'CONFIRMED',
      estimatedWaitTimeMins: 8,
      message: 'Order paid & queued for kitchen dispatch.',
    }, 201);
  }
}
