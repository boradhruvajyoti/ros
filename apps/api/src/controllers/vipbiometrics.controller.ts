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

const mockVIPs: VIPGuestProfile[] = [
  {
    id: 'VIP-001',
    name: 'Rajesh Singhania',
    vipTier: 'DIAMOND_ELITE',
    lifetimeSpendINR: 840000,
    totalVisits: 62,
    lastVisit: '3 days ago',
    preferredTable: 'Table 4 (Quiet Corner Booth)',
    preferredServer: 'Aarav Sharma (Captain)',
    favoriteDish: 'Truffle Galouti Kebab + Dal Makhani',
    favoriteDrink: 'Château Margaux 2015 (Decanted 30m)',
    allergies: ['No Peanuts', 'Mild Spice Only'],
    specialNotes: 'Prefers warm sparkling water with 1 lemon slice upon seating. Celebrating 25th anniversary next month.',
    checkInTime: 'Just now (Podium Camera #1)'
  },
  {
    id: 'VIP-002',
    name: 'Tara Sethi',
    vipTier: 'PLATINUM',
    lifetimeSpendINR: 420000,
    totalVisits: 38,
    lastVisit: '1 week ago',
    preferredTable: 'Table 12 (Outdoor Courtyard)',
    preferredServer: 'Priya Patel',
    favoriteDish: 'Pan Seared Sea Bass + Burrata Salad',
    favoriteDrink: 'Cloudy Bay Sauvignon Blanc',
    allergies: ['Gluten Sensitive'],
    specialNotes: 'Loves fresh coriander garnish. Always requests candle on table.',
    checkInTime: '12 mins ago'
  },
  {
    id: 'VIP-003',
    name: 'Dr. Sameer Godbole',
    vipTier: 'GOLD_CONNOISSEUR',
    lifetimeSpendINR: 285000,
    totalVisits: 29,
    lastVisit: '2 weeks ago',
    preferredTable: 'Table 8 (Center Dining)',
    preferredServer: 'Kabir Verma',
    favoriteDish: 'Awadhi Mutton Biryani',
    favoriteDrink: 'Single Malt (Glenfiddich 18 on large rock)',
    allergies: ['None'],
    specialNotes: 'Entertains corporate medical executives. Ensure expedited appetizer pass.'
  }
];

export const getVIPCheckIns = async (req: Request, res: Response) => {
  return res.json({
    success: true,
    data: {
      podiumScannerStatus: 'ONLINE_ACTIVE',
      recognitionAccuracyPercent: 99.1,
      checkedInVIPsCount: mockVIPs.filter(v => !!v.checkInTime).length,
      vips: mockVIPs
    }
  });
};

export const simulateVIPCheckIn = async (req: Request, res: Response) => {
  const { guestId } = req.body;
  const guest = mockVIPs.find(v => v.id === guestId) || mockVIPs[0];

  guest.checkInTime = 'Just now (Podium Camera #1)';

  return res.json({
    success: true,
    data: guest,
    message: `VIP Guest ${guest.name} recognized! Host alert sent to Maitre D' tablet.`
  });
};
