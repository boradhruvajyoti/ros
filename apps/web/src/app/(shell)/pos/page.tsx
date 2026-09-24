'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, Minus, Trash2, ChevronRight, User, TableIcon,
  ShoppingCart, Receipt, CreditCard, Split, Printer, RotateCcw,
  Check, Leaf, Drumstick, Sparkles, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { apiGet, apiPost } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { formatCurrency, addAmounts, multiplyAmount } from '@ros/utils';
import { generateUUID } from '@ros/utils';

interface Variant {
  id: string;
  name: string;
  price: number | string;
}

interface MenuItem {
  id: string;
  name: string;
  foodType?: string;
  variants?: Variant[];
  modifierGroups?: any[];
}

interface Category {
  id: string;
  name: string;
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
  notes?: string;
  modifiers: { id: string; name: string; price: number }[];
}

const FOOD_TYPE_ICON = {
  VEG:     <div className="w-3.5 h-3.5 border-2 border-green-500 rounded-sm flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /></div>,
  NON_VEG: <div className="w-3.5 h-3.5 border-2 border-red-500 rounded-sm flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-red-500" /></div>,
  EGG:     <div className="w-3.5 h-3.5 border-2 border-yellow-500 rounded-sm flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500" /></div>,
  VEGAN:   <div className="w-3.5 h-3.5 border-2 border-emerald-500 rounded-sm flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /></div>,
};

const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'cat-starters',
    name: 'Starters & Kebabs',
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
    items: [
      { id: 'item-butter-naan', name: 'Butter Naan', foodType: 'VEG', variants: [{ id: 'v-bn-1', name: 'Piece', price: 50 }] },
      { id: 'item-garlic-naan', name: 'Garlic Naan', foodType: 'VEG', variants: [{ id: 'v-gn-1', name: 'Piece', price: 65 }] },
      { id: 'item-jeera-rice', name: 'Jeera Rice', foodType: 'VEG', variants: [{ id: 'v-jr-1', name: 'Plate', price: 149 }] }
    ]
  },
  {
    id: 'cat-beverages',
    name: 'Beverages & Mocktails',
    items: [
      { id: 'item-mango-lassi', name: 'Mango Lassi', foodType: 'VEG', variants: [{ id: 'v-ml-1', name: 'Glass', price: 129 }] },
      { id: 'item-masala-chai', name: 'Masala Chai', foodType: 'VEG', variants: [{ id: 'v-mc-1', name: 'Cup', price: 60 }] },
      { id: 'item-fresh-lime-soda', name: 'Fresh Lime Soda', foodType: 'VEG', variants: [{ id: 'v-fl-1', name: 'Glass', price: 89 }] }
    ]
  }
];

type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
const ORDER_TYPES: OrderType[] = ['DINE_IN', 'TAKEAWAY', 'DELIVERY'];
const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  DINE_IN: 'Dine In', TAKEAWAY: 'Takeaway', DELIVERY: 'Delivery',
};

export default function POSPage() {
  const queryClient = useQueryClient();

  // ── State ────────────────────────────────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('DINE_IN');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  // ── Data ─────────────────────────────────────────────────────────────────
  const { data: rawCategories, isLoading } = useQuery<Category[]>({
    queryKey: ['pos-menu'],
    queryFn: async () => {
      try {
        const res = await apiGet<Category[]>('/menu/pos-menu');
        return Array.isArray(res) && res.length > 0 ? res : DEFAULT_CATEGORIES;
      } catch {
        return DEFAULT_CATEGORIES;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: rawTables = [] } = useQuery({
    queryKey: ['tables'],
    queryFn: async () => {
      try {
        const res = await apiGet<any[]>('/tables?status=AVAILABLE');
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const categories = useMemo(() => {
    return Array.isArray(rawCategories) && rawCategories.length > 0 ? rawCategories : DEFAULT_CATEGORIES;
  }, [rawCategories]);

  const tables = useMemo(() => {
    return Array.isArray(rawTables) ? rawTables : [];
  }, [rawTables]);

  // ── Computed ──────────────────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    const all = categories.flatMap((c) => (Array.isArray(c?.items) ? c.items : []));
    if (!search) {
      return selectedCategory
        ? categories.find((c) => c?.id === selectedCategory)?.items || []
        : all;
    }
    return all.filter((i) => i?.name?.toLowerCase().includes(search.toLowerCase()));
  }, [categories, selectedCategory, search]);

  const subtotal = useMemo(() => {
    return cart.reduce((s, i) => s + (Number(i.unitPrice) * (i.quantity || 1)), 0);
  }, [cart]);

  const tax = useMemo(() => Math.round(subtotal * 0.05), [subtotal]); // 5% GST simplified
  const total = useMemo(() => subtotal + tax, [subtotal, tax]);

  // ── Cart actions ─────────────────────────────────────────────────────────
  const addToCart = useCallback((item: MenuItem) => {
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
        modifiers: [],
      }];
    });
  }, []);

  const updateQty = useCallback((key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => c.key === key ? { ...c, quantity: c.quantity + delta } : c)
        .filter((c) => c.quantity > 0)
    );
  }, []);

  const removeItem = useCallback((key: string) => {
    setCart((prev) => prev.filter((c) => c.key !== key));
  }, []);

  // ── Create order ─────────────────────────────────────────────────────────
  const createOrderMutation = useMutation({
    mutationFn: () =>
      apiPost('/orders', {
        type: orderType,
        tableId: selectedTable || undefined,
        notes,
        clientId: generateUUID(),
        items: cart.map((c) => ({
          menuItemId: c.menuItemId,
          variantId: c.variantId,
          quantity: c.quantity,
          notes: c.notes,
          modifierIds: Array.isArray(c.modifiers) ? c.modifiers.map((m) => m.id) : [],
        })),
      }),
    onSuccess: (order: any) => {
      toast.success('Order created!', `Order ${order?.orderNumber || '#POS-NEW'} sent to kitchen`);
      setCart([]);
      setNotes('');
      setSelectedTable(null);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: () => toast.error('Failed to create order'),
  });

  const handlePlaceOrder = () => {
    if (cart.length === 0) { toast.error('Cart is empty'); return; }
    createOrderMutation.mutate();
  };

  return (
    <div className="flex h-full gap-0 -m-6 overflow-hidden">
      {/* ── Left: Menu ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 border-r border-border bg-background">
        {/* Search + order type */}
        <div className="p-4 border-b border-border space-y-3 shrink-0">
          <div className="flex gap-2">
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelectedCategory(null); }}
              placeholder="Search menu items..."
              leftIcon={<Search />}
              className="flex-1"
            />
            <div className="flex rounded-lg border border-border overflow-hidden">
              {ORDER_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setOrderType(t)}
                  className={cn(
                    'px-3 py-2 text-xs font-medium transition-colors',
                    orderType === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  {ORDER_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Categories */}
          {!search && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  'shrink-0 px-4 py-1.5 rounded-full text-xs font-medium border transition-all',
                  !selectedCategory
                    ? 'bg-primary text-primary-foreground border-transparent'
                    : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                )}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={cn(
                    'shrink-0 px-4 py-1.5 rounded-full text-xs font-medium border transition-all',
                    selectedCategory === c.id
                      ? 'bg-primary text-primary-foreground border-transparent'
                      : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Items grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredItems.map((item) => {
                const variants = Array.isArray(item.variants) && item.variants.length > 0 ? item.variants : [];
                const basePrice = Number(variants[0]?.price || 0);
                const inCart = cart.filter((c) => c.menuItemId === item.id).reduce((s, c) => s + c.quantity, 0);
                const foodIcon = (item.foodType && FOOD_TYPE_ICON[item.foodType as keyof typeof FOOD_TYPE_ICON]) || FOOD_TYPE_ICON.VEG;

                return (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="pos-item-card text-left relative p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition shadow-sm"
                  >
                    {/* Food type indicator */}
                    <div className="absolute top-2.5 right-2.5">
                      {foodIcon}
                    </div>

                    {inCart > 0 && (
                      <div className="absolute top-2.5 left-2.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                        {inCart}
                      </div>
                    )}

                    <div className="mt-4">
                      <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">{item.name}</p>
                      {variants.length > 1 && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {variants.map((v) => v.name).join(' / ')}
                        </p>
                      )}
                      <p className="text-sm font-bold text-primary mt-1.5 tabular">
                        {variants.length > 1 ? 'from ' : ''}₹{basePrice.toFixed(0)}
                      </p>
                    </div>
                  </button>
                );
              })}

              {filteredItems.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm">No items found</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Cart / Order panel ────────────────────────────────────────── */}
      <div className="flex flex-col w-[340px] shrink-0 bg-card">
        {/* Cart header */}
        <div className="p-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-foreground flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" />
              Current Order
            </h2>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1">
                <Trash2 className="w-3 h-3" /> Clear
              </button>
            )}
          </div>

          {/* Table selector for dine-in */}
          {orderType === 'DINE_IN' && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {tables.slice(0, 8).map((t: any) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTable(t.id === selectedTable ? null : t.id)}
                  className={cn(
                    'shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                    selectedTable === t.id
                      ? 'bg-primary text-primary-foreground border-transparent'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  )}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <ShoppingCart className="w-7 h-7 opacity-30" />
              </div>
              <p className="text-sm font-medium">Cart is empty</p>
              <p className="text-xs text-center mt-1 opacity-60">Tap an item on the left to add it to the order</p>
            </div>
          ) : (
            <div className="p-3 space-y-1.5">
              {cart.map((item) => (
                <div key={item.key} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 group transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.variantName}</p>
                    <p className="text-xs font-bold text-primary tabular mt-0.5">₹{(Number(item.unitPrice) * item.quantity).toFixed(0)}</p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => updateQty(item.key, -1)}
                      className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-sm font-bold tabular">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(item.key, 1)}
                      className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals + actions */}
        {cart.length > 0 && (
          <div className="border-t border-border p-4 space-y-4 shrink-0">
            {/* Totals */}
            <div className="space-y-1.5">
              {[
                { label: 'Subtotal', value: subtotal },
                { label: 'GST (5%)', value: tax },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm text-muted-foreground">
                  <span>{label}</span>
                  <span className="tabular font-medium">₹{Number(value).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-foreground text-base pt-1 border-t border-border">
                <span>Total</span>
                <span className="text-primary tabular">₹{Number(total).toFixed(2)}</span>
              </div>
            </div>

            {/* Notes */}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Order notes..."
              rows={2}
              className="w-full text-xs rounded-lg border border-border bg-background p-2.5 resize-none placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" /> Hold
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Printer className="w-3.5 h-3.5" /> Print KOT
              </Button>
            </div>

            <Button
              className="w-full"
              size="lg"
              loading={createOrderMutation.isPending}
              onClick={handlePlaceOrder}
            >
              <Receipt className="w-4 h-4 mr-2" />
              Place Order — ₹{Number(total).toFixed(2)}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
