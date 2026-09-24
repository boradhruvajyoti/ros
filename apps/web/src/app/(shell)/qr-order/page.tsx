'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  QrCode, UtensilsCrossed, Plus, Minus, ShoppingBag,
  Sparkles, CheckCircle2, ChevronRight, ShieldCheck, Flame,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiGet, apiPost } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@ros/utils';

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  foodType: 'VEG' | 'NON_VEG' | 'EGG' | 'VEGAN';
  isAvailable: boolean;
  category?: { id: string; name: string };
  variants: Array<{ id: string; name: string; price: number }>;
}

interface Table {
  id: string;
  name: string;
}

export default function QrOrderPage() {
  const queryClient = useQueryClient();
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [cart, setCart] = useState<{ [itemId: string]: number }>({});
  const [orderPlaced, setOrderPlaced] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  const { data: menuItems = [], isLoading: isLoadingMenu } = useQuery<MenuItem[]>({
    queryKey: ['menu', 'items'],
    queryFn: () => apiGet<MenuItem[]>('/menu/items'),
  });

  const { data: tables = [] } = useQuery<Table[]>({
    queryKey: ['tables'],
    queryFn: () => apiGet<Table[]>('/tables'),
  });

  const placeOrderMutation = useMutation({
    mutationFn: async (payload: any) => apiPost('/orders', payload),
    onSuccess: (res: any) => {
      setOrderPlaced(res.orderNumber || 'ORD-KOT');
      setCart({});
      toast.success('Order Placed', 'Sent directly to the kitchen display.');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err: any) => toast.error('Order Failed', err.message || 'Could not place order'),
  });

  const addToCart = (id: string) => {
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => {
      const copy = { ...prev };
      if (copy[id] > 1) {
        copy[id]--;
      } else {
        delete copy[id];
      }
      return copy;
    });
  };

  const categories = ['ALL', ...Array.from(new Set(menuItems.map((m) => m.category?.name).filter(Boolean))) as string[]];

  const filteredMenu = menuItems.filter((item) => {
    if (!item.isAvailable) return false;
    if (filterCategory === 'ALL') return true;
    return item.category?.name === filterCategory;
  });

  const cartItems = Object.entries(cart).map(([id, qty]) => {
    const item = menuItems.find((m) => m.id === id);
    const price = item?.variants?.[0]?.price || 0;
    return { item, qty, price, id };
  }).filter(c => c.item);

  const subtotal = cartItems.reduce((acc, c) => acc + c.price * c.qty, 0);
  const tax = subtotal * 0.05; // 5% GST
  const grandTotal = subtotal + tax;

  const handlePlaceOrder = () => {
    if (cartItems.length === 0) return;
    const tableId = selectedTable || tables[0]?.id;

    placeOrderMutation.mutate({
      type: 'DINE_IN',
      tableId,
      items: cartItems.map((c) => ({
        menuItemId: c.item!.id,
        quantity: c.qty,
        variantId: c.item!.variants?.[0]?.id,
      })),
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card/60 p-5 rounded-3xl border border-border backdrop-blur-sm">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <QrCode className="w-6 h-6 text-primary" />
            Contactless QR Dine-In Ordering
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Guest self-service digital menu with real-time dish availability and instant KOT dispatch
          </p>
        </div>

        {/* Table Selector */}
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-card border border-border">
          <span className="text-xs text-muted-foreground font-bold">Select Table:</span>
          <select
            value={selectedTable || tables[0]?.id || ''}
            onChange={(e) => setSelectedTable(e.target.value)}
            className="bg-transparent text-xs font-black text-primary focus:outline-none cursor-pointer"
          >
            {tables.map((t) => (
              <option key={t.id} value={t.id} className="bg-card text-foreground">
                Table {t.name}
              </option>
            ))}
            {tables.length === 0 && <option value="">Default Counter</option>}
          </select>
        </div>
      </div>

      {/* Order Confirmation Banner */}
      {orderPlaced && (
        <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
          <div className="flex items-center gap-2 text-emerald-500 font-black text-base">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            Order #{orderPlaced} Placed Successfully!
          </div>
          <p className="text-xs text-muted-foreground">
            Your kitchen order ticket (KOT) has been routed directly to the kitchen display.
          </p>
          <Button size="sm" onClick={() => setOrderPlaced(null)} className="mt-2 text-xs font-bold">
            Order More Dishes
          </Button>
        </div>
      )}

      {/* Two Column Ordering Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Menu Catalog (Left) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Category Chips */}
          <div className="flex flex-wrap items-center gap-2 pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterCategory === cat
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat === 'ALL' ? 'All Dishes' : cat}
              </button>
            ))}
          </div>

          {/* Menu Items Grid */}
          {isLoadingMenu ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs">Loading menu catalogue...</p>
            </div>
          ) : filteredMenu.length === 0 ? (
            <Card className="p-16 text-center border-dashed border-2 border-border/80 bg-card/30 rounded-3xl">
              <UtensilsCrossed className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <h3 className="text-lg font-bold text-foreground">No Available Dishes</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                Add dishes to your menu catalogue to enable QR ordering.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredMenu.map((item) => {
                const inCartQty = cart[item.id] || 0;
                const price = item.variants?.[0]?.price || 0;

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-3xl border border-border bg-card/70 backdrop-blur hover:border-border/80 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs">
                              {item.foodType === 'VEG' ? '🟢' : item.foodType === 'NON_VEG' ? '🔴' : item.foodType === 'EGG' ? '🟡' : '🌱'}
                            </span>
                            <h3 className="font-bold text-sm text-foreground">{item.name}</h3>
                          </div>
                          <p className="text-xs font-bold text-primary mt-1">{formatCurrency(price)}</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-2">
                        {item.description || 'Freshly prepared by house chefs.'}
                      </p>
                    </div>

                    {/* Add Button */}
                    <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-end">
                      {inCartQty > 0 ? (
                        <div className="flex items-center gap-2 bg-primary/15 border border-primary/30 rounded-xl p-1">
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-primary hover:bg-primary/20 font-bold"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-black text-primary px-1">{inCartQty}</span>
                          <button
                            onClick={() => addToCart(item.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-primary hover:bg-primary/20 font-bold"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addToCart(item.id)}
                          className="h-8 text-xs font-bold gap-1 rounded-xl border-primary/40 text-primary hover:bg-primary/10"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add to Cart
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Guest Cart (Right) */}
        <div className="lg:col-span-4">
          <div className="p-6 rounded-3xl border border-border bg-card/80 backdrop-blur sticky top-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
                Table Cart
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold">
                {cartItems.reduce((acc, i) => acc + i.qty, 0)} Items
              </span>
            </div>

            {cartItems.length > 0 ? (
              <div className="space-y-3">
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1 no-scrollbar">
                  {cartItems.map(({ item, qty, price, id }) => (
                    <div
                      key={id}
                      className="p-3 rounded-2xl bg-background/50 border border-border/50 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-foreground">{item!.name}</p>
                        <p className="text-[11px] text-muted-foreground">{formatCurrency(price)} × {qty}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => removeFromCart(id)}
                          className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold text-primary">{qty}</span>
                        <button
                          onClick={() => addToCart(id)}
                          className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Calculation */}
                <div className="space-y-1.5 pt-3 border-t border-border text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-mono">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Estimated Tax (5%)</span>
                    <span className="font-mono">{formatCurrency(tax)}</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-foreground pt-2 border-t border-border/50">
                    <span>Total Bill</span>
                    <span className="text-primary font-mono">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>

                <Button
                  onClick={handlePlaceOrder}
                  disabled={placeOrderMutation.isPending}
                  className="w-full py-5 font-bold text-sm shadow-lg gap-2 mt-2 rounded-2xl"
                >
                  <UtensilsCrossed className="w-4 h-4" />
                  {placeOrderMutation.isPending ? 'Sending...' : 'Send Order to Kitchen'}
                </Button>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                <ShoppingBag className="w-8 h-8 mx-auto text-muted-foreground/40" />
                <p>Your table cart is empty.</p>
                <p className="text-[11px]">Tap "+ Add to Cart" on any dish to order.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
