'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock, ChefHat, CheckCircle, Flame, Bell, Wifi, WifiOff,
  Check, Volume2, VolumeX, AlertTriangle, Sparkles, Utensils,
  ArrowRight, ShieldCheck, XCircle, Trash2, Ban
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
  playOrderCookingSound,
  playOrderReadySound,
  playOrderServedSound,
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
  const canCancel = ['NEW', 'ACCEPTED', 'PREPARING', 'READY'].includes(kot.status);

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

  // 1. Fetch live active KOTs (auto-refreshes every 5s as fallback to WebSocket)
  const { data: kots = [], isLoading } = useQuery<Kot[]>({
    queryKey: ['kitchen-kots', filterStation],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStation) params.set('kitchenStationId', filterStation);
      return apiGet(`/kitchen/kots?${params.toString()}`);
    },
    refetchInterval: 5000,
  });

  // 2. Fetch stations for tab filter
  const { data: stations = [] } = useQuery<{ id: string; name: string; displayColor: string }[]>({
    queryKey: ['kitchen-stations'],
    queryFn: () => apiGet('/kitchen/stations'),
  });

  // 3. Status update mutation (optimistic UI bump)
  const updateKot = useMutation({
    mutationFn: ({ kotId, status }: { kotId: string; status: string }) =>
      apiPatch(`/kitchen/kots/${kotId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-kots'] });
    },
    onError: (err: any) => {
      toast({
        title: 'Update failed',
        description: err.message || 'Could not update ticket status',
        variant: 'destructive',
      });
    },
  });

  const handleStatusUpdate = (kotId: string, status: string) => {
    if (soundEnabled) {
      if (status === 'ACCEPTED') {
        playOrderAcceptedSound();
      } else if (status === 'PREPARING') {
        playOrderCookingSound();
      } else if (status === 'READY') {
        playOrderReadySound();
      } else if (status === 'SERVED') {
        playOrderServedSound();
      }
    }
    updateKot.mutate({ kotId, status });
  };

  // Cancel item mutation
  const cancelKotItem = useMutation({
    mutationFn: ({ kotId, itemId, reason }: { kotId: string; itemId: string; reason?: string }) =>
      apiPatch(`/kitchen/kots/${kotId}/items/${itemId}/cancel`, { reason }),
    onSuccess: () => {
      toast({
        title: 'Item Cancelled',
        description: 'Item has been removed from KOT and order total updated.',
      });
      setCancelModalItem(null);
      queryClient.invalidateQueries({ queryKey: ['kitchen-kots'] });
      queryClient.invalidateQueries({ queryKey: ['kitchen-queue'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
    onError: (err: any) => {
      toast({
        title: 'Cancel Item Failed',
        description: err.message || 'Could not cancel item.',
        variant: 'destructive',
      });
    },
  });

  // Cancel whole KOT mutation
  const cancelKot = useMutation({
    mutationFn: ({ kotId, reason }: { kotId: string; reason?: string }) =>
      apiPatch(`/kitchen/kots/${kotId}/cancel`, { reason }),
    onSuccess: () => {
      toast({
        title: 'Ticket Cancelled',
        description: 'Entire KOT has been cancelled and order updated.',
      });
      setCancelModalKot(null);
      queryClient.invalidateQueries({ queryKey: ['kitchen-kots'] });
      queryClient.invalidateQueries({ queryKey: ['kitchen-queue'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
    onError: (err: any) => {
      toast({
        title: 'Cancel Ticket Failed',
        description: err.message || 'Could not cancel ticket.',
        variant: 'destructive',
      });
    },
  });

  // Real-time WebSocket connection
  useEffect(() => {
    const off = onRosEvent((event) => {
      const t = event.type as string;
      const payload = (event as any).payload || {};

      if (['KOT_CREATED', 'ORDER_CREATED', 'KOT_ADDED', 'KOT_STATUS_CHANGED', 'KOT_ITEM_STATUS_CHANGED', 'ORDER_STATUS_CHANGED', 'ORDER_CANCELLED', 'TABLE_STATUS_CHANGED'].includes(t)) {
        if (['KOT_CREATED', 'ORDER_CREATED', 'KOT_ADDED'].includes(t) && soundEnabled) {
          playNewOrderSound();
          toast({
            title: '🔔 New Order in Kitchen!',
            description: `Ticket #${payload?.kotNumber || ''} has arrived.`,
          });
        } else if (t === 'KOT_STATUS_CHANGED' && soundEnabled) {
          if (payload?.status === 'ACCEPTED') {
            playOrderAcceptedSound();
          } else if (payload?.status === 'PREPARING') {
            playOrderCookingSound();
          } else if (payload?.status === 'READY') {
            playOrderReadySound();
          } else if (payload?.status === 'SERVED') {
            playOrderServedSound();
          }
        }
        queryClient.invalidateQueries({ queryKey: ['kitchen-queue'] });
        queryClient.invalidateQueries({ queryKey: ['kitchen-kots'] });
      }
    });
    return off;
  }, [queryClient, soundEnabled]);

  // Group tickets into 4 clear pipeline stages
  const groupedKots = {
    NEW: kots.filter((k) => k.status === 'NEW'),
    ACCEPTED: kots.filter((k) => k.status === 'ACCEPTED'),
    PREPARING: kots.filter((k) => k.status === 'PREPARING'),
    READY: kots.filter((k) => k.status === 'READY'),
  };

  const totalActive = kots.length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1700px] mx-auto min-h-screen">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
            <ChefHat className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                Kitchen Display System
              </h1>
              {isLive ? (
                <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-black flex items-center gap-1">
                  <Wifi className="w-3 h-3 animate-pulse" /> LIVE
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground text-xs">
                  <WifiOff className="w-3 h-3" /> Offline
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              Real-time pipeline &bull; {totalActive} active ticket{totalActive === 1 ? '' : 's'} across kitchen
            </p>
          </div>
        </div>

        {/* Station Filter Tabs & Audio Control */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Station filters */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-card border border-border">
            <button
              type="button"
              onClick={() => setFilterStation(null)}
              className={cn(
                'px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer',
                filterStation === null
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              All Stations
            </button>
            {stations.map((s) => (
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

      {/* 4 Distinguishable Kitchen Columns with Clear Dividers and Vibrant Large Headers */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {[
          {
            key: 'NEW',
            title: 'NEW TICKETS',
            emoji: '🔵',
            icon: Bell,
            list: groupedKots.NEW,
            headerBg: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md shadow-blue-500/20',
            badgeBg: 'bg-white/20 text-white border-white/30',
            containerBorder: 'border-2 border-blue-500/30 bg-blue-500/[0.03]',
            emptyMsg: 'No new tickets waiting',
          },
          {
            key: 'ACCEPTED',
            title: 'ACCEPTED',
            emoji: '🟡',
            icon: ChefHat,
            list: groupedKots.ACCEPTED,
            headerBg: 'bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 text-slate-950 font-black shadow-md shadow-amber-500/20',
            badgeBg: 'bg-slate-950/20 text-slate-950 border-slate-950/30',
            containerBorder: 'border-2 border-amber-500/30 bg-amber-500/[0.03]',
            emptyMsg: 'No accepted tickets in queue',
          },
          {
            key: 'PREPARING',
            title: 'COOKING NOW',
            emoji: '🔥',
            icon: Flame,
            list: groupedKots.PREPARING,
            headerBg: 'bg-gradient-to-r from-orange-600 via-red-600 to-rose-600 text-white shadow-md shadow-orange-500/20',
            badgeBg: 'bg-white/20 text-white border-white/30',
            containerBorder: 'border-2 border-orange-500/30 bg-orange-500/[0.03]',
            emptyMsg: 'Nothing currently on the stove',
          },
          {
            key: 'READY',
            title: 'READY TO SERVE',
            emoji: '✅',
            icon: CheckCircle,
            list: groupedKots.READY,
            headerBg: 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-md shadow-emerald-500/20',
            badgeBg: 'bg-white/20 text-white border-white/30',
            containerBorder: 'border-2 border-emerald-500/30 bg-emerald-500/[0.03]',
            emptyMsg: 'All orders picked up and served',
          },
        ].map(({ key, title, emoji, icon: Icon, list, headerBg, badgeBg, containerBorder, emptyMsg }) => (
          <div
            key={key}
            className={cn(
              'rounded-3xl p-3 sm:p-3.5 space-y-3.5 shadow-sm transition-all flex flex-col',
              containerBorder
            )}
          >
            {/* Distinct Bold Colorful Header Banner */}
            <div className={cn('p-3.5 rounded-2xl flex items-center justify-between gap-2 shadow-sm', headerBg)}>
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xl shrink-0 leading-none">{emoji}</span>
                <h2 className="text-base sm:text-lg font-black tracking-wide uppercase truncate">
                  {title}
                </h2>
              </div>
              <span className={cn('text-sm font-black px-3 py-1 rounded-xl border shrink-0', badgeBg)}>
                {list.length}
              </span>
            </div>

            {/* Ticket Cards Column */}
            <div className="space-y-3 flex-1 min-h-[220px]">
              {list.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-border/70 h-40 flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
                  <Icon className="w-8 h-8 opacity-25 mb-1.5" />
                  <p className="text-xs font-bold text-foreground/70">{emptyMsg}</p>
                </div>
              ) : (
                list.map((kot) => (
                  <KotCard
                    key={kot.id}
                    kot={kot}
                    onUpdate={handleStatusUpdate}
                    onRequestCancelItem={(kotId, itemId, itemName) => {
                      setCancelModalItem({ kotId, itemId, itemName });
                      setCancelReason('');
                    }}
                    onRequestCancelKot={(kotId, kotNumber) => {
                      setCancelModalKot({ kotId, kotNumber });
                      setCancelReason('');
                    }}
                  />
                ))
              )}
            </div>
          </div>
        ))}
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
                <p className="text-xs text-muted-foreground">Remove dish and recalculate order</p>
              </div>
            </div>

            <p className="text-sm text-foreground">
              Are you sure you want to cancel <strong className="text-rose-400">{cancelModalItem.itemName}</strong>? This will remove the item from the kitchen and recalculate the customer&apos;s bill.
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
                <p className="text-xs text-muted-foreground">Remove active items in this KOT ticket</p>
              </div>
            </div>

            <p className="text-sm text-foreground">
              Are you sure you want to cancel Ticket <strong className="text-rose-400">#{cancelModalKot.kotNumber}</strong>? All active items in this ticket will be cancelled and removed from the active order.
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
