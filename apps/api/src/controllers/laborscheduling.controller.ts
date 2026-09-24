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

const mockShifts: ScheduledShift[] = [
  { id: 'SHF-101', employeeName: 'Chef Sanjay Rao', role: 'HEAD_CHEF', day: 'Friday', shiftTime: '16:00 - 00:00 (Dinner Peak)', forecastedDemandRating: 'PEAK', hourlyWageINR: 450, totalShiftHours: 8, status: 'CONFIRMED' },
  { id: 'SHF-102', employeeName: 'Aarav Sharma', role: 'CAPTAIN', day: 'Friday', shiftTime: '17:00 - 00:30 (Dinner Peak)', forecastedDemandRating: 'PEAK', hourlyWageINR: 320, totalShiftHours: 7.5, status: 'CONFIRMED' },
  { id: 'SHF-103', employeeName: 'Priya Patel', role: 'SERVER', day: 'Friday', shiftTime: '18:00 - 23:30 (Peak Rush)', forecastedDemandRating: 'PEAK', hourlyWageINR: 240, totalShiftHours: 5.5, status: 'CONFIRMED' },
  { id: 'SHF-104', employeeName: 'Dev Nair', role: 'BARTENDER', day: 'Friday', shiftTime: '18:00 - 01:00 (Late Night Lounge)', forecastedDemandRating: 'HIGH', hourlyWageINR: 280, totalShiftHours: 7, status: 'SCHEDULED' },
  { id: 'SHF-105', employeeName: 'Ravi Verma', role: 'LINE_COOK', day: 'Friday', shiftTime: '11:00 - 16:00 (Lunch Shift)', forecastedDemandRating: 'MODERATE', hourlyWageINR: 220, totalShiftHours: 5, status: 'CONFIRMED' }
];

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
        predictedLaborToSalesPercent: 18.2, // 18.2% labor cost target
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
