'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, Minus, Trash2, User, TableIcon,
  ShoppingCart, Receipt, CreditCard, Printer, RotateCcw,
  Check, Sparkles, CheckCircle2, Utensils, QrCode,
  DollarSign, Banknote, Coffee, Flame, Pizza, Heart, ArrowRight,
  Volume2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import { apiGet, apiPost, apiPatch, apiPut } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { onRosEvent } from '@/lib/socket';

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
  parentId?: string | null;
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

const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'cat-starters',
    name: 'Starters & Kebabs',
    icon: '🔥',
    items: [
      { id: 'item-paneer-tikka', name: 'Paneer Tikka', foodType: 'VEG', variants: [{ id: 'v-pt-1', name: 'Standard (6 Pcs)', price: 329 }] },
      { id: 'item-chicken-tikka', name: 'Chicken Tikka', foodType: 'NON_VEG', variants: [{ id: 'v-ct-1', name: 'Standard (6 Pcs)', price: 389 }] },
      { id: 'item-tandoori-chicken', name: 'Tandoori Chicken', foodType: 'NON_VEG', variants: [{ id: 'v-tc-1', name: 'Half', price: 349 }, { id: 'v-tc-2', name: 'Full', price: 629 }] },
      { id: 'item-truffle-galouti', name: 'Truffle Galouti Kebab', foodType: 'NON_VEG', variants: [{ id: 'v-tg-1', name: 'Portion (4 Pcs)', price: 520 }] },
    ]
  },
  {
    id: 'cat-main',
    name: 'Main Course & Curries',
    icon: '🍛',
    items: [
      { id: 'item-butter-chicken', name: 'Butter Chicken', foodType: 'NON_VEG', variants: [{ id: 'v-bc-1', name: 'Half', price: 389 }, { id: 'v-bc-2', name: 'Full', price: 699 }] },
      { id: 'item-dal-makhani', name: 'Dal Makhani', foodType: 'VEG', variants: [{ id: 'v-dm-1', name: 'Portion', price: 299 }] },
      { id: 'item-palak-paneer', name: 'Palak Paneer', foodType: 'VEG', variants: [{ id: 'v-pp-1', name: 'Half', price: 279 }, { id: 'v-pp-2', name: 'Full', price: 499 }] },
      { id: 'item-chicken-biryani', name: 'Hyderabadi Dum Biryani', foodType: 'NON_VEG', variants: [{ id: 'v-cb-1', name: 'Single', price: 349 }, { id: 'v-cb-2', name: 'Double', price: 649 }] }
    ]
  },
  {
    id: 'cat-breads',
    name: 'Breads & Rice',
    icon: '🫓',
    items: [
      { id: 'item-butter-naan', name: 'Butter Naan', foodType: 'VEG', variants: [{ id: 'v-bn-1', name: 'Piece', price: 50 }] },
      { id: 'item-garlic-naan', name: 'Garlic Naan', foodType: 'VEG', variants: [{ id: 'v-gn-1', name: 'Piece', price: 65 }] },
      { id: 'item-jeera-rice', name: 'Jeera Rice', foodType: 'VEG', variants: [{ id: 'v-jr-1', name: 'Plate', price: 149 }] }
    ]
  },
  {
    id: 'cat-beverages',
    name: 'Beverages & Mocktails',
    icon: '🥤',
    items: [
      { id: 'item-mango-lassi', name: 'Mango Lassi', foodType: 'VEG', variants: [{ id: 'v-ml-1', name: 'Glass', price: 129 }] },
      { id: 'item-masala-chai', name: 'Masala Chai', foodType: 'VEG', variants: [{ id: 'v-mc-1', name: 'Cup', price: 60 }] },
      { id: 'item-fresh-lime-soda', name: 'Fresh Lime Soda', foodType: 'VEG', variants: [{ id: 'v-fl-1', name: 'Glass', price: 89 }] }
    ]
  }
];

type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';

export default function POSPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const tableParam = searchParams.get('table');
  const orderParam = searchParams.get('order') || searchParams.get('orderId');

  // ── State ────────────────────────────────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [foodTypeFilter, setFoodTypeFilter] = useState<'ALL' | 'VEG' | 'NON_VEG'>('ALL');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('DINE_IN');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedTableName, setSelectedTableName] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [showFastPayModal, setShowFastPayModal] = useState(false);
  const [cashTendered, setCashTendered] = useState<number | null>(null);
  const loadedOrderIdRef = useRef<string | null>(null);

  // Helper to map backend order items into POS CartItem interface
  const mapOrderItemsToCart = useCallback((order: any): CartItem[] => {
    if (!order || !Array.isArray(order.items)) return [];
    return order.items
      .filter((it: any) => !['CANCELLED', 'VOIDED'].includes(it.status))
      .map((it: any) => {
        const vId = it.variantId || it.variant?.id || `v-${it.menuItemId || it.id}`;
        const vName = it.variant?.name || it.variantName || 'Standard';
        const mId = it.menuItemId || it.menuItem?.id || it.id;
        const name = it.menuItem?.name || it.name || 'Dish';
        const unitPrice = Number(it.unitPrice !== undefined && it.unitPrice !== null ? it.unitPrice : (it.variant?.price || it.price || 0));
        const key = `${mId}-${vId}`;
        return {
          key,
          menuItemId: mId,
          variantId: vId,
          name,
          variantName: vName,
          unitPrice,
          quantity: it.quantity || 1,
          foodType: it.menuItem?.foodType || it.foodType || 'VEG',
          notes: it.notes || '',
          modifiers: Array.isArray(it.modifiers) ? it.modifiers : [],
        };
      });
  }, []);

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
    refetchInterval: 2000,
  });

  const { data: activeOrders = [] } = useQuery<any[]>({
    queryKey: ['active-orders'],
    queryFn: () => apiGet<any[]>('/orders/active'),
    refetchInterval: 2000,
  });

  const { data: tenant } = useQuery({
    queryKey: ['current-tenant'],
    queryFn: () => apiGet<any>('/tenants/current'),
  });

  // ── Realtime Socket Event Subscriptions ─────────────────────────────────
  useEffect(() => {
    const unsub = onRosEvent((event) => {
      const t = event.type as string;
      if (
        t === 'ORDER_CREATED' ||
        t === 'ORDER_UPDATED' ||
        t === 'ORDER_STATUS_CHANGED' ||
        t === 'QR_ORDER_PENDING' ||
        t === 'TABLE_STATUS_CHANGED' ||
        t === 'KOT_CREATED' ||
        t === 'PAYMENT_COMPLETED'
      ) {
        if (t === 'KOT_CREATED') {
          const payload = (event as any).payload || {};
          if (payload.orderId === orderParam || (payload.tableId && payload.tableId === selectedTable)) {
            setCart([]);
            setNotes('');
          }
        }
        if (t === 'ORDER_STATUS_CHANGED') {
          const payload = (event as any).payload || {};
          if (['SENT_TO_KITCHEN', 'PREPARING', 'COOKING', 'READY', 'SERVED'].includes(payload.status)) {
            if (payload.orderId === orderParam || (payload.tableId && payload.tableId === selectedTable)) {
              setCart([]);
              setNotes('');
            }
          }
          if (['CANCELLED', 'VOIDED', 'PAID', 'COMPLETED'].includes(payload.status)) {
            if (payload.orderId === orderParam || (payload.tableId && payload.tableId === selectedTable)) {
              setCart([]);
              setNotes('');
              if (['PAID', 'COMPLETED'].includes(payload.status)) {
                setSelectedTable(null);
                setSelectedTableName(null);
                toast.success('Order Settled & Paid', `Order #${payload.orderNumber || ''} marked as paid. Cart cleared.`);
              } else {
                toast.error('Order Cancelled', `Order #${payload.orderNumber || ''} was cancelled. Cart cleared.`);
              }
            }
          }
        }
        if (t === 'PAYMENT_COMPLETED') {
          const payload = (event as any).payload || {};
          if (payload.orderId === orderParam || (payload.tableId && payload.tableId === selectedTable)) {
            setCart([]);
            setNotes('');
            setSelectedTable(null);
            setSelectedTableName(null);
          }
        }
        queryClient.invalidateQueries({ queryKey: ['active-orders'] });
        queryClient.invalidateQueries({ queryKey: ['tables'] });
        queryClient.invalidateQueries({ queryKey: ['orders'] });
      }
    });
    return () => unsub();
  }, [queryClient, orderParam, selectedTable]);

  const categories = useMemo(() => {
    return Array.isArray(rawCategories) ? rawCategories : [];
  }, [rawCategories]);

  const tables = useMemo(() => {
    return Array.isArray(rawTables) ? rawTables : [];
  }, [rawTables]);

  // Pre-select table if table/order is specified in URL query parameters
  useEffect(() => {
    if ((!tableParam && !orderParam) || tables.length === 0) return;

    let targetTable = tableParam ? tables.find((t: any) => t.id === tableParam) : null;
    let activeOrder = orderParam ? (activeOrders || []).find((o: any) => o.id === orderParam) : null;

    if (!targetTable && activeOrder?.tableId) {
      targetTable = tables.find((t: any) => t.id === activeOrder.tableId);
    }

    if (targetTable) {
      setSelectedTable(targetTable.id);
      setSelectedTableName(targetTable.name);
      setOrderType('DINE_IN');
    }
  }, [tableParam, orderParam, tables, activeOrders]);

  // Auto-populate Cart with Pending QR / Draft items for the selected table
  useEffect(() => {
    if (!selectedTable && !orderParam) return;

    const activeOrder = orderParam
      ? (activeOrders || []).find((o: any) => o.id === orderParam)
      : (activeOrders || []).find((o: any) => o.tableId === selectedTable);

    if (activeOrder && ['CONFIRMED', 'DRAFT'].includes(activeOrder.status)) {
      if (loadedOrderIdRef.current !== activeOrder.id) {
        const mapped = mapOrderItemsToCart(activeOrder);
        if (mapped.length > 0) {
          setCart(mapped);
          if (activeOrder.notes) {
            setNotes(activeOrder.notes);
          }
          loadedOrderIdRef.current = activeOrder.id;
          toast.info('QR Order Loaded', `Loaded ${mapped.length} items from Guest QR Order #${activeOrder.orderNumber} for review.`);
        }
      }
    }
  }, [selectedTable, orderParam, activeOrders, mapOrderItemsToCart]);



  const taxRate = useMemo(() => {
    try {
      const parsed = typeof tenant?.settings === 'string' ? JSON.parse(tenant.settings) : (tenant?.settings || {});
      return parsed?.taxRate !== undefined ? Number(parsed.taxRate) : 0;
    } catch {
      return 0;
    }
  }, [tenant]);

  // ── Main Categories (Top Horizontal Strip) ────────────────────────────────
  const mainCategories = useMemo(() => {
    // Only top-level main categories (parentId is null or not in category list)
    return categories.filter((c: any) => !c.parentId || !categories.some((p: any) => p.id === c.parentId));
  }, [categories]);

  // ── Processed Subcategory Sections (Hierarchical View) ───────────────────
  const processedSections = useMemo(() => {
    const filterItem = (item: any) => {
      if (foodTypeFilter !== 'ALL') {
        const isVeg = item.foodType === 'VEG' || item.foodType === 'VEGAN';
        if (foodTypeFilter === 'VEG' && !isVeg) return false;
        if (foodTypeFilter === 'NON_VEG' && isVeg) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          (item.name && item.name.toLowerCase().includes(q)) ||
          (item.description && item.description.toLowerCase().includes(q))
        );
      }
      return true;
    };

    const targetMainCategories = selectedCategory
      ? mainCategories.filter((m) => m.id === selectedCategory)
      : mainCategories;

    const sections: Array<{
      id: string;
      name: string;
      icon: string;
      subcategories: Array<{
        id: string;
        name: string;
        icon?: string;
        items: MenuItem[];
      }>;
      totalItems: number;
    }> = [];

    for (const mainCat of targetMainCategories) {
      const childCats = categories.filter((c: any) => c.parentId === mainCat.id);
      const subGroups: Array<{
        id: string;
        name: string;
        icon?: string;
        items: MenuItem[];
      }> = [];

      // 1. Direct items belonging to the main category itself
      const directItems = (mainCat.items || []).filter(filterItem);
      if (directItems.length > 0) {
        subGroups.push({
          id: `${mainCat.id}-direct`,
          name: childCats.length > 0 ? 'General / Main Dishes' : mainCat.name,
          items: directItems,
        });
      }

      // 2. Items under each child subcategory
      for (const child of childCats) {
        const childItems = (child.items || []).filter(filterItem);
        if (childItems.length > 0) {
          subGroups.push({
            id: child.id,
            name: child.name,
            icon: child.icon || CATEGORY_ICONS[child.name],
            items: childItems,
          });
        }
      }

      const totalItems = subGroups.reduce((sum, g) => sum + g.items.length, 0);
      if (totalItems > 0) {
        sections.push({
          id: mainCat.id,
          name: mainCat.name,
          icon: mainCat.icon || CATEGORY_ICONS[mainCat.name] || '🍽️',
          subcategories: subGroups,
          totalItems,
        });
      }
    }

    return sections;
  }, [categories, mainCategories, selectedCategory, search, foodTypeFilter]);

  const subtotal = useMemo(() => {
    return cart.reduce((s, i) => s + (Number(i.unitPrice) * (i.quantity || 1)), 0);
  }, [cart]);

  const tax = useMemo(() => {
    if (taxRate <= 0) return 0;
    return Math.round((subtotal * (taxRate / 100)) * 100) / 100;
  }, [subtotal, taxRate]);

  const total = useMemo(() => subtotal + tax, [subtotal, tax]);
  const totalItemsCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  // ── Audio Feedback Helper ────────────────────────────────────────────────
  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  };

  // ── Cart Actions ─────────────────────────────────────────────────────────
  const addToCart = useCallback((item: MenuItem) => {
    // Enforce dining table selection for Dine-In orders
    if (orderType === 'DINE_IN' && !selectedTable) {
      toast.error('Dining Table Required', 'Please select a seated table first before adding items to this Dine-In ticket.');
      return;
    }

    playChime();
    const variants = Array.isArray(item.variants) && item.variants.length > 0
      ? item.variants
      : [{ id: `v-${item.id}`, name: 'Standard', price: (item as any).basePrice || (item as any).price || 299 }];

    const variant = variants[0];
    const variantId = variant?.id || `v-${item.id}`;
    const unitPrice = Number(variant?.price) || Number((item as any).basePrice) || 0;
    const key = `${item.id}-${variantId}`;

    setCart((prev) => {
      const existing = prev.find(
        (c) => c.key === key || (c.menuItemId === item.id && (c.variantId === variantId || (!c.variantId && !variantId)))
      );
      if (existing) {
        return prev.map((c) =>
          c.key === existing.key ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, {
        key,
        menuItemId: item.id,
        variantId,
        name: item.name,
        variantName: variant.name || 'Standard',
        unitPrice,
        quantity: 1,
        foodType: item.foodType,
        modifiers: [],
      }];
    });
  }, [orderType, selectedTable]);

  const updateQty = useCallback((key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.key === key ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0)
    );
  }, []);

  const removeItem = useCallback((key: string) => {
    setCart((prev) => prev.filter((c) => c.key !== key));
  }, []);

  // ── Order Mutation ───────────────────────────────────────────────────────
  const createOrderMutation = useMutation({
    mutationFn: async (extraPayload?: any) => {
      const activeOrder = orderParam
        ? (activeOrders || []).find((o: any) => o.id === orderParam)
        : (activeOrders || []).find((o: any) => o.tableId === selectedTable);

      if (activeOrder && ['DRAFT', 'CONFIRMED'].includes(activeOrder.status)) {
        return apiPut(`/orders/${activeOrder.id}/items`, {
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
      }

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
        ...extraPayload,
      });
    },
    onSuccess: (order: any) => {
      toast.success('KOT Sent to Kitchen! 🔔', `Order #${order?.orderNumber || 'KOT'} sent — table stays open for more rounds.`);
      // Clear cart and notes but KEEP the table selected so staff can add another running KOT
      setCart([]);
      setNotes('');
      // Do NOT deselect table — staff can immediately add another round
      setShowFastPayModal(false);
      setCashTendered(null);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['active-orders'] });
      queryClient.invalidateQueries({ queryKey: ['kitchen-kots'] });
      queryClient.invalidateQueries({ queryKey: ['kitchen-queue'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error?.message || err?.message || 'Failed to create order. Please try again.';
      toast.error('Failed to Create Order', msg);
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
    createOrderMutation.mutate();
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
      let order: any;
      const activeOrder = orderParam
        ? (activeOrders || []).find((o: any) => o.id === orderParam)
        : (activeOrders || []).find((o: any) => o.tableId === selectedTable);

      if (activeOrder && ['DRAFT', 'CONFIRMED'].includes(activeOrder.status)) {
        order = await apiPut<any>(`/orders/${activeOrder.id}/items`, {
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
        order = await apiPost<any>('/orders', {
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

      // 2. Add payment
      await apiPost(`/orders/${order.id}/payments`, {
        method,
        amount: total,
      });

      // 3. Mark as PAID/COMPLETED
      try {
        await apiPatch(`/orders/${order.id}/status`, {
          status: 'BILLED',
          reason: `Fast Touch POS Checkout (${method})`,
        });
        await apiPatch(`/orders/${order.id}/status`, {
          status: 'PAID',
          reason: `Settled via ${method}`,
        });
      } catch {}

      toast.success('Order Settled & Paid! 💰', `Order #${order.orderNumber} successfully paid via ${method}`);
      setCart([]);
      setNotes('');
      setSelectedTable(null);
      setSelectedTableName(null);
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

          {/* Large Visual Category Buttons (MAIN CATEGORIES ONLY) */}
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
            {mainCategories.map((c) => {
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

        {/* Big Food Grid (Touch-friendly 1-Tap Add) — Grouped Subcategory-wise */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-32 rounded-2xl bg-muted/60 animate-pulse border border-border" />
              ))}
            </div>
          ) : processedSections.length > 0 ? (
            processedSections.map((sec) => (
              <div key={sec.id} className="space-y-4">
                {/* Main Category Header (Displayed when viewing All Categories) */}
                {!selectedCategory && (
                  <div className="flex items-center justify-between pb-1.5 border-b border-border/80 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{sec.icon}</span>
                      <h2 className="text-xs font-black text-foreground uppercase tracking-wider">
                        {sec.name}
                      </h2>
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground bg-muted/80 px-2 py-0.5 rounded-full border border-border font-mono">
                      {sec.totalItems} {sec.totalItems === 1 ? 'dish' : 'dishes'}
                    </span>
                  </div>
                )}

                {/* Subcategories under this Main Category */}
                <div className="space-y-5">
                  {sec.subcategories.map((sub) => {
                    const showSubHeader = sec.subcategories.length > 1 || sub.name !== sec.name;

                    return (
                      <div key={sub.id} className="space-y-2.5">
                        {showSubHeader && (
                          <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                              <span>🏷️</span>
                              <span className="text-foreground font-black">{sub.name}</span>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border/60">
                              {sub.items.length} {sub.items.length === 1 ? 'item' : 'items'}
                            </span>
                          </div>
                        )}

                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
                          {sub.items.map((item) => {
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
                                  'text-left relative p-3.5 rounded-2xl border transition-all duration-150 shadow-xs cursor-pointer flex flex-col justify-between min-h-[110px] group active:scale-95',
                                  inCart > 0
                                    ? 'border-primary bg-primary/10 shadow-md shadow-primary/15'
                                    : 'border-border bg-card hover:border-primary/50 hover:bg-muted/30'
                                )}
                              >
                                {/* Top Badges */}
                                <div className="flex items-center justify-between w-full">
                                  {/* Veg / Non-Veg Indicator */}
                                  <div className={cn(
                                    'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0',
                                    isVeg ? 'border-emerald-500' : 'border-red-500'
                                  )}>
                                    <div className={cn('w-2 h-2 rounded-full', isVeg ? 'bg-emerald-500' : 'bg-red-500')} />
                                  </div>

                                  {/* Quantity in Cart Badge */}
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
                                <div className="mt-2.5">
                                  <p className="font-bold text-sm text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                                    {item.name}
                                  </p>
                                  <div className="flex items-baseline justify-between mt-2 pt-1 border-t border-border/40">
                                    <span className="text-sm font-black text-emerald-400 font-mono">
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
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Utensils className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-bold">No dishes found</p>
              <p className="text-xs text-muted-foreground">Try selecting "All Categories" or clearing the search.</p>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          RIGHT PANEL: TOUCH-FRIENDLY ORDER CART & FAST BILLING
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col w-full lg:w-[380px] shrink-0 bg-card border-t lg:border-t-0 lg:border-l border-border h-full">
        {/* Cart Header */}
        <div className="p-4 border-b border-border bg-muted/30 shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-black text-sm text-foreground">Current Order</h2>
                <p className="text-[10px] text-muted-foreground font-semibold">{totalItemsCount} Total Items</p>
              </div>
            </div>

            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setCart([]);
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear All
              </button>
            )}
          </div>

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
                    onClick={() => {
                      setSelectedTable(null);
                      setSelectedTableName(null);
                      setCart([]);
                      setNotes('');
                    }}
                    className="text-[10px] font-bold text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                  >
                    ✕ Clear Table
                  </button>
                )}
              </div>

              {!selectedTable && (
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold flex items-center gap-1.5">
                  <span className="text-amber-400">⚠️</span>
                  <span>Select a table first to add dishes to cart</span>
                </div>
              )}

              {/* Multi-column grid of large table tabs */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-44 overflow-y-auto pr-0.5">
                {tables.length > 0 ? (
                  tables.map((t: any) => {
                    const isSelected = selectedTable === t.id;
                    const isOccupied = t.status === 'OCCUPIED';
                    const tableOrder = (activeOrders || []).find((o: any) => o.tableId === t.id);
                    const isPendingQr = tableOrder && ['CONFIRMED', 'DRAFT'].includes(tableOrder.status);

                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedTable(null);
                            setSelectedTableName(null);
                            setCart([]);
                            setNotes('');
                            loadedOrderIdRef.current = null;
                          } else {
                            setSelectedTable(t.id);
                            setSelectedTableName(t.name);
                            if (tableOrder && ['CONFIRMED', 'DRAFT'].includes(tableOrder.status)) {
                              const mapped = mapOrderItemsToCart(tableOrder);
                              setCart(mapped);
                              setNotes(tableOrder.notes || '');
                              loadedOrderIdRef.current = tableOrder.id;
                              if (mapped.length > 0) {
                                toast.info('QR Order Loaded', `Loaded ${mapped.length} items from QR Order #${tableOrder.orderNumber}`);
                              }
                            } else {
                              setCart([]);
                              setNotes('');
                              loadedOrderIdRef.current = null;
                            }
                          }
                        }}
                        className={cn(
                          'p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 shadow-sm text-center relative overflow-hidden',
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-md ring-2 ring-emerald-400/40'
                            : isPendingQr
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30 animate-pulse'
                            : isOccupied
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                            : 'bg-background border-border text-foreground hover:border-primary/50 hover:bg-muted/40'
                        )}
                      >
                        <span className="font-black text-xs leading-tight truncate w-full">{t.name}</span>
                        <span className={cn(
                          'text-[10px] font-medium opacity-80',
                          isSelected ? 'text-emerald-100' : isPendingQr ? 'text-amber-300 font-bold' : 'text-muted-foreground'
                        )}>
                          {isPendingQr ? '🛎️ QR Order' : t.capacity ? `👥 ${t.capacity}` : (isOccupied ? 'Occupied' : 'Vacant')}
                        </span>
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

        {/* Pending QR Order Notice Banner */}
        {selectedTable && (() => {
          const activeOrder = (activeOrders || []).find((o: any) => o.id === orderParam || o.tableId === selectedTable);
          if (activeOrder && ['CONFIRMED', 'DRAFT'].includes(activeOrder.status)) {
            return (
              <div className="mx-3 mt-3 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg shrink-0">🛎️</span>
                  <div className="min-w-0">
                    <p className="font-black text-amber-300 text-xs truncate">
                      Guest QR Order #{activeOrder.orderNumber}
                    </p>
                    <p className="text-[10px] text-amber-200/80 line-clamp-1">
                      {activeOrder.notes || 'Review items, edit if necessary, then click Accept & Send KOT.'}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-amber-500/25 text-amber-300 border-amber-500/40 text-[10px] font-black shrink-0">
                  Pending KOT
                </Badge>
              </div>
            );
          }
          return null;
        })()}

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
              <div className="w-16 h-16 rounded-3xl bg-muted/60 border border-border flex items-center justify-center mb-3 text-2xl shadow-inner">
                👈
              </div>
              <p className="text-sm font-bold text-foreground">Order is Empty</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                Tap any delicious dish on the left to add it to this ticket.
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between p-3 rounded-2xl bg-background border border-border hover:border-primary/30 transition-all shadow-sm"
              >
                <div className="flex-1 min-w-0 mr-2">
                  <div className="flex items-center gap-1.5">
                    <div className={cn(
                      'w-2.5 h-2.5 rounded-full shrink-0',
                      item.foodType === 'VEG' || item.foodType === 'VEGAN' ? 'bg-emerald-500' : 'bg-red-500'
                    )} />
                    <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                  </div>
                  <p className="text-sm font-bold font-mono tabular-nums text-emerald-400 mt-0.5">
                    ₹{(Number(item.unitPrice) * item.quantity).toFixed(0)}{' '}
                    <span className="text-xs text-muted-foreground font-normal">(@ ₹{item.unitPrice})</span>
                  </p>
                </div>

                {/* Giant Counter Buttons */}
                <div className="flex items-center gap-2 shrink-0 bg-muted/60 p-1 rounded-xl border border-border">
                  <button
                    type="button"
                    onClick={() => updateQty(item.key, -1)}
                    className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center text-foreground hover:bg-red-500/20 hover:text-red-400 font-bold transition-all active:scale-90 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm font-bold font-mono tabular-nums text-foreground">{item.quantity}</span>
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
            <div className="space-y-1.5 text-xs font-normal">
              <div className="flex justify-between text-muted-foreground">
                <span>Items Subtotal:</span>
                <span className="font-semibold font-mono tabular-nums text-foreground">₹{subtotal.toFixed(2)}</span>
              </div>
              {tax > 0 && taxRate > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>GST Tax ({taxRate}%):</span>
                  <span className="font-semibold font-mono tabular-nums text-foreground">₹{tax.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-2 border-t border-border">
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Payable:</span>
                <span className="text-3xl font-bold font-mono tracking-tight text-emerald-400 tabular-nums">
                  ₹{total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Giant Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {/* Send KOT Button */}
              <Button
                size="lg"
                loading={createOrderMutation.isPending}
                onClick={handlePlaceOrder}
                className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-lg shadow-emerald-600/30 flex flex-col items-center justify-center gap-0.5"
              >
                <div className="flex items-center gap-1.5">
                  <Receipt className="w-4 h-4" />
                  <span>
                    {(() => {
                      const activeOrder = (activeOrders || []).find((o: any) => o.id === orderParam || o.tableId === selectedTable);
                      return activeOrder && ['CONFIRMED', 'DRAFT'].includes(activeOrder.status)
                        ? 'Accept & Send KOT'
                        : 'Send KOT';
                    })()}
                  </span>
                </div>
                <span className="text-[10px] font-medium opacity-90">Dispatch to Kitchen</span>
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
                loading={createOrderMutation.isPending}
                onClick={() => handleFastPayment('CASH')}
                className="h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs gap-2 cursor-pointer"
              >
                <Banknote className="w-4 h-4" />
                <span>Cash Paid (Done)</span>
              </Button>

              <Button
                size="lg"
                variant="outline"
                loading={createOrderMutation.isPending}
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
