'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { onRosEvent } from '@/lib/socket';

/**
 * Hook that subscribes to a set of ros:event types and invalidates
 * the given query keys on match. Returns an unsubscribe function.
 *
 * Usage:
 *   useRosSocket(['ORDER_STATUS_CHANGED', 'KOT_ITEM_STATUS_CHANGED'], [['active-orders'], ['tables']]);
 */
export function useRosSocket(
  eventTypes: string[],
  queryKeys: (string | string[])[],
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const eventSet = new Set(eventTypes);

    const unsub = onRosEvent((event) => {
      if (eventSet.has(event.type as string)) {
        for (const key of queryKeys) {
          queryClient.invalidateQueries({
            queryKey: Array.isArray(key) ? key : [key],
          });
        }
      }
    });

    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient]);
}
