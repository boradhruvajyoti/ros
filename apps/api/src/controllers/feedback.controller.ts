import { Request, Response } from 'express';
import { sendSuccess } from '../middlewares/error.middleware';

export class FeedbackController {
  static async listReviews(req: Request, res: Response): Promise<void> {
    const feedback = {
      overallRating: 4.8,
      npsScore: 78,
      totalReviews: 328,
      sentimentBreakdown: { positive: 88, neutral: 9, negative: 3 },
      recentReviews: [
        {
          id: 'fb-001',
          customerName: 'Ananya Sharma',
          table: 'T5',
          rating: 5,
          foodRating: 5,
          serviceRating: 5,
          ambienceRating: 4,
          comment: 'Outstanding Butter Chicken and Dal Makhani! Service was prompt and courteous.',
          createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
          status: 'RESOLVED',
          dishRatings: [
            { dish: 'Butter Chicken', stars: 5 },
            { dish: 'Butter Naan', stars: 5 },
          ],
        },
        {
          id: 'fb-002',
          customerName: 'Rohan Mehra',
          table: 'T2',
          rating: 4,
          foodRating: 5,
          serviceRating: 4,
          ambienceRating: 4,
          comment: 'Great flavors and presentation. Slight delay in beverage refill during peak hour.',
          createdAt: new Date(Date.now() - 3600000 * 7).toISOString(),
          status: 'ACKNOWLEDGED',
          dishRatings: [
            { dish: 'Chicken Biryani', stars: 5 },
            { dish: 'Mango Lassi', stars: 4 },
          ],
        },
        {
          id: 'fb-003',
          customerName: 'Vikram Kapoor',
          table: 'T7',
          rating: 5,
          foodRating: 5,
          serviceRating: 5,
          ambienceRating: 5,
          comment: 'Perfect venue for family dinner. The Paneer Tikka was melt in the mouth!',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          status: 'RESOLVED',
          dishRatings: [
            { dish: 'Paneer Tikka', stars: 5 },
            { dish: 'Garlic Naan', stars: 5 },
          ],
        },
      ],
    };

    sendSuccess(res, feedback);
  }

  static async getStats(req: Request, res: Response): Promise<void> {
    const stats = {
      overallRating: 4.8,
      npsScore: 78,
      totalReviews: 328,
      sentimentBreakdown: { positive: 88, neutral: 9, negative: 3 },
      categories: {
        food: 4.9,
        service: 4.7,
        ambience: 4.6,
        cleanliness: 4.9,
        value: 4.5,
      },
    };
    sendSuccess(res, stats);
  }

  static async submitReview(req: Request, res: Response): Promise<void> {
    const data = req.body;
    sendSuccess(res, {
      id: `fb-${Date.now()}`,
      status: 'RECEIVED',
      message: 'Thank you for your valuable feedback!',
      ...data,
    }, 201);
  }
}
