// =============================================================================
// ROS Shared Types — Real-time Events
// =============================================================================

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

export type RosEvent =
  | { type: 'ORDER_CREATED';        payload: OrderSummary }
  | { type: 'ORDER_STATUS_CHANGED'; payload: { orderId: string; orderNumber: string; status: OrderStatus } }
  | { type: 'KOT_CREATED';          payload: KotSummary }
  | { type: 'KOT_STATUS_CHANGED';   payload: { kotId: string; status: KotStatus; stationId: string } }
  | { type: 'KOT_ITEM_STATUS_CHANGED'; payload: { kotItemId: string; kotId: string; status: string } }
  | { type: 'TABLE_STATUS_CHANGED'; payload: { tableId: string; status: TableStatus; orderId?: string } }
  | { type: 'PAYMENT_COMPLETED';    payload: { orderId: string; amount: number; method: string } }
  | { type: 'RESERVATION_CONFIRMED'; payload: { reservationId: string; customerName: string; date: string; time: string } }
  | { type: 'STOCK_LOW';            payload: { ingredientId: string; name: string; currentStock: number; threshold: number } }
  | { type: 'QR_ORDER_PENDING';      payload: { orderId: string; orderNumber: string; tableId: string; tableName: string; customerName?: string; customerPhone?: string; total: number; itemCount: number } }
  | { type: 'NOTIFICATION';         payload: NotificationPayload };

// Socket.IO room naming convention
export const getRoomKey = (tenantId: string, branchId: string) =>
  `tenant:${tenantId}:branch:${branchId}`;

export const getKitchenRoomKey = (tenantId: string, branchId: string, stationId: string) =>
  `tenant:${tenantId}:branch:${branchId}:station:${stationId}`;
