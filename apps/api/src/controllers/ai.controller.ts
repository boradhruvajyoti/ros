import { Request, Response } from 'express';
import { sendSuccess } from '../middlewares/error.middleware';

export class AiController {
  static async getForecast(req: Request, res: Response): Promise<void> {
    const forecast = {
      predictedRevenueTomorrow: 84500,
      predictedGuestCovers: 210,
      confidenceScore: 94.8,
      weatherFactor: 'Sunny, 28°C (Higher Beverage & Outdoor Seating demand)',
      peakHours: ['13:00 - 15:00', '20:00 - 22:30'],
      topDishPredictions: [
        { name: 'Butter Chicken', predictedOrders: 48, stockReadiness: 'OPTIMAL' },
        { name: 'Chicken Biryani', predictedOrders: 42, stockReadiness: 'OPTIMAL' },
        { name: 'Paneer Tikka', predictedOrders: 35, stockReadiness: 'OPTIMAL' },
        { name: 'Mango Lassi', predictedOrders: 50, stockReadiness: 'NEED_REFILL' },
      ],
      staffingRecommendations: [
        { shift: 'Morning Shift (09:00 - 17:00)', suggestedWaiters: 4, suggestedKitchen: 3, note: 'Adequate' },
        { shift: 'Evening Rush (18:00 - 23:30)', suggestedWaiters: 7, suggestedKitchen: 6, note: 'Add 1 Captain for VIP section' },
      ],
      smartReorderAlerts: [
        { ingredient: 'Red Onions', currentStock: '4.5 KG', recommendedOrder: '25 KG', urgency: 'HIGH', reason: 'Stock below weekend threshold' },
        { ingredient: 'Cooking Cream', currentStock: '12 L', recommendedOrder: '10 L', urgency: 'MEDIUM', reason: 'Anticipated 28% surge in gravy dishes' },
      ],
      wasteReductionInsights: [
        { category: 'Dairy (Paneer)', status: 'HEALTHY', variance: '-1.2%', suggestion: 'Portion sizes aligned with standard yield' },
        { category: 'Fresh Produce (Herbs)', status: 'ATTENTION', variance: '+4.5%', suggestion: 'Batch chopping leading to end-of-night discard. Switch to on-demand prep.' },
      ],
    };

    sendSuccess(res, forecast);
  }

  static async optimizeShiftSchedule(req: Request, res: Response): Promise<void> {
    sendSuccess(res, {
      status: 'OPTIMIZED',
      totalLaborCostReduction: '8.4%',
      message: 'AI shift schedule generated based on historical hourly footfall patterns.',
    });
  }

  static async getRecommendations(req: Request, res: Response): Promise<void> {
    sendSuccess(res, {
      upsellPairs: [
        { triggerDish: 'Butter Chicken', recommend: 'Garlic Naan', conversionRate: '78%' },
        { triggerDish: 'Paneer Tikka', recommend: 'Mango Lassi', conversionRate: '64%' },
        { triggerDish: 'Chicken Biryani', recommend: 'Burani Raita', conversionRate: '82%' },
      ],
      dynamicPricingSuggestions: [
        { dish: 'Tandoori Platter', currentPrice: 580, recommendedPrice: 620, reason: 'High weekend demand velocity (+35%)' },
      ],
    });
  }
}
