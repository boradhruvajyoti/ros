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
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
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
              <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-black flex items-center gap-1">
                <Wifi className="w-3 h-3 animate-pulse" /> LIVE
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              Simplified 2-Step Workflow &bull; Instant Item-Level Kitchen & Runner Sync
            </p>
          </div>
        </div>

        {/* Role Mode Switcher & Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Role Switcher — shows both tabs; dims/locks inaccessible tabs */}
          <div className="flex items-center p-1 rounded-2xl bg-card border border-border shadow-sm">
            {/* Cook / Kitchen tab */}
            {kdsAccess.canViewCook ? (
              <button
                type="button"
                onClick={() => kdsAccess.canToggle ? setActiveRole('COOK') : undefined}
                disabled={!kdsAccess.canToggle && effectiveRole !== 'COOK'}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all',
                  effectiveRole === 'COOK'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : kdsAccess.canToggle
                      ? 'text-muted-foreground hover:text-foreground cursor-pointer'
                      : 'text-muted-foreground cursor-default'
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
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black opacity-35 cursor-not-allowed text-muted-foreground"
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
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all',
                  effectiveRole === 'WAITER'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : kdsAccess.canToggle
                      ? 'text-muted-foreground hover:text-foreground cursor-pointer'
                      : 'text-muted-foreground cursor-default'
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
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black opacity-35 cursor-not-allowed text-muted-foreground"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Waiter / Runner</span>
              </button>
            )}
          </div>

          {/* Station filter */}
          {stations.length > 0 && (
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-card border border-border">
              <button
                type="button"
                onClick={() => setFilterStation(null)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer',
                  filterStation === null
                    ? 'bg-primary text-primary-foreground shadow-sm'
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
                    'px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer',
                    filterStation === s.id
                      ? 'text-white shadow-sm'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
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
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer',
              soundEnabled
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                : 'bg-muted text-muted-foreground border-border'
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
        /* 👨‍🍳 COOK VIEW: 2 COLUMNS (NEW ORDERS + COMPLETE & READY TO SERVE) */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Column 1: 🔥 New Orders (Cooking) */}
          <div className="space-y-4 rounded-3xl bg-card/60 border border-amber-500/30 p-4 sm:p-5 shadow-sm">
            {/* Column Header */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-transparent border border-amber-500/40">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-sm">
                  <Flame className="w-5 h-5 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-black text-foreground truncate">
                    🔥 New Orders (Cooking)
                  </h2>
                  <p className="text-[11px] font-semibold text-muted-foreground truncate">
                    Active cooking queue &bull; Mark dishes complete
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-xl bg-amber-500 text-slate-950 text-xs font-black shrink-0 shadow-sm">
                {cookNewKots.length} Active
              </span>
            </div>

            {/* Cards List */}
            {cookNewKots.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-border/80 p-8 text-center flex flex-col items-center justify-center text-muted-foreground min-h-[220px]">
                <Sparkles className="w-10 h-10 text-amber-500/40 mb-2" />
                <h3 className="text-base font-bold text-foreground">All Caught Up!</h3>
                <p className="text-xs text-muted-foreground max-w-xs mt-0.5">
                  No active cooking items right now. New KOTs sent from tables or POS will appear here instantly.
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[calc(100vh-230px)] overflow-y-auto pr-1">
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

          {/* Column 2: 🛎️ Complete & Ready to Serve (Pass Counter) */}
          <div className="space-y-4 rounded-3xl bg-card/60 border border-emerald-500/30 p-4 sm:p-5 shadow-sm">
            {/* Column Header */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-transparent border border-emerald-500/40">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-black text-foreground truncate">
                    🛎️ Complete &amp; Ready to Serve
                  </h2>
                  <p className="text-[11px] font-semibold text-muted-foreground truncate">
                    At pass counter &bull; Ready for waiter pickup
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-xl bg-emerald-600 text-white text-xs font-black shrink-0 shadow-sm">
                {cookReadyKots.length} Ready
              </span>
            </div>

            {/* Cards List */}
            {cookReadyKots.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-border/80 p-8 text-center flex flex-col items-center justify-center text-muted-foreground min-h-[220px]">
                <CheckCircle2 className="w-10 h-10 text-emerald-500/40 mb-2" />
                <h3 className="text-base font-bold text-foreground">Pass Counter is Clear</h3>
                <p className="text-xs text-muted-foreground max-w-xs mt-0.5">
                  Dishes marked Complete by chefs will sit here until picked up and served by waiters.
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[calc(100vh-230px)] overflow-y-auto pr-1">
                {cookReadyKots.map((kot) => (
                  <CookReadyKotCard
                    key={kot.id}
                    kot={kot}
                    onUndoItem={(itemId) =>
                      updateKotItemStatus.mutate({ kotId: kot.id, itemId, status: 'PREPARING' })
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* 🍽️ WAITER VIEW: 2 COLUMNS (READY TO SERVE + SERVED HISTORY) */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Column 1: 🛎️ Ready to Serve (All Active KOTs) */}
          <div className="space-y-4 rounded-3xl bg-card/60 border border-emerald-500/30 p-4 sm:p-5 shadow-sm">
            {/* Column Header */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-transparent border border-emerald-500/40">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Utensils className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-black text-foreground truncate">
                    🛎️ Ready to Serve (Active KOTs)
                  </h2>
                  <p className="text-[11px] font-semibold text-muted-foreground truncate">
                    Live table queue &bull; Tap &apos;Serve&apos; when dishes arrive at table
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-xl bg-emerald-600 text-white text-xs font-black shrink-0 shadow-sm">
                {waiterReadyKots.length} Active
              </span>
            </div>

            {/* Cards List */}
            {waiterReadyKots.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-border/80 p-8 text-center flex flex-col items-center justify-center text-muted-foreground min-h-[220px]">
                <CheckCircle2 className="w-10 h-10 text-emerald-500/40 mb-2" />
                <h3 className="text-base font-bold text-foreground">No Active Orders</h3>
                <p className="text-xs text-muted-foreground max-w-xs mt-0.5">
                  When new orders are sent to kitchen, they appear here live. Ready items become clickable for runners.
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[calc(100vh-230px)] overflow-y-auto pr-1">
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

          {/* Column 2: ✅ Served Orders History */}
          <div className="space-y-4 rounded-3xl bg-card/60 border border-blue-500/30 p-4 sm:p-5 shadow-sm">
            {/* Column Header */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-blue-500/20 via-indigo-500/15 to-transparent border border-blue-500/40">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Check className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-black text-foreground truncate">
                    ✅ Served Orders History
                  </h2>
                  <p className="text-[11px] font-semibold text-muted-foreground truncate">
                    Completed round deliveries &bull; Ready for customer billing
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-xl bg-blue-600 text-white text-xs font-black shrink-0 shadow-sm">
                {waiterServedKots.length} Served
              </span>
            </div>

            {/* Cards List */}
            {waiterServedKots.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-border/80 p-8 text-center flex flex-col items-center justify-center text-muted-foreground min-h-[220px]">
                <Utensils className="w-10 h-10 text-blue-500/40 mb-2" />
                <h3 className="text-base font-bold text-foreground">No Served Orders Yet</h3>
                <p className="text-xs text-muted-foreground max-w-xs mt-0.5">
                  Delivered orders will appear here for verification and billing.
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[calc(100vh-230px)] overflow-y-auto pr-1">
                {waiterServedKots.map((kot) => (
                  <WaiterServedKotCard key={kot.id} kot={kot} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Cancel Item Confirmation Modal ───────────────────────────────────── */}
      {cancelModalItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border-2 border-destructive/50 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-destructive">
              <div className="w-10 h-10 rounded-xl bg-destructive/15 flex items-center justify-center">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-foreground">Cancel Item on KOT</h3>
                <p className="text-xs text-muted-foreground">Recalculates bill and removes from cooking</p>
              </div>
            </div>

            <p className="text-sm text-foreground">
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
                className="bg-muted/50 rounded-xl"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                className="rounded-xl font-bold"
                onClick={() => {
                  setCancelModalItem(null);
                  setCancelReason('');
                }}
              >
                Back
              </Button>
              <Button
                variant="destructive"
                className="rounded-xl font-black bg-rose-600 hover:bg-rose-700"
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
          <div className="bg-card border-2 border-destructive/50 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-destructive">
              <div className="w-10 h-10 rounded-xl bg-destructive/15 flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-foreground">Cancel Entire Ticket #{cancelModalKot.kotNumber}</h3>
                <p className="text-xs text-muted-foreground">All items in this KOT will be cancelled</p>
              </div>
            </div>

            <p className="text-sm text-foreground">
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
                className="bg-muted/50 rounded-xl"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                className="rounded-xl font-bold"
                onClick={() => {
                  setCancelModalKot(null);
                  setCancelReason('');
                }}
              >
                Back
              </Button>
              <Button
                variant="destructive"
                className="rounded-xl font-black bg-rose-600 hover:bg-rose-700"
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

// ── 1. COOK / CHEF NEW ORDERS CARD ───────────────────────────────────────────
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
  const isTakeaway = !tableName || kot.order.type === 'TAKEAWAY' || kot.order.type === 'DELIVERY';

  // Active cooking items
  const activeItems = kot.items.filter((i) => i.status !== 'CANCELLED');
  const pendingItems = activeItems.filter((i) =>
    ['NEW', 'PENDING', 'ACCEPTED', 'PREPARING'].includes(i.status)
  );
  const readyItems = activeItems.filter((i) => i.status === 'READY' || i.status === 'SERVED');

  return (
    <div className="flex flex-col justify-between rounded-3xl border-2 border-amber-500/50 bg-card shadow-lg shadow-amber-500/5 overflow-hidden">
      {/* Ticket Header */}
      <div className="p-4 border-b border-border bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-3xl font-black font-mono tracking-tight text-foreground">
              #{kot.kotNumber}
            </span>
            {/* Prominent Table Tag */}
            {tableName ? (
              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-black text-sm px-3 py-1 rounded-xl shadow-sm tracking-wide">
                TABLE: {tableName}
              </Badge>
            ) : (
              <Badge className="bg-indigo-600 hover:bg-indigo-600 text-white font-black text-sm px-3 py-1 rounded-xl shadow-sm tracking-wide">
                📦 TAKEAWAY
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-muted-foreground">
              Order #{kot.order.orderNumber}
            </p>
            {readyItems.length > 0 && (
              <>
                <span className="text-xs font-semibold text-muted-foreground">&bull;</span>
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-md">
                  {readyItems.length}/{activeItems.length} Completed
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold tabular-nums font-mono shadow-sm',
            isOverdue ? 'bg-red-600 text-white animate-pulse' :
            isWarning ? 'bg-amber-500 text-slate-950' :
            'bg-muted text-foreground'
          )}>
            <Clock className="w-4 h-4" />
            <span>{kot.ageMinutes}m</span>
          </div>

          <button
            type="button"
            onClick={onRequestCancelKot}
            title="Cancel Entire KOT Ticket"
            className="p-2 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Dishes List with Item-Level Complete, Cancel & Undo */}
      <div className="p-4 sm:p-5 flex-1 space-y-3.5">
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
                'flex items-start gap-3 p-3 rounded-2xl border transition-all',
                isItemCancelled
                  ? 'opacity-40 border-border/40 bg-muted/20 line-through'
                  : isItemReady
                  ? 'bg-muted/40 border-border/50 opacity-60'
                  : 'bg-card border-border/80 shadow-sm'
              )}
            >
              {/* Quantity Box */}
              <div className={cn(
                'w-11 h-11 rounded-xl flex items-center justify-center text-xl font-black font-mono shrink-0 shadow-sm',
                isItemCancelled
                  ? 'bg-muted text-muted-foreground'
                  : isItemReady
                  ? 'bg-emerald-600/70 text-white'
                  : isMultiQty
                  ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-400/40'
                  : 'bg-primary text-primary-foreground'
              )}>
                {qty}
              </div>

              {/* Title & Notes */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1">
                  <p className={cn(
                    'font-black text-base sm:text-lg leading-tight tracking-tight truncate',
                    isItemCancelled ? 'text-muted-foreground line-through' : isItemReady ? 'text-muted-foreground line-clamp-1' : 'text-foreground'
                  )}>
                    {fullItemTitle}
                  </p>

                  {/* Cancel button */}
                  {!isItemCancelled && !isItemReady && (
                    <button
                      type="button"
                      onClick={() => onRequestCancelItem(item.id, fullItemTitle)}
                      title="Cancel this item"
                      className="p-1 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {item.orderItem?.modifiers && item.orderItem.modifiers.length > 0 && (
                  <p className="text-xs font-semibold text-indigo-400 mt-0.5 truncate">
                    + {item.orderItem.modifiers.map((m) => m.name).join(', ')}
                  </p>
                )}

                {item.orderItem?.notes && !isItemCancelled && (
                  <div className="mt-1.5 p-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-xs font-bold text-rose-400">
                    ⚠️ {item.orderItem.notes}
                  </div>
                )}

                {/* Item Action Button */}
                {!isItemCancelled && (
                  <div className="mt-2 flex items-center justify-between gap-2">
                    {isItemReady ? (
                      <div className="flex items-center justify-between w-full">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-lg">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Done (Ready at Pass)
                        </span>
                        {onUndoItem && (
                          <button
                            type="button"
                            onClick={() => onUndoItem(item.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-bold text-xs transition-all border border-border shadow-sm active:scale-95 cursor-pointer ml-auto"
                            title="Undo complete - return dish to cooking status"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                            <span>Undo</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onCompleteItem(item.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all shadow-sm active:scale-95 cursor-pointer ml-auto"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Complete</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {kot.order.notes && (
          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs font-bold text-amber-300">
            📝 Order Note: {kot.order.notes}
          </div>
        )}
      </div>

      {/* Giant Bottom Button: Complete All / Whole KOT */}
      {pendingItems.length > 0 && (
        <div className="p-3 border-t border-border bg-muted/30">
          <button
            type="button"
            onClick={onCompleteKot}
            className="w-full h-13 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all active:scale-95 cursor-pointer"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>COMPLETE ALL ITEMS ({pendingItems.length})</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ── 2. COOK / CHEF READY TO SERVE CARD ───────────────────────────────────────
function CookReadyKotCard({
  kot,
  onUndoItem,
}: {
  kot: Kot;
  onUndoItem: (itemId: string) => void;
}) {
  const tableName = kot.order.table?.name;
  const readyItems = kot.items.filter((i) => i.status === 'READY');

  return (
    <div className="flex flex-col justify-between rounded-3xl border-2 border-emerald-500/50 bg-card shadow-lg shadow-emerald-500/5 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-emerald-500/15 flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-3xl font-black font-mono tracking-tight text-foreground">
              #{kot.kotNumber}
            </span>
            {tableName ? (
              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-black text-sm px-3 py-1 rounded-xl shadow-sm tracking-wide">
                TABLE: {tableName}
              </Badge>
            ) : (
              <Badge className="bg-indigo-600 hover:bg-indigo-600 text-white font-black text-sm px-3 py-1 rounded-xl shadow-sm tracking-wide">
                📦 TAKEAWAY
              </Badge>
            )}
          </div>
          <p className="text-xs font-semibold text-muted-foreground">
            Order #{kot.order.orderNumber}
          </p>
        </div>

        <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-black text-xs px-2.5 py-1 rounded-lg">
          At Pass Counter
        </Badge>
      </div>

      {/* Ready Items */}
      <div className="p-4 sm:p-5 flex-1 space-y-3">
        {readyItems.map((item) => {
          const qty = item.orderItem?.quantity || 1;
          const baseName = item.orderItem?.menuItem?.name || 'Dish';
          const vName = item.orderItem?.variant?.name;
          const fullItemTitle = vName && !vName.toLowerCase().includes('regular')
            ? `${baseName} (${vName})`
            : baseName;

          return (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-lg font-black font-mono shrink-0">
                  {qty}
                </div>
                <div className="min-w-0">
                  <p className="font-black text-base leading-tight truncate text-foreground">
                    {fullItemTitle}
                  </p>
                  <p className="text-xs text-emerald-400 font-bold">Ready for waiter pickup</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onUndoItem(item.id)}
                title="Undo back to cooking"
                className="p-2 rounded-xl text-muted-foreground hover:text-amber-400 hover:bg-amber-400/10 transition-colors shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 3. WAITER / RUNNER READY TO SERVE CARD ───────────────────────────────────
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
  const isAllCompleted = cookingItems.length === 0 && readyItems.length > 0;

  return (
    <div className={cn(
      'flex flex-col justify-between rounded-3xl border-2 bg-card shadow-xl transition-all overflow-hidden',
      hasReady
        ? 'border-emerald-500/60 shadow-emerald-500/10'
        : 'border-border/80 shadow-black/5 opacity-90'
    )}>
      {/* Header with High-Contrast Table Tag */}
      <div className={cn(
        'p-4 border-b border-border flex items-center justify-between text-white',
        hasReady
          ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700'
          : 'bg-gradient-to-r from-slate-800 via-zinc-800 to-slate-900'
      )}>
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="text-3xl font-black font-mono tracking-tight text-white">
              #{kot.kotNumber}
            </span>
            {tableName ? (
              <Badge className="bg-white text-slate-950 font-black text-base px-3.5 py-1 rounded-xl shadow-md tracking-wider">
                TABLE: {tableName}
              </Badge>
            ) : (
              <Badge className="bg-amber-400 text-slate-950 font-black text-sm px-3 py-1 rounded-xl shadow-md tracking-wide">
                📦 TAKEAWAY
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-white/80">
              Order #{kot.order.orderNumber}
            </p>
            <span className="text-xs font-semibold text-white/60">&bull;</span>
            <span className={cn(
              'text-[11px] font-black px-2 py-0.5 rounded-md',
              hasReady ? 'bg-emerald-400 text-emerald-950' : 'bg-amber-400/20 text-amber-300'
            )}>
              {hasReady ? `${readyItems.length} Ready for Pickup` : `${cookingItems.length} Cooking`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 text-white text-xs font-black">
          <Clock className="w-3.5 h-3.5" />
          <span>{kot.ageMinutes}m</span>
        </div>
      </div>

      {/* Complete Items List: Cooking items dimmed/disabled, Ready items highlighted with Serve button */}
      <div className="p-4 sm:p-5 flex-1 space-y-3.5">
        {activeItems.map((item) => {
          const isReady = item.status === 'READY';
          const isServed = item.status === 'SERVED';
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
                'flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all',
                isReady
                  ? 'bg-emerald-500/15 border-emerald-500/40 shadow-sm'
                  : isCooking
                  ? 'bg-muted/40 border-border/50 opacity-60'
                  : 'bg-muted/20 border-border/30 opacity-75'
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn(
                  'w-11 h-11 rounded-xl flex items-center justify-center text-xl font-black font-mono shrink-0 shadow-sm',
                  isReady
                    ? (isMultiQty ? 'bg-amber-400 text-amber-950' : 'bg-emerald-600 text-white')
                    : 'bg-muted text-muted-foreground'
                )}>
                  {qty}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn(
                      'font-black text-base sm:text-lg leading-tight truncate',
                      isReady ? 'text-foreground' : 'text-muted-foreground'
                    )}>
                      {fullItemTitle}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {isReady ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3 h-3" /> Ready to Serve
                      </span>
                    ) : isCooking ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400/90 bg-amber-500/15 px-2 py-0.5 rounded-md">
                        <Flame className="w-3 h-3 text-amber-500 animate-pulse" /> In Kitchen (Cooking)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 bg-blue-500/15 px-2 py-0.5 rounded-md">
                        ✅ Served
                      </span>
                    )}

                    {item.orderItem?.modifiers && item.orderItem.modifiers.length > 0 && (
                      <p className="text-xs font-semibold text-indigo-400">
                        + {item.orderItem.modifiers.map((m) => m.name).join(', ')}
                      </p>
                    )}
                  </div>

                  {item.orderItem?.notes && (
                    <p className="text-xs font-bold text-rose-400 mt-1">
                      ⚠️ {item.orderItem.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Action: Serve button if ready, disabled badge if cooking, served badge if served */}
              {isReady ? (
                <button
                  type="button"
                  onClick={() => onServeItem(item.id)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all shadow-md hover:shadow-emerald-600/30 active:scale-95 cursor-pointer shrink-0"
                >
                  <Utensils className="w-4 h-4" />
                  <span>Serve</span>
                </button>
              ) : isCooking ? (
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/80 text-muted-foreground font-bold text-xs opacity-60 cursor-not-allowed shrink-0 select-none border border-border/40"
                  title="Dish is still being prepared by kitchen staff"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Cooking</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-400 font-bold text-xs shrink-0 select-none">
                  <span>Served</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Whole KOT Footer Action */}
      <div className="p-3 border-t border-border bg-muted/30">
        {isAllCompleted ? (
          <button
            type="button"
            onClick={onServeKot}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer"
          >
            <Utensils className="w-5 h-5" />
            <span>MARK ALL READY DISHES SERVED ({readyItems.length})</span>
          </button>
        ) : hasReady ? (
          <div
            className="w-full h-14 rounded-2xl bg-muted/60 border border-border text-muted-foreground font-bold text-xs sm:text-sm flex items-center justify-center gap-2 px-3 opacity-75 select-none"
            title="Mark all dishes served is enabled only when all items in the KOT are marked completed by the kitchen. You can serve individual ready dishes above."
          >
            <Lock className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="truncate">MARK ALL READY DISHES SERVED ({cookingItems.length} dish{cookingItems.length > 1 ? 'es' : ''} still cooking)</span>
          </div>
        ) : (
          <div className="w-full h-12 rounded-2xl bg-muted/60 text-muted-foreground font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-border/50 select-none">
            <Clock className="w-4 h-4 text-amber-500/80" />
            <span>Awaiting Kitchen ({cookingItems.length} Dishes Cooking)</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 4. WAITER / RUNNER SERVED HISTORY CARD ───────────────────────────────────
function WaiterServedKotCard({ kot }: { kot: Kot }) {
  const tableName = kot.order.table?.name;
  const servedItems = kot.items.filter((i) => i.status === 'SERVED');

  return (
    <div className="flex flex-col justify-between rounded-3xl border border-border bg-card/60 shadow-sm opacity-80 hover:opacity-100 transition-all overflow-hidden">
      <div className="p-3.5 border-b border-border bg-muted/40 flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black font-mono text-muted-foreground">
              #{kot.kotNumber}
            </span>
            {tableName ? (
              <Badge variant="outline" className="font-black text-xs">
                TABLE: {tableName}
              </Badge>
            ) : (
              <Badge variant="outline" className="font-black text-xs">
                TAKEAWAY
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Order #{kot.order.orderNumber}</p>
        </div>

        <span className="text-xs font-black text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg">
          ✅ Served
        </span>
      </div>

      <div className="p-3.5 flex-1 space-y-2">
        {servedItems.map((item) => {
          const qty = item.orderItem?.quantity || 1;
          const baseName = item.orderItem?.menuItem?.name || 'Dish';
          const vName = item.orderItem?.variant?.name;
          const title = vName && !vName.toLowerCase().includes('regular')
            ? `${baseName} (${vName})`
            : baseName;

          return (
            <div key={item.id} className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <span className="w-6 h-6 rounded-lg bg-muted text-foreground flex items-center justify-center font-mono font-bold">
                {qty}
              </span>
              <span className="truncate">{title}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
