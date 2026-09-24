'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock, ChefHat, CheckCircle, Flame, Bell, Wifi, WifiOff,
  Check, Volume2, VolumeX, AlertTriangle, Sparkles, Utensils,
  ArrowRight, ShieldCheck
} from 'lucide-react';
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

function playKitchenChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {}
}

function KotCard({
  kot,
  onUpdate,
}: {
  kot: Kot;
  onUpdate: (kotId: string, status: string) => void;
}) {
  const isOverdue = kot.ageMinutes > 15;
  const isWarning = kot.ageMinutes > 10;
  const nextStatus = STATUS_FLOW[kot.status];

  return (
    <div
      className={cn(
        'flex flex-col justify-between rounded-3xl border-2 bg-card transition-all duration-200 shadow-md overflow-hidden select-none',
        kot.status === 'NEW' ? 'border-blue-500/60 shadow-blue-500/10' :
        kot.status === 'ACCEPTED' ? 'border-amber-500/60 shadow-amber-500/10' :
        kot.status === 'PREPARING' ? 'border-orange-500/60 shadow-orange-500/10' :
        'border-emerald-500/60 bg-emerald-950/10'
      )}
    >
      {/* Ticket Header */}
      <div className={cn(
        'p-3.5 border-b border-border flex items-center justify-between',
        kot.status === 'NEW' ? 'bg-blue-500/10' :
        kot.status === 'ACCEPTED' ? 'bg-amber-500/10' :
        kot.status === 'PREPARING' ? 'bg-orange-500/10' :
        'bg-emerald-500/10'
      )}>
        <div className="flex items-center gap-2">
          <span className="text-xl font-black text-foreground">#{kot.kotNumber}</span>
          <Badge className={cn(
            'font-black text-[11px] rounded-lg',
            kot.order.type === 'DINE_IN' ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'
          )}>
            {kot.order.table ? `Table ${kot.order.table.name}` : kot.order.type}
          </Badge>
        </div>

        <div className={cn(
          'flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black tabular',
          isOverdue ? 'bg-red-500 text-white animate-pulse' :
          isWarning ? 'bg-amber-500/20 text-amber-400' :
          'bg-muted text-foreground'
        )}>
          <Clock className="w-3.5 h-3.5" />
          <span>{kot.ageMinutes}m ago</span>
        </div>
      </div>

      {/* Dishes List (Giant Large Font for Line Cooks) */}
      <div className="p-4 flex-1 space-y-3">
        {kot.items.map((item) => (
          <div key={item.id} className="flex items-start gap-3 pb-2 border-b border-border/40 last:border-0 last:pb-0">
            {/* Quantity Number Box */}
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-lg font-black shrink-0 shadow-sm">
              {item.orderItem.quantity}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-black text-base text-foreground leading-snug">
                {item.orderItem.menuItem.name}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-bold text-muted-foreground">{item.orderItem.variant.name}</span>
                {item.orderItem.modifiers?.length > 0 && (
                  <span className="text-xs font-semibold text-indigo-400">
                    + {item.orderItem.modifiers.map((m) => m.name).join(', ')}
                  </span>
                )}
              </div>
              {item.orderItem.notes && (
                <div className="mt-1 px-2 py-0.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs font-bold text-red-400">
                  ⚠️ Note: {item.orderItem.notes}
                </div>
              )}
            </div>
          </div>
        ))}

        {kot.order.notes && (
          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs font-bold text-amber-300">
            📝 Order Note: {kot.order.notes}
          </div>
        )}
      </div>

      {/* 1-Tap Giant Bump Action Button */}
      {nextStatus && (
        <div className="p-3 border-t border-border bg-muted/20">
          <button
            type="button"
            onClick={() => onUpdate(kot.id, nextStatus)}
            className={cn(
              'w-full h-14 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg cursor-pointer',
              nextStatus === 'ACCEPTED' ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30' :
              nextStatus === 'PREPARING' ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30' :
              nextStatus === 'READY' ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30' :
              'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/30'
            )}
          >
            {nextStatus === 'ACCEPTED' && (
              <>
                <Check className="w-5 h-5" />
                <span>ACCEPT TICKET</span>
              </>
            )}
            {nextStatus === 'PREPARING' && (
              <>
                <Flame className="w-5 h-5" />
                <span>START COOKING</span>
              </>
            )}
            {nextStatus === 'READY' && (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>FOOD IS READY! ✅</span>
              </>
            )}
            {nextStatus === 'SERVED' && (
              <>
                <Utensils className="w-5 h-5" />
                <span>MARK SERVED</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default function KitchenPage() {
  const queryClient = useQueryClient();
  const [isLive, setIsLive] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [filterStation, setFilterStation] = useState<string | null>(null);

  const { data: kots = [], isLoading } = useQuery<Kot[]>({
    queryKey: ['kitchen-queue', filterStation],
    queryFn: () => apiGet(`/kitchen/queue${filterStation ? `?stationId=${filterStation}` : ''}`),
    refetchInterval: isLive ? 8000 : false,
  });

  const { data: stations = [] } = useQuery<any[]>({
    queryKey: ['kitchen-stations'],
    queryFn: () => apiGet('/kitchen/stations'),
  });

  // Real-time WebSocket event listener with audio chime
  useEffect(() => {
    const off = onRosEvent((event) => {
      if (['KOT_CREATED', 'KOT_STATUS_CHANGED', 'KOT_ITEM_STATUS_CHANGED'].includes(event.type)) {
        if (event.type === 'KOT_CREATED' && soundEnabled) {
          playKitchenChime();
        }
        queryClient.invalidateQueries({ queryKey: ['kitchen-queue'] });
      }
    });
    return off;
  }, [queryClient, soundEnabled]);

  const updateKot = useMutation({
    mutationFn: ({ kotId, status }: { kotId: string; status: string }) =>
      apiPatch(`/kitchen/kots/${kotId}/status`, { status }),
    onSuccess: (_, { status }) => {
      toast.success(
        status === 'READY' ? '✅ Food marked ready for pickup!' : 'Status updated'
      );
      queryClient.invalidateQueries({ queryKey: ['kitchen-queue'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['active-orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['table-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: () => toast.error('Could not update KOT status'),
  });

  const groupedKots = {
    NEW: kots.filter((k) => k.status === 'NEW'),
    ACCEPTED: kots.filter((k) => k.status === 'ACCEPTED'),
    PREPARING: kots.filter((k) => k.status === 'PREPARING'),
    READY: kots.filter((k) => k.status === 'READY'),
  };

  return (
    <div className="space-y-4 animate-fade-in select-none">
      {/* Top KDS Control Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-3xl bg-card border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-xl">
            👨‍🍳
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground">Kitchen Display System (KDS)</h1>
            <p className="text-xs text-muted-foreground font-medium">
              {kots.length} Active Orders in Kitchen Pipeline
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Station Filters */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setFilterStation(null)}
              className={cn(
                'px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer',
                !filterStation
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              All Stations
            </button>
            {(stations as any[]).map((s: any) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setFilterStation(s.id)}
                className={cn(
                  'px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer',
                  filterStation === s.id
                    ? 'text-white shadow-md'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                )}
                style={filterStation === s.id ? { backgroundColor: s.displayColor } : {}}
              >
                {s.name}
              </button>
            ))}
          </div>

          {/* Audio Chime Button */}
          <button
            type="button"
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playKitchenChime();
            }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer',
              soundEnabled
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                : 'bg-muted text-muted-foreground border-border'
            )}
            title="Toggle kitchen bell audio chime"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{soundEnabled ? 'Bell On 🔔' : 'Muted'}</span>
          </button>
        </div>
      </div>

      {/* 4 Traffic Light Kitchen Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { key: 'NEW', title: '🔵 NEW TICKETS', list: groupedKots.NEW, badgeColor: 'bg-blue-500' },
          { key: 'ACCEPTED', title: '🟡 ACCEPTED', list: groupedKots.ACCEPTED, badgeColor: 'bg-amber-500' },
          { key: 'PREPARING', title: '🔥 COOKING NOW', list: groupedKots.PREPARING, badgeColor: 'bg-orange-500' },
          { key: 'READY', title: '✅ READY TO SERVE', list: groupedKots.READY, badgeColor: 'bg-emerald-500' },
        ].map(({ key, title, list, badgeColor }) => (
          <div key={key} className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className={cn('w-2.5 h-2.5 rounded-full', badgeColor)} />
                <h2 className="text-xs font-black text-foreground tracking-wider">{title}</h2>
              </div>
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-muted text-foreground border border-border">
                {list.length}
              </span>
            </div>

            <div className="space-y-3 min-h-[200px]">
              {list.length === 0 ? (
                <div className="rounded-3xl border-2 border-dashed border-border/70 h-32 flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
                  <p className="text-xs font-bold">No tickets in this stage</p>
                </div>
              ) : (
                list.map((kot) => (
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
