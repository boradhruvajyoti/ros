'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock, ChefHat, CheckCircle, Flame, Bell, Wifi, WifiOff,
  Check, Volume2, VolumeX, AlertTriangle, Sparkles, Utensils,
  ArrowRight, ShieldCheck, XCircle, Trash2, Ban, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { apiGet, apiPatch } from '@/lib/api';
import { onRosEvent } from '@/lib/socket';
import { toast } from '@/hooks/use-toast';
import {
  playNewOrderSound,
  playOrderAcceptedSound,
  playOrderReadySound,
} from '@/lib/order-sound';

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
  playNewOrderSound();
}

function KotCard({
  kot,
  onUpdate,
  onRequestCancelItem,
  onRequestCancelKot,
}: {
  kot: Kot;
  onUpdate: (kotId: string, status: string) => void;
  onRequestCancelItem: (kotId: string, itemId: string, itemName: string) => void;
  onRequestCancelKot: (kotId: string, kotNumber: string) => void;
}) {
  const isOverdue = kot.ageMinutes > 15;
  const isWarning = kot.ageMinutes > 10;
  const nextStatus = STATUS_FLOW[kot.status];
  const canCancel = ['NEW', 'ACCEPTED'].includes(kot.status);

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
        'p-4 border-b border-border flex items-center justify-between',
        kot.status === 'NEW' ? 'bg-blue-500/15' :
        kot.status === 'ACCEPTED' ? 'bg-amber-500/15' :
        kot.status === 'PREPARING' ? 'bg-orange-500/15' :
        'bg-emerald-500/15'
      )}>
        <div className="flex items-center gap-3">
          <span className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-foreground">
            #{kot.kotNumber}
          </span>
          <Badge className={cn(
            'font-bold text-sm px-3 py-1 rounded-xl uppercase tracking-wide',
            kot.order.type === 'DINE_IN' ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'
          )}>
            {kot.order.table ? `Table ${kot.order.table.name}` : kot.order.type}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <div className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm sm:text-base font-semibold tabular-nums font-mono',
            isOverdue ? 'bg-red-600 text-white animate-pulse' :
            isWarning ? 'bg-amber-500/25 text-amber-300 font-bold' :
            'bg-muted text-foreground'
          )}>
            <Clock className="w-4 h-4" />
            <span>{kot.ageMinutes}m</span>
          </div>

          {canCancel && (
            <button
              type="button"
              onClick={() => onRequestCancelKot(kot.id, kot.kotNumber)}
              title="Cancel Entire KOT Ticket"
              className="p-2 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Dishes List (High-Contrast 20-24px Font for Line Cooks from 4-8 feet) */}
      <div className="p-4 sm:p-5 flex-1 space-y-4">
        {kot.items.map((item) => {
          const isItemCancelled = item.status === 'CANCELLED';
          const qty = item.orderItem?.quantity || 1;
          const isMultiQty = qty > 1;
          const isHalfOrFull = (name?: string) => {
            if (!name) return false;
            const lower = name.toLowerCase().trim();
            if (
              lower === 'regular' ||
              lower === 'regular portion' ||
              lower === 'standard' ||
              lower === 'default' ||
              lower === 'single' ||
              lower === 'normal' ||
              lower === 'standard portion' ||
              lower === 'portion' ||
              lower.includes('regular portion')
            ) {
              return false;
            }
            return true;
          };
          const baseName = item.orderItem?.menuItem?.name || 'Dish';
          const vName = item.orderItem?.variant?.name;
          const fullItemTitle = isHalfOrFull(vName) ? `${baseName} (${vName})` : baseName;

          return (
            <div
              key={item.id}
              className={cn(
                'flex items-start gap-4 pb-3 border-b border-border/50 last:border-0 last:pb-0',
                isItemCancelled && 'opacity-35 line-through'
              )}
            >
              {/* Quantity Number Box (22px-26px ExtraBold, Amber if > 1) */}
              <div className={cn(
                'w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-extrabold font-mono shrink-0 shadow-sm',
                isItemCancelled
                  ? 'bg-muted text-muted-foreground'
                  : isMultiQty
                  ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-400/50'
                  : 'bg-primary text-primary-foreground'
              )}>
                {qty}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn(
                    'font-bold text-xl leading-snug tracking-tight',
                    isItemCancelled ? 'text-muted-foreground line-through' : 'text-foreground'
                  )}>
                    {fullItemTitle}
                  </p>

                  {/* Cancel item button if KOT is before cooking */}
                  {canCancel && !isItemCancelled && (
                    <button
                      type="button"
                      onClick={() =>
                        onRequestCancelItem(
                          kot.id,
                          item.id,
                          fullItemTitle
                        )
                      }
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0"
                      title="Cancel this item from KOT"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {item.orderItem?.modifiers?.length > 0 && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-medium text-indigo-400">
                      + {item.orderItem.modifiers.map((m) => m.name).join(', ')}
                    </span>
                  </div>
                )}

                {isItemCancelled && (
                  <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-md text-xs font-extrabold bg-rose-500/20 text-rose-400">
                    CANCELLED
                  </span>
                )}

                {item.orderItem?.notes && !isItemCancelled && (
                  <div className="mt-2 p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-base font-semibold text-rose-400">
                    ⚠️ {item.orderItem.notes}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {kot.order.notes && (
          <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-base font-semibold text-amber-300">
            📝 Note: {kot.order.notes}
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

function KitchenStatusSection({
  title,
  subtitle,
  icon: Icon,
  headerBg,
  accentBorder,
  dotActiveColor,
  kots,
  onUpdateKot,
  onRequestCancelItem,
  onRequestCancelKot,
}: {
  title: string;
  subtitle?: string;
  icon: any;
  headerBg: string;
  accentBorder: string;
  dotActiveColor: string;
  kots: Kot[];
  onUpdateKot: (kotId: string, status: string) => void;
  onRequestCancelItem: (kotId: string, itemId: string, itemName: string) => void;
  onRequestCancelKot: (kotId: string, kotNumber: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    if (clientWidth > 0) {
      const idx = Math.round(scrollLeft / (clientWidth * 0.85 || 1));
      setActiveIndex(Math.min(Math.max(0, idx), kots.length - 1));
    }
  };

  const scrollToCard = (index: number) => {
    if (!scrollRef.current) return;
    const cardElements = scrollRef.current.children;
    if (cardElements[index]) {
      (cardElements[index] as HTMLElement).scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
      setActiveIndex(index);
    }
  };

  return (
    <div className={cn('rounded-3xl border-2 bg-card/60 backdrop-blur-sm overflow-hidden shadow-md transition-all', accentBorder)}>
      {/* Large, Bold, Colorful Header */}
      <div className={cn('px-5 py-4 flex flex-wrap items-center justify-between gap-3 text-white shadow-md', headerBg)}>
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-md shrink-0 shadow-inner">
            <Icon className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider drop-shadow-sm flex items-center gap-2">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs sm:text-sm font-medium opacity-90">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-4 py-1.5 rounded-2xl text-sm sm:text-base font-black bg-white/25 backdrop-blur-md border border-white/30 shadow-inner">
            {kots.length} {kots.length === 1 ? 'Ticket' : 'Tickets'}
          </span>
        </div>
      </div>

      {/* Ticket List Container */}
      <div className="p-3 sm:p-5">
        {kots.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border/70 py-12 flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
            <Icon className="w-10 h-10 opacity-30 mb-2" />
            <p className="text-base font-bold text-foreground/80">No tickets currently in this stage</p>
            <p className="text-xs text-muted-foreground mt-0.5">Tickets will automatically slide in here</p>
          </div>
        ) : (
          <div>
            {/* Mobile: Horizontal Scroll Snap / Desktop: Responsive Rows & Columns Grid */}
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-2 pt-1 px-1 scroll-smooth no-scrollbar touch-pan-x md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-4 md:overflow-visible md:p-0"
            >
              {kots.map((kot) => (
                <div
                  key={kot.id}
                  className="w-[88vw] max-w-[390px] shrink-0 snap-center md:w-auto md:max-w-none md:shrink md:snap-align-none flex flex-col"
                >
                  <KotCard
                    kot={kot}
                    onUpdate={onUpdateKot}
                    onRequestCancelItem={onRequestCancelItem}
                    onRequestCancelKot={onRequestCancelKot}
                  />
                </div>
              ))}
            </div>

            {/* Mobile Dot Scrolling Indicators */}
            {kots.length > 1 && (
              <div className="flex md:hidden items-center justify-center gap-2 pt-3 pb-1">
                {kots.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => scrollToCard(idx)}
                    aria-label={`Go to ticket ${idx + 1}`}
                    className={cn(
                      'transition-all duration-300 cursor-pointer',
                      activeIndex === idx
                        ? cn('w-7 h-2.5 rounded-full shadow-sm', dotActiveColor)
                        : 'w-2.5 h-2.5 rounded-full bg-muted-foreground/30 hover:bg-muted-foreground/60'
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function KitchenPage() {
  const queryClient = useQueryClient();
  const [isLive, setIsLive] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [filterStation, setFilterStation] = useState<string | null>(null);

  // Item cancellation modal state
  const [cancelModalItem, setCancelModalItem] = useState<{
    kotId: string;
    itemId: string;
    itemName: string;
  } | null>(null);

  // KOT cancellation modal state
  const [cancelModalKot, setCancelModalKot] = useState<{
    kotId: string;
    kotNumber: string;
  } | null>(null);

  const [cancelReason, setCancelReason] = useState('');

  const { data: kots = [], isLoading } = useQuery<Kot[]>({
    queryKey: ['kitchen-queue', filterStation],
    queryFn: () => apiGet(`/kitchen/queue${filterStation ? `?stationId=${filterStation}` : ''}`),
    refetchInterval: isLive ? 2000 : false,
  });

  const { data: stations = [] } = useQuery<any[]>({
    queryKey: ['kitchen-stations'],
    queryFn: () => apiGet('/kitchen/stations'),
  });

  // Track known KOT IDs to play sound if new KOT arrives via poll or socket
  const knownKotIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    if (kots && kots.length > 0) {
      if (isInitialLoadRef.current) {
        knownKotIdsRef.current = new Set(kots.map((k) => k.id));
        isInitialLoadRef.current = false;
      } else {
        const hasNewKot = kots.some((k) => !knownKotIdsRef.current.has(k.id) && k.status === 'NEW');
        if (hasNewKot && soundEnabled) {
          playNewOrderSound();
        }
        knownKotIdsRef.current = new Set(kots.map((k) => k.id));
      }
    }
  }, [kots, soundEnabled]);

  // Real-time WebSocket event listener with audio chimes
  useEffect(() => {
    const off = onRosEvent((event) => {
      const t = event.type as string;
      const payload = (event as any).payload || {};

      if (['KOT_CREATED', 'ORDER_CREATED', 'KOT_ADDED', 'KOT_STATUS_CHANGED', 'KOT_ITEM_STATUS_CHANGED', 'ORDER_STATUS_CHANGED', 'ORDER_CANCELLED', 'TABLE_STATUS_CHANGED'].includes(t)) {
        if (['KOT_CREATED', 'ORDER_CREATED', 'KOT_ADDED'].includes(t) && soundEnabled) {
          playNewOrderSound();
        } else if (t === 'KOT_STATUS_CHANGED' && soundEnabled) {
          if (payload?.status === 'ACCEPTED') {
            playOrderAcceptedSound();
          } else if (payload?.status === 'READY') {
            playOrderReadySound();
          }
        }
        queryClient.invalidateQueries({ queryKey: ['kitchen-queue'] });
        queryClient.invalidateQueries({ queryKey: ['kitchen-kots'] });
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
    onError: (err: any) => toast.error(err?.message || 'Could not update KOT status'),
  });

  const cancelKotItem = useMutation({
    mutationFn: ({ kotId, itemId, reason }: { kotId: string; itemId: string; reason?: string }) =>
      apiPatch(`/kitchen/kots/${kotId}/items/${itemId}/status`, { status: 'CANCELLED', reason }),
    onSuccess: () => {
      toast.success('Item cancelled and order totals updated');
      setCancelModalItem(null);
      setCancelReason('');
      queryClient.invalidateQueries({ queryKey: ['kitchen-queue'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['active-orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Could not cancel item'),
  });

  const cancelKot = useMutation({
    mutationFn: ({ kotId, reason }: { kotId: string; reason?: string }) =>
      apiPatch(`/kitchen/kots/${kotId}/status`, { status: 'CANCELLED', reason }),
    onSuccess: () => {
      toast.success('KOT ticket cancelled');
      setCancelModalKot(null);
      setCancelReason('');
      queryClient.invalidateQueries({ queryKey: ['kitchen-queue'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['active-orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Could not cancel KOT ticket'),
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

      {/* 4 Vertically Stacked Status Sections */}
      <div className="space-y-6 sm:space-y-8">
        {/* 1. NEW TICKETS */}
        <KitchenStatusSection
          title="🔵 NEW TICKETS"
          subtitle="Freshly arrived orders waiting for kitchen acceptance"
          icon={Bell}
          headerBg="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800 text-white"
          accentBorder="border-blue-500/40 hover:border-blue-500/60"
          dotActiveColor="bg-blue-500"
          kots={groupedKots.NEW}
          onUpdateKot={(kotId, status) => {
            if (status === 'ACCEPTED') {
              playOrderAcceptedSound();
            } else if (status === 'READY') {
              playOrderReadySound();
            }
            updateKot.mutate({ kotId, status });
          }}
          onRequestCancelItem={(kotId, itemId, itemName) => {
            setCancelModalItem({ kotId, itemId, itemName });
            setCancelReason('');
          }}
          onRequestCancelKot={(kotId, kotNumber) => {
            setCancelModalKot({ kotId, kotNumber });
            setCancelReason('');
          }}
        />

        {/* 2. ACCEPTED */}
        <KitchenStatusSection
          title="🟡 ACCEPTED ORDERS"
          subtitle="Confirmed by kitchen, queued up for prep"
          icon={ChefHat}
          headerBg="bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 text-slate-950 font-black"
          accentBorder="border-amber-500/40 hover:border-amber-500/60"
          dotActiveColor="bg-amber-500"
          kots={groupedKots.ACCEPTED}
          onUpdateKot={(kotId, status) => {
            if (status === 'ACCEPTED') {
              playOrderAcceptedSound();
            } else if (status === 'READY') {
              playOrderReadySound();
            }
            updateKot.mutate({ kotId, status });
          }}
          onRequestCancelItem={(kotId, itemId, itemName) => {
            setCancelModalItem({ kotId, itemId, itemName });
            setCancelReason('');
          }}
          onRequestCancelKot={(kotId, kotNumber) => {
            setCancelModalKot({ kotId, kotNumber });
            setCancelReason('');
          }}
        />

        {/* 3. COOKING NOW (PREPARING) */}
        <KitchenStatusSection
          title="🔥 COOKING NOW"
          subtitle="Active dishes on the grill, wok, and ovens"
          icon={Flame}
          headerBg="bg-gradient-to-r from-orange-600 via-red-600 to-rose-600 text-white"
          accentBorder="border-orange-500/40 hover:border-orange-500/60"
          dotActiveColor="bg-orange-500"
          kots={groupedKots.PREPARING}
          onUpdateKot={(kotId, status) => {
            if (status === 'ACCEPTED') {
              playOrderAcceptedSound();
            } else if (status === 'READY') {
              playOrderReadySound();
            }
            updateKot.mutate({ kotId, status });
          }}
          onRequestCancelItem={(kotId, itemId, itemName) => {
            setCancelModalItem({ kotId, itemId, itemName });
            setCancelReason('');
          }}
          onRequestCancelKot={(kotId, kotNumber) => {
            setCancelModalKot({ kotId, kotNumber });
            setCancelReason('');
          }}
        />

        {/* 4. READY TO SERVE */}
        <KitchenStatusSection
          title="✅ READY TO SERVE"
          subtitle="Plated & ready for food runners and table service"
          icon={CheckCircle}
          headerBg="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-800 text-white"
          accentBorder="border-emerald-500/40 hover:border-emerald-500/60"
          dotActiveColor="bg-emerald-500"
          kots={groupedKots.READY}
          onUpdateKot={(kotId, status) => {
            if (status === 'ACCEPTED') {
              playOrderAcceptedSound();
            } else if (status === 'READY') {
              playOrderReadySound();
            }
            updateKot.mutate({ kotId, status });
          }}
          onRequestCancelItem={(kotId, itemId, itemName) => {
            setCancelModalItem({ kotId, itemId, itemName });
            setCancelReason('');
          }}
          onRequestCancelKot={(kotId, kotNumber) => {
            setCancelModalKot({ kotId, kotNumber });
            setCancelReason('');
          }}
        />
      </div>

      {/* Item Cancel Confirmation Dialog */}
      {cancelModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-card border border-border p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 flex items-center justify-center">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-foreground">Cancel Item on KOT</h3>
                <p className="text-xs text-muted-foreground">Remove dish before cooking starts</p>
              </div>
            </div>

            <p className="text-sm text-foreground">
              Are you sure you want to cancel <strong className="text-rose-400">{cancelModalItem.itemName}</strong>? This will remove the item before cooking and recalculate the customer&apos;s bill.
            </p>

            <div className="space-y-1.5 py-1">
              <label className="text-xs font-bold text-muted-foreground">Reason for cancellation (optional):</label>
              <Input
                placeholder="e.g. Out of stock / Customer changed mind"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setCancelModalItem(null)}
                disabled={cancelKotItem.isPending}
              >
                Back
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  cancelKotItem.mutate({
                    kotId: cancelModalItem.kotId,
                    itemId: cancelModalItem.itemId,
                    reason: cancelReason,
                  });
                }}
                disabled={cancelKotItem.isPending}
              >
                {cancelKotItem.isPending ? 'Cancelling...' : 'Confirm Cancel Item'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* KOT Ticket Cancel Confirmation Dialog */}
      {cancelModalKot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-card border border-border p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-foreground">Cancel Entire Ticket</h3>
                <p className="text-xs text-muted-foreground">Remove all un-cooked items in ticket</p>
              </div>
            </div>

            <p className="text-sm text-foreground">
              Are you sure you want to cancel Ticket <strong className="text-rose-400">#{cancelModalKot.kotNumber}</strong>? All un-cooked items in this ticket will be removed from the order.
            </p>

            <div className="space-y-1.5 py-1">
              <label className="text-xs font-bold text-muted-foreground">Reason for cancellation (optional):</label>
              <Input
                placeholder="e.g. Table cancelled entire round"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setCancelModalKot(null)}
                disabled={cancelKot.isPending}
              >
                Back
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  cancelKot.mutate({
                    kotId: cancelModalKot.kotId,
                    reason: cancelReason,
                  });
                }}
                disabled={cancelKot.isPending}
              >
                {cancelKot.isPending ? 'Cancelling...' : 'Confirm Cancel Ticket'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
