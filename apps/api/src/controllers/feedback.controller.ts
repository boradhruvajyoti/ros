import { Request, Response } from 'express';
import { sendSuccess } from '../middlewares/error.middleware';

export class FeedbackController {
  static async listReviews(req: Request, res: Response): Promise<void> {
    const feedback = {
      overallRating: 5.0,
      npsScore: 100,
      totalReviews: 0,
      sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
      recentReviews: [],
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
