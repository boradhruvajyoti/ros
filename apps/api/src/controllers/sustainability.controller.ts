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

const mockAppliances: ApplianceEnergyLog[] = [];
const mockWasteAudits: WasteAudit[] = [];

export const getSustainabilityMetrics = async (req: Request, res: Response) => {
  const totalKWh = mockAppliances.reduce((acc, a) => acc + a.powerKWhToday, 0);
  const totalGas = mockAppliances.reduce((acc, a) => acc + a.gasKgToday, 0);
  const totalEnergyCost = mockAppliances.reduce((acc, a) => acc + a.costEstimateINR, 0);

  return res.json({
    success: true,
    data: {
      esgRating: 'Active Monitoring',
      totalPowerKWhToday: totalKWh,
      totalGasKgToday: totalGas,
      totalEnergyCostTodayINR: totalEnergyCost,
      carbonFootprintKgCO2: (totalKWh * 0.82) + (totalGas * 3.0),
      wasteDivertedPercent: 0,
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
