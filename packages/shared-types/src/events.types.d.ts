import type { OrderSummary, OrderStatus } from './order.types';
import type { KotSummary, KotStatus } from './kitchen.types';
export type TableStatus = 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'CLEANING' | 'BLOCKED';
export interface NotificationPayload {
    id: string;
    event: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
}
export type RosEvent = {
    type: 'ORDER_CREATED';
    payload: OrderSummary;
} | {
    type: 'ORDER_STATUS_CHANGED';
    payload: {
        orderId: string;
        orderNumber: string;
        status: OrderStatus;
    };
} | {
    type: 'KOT_CREATED';
    payload: KotSummary;
} | {
    type: 'KOT_STATUS_CHANGED';
    payload: {
        kotId: string;
        status: KotStatus;
        stationId: string;
    };
} | {
    type: 'KOT_ITEM_STATUS_CHANGED';
    payload: {
        kotItemId: string;
        kotId: string;
        status: string;
    };
} | {
    type: 'TABLE_STATUS_CHANGED';
    payload: {
        tableId: string;
        status: TableStatus;
        orderId?: string;
    };
} | {
    type: 'PAYMENT_COMPLETED';
    payload: {
        orderId: string;
        amount: number;
        method: string;
    };
} | {
    type: 'RESERVATION_CONFIRMED';
    payload: {
        reservationId: string;
        customerName: string;
        date: string;
        time: string;
    };
} | {
    type: 'STOCK_LOW';
    payload: {
        ingredientId: string;
        name: string;
        currentStock: number;
        threshold: number;
    };
} | {
    type: 'NOTIFICATION';
    payload: NotificationPayload;
};
export declare const getRoomKey: (tenantId: string, branchId: string) => string;
export declare const getKitchenRoomKey: (tenantId: string, branchId: string, stationId: string) => string;
//# sourceMappingURL=events.types.d.ts.map