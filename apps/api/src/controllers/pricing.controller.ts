import { Request, Response } from 'express';

interface DynamicSurgeRule {
  id: string;
  name: string;
  triggerCondition: string;
  multiplier: number; // e.g. 1.15 (+15%) or 0.85 (-15%)
  isActive: boolean;
  affectedCategories: string[];
}

interface BCGMenuItem {
  id: string;
  name: string;
  category: string;
  salesVolume: number;
  grossMarginPercent: number;
  quadrant: 'STAR' | 'PLOWHORSE' | 'PUZZLE' | 'DOG';
  recommendation: string;
}

const mockRules: DynamicSurgeRule[] = [];
const mockBCGMatrix: BCGMenuItem[] = [];

export const getDynamicPricingOverview = async (req: Request, res: Response) => {
  return res.json({
    success: true,
    data: {
      currentSurgeState: {
        activeMultiplier: 1.00,
        currentOccupancyPercent: 0,
        kitchenLoadMinutes: 0,
        weather: 'Clear'
      },
      rules: mockRules,
      bcgMatrix: mockBCGMatrix
    }
  });
};

export const toggleRule = async (req: Request, res: Response) => {
  const { ruleId } = req.params;
  const rule = mockRules.find(r => r.id === ruleId);
  if (!rule) {
    return res.status(404).json({ success: false, error: 'Rule not found' });
  }

  rule.isActive = !rule.isActive;
  return res.json({ success: true, data: rule, message: `Surge rule ${rule.isActive ? 'activated' : 'paused'}` });
};
