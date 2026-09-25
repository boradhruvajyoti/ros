// =============================================================================
// ROS Shared Types — Orders
// =============================================================================

export type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'PICKUP' | 'DELIVERY' | 'ONLINE';

export type OrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'SENT_TO_KITCHEN'
  | 'PREPARING'
  | 'READY'
  | 'SERVED'
  | 'BILLED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'VOIDED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export type OrderItemStatus = 'PENDING' | 'SENT' | 'PREPARING' | 'READY' | 'SERVED' | 'VOIDED' | 'CANCELLED';

export type DiscountType = 'PERCENTAGE' | 'FLAT' | 'COUPON' | 'PROMOTION';

export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'WALLET' | 'CREDIT';

export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';

// Valid state transitions (enforced server-side)
export const ORDER_STATE_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT:              ['CONFIRMED', 'SENT_TO_KITCHEN', 'BILLED', 'PAID', 'CANCELLED'],
  CONFIRMED:          ['SENT_TO_KITCHEN', 'PREPARING', 'READY', 'SERVED', 'BILLED', 'PAID', 'CANCELLED'],
  SENT_TO_KITCHEN:    ['PREPARING', 'READY', 'SERVED', 'BILLED', 'PAID', 'CANCELLED'],
  PREPARING:          ['READY', 'SERVED', 'BILLED', 'PAID', 'CANCELLED'],
  READY:              ['SERVED', 'BILLED', 'PAID', 'CANCELLED'],
  SERVED:             ['BILLED', 'PAID', 'CANCELLED'],
  BILLED:             ['PARTIALLY_PAID', 'PAID', 'COMPLETED', 'VOIDED', 'CANCELLED'],
  PARTIALLY_PAID:     ['PAID', 'COMPLETED', 'VOIDED', 'CANCELLED'],
  PAID:               ['COMPLETED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'VOIDED'],
  COMPLETED:          ['REFUNDED', 'PARTIALLY_REFUNDED'],
  CANCELLED:          [],
  VOIDED:             [],
  REFUNDED:           [],
  PARTIALLY_REFUNDED: ['REFUNDED'],
};

export interface OrderSummary {
  id: string;
  orderNumber: string;
  type: OrderType;
  status: OrderStatus;
  tableId?: string;
  tableName?: string;
  customerName?: string;
  itemCount: number;
  total: number;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  menuItemName: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
  notes?: string;
  status: OrderItemStatus;
  modifiers: OrderItemModifier[];
}

export interface OrderItemModifier {
  id: string;
  modifierId: string;
  name: string;
  price: number;
}
