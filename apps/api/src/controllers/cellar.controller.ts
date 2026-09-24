import { Request, Response } from 'express';

interface WineBottle {
  id: string;
  name: string;
  winery: string;
  vintage: number;
  region: string;
  country: string;
  varietal: string;
  rfidBinRack: string;
  stockCount: number;
  bottlePriceINR: number;
  sommelierPairings: string[];
  tasteNotes: string;
}

const mockCellar: WineBottle[] = [];

export const getCellarInventory = async (req: Request, res: Response) => {
  const totalBottles = mockCellar.reduce((acc, w) => acc + w.stockCount, 0);
  const totalValuation = mockCellar.reduce((acc, w) => acc + (w.stockCount * w.bottlePriceINR), 0);

  return res.json({
    success: true,
    data: {
      cellarClimate: {
        ambientTempC: 13.0,
        humidityPercent: 65,
        status: 'OPTIMAL_AGING'
      },
      metrics: {
        totalLabels: mockCellar.length,
        totalBottlesInVault: totalBottles,
        totalValuationINR: totalValuation
      },
      wines: mockCellar
    }
  });
};

export const getPairingRecommendations = async (req: Request, res: Response) => {
  const { dishName } = req.query;
  const filtered = mockCellar.filter(w => 
    w.sommelierPairings.some(p => p.toLowerCase().includes(String(dishName || '').toLowerCase()))
  );

  return res.json({
    success: true,
    data: filtered.length > 0 ? filtered : mockCellar.slice(0, 2),
    message: 'AI Sommelier pairings generated'
  });
};
