'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock, ChefHat, CheckCircle2, Flame, Bell, Wifi, WifiOff,
  Check, Volume2, VolumeX, AlertTriangle, Utensils,
  Trash2, XCircle, RotateCcw, Sparkles, ShoppingBag, ArrowRight, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { apiGet, apiPatch } from '@/lib/api';
import { onRosEvent } from '@/lib/socket';
import { toast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/auth.store';
import { hasSubmoduleAccess, isTenantAdmin } from '@/lib/nav-permissions';
import {
  playNewOrderSound,
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
    variant?: { name: string };
    modifiers?: { name: string; price: number }[];
  };
}

interface Kot {
  id: string;
  kotNumber: string;
  orderId: string;
  order: {
    id?: string;
    orderNumber: string;
    type: string;
    status?: string;
    table?: { id?: string; name: string };
    notes?: string;
  };
  kitchenStation?: { id: string; name: string; displayColor: string };
  status: string;
  ageMinutes: number;
  items: KotItem[];
}

function getKdsAccess(
  user: { role?: string; roles?: string[]; designation?: string; department?: string; permissions?: string[] } | null | undefined
) {
  if (!user) {
    return { category: 'MANAGEMENT', canViewCook: true, canViewWaiter: true, canToggle: true };
  }

  const userRoles = [
    ...(user.roles || []),
    ...(user.role ? [user.role] : []),
  ].map((r) => r.toUpperCase());
  const designation = (user.designation || '').toLowerCase().trim();
  const department = (user.department || '').toLowerCase().trim();

  // 1. Management & Leadership (full access) — always gets toggle
  const isMgmtRole = userRoles.some((r) =>
    ['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'OWNER', 'GENERAL_MANAGER'].some((m) => r.includes(m))
  );
  const isMgmtDesignation =
    designation.includes('manager') ||
    designation.includes('supervisor') ||
    designation.includes('director') ||
    designation.includes('owner') ||
    designation.includes('lead') ||
    department.includes('management') ||
    department.includes('leadership') ||
    department.includes('admin');

  if (isMgmtRole || isMgmtDesignation) {
    return { category: 'MANAGEMENT', canViewCook: true, canViewWaiter: true, canToggle: true };
  }

  // 2. Check submodule-level permissions (from tenant admin RBAC assignment)
  // These take priority over role/designation heuristics for staff users
  const perms: string[] = user.permissions || [];
  const hasCookSubPerm = perms.includes('sub:kds_cook_station');
  const hasRunnerSubPerm = perms.includes('sub:kds_runner_station');

  if (hasCookSubPerm || hasRunnerSubPerm) {
    const canToggle = hasCookSubPerm && hasRunnerSubPerm;
    if (hasCookSubPerm && !hasRunnerSubPerm) {
      return { category: 'KITCHEN', canViewCook: true, canViewWaiter: false, canToggle: false };
    }
    if (!hasCookSubPerm && hasRunnerSubPerm) {
      return { category: 'FOH', canViewCook: false, canViewWaiter: true, canToggle: false };
    }
    return { category: 'MANAGEMENT', canViewCook: true, canViewWaiter: true, canToggle: true };
  }

  // 3. Kitchen & Culinary (role/designation heuristics)
  const isKitchenRole = userRoles.some((r) =>
    ['CHEF', 'COOK', 'KITCHEN', 'BAKER', 'COMMIS', 'PIZZA', 'CULINARY'].some((k) => r.includes(k))
  );
  const isKitchenDesignation =
    designation.includes('chef') ||
    designation.includes('cook') ||
    designation.includes('baker') ||
    designation.includes('pizzaiolo') ||
    designation.includes('tandoor') ||
    designation.includes('culinary') ||
    designation.includes('commis') ||
    designation.includes('prep') ||
    designation.includes('helper') ||
    department.includes('kitchen') ||
    department.includes('culinary');

  if (isKitchenDesignation || isKitchenRole) {
    return { category: 'KITCHEN', canViewCook: true, canViewWaiter: false, canToggle: false };
  }

  // 4. Front of House & Guest Service (role/designation heuristics)
  const isFohRole = userRoles.some((r) =>
    ['WAITER', 'CAPTAIN', 'CASHIER', 'SERVER', 'RUNNER', 'DELIVERY', 'RIDER', 'BARISTA', 'BARTENDER', 'FOH'].some((f) => r.includes(f))
  );
  const isFohDesignation =
    designation.includes('waiter') ||
    designation.includes('waitress') ||
    designation.includes('captain') ||
    designation.includes('runner') ||
    designation.includes('busser') ||
    designation.includes('host') ||
    designation.includes('cashier') ||
    designation.includes('pos') ||
    designation.includes('delivery') ||
    designation.includes('rider') ||
    designation.includes('driver') ||
    designation.includes('bartender') ||
    designation.includes('barista') ||
    designation.includes('sommelier') ||
    designation.includes('beverage') ||
    designation.includes('steward') ||
    designation.includes('clean') ||
    department.includes('front') ||
    department.includes('service') ||
    department.includes('guest') ||
    department.includes('bar') ||
    department.includes('cashier');

  if (isFohDesignation || isFohRole) {
    return { category: 'FOH', canViewCook: false, canViewWaiter: true, canToggle: false };
  }

  // 5. Fallback check by department
  if (department.includes('kitchen')) {
    return { category: 'KITCHEN', canViewCook: true, canViewWaiter: false, canToggle: false };
  }
  if (department.includes('service') || department.includes('bar') || department.includes('cashier')) {
    return { category: 'FOH', canViewCook: false, canViewWaiter: true, canToggle: false };
  }

  return { category: 'MANAGEMENT', canViewCook: true, canViewWaiter: true, canToggle: true };
}

export default function KitchenPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const kdsAccess = getKdsAccess(user);

  // Active Role state: locked for KITCHEN or FOH, toggleable for MANAGEMENT
  const [activeRole, setActiveRole] = useState<'COOK' | 'WAITER'>(() => {
    if (kdsAccess.category === 'KITCHEN') return 'COOK';
    if (kdsAccess.category === 'FOH') return 'WAITER';
    return 'COOK';
  });

  // Keep activeRole in sync if access category changes
  useEffect(() => {
    if (kdsAccess.category === 'KITCHEN') setActiveRole('COOK');
    else if (kdsAccess.category === 'FOH') setActiveRole('WAITER');
  }, [kdsAccess.category]);

  // Sub-tabs for Cook: 'NEW' (In Kitchen) | 'READY' (Complete & Ready to Serve)
  const [cookTab, setCookTab] = useState<'NEW' | 'READY'>('NEW');

  // Sub-tabs for Waiter: 'READY' (Complete & Ready to Serve) | 'SERVED' (Served)
  const [waiterTab, setWaiterTab] = useState<'READY' | 'SERVED'>('READY');

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [filterStation, setFilterStation] = useState<string | null>(null);

  // Modals for cancellation
  const [cancelModalItem, setCancelModalItem] = useState<{
    kotId: string;
    itemId: string;
    itemName: string;
  } | null>(null);

  const [cancelModalKot, setCancelModalKot] = useState<{
    kotId: string;
    kotNumber: string;
  } | null>(null);

  const [cancelReason, setCancelReason] = useState('');

  // 1. Fetch live KOTs queue
  const { data: kots = [], isLoading } = useQuery<Kot[]>({
    queryKey: ['kitchen-kots', filterStation],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStation) params.set('stationId', filterStation);
      return apiGet(`/kitchen/kots?${params.toString()}`);
    },
    refetchInterval: 4000,
  });

  // 2. Fetch stations
  const { data: stations = [] } = useQuery<{ id: string; name: string; displayColor: string }[]>({
    queryKey: ['kitchen-stations'],
    queryFn: () => apiGet('/kitchen/stations'),
  });

  // 3. Status mutations
  const updateKotItemStatus = useMutation({
    mutationFn: ({ kotId, itemId, status }: { kotId: string; itemId: string; status: string }) =>
      apiPatch(`/kitchen/kots/${kotId}/items/${itemId}/status`, { status }),
    onSuccess: (_, variables) => {
      if (soundEnabled) {
        if (variables.status === 'READY') playOrderReadySound();
        else if (variables.status === 'SERVED') playOrderServedSound();
      }
      queryClient.invalidateQueries({ queryKey: ['kitchen-kots'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
    onError: (err: any) => {
      toast({
        title: 'Item Update Failed',
        description: err.message || 'Could not update item status',
        variant: 'destructive',
      });
    },
  });

  const updateKotStatus = useMutation({
    mutationFn: ({ kotId, status }: { kotId: string; status: string }) =>
      apiPatch(`/kitchen/kots/${kotId}/status`, { status }),
    onSuccess: (_, variables) => {
      if (soundEnabled) {
        if (variables.status === 'READY') playOrderReadySound();
        else if (variables.status === 'SERVED') playOrderServedSound();
      }
      queryClient.invalidateQueries({ queryKey: ['kitchen-kots'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
    onError: (err: any) => {
      toast({
        title: 'Ticket Update Failed',
        description: err.message || 'Could not update ticket status',
        variant: 'destructive',
      });
    },
  });

  const cancelKotItem = useMutation({
    mutationFn: ({ kotId, itemId, reason }: { kotId: string; itemId: string; reason?: string }) =>
      apiPatch(`/kitchen/kots/${kotId}/items/${itemId}/cancel`, { reason }),
    onSuccess: () => {
      toast({
        title: 'Item Cancelled',
        description: 'Item was removed from KOT and order recalculated.',
      });
      setCancelModalItem(null);
      setCancelReason('');
      queryClient.invalidateQueries({ queryKey: ['kitchen-kots'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
    onError: (err: any) => {
      toast({
        title: 'Cancel Item Failed',
        description: err.message || 'Could not cancel item',
        variant: 'destructive',
      });
    },
  });

  const cancelKot = useMutation({
    mutationFn: ({ kotId, reason }: { kotId: string; reason?: string }) =>
      apiPatch(`/kitchen/kots/${kotId}/cancel`, { reason }),
    onSuccess: () => {
      toast({
        title: 'Ticket Cancelled',
        description: 'Entire KOT was cancelled.',
      });
      setCancelModalKot(null);
      setCancelReason('');
      queryClient.invalidateQueries({ queryKey: ['kitchen-kots'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
    onError: (err: any) => {
      toast({
        title: 'Cancel Ticket Failed',
        description: err.message || 'Could not cancel ticket',
        variant: 'destructive',
      });
    },
  });

  // Real-time WebSocket connection
  useEffect(() => {
    const off = onRosEvent((event) => {
      const t = event.type as string;
      const payload = (event as any).payload || {};

      if ([
        'KOT_CREATED', 'ORDER_CREATED', 'KOT_ADDED',
        'KOT_STATUS_CHANGED', 'KOT_ITEM_STATUS_CHANGED',
        'ORDER_STATUS_CHANGED', 'ORDER_CANCELLED', 'TABLE_STATUS_CHANGED'
      ].includes(t)) {
        if (['KOT_CREATED', 'ORDER_CREATED', 'KOT_ADDED'].includes(t) && soundEnabled) {
          playNewOrderSound();
          toast({
            title: '🔔 New Order in Kitchen!',
            description: `Ticket #${payload?.kotNumber || ''} has arrived.`,
          });
        }
        queryClient.invalidateQueries({ queryKey: ['kitchen-kots'] });
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['tables'] });
      }
    });
    return off;
  }, [queryClient, soundEnabled]);

  // Chronological sorting: Oldest KOTs at the top (first), newly created / running KOTs append below
  const sortedKots = [...kots].sort((a, b) => {
    return (b.ageMinutes || 0) - (a.ageMinutes || 0);
  });

  // Filtering KOTs based on items status for Cook & Waiter views
  // COOK NEW ORDERS: KOTs that have at least one item with status NEW, PENDING, ACCEPTED, or PREPARING
  const cookNewKots = sortedKots.filter((k) =>
    k.status !== 'CANCELLED' &&
    k.status !== 'SERVED' &&
    k.items.some((i) => ['NEW', 'PENDING', 'ACCEPTED', 'PREPARING'].includes(i.status))
  );

  // COOK READY TO SERVE: KOTs that have at least one item with status READY
  const cookReadyKots = sortedKots.filter((k) =>
    k.status !== 'CANCELLED' &&
    k.items.some((i) => i.status === 'READY')
  );

  // WAITER READY TO SERVE: All active KOTs sent to kitchen (containing items cooking or ready)
  const waiterReadyKots = sortedKots.filter((k) =>
    k.status !== 'CANCELLED' &&
    k.items.some((i) => ['NEW', 'PENDING', 'ACCEPTED', 'PREPARING', 'READY'].includes(i.status))
  );

  // WAITER SERVED: KOTs where all active items are SERVED
  const waiterServedKots = sortedKots.filter((k) =>
    k.status !== 'CANCELLED' &&
    k.items.some((i) => i.status === 'SERVED') &&
    k.items.every((i) => i.status === 'SERVED' || i.status === 'CANCELLED')
  );

  const effectiveRole: 'COOK' | 'WAITER' =
    kdsAccess.category === 'KITCHEN'
      ? 'COOK'
      : kdsAccess.category === 'FOH'
        ? 'WAITER'
        : activeRole;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1700px] mx-auto min-h-screen">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-border pb-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-none bg-primary/15 border-2 border-primary/40 flex items-center justify-center text-primary shadow-sm">
            {effectiveRole === 'COOK' ? (
              <ChefHat className="w-7 h-7 text-amber-500" />
            ) : (
              <Utensils className="w-7 h-7 text-emerald-500" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                Kitchen Display System
              </h1>
              <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-500/50 text-xs font-black flex items-center gap-1 rounded-none">
                <Wifi className="w-3 h-3 animate-pulse" /> LIVE
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground font-semibold">
              Simplified 2-Step Workflow &bull; Instant Item-Level Kitchen & Runner Sync
            </p>
          </div>
        </div>

        {/* Role Mode Switcher & Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Role Switcher */}
          <div className="flex items-center p-1 rounded-none bg-card dark:bg-zinc-900 border-2 border-border shadow-sm">
            {/* Cook / Kitchen tab */}
            {kdsAccess.canViewCook ? (
              <button
                type="button"
                onClick={() => kdsAccess.canToggle ? setActiveRole('COOK') : undefined}
                disabled={!kdsAccess.canToggle && effectiveRole !== 'COOK'}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-none text-xs sm:text-sm font-black transition-all border',
                  effectiveRole === 'COOK'
                    ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm'
                    : kdsAccess.canToggle
                      ? 'text-foreground hover:bg-muted border-transparent cursor-pointer'
                      : 'text-muted-foreground border-transparent cursor-default'
                )}
              >
                <ChefHat className="w-4 h-4" />
                <span>👨‍🍳 Cook / Kitchen</span>
              </button>
            ) : (
              <button
                type="button"
                disabled
                title="Your account does not have access to the Cook Station"
                className="flex items-center gap-2 px-4 py-2 rounded-none text-xs sm:text-sm font-black opacity-35 cursor-not-allowed text-muted-foreground"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Cook / Kitchen</span>
              </button>
            )}

            {/* Waiter / Runner tab */}
            {kdsAccess.canViewWaiter ? (
              <button
                type="button"
                onClick={() => kdsAccess.canToggle ? setActiveRole('WAITER') : undefined}
                disabled={!kdsAccess.canToggle && effectiveRole !== 'WAITER'}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-none text-xs sm:text-sm font-black transition-all border',
                  effectiveRole === 'WAITER'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                    : kdsAccess.canToggle
                      ? 'text-foreground hover:bg-muted border-transparent cursor-pointer'
                      : 'text-muted-foreground border-transparent cursor-default'
                )}
              >
                <Utensils className="w-4 h-4" />
                <span>🍽️ Waiter / Runner</span>
              </button>
            ) : (
              <button
                type="button"
                disabled
                title="Your account does not have access to the Waiter/Runner Station"
                className="flex items-center gap-2 px-4 py-2 rounded-none text-xs sm:text-sm font-black opacity-35 cursor-not-allowed text-muted-foreground"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Waiter / Runner</span>
              </button>
            )}
          </div>

          {/* Station filter */}
          {stations.length > 0 && (
            <div className="flex items-center gap-1.5 p-1 rounded-none bg-card dark:bg-zinc-900 border-2 border-border">
              <button
                type="button"
                onClick={() => setFilterStation(null)}
                className={cn(
                  'px-3 py-1.5 rounded-none text-xs font-black transition-all cursor-pointer border',
                  filterStation === null
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'text-foreground hover:bg-muted border-transparent'
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
                    'px-3 py-1.5 rounded-none text-xs font-black transition-all cursor-pointer border',
                    filterStation === s.id
                      ? 'text-white border-transparent shadow-sm'
                      : 'bg-muted text-foreground border-border hover:bg-muted/80'
                  )}
                  style={filterStation === s.id ? { backgroundColor: s.displayColor } : {}}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}

          {/* Audio Chime Button */}
          <button
            type="button"
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playNewOrderSound();
            }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-none text-xs font-black border-2 transition-all cursor-pointer',
              soundEnabled
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/50'
                : 'bg-muted text-foreground border-border'
            )}
            title="Toggle kitchen bell audio"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{soundEnabled ? 'Bell On 🔔' : 'Muted'}</span>
          </button>
        </div>
      </div>

      {/* ── 2-Column Side-by-Side KDS Layout ──────────────────────────────────── */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-3">
          <ChefHat className="w-10 h-10 animate-bounce text-primary" />
          <p className="font-semibold text-sm">Loading Kitchen Queue...</p>
        </div>
      ) : effectiveRole === 'COOK' ? (
        /* 👨‍🍳 COOK VIEW: SINGLE FULL-WIDTH COLUMN (ACTIVE COOKING KOTS) */
        <div className="space-y-4">
          {/* Header Banner */}
          <div className="flex items-center justify-between p-4 rounded-none bg-amber-500/10 dark:bg-amber-950/40 border-2 border-amber-500/60 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-none bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-sm font-bold">
                <Flame className="w-6 h-6 animate-pulse" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-black text-foreground truncate">
                  🔥 Active Cooking Queue
                </h2>
                <p className="text-xs font-semibold text-muted-foreground">
                  Horizontal Live KDS &bull; Tap &apos;Done&apos; on individual dishes or complete full ticket
                </p>
              </div>
            </div>
            <span className="px-3.5 py-1.5 rounded-none bg-amber-500 text-slate-950 text-xs sm:text-sm font-black shrink-0 shadow-sm border border-amber-600">
              {cookNewKots.length} Active Tickets
            </span>
          </div>

          {/* Cards List: Horizontal layout stacked vertically */}
          {cookNewKots.length === 0 ? (
            <div className="rounded-none border-2 border-dashed border-border p-12 text-center flex flex-col items-center justify-center text-muted-foreground min-h-[250px] bg-card dark:bg-zinc-900">
              <Sparkles className="w-12 h-12 text-amber-500/60 mb-3" />
              <h3 className="text-lg font-bold text-foreground">All Caught Up!</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                No active cooking items right now. New KOTs sent from tables or POS will appear here instantly.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {cookNewKots.map((kot) => (
                <CookKotCard
                  key={kot.id}
                  kot={kot}
                  targetItemStatus="NEW_OR_COOKING"
                  onCompleteItem={(itemId) =>
                    updateKotItemStatus.mutate({ kotId: kot.id, itemId, status: 'READY' })
                  }
                  onUndoItem={(itemId) =>
                    updateKotItemStatus.mutate({ kotId: kot.id, itemId, status: 'PREPARING' })
                  }
                  onCompleteKot={() =>
                    updateKotStatus.mutate({ kotId: kot.id, status: 'READY' })
                  }
                  onRequestCancelItem={(itemId, itemName) =>
                    setCancelModalItem({ kotId: kot.id, itemId, itemName })
                  }
                  onRequestCancelKot={() =>
                    setCancelModalKot({ kotId: kot.id, kotNumber: kot.kotNumber })
                  }
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* 🍽️ WAITER VIEW: SINGLE FULL-WIDTH COLUMN (READY TO SERVE ONLY) */
        <div className="space-y-4">
          {/* Column Header Banner */}
          <div className="flex items-center justify-between p-4 rounded-none bg-emerald-500/10 dark:bg-emerald-950/40 border-2 border-emerald-500/60 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-none bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Utensils className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-black text-foreground truncate">
                  🛎️ Ready to Serve Queue
                </h2>
                <p className="text-xs font-semibold text-muted-foreground">
                  Horizontal Live Queue &bull; Tap &apos;Serve&apos; when dishes arrive at table
                </p>
              </div>
            </div>
            <span className="px-3.5 py-1.5 rounded-none bg-emerald-600 text-white text-xs sm:text-sm font-black shrink-0 shadow-sm border border-emerald-700">
              {waiterReadyKots.length} Active Tickets
            </span>
          </div>

          {/* Cards List: Horizontal layout stacked vertically */}
          {waiterReadyKots.length === 0 ? (
            <div className="rounded-none border-2 border-dashed border-border p-12 text-center flex flex-col items-center justify-center text-muted-foreground min-h-[250px] bg-card dark:bg-zinc-900">
              <CheckCircle2 className="w-12 h-12 text-emerald-500/60 mb-3" />
              <h3 className="text-lg font-bold text-foreground">Pass Counter is Clear</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                When dishes are marked complete in the kitchen, they will appear here ready for runner pickup.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {waiterReadyKots.map((kot) => (
                <WaiterReadyKotCard
                  key={kot.id}
                  kot={kot}
                  onServeItem={(itemId) =>
                    updateKotItemStatus.mutate({ kotId: kot.id, itemId, status: 'SERVED' })
                  }
                  onServeKot={() =>
                    updateKotStatus.mutate({ kotId: kot.id, status: 'SERVED' })
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Cancel Item Confirmation Modal ───────────────────────────────────── */}
      {cancelModalItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card dark:bg-zinc-900 border-2 border-destructive rounded-none p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-destructive">
              <div className="w-10 h-10 rounded-none bg-destructive/15 border border-destructive/30 flex items-center justify-center">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-foreground">Cancel Item on KOT</h3>
                <p className="text-xs text-muted-foreground">Recalculates bill and removes from cooking</p>
              </div>
            </div>

            <p className="text-sm text-foreground font-semibold">
              Are you sure you want to cancel <strong className="text-destructive font-black">{cancelModalItem.itemName}</strong>?
            </p>

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase mb-1.5 block">
                Reason for cancellation (optional)
              </label>
              <Input
                placeholder="e.g. Out of stock / Customer requested change"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="bg-muted/50 rounded-none border-2 border-border"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                className="rounded-none font-bold border-2 border-border"
                onClick={() => {
                  setCancelModalItem(null);
                  setCancelReason('');
                }}
              >
                Back
              </Button>
              <Button
                variant="destructive"
                className="rounded-none font-black bg-rose-600 hover:bg-rose-700"
                onClick={() =>
                  cancelKotItem.mutate({
                    kotId: cancelModalItem.kotId,
                    itemId: cancelModalItem.itemId,
                    reason: cancelReason.trim() || undefined,
                  })
                }
              >
                Confirm Cancel Item
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel Entire Ticket Confirmation Modal ──────────────────────────── */}
      {cancelModalKot && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card dark:bg-zinc-900 border-2 border-destructive rounded-none p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-destructive">
              <div className="w-10 h-10 rounded-none bg-destructive/15 border border-destructive/30 flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-foreground">Cancel Entire Ticket #{cancelModalKot.kotNumber}</h3>
                <p className="text-xs text-muted-foreground">All items in this KOT will be cancelled</p>
              </div>
            </div>

            <p className="text-sm text-foreground font-semibold">
              This will cancel all active items under this KOT and update the active order.
            </p>

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase mb-1.5 block">
                Reason for cancellation (optional)
              </label>
              <Input
                placeholder="e.g. Customer cancelled entire round"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="bg-muted/50 rounded-none border-2 border-border"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                className="rounded-none font-bold border-2 border-border"
                onClick={() => {
                  setCancelModalKot(null);
                  setCancelReason('');
                }}
              >
                Back
              </Button>
              <Button
                variant="destructive"
                className="rounded-none font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md"
                onClick={() =>
                  cancelKot.mutate({
                    kotId: cancelModalKot.kotId,
                    reason: cancelReason.trim() || undefined,
                  })
                }
              >
                Confirm Cancel Ticket
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 1. COOK / CHEF NEW ORDERS CARD (Horizontal Layout) ───────────────────────
function CookKotCard({
  kot,
  onCompleteItem,
  onUndoItem,
  onCompleteKot,
  onRequestCancelItem,
  onRequestCancelKot,
}: {
  kot: Kot;
  targetItemStatus: string;
  onCompleteItem: (itemId: string) => void;
  onUndoItem?: (itemId: string) => void;
  onCompleteKot: () => void;
  onRequestCancelItem: (itemId: string, itemName: string) => void;
  onRequestCancelKot: () => void;
}) {
  const isOverdue = kot.ageMinutes > 15;
  const isWarning = kot.ageMinutes > 10;
  const tableName = kot.order.table?.name;

  // Active cooking items
  const activeItems = kot.items.filter((i) => i.status !== 'CANCELLED');
  const pendingItems = activeItems.filter((i) =>
    ['NEW', 'PENDING', 'ACCEPTED', 'PREPARING'].includes(i.status)
  );
  const readyItems = activeItems.filter((i) => i.status === 'READY' || i.status === 'SERVED');

  return (
    <div className="rounded-none border-2 border-amber-500/60 dark:border-amber-500/50 bg-card dark:bg-zinc-900 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
      {/* Top Ticket Header Bar */}
      <div className="px-5 py-3.5 bg-amber-500/10 dark:bg-amber-950/30 border-b-2 border-border/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-foreground">
            #{kot.kotNumber}
          </span>
          {tableName ? (
            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-black text-xs px-3 py-1 rounded-none shadow-xs border border-emerald-500">
              TABLE: {tableName}
            </Badge>
          ) : (
            <Badge className="bg-indigo-600 hover:bg-indigo-600 text-white font-black text-xs px-3 py-1 rounded-none shadow-xs border border-indigo-500">
              📦 TAKEAWAY
            </Badge>
          )}
          <span className="text-xs font-bold text-foreground font-mono">
            Order #{kot.order.orderNumber}
          </span>
          {readyItems.length > 0 && (
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 rounded-none">
              {readyItems.length}/{activeItems.length} Done
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-none text-xs font-bold tabular-nums font-mono border',
            isOverdue ? 'bg-red-600 text-white animate-pulse border-red-500' :
            isWarning ? 'bg-amber-500 text-slate-950 font-black border-amber-600' :
            'bg-muted text-foreground border-border'
          )}>
            <Clock className="w-3.5 h-3.5" />
            <span>{kot.ageMinutes}m elapsed</span>
          </div>

          <button
            type="button"
            onClick={onRequestCancelKot}
            title="Cancel Entire KOT Ticket"
            className="p-1.5 rounded-none text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer border border-transparent hover:border-rose-500/30"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Middle Dishes Section - Exactly 2 columns */}
      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {activeItems.map((item) => {
            const isItemCancelled = item.status === 'CANCELLED';
            const isItemReady = item.status === 'READY' || item.status === 'SERVED';
            const qty = item.orderItem?.quantity || 1;
            const isMultiQty = qty > 1;
            const baseName = item.orderItem?.menuItem?.name || 'Dish';
            const vName = item.orderItem?.variant?.name;
            const fullItemTitle = vName && !vName.toLowerCase().includes('regular')
              ? `${baseName} (${vName})`
              : baseName;

            return (
              <div
                key={item.id}
                className={cn(
                  'flex items-start justify-between gap-3 p-3.5 rounded-none border-2 transition-all',
                  isItemCancelled
                    ? 'opacity-40 border-border/40 bg-muted/20 line-through'
                    : isItemReady
                    ? 'bg-muted/40 dark:bg-zinc-950/60 border-border/80 opacity-80'
                    : 'bg-card dark:bg-zinc-950 border-border/80 dark:border-zinc-800 shadow-xs hover:border-amber-500/60'
                )}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {/* Quantity Box */}
                  <div className={cn(
                    'w-10 h-10 rounded-none flex items-center justify-center text-lg font-black font-mono shrink-0 shadow-xs border',
                    isItemCancelled
                      ? 'bg-muted text-muted-foreground border-border'
                      : isItemReady
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : isMultiQty
                      ? 'bg-amber-400 text-amber-950 border-amber-500 font-black'
                      : 'bg-primary text-primary-foreground border-primary'
                  )}>
                    {qty}
                  </div>

                  {/* Title & Notes */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className={cn(
                        'font-bold text-sm sm:text-base leading-snug break-words',
                        isItemCancelled ? 'text-muted-foreground line-through' : isItemReady ? 'text-muted-foreground' : 'text-foreground'
                      )}>
                        {fullItemTitle}
                      </p>
                      {!isItemCancelled && !isItemReady && (
                        <button
                          type="button"
                          onClick={() => onRequestCancelItem(item.id, fullItemTitle)}
                          title="Cancel this item"
                          className="text-muted-foreground/60 hover:text-rose-500 transition-colors shrink-0 p-0.5"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {item.orderItem?.modifiers && item.orderItem.modifiers.length > 0 && (
                      <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5 break-words">
                        + {item.orderItem.modifiers.map((m) => m.name).join(', ')}
                      </p>
                    )}

                    {/* Special Instruction */}
                    {item.orderItem?.notes && !isItemCancelled && (
                      <div className="mt-2 p-1.5 px-2.5 rounded-none bg-rose-500/15 border border-rose-500/40 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-start gap-1.5 break-words">
                        <span className="shrink-0">⚠️</span>
                        <span>Special Instruction: {item.orderItem.notes}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Item Action Button */}
                {!isItemCancelled && (
                  <div className="shrink-0 flex items-center gap-1.5 pt-0.5">
                    {isItemReady ? (
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-2 py-1 rounded-none">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Completed
                        </span>
                        {onUndoItem && (
                          <button
                            type="button"
                            onClick={() => onUndoItem(item.id)}
                            className="p-1.5 rounded-none bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all border border-border cursor-pointer"
                            title="Undo complete - return dish to cooking status"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onCompleteItem(item.id)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-none bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all shadow-xs active:scale-95 cursor-pointer border border-emerald-500"
                      >
                        <Check className="w-4 h-4" />
                        <span>Complete</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {kot.order.notes && (
          <div className="mt-3 p-2.5 rounded-none bg-amber-500/15 border border-amber-500/40 text-xs font-bold text-amber-800 dark:text-amber-300">
            📝 Order Note: {kot.order.notes}
          </div>
        )}
      </div>

      {/* Footer: Complete All Button */}
      {pendingItems.length > 0 && (
        <div className="px-5 py-3 bg-muted/30 border-t-2 border-border/80 flex items-center justify-end">
          <button
            type="button"
            onClick={onCompleteKot}
            className="px-5 py-2.5 rounded-none bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer border border-emerald-500"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>COMPLETE ALL ITEMS ({pendingItems.length})</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ── 2. WAITER / RUNNER READY TO SERVE CARD (Horizontal Layout) ────────────────
function WaiterReadyKotCard({
  kot,
  onServeItem,
  onServeKot,
}: {
  kot: Kot;
  onServeItem: (itemId: string) => void;
  onServeKot: () => void;
}) {
  const tableName = kot.order.table?.name;
  const activeItems = kot.items.filter((i) => i.status !== 'CANCELLED');
  const readyItems = activeItems.filter((i) => i.status === 'READY');
  const cookingItems = activeItems.filter((i) => ['NEW', 'PENDING', 'ACCEPTED', 'PREPARING'].includes(i.status));
  const hasReady = readyItems.length > 0;

  return (
    <div className={cn(
      'rounded-none border-2 bg-card dark:bg-zinc-900 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col',
      hasReady ? 'border-emerald-500/60 dark:border-emerald-500/50 shadow-emerald-500/5' : 'border-border/80 dark:border-zinc-800 opacity-90'
    )}>
      {/* Top Header Bar */}
      <div className={cn(
        'px-5 py-3.5 border-b-2 border-border/80 flex flex-wrap items-center justify-between gap-3',
        hasReady
          ? 'bg-emerald-500/10 dark:bg-emerald-950/30'
          : 'bg-muted/40'
      )}>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-foreground">
            #{kot.kotNumber}
          </span>
          {tableName ? (
            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-black text-xs px-3 py-1 rounded-none shadow-xs border border-emerald-500">
              TABLE: {tableName}
            </Badge>
          ) : (
            <Badge className="bg-indigo-600 hover:bg-indigo-600 text-white font-black text-xs px-3 py-1 rounded-none shadow-xs border border-indigo-500">
              📦 TAKEAWAY
            </Badge>
          )}
          <span className="text-xs font-bold text-foreground font-mono">
            Order #{kot.order.orderNumber}
          </span>
          <span className={cn(
            'text-xs font-black px-2.5 py-0.5 rounded-none border',
            hasReady
              ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
              : 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40'
          )}>
            {hasReady ? `${readyItems.length} Ready for Pickup` : `${cookingItems.length} Cooking`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-muted text-foreground border border-border text-xs font-bold tabular-nums font-mono">
            <Clock className="w-3.5 h-3.5" />
            <span>{kot.ageMinutes}m elapsed</span>
          </div>
        </div>
      </div>

      {/* Middle Dishes Section - Exactly 2 columns */}
      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {activeItems.map((item) => {
            const isReady = item.status === 'READY';
            const isCooking = ['NEW', 'PENDING', 'ACCEPTED', 'PREPARING'].includes(item.status);
            const qty = item.orderItem?.quantity || 1;
            const isMultiQty = qty > 1;
            const baseName = item.orderItem?.menuItem?.name || 'Dish';
            const vName = item.orderItem?.variant?.name;
            const fullItemTitle = vName && !vName.toLowerCase().includes('regular')
              ? `${baseName} (${vName})`
              : baseName;

            return (
              <div
                key={item.id}
                className={cn(
                  'flex items-start justify-between gap-3 p-3.5 rounded-none border-2 transition-all',
                  isReady
                    ? 'bg-emerald-500/10 dark:bg-emerald-950/40 border-emerald-500/40 shadow-xs'
                    : isCooking
                    ? 'bg-muted/40 dark:bg-zinc-950/60 border-border/80 opacity-80'
                    : 'bg-muted/20 border-border/40 opacity-75'
                )}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {/* Quantity Box */}
                  <div className={cn(
                    'w-10 h-10 rounded-none flex items-center justify-center text-lg font-black font-mono shrink-0 shadow-xs border',
                    isReady
                      ? (isMultiQty ? 'bg-amber-400 text-amber-950 border-amber-500 font-black' : 'bg-emerald-600 text-white border-emerald-500')
                      : 'bg-muted text-foreground border-border'
                  )}>
                    {qty}
                  </div>

                  {/* Title & Details */}
                  <div className="min-w-0 flex-1">
                    <p className={cn(
                      'font-bold text-sm sm:text-base leading-snug break-words',
                      isReady ? 'text-foreground' : 'text-muted-foreground'
                    )}>
                      {fullItemTitle}
                    </p>

                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {isReady ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Ready to Serve
                        </span>
                      ) : isCooking ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                          <Flame className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> In Kitchen
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                          ✅ Served
                        </span>
                      )}

                      {item.orderItem?.modifiers && item.orderItem.modifiers.length > 0 && (
                        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                          + {item.orderItem.modifiers.map((m) => m.name).join(', ')}
                        </span>
                      )}
                    </div>

                    {item.orderItem?.notes && (
                      <div className="mt-2 p-1.5 px-2.5 rounded-none bg-rose-500/15 border border-rose-500/40 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-start gap-1.5 break-words">
                        <span className="shrink-0">⚠️</span>
                        <span>Special Instruction: {item.orderItem.notes}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Serve Button */}
                {isReady && (
                  <button
                    type="button"
                    onClick={() => onServeItem(item.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all shadow-xs active:scale-95 cursor-pointer shrink-0 ml-1 border border-emerald-500"
                  >
                    <Utensils className="w-3.5 h-3.5" />
                    <span>Serve</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Action */}
      {readyItems.length > 0 && (
        <div className="px-5 py-3 bg-muted/30 border-t-2 border-border/80 flex items-center justify-end">
          <button
            type="button"
            onClick={onServeKot}
            className="px-5 py-2.5 rounded-none bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer border border-emerald-500"
          >
            <Utensils className="w-4 h-4" />
            <span>SERVE ALL READY ({readyItems.length})</span>
          </button>
        </div>
      )}
    </div>
  );
}


