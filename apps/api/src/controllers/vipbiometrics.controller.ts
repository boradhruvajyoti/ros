import { Request, Response } from 'express';

interface VIPGuestProfile {
  id: string;
  name: string;
  photoUrl?: string;
  vipTier: 'DIAMOND_ELITE' | 'PLATINUM' | 'GOLD_CONNOISSEUR';
  lifetimeSpendINR: number;
  totalVisits: number;
  lastVisit: string;
  preferredTable: string;
  preferredServer: string;
  favoriteDish: string;
  favoriteDrink: string;
  allergies: string[];
  specialNotes: string;
  checkInTime?: string;
}

const mockVIPs: VIPGuestProfile[] = [];

export const getVIPCheckIns = async (req: Request, res: Response) => {
  return res.json({
    success: true,
    data: {
      podiumScannerStatus: 'ONLINE_ACTIVE',
      recognitionAccuracyPercent: 100,
      checkedInVIPsCount: mockVIPs.filter(v => !!v.checkInTime).length,
      vips: mockVIPs
    }
  });
};

export const simulateVIPCheckIn = async (req: Request, res: Response) => {
  const { guestId } = req.body;
  const guest = mockVIPs.find(v => v.id === guestId);
  if (!guest) {
    return res.status(404).json({ success: false, error: 'VIP guest not found' });
  }

  guest.checkInTime = 'Just now (Podium Camera #1)';

  return res.json({
    success: true,
    data: guest,
    message: `VIP Guest ${guest.name} recognized! Host alert sent to Maitre D' tablet.`
  });
};
