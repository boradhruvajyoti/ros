import { Request, Response } from 'express';

interface CloudBrand {
  id: string;
  name: string;
  cuisine: string;
  activeOrders: number;
  rating: number;
  isOpen: boolean;
}

interface DispatchOrder {
  id: string;
  orderNumber: string;
  brand: string;
  aggregator: 'SWIGGY' | 'ZOMATO' | 'DIRECT_APP' | 'UBER_EATS';
  items: string[];
  pickupBay: string;
  riderName?: string;
  riderPhone?: string;
  status: 'PREPARING' | 'PACKAGED' | 'READY_FOR_PICKUP' | 'DISPATCHED';
  prepTimeRemainingMins: number;
}

const mockBrands: CloudBrand[] = [];
const mockDispatchOrders: DispatchOrder[] = [];

export const getDarkKitchenStatus = async (req: Request, res: Response) => {
  return res.json({
    success: true,
    data: {
      virtualBrands: mockBrands,
      activeOrders: mockDispatchOrders,
      metrics: {
        totalOrdersToday: mockDispatchOrders.length,
        avgDispatchTimeMins: 0,
        packagingAccuracyPercent: 100,
        activeRidersInBays: 0
      }
    }
  });
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { status } = req.body;

  const order = mockDispatchOrders.find(o => o.id === orderId);
  if (!order) {
    return res.status(404).json({ success: false, error: 'Dispatch order not found' });
  }

  order.status = status;
  return res.json({ success: true, data: order, message: `Order status updated to ${status}` });
};
