'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  UtensilsCrossed, Plus, Minus, ShoppingBag, CheckCircle2,
  Clock, Sparkles, ChefHat, Phone, MapPin, AlertCircle, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@ros/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default function PublicTableOrderPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableData, setTableData] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [cart, setCart] = useState<{ [itemId: string]: { item: any; variant: any; qty: number } }>({});
  const [guestNotes, setGuestNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<any | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/tables/public/qr/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error('Table QR token not found');
        return res.json();
      })
      .then((data) => {
        setTableData(data.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Could not load table menu');
        setLoading(false);
      });
  }, [token]);

  const addToCart = (item: any) => {
    const variant = item.variants?.[0];
    setCart((prev) => {
      const existing = prev[item.id];
      const nextQty = existing ? existing.qty + 1 : 1;
      return { ...prev, [item.id]: { item, variant, qty: nextQty } };
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const copy = { ...prev };
      if (!copy[itemId]) return prev;
      if (copy[itemId].qty > 1) {
        copy[itemId].qty--;
      } else {
        delete copy[itemId];
      }
      return copy;
    });
  };

  const cartList = Object.values(cart);
  const subtotal = cartList.reduce((acc, c) => acc + (c.variant?.price || 0) * c.qty, 0);

  const taxRate = (() => {
    try {
      const rawSettings = tableData?.restaurant?.settings;
      const parsed = typeof rawSettings === 'string' ? JSON.parse(rawSettings) : (rawSettings || {});
      return parsed?.taxRate !== undefined ? Number(parsed.taxRate) : 0;
    } catch {
      return 0;
    }
  })();

  const gst = taxRate > 0 ? (subtotal * (taxRate / 100)) : 0;
  const total = subtotal + gst;

  const handlePlaceOrder = async () => {
    if (cartList.length === 0) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/tables/public/qr/${token}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: guestNotes.trim() || undefined,
          items: cartList.map((c) => ({
            menuItemId: c.item.id,
            variantId: c.variant?.id,
            quantity: c.qty,
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to place order');

      setOrderPlaced(json.data);
      setCart({});
    } catch (err: any) {
      alert(err.message || 'Failed to send order to kitchen');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Poll order status when an order is placed
  useEffect(() => {
    if (!orderPlaced?.id || !token) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/tables/public/qr/${token}/orders/${orderPlaced.id}`);
        if (!res.ok) return;
        const json = await res.json();
        if (json.data) {
          setOrderPlaced(json.data);
        }
      } catch (err) {
        // silent catch for polling
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [orderPlaced?.id, token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 space-y-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-muted-foreground">Loading Table Menu...</p>
      </div>
    );
  }

  if (error || !tableData) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center space-y-4">
        <AlertCircle className="w-16 h-16 text-rose-500" />
        <h2 className="text-xl font-bold">QR Code Expired or Invalid</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Please ask your dining captain for assistance or scan the table standee again.
        </p>
      </div>
    );
  }

  const [viewTab, setViewTab] = useState<'MENU' | 'LIVE_STATUS'>('MENU');

  const { table, restaurant, categories = [], activeOrders = [] } = tableData || {};
  const currentActiveOrder = orderPlaced || (activeOrders.length > 0 ? activeOrders[0] : null);

  // Poll order status when an order is placed or table has active orders
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/tables/public/qr/${token}`);
        if (!res.ok) return;
        const json = await res.json();
        if (json.data) {
          setTableData(json.data);
          if (orderPlaced?.id) {
            const updated = (json.data.activeOrders || []).find((o: any) => o.id === orderPlaced.id);
            if (updated) setOrderPlaced(updated);
          }
        }
      } catch (err) {
        // silent catch for polling
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [token, orderPlaced?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 space-y-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-muted-foreground">Loading Table Menu &amp; Status...</p>
      </div>
    );
  }

  if (error || !tableData) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center space-y-4">
        <AlertCircle className="w-16 h-16 text-rose-500" />
        <h2 className="text-xl font-bold">QR Code Expired or Invalid</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Please ask your dining captain for assistance or scan the table standee again.
        </p>
      </div>
    );
  }

  const allItems = categories.flatMap((c: any) => c.items || []);
  const filteredItems = selectedCategory === 'ALL'
    ? allItems
    : (categories.find((c: any) => c.id === selectedCategory)?.items || []);

  const hasRunningOrder = !!currentActiveOrder;

  return (
    <div className="min-h-screen bg-background text-foreground pb-36 max-w-lg mx-auto shadow-2xl border-x border-border">
      {/* Top Restaurant & Table Banner */}
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border p-4 shadow-sm space-y-3">
        {restaurant.logoUrl && (
          <div className="flex justify-center pb-0.5">
            <img
              src={restaurant.logoUrl}
              alt={restaurant.name}
              className="max-h-12 max-w-[140px] object-contain mx-auto"
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-foreground">{restaurant.name}</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3 text-primary" /> {restaurant.branchName || 'Main Dining Hall'}
            </p>
          </div>
          <div className="px-3 py-1.5 rounded-2xl bg-primary text-primary-foreground font-black text-xs shadow flex items-center gap-1.5">
            <span>🍽️</span>
            <span>{table.name}</span>
          </div>
        </div>

        {/* Tab Navigation: Menu vs Live Order Status */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/80 rounded-2xl border border-border">
          <button
            type="button"
            onClick={() => setViewTab('MENU')}
            className={cn(
              'py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5',
              viewTab === 'MENU'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Browse Menu</span>
          </button>

          <button
            type="button"
            onClick={() => setViewTab('LIVE_STATUS')}
            className={cn(
              'py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 relative',
              viewTab === 'LIVE_STATUS'
                ? 'bg-emerald-600 text-white shadow-md'
                : hasRunningOrder
                ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <ChefHat className="w-3.5 h-3.5" />
            <span>Live Order Status</span>
            {hasRunningOrder && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute right-2.5 top-2.5" />
            )}
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 1: LIVE KITCHEN DISPLAY & ORDER TRACKER
      ───────────────────────────────────────────────────────────────────────────── */}
      {viewTab === 'LIVE_STATUS' ? (
        <div className="p-4 space-y-5 animate-fade-in">
          {currentActiveOrder ? (
            <div className="space-y-4">
              {/* Order Status Hero Card */}
              {(() => {
                const status = currentActiveOrder.status;
                const isReceived = status === 'DRAFT' || status === 'CONFIRMED';
                const isCooking = ['SENT_TO_KITCHEN', 'PREPARING'].includes(status);
                const isReady = status === 'READY';
                const isServed = status === 'SERVED';
                const isBilled = ['BILLED', 'PAID', 'COMPLETED'].includes(status);
                const isCancelled = ['CANCELLED', 'VOIDED'].includes(status);

                return (
                  <div className="p-5 rounded-3xl bg-card border border-border text-center space-y-4 shadow-sm">
                    {isCancelled ? (
                      <div className="space-y-2">
                        <div className="w-16 h-16 bg-rose-500/15 text-rose-500 rounded-full flex items-center justify-center mx-auto text-2xl">
                          ❌
                        </div>
                        <h2 className="text-xl font-black text-foreground">Order Cancelled</h2>
                        <p className="text-xs text-muted-foreground">Order #{currentActiveOrder.orderNumber}</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-center">
                          <div className={cn(
                            'w-16 h-16 rounded-3xl flex items-center justify-center text-3xl shadow-inner',
                            isReceived ? 'bg-amber-500/15 text-amber-400 animate-pulse' :
                            isCooking ? 'bg-emerald-500/15 text-emerald-400 animate-pulse' :
                            isReady ? 'bg-emerald-500/20 text-emerald-300 animate-bounce' :
                            isServed ? 'bg-teal-500/15 text-teal-400' : 'bg-primary/15 text-primary'
                          )}>
                            {isReceived ? '✨' : isCooking ? '👨‍🍳' : isReady ? '🛎️' : isServed ? '🍽️' : '🧾'}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <h2 className="text-lg font-black text-foreground">
                            {isReceived ? 'Order Received & Queued' :
                             isCooking ? 'Cooking in Kitchen!' :
                             isReady ? 'Food is Ready to Serve!' :
                             isServed ? 'Dishes Served to Table' : 'Order Billed & Settle'}
                          </h2>
                          <p className="text-xs font-bold text-emerald-400">Order #{currentActiveOrder.orderNumber}</p>
                        </div>

                        {/* Kitchen Display Progress Stepper */}
                        <div className="pt-2 pb-1">
                          <div className="grid grid-cols-4 gap-1 text-center">
                            {[
                              { label: 'Received', done: true, active: isReceived },
                              { label: 'Cooking', done: isCooking || isReady || isServed || isBilled, active: isCooking },
                              { label: 'Ready', done: isReady || isServed || isBilled, active: isReady },
                              { label: 'Served', done: isServed || isBilled, active: isServed },
                            ].map((step, idx) => (
                              <div key={idx} className="space-y-1.5">
                                <div className={cn(
                                  'h-2 rounded-full transition-all',
                                  step.active ? 'bg-emerald-400 animate-pulse' :
                                  step.done ? 'bg-emerald-500' : 'bg-muted'
                                )} />
                                <span className={cn(
                                  'text-[10px] font-bold block truncate',
                                  step.active ? 'text-emerald-400' :
                                  step.done ? 'text-foreground' : 'text-muted-foreground'
                                )}>
                                  {step.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="p-3 rounded-2xl bg-muted/40 border border-border text-xs text-muted-foreground">
                          {isReceived && 'Your order is safely received and ready to be accepted by the kitchen staff.'}
                          {isCooking && 'Chefs are currently preparing your fresh hot dishes at the kitchen stations.'}
                          {isReady && 'Your dishes are plated and our waitstaff is bringing them directly to your table.'}
                          {isServed && `Enjoy your meal at ${table.name}! You can order more items whenever you wish.`}
                          {isBilled && 'Your dining bill has been prepared. Please settle with the staff.'}
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* Itemized Order Breakdown with Rate & Qty */}
              <div className="p-4 rounded-3xl bg-card border border-border space-y-3">
                {restaurant.logoUrl && (
                  <div className="flex justify-center pb-1 border-b border-border/50">
                    <img
                      src={restaurant.logoUrl}
                      alt={restaurant.name}
                      className="max-h-12 max-w-[140px] object-contain mx-auto"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Ordered Dishes ({currentActiveOrder.items?.length || 0})
                  </span>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {table.name}
                  </span>
                </div>

                <div className="divide-y divide-border/60">
                  {currentActiveOrder.items?.map((it: any, i: number) => {
                    const unitPrice = Number(it.variant?.price || it.unitPrice || 0);
                    const qty = it.quantity || 1;
                    const lineTotal = Number(it.totalPrice || it.lineTotal || (unitPrice * qty));
                    const foodType = it.menuItem?.foodType || 'VEG';

                    return (
                      <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-start gap-2 flex-1 pr-2">
                          <span className="text-xs mt-0.5 shrink-0">
                            {foodType === 'VEG' ? '🟢' : '🔴'}
                          </span>
                          <div>
                            <p className="font-bold text-foreground">
                              {it.menuItem?.name || it.name || 'Dish'}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                              {it.variant?.name && <span>{it.variant.name}</span>}
                              <span>Qty: <strong className="text-foreground">{qty}</strong></span>
                              <span>@ {formatCurrency(unitPrice)}</span>
                            </div>
                            {it.notes && (
                              <p className="text-[10px] text-amber-400 italic mt-0.5">Note: {it.notes}</p>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0 font-mono font-bold text-foreground">
                          {formatCurrency(lineTotal)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Running Total */}
                <div className="border-t border-border pt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal:</span>
                    <span className="font-mono">{formatCurrency(currentActiveOrder.subtotal || currentActiveOrder.total)}</span>
                  </div>
                  {Number(currentActiveOrder.taxAmount || 0) > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Taxes &amp; GST:</span>
                      <span className="font-mono">{formatCurrency(Number(currentActiveOrder.taxAmount || 0))}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline pt-2 border-t border-border text-sm font-black text-foreground">
                    <span>Total Amount:</span>
                    <span className="text-base font-mono text-emerald-400">
                      {formatCurrency(currentActiveOrder.total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Order More Items Action */}
              <Button
                onClick={() => setViewTab('MENU')}
                className="w-full h-12 rounded-2xl font-black text-xs gap-2 bg-primary text-primary-foreground shadow-lg"
              >
                <Plus className="w-4 h-4" />
                <span>Add More Dishes to this Table</span>
              </Button>
            </div>
          ) : (
            <div className="py-16 text-center space-y-3 bg-card rounded-3xl border border-border p-6">
              <div className="w-16 h-16 rounded-3xl bg-muted/60 border border-border flex items-center justify-center mx-auto text-2xl">
                🍽️
              </div>
              <h3 className="text-base font-black text-foreground">No Active Orders Yet</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Browse our delicious menu and place an order directly from your phone.
              </p>
              <Button
                onClick={() => setViewTab('MENU')}
                className="rounded-2xl font-bold text-xs"
              >
                Explore Menu
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* ─────────────────────────────────────────────────────────────────────────────
            TAB 2: DIGITAL FOOD MENU & 1-TAP ORDERING
        ───────────────────────────────────────────────────────────────────────────── */
        <main className="p-4 space-y-4">
          {/* Active order running banner shortcut */}
          {hasRunningOrder && (
            <button
              type="button"
              onClick={() => setViewTab('LIVE_STATUS')}
              className="w-full p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-400 hover:bg-emerald-500/20 transition-colors shadow-sm"
            >
              <div className="flex items-center gap-2">
                <ChefHat className="w-4 h-4 animate-bounce" />
                <span className="font-bold">
                  Order #{currentActiveOrder.orderNumber} is active
                </span>
              </div>
              <span className="font-black text-[11px] underline flex items-center gap-1">
                View Kitchen Status <ArrowRight className="w-3 h-3" />
              </span>
            </button>
          )}

          {/* Category Chips Carousel */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === 'ALL'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-card border border-border text-muted-foreground'
              }`}
            >
              All Items ({allItems.length})
            </button>
            {categories.map((c: any) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === c.id
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-card border border-border text-muted-foreground'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Dishes List */}
          <div className="space-y-3">
            {filteredItems.map((item: any) => {
              const inCart = cart[item.id];
              const price = item.variants?.[0]?.price || 150;

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-3xl bg-card border border-border flex items-center justify-between gap-3 shadow-sm hover:border-primary/40 transition-all"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs">
                        {item.foodType === 'VEG' ? '🟢' : item.foodType === 'NON_VEG' ? '🔴' : '🟡'}
                      </span>
                      <h3 className="text-sm font-bold text-foreground">{item.name}</h3>
                    </div>
                    {item.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1">{item.description}</p>
                    )}
                    <p className="text-xs font-black text-primary font-mono">{formatCurrency(price)}</p>
                  </div>

                  {/* Add / Counter Controls */}
                  <div className="shrink-0">
                    {inCart ? (
                      <div className="flex items-center gap-2 bg-primary/15 border border-primary/30 rounded-xl p-1">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="w-7 h-7 rounded-lg bg-background flex items-center justify-center text-primary font-bold text-sm cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-black text-primary px-1">{inCart.qty}</span>
                        <button
                          onClick={() => addToCart(item)}
                          className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => addToCart(item)}
                        className="h-8 text-xs font-bold rounded-xl gap-1 bg-primary text-primary-foreground cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredItems.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground">
                <UtensilsCrossed className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm font-bold">No dishes available</p>
                <p className="text-xs text-muted-foreground">Please select another category.</p>
              </div>
            )}
          </div>
        </main>
      )}

      {/* Floating Bottom Cart Bar (When Items Added) */}
      {cartList.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-4 bg-card/95 backdrop-blur-lg border-t border-border shadow-2xl z-40 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-primary" />
              {cartList.reduce((acc, c) => acc + c.qty, 0)} Items Selected
            </span>
            <div className="text-right">
              {taxRate > 0 && gst > 0 && (
                <div className="text-[10px] text-muted-foreground font-mono">
                  Subtotal: {formatCurrency(subtotal)} + GST ({taxRate}%): {formatCurrency(gst)}
                </div>
              )}
              <span className="font-black text-base font-mono text-primary">
                {formatCurrency(total)}
              </span>
            </div>
          </div>

          <input
            type="text"
            placeholder="Special instructions (e.g. less spicy)..."
            value={guestNotes}
            onChange={(e) => setGuestNotes(e.target.value)}
            className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />

          <Button
            onClick={async () => {
              await handlePlaceOrder();
              setViewTab('LIVE_STATUS');
            }}
            disabled={isSubmitting}
            className="w-full h-12 rounded-2xl font-black text-sm gap-2 shadow-lg shadow-primary/25 cursor-pointer"
          >
            <UtensilsCrossed className="w-4 h-4" />
            {isSubmitting ? 'Sending to Kitchen...' : 'Send Order to Kitchen'}
          </Button>
        </div>
      )}
    </div>
  );
}
