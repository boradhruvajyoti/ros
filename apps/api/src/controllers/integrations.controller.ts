import { Request, Response } from 'express';
import { sendSuccess } from '../middlewares/error.middleware';
import { getIO } from '../socket';

export class IntegrationsController {
  static async getChannels(req: Request, res: Response): Promise<void> {
    const channels = [
      {
        id: 'chan-zomato',
        name: 'Zomato Delivery',
        type: 'AGGREGATOR',
        icon: 'zomato',
        status: 'CONNECTED',
        autoAccept: true,
        activeOrders: 4,
        todayRevenue: 14280,
        syncStatus: 'SYNCED',
        lastSync: new Date().toISOString(),
        storeStatus: 'ONLINE',
      },
      {
        id: 'chan-swiggy',
        name: 'Swiggy Express',
        type: 'AGGREGATOR',
        icon: 'swiggy',
        status: 'CONNECTED',
        autoAccept: true,
        activeOrders: 7,
        todayRevenue: 22450,
        syncStatus: 'SYNCED',
        lastSync: new Date().toISOString(),
        storeStatus: 'ONLINE',
      },
      {
        id: 'chan-ubereats',
        name: 'Uber Eats',
        type: 'AGGREGATOR',
        icon: 'ubereats',
        status: 'CONNECTED',
        autoAccept: false,
        activeOrders: 1,
        todayRevenue: 3890,
        syncStatus: 'SYNCED',
        lastSync: new Date().toISOString(),
        storeStatus: 'ONLINE',
      },
      {
        id: 'chan-whatsapp',
        name: 'WhatsApp Direct Ordering Bot',
        type: 'MESSAGING',
        icon: 'whatsapp',
        status: 'CONNECTED',
        autoAccept: true,
        activeOrders: 2,
        todayRevenue: 6120,
        syncStatus: 'SYNCED',
        lastSync: new Date().toISOString(),
        storeStatus: 'ONLINE',
      },
    ];

    sendSuccess(res, channels);
  }

  static async toggleAutoAccept(req: Request, res: Response): Promise<void> {
    const { channelId, enabled } = req.body;
    sendSuccess(res, { channelId, autoAccept: enabled, updated: true });
  }

  static async syncMenu(req: Request, res: Response): Promise<void> {
    const { channelId } = req.body;
    sendSuccess(res, { channelId, syncedItems: 15, timestamp: new Date().toISOString() });
  }

  static async simulateIncomingOrder(req: Request, res: Response): Promise<void> {
    const { channel, customerName, total } = req.body;
    const orderNumber = `${(channel || 'AGG').toUpperCase().slice(0, 3)}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    try {
      const io = getIO();
      io.emit('order:created', {
        orderNumber,
        channel: channel || 'Zomato',
        customerName: customerName || 'Online Guest',
        total: total || 850,
        status: 'ACCEPTED',
        createdAt: new Date(),
      });
    } catch (e) {}

    sendSuccess(res, { orderNumber, channel, message: 'Simulated aggregator order dispatched to KDS!' });
  }
}
