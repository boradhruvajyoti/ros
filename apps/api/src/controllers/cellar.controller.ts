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

const mockCellar: WineBottle[] = [
  {
    id: 'WINE-01',
    name: 'Château Margaux Premier Grand Cru',
    winery: 'Château Margaux',
    vintage: 2015,
    region: 'Bordeaux (Margaux)',
    country: 'France',
    varietal: 'Cabernet Sauvignon / Merlot Blend',
    rfidBinRack: 'Vault Rack A-04 (Climate Zone 1)',
    stockCount: 14,
    bottlePriceINR: 78000,
    sommelierPairings: ['Wagyu Ribeye', 'Slow Braised Lamb Shank', 'Aged Truffle Gouda'],
    tasteNotes: 'Vibrant blackcurrant, cedar wood, violet florals with velvety structured tannins.'
  },
  {
    id: 'WINE-02',
    name: 'Sula Rasa Cabernet Sauvignon',
    winery: 'Sula Vineyards Reserve',
    vintage: 2020,
    region: 'Nashik Valley',
    country: 'India',
    varietal: 'Cabernet Sauvignon',
    rfidBinRack: 'Rack B-12 (Climate Zone 2)',
    stockCount: 38,
    bottlePriceINR: 4200,
    sommelierPairings: ['Hyderabadi Dum Biryani', 'Mutton Galouti Kebab', 'Tandoori Raan'],
    tasteNotes: 'Rich notes of ripe blackberries, dark chocolate, tobacco, aged 14 months in French oak.'
  },
  {
    id: 'WINE-03',
    name: 'Cloudy Bay Sauvignon Blanc',
    winery: 'Cloudy Bay Vineyards',
    vintage: 2022,
    region: 'Marlborough',
    country: 'New Zealand',
    varietal: 'Sauvignon Blanc',
    rfidBinRack: 'Chilled Vault C-01 (10.5°C)',
    stockCount: 22,
    bottlePriceINR: 8500,
    sommelierPairings: ['Pan Seared Sea Bass', 'Burrata with Heirloom Tomatoes', 'Lemon Butter Prawns'],
    tasteNotes: 'Zesty lime, passionfruit, lemongrass, vibrant acidity with a crisp mineral finish.'
  },
  {
    id: 'WINE-04',
    name: 'Dom Pérignon Vintage Brut Champagne',
    winery: 'Moët & Chandon',
    vintage: 2013,
    region: 'Champagne',
    country: 'France',
    varietal: 'Chardonnay / Pinot Noir',
    rfidBinRack: 'Champagne Cellar D-02 (9.0°C)',
    stockCount: 9,
    bottlePriceINR: 34000,
    sommelierPairings: ['Lobster Thermidor', 'Caviar Blinis', 'Truffle French Fries'],
    tasteNotes: 'Aromas of toasted brioche, white peach, crushed stone minerals and microscopic effervescence.'
  }
];

export const getCellarInventory = async (req: Request, res: Response) => {
  const totalBottles = mockCellar.reduce((acc, w) => acc + w.stockCount, 0);
  const totalValuation = mockCellar.reduce((acc, w) => acc + (w.stockCount * w.bottlePriceINR), 0);

  return res.json({
    success: true,
    data: {
      cellarClimate: {
        ambientTempC: 13.2,
        humidityPercent: 68,
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
