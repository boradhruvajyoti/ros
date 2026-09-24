import { Request, Response } from 'express';

interface ApplianceEnergyLog {
  id: string;
  appliance: string;
  category: 'COOKING' | 'REFRIGERATION' | 'HVAC' | 'LIGHTING';
  powerKWhToday: number;
  gasKgToday: number;
  costEstimateINR: number;
  status: 'OPTIMAL' | 'ELEVATED_CONSUMPTION' | 'OFF';
}

interface WasteAudit {
  date: string;
  foodWasteKg: number;
  compostConvertedKg: number;
  oilRecycledLiters: number;
  co2OffsetKg: number;
}

const mockAppliances: ApplianceEnergyLog[] = [
  { id: 'APP-01', appliance: 'Rational Combi Oven #1', category: 'COOKING', powerKWhToday: 18.4, gasKgToday: 0, costEstimateINR: 184, status: 'OPTIMAL' },
  { id: 'APP-02', appliance: 'Tandoor & Clay Oven Burner', category: 'COOKING', powerKWhToday: 0, gasKgToday: 6.2, costEstimateINR: 496, status: 'OPTIMAL' },
  { id: 'APP-03', appliance: 'Walk-in Freezer Compressor', category: 'REFRIGERATION', powerKWhToday: 32.1, gasKgToday: 0, costEstimateINR: 321, status: 'OPTIMAL' },
  { id: 'APP-04', appliance: 'Kitchen Hood Exhaust & Scrubber', category: 'HVAC', powerKWhToday: 24.5, gasKgToday: 0, costEstimateINR: 245, status: 'ELEVATED_CONSUMPTION' },
  { id: 'APP-05', appliance: 'Double Well Deep Fryer #1', category: 'COOKING', powerKWhToday: 14.8, gasKgToday: 0, costEstimateINR: 148, status: 'OPTIMAL' }
];

const mockWasteAudits: WasteAudit[] = [
  { date: '2026-09-22', foodWasteKg: 14.2, compostConvertedKg: 11.5, oilRecycledLiters: 18, co2OffsetKg: 38.6 },
  { date: '2026-09-21', foodWasteKg: 16.8, compostConvertedKg: 13.0, oilRecycledLiters: 20, co2OffsetKg: 42.1 },
  { date: '2026-09-20', foodWasteKg: 12.5, compostConvertedKg: 10.2, oilRecycledLiters: 15, co2OffsetKg: 31.4 }
];

export const getSustainabilityMetrics = async (req: Request, res: Response) => {
  const totalKWh = mockAppliances.reduce((acc, a) => acc + a.powerKWhToday, 0);
  const totalGas = mockAppliances.reduce((acc, a) => acc + a.gasKgToday, 0);
  const totalEnergyCost = mockAppliances.reduce((acc, a) => acc + a.costEstimateINR, 0);

  return res.json({
    success: true,
    data: {
      esgRating: 'A+ (Gold Green Certified)',
      totalPowerKWhToday: totalKWh,
      totalGasKgToday: totalGas,
      totalEnergyCostTodayINR: totalEnergyCost,
      carbonFootprintKgCO2: (totalKWh * 0.82) + (totalGas * 3.0),
      wasteDivertedPercent: 82.4,
      appliances: mockAppliances,
      recentAudits: mockWasteAudits
    }
  });
};

export const logWasteEntry = async (req: Request, res: Response) => {
  const { foodWasteKg, compostConvertedKg, oilRecycledLiters } = req.body;
  const newEntry: WasteAudit = {
    date: new Date().toISOString().split('T')[0],
    foodWasteKg: Number(foodWasteKg) || 10,
    compostConvertedKg: Number(compostConvertedKg) || 8,
    oilRecycledLiters: Number(oilRecycledLiters) || 12,
    co2OffsetKg: (Number(compostConvertedKg) || 8) * 2.5
  };

  mockWasteAudits.unshift(newEntry);
  return res.status(201).json({ success: true, data: newEntry, message: 'Waste and sustainability audit recorded' });
};
