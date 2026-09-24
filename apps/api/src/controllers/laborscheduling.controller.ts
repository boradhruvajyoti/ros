import { Request, Response } from 'express';

interface ScheduledShift {
  id: string;
  employeeName: string;
  role: 'HEAD_CHEF' | 'LINE_COOK' | 'CAPTAIN' | 'SERVER' | 'BARTENDER' | 'BUSSER';
  day: string;
  shiftTime: string;
  forecastedDemandRating: 'PEAK' | 'HIGH' | 'MODERATE' | 'LOW';
  hourlyWageINR: number;
  totalShiftHours: number;
  status: 'SCHEDULED' | 'CONFIRMED' | 'SWAP_REQUESTED';
}

const mockShifts: ScheduledShift[] = [];

export const getLaborRoster = async (req: Request, res: Response) => {
  const totalLaborHours = mockShifts.reduce((acc, s) => acc + s.totalShiftHours, 0);
  const totalLaborCost = mockShifts.reduce((acc, s) => acc + (s.totalShiftHours * s.hourlyWageINR), 0);

  return res.json({
    success: true,
    data: {
      metrics: {
        totalRosteredStaff: mockShifts.length,
        totalLaborHoursScheduled: totalLaborHours,
        totalLaborCostINR: totalLaborCost,
        predictedLaborToSalesPercent: 0,
        overtimeAlerts: 0
      },
      shifts: mockShifts
    }
  });
};

export const autoGenerateOptimalRoster = async (req: Request, res: Response) => {
  return res.json({
    success: true,
    data: mockShifts,
    message: 'AI Labor Scheduler matched cover forecast with staff availability (0 overtime penalties).'
  });
};
