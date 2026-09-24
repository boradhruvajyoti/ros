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

const mockBrands: CloudBrand[] = [
  { id: 'BRD-01', name: 'Dum Darbar Biryani Co.', cuisine: 'Hyderabadi & Mughlai', activeOrders: 8, rating: 4.6, isOpen: true },
  { id: 'BRD-02', name: 'Crust Craft Neapolitan Pizza', cuisine: 'Woodfired Pizza & Calzones', activeOrders: 5, rating: 4.7, isOpen: true },
  { id: 'BRD-03', name: 'Wok & Roll Street Asian', cuisine: 'Pan-Asian & Dim Sums', activeOrders: 6, rating: 4.5, isOpen: true },
  { id: 'BRD-04', name: 'Sweet Alchemy Gourmet Desserts', cuisine: 'Pastries & Cheesecakes', activeOrders: 2, rating: 4.8, isOpen: true }
];

const mockDispatchOrders: DispatchOrder[] = [
  {
    id: 'DSP-101',
    orderNumber: '#SW-8891',
    brand: 'Dum Darbar Biryani Co.',
    aggregator: 'SWIGGY',
    items: ['2x Mutton Dum Biryani', '1x Mirchi Ka Salan', '2x Thums Up'],
    pickupBay: 'Bay #3 (South Shelf)',
    riderName: 'Mahesh Kumar',
    riderPhone: '+91 98765 11223',
    status: 'READY_FOR_PICKUP',
    prepTimeRemainingMins: 0
  },
  {
    id: 'DSP-102',
    orderNumber: '#ZM-4412',
    brand: 'Crust Craft Neapolitan Pizza',
    aggregator: 'ZOMATO',
    items: ['1x Truffle Burrata 12"', '1x Spicy Pepperoni 12"', '1x Garlic Knots'],
    pickupBay: 'Bay #1 (Hot Hold Station)',
    riderName: 'Vikrant Rathi',
    riderPhone: '+91 97112 33445',
    status: 'PACKAGED',
    prepTimeRemainingMins: 2
  },
  {
    id: 'DSP-103',
    orderNumber: '#DIR-092',
    brand: 'Wok & Roll Street Asian',
    aggregator: 'DIRECT_APP',
    items: ['2x Chili Garlic Noodles', '1x Steamed Truffle Edamame Dim Sums'],
    pickupBay: 'Bay #4 (Main Dispatch)',
    status: 'PREPARING',
    prepTimeRemainingMins: 7
  }
];

export const getDarkKitchenStatus = async (req: Request, res: Response) => {
  return res.json({
    success: true,
    data: {
      virtualBrands: mockBrands,
      activeOrders: mockDispatchOrders,
      metrics: {
        totalOrdersToday: 184,
        avgDispatchTimeMins: 11.2,
        packagingAccuracyPercent: 99.4,
        activeRidersInBays: 3
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
