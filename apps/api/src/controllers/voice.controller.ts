import { Request, Response } from 'express';

interface VoiceCallSession {
  id: string;
  callerNumber: string;
  callerName?: string;
  status: 'RINGING' | 'IN_PROGRESS' | 'COMPLETED' | 'ORDER_PLACED';
  durationSeconds: number;
  transcript: Array<{ speaker: 'BOT' | 'CALLER'; text: string; timestamp: string }>;
  extractedOrder?: {
    type: 'TAKEAWAY' | 'DELIVERY' | 'TABLE_RESERVATION';
    items: Array<{ name: string; quantity: number; notes?: string; price: number }>;
    totalAmount: number;
    pickupTime?: string;
    deliveryAddress?: string;
  };
}

const mockSessions: VoiceCallSession[] = [
  {
    id: 'CALL-8801',
    callerNumber: '+91 98201 44521',
    callerName: 'Rohan Mehra',
    status: 'ORDER_PLACED',
    durationSeconds: 114,
    transcript: [
      { speaker: 'BOT', text: 'Namaste! Welcome to Spice Garden. Are you looking to order for pickup, delivery, or reserve a table?', timestamp: '00:02' },
      { speaker: 'CALLER', text: 'Hi, I would like to place a pickup order for 2 Hyderabadi Dum Biryanis and 1 Butter Naan.', timestamp: '00:15' },
      { speaker: 'BOT', text: 'Sure! 2 Hyderabadi Dum Biryanis and 1 Butter Naan. Any spice preferences or raita additions?', timestamp: '00:28' },
      { speaker: 'CALLER', text: 'Medium spice please, and add one Burani Raita.', timestamp: '00:40' },
      { speaker: 'BOT', text: 'Got it. Total is ₹1,120. It will be ready in 25 minutes. Shall I confirm this order for phone number ending in 4521?', timestamp: '00:55' },
      { speaker: 'CALLER', text: 'Yes, please confirm.', timestamp: '01:05' },
      { speaker: 'BOT', text: 'Your order #VOICE-902 is confirmed! We will send an SMS payment link shortly. Thank you!', timestamp: '01:14' }
    ],
    extractedOrder: {
      type: 'TAKEAWAY',
      items: [
        { name: 'Hyderabadi Dum Biryani', quantity: 2, notes: 'Medium spice', price: 900 },
        { name: 'Butter Naan', quantity: 1, price: 70 },
        { name: 'Burani Raita', quantity: 1, price: 150 }
      ],
      totalAmount: 1120,
      pickupTime: '25 mins'
    }
  }
];

export const getVoiceCalls = async (req: Request, res: Response) => {
  return res.json({
    success: true,
    data: {
      agentStatus: 'ONLINE',
      activeLines: 4,
      totalCallsToday: 42,
      aiResolutionRate: 92.8,
      avgCallDurationSeconds: 88,
      calls: mockSessions
    }
  });
};

export const simulateInboundCall = async (req: Request, res: Response) => {
  const { callerNumber, callerName, scenario } = req.body;

  const newCall: VoiceCallSession = {
    id: `CALL-${Math.floor(1000 + Math.random() * 9000)}`,
    callerNumber: callerNumber || '+91 99887 66554',
    callerName: callerName || 'Ananya Gupta',
    status: 'IN_PROGRESS',
    durationSeconds: 15,
    transcript: [
      { speaker: 'BOT', text: 'Namaste! Welcome to Spice Garden. How can I assist you today?', timestamp: '00:02' },
      { speaker: 'CALLER', text: scenario || 'I would like to book a table for 4 people tonight at 8 PM.', timestamp: '00:08' }
    ]
  };

  mockSessions.unshift(newCall);

  return res.json({
    success: true,
    data: newCall,
    message: 'Inbound call initiated with AI Voice Agent'
  });
};
