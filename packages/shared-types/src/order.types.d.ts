export type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'PICKUP' | 'DELIVERY' | 'ONLINE';
export type OrderStatus = 'DRAFT' | 'CONFIRMED' | 'SENT_TO_KITCHEN' | 'PREPARING' | 'READY' | 'SERVED' | 'BILLED' | 'PARTIALLY_PAID' | 'PAID' | 'COMPLETED' | 'CANCELLED' | 'VOIDED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
export type OrderItemStatus = 'PENDING' | 'SENT' | 'PREPARING' | 'READY' | 'SERVED' | 'VOIDED' | 'CANCELLED';
export type DiscountType = 'PERCENTAGE' | 'FLAT' | 'COUPON' | 'PROMOTION';
export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'WALLET' | 'CREDIT';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
export declare const ORDER_STATE_TRANSITIONS: Record<OrderStatus, OrderStatus[]>;
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
//# sourceMappingURL=order.types.d.ts.map