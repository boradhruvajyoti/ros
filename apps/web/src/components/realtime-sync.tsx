'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { connectSocket, disconnectSocket, onRosEvent } from '@/lib/socket';
import { toast } from '@/hooks/use-toast';
import type { RosEvent } from '@ros/shared-types';

export function RealtimeSync() {
  const queryClient = useQueryClient();
  const { accessToken, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    // Connect to Socket.IO real-time hub
    const socket = connectSocket(accessToken);

    const unsubscribe = onRosEvent((event: RosEvent) => {
      // Invalidate queries based on event type
      switch (event.type) {
        case 'ORDER_CREATED':
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['active-orders'] });
          queryClient.invalidateQueries({ queryKey: ['tables'] });
          queryClient.invalidateQueries({ queryKey: ['table-stats'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['kds-kots'] });
          queryClient.invalidateQueries({ queryKey: ['reports'] });
          toast({
            title: 'New Order Received',
            description: `Order #${event.payload.orderNumber || ''} created for ${event.payload.type}`,
          });
          break;

        case 'QR_ORDER_PENDING':
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['active-orders'] });
          queryClient.invalidateQueries({ queryKey: ['tables'] });
          queryClient.invalidateQueries({ queryKey: ['table-stats'] });
          toast({
            title: 'Guest QR Order Awaiting Acceptance',
            description: `Table ${event.payload.tableName || ''} sent an order #${event.payload.orderNumber}`,
          });
          break;

        case 'ORDER_STATUS_CHANGED':
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['active-orders'] });
          queryClient.invalidateQueries({ queryKey: ['tables'] });
          queryClient.invalidateQueries({ queryKey: ['table-stats'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['kds-kots'] });
          break;

        case 'KOT_CREATED':
        case 'KOT_STATUS_CHANGED':
        case 'KOT_ITEM_STATUS_CHANGED':
          queryClient.invalidateQueries({ queryKey: ['kds-kots'] });
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['active-orders'] });
          break;

        case 'TABLE_STATUS_CHANGED':
          queryClient.invalidateQueries({ queryKey: ['tables'] });
          queryClient.invalidateQueries({ queryKey: ['table-stats'] });
          queryClient.invalidateQueries({ queryKey: ['active-orders'] });
          break;

        case 'PAYMENT_COMPLETED':
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['active-orders'] });
          queryClient.invalidateQueries({ queryKey: ['tables'] });
          queryClient.invalidateQueries({ queryKey: ['table-stats'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['reports'] });
          queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
          break;

        case 'RESERVATION_CONFIRMED':
          queryClient.invalidateQueries({ queryKey: ['reservations'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          break;

        case 'STOCK_LOW':
          queryClient.invalidateQueries({ queryKey: ['inventory'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          toast({
            title: 'Low Stock Alert',
            description: `${event.payload.name} is running low (${event.payload.currentStock} left)`,
            variant: 'destructive',
          });
          break;

        case 'NOTIFICATION':
          toast({
            title: event.payload.title,
            description: event.payload.body,
          });
          break;

        default:
          queryClient.invalidateQueries();
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated, accessToken, queryClient]);

  return null;
}
