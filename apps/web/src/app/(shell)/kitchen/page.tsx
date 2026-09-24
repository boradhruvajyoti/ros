'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, ChefHat, CheckCircle, Flame, Bell, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { apiGet, apiPatch } from '@/lib/api';
import { onRosEvent } from '@/lib/socket';
import { toast } from '@/hooks/use-toast';

interface KotItem {
  id: string;
  status: string;
  orderItem: {
    quantity: number;
    notes?: string;
    menuItem: { name: string };
    variant: { name: string };
    modifiers: { name: string; price: number }[];
  };
}

interface Kot {
  id: string;
  kotNumber: string;
  orderId: string;
  order: {
    orderNumber: string;
    type: string;
    table?: { name: string };
    notes?: string;
  };
  kitchenStation?: { id: string; name: string; displayColor: string };
  status: string;
  ageMinutes: number;
  items: KotItem[];
}

const STATUS_FLOW: Record<string, string> = {
  NEW: 'ACCEPTED',
  ACCEPTED: 'PREPARING',
  PREPARING: 'READY',
  READY: 'SERVED',
};

const STATUS_COLORS: Record<string, string> = {
  NEW:       'bg-blue-500/10 text-blue-500 border-blue-500/30',
  ACCEPTED:  'bg-amber-500/10 text-amber-500 border-amber-500/30',
  PREPARING: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  READY:     'bg-green-500/10 text-green-500 border-green-500/30',
  SERVED:    'bg-muted text-muted-foreground border-border',
};

const URGENCY_BORDER: Record<string, string> = {
  low:  'border-l-green-500',
  mid:  'border-l-amber-500',
  high: 'border-l-red-500',
};

function getUrgency(ageMinutes: number): 'low' | 'mid' | 'high' {
  if (ageMinutes > 20) return 'high';
  if (ageMinutes > 10) return 'mid';
  return 'low';
}

function KotCard({ kot, onUpdate }: { kot: Kot; onUpdate: (kotId: string, status: string) => void }) {
  const urgency = getUrgency(kot.ageMinutes);
  const nextStatus = STATUS_FLOW[kot.status];

  return (
    <div className={cn(
      'flex flex-col rounded-2xl border border-border bg-card border-l-4 transition-all duration-300',
      URGENCY_BORDER[urgency]
    )}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-foreground">#{kot.kotNumber}</span>
              {urgency === 'high' && <Flame className="w-4 h-4 text-red-500 animate-pulse" />}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Order {kot.order.orderNumber}
              {kot.order.table ? ` · Table ${kot.order.table.name}` : ` · ${kot.order.type}`}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className={cn(
              'text-sm font-bold tabular px-2 py-1 rounded-lg',
              urgency === 'high' ? 'text-red-500 bg-red-500/10' :
              urgency === 'mid'  ? 'text-amber-500 bg-amber-500/10' :
              'text-muted-foreground bg-muted'
            )}>
              <Clock className="w-3 h-3 inline mr-1" />
              {kot.ageMinutes}m
            </div>
          </div>
        </div>

        {kot.kitchenStation && (
          <div className="mt-2 flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: kot.kitchenStation.displayColor }} />
            <span className="text-xs font-medium text-muted-foreground">{kot.kitchenStation.name}</span>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="p-4 flex-1 space-y-3">
        {kot.items.map((item) => (
          <div key={item.id} className={cn(
            'flex gap-3',
            item.status === 'READY' && 'opacity-50'
          )}>
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-black',
              'bg-foreground/10 text-foreground'
            )}>
              {item.orderItem.quantity}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground">{item.orderItem.menuItem.name}</p>
              <p className="text-xs text-muted-foreground">{item.orderItem.variant.name}</p>
              {item.orderItem.modifiers.length > 0 && (
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  + {item.orderItem.modifiers.map((m) => m.name).join(', ')}
                </p>
              )}
              {item.orderItem.notes && (
                <p className="text-xs text-amber-500 mt-0.5 italic">"{item.orderItem.notes}"</p>
              )}
            </div>
            {item.status === 'READY' && <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />}
          </div>
        ))}

        {kot.order.notes && (
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 italic mt-2">
            📝 {kot.order.notes}
          </div>
        )}
      </div>

      {/* Action */}
      {nextStatus && (
        <div className="p-3 border-t border-border">
          <Button
            className="w-full"
            variant={nextStatus === 'READY' ? 'success' : 'default'}
            size="sm"
            onClick={() => onUpdate(kot.id, nextStatus)}
          >
            {nextStatus === 'ACCEPTED'  ? '✓ Accept' :
             nextStatus === 'PREPARING' ? '🔥 Start Cooking' :
             nextStatus === 'READY'     ? '✅ Mark Ready' :
             '🍽️ Mark Served'}
          </Button>
        </div>
      )}

      {kot.status === 'READY' && (
        <div className="p-3 border-t border-border">
          <div className="text-xs font-semibold text-green-500 text-center flex items-center justify-center gap-1.5">
            <Bell className="w-3.5 h-3.5" />
            Ready for pickup / service
          </div>
        </div>
      )}
    </div>
  );
}

export default function KitchenPage() {
  const queryClient = useQueryClient();
  const [isLive, setIsLive] = useState(true);
  const [filterStation, setFilterStation] = useState<string | null>(null);

  const { data: kots = [], isLoading } = useQuery<Kot[]>({
    queryKey: ['kitchen-queue', filterStation],
    queryFn: () => apiGet(`/kitchen/queue${filterStation ? `?stationId=${filterStation}` : ''}`),
    refetchInterval: isLive ? 15000 : false,
  });

  const { data: stations = [] } = useQuery<any[]>({
    queryKey: ['kitchen-stations'],
    queryFn: () => apiGet('/kitchen/stations'),
  });

  // Real-time updates
  useEffect(() => {
    const off = onRosEvent((event) => {
      if (['KOT_CREATED', 'KOT_STATUS_CHANGED', 'KOT_ITEM_STATUS_CHANGED'].includes(event.type)) {
        queryClient.invalidateQueries({ queryKey: ['kitchen-queue'] });
      }
    });
    return off;
  }, [queryClient]);

  const updateKot = useMutation({
    mutationFn: ({ kotId, status }: { kotId: string; status: string }) =>
      apiPatch(`/kitchen/kots/${kotId}/status`, { status }),
    onSuccess: (_, { status }) => {
      toast.success(
        status === 'READY' ? '✅ KOT marked as ready!' : 'Status updated',
      );
      queryClient.invalidateQueries({ queryKey: ['kitchen-queue'] });
    },
    onError: () => toast.error('Failed to update status'),
  });

  const groupedKots = {
    NEW:       kots.filter((k) => k.status === 'NEW'),
    ACCEPTED:  kots.filter((k) => k.status === 'ACCEPTED'),
    PREPARING: kots.filter((k) => k.status === 'PREPARING'),
    READY:     kots.filter((k) => k.status === 'READY'),
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Kitchen Display</h1>
            <p className="text-xs text-muted-foreground">{kots.length} active KOTs</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Station filter */}
          <div className="flex gap-1.5">
            <button
              onClick={() => setFilterStation(null)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                !filterStation ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              All Stations
            </button>
            {(stations as any[]).map((s: any) => (
              <button
                key={s.id}
                onClick={() => setFilterStation(s.id)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  filterStation === s.id ? 'text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
                style={filterStation === s.id ? { backgroundColor: s.displayColor } : {}}
              >
                {s.name}
              </button>
            ))}
          </div>

          {/* Live toggle */}
          <button
            onClick={() => setIsLive(!isLive)}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              isLive ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'
            )}
          >
            {isLive ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {isLive ? 'Live' : 'Paused'}
          </button>
        </div>
      </div>

      {/* KDS columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Object.entries(groupedKots).map(([status, kotList]) => (
          <div key={status} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{status.replace('_', ' ')}</h3>
              {kotList.length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {kotList.length}
                </span>
              )}
            </div>

            <div className="space-y-3 min-h-[120px]">
              {kotList.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border h-24 flex items-center justify-center">
                  <p className="text-xs text-muted-foreground">No KOTs</p>
                </div>
              ) : (
                kotList.map((kot) => (
                  <KotCard
                    key={kot.id}
                    kot={kot}
                    onUpdate={(kotId, status) => updateKot.mutate({ kotId, status })}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
