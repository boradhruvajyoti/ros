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

const mockRules: DynamicSurgeRule[] = [
  {
    id: 'RULE-01',
    name: 'Weekend Prime Dinner Surge',
    triggerCondition: 'Fri-Sun 19:30 - 22:30 & Occupancy > 85%',
    multiplier: 1.10,
    isActive: true,
    affectedCategories: ['Starters', 'Chef Specials', 'Cocktails']
  },
  {
    id: 'RULE-02',
    name: 'Mon-Wed Afternoon Happy Hour Yield',
    triggerCondition: 'Mon-Wed 14:30 - 17:30 & Occupancy < 40%',
    multiplier: 0.85,
    isActive: true,
    affectedCategories: ['Appetizers', 'Beverages', 'Desserts']
  },
  {
    id: 'RULE-03',
    name: 'Rain / Monsoon Delivery Surge',
    triggerCondition: 'Weather = Heavy Rain & Delivery Volume > 30 orders/hr',
    multiplier: 1.12,
    isActive: false,
    affectedCategories: ['Soups', 'Biryanis', 'Hot Beverages']
  }
];

const mockBCGMatrix: BCGMenuItem[] = [
  {
    id: 'BCG-01',
    name: 'Hyderabadi Dum Biryani',
    category: 'Main Course',
    salesVolume: 840,
    grossMarginPercent: 68.5,
    quadrant: 'STAR',
    recommendation: 'High Popularity & High Margin. Maintain standard recipe & promote at top of menu.'
  },
  {
    id: 'BCG-02',
    name: 'Butter Chicken & Garlic Naan Combo',
    category: 'Combos',
    salesVolume: 920,
    grossMarginPercent: 44.2,
    quadrant: 'PLOWHORSE',
    recommendation: 'High Popularity & Low Margin. Modestly increase price by 5-8% or optimize chicken portion yield.'
  },
  {
    id: 'BCG-03',
    name: 'Truffle Galouti Kebab',
    category: 'Starters',
    salesVolume: 120,
    grossMarginPercent: 74.0,
    quadrant: 'PUZZLE',
    recommendation: 'Low Popularity & High Margin. Train staff to upsell and feature prominently on table tent cards.'
  },
  {
    id: 'BCG-04',
    name: 'Stuffed Mushroom Caps',
    category: 'Starters',
    salesVolume: 65,
    grossMarginPercent: 38.0,
    quadrant: 'DOG',
    recommendation: 'Low Popularity & Low Margin. Consider 86-ing from upcoming seasonal menu revision.'
  }
];

export const getDynamicPricingOverview = async (req: Request, res: Response) => {
  return res.json({
    success: true,
    data: {
      currentSurgeState: {
        activeMultiplier: 1.00,
        currentOccupancyPercent: 64,
        kitchenLoadMinutes: 14,
        weather: 'Clear (28°C)'
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
