import { Request, Response } from 'express';

interface BanquetEvent {
  id: string;
  beoNumber: string; // Banquet Event Order #
  eventName: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  eventType: 'WEDDING' | 'CORPORATE' | 'ANNIVERSARY' | 'COCKTAIL';
  eventDate: string;
  hallName: string;
  guestCount: number;
  totalBudget: number;
  depositReceived: number;
  status: 'INQUIRY' | 'TASTING_SCHEDULED' | 'BEO_CONFIRMED' | 'EXECUTED';
  menuCourses: Array<{ course: string; items: string[] }>;
  avSetup: string[];
}

const mockEvents: BanquetEvent[] = [];

export const getBanquetEvents = async (req: Request, res: Response) => {
  return res.json({
    success: true,
    data: {
      totalBookings: mockEvents.length,
      pipelineValue: mockEvents.reduce((acc, e) => acc + e.totalBudget, 0),
      depositsCollected: mockEvents.reduce((acc, e) => acc + e.depositReceived, 0),
      events: mockEvents
    }
  });
};

export const createBanquetEvent = async (req: Request, res: Response) => {
  const eventData = req.body;
  const newEvent: BanquetEvent = {
    id: `EVT-${Math.floor(500 + Math.random() * 500)}`,
    beoNumber: `BEO-2026-0${Math.floor(100 + Math.random() * 900)}`,
    eventName: eventData.eventName || 'Private Dining Banquet',
    clientName: eventData.clientName || 'Guest Organizer',
    clientPhone: eventData.clientPhone || '+91 90000 00000',
    clientEmail: eventData.clientEmail || 'client@event.com',
    eventType: eventData.eventType || 'CORPORATE',
    eventDate: eventData.eventDate || '2026-11-01',
    hallName: eventData.hallName || 'Grand Ballroom',
    guestCount: Number(eventData.guestCount) || 50,
    totalBudget: Number(eventData.totalBudget) || 120000,
    depositReceived: Number(eventData.depositReceived) || 50000,
    status: 'INQUIRY',
    menuCourses: eventData.menuCourses || [
      { course: 'Welcome Course', items: ['Signature Mocktails', 'Veg/Non-Veg Appetizers'] },
      { course: 'Main Course Buffet', items: ['Biryani', 'Curries', 'Breads & Rice'] },
      { course: 'Dessert', items: ['Assorted Indian Sweets'] }
    ],
    avSetup: eventData.avSetup || ['Podium Mic & Sound System']
  };

  mockEvents.unshift(newEvent);
  return res.status(201).json({ success: true, data: newEvent, message: 'Banquet event created and BEO generated' });
};
