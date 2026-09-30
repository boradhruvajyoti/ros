'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, Minus, Trash2, User, TableIcon,
  ShoppingCart, Receipt, CreditCard, Printer, RotateCcw,
  Check, Sparkles, CheckCircle2, Utensils, QrCode,
  DollarSign, Banknote, Coffee, Flame, Pizza, Heart, ArrowRight,
  Volume2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, X,
  MessageSquarePlus, Edit2, Tag, Gift, Percent, Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiGet, apiPost, apiPatch, apiPut } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { onRosEvent } from '@/lib/socket';
import {
  playNewOrderSound,
  playOrderAcceptedSound,
  playOrderReadySound,
  playPaymentReceivedSound,
} from '@/lib/order-sound';

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
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const tableParam = searchParams.get('table');
  const orderParam = searchParams.get('order') || searchParams.get('orderId');
  const typeParam = searchParams.get('type') || searchParams.get('orderType');

  // Guard: Staff must arrive with a selected table, existing order, or non-dine-in order type
  useEffect(() => {
    if (!tableParam && !orderParam && !typeParam) {
      toast({
        title: 'Order Setup Required',
        description: 'Please visit the Tables section to select a table or order type.',
        variant: 'destructive',
      });
      router.replace('/tables');
    }
  }, [tableParam, orderParam, typeParam, router]);

  // ── State ────────────────────────────────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [foodTypeFilter, setFoodTypeFilter] = useState<'ALL' | 'VEG' | 'NON_VEG'>('ALL');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>(
    typeParam === 'TAKEAWAY' ? 'TAKEAWAY' : typeParam === 'DELIVERY' ? 'DELIVERY' : 'DINE_IN'
  );
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedTableName, setSelectedTableName] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [showFastPayModal, setShowFastPayModal] = useState(false);
  const [cashTendered, setCashTendered] = useState<number | null>(null);
  const [noteModalItemKey, setNoteModalItemKey] = useState<string | null>(null);
  const [itemNoteText, setItemNoteText] = useState('');
  const [mobileTab, setMobileTab] = useState<'menu' | 'cart'>('menu');
  const [showMobileCategories, setShowMobileCategories] = useState(false);
  const [isMobileCartDrawerOpen, setIsMobileCartDrawerOpen] = useState(false);
  const [mobileSideRailCollapsed, setMobileSideRailCollapsed] = useState(false);
  const loadedOrderIdRef = useRef<string | null>(null);
  const initialParamProcessedRef = useRef(false);

  // ── Discount & Promo Studio State ─────────────────────────────────────────
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountModalTab, setDiscountModalTab] = useState<'CUSTOM' | 'COUPONS' | 'OFFERS'>('CUSTOM');
  const [customDiscountType, setCustomDiscountType] = useState<'PERCENTAGE' | 'FLAT'>('FLAT');
  const [customDiscountValue, setCustomDiscountValue] = useState<string>('');
  const [customDiscountReason, setCustomDiscountReason] = useState<string>('Manager Goodwill');
  const [customReasonInput, setCustomReasonInput] = useState<string>('');
  const [couponCodeInput, setCouponCodeInput] = useState<string>('');
  const [couponInputError, setCouponInputError] = useState<string | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState<{
    type: 'CUSTOM' | 'COUPON' | 'THRESHOLD';
    label: string;
    amount: number;
    reason?: string;
    rawType?: 'PERCENTAGE' | 'FLAT';
    rawValue?: number;
    code?: string;
    promoId?: string;
  } | null>(null);

  const openItemNoteModal = (item: CartItem) => {
    setNoteModalItemKey(item.key);
    setItemNoteText(item.notes || '');
  };

  const saveItemNote = () => {
    if (!noteModalItemKey) return;
    const trimmed = itemNoteText.trim();
    setCart((prev) =>
      prev.map((c) => (c.key === noteModalItemKey ? { ...c, notes: trimmed || undefined } : c))
    );
    setNoteModalItemKey(null);
    setItemNoteText('');
  };

  // Helper to map backend order items into POS CartItem interface
  const mapOrderItemsToCart = useCallback((order: any): CartItem[] => {
    if (!order || !Array.isArray(order.items)) return [];
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

    return order.items
      .filter((it: any) => !['CANCELLED', 'VOIDED'].includes(it.status))
      .map((it: any) => {
        const vId = it.variantId || it.variant?.id || `v-${it.menuItemId || it.id}`;
        const vName = it.variant?.name || it.variantName || 'Standard';
        const mId = it.menuItemId || it.menuItem?.id || it.id;
        const baseName = it.menuItem?.name || it.name || 'Dish';
        const displayName = isHalfOrFull(vName) ? `${baseName} (${vName})` : baseName;
        const unitPrice = Number(it.unitPrice !== undefined && it.unitPrice !== null ? it.unitPrice : (it.variant?.price || it.price || 0));
        const key = `${mId}-${vId}`;
        return {
          key,
          menuItemId: mId,
          variantId: vId,
          name: displayName,
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

  const { data: promotionsData = [] } = useQuery<any[]>({
    queryKey: ['active-promotions'],
    queryFn: async () => {
      try {
        const res = await apiGet<any>('/marketing/promotions');
        const list = res?.data || res || [];
        return Array.isArray(list) ? list.filter((p: any) => p.status === 'ACTIVE') : [];
      } catch {
        return [];
      }
    },
    staleTime: 30 * 1000,
  });

  // ── Realtime Socket Event Subscriptions ─────────────────────────────────
  useEffect(() => {
    const unsub = onRosEvent((event) => {
      const t = event.type as string;
      const payload = (event as any).payload || {};

      if (t === 'KOT_CREATED') {
        if (payload?.items?.length) {
          playNewOrderSound();
        }
        if (payload.orderId === orderParam || (payload.tableId && payload.tableId === selectedTable)) {
          setCart([]);
          setNotes('');
        }
      } else if (t === 'KOT_STATUS_CHANGED') {
        if (payload?.status === 'ACCEPTED') {
          playOrderAcceptedSound();
        } else if (payload?.status === 'READY') {
          playOrderReadySound();
        }
      } else if (t === 'ORDER_STATUS_CHANGED') {
        if (payload?.status === 'ACCEPTED' || payload?.status === 'CONFIRMED') {
          playOrderAcceptedSound();
        } else if (payload?.status === 'READY' || payload?.status === 'READY_FOR_PICKUP') {
          playOrderReadySound();
        } else if (payload?.status === 'PAID' || payload?.status === 'COMPLETED') {
          playPaymentReceivedSound();
        }

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
      } else if (t === 'PAYMENT_COMPLETED') {
        playPaymentReceivedSound();
        if (payload.orderId === orderParam || (payload.tableId && payload.tableId === selectedTable)) {
          setCart([]);
          setNotes('');
          setSelectedTable(null);
          setSelectedTableName(null);
        }
      }

      if (
        t === 'ORDER_CREATED' ||
        t === 'ORDER_UPDATED' ||
        t === 'ORDER_STATUS_CHANGED' ||
        t === 'QR_ORDER_PENDING' ||
        t === 'TABLE_STATUS_CHANGED' ||
        t === 'KOT_CREATED' ||
        t === 'PAYMENT_COMPLETED'
      ) {
        queryClient.invalidateQueries({ queryKey: ['active-orders'] });
        queryClient.invalidateQueries({ queryKey: ['tables'] });
        queryClient.invalidateQueries({ queryKey: ['orders'] });
      }
    });
    return () => unsub();
  }, [queryClient, orderParam, selectedTable, tenant?.name]);

  const categories = useMemo(() => {
    return Array.isArray(rawCategories) ? rawCategories : [];
  }, [rawCategories]);

  const tables = useMemo(() => {
    return Array.isArray(rawTables) ? rawTables : [];
  }, [rawTables]);

  // Pre-select table ONLY ONCE if table/order is specified in URL query parameters
  useEffect(() => {
    if (initialParamProcessedRef.current) return;
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
      initialParamProcessedRef.current = true;

      // Auto-populate cart if this initial table has draft/pending QR items
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
    }
  }, [tableParam, orderParam, tables, activeOrders, mapOrderItemsToCart]);

  // Unified Table Selection Handler — Allows effortlessly switching to any other table without URL lock
  const handleSelectTable = useCallback((t: any | null) => {
    initialParamProcessedRef.current = true;
    if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname);
    }

    if (!t || selectedTable === t.id) {
      setSelectedTable(null);
      setSelectedTableName(null);
      setCart([]);
      setNotes('');
      loadedOrderIdRef.current = null;
      return;
    }

    setSelectedTable(t.id);
    setSelectedTableName(t.name);
    setOrderType('DINE_IN');

    const tableOrder = (activeOrders || []).find((o: any) => o.tableId === t.id && ['CONFIRMED', 'DRAFT'].includes(o.status));
    if (tableOrder) {
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
  }, [selectedTable, activeOrders, mapOrderItemsToCart]);



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

  // Helper: Explode menu item variants into separate individual POS cards (e.g. Half / Full)
  const explodeItemVariants = useCallback((item: MenuItem) => {
    const variants = Array.isArray(item.variants) && item.variants.length > 0
      ? item.variants
      : [{ id: `v-${item.id}`, name: '', price: (item as any).basePrice || (item as any).price || 299 }];

    // Function to check if a variant is Half, Full, or a genuine multi-portion option (exclude 'Regular Portion', 'Standard', etc.)
    const isHalfOrFullVariant = (name?: string) => {
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

    if (variants.length <= 1) {
      const v = variants[0];
      const showVariant = isHalfOrFullVariant(v.name);
      return [{
        cardId: `${item.id}_${v.id}`,
        menuItemId: item.id,
        variantId: v.id,
        displayName: showVariant ? `${item.name} (${v.name})` : item.name,
        baseName: item.name,
        variantName: showVariant ? v.name : undefined,
        price: Number(v.price || 0),
        foodType: item.foodType,
        itemRef: item,
        variantRef: v,
      }];
    }

    // Multiple variants (e.g. Half, Full) -> exploded into separate items
    return variants.map((v) => {
      const showVariant = isHalfOrFullVariant(v.name);
      return {
        cardId: `${item.id}_${v.id}`,
        menuItemId: item.id,
        variantId: v.id,
        displayName: showVariant ? `${item.name} (${v.name})` : item.name,
        baseName: item.name,
        variantName: showVariant ? v.name : undefined,
        price: Number(v.price || 0),
        foodType: item.foodType,
        itemRef: item,
        variantRef: v,
      };
    });
  }, []);

  // ── Processed Subcategory Sections (Hierarchical View & Exploded Variants) ──
  const processedSections = useMemo(() => {
    const filterCard = (card: any) => {
      if (foodTypeFilter !== 'ALL') {
        const isVeg = card.foodType === 'VEG' || card.foodType === 'VEGAN';
        if (foodTypeFilter === 'VEG' && !isVeg) return false;
        if (foodTypeFilter === 'NON_VEG' && isVeg) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          card.displayName.toLowerCase().includes(q) ||
          (card.itemRef.description && card.itemRef.description.toLowerCase().includes(q))
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
        items: any[];
      }>;
      totalItems: number;
    }> = [];

    for (const mainCat of targetMainCategories) {
      const childCats = categories.filter((c: any) => c.parentId === mainCat.id);
      const subGroups: Array<{
        id: string;
        name: string;
        icon?: string;
        items: any[];
      }> = [];

      // 1. Direct items belonging to the main category itself (exploded by variant)
      const directCards = (mainCat.items || []).flatMap(explodeItemVariants).filter(filterCard);
      if (directCards.length > 0) {
        subGroups.push({
          id: `${mainCat.id}-direct`,
          name: childCats.length > 0 ? 'General / Main Dishes' : mainCat.name,
          items: directCards,
        });
      }

      // 2. Items under each child subcategory (exploded by variant)
      for (const child of childCats) {
        const childCards = (child.items || []).flatMap(explodeItemVariants).filter(filterCard);
        if (childCards.length > 0) {
          subGroups.push({
            id: child.id,
            name: child.name,
            icon: child.icon || CATEGORY_ICONS[child.name],
            items: childCards,
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
  }, [categories, mainCategories, selectedCategory, search, foodTypeFilter, explodeItemVariants]);

  const selectedCategoryObj = useMemo(() => {
    return mainCategories.find((c) => c.id === selectedCategory) || null;
  }, [mainCategories, selectedCategory]);

  const rawSubtotal = useMemo(() => {
    return cart.reduce((s, i) => s + (Number(i.unitPrice) * (i.quantity || 1)), 0);
  }, [cart]);

  // Promotions & Discounts Evaluation
  const promotions: any[] = useMemo(() => {
    return Array.isArray(promotionsData) ? promotionsData : [];
  }, [promotionsData]);

  const thresholdPromos = useMemo(() => {
    return promotions.filter((p) => p.type === 'BILL_THRESHOLD');
  }, [promotions]);

  const comboPromos = useMemo(() => {
    return promotions.filter((p) => p.type === 'ITEM_COMBO');
  }, [promotions]);

  const qualifiedThresholdPromo = useMemo(() => {
    if (rawSubtotal <= 0) return null;
    const sorted = [...thresholdPromos].sort((a, b) => Number(b.thresholdAmount || 0) - Number(a.thresholdAmount || 0));
    return sorted.find((p) => rawSubtotal >= Number(p.thresholdAmount || 0)) || null;
  }, [thresholdPromos, rawSubtotal]);

  const unlockedCombos = useMemo(() => {
    if (cart.length === 0) return [];
    return comboPromos.filter((combo) => {
      const triggerIds: string[] = Array.isArray(combo.triggerItemIds) ? combo.triggerItemIds : [];
      const triggerNames: string[] = Array.isArray(combo.triggerItemNames) ? combo.triggerItemNames : [];
      if (triggerIds.length === 0 && triggerNames.length === 0) return false;
      return triggerIds.every((tId) => cart.some((c) => c.menuItemId === tId || c.name === tId)) ||
             triggerNames.every((tName) => cart.some((c) => c.name?.toLowerCase().includes(tName.toLowerCase())));
    });
  }, [comboPromos, cart]);

  const discountAmount = useMemo(() => {
    if (appliedDiscount) {
      let disc = 0;
      if (appliedDiscount.rawType === 'PERCENTAGE') {
        disc = (rawSubtotal * Number(appliedDiscount.rawValue || 0)) / 100;
      } else {
        disc = Number(appliedDiscount.rawValue || appliedDiscount.amount || 0);
      }
      return Math.min(rawSubtotal, disc);
    }
    // Auto threshold discount fallback if active and not manually cleared
    if (qualifiedThresholdPromo && qualifiedThresholdPromo.rewardType === 'MONEY_DISCOUNT') {
      let disc = 0;
      if (qualifiedThresholdPromo.discountType === 'PERCENTAGE') {
        disc = (rawSubtotal * Number(qualifiedThresholdPromo.discountValue || 0)) / 100;
        if (qualifiedThresholdPromo.maxDiscountCap && disc > Number(qualifiedThresholdPromo.maxDiscountCap)) {
          disc = Number(qualifiedThresholdPromo.maxDiscountCap);
        }
      } else {
        disc = Number(qualifiedThresholdPromo.discountValue || 0);
      }
      return Math.min(rawSubtotal, disc);
    }
    return 0;
  }, [appliedDiscount, rawSubtotal, qualifiedThresholdPromo]);

  const subtotal = useMemo(() => {
    return Math.max(0, rawSubtotal - discountAmount);
  }, [rawSubtotal, discountAmount]);

  const tax = useMemo(() => {
    if (taxRate <= 0) return 0;
    return Math.round((subtotal * (taxRate / 100)) * 100) / 100;
  }, [subtotal, taxRate]);

  const total = useMemo(() => subtotal + tax, [subtotal, tax]);
  const totalItemsCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  // Discount Action Handlers
  const handleApplyCustomDiscount = () => {
    const val = Number(customDiscountValue);
    if (isNaN(val) || val <= 0) {
      toast.error('Invalid Discount', 'Please enter a valid positive discount amount or percentage.');
      return;
    }

    const reason = customDiscountReason === 'Custom Reason' ? (customReasonInput.trim() || 'Custom Cashier Discount') : customDiscountReason;
    const label = customDiscountType === 'PERCENTAGE' ? `${val}% OFF (${reason})` : `₹${val} OFF (${reason})`;

    setAppliedDiscount({
      type: 'CUSTOM',
      label,
      amount: val,
      rawType: customDiscountType,
      rawValue: val,
      reason,
    });
    setShowDiscountModal(false);
    toast.success('Discount Applied! 🏷️', `${label} added to bill.`);
  };

  const handleApplyCoupon = (coupon: any) => {
    if (coupon.minOrderAmount && rawSubtotal < Number(coupon.minOrderAmount)) {
      toast.error('Minimum Order Unmet', `This coupon requires a minimum bill of ₹${coupon.minOrderAmount}. Current bill: ₹${rawSubtotal.toFixed(2)}`);
      return;
    }

    const val = Number(coupon.discountValue || 0);
    const label = coupon.discountType === 'PERCENTAGE' ? `${val}% OFF (${coupon.code})` : `₹${val} OFF (${coupon.code})`;

    setAppliedDiscount({
      type: 'COUPON',
      label,
      amount: val,
      rawType: coupon.discountType,
      rawValue: val,
      code: coupon.code,
      promoId: coupon.id,
      reason: `Coupon: ${coupon.code}`,
    });
    setShowDiscountModal(false);
    toast.success('Coupon Applied! 🎟️', `${coupon.code} applied to ticket.`);
  };

  const handleApplyCouponCode = () => {
    setCouponInputError(null);
    const code = couponCodeInput.trim().toUpperCase();
    if (!code) {
      setCouponInputError('Please enter a coupon code');
      return;
    }

    const found = promotions.find((p) => p.type === 'COUPON_LIMITED_TIME' && p.code?.toUpperCase() === code);
    if (!found) {
      setCouponInputError(`Coupon code "${code}" is invalid or expired.`);
      return;
    }

    handleApplyCoupon(found);
    setCouponCodeInput('');
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    toast.info('Discount Removed', 'Cart bill returned to regular pricing.');
  };

  const handleAddComplementaryItem = (name: string, promoName: string) => {
    const key = `free-${name.toLowerCase().replace(/\s+/g, '-')}`;
    setCart((prev) => {
      const existing = prev.find((c) => c.key === key);
      if (existing) {
        return prev.map((c) => c.key === key ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, {
        key,
        menuItemId: `promo-${Date.now()}`,
        variantId: 'v-free',
        name: `${name} (Free Reward)`,
        variantName: 'Complimentary Offer',
        unitPrice: 0,
        quantity: 1,
        notes: `Free Promo Reward: ${promoName}`,
        modifiers: [],
      }];
    });
    toast.success('Free Reward Added! 🎁', `${name} added to cart at ₹0.00.`);
  };

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
  const addToCart = useCallback((item: MenuItem, specificVariant?: Variant) => {
    // Enforce dining table selection for Dine-In orders
    if (orderType === 'DINE_IN' && !selectedTable) {
      toast.error('Dining Table Required', 'Please select a seated table first before adding items to this Dine-In ticket.');
      return;
    }

    playChime();
    const variant = specificVariant || (Array.isArray(item.variants) && item.variants.length > 0 ? item.variants[0] : { id: `v-${item.id}`, name: 'Standard', price: (item as any).basePrice || (item as any).price || 299 });
    const variantId = variant?.id || `v-${item.id}`;
    const unitPrice = Number(variant?.price) || Number((item as any).basePrice) || 0;
    const variantName = variant?.name || 'Standard';
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
    const displayName = isHalfOrFull(variantName) ? `${item.name} (${variantName})` : item.name;
    const key = `${item.id}-${variantId}`;

    setCart((prev) => {
      const existing = prev.find(
        (c) => c.key === key || (c.menuItemId === item.id && c.variantId === variantId)
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
        name: displayName,
        variantName,
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
      const activeOrder = selectedTable
        ? (activeOrders || []).find((o: any) => o.tableId === selectedTable)
        : (orderParam ? (activeOrders || []).find((o: any) => o.id === orderParam) : null);

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

      const formattedNotes = [
        notes.trim() || null,
        appliedDiscount ? `Applied Discount: ${appliedDiscount.label}` : null,
      ].filter(Boolean).join(' | ');

      return apiPost('/orders', {
        type: orderType,
        status: 'SENT_TO_KITCHEN',
        tableId: selectedTable || undefined,
        notes: formattedNotes || undefined,
        discountAmount: discountAmount > 0 ? discountAmount : undefined,
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
      // Play sound notification for sending KOT to kitchen
      playNewOrderSound();

      toast.success('KOT Sent to Kitchen! 🔔', `Order #${order?.orderNumber || 'KOT'} sent — table stays open for more rounds.`);
      // Clear cart and notes but KEEP the table selected so staff can add another running KOT
      setCart([]);
      setNotes('');
      setAppliedDiscount(null);
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

      const formattedNotes = [
        notes.trim() || null,
        appliedDiscount ? `Applied Discount: ${appliedDiscount.label}` : null,
      ].filter(Boolean).join(' | ');

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
          notes: formattedNotes || undefined,
        });
      } else {
        order = await apiPost<any>('/orders', {
          type: orderType,
          status: 'SENT_TO_KITCHEN',
          tableId: selectedTable || undefined,
          notes: formattedNotes || undefined,
          discountAmount: discountAmount > 0 ? discountAmount : undefined,
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

      playPaymentReceivedSound();

      toast.success('Order Settled & Paid! 💰', `Order #${order.orderNumber} successfully paid via ${method}`);
      setCart([]);
      setNotes('');
      setAppliedDiscount(null);
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
    <div className="flex flex-col lg:flex-row h-full w-full gap-0 -m-3 sm:-m-4 md:-m-6 overflow-hidden select-none relative">
      {/* ─────────────────────────────────────────────────────────────────────────────
          LEFT PANEL: VISUAL TOUCH MENU & CATEGORIES
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className={cn(
        "flex-col flex-1 min-w-0 border-r border-border bg-background h-full w-full overflow-hidden",
        mobileTab === 'menu' ? 'flex' : 'hidden lg:flex'
      )}>
        {/* Top Header: Order Mode, Search & Filters */}
        <div className="p-3 sm:p-3.5 border-b border-border space-y-2.5 sm:space-y-3 bg-card/60 backdrop-blur shrink-0">
          <div className="flex items-center justify-between gap-2.5 flex-wrap">
            {/* Active Order Context Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/80 rounded-none border border-border">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                {orderType === 'DINE_IN' ? (
                  <>
                    <span className="text-emerald-500 font-black">🍽️</span>
                    <span>Table <span className="font-mono font-black text-emerald-400">{selectedTableName || 'Table'}</span> (Dine-In)</span>
                  </>
                ) : orderType === 'TAKEAWAY' ? (
                  <>
                    <span>🛍️</span>
                    <span className="text-indigo-400 font-black">Takeaway Order</span>
                  </>
                ) : (
                  <>
                    <span>🛵</span>
                    <span className="text-purple-400 font-black">Delivery Order</span>
                  </>
                )}
              </span>
              <button
                type="button"
                onClick={() => router.push('/tables')}
                className="text-[10px] font-bold text-primary hover:underline ml-1 cursor-pointer"
                title="Switch Table or Order Type"
              >
                Switch
              </button>
            </div>

            {/* Quick Search Bar */}
            <div className="relative flex-1 min-w-[170px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search dish (e.g. Chicken, Paneer)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-8 h-9 sm:h-10 rounded-2xl bg-muted/60 border-border text-xs font-bold focus:bg-background transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Veg / Non-Veg Quick Filters (Hidden on Mobile Web View) */}
            <div className="hidden md:flex items-center gap-1.5">
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

          {/* ── Large Visual Category Horizontal Buttons (Desktop / Tablet Only) ── */}
          <div className="hidden md:flex gap-2 overflow-x-auto no-scrollbar pb-1 pt-0.5">
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

        {/* ── MOBILE: Side Category Rail + Item Grid Split Layout ── */}
        {/* Desktop: normal scrolling grid | Mobile: side-rail + item grid */}
        <div className="flex md:hidden flex-1 overflow-hidden">
          {/* Sticky Left Side Category Rail (Waiter-mode, always visible) */}
          <div className={cn(
            "flex flex-col border-r border-border bg-card/80 shrink-0 overflow-y-auto transition-all duration-200",
            mobileSideRailCollapsed ? "w-12" : "w-[88px]"
          )}>
            {/* Collapse toggle */}
            <button
              type="button"
              onClick={() => setMobileSideRailCollapsed(v => !v)}
              className="p-2 flex items-center justify-center border-b border-border text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
            >
              {mobileSideRailCollapsed
                ? <ChevronRight className="w-4 h-4" />
                : <ChevronLeft className="w-4 h-4" />}
            </button>

            {/* All button */}
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-3 px-1 border-b border-border/50 cursor-pointer transition-all active:scale-95",
                !selectedCategory
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <span className="text-xl">✨</span>
              {!mobileSideRailCollapsed && (
                <span className="text-[9px] font-black leading-tight text-center">All</span>
              )}
            </button>

            {/* Per-category buttons */}
            {mainCategories.map((c) => {
              const icon = c.icon || CATEGORY_ICONS[c.name] || '🍽️';
              const isActive = selectedCategory === c.id;
              const sec = processedSections.find(s => s.id === c.id);
              const count = sec ? sec.totalItems : (c.items?.length || 0);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategory(c.id)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 py-3.5 px-1 border-b border-border/50 cursor-pointer transition-all active:scale-95 relative",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <span className="text-xl leading-none">{icon}</span>
                  {!mobileSideRailCollapsed && (
                    <>
                      <span className={cn(
                        "text-[9px] font-black text-center leading-tight line-clamp-2 max-w-full px-0.5",
                        isActive ? "text-white" : "text-foreground"
                      )}>
                        {c.name.length > 14 ? c.name.slice(0, 12) + '…' : c.name}
                      </span>
                      <span className={cn(
                        "text-[9px] font-mono px-1.5 py-0.5 rounded-full",
                        isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                      )}>{count}</span>
                    </>
                  )}
                  {mobileSideRailCollapsed && isActive && (
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-foreground rounded-l-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Item Grid */}
          <div className="flex-1 overflow-y-auto p-2 space-y-4 pb-28">
            {isLoading ? (
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-28 rounded-2xl bg-muted/60 animate-pulse border border-border" />
                ))}
              </div>
            ) : processedSections.length > 0 ? (
              processedSections.map((sec) => (
                <div key={sec.id} className="space-y-2.5">
                  {!selectedCategory && (
                    <div className="flex items-center gap-1.5 pb-1 border-b border-border/60">
                      <span className="text-sm">{sec.icon}</span>
                      <h2 className="text-[10px] font-black text-foreground uppercase tracking-wider flex-1">{sec.name}</h2>
                      <span className="text-[9px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{sec.totalItems}</span>
                    </div>
                  )}
                  {sec.subcategories.map((sub) => (
                    <div key={sub.id} className="space-y-2">
                      {sec.subcategories.length > 1 && (
                        <div className="text-[9px] font-black text-muted-foreground uppercase tracking-wider px-1 flex items-center gap-1">
                          <span>🏷️</span><span>{sub.name}</span>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        {sub.items.map((card) => {
                          const inCart = cart.filter(c => c.menuItemId === card.menuItemId && c.variantId === card.variantId).reduce((s, c) => s + c.quantity, 0);
                          const isVeg = card.foodType === 'VEG' || card.foodType === 'VEGAN';
                          return (
                            <button
                              key={card.cardId}
                              type="button"
                              onClick={() => addToCart(card.itemRef, card.variantRef)}
                              className={cn(
                                'text-left relative p-3 rounded-2xl border-2 transition-all duration-100 cursor-pointer flex flex-col justify-between active:scale-95 min-h-[108px]',
                                inCart > 0
                                  ? 'border-primary bg-primary/10 shadow-md shadow-primary/20'
                                  : isVeg
                                  ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60'
                                  : 'border-rose-500/30 bg-rose-500/5 hover:border-rose-500/60'
                              )}
                            >
                              {/* Top: Veg indicator + count badge */}
                              <div className="flex items-start justify-between w-full gap-1">
                                <div className={cn(
                                  'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5',
                                  isVeg ? 'border-emerald-500' : 'border-rose-500'
                                )}>
                                  <div className={cn('w-2 h-2 rounded-full', isVeg ? 'bg-emerald-500' : 'bg-rose-500')} />
                                </div>
                                {inCart > 0 ? (
                                  <div className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-black shadow shrink-0">
                                    {inCart}x
                                  </div>
                                ) : (
                                  <div className={cn(
                                    'w-7 h-7 rounded-full flex items-center justify-center font-black text-sm shrink-0',
                                    isVeg
                                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                      : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                                  )}>
                                    +
                                  </div>
                                )}
                              </div>

                              {/* Food name — BIG and bold */}
                              <div className="mt-1.5">
                                <p className="font-black text-xs text-foreground leading-snug line-clamp-2">
                                  {card.displayName}
                                </p>
                              </div>

                              {/* Price — prominent */}
                              <div className={cn(
                                "mt-2 pt-1.5 border-t flex items-center justify-between",
                                isVeg ? 'border-emerald-500/20' : 'border-rose-500/20'
                              )}>
                                <span className={cn(
                                  "text-sm font-black font-mono",
                                  isVeg ? 'text-emerald-500' : 'text-rose-500'
                                )}>₹{card.price.toFixed(0)}</span>
                                {card.variantName && (
                                  <span className="text-[9px] font-bold text-muted-foreground">{card.variantName}</span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Utensils className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-xs font-bold">No dishes found</p>
                <p className="text-[10px]">Try a different category.</p>
              </div>
            )}
          </div>
        </div>

        {/* Desktop: normal scrolling grid — unchanged */}
        {/* Big Food Grid (Touch-friendly 1-Tap Add) — Grouped Subcategory-wise with Separate Variant Items */}
        <div className="hidden md:block flex-1 overflow-y-auto p-3 sm:p-4 space-y-5 pb-24 lg:pb-4">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-3.5">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-28 sm:h-32 rounded-2xl bg-muted/60 animate-pulse border border-border" />
              ))}
            </div>
          ) : processedSections.length > 0 ? (
            processedSections.map((sec) => (
              <div key={sec.id} className="space-y-3.5">
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
                      {sec.totalItems} {sec.totalItems === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                )}

                {/* Subcategories under this Main Category */}
                <div className="space-y-4">
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

                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3.5">
                          {sub.items.map((card) => {
                            const inCart = cart.filter((c) => c.menuItemId === card.menuItemId && c.variantId === card.variantId).reduce((s, c) => s + c.quantity, 0);
                            const isVeg = card.foodType === 'VEG' || card.foodType === 'VEGAN';
                            const vNameLower = (card.variantName || '').toLowerCase();
                            const isHalf = vNameLower.includes('half') || vNameLower.includes('small') || vNameLower.includes('qtr') || vNameLower.includes('quarter');

                            return (
                              <button
                                key={card.cardId}
                                type="button"
                                onClick={() => addToCart(card.itemRef, card.variantRef)}
                                className={cn(
                                  'text-left relative p-3 sm:p-3.5 rounded-2xl border transition-all duration-150 shadow-xs cursor-pointer flex flex-col justify-between min-h-[105px] sm:min-h-[110px] group active:scale-95',
                                  inCart > 0
                                    ? 'border-primary bg-primary/10 shadow-md shadow-primary/15'
                                    : 'border-border bg-card hover:border-primary/50 hover:bg-muted/30'
                                )}
                              >
                                {/* Top Badges */}
                                <div className="flex items-center justify-between w-full">
                                  {/* Veg / Non-Veg Indicator + Portion Badge */}
                                  <div className="flex items-center gap-1.5">
                                    <div className={cn(
                                      'w-3.5 h-3.5 sm:w-4 sm:h-4 rounded border-2 flex items-center justify-center shrink-0',
                                      isVeg ? 'border-emerald-500' : 'border-red-500'
                                    )}>
                                      <div className={cn('w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full', isVeg ? 'bg-emerald-500' : 'bg-red-500')} />
                                    </div>

                                    {card.variantName && (
                                      <span className={cn(
                                        "px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black font-mono border",
                                        isVeg
                                          ? (isHalf
                                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                              : "bg-emerald-900/20 text-emerald-900 dark:text-emerald-300 border-emerald-800/40")
                                          : (isHalf
                                              ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                                              : "bg-rose-900/20 text-rose-900 dark:text-rose-300 border-rose-900/40")
                                      )}>
                                        {card.variantName}
                                      </span>
                                    )}
                                  </div>

                                  {/* Quantity in Cart Badge */}
                                  {inCart > 0 ? (
                                    <div className="px-1.5 sm:px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] sm:text-xs font-black shadow animate-in zoom-in-75 duration-100">
                                      {inCart} Added
                                    </div>
                                  ) : (
                                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-muted/80 border border-border flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                      <Plus className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                                    </div>
                                  )}
                                </div>

                                {/* Food Title & Price */}
                                <div className="mt-2">
                                  <p className="font-bold text-xs sm:text-sm text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                                    {card.displayName}
                                  </p>
                                  <div className="flex items-baseline justify-between mt-1.5 pt-1 border-t border-border/40">
                                    <span className="text-xs sm:text-sm font-black text-emerald-400 font-mono">
                                      ₹{card.price.toFixed(0)}
                                    </span>
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
              <p className="text-xs text-muted-foreground">Try clearing the search or choosing a different category.</p>
            </div>
          )}
        </div>
        {/* End desktop grid */}

        {/* ── Mobile Floating Bottom Itemised Tray Bar (QR Menu style) ── */}
        {cart.length > 0 && (
          <div className="lg:hidden fixed bottom-16 left-3 right-3 z-30 animate-in slide-in-from-bottom-4 duration-200">
            <button
              type="button"
              onClick={() => setIsMobileCartDrawerOpen(true)}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary via-amber-500 to-emerald-600 text-primary-foreground font-black px-4 flex items-center justify-between shadow-2xl shadow-primary/30 border border-white/20 active:scale-98 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-black/30 flex items-center justify-center font-mono text-sm font-black shadow-inner">
                  {totalItemsCount}
                </div>
                <div className="text-left">
                  <p className="text-xs font-black leading-tight flex items-center gap-1">
                    <span>View Order Cart</span>
                    <ChevronUp className="w-3.5 h-3.5 animate-bounce" />
                  </p>
                  <p className="text-[10px] opacity-90 font-medium">
                    {selectedTableName ? `Table: ${selectedTableName}` : orderType.replace('_', ' ')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs sm:text-sm font-black bg-black/25 px-3 py-1.5 rounded-xl">
                <span>₹{total.toFixed(0)}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>
          </div>
        )}

        {/* ── Mobile Vertical Categories Modal Sheet ── */}
        {showMobileCategories && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm p-0 animate-in fade-in duration-150">
            <div className="w-full bg-card border-t border-border rounded-t-3xl p-4 shadow-2xl space-y-3 max-h-[82vh] flex flex-col animate-in slide-in-from-bottom duration-200">
              <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30 mx-auto" />
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center text-sm font-bold">
                    📂
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-foreground">Menu Categories</h3>
                    <p className="text-[10px] text-muted-foreground">{mainCategories.length} Categories Available</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMobileCategories(false)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory(null);
                    setShowMobileCategories(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-2xl text-xs font-black border transition-all cursor-pointer",
                    !selectedCategory
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-muted/40 border-border/80 text-foreground hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">✨</span>
                    <span>All Categories (View All)</span>
                  </div>
                  {!selectedCategory && <Check className="w-4 h-4" />}
                </button>

                {mainCategories.map((c) => {
                  const icon = c.icon || CATEGORY_ICONS[c.name] || '🍽️';
                  const isSelected = selectedCategory === c.id;
                  const sec = processedSections.find((s) => s.id === c.id);
                  const count = sec ? sec.totalItems : (c.items?.length || 0);

                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(c.id);
                        setShowMobileCategories(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-2xl text-xs font-black border transition-all cursor-pointer",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-card border-border/80 text-foreground hover:bg-muted"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{icon}</span>
                        <span>{c.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[10px] font-mono px-2 py-0.5 rounded-full",
                          isSelected ? "bg-black/20 text-white" : "bg-muted text-muted-foreground"
                        )}>
                          {count} dishes
                        </span>
                        {isSelected && <Check className="w-4 h-4" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Mobile Itemised Bottom Tray Sheet (QR Menu style sliding tray) ── */}
        {isMobileCartDrawerOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full bg-card border-t border-border rounded-t-3xl shadow-2xl max-h-[88vh] flex flex-col animate-in slide-in-from-bottom duration-200">
              {/* Drag bar and header */}
              <div className="p-3.5 border-b border-border space-y-2 bg-muted/40 shrink-0">
                <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30 mx-auto" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold">
                      <ShoppingCart className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-foreground">Order Ticket ({totalItemsCount} items)</h3>
                      <p className="text-[10px] text-muted-foreground font-semibold">
                        {selectedTableName ? `Table: ${selectedTableName}` : orderType.replace('_', ' ')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {cart.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setCart([])}
                        className="px-2 py-1 rounded-lg text-xs font-bold text-red-400 hover:bg-red-500/10 cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsMobileCartDrawerOpen(false)}
                      className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>

              {/* Itemised list */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-2">
                {cart.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground space-y-2">
                    <div className="text-3xl">🛒</div>
                    <p className="text-xs font-bold">Your cart is empty</p>
                    <Button size="sm" onClick={() => setIsMobileCartDrawerOpen(false)} className="rounded-xl text-xs">
                      Browse Menu Dishes
                    </Button>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-background border border-border shadow-xs"
                    >
                      <div className="flex-1 min-w-0 mr-2">
                        <div className="flex items-center gap-1.5">
                          <div className={cn(
                            'w-2 h-2 rounded-full shrink-0',
                            item.foodType === 'VEG' || item.foodType === 'VEGAN' ? 'bg-emerald-500' : 'bg-red-500'
                          )} />
                          <p className="text-xs font-bold text-foreground truncate">{item.name}</p>
                        </div>
                        <p className="text-xs font-black font-mono text-emerald-400 mt-0.5">
                          ₹{(Number(item.unitPrice) * item.quantity).toFixed(0)}{' '}
                          <span className="text-[10px] text-muted-foreground font-normal">(@ ₹{item.unitPrice})</span>
                        </p>

                        {/* Special Instruction Badge / Button */}
                        {item.notes ? (
                          <button
                            type="button"
                            onClick={() => openItemNoteModal(item)}
                            className="mt-1 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/25 transition-all text-left max-w-full"
                          >
                            <span className="truncate">⚠️ {item.notes}</span>
                            <Edit2 className="w-2.5 h-2.5 shrink-0 ml-1 opacity-70" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openItemNoteModal(item)}
                            className="mt-1 flex items-center gap-1 text-[10.5px] font-semibold text-muted-foreground hover:text-amber-400 transition-colors cursor-pointer"
                          >
                            <MessageSquarePlus className="w-3 h-3" />
                            <span>+ Special Instruction</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border shrink-0">
                        <button
                          type="button"
                          onClick={() => updateQty(item.key, -1)}
                          className="w-7 h-7 rounded-lg bg-background border border-border flex items-center justify-center text-foreground hover:bg-red-500/20 hover:text-red-400 font-bold active:scale-90 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center text-xs font-black font-mono text-foreground">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQty(item.key, 1)}
                          className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold active:scale-90 cursor-pointer shadow-xs"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Bill & Giant Actions */}
              {cart.length > 0 && (
                <div className="p-3.5 border-t border-border bg-muted/30 space-y-2.5 shrink-0">
                  {/* Complimentary Reward Alerts */}
                  {unlockedCombos.length > 0 && (
                    <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-[11px] text-emerald-300 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span>🎁</span>
                        <span className="font-bold truncate">Combo Freebie: {unlockedCombos[0].complementaryItemName}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddComplementaryItem(unlockedCombos[0].complementaryItemName, unlockedCombos[0].name)}
                        className="px-2 py-0.5 rounded-lg bg-emerald-500 text-white font-black text-[10px] shrink-0 cursor-pointer"
                      >
                        + Add Free
                      </button>
                    </div>
                  )}

                  {/* Discount / Coupon Button & Active Pill */}
                  <div className="flex items-center justify-between">
                    {appliedDiscount ? (
                      <div className="flex items-center justify-between w-full p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="font-bold text-emerald-300">{appliedDiscount.label}</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveDiscount}
                          className="text-[10px] font-bold text-rose-400 hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDiscountModal(true)}
                        className="w-full h-8 rounded-xl border-dashed border-primary/50 text-primary text-xs font-bold gap-1.5 cursor-pointer"
                      >
                        <Percent className="w-3.5 h-3.5" />
                        <span>🏷️ Apply Discount / Coupon / Offers</span>
                      </Button>
                    )}
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Items Subtotal:</span>
                      <span className="font-mono font-bold text-foreground">₹{rawSubtotal.toFixed(2)}</span>
                    </div>

                    {discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-400 font-bold">
                        <span>Discount Applied:</span>
                        <span className="font-mono">-₹{discountAmount.toFixed(2)}</span>
                      </div>
                    )}

                    {tax > 0 && taxRate > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>GST ({taxRate}%):</span>
                        <span className="font-mono font-bold text-foreground">₹{tax.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-baseline pt-1 border-t border-border font-black text-sm">
                      <span className="text-muted-foreground uppercase tracking-wider text-xs">Total Payable:</span>
                      <span className="text-xl font-mono text-emerald-400">₹{total.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      size="lg"
                      loading={createOrderMutation.isPending}
                      onClick={() => {
                        handlePlaceOrder();
                        setIsMobileCartDrawerOpen(false);
                      }}
                      className="h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs gap-1.5 shadow-md shadow-emerald-600/30 cursor-pointer"
                    >
                      <Receipt className="w-4 h-4" />
                      <span>Send KOT</span>
                    </Button>

                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => {
                        setIsMobileCartDrawerOpen(false);
                        setCashTendered(total);
                        setShowFastPayModal(true);
                      }}
                      className="h-12 rounded-2xl border-2 border-primary/60 bg-primary/10 hover:bg-primary/20 text-primary font-black text-xs gap-1.5 cursor-pointer"
                    >
                      <Banknote className="w-4 h-4" />
                      <span>Fast Pay</span>
                    </Button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsMobileCartDrawerOpen(false)}
                    className="w-full text-center text-xs font-bold text-muted-foreground hover:text-foreground py-1 cursor-pointer"
                  >
                    ← Add More Dishes from Menu
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          RIGHT PANEL: TOUCH-FRIENDLY ORDER CART & FAST BILLING (DESKTOP ONLY)
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col w-[380px] xl:w-[410px] shrink-0 bg-card border-l border-border h-full overflow-hidden">
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

          <div className="flex items-center justify-between px-2.5 py-1.5 bg-muted/60 border border-border/80 text-xs font-bold">
            <div className="flex items-center gap-1.5 text-foreground">
              {orderType === 'DINE_IN' ? (
                <>
                  <TableIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Table: <span className="text-emerald-500 font-mono font-black">{selectedTableName || 'Selected Table'}</span></span>
                </>
              ) : orderType === 'TAKEAWAY' ? (
                <>
                  <span className="text-sm shrink-0">🛍️</span>
                  <span className="text-indigo-400 font-black">Takeaway Order</span>
                </>
              ) : (
                <>
                  <span className="text-sm shrink-0">🛵</span>
                  <span className="text-purple-400 font-black">Delivery Order</span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => router.push('/tables')}
              className="text-[10px] text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            >
              Change
            </button>
          </div>
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

                  {/* Special Instruction Badge / Button */}
                  {item.notes ? (
                    <button
                      type="button"
                      onClick={() => openItemNoteModal(item)}
                      className="mt-1 flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-xs font-semibold text-amber-300 hover:bg-amber-500/25 transition-all text-left max-w-full"
                    >
                      <span className="truncate">⚠️ {item.notes}</span>
                      <Edit2 className="w-3 h-3 shrink-0 ml-1 opacity-75" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openItemNoteModal(item)}
                      className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-amber-400 transition-colors cursor-pointer"
                    >
                      <MessageSquarePlus className="w-3.5 h-3.5" />
                      <span>+ Special Instruction</span>
                    </button>
                  )}
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
            {/* Unlocked Combo / Threshold Reward Alerts */}
            {unlockedCombos.length > 0 && (
              <div className="p-2.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base">🎁</span>
                  <div className="min-w-0">
                    <p className="font-bold truncate">Combo Freebie Unlocked!</p>
                    <p className="text-[10px] text-emerald-400/80 truncate">1x Free {unlockedCombos[0].complementaryItemName}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleAddComplementaryItem(unlockedCombos[0].complementaryItemName, unlockedCombos[0].name)}
                  className="px-2.5 py-1 rounded-xl bg-emerald-500 text-white font-black text-xs shrink-0 hover:bg-emerald-600 cursor-pointer shadow-xs"
                >
                  + Add Free
                </button>
              </div>
            )}

            {/* Discount / Coupon Button & Active Pill */}
            <div className="flex items-center justify-between">
              {appliedDiscount ? (
                <div className="flex items-center justify-between w-full p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-xs">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-emerald-400" />
                    <div>
                      <p className="font-bold text-emerald-300">{appliedDiscount.label}</p>
                      {appliedDiscount.reason && (
                        <p className="text-[10px] text-emerald-400/80">{appliedDiscount.reason}</p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveDiscount}
                    className="text-xs font-bold text-rose-400 hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDiscountModal(true)}
                  className="w-full h-9 rounded-2xl border-dashed border-primary/50 text-primary text-xs font-bold gap-1.5 hover:bg-primary/10 cursor-pointer"
                >
                  <Percent className="w-4 h-4" />
                  <span>🏷️ Apply Discount / Coupon / Offers</span>
                </Button>
              )}
            </div>

            {/* Quick Bill Breakdown */}
            <div className="space-y-1.5 text-xs font-normal">
              <div className="flex justify-between text-muted-foreground">
                <span>Items Subtotal:</span>
                <span className="font-semibold font-mono tabular-nums text-foreground">₹{rawSubtotal.toFixed(2)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>Discount Applied:</span>
                  <span className="font-semibold font-mono tabular-nums">-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}

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
          MODAL: APPLY DISCOUNT, COUPON & PROMO STUDIO (Types 1, 2, 3, 4)
      ───────────────────────────────────────────────────────────────────────────── */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-primary/20 text-primary flex items-center justify-center font-bold">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground">Discounts &amp; Promo Offers</h3>
                  <p className="text-xs text-muted-foreground">Current Items Subtotal: <strong className="text-foreground font-mono">₹{rawSubtotal.toFixed(2)}</strong></p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDiscountModal(false)}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-muted rounded-2xl shrink-0 text-xs font-bold">
              <button
                type="button"
                onClick={() => setDiscountModalTab('CUSTOM')}
                className={cn(
                  "py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5",
                  discountModalTab === 'CUSTOM' ? "bg-background text-foreground shadow-xs font-black" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span>💰</span> Custom
              </button>
              <button
                type="button"
                onClick={() => setDiscountModalTab('COUPONS')}
                className={cn(
                  "py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5",
                  discountModalTab === 'COUPONS' ? "bg-background text-foreground shadow-xs font-black" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span>🎟️</span> Coupons ({promotions.filter((p) => p.type === 'COUPON_LIMITED_TIME').length})
              </button>
              <button
                type="button"
                onClick={() => setDiscountModalTab('OFFERS')}
                className={cn(
                  "py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5",
                  discountModalTab === 'OFFERS' ? "bg-background text-foreground shadow-xs font-black" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span>🎁</span> Auto Offers ({thresholdPromos.length + comboPromos.length})
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* ── TAB 1: CUSTOM CASHIER ADDITIONAL DISCOUNT (Type 4) ── */}
              {discountModalTab === 'CUSTOM' && (
                <div className="space-y-4">
                  {/* Discount Type Toggle */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Discount Calculation Method:</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCustomDiscountType('FLAT')}
                        className={cn(
                          "py-2.5 px-3 rounded-2xl border text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer",
                          customDiscountType === 'FLAT'
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <span>₹</span> Flat Rupee Off
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomDiscountType('PERCENTAGE')}
                        className={cn(
                          "py-2.5 px-3 rounded-2xl border text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer",
                          customDiscountType === 'PERCENTAGE'
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <span>%</span> Percentage Off
                      </button>
                    </div>
                  </div>

                  {/* Quick Presets */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground">Quick Presets:</label>
                    <div className="grid grid-cols-4 gap-2">
                      {customDiscountType === 'PERCENTAGE'
                        ? ['5', '10', '15', '20'].map((pct) => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => setCustomDiscountValue(pct)}
                              className={cn(
                                "py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                                customDiscountValue === pct ? "bg-primary/20 border-primary text-primary font-black" : "bg-muted/40 border-border hover:bg-muted"
                              )}
                            >
                              {pct}%
                            </button>
                          ))
                        : ['50', '100', '200', '500'].map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setCustomDiscountValue(amt)}
                              className={cn(
                                "py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                                customDiscountValue === amt ? "bg-primary/20 border-primary text-primary font-black" : "bg-muted/40 border-border hover:bg-muted"
                              )}
                            >
                              ₹{amt}
                            </button>
                          ))}
                    </div>
                  </div>

                  {/* Value Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      {customDiscountType === 'PERCENTAGE' ? 'Enter Percentage (%):' : 'Enter Flat Amount (₹):'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                        {customDiscountType === 'PERCENTAGE' ? '%' : '₹'}
                      </span>
                      <Input
                        type="number"
                        min="1"
                        max={customDiscountType === 'PERCENTAGE' ? 100 : rawSubtotal}
                        placeholder={customDiscountType === 'PERCENTAGE' ? 'e.g. 10' : 'e.g. 150'}
                        value={customDiscountValue}
                        onChange={(e) => setCustomDiscountValue(e.target.value)}
                        className="pl-8 h-11 rounded-2xl text-sm font-bold font-mono"
                      />
                    </div>
                  </div>

                  {/* Reason Presets */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Discount Reason / Authorization:</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        'Manager Goodwill',
                        'VIP Regular Customer',
                        'Staff / Partner Discount',
                        'Delay / Service Issue',
                        'Damaged Item Compensation',
                        'Custom Reason',
                      ].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setCustomDiscountReason(r)}
                          className={cn(
                            "py-2 px-3 rounded-xl border text-[11px] font-bold text-left truncate transition-all cursor-pointer",
                            customDiscountReason === r
                              ? "bg-primary/15 border-primary text-primary font-black"
                              : "bg-muted/40 border-border/80 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {r}
                        </button>
                      ))}
                    </div>

                    {customDiscountReason === 'Custom Reason' && (
                      <Input
                        type="text"
                        placeholder="Type custom authorization reason..."
                        value={customReasonInput}
                        onChange={(e) => setCustomReasonInput(e.target.value)}
                        className="mt-2 h-10 rounded-xl text-xs"
                      />
                    )}
                  </div>

                  {/* Preview Banner */}
                  {Number(customDiscountValue) > 0 && (
                    <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">Estimated Deduction:</span>
                      <span className="font-mono font-black text-emerald-400 text-sm">
                        -₹{(
                          customDiscountType === 'PERCENTAGE'
                            ? (rawSubtotal * Number(customDiscountValue)) / 100
                            : Number(customDiscountValue)
                        ).toFixed(2)}
                      </span>
                    </div>
                  )}

                  <Button
                    type="button"
                    onClick={handleApplyCustomDiscount}
                    className="w-full h-12 rounded-2xl font-black text-xs gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Apply Custom Discount to Order</span>
                  </Button>
                </div>
              )}

              {/* ── TAB 2: AVAILABLE COUPON CODES (Type 1) ── */}
              {discountModalTab === 'COUPONS' && (
                <div className="space-y-4">
                  {/* Manual Code Entry */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Apply by Coupon Code:</label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="ENTER COUPON CODE..."
                        value={couponCodeInput}
                        onChange={(e) => {
                          setCouponCodeInput(e.target.value.toUpperCase());
                          setCouponInputError(null);
                        }}
                        className="h-10 rounded-2xl uppercase font-mono font-bold text-xs"
                      />
                      <Button
                        type="button"
                        onClick={handleApplyCouponCode}
                        className="h-10 px-4 rounded-2xl text-xs font-black cursor-pointer shrink-0"
                      >
                        Apply
                      </Button>
                    </div>
                    {couponInputError && (
                      <p className="text-[11px] text-rose-400 font-semibold pl-1">⚠️ {couponInputError}</p>
                    )}
                  </div>

                  {/* Active Coupons List */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground">Active Promotional Coupons:</label>
                    {promotions.filter((p) => p.type === 'COUPON_LIMITED_TIME').length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground text-xs bg-muted/20 rounded-2xl border border-border/80">
                        No active limited-time coupons found. You can create one in Marketing Studio.
                      </div>
                    ) : (
                      promotions.filter((p) => p.type === 'COUPON_LIMITED_TIME').map((cp) => {
                        const isApplied = appliedDiscount?.code === cp.code;
                        const discLabel = cp.discountType === 'PERCENTAGE' ? `${cp.discountValue}% OFF` : `₹${cp.discountValue} FLAT OFF`;

                        return (
                          <div
                            key={cp.id}
                            className={cn(
                              "p-3 rounded-2xl border transition-all flex items-center justify-between gap-2 shadow-xs",
                              isApplied ? "bg-emerald-950/40 border-emerald-500/60" : "bg-background border-border"
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0 text-sm font-bold">
                                🎟️
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono font-black text-xs px-2 py-0.5 rounded-lg bg-primary text-primary-foreground">
                                    {cp.code}
                                  </span>
                                  <span className="font-bold text-xs text-foreground">{discLabel}</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                                  {cp.minOrderAmount ? `Min bill ₹${cp.minOrderAmount}` : 'No min bill'}
                                  {cp.maxDiscountCap ? ` • Max cap ₹${cp.maxDiscountCap}` : ''}
                                  {cp.validTo ? ` • Valid till ${cp.validTo}` : ''}
                                </p>
                              </div>
                            </div>

                            <div>
                              {isApplied ? (
                                <button
                                  type="button"
                                  onClick={handleRemoveDiscount}
                                  className="px-3 py-1.5 rounded-xl text-xs font-black bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30 cursor-pointer"
                                >
                                  Applied (Remove)
                                </button>
                              ) : (
                                <Button
                                  size="sm"
                                  type="button"
                                  onClick={() => handleApplyCoupon(cp)}
                                  className="h-8 px-3 rounded-xl text-xs font-black cursor-pointer"
                                >
                                  Apply Coupon
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* ── TAB 3: BILL THRESHOLDS & ITEM COMBOS (Type 2 & 3) ── */}
              {discountModalTab === 'OFFERS' && (
                <div className="space-y-4">
                  {/* Bill Threshold Promos */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <span>🎁 Spend Threshold Rewards</span>
                      <Badge variant="outline" className="text-[9px]">{thresholdPromos.length} Offers</Badge>
                    </h4>

                    {thresholdPromos.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic pl-1">No threshold offers currently active.</p>
                    ) : (
                      thresholdPromos.map((thresh) => {
                        const targetAmt = Number(thresh.thresholdAmount || 0);
                        const isUnlocked = rawSubtotal >= targetAmt;

                        return (
                          <div
                            key={thresh.id}
                            className={cn(
                              "p-3 rounded-2xl border transition-all space-y-2",
                              isUnlocked ? "bg-emerald-950/30 border-emerald-500/50" : "bg-muted/20 border-border"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">💰</span>
                                <div>
                                  <p className="text-xs font-black text-foreground">{thresh.name}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {thresh.rewardType === 'FREE_ITEM'
                                      ? `Get 1 Free ${thresh.freeMenuItemName || 'Dish'} on bills above ₹${targetAmt}`
                                      : `Get ${thresh.discountType === 'PERCENTAGE' ? `${thresh.discountValue}% OFF` : `₹${thresh.discountValue} OFF`} on bills above ₹${targetAmt}`}
                                  </p>
                                </div>
                              </div>

                              {isUnlocked ? (
                                thresh.rewardType === 'FREE_ITEM' ? (
                                  <Button
                                    size="sm"
                                    type="button"
                                    onClick={() => handleAddComplementaryItem(thresh.freeMenuItemName, thresh.name)}
                                    className="h-7 px-2.5 rounded-xl text-[10px] font-black bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                                  >
                                    + Add Free Dish
                                  </Button>
                                ) : (
                                  <Badge className="bg-emerald-500 text-white text-[9px] font-black">
                                    Auto-Applied ✅
                                  </Badge>
                                )
                              ) : (
                                <span className="text-[10px] font-bold text-amber-400 font-mono">
                                  Add ₹{(targetAmt - rawSubtotal).toFixed(0)} more
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Combo Promos */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    <h4 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <span>🍔+☕ Food Combo Specials</span>
                      <Badge variant="outline" className="text-[9px]">{comboPromos.length} Offers</Badge>
                    </h4>

                    {comboPromos.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic pl-1">No combo promotions currently active.</p>
                    ) : (
                      comboPromos.map((combo) => {
                        const isUnlocked = unlockedCombos.some((c) => c.id === combo.id);
                        const triggers = Array.isArray(combo.triggerItemNames) ? combo.triggerItemNames.join(' + ') : 'Triggers';

                        return (
                          <div
                            key={combo.id}
                            className={cn(
                              "p-3 rounded-2xl border transition-all flex items-center justify-between gap-2",
                              isUnlocked ? "bg-emerald-950/30 border-emerald-500/50" : "bg-muted/20 border-border"
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <span className="text-lg">🔥</span>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-black text-foreground truncate">{combo.name}</p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  Buy <strong className="text-amber-400 font-bold">{triggers}</strong> → Get <strong className="text-emerald-400 font-bold">1 Free {combo.complementaryItemName}</strong>
                                </p>
                              </div>
                            </div>

                            <div>
                              <Button
                                size="sm"
                                type="button"
                                onClick={() => handleAddComplementaryItem(combo.complementaryItemName, combo.name)}
                                className={cn(
                                  "h-7 px-2.5 rounded-xl text-[10px] font-black cursor-pointer",
                                  isUnlocked ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-muted text-foreground hover:bg-muted/80"
                                )}
                              >
                                {isUnlocked ? '+ Claim Freebie' : '+ Add Freebie'}
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL: ITEM SPECIAL INSTRUCTION / CHEF NOTES
      ───────────────────────────────────────────────────────────────────────────── */}
      {noteModalItemKey && (() => {
        const targetItem = cart.find((c) => c.key === noteModalItemKey);
        const presetNotes = [
          'Less Spicy',
          'Extra Spicy',
          'No Onion / Garlic',
          'Less Oil / Healthy',
          'Make it Crispy',
          'Serve Extra Hot',
          'Pack Separately',
          'No Salt',
          'Well Done',
        ];
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                    <MessageSquarePlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-foreground">Special Instruction</h3>
                    <p className="text-xs text-muted-foreground truncate max-w-[220px]">
                      {targetItem?.name || 'Item'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNoteModalItemKey(null);
                    setItemNoteText('');
                  }}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Input Box */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground">Kitchen / Chef Instructions:</label>
                <textarea
                  value={itemNoteText}
                  onChange={(e) => setItemNoteText(e.target.value)}
                  placeholder="e.g., Less spicy, no butter on naan, make it extra crispy..."
                  rows={3}
                  className="w-full rounded-2xl bg-muted/50 border border-border p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                  autoFocus
                />
              </div>

              {/* Quick Suggestion Chips */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Quick Suggestions:</span>
                <div className="flex flex-wrap gap-1.5">
                  {presetNotes.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setItemNoteText((prev) => (prev ? `${prev}, ${preset}` : preset));
                      }}
                      className="px-2.5 py-1 rounded-xl bg-muted hover:bg-amber-500/20 hover:text-amber-300 hover:border-amber-500/40 text-xs font-semibold text-foreground border border-border transition-all cursor-pointer"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center gap-2 pt-2">
                {targetItem?.notes && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setItemNoteText('');
                      setCart((prev) =>
                        prev.map((c) => (c.key === noteModalItemKey ? { ...c, notes: undefined } : c))
                      );
                      setNoteModalItemKey(null);
                    }}
                    className="h-11 rounded-2xl border-rose-500/30 text-rose-400 hover:bg-rose-500/10 font-bold text-xs cursor-pointer"
                  >
                    Remove
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setNoteModalItemKey(null);
                    setItemNoteText('');
                  }}
                  className="flex-1 h-11 rounded-2xl font-bold text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={saveItemNote}
                  className="flex-1 h-11 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Instruction</span>
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
