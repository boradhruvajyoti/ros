import { Request, Response } from 'express';

interface RobotUnit {
  id: string;
  name: string;
  model: 'BellaBot Pro' | 'PuduBot 2' | 'Keenon DinerBot';
  batteryPercent: number;
  status: 'IDLE_DOCK' | 'DELIVERING_TO_TABLE' | 'RETURNING_TO_KITCHEN' | 'OBSTACLE_PAUSED';
  currentLocation: string;
  targetDestination?: string;
  assignedOrder?: string;
  deliveredTripsToday: number;
  uptimeHours: number;
}

const mockRobots: RobotUnit[] = [];

export const getRoboticsFleet = async (req: Request, res: Response) => {
  return res.json({
    success: true,
    data: {
      activeFleetCount: mockRobots.length,
      totalDeliveriesToday: mockRobots.reduce((acc, r) => acc + r.deliveredTripsToday, 0),
      fleetBatteryAvg: mockRobots.length > 0 ? Math.round(mockRobots.reduce((acc, r) => acc + r.batteryPercent, 0) / mockRobots.length) : 0,
      fleet: mockRobots
    }
  });
};

export const dispatchRobot = async (req: Request, res: Response) => {
  const { robotId } = req.params;
  const { tableDestination, orderNumber } = req.body;

  const robot = mockRobots.find(r => r.id === robotId);
  if (!robot) {
    return res.status(404).json({ success: false, error: 'Robot unit not found' });
  }

  robot.status = 'DELIVERING_TO_TABLE';
  robot.targetDestination = tableDestination || 'Table 1';
  robot.assignedOrder = orderNumber || 'KOT-Express';
  robot.deliveredTripsToday += 1;

  return res.json({ success: true, data: robot, message: `Dispatched ${robot.name} to ${robot.targetDestination}` });
};

export const recallRobotToDock = async (req: Request, res: Response) => {
  const { robotId } = req.params;
  const robot = mockRobots.find(r => r.id === robotId);
  if (!robot) {
    return res.status(404).json({ success: false, error: 'Robot unit not found' });
  }

  robot.status = 'RETURNING_TO_KITCHEN';
  robot.targetDestination = 'Kitchen Charging Bay';
  robot.assignedOrder = undefined;

  return res.json({ success: true, data: robot, message: `${robot.name} recalled to charging dock` });
};
