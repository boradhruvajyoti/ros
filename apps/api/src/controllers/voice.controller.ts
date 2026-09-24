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

const mockSessions: VoiceCallSession[] = [];

export const getVoiceCalls = async (req: Request, res: Response) => {
  return res.json({
    success: true,
    data: {
      agentStatus: 'ONLINE',
      activeLines: 1,
      totalCallsToday: mockSessions.length,
      aiResolutionRate: 100,
      avgCallDurationSeconds: 0,
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
