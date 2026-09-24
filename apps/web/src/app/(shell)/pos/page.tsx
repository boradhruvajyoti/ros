'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, Minus, Trash2, TableIcon,
  ShoppingCart, Receipt, Banknote, Utensils, QrCode, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { apiGet, apiPost, apiPut } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

function getClientId(): string {
  if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.randomUUID === 'function') {
    try {
      return window.crypto.randomUUID();
    } catch {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface Variant {
  id: string;
  name: string;
  price: number | string;
}

interface MenuItem {
  id: string;
  name: string;
  foodType?: 'VEG' | 'NON_VEG' | 'EGG' | 'VEGAN' | string;
  imageUrl?: string;
  variants?: Variant[];
  modifierGroups?: any[];
}

interface Category {
  id: string;
  name: string;
  icon?: string;
  items?: MenuItem[];
}

interface CartItem {
  key: string;
  menuItemId: string;
  variantId: string;
  name: string;
  variantName: string;
  unitPrice: number;
  quantity: number;
  foodType?: string;
  notes?: string;
  modifiers: { id: string; name: string; price: number }[];
  isLocked?: boolean;
  minQuantity?: number;
}

const CATEGORY_ICONS: Record<string, string> = {
  'Starters & Kebabs': '🔥',
  'Main Course & Curries': '🍛',
  'Breads & Rice': '🫓',
  'Beverages & Mocktails': '🥤',
  'Desserts & Sweets': '🍰',
  'Quick Bites': '🍟',
  'Biryani & Rice': '🍚',
  'Chinese & Noodles': '🍜',
};

type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';

export default function POSPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const tableParam = searchParams.get('table');

  // ── State ────────────────────────────────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [foodTypeFilter, setFoodTypeFilter] = useState<'ALL' | 'VEG' | 'NON_VEG'>('ALL');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('DINE_IN');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedTableName, setSelectedTableName] = useState<string | null>(null);
  const [runningOrder, setRunningOrder] = useState<any | null>(null);
  const [notes, setNotes] = useState('');
  const [showFastPayModal, setShowFastPayModal] = useState(false);
  const [cashTendered, setCashTendered] = useState<number | null>(null);

  // ── Data ─────────────────────────────────────────────────────────────────
  const { data: rawCategories, isLoading } = useQuery<Category[]>({
    queryKey: ['pos-menu'],
    queryFn: async () => {
      try {
        const res = await apiGet<Category[]>('/menu/pos-menu');
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    staleTime: 60 * 1000,
  });

  const { data: rawTables = [] } = useQuery({
    queryKey: ['tables'],
    queryFn: async () => {
      try {
        const res = await apiGet<any[]>('/tables');
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    refetchInterval: 10000,
  });

  const { data: activeOrders = [] } = useQuery<any[]>({
    queryKey: ['active-orders'],
    queryFn: async () => {
      try {
        const res = await apiGet<any[]>('/orders/active');
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    refetchInterval: 8000,
  });

  const { data: tenant } = useQuery({
    queryKey: ['current-tenant'],
    queryFn: () => apiGet<any>('/tenants/current'),
  });

  const categories = useMemo(() => {
    return Array.isArray(rawCategories) ? rawCategories : [];
  }, [rawCategories]);

  const tables = useMemo(() => {
    return Array.isArray(rawTables) ? rawTables : [];
  }, [rawTables]);

  const activeOrdersByTable = useMemo(() => {
    const map = new Map<string, any>();
    activeOrders.forEach((o) => {
      if (o.tableId && !['COMPLETED', 'VOIDED', 'CANCELLED'].includes(o.status)) {
        map.set(o.tableId, o);
      }
    });
    return map;
  }, [activeOrders]);

  const taxRate = useMemo(() => {
    try {
      const parsed = typeof tenant?.settings === 'string' ? JSON.parse(tenant.settings) : (tenant?.settings || {});
      return parsed?.taxRate !== undefined ? Number(parsed.taxRate) : 0;
    } catch {
      return 0;
    }
  }, [tenant]);

  // ── Table Selection & Running Order Loader ────────────────────────────────
  const handleSelectTable = useCallback((tableId: string | null, tableName: string | null) => {
    if (!tableId) {
      setSelectedTable(null);
      setSelectedTableName(null);
      setRunningOrder(null);
      setCart([]);
      return;
    }

    setSelectedTable(tableId);
    setSelectedTableName(tableName);

    // Check if table has a running active order
    const existingOrder = activeOrdersByTable.get(tableId);
    if (existingOrder) {
      setRunningOrder(existingOrder);
      // Populate cart with existing items from running order
      const existingCartItems: CartItem[] = (existingOrder.items || []).map((item: any) => {
        const vId = item.variantId || `v-${item.menuItemId}`;
        const isDispatched = !['DRAFT', 'CONFIRMED'].includes(existingOrder.status) && (item.status !== 'PENDING' || (item.kotItems && item.kotItems.length > 0));
        return {
          key: `${item.menuItemId}-${vId}`,
          menuItemId: item.menuItemId,
          variantId: vId,
          name: item.menuItem?.name || item.name || 'Dish',
          variantName: item.variant?.name || 'Standard',
          unitPrice: Number(item.unitPrice) || 0,
          quantity: item.quantity,
          foodType: item.menuItem?.foodType,
          notes: item.notes || undefined,
          modifiers: (item.modifiers || []).map((m: any) => ({
            id: m.modifierId || m.id,
            name: m.name,
            price: Number(m.price) || 0,
          })),
          isLocked: isDispatched,
          minQuantity: isDispatched ? item.quantity : 0,
        };
      });

      // Group duplicates in existing order
      const mergedMap = new Map<string, CartItem>();
      existingCartItems.forEach((ci) => {
        if (mergedMap.has(ci.key)) {
          const prev = mergedMap.get(ci.key)!;
          prev.quantity += ci.quantity;
          prev.minQuantity = (prev.minQuantity || 0) + (ci.minQuantity || 0);
          if (ci.isLocked) prev.isLocked = true;
        } else {
          mergedMap.set(ci.key, { ...ci });
        }
      });

      setCart(Array.from(mergedMap.values()));
      setNotes(existingOrder.notes || '');
      toast.info(`Running Order #${existingOrder.orderNumber} Loaded`, `Modifying table ${tableName}. You can add new dishes or increase portions.`);
    } else {
      setRunningOrder(null);
      setCart([]);
      setNotes('');
    }
  }, [activeOrdersByTable]);

  // Handle auto-selection when URL parameter ?table=xxx is present
  useEffect(() => {
    if (tableParam && tables.length > 0 && selectedTable !== tableParam) {
      const targetTable = tables.find((t: any) => t.id === tableParam);
      if (targetTable) {
        handleSelectTable(targetTable.id, targetTable.name);
      }
    }
  }, [tableParam, tables, selectedTable, handleSelectTable]);

  // ── Filtered Items ────────────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    const all = categories.flatMap((c) => (Array.isArray(c?.items) ? c.items : []));
    let items = !search
      ? (selectedCategory ? categories.find((c) => c?.id === selectedCategory)?.items || [] : all)
      : all.filter((i) => i?.name?.toLowerCase().includes(search.toLowerCase()));

    if (foodTypeFilter !== 'ALL') {
      items = items.filter((i) => i.foodType === foodTypeFilter);
    }
    return items;
  }, [categories, selectedCategory, search, foodTypeFilter]);

  const subtotal = useMemo(() => {
    return cart.reduce((s, i) => s + (Number(i.unitPrice) * (i.quantity || 1)), 0);
  }, [cart]);

  const tax = useMemo(() => {
    if (taxRate <= 0) return 0;
    return Math.round((subtotal * (taxRate / 100)) * 100) / 100;
  }, [subtotal, taxRate]);

  const total = useMemo(() => subtotal + tax, [subtotal, tax]);
  const totalItemsCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  const hasNewOrIncreasedItems = useMemo(() => {
    if (!runningOrder) return cart.length > 0;
    return cart.some((c) => !c.isLocked || c.quantity > (c.minQuantity || 0));
  }, [cart, runningOrder]);

  // ── Audio Feedback Helper ────────────────────────────────────────────────
  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  };

  // ── Cart Actions ─────────────────────────────────────────────────────────
  const addToCart = useCallback((item: MenuItem) => {
    if (orderType === 'DINE_IN' && !selectedTable) {
      toast.error('Dining Table Required', 'Please select a seated table first before adding items to this Dine-In ticket.');
      return;
    }

    playChime();
    const variants = Array.isArray(item.variants) && item.variants.length > 0
      ? item.variants
      : [{ id: `v-${item.id}`, name: 'Standard', price: 299 }];

    const variant = variants[0];
    const unitPrice = Number(variant.price) || 0;
    const key = `${item.id}-${variant.id}`;

    setCart((prev) => {
      const existing = prev.find((c) => c.key === key);
      if (existing) {
        return prev.map((c) =>
          c.key === key ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, {
        key,
        menuItemId: item.id,
        variantId: variant.id,
        name: item.name,
        variantName: variant.name,
        unitPrice,
        quantity: 1,
        foodType: item.foodType,
        modifiers: [],
        isLocked: false,
        minQuantity: 0,
      }];
    });
  }, [orderType, selectedTable]);

  const updateQty = useCallback((key: string, delta: number) => {
    setCart((prev) => {
      const target = prev.find((c) => c.key === key);
      if (!target) return prev;

      if (delta < 0 && target.isLocked && target.quantity <= (target.minQuantity || 1)) {
        toast.warning('Dispatched Item Locked', 'Dishes already accepted in the kitchen cannot be reduced below the original quantity.');
        return prev;
      }

      return prev
        .map((c) => (c.key === key ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0);
    });
  }, []);

  const removeItem = useCallback((key: string) => {
    setCart((prev) => {
      const target = prev.find((c) => c.key === key);
      if (target?.isLocked) {
        toast.warning('Dispatched Item Locked', 'Dishes already sent to the kitchen cannot be removed from the running order.');
        return prev;
      }
      return prev.filter((c) => c.key !== key);
    });
  }, []);

  const handleClearCart = useCallback(() => {
    if (runningOrder) {
      setCart((prev) =>
        prev
          .filter((c) => c.isLocked)
          .map((c) => ({ ...c, quantity: c.minQuantity || c.quantity }))
      );
      toast.info('Cart Reset', 'Reset cart back to original kitchen-dispatched items.');
    } else {
      setCart([]);
    }
  }, [runningOrder]);

  // ── Order Mutation (Create or Supplemental KOT) ──────────────────────────
  const sendKotMutation = useMutation({
    mutationFn: async () => {
      if (runningOrder) {
        return apiPut(`/orders/${runningOrder.id}/items`, {
          items: cart.map((c) => ({
            menuItemId: c.menuItemId,
            variantId: c.variantId?.startsWith('v-') ? undefined : c.variantId,
            quantity: c.quantity,
            unitPrice: c.unitPrice,
            notes: c.notes || undefined,
            modifierIds: Array.isArray(c.modifiers) ? c.modifiers.map((m) => m.id) : [],
          })),
          sendToKitchen: true,
          notes: notes || undefined,
        });
      } else {
        return apiPost('/orders', {
          type: orderType,
          status: 'SENT_TO_KITCHEN',
          tableId: selectedTable || undefined,
          notes: notes || undefined,
          clientId: getClientId(),
          items: cart.map((c) => ({
            menuItemId: c.menuItemId,
            variantId: c.variantId?.startsWith('v-') ? undefined : c.variantId,
            quantity: c.quantity,
            unitPrice: c.unitPrice,
            notes: c.notes || undefined,
            modifierIds: Array.isArray(c.modifiers) ? c.modifiers.map((m) => m.id) : [],
          })),
        });
      }
    },
    onSuccess: (order: any) => {
      if (runningOrder) {
        toast.success('Supplemental KOT Sent! 🍳', `New dishes dispatched to kitchen for Table ${selectedTableName}`);
      } else {
        toast.success('Order Sent to Kitchen! 🔔', `Order #${order?.orderNumber || 'KOT'} placed successfully`);
      }
      setCart([]);
      setNotes('');
      setSelectedTable(null);
      setSelectedTableName(null);
      setRunningOrder(null);
      setShowFastPayModal(false);
      setCashTendered(null);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['active-orders'] });
      queryClient.invalidateQueries({ queryKey: ['kitchen-kots'] });
      queryClient.invalidateQueries({ queryKey: ['kitchen-queue'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error?.message || err?.message || 'Failed to dispatch to kitchen. Please try again.';
      toast.error('Kitchen Dispatch Failed', msg);
    },
  });

  const handlePlaceOrder = () => {
    if (orderType === 'DINE_IN' && !selectedTable) {
      toast.error('Dining Table Required', 'Please select a seated table before sending to kitchen.');
      return;
    }
    if (cart.length === 0) {
      toast.error('Cart is empty', 'Please select food items from the menu.');
      return;
    }
    if (runningOrder && !hasNewOrIncreasedItems) {
      toast.info('No New Items', 'All dishes on this table are already dispatched to the kitchen.');
      return;
    }
    sendKotMutation.mutate();
  };

  const handleFastPayment = async (method: 'CASH' | 'UPI' | 'CARD') => {
    if (orderType === 'DINE_IN' && !selectedTable) {
      toast.error('Dining Table Required', 'Please select a seated table before settling order.');
      return;
    }
    if (cart.length === 0) {
      toast.error('Cart is empty', 'Please select food items first.');
      return;
    }

    try {
      let orderId = runningOrder?.id;
      let orderNumber = runningOrder?.orderNumber;

      if (runningOrder) {
        if (hasNewOrIncreasedItems) {
          await apiPut(`/orders/${runningOrder.id}/items`, {
            items: cart.map((c) => ({
              menuItemId: c.menuItemId,
              variantId: c.variantId?.startsWith('v-') ? undefined : c.variantId,
              quantity: c.quantity,
              unitPrice: c.unitPrice,
              notes: c.notes || undefined,
              modifierIds: Array.isArray(c.modifiers) ? c.modifiers.map((m) => m.id) : [],
            })),
            sendToKitchen: false,
            notes: notes || undefined,
          });
        }
      } else {
        const order = await apiPost<any>('/orders', {
          type: orderType,
          status: 'SENT_TO_KITCHEN',
          tableId: selectedTable || undefined,
          notes: notes || undefined,
          clientId: getClientId(),
          items: cart.map((c) => ({
            menuItemId: c.menuItemId,
            variantId: c.variantId?.startsWith('v-') ? undefined : c.variantId,
            quantity: c.quantity,
            unitPrice: c.unitPrice,
            notes: c.notes || undefined,
            modifierIds: Array.isArray(c.modifiers) ? c.modifiers.map((m) => m.id) : [],
          })),
        });
        orderId = order.id;
        orderNumber = order.orderNumber;
      }

      // Add payment
      await apiPost(`/orders/${orderId}/payments`, {
        method,
        amount: total,
      });

      // Mark as BILLED & PAID
      try {
        await apiPost(`/orders/${orderId}/status`, {
          status: 'BILLED',
          reason: `Fast Touch POS Checkout (${method})`,
        });
        await apiPost(`/orders/${orderId}/status`, {
          status: 'PAID',
          reason: `Settled via ${method}`,
        });
      } catch {}

      toast.success('Order Settled & Paid! 💰', `Order #${orderNumber || ''} successfully paid via ${method}`);
      setCart([]);
      setNotes('');
      setSelectedTable(null);
      setSelectedTableName(null);
      setRunningOrder(null);
      setShowFastPayModal(false);
      setCashTendered(null);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['active-orders'] });
      queryClient.invalidateQueries({ queryKey: ['kitchen-kots'] });
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Payment processing failed. Please try again.';
      toast.error('Payment Settlement Failed', msg);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-0 -m-6 overflow-hidden select-none">
      {/* ─────────────────────────────────────────────────────────────────────────────
          LEFT PANEL: VISUAL TOUCH MENU & CATEGORIES
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 border-r border-border bg-background h-full">
        {/* Top Header: Order Mode & Search */}
        <div className="p-3.5 border-b border-border space-y-3 bg-card/60 backdrop-blur shrink-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* 3 Giant Touch Order Type Buttons */}
            <div className="flex items-center gap-1.5 p-1 bg-muted/80 rounded-2xl border border-border">
              {[
                { id: 'DINE_IN', label: '🍽️ Dine-In Table', color: 'bg-emerald-600 text-white' },
                { id: 'TAKEAWAY', label: '🛍️ Takeaway / Parcel', color: 'bg-indigo-600 text-white' },
                { id: 'DELIVERY', label: '🛵 Delivery', color: 'bg-purple-600 text-white' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setOrderType(t.id as any)}
                  className={cn(
                    'px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm',
                    orderType === t.id
                      ? `${t.color} scale-100 shadow-md`
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Veg / Non-Veg Quick Filters */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFoodTypeFilter('ALL')}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer',
                  foodTypeFilter === 'ALL'
                    ? 'bg-foreground text-background border-transparent'
                    : 'border-border text-muted-foreground hover:text-foreground'
                )}
              >
                All Food
              </button>
              <button
                type="button"
                onClick={() => setFoodTypeFilter('VEG')}
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer',
                  foodTypeFilter === 'VEG'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                    : 'border-border text-emerald-400/70 hover:bg-emerald-500/10'
                )}
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500" /> Veg Only
              </button>
              <button
                type="button"
                onClick={() => setFoodTypeFilter('NON_VEG')}
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer',
                  foodTypeFilter === 'NON_VEG'
                    ? 'bg-red-500/20 text-red-400 border-red-500'
                    : 'border-border text-red-400/70 hover:bg-red-500/10'
                )}
              >
                <div className="w-2 h-2 rounded-full bg-red-500" /> Non-Veg
              </button>
            </div>
          </div>

          {/* Large Visual Category Buttons */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 pt-1">
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className={cn(
                'shrink-0 flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black border transition-all cursor-pointer shadow-sm',
                !selectedCategory
                  ? 'bg-primary text-primary-foreground border-transparent shadow-primary/25 shadow-md scale-105'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40'
              )}
            >
              <span>✨</span>
              <span>All Categories</span>
            </button>
            {categories.map((c) => {
              const icon = c.icon || CATEGORY_ICONS[c.name] || '🍽️';
              const active = selectedCategory === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategory(c.id)}
                  className={cn(
                    'shrink-0 flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black border transition-all cursor-pointer shadow-sm',
                    active
                  ? 'bg-primary text-primary-foreground border-transparent shadow-primary/25 shadow-md scale-105'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40'
                  )}
                >
                  <span className="text-base">{icon}</span>
                  <span>{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Big Food Grid (Touch-friendly 1-Tap Add) */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-32 rounded-2xl bg-muted/60 animate-pulse border border-border" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {filteredItems.map((item) => {
                const variants = Array.isArray(item.variants) && item.variants.length > 0 ? item.variants : [];
                const basePrice = Number(variants[0]?.price || 0);
                const inCart = cart.filter((c) => c.menuItemId === item.id).reduce((s, c) => s + c.quantity, 0);
                const isVeg = item.foodType === 'VEG' || item.foodType === 'VEGAN';

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => addToCart(item)}
                    className={cn(
                      'text-left relative p-4 rounded-2xl border transition-all duration-150 shadow-sm cursor-pointer flex flex-col justify-between min-h-[120px] group active:scale-95',
                      inCart > 0
                        ? 'border-primary bg-primary/10 shadow-md shadow-primary/15'
                        : 'border-border bg-card hover:border-primary/50 hover:bg-muted/30'
                    )}
                  >
                    {/* Top Badges */}
                    <div className="flex items-center justify-between w-full">
                      <div className={cn(
                        'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0',
                        isVeg ? 'border-emerald-500' : 'border-red-500'
                      )}>
                        <div className={cn('w-2 h-2 rounded-full', isVeg ? 'bg-emerald-500' : 'bg-red-500')} />
                      </div>

                      {inCart > 0 ? (
                        <div className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-black shadow animate-in zoom-in-75 duration-100">
                          {inCart} Added
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-muted/80 border border-border flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>

                    {/* Food Title & Price */}
                    <div className="mt-3">
                      <p className="font-bold text-sm text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                        {item.name}
                      </p>
                      <div className="flex items-baseline justify-between mt-2 pt-1 border-t border-border/40">
                        <span className="text-base font-black text-emerald-400">
                          ₹{basePrice.toFixed(0)}
                        </span>
                        {variants.length > 1 && (
                          <span className="text-[10px] font-semibold text-muted-foreground">
                            {variants.length} sizes
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}

              {filteredItems.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <Utensils className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-sm font-bold">No dishes found</p>
                  <p className="text-xs text-muted-foreground">Try selecting "All Categories" or clearing the search.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          RIGHT PANEL: TOUCH-FRIENDLY ORDER CART & FAST BILLING
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col w-full lg:w-[400px] shrink-0 bg-card border-t lg:border-t-0 lg:border-l border-border h-full">
        {/* Cart Header */}
        <div className="p-4 border-b border-border bg-muted/30 shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-black text-sm text-foreground">
                  {runningOrder ? `Table ${selectedTableName || ''}` : 'Current Order'}
                </h2>
                <p className="text-[10px] text-muted-foreground font-semibold">
                  {runningOrder ? `Running #${runningOrder.orderNumber} · ` : ''}{totalItemsCount} Total Items
                </p>
              </div>
            </div>

            {cart.length > 0 && (
              <button
                type="button"
                onClick={handleClearCart}
                className="px-2.5 py-1 rounded-lg text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> {runningOrder ? 'Reset' : 'Clear All'}
              </button>
            )}
          </div>

          {/* Running Order Status Banner */}
          {runningOrder && (
            <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-xs font-black text-rose-400">
                    Modifying Table {selectedTableName} (Order #{runningOrder.orderNumber})
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] font-black border-rose-500/40 text-rose-300">
                  {runningOrder.status}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                <span>Dispatched dishes are locked. Tap menu to add new food or portion +</span>
              </p>
            </div>
          )}

          {/* Big Table Selector for Dine-In — Large Multi-Column Grid Tabs */}
          {orderType === 'DINE_IN' && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                  <TableIcon className="w-3.5 h-3.5 text-primary" /> Select Seated Table:
                </label>
                {selectedTable && (
                  <button
                    type="button"
                    onClick={() => handleSelectTable(null, null)}
                    className="text-[10px] font-bold text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                  >
                    ✕ Clear Table
                  </button>
                )}
              </div>

              {!selectedTable && (
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold flex items-center gap-1.5">
                  <span className="text-amber-400">⚠️</span>
                  <span>Select a table first to take order or add items</span>
                </div>
              )}

              {/* Multi-column grid of large table tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-0.5">
                {tables.length > 0 ? (
                  tables.map((t: any) => {
                    const isSelected = selectedTable === t.id;
                    const activeOrderForTable = activeOrdersByTable.get(t.id);
                    const isDining = !!activeOrderForTable;

                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            handleSelectTable(null, null);
                          } else {
                            handleSelectTable(t.id, t.name);
                          }
                        }}
                        className={cn(
                          'p-2.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-start justify-between gap-1 shadow-sm relative overflow-hidden text-left min-h-[72px]',
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary ring-2 ring-primary/40 shadow-lg scale-[1.02]'
                            : isDining
                            ? 'bg-rose-950/20 border-rose-500/40 text-foreground hover:bg-rose-950/30 hover:border-rose-500/60'
                            : 'bg-background border-border text-foreground hover:border-primary/50 hover:bg-muted/40'
                        )}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className={cn('font-black text-xs leading-tight truncate', isSelected ? 'text-primary-foreground' : 'text-foreground')}>
                            {t.name}
                          </span>
                          {isDining ? (
                            <Badge className={cn(
                              'text-[9px] px-1.5 py-0 h-4 font-black flex items-center gap-1 shrink-0',
                              isSelected ? 'bg-white/20 text-white' : 'bg-rose-500 text-white'
                            )}>
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                              Dining
                            </Badge>
                          ) : (
                            <span className={cn('text-[10px] font-medium', isSelected ? 'text-primary-foreground/80' : 'text-emerald-400')}>
                              Vacant
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between w-full mt-1 pt-1 border-t border-border/40 text-[10px]">
                          {isDining ? (
                            <>
                              <span className={cn('font-mono font-bold truncate max-w-[70px]', isSelected ? 'text-primary-foreground/90' : 'text-rose-300')}>
                                #{activeOrderForTable.orderNumber}
                              </span>
                              <span className={cn('font-black', isSelected ? 'text-primary-foreground' : 'text-emerald-400')}>
                                ₹{Number(activeOrderForTable.total || 0).toFixed(0)}
                              </span>
                            </>
                          ) : (
                            <span className={cn('text-[10px]', isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                              {t.capacity ? `👥 ${t.capacity} seats` : 'Ready to seat'}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="col-span-full p-3 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
                    No tables configured. You can set up tables in Tables section.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
              <div className="w-16 h-16 rounded-3xl bg-muted/60 border border-border flex items-center justify-center mb-3 text-2xl shadow-inner">
                👈
              </div>
              <p className="text-sm font-bold text-foreground">Order is Empty</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                Tap any dish on the left to add it to this ticket.
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.key}
                className={cn(
                  'flex items-center justify-between p-3 rounded-2xl bg-background border transition-all shadow-sm',
                  item.isLocked ? 'border-amber-500/30 bg-amber-500/[0.02]' : 'border-border hover:border-primary/30'
                )}
              >
                <div className="flex-1 min-w-0 mr-2">
                  <div className="flex items-center gap-1.5">
                    <div className={cn(
                      'w-2.5 h-2.5 rounded-full shrink-0',
                      item.foodType === 'VEG' || item.foodType === 'VEGAN' ? 'bg-emerald-500' : 'bg-red-500'
                    )} />
                    <p className="text-xs font-black text-foreground truncate">{item.name}</p>
                    {item.isLocked && (
                      <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-[9px] px-1.5 py-0 h-4 font-bold flex items-center gap-0.5 shrink-0">
                        <Lock className="w-2.5 h-2.5" /> Dispatched
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[11px] font-bold text-emerald-400">
                      ₹{(Number(item.unitPrice) * item.quantity).toFixed(0)}{' '}
                      <span className="text-[10px] text-muted-foreground font-normal">(@ ₹{item.unitPrice})</span>
                    </p>
                    {item.isLocked && item.quantity > (item.minQuantity || 0) && (
                      <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        +{item.quantity - (item.minQuantity || 0)} Extra
                      </span>
                    )}
                  </div>
                </div>

                {/* Giant Counter Buttons */}
                <div className="flex items-center gap-2 shrink-0 bg-muted/60 p-1 rounded-xl border border-border">
                  <button
                    type="button"
                    disabled={item.isLocked && item.quantity <= (item.minQuantity || 1)}
                    onClick={() => updateQty(item.key, -1)}
                    className={cn(
                      'w-8 h-8 rounded-lg bg-background border flex items-center justify-center font-bold transition-all active:scale-90',
                      item.isLocked && item.quantity <= (item.minQuantity || 1)
                        ? 'opacity-30 cursor-not-allowed border-border text-muted-foreground'
                        : 'border-border text-foreground hover:bg-red-500/20 hover:text-red-400 cursor-pointer'
                    )}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm font-black text-foreground">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQty(item.key, 1)}
                    className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold transition-all active:scale-90 cursor-pointer shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer: Totals & Giant Action Buttons */}
        {cart.length > 0 && (
          <div className="p-4 border-t border-border bg-muted/30 shrink-0 space-y-3">
            {/* Quick Bill Breakdown */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Items Subtotal:</span>
                <span className="font-semibold text-foreground">₹{subtotal.toFixed(2)}</span>
              </div>
              {tax > 0 && taxRate > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>GST Tax ({taxRate}%):</span>
                  <span className="font-semibold text-foreground">₹{tax.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-2 border-t border-border font-black text-base text-foreground">
                <span>Total Amount:</span>
                <span className="text-2xl text-emerald-400">₹{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Giant Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {/* Send KOT Button */}
              <Button
                size="lg"
                loading={sendKotMutation.isPending}
                onClick={handlePlaceOrder}
                disabled={runningOrder && !hasNewOrIncreasedItems}
                className={cn(
                  'w-full h-14 rounded-2xl font-black text-sm shadow-lg flex flex-col items-center justify-center gap-0.5 transition-all',
                  runningOrder
                    ? hasNewOrIncreasedItems
                      ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30'
                      : 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Receipt className="w-4 h-4" />
                  <span>
                    {runningOrder
                      ? hasNewOrIncreasedItems
                        ? 'Send Supplemental KOT'
                        : 'Dishes in Kitchen'
                      : 'Send KOT'}
                  </span>
                </div>
                <span className="text-[10px] font-medium opacity-90">
                  {runningOrder
                    ? hasNewOrIncreasedItems
                      ? 'Dispatch New Items to Kitchen'
                      : 'No new dishes added'
                    : 'Send to Kitchen'}
                </span>
              </Button>

              {/* Fast Pay & Settle Button */}
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  setCashTendered(total);
                  setShowFastPayModal(true);
                }}
                className="w-full h-14 rounded-2xl border-2 border-primary/60 bg-primary/10 hover:bg-primary/20 text-primary font-black text-sm flex flex-col items-center justify-center gap-0.5"
              >
                <div className="flex items-center gap-1.5">
                  <Banknote className="w-4 h-4" />
                  <span>Fast Pay</span>
                </div>
                <span className="text-[10px] font-medium opacity-90">Collect & Settle</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL: FAST CASH & UPI TOUCH SETTLEMENT
      ───────────────────────────────────────────────────────────────────────────── */}
      {showFastPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground">Fast Touch Checkout</h3>
                  <p className="text-xs text-muted-foreground">Select payment method or tap exact cash</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFastPayModal(false)}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground font-bold"
              >
                ✕
              </button>
            </div>

            {/* Total Display */}
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-center space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Bill to Collect</span>
              <p className="text-3xl font-black text-emerald-400">₹{total.toFixed(2)}</p>
              {selectedTableName && (
                <Badge className="bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">{selectedTableName}</Badge>
              )}
            </div>

            {/* 1-Tap Cash Presets */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">Quick Cash Note Tendered:</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Exact', amount: total },
                  { label: '₹100', amount: 100 },
                  { label: '₹500', amount: 500 },
                  { label: '₹2000', amount: 2000 },
                ].map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCashTendered(p.amount)}
                    className={cn(
                      'p-2.5 rounded-xl border text-xs font-black transition-all cursor-pointer text-center',
                      cashTendered === p.amount
                        ? 'bg-primary text-primary-foreground border-primary shadow-md'
                        : 'bg-muted/50 border-border text-foreground hover:bg-muted'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Change Due Calculation */}
            {cashTendered !== null && cashTendered >= total && (
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 flex justify-between items-center text-xs text-blue-300">
                <span className="font-bold">Return Change to Guest:</span>
                <span className="text-base font-black text-blue-400">₹{(cashTendered - total).toFixed(2)}</span>
              </div>
            )}

            {/* Action Payment Modes */}
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <Button
                size="lg"
                loading={sendKotMutation.isPending}
                onClick={() => handleFastPayment('CASH')}
                className="h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs gap-2 cursor-pointer"
              >
                <Banknote className="w-4 h-4" />
                <span>Cash Paid (Done)</span>
              </Button>

              <Button
                size="lg"
                variant="outline"
                loading={sendKotMutation.isPending}
                onClick={() => handleFastPayment('UPI')}
                className="h-12 rounded-2xl border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/20 font-black text-xs gap-2 cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                <span>UPI QR / Card Paid</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
