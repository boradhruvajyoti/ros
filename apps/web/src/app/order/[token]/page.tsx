'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  UtensilsCrossed, Plus, Minus, ShoppingBag, CheckCircle2,
  Clock, Sparkles, ChefHat, Phone, MapPin, AlertCircle, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  const gst = subtotal * 0.05;
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

  const { table, restaurant, categories = [] } = tableData;
  const allItems = categories.flatMap((c: any) => c.items || []);
  const filteredItems = selectedCategory === 'ALL'
    ? allItems
    : (categories.find((c: any) => c.id === selectedCategory)?.items || []);

  const isPendingVerification = orderPlaced?.status === 'CONFIRMED' || orderPlaced?.status === 'DRAFT';
  const isCooking = ['SENT_TO_KITCHEN', 'PREPARING'].includes(orderPlaced?.status);
  const isReady = orderPlaced?.status === 'READY';
  const isServed = ['SERVED', 'BILLED', 'PAID', 'COMPLETED'].includes(orderPlaced?.status);
  const isCancelled = ['CANCELLED', 'VOIDED'].includes(orderPlaced?.status);

  return (
    <div className="min-h-screen bg-background text-foreground pb-32 max-w-lg mx-auto shadow-2xl border-x border-border">
      {/* Top Restaurant & Table Banner */}
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-foreground">{restaurant.name}</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3 text-primary" /> {restaurant.branchName || 'Main Dining Hall'}
            </p>
          </div>
          <div className="px-3 py-1 rounded-2xl bg-primary text-primary-foreground font-black text-xs shadow">
            {table.name}
          </div>
        </div>
      </header>

      {/* Order Placed Success View with Dynamic Verification States */}
      {orderPlaced ? (
        <div className="p-6 space-y-6 animate-fade-in text-center">
          {isCancelled ? (
            <>
              <div className="w-20 h-20 bg-rose-500/15 text-rose-500 rounded-full flex items-center justify-center mx-auto text-3xl">
                ❌
              </div>
              <div>
                <h2 className="text-2xl font-black text-foreground">Order Cancelled</h2>
                <p className="text-sm font-bold text-rose-500 mt-1">Order #{orderPlaced.orderNumber}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  This order was not confirmed. If you are seated at <strong>{table.name}</strong>, please speak with our staff for assistance.
                </p>
              </div>
            </>
          ) : isPendingVerification ? (
            <>
              <div className="w-20 h-20 bg-emerald-500/15 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-3xl animate-pulse">
                ✨
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-black text-foreground">Order Received!</h2>
                <p className="text-sm font-bold text-emerald-400">Order #{orderPlaced.orderNumber}</p>
                <div className="p-3.5 rounded-2xl bg-muted/60 border border-border text-xs text-muted-foreground text-center space-y-1">
                  <p className="font-bold text-foreground flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Your order is received and ready to be accepted
                  </p>
                  <p className="text-[11px] opacity-90">
                    We are getting your delicious dishes lined up for <strong>{table.name}</strong>.
                  </p>
                </div>
              </div>
            </>
          ) : isCooking ? (
            <>
              <div className="w-20 h-20 bg-emerald-500/15 text-emerald-500 rounded-full flex items-center justify-center mx-auto text-3xl animate-pulse">
                🍳
              </div>
              <div>
                <h2 className="text-2xl font-black text-foreground">Order Accepted & Cooking!</h2>
                <p className="text-sm font-bold text-emerald-500 mt-1">Order #{orderPlaced.orderNumber}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Our chefs have started preparing your meal for <strong>{table.name}</strong>.
                </p>
              </div>
            </>
          ) : isReady ? (
            <>
              <div className="w-20 h-20 bg-emerald-500/20 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl animate-bounce">
                🛎️
              </div>
              <div>
                <h2 className="text-2xl font-black text-foreground">Your Food is Ready!</h2>
                <p className="text-sm font-bold text-emerald-600 mt-1">Order #{orderPlaced.orderNumber}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Your dishes are being served to <strong>{table.name}</strong>. Enjoy your meal!
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-teal-500/15 text-teal-500 rounded-full flex items-center justify-center mx-auto text-3xl">
                🍽️
              </div>
              <div>
                <h2 className="text-2xl font-black text-foreground">Dishes Served</h2>
                <p className="text-sm font-bold text-teal-600 mt-1">Order #{orderPlaced.orderNumber}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Enjoy your meal at <strong>{table.name}</strong>!
                </p>
              </div>
            </>
          )}

          <div className="p-4 rounded-3xl bg-card border border-border text-left space-y-2 text-xs">
            <p className="font-bold text-muted-foreground uppercase text-[10px]">Ordered Items</p>
            {orderPlaced.items?.map((it: any, i: number) => (
              <div key={i} className="flex justify-between font-medium">
                <span>{it.quantity}x {it.menuItem?.name || it.name || 'Dish'}</span>
                <span className="font-mono">{formatCurrency(it.totalPrice || it.quantity * it.unitPrice)}</span>
              </div>
            ))}
            <div className="border-t border-border pt-2 flex justify-between font-black text-sm">
              <span>Total Bill</span>
              <span className="text-primary font-mono">{formatCurrency(orderPlaced.total)}</span>
            </div>
          </div>

          <Button
            onClick={() => setOrderPlaced(null)}
            className="w-full h-12 rounded-2xl font-bold"
          >
            Order Additional Items
          </Button>
        </div>
      ) : (
        <main className="p-4 space-y-5">
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
                          className="w-7 h-7 rounded-lg bg-background flex items-center justify-center text-primary font-bold text-sm"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-black text-primary px-1">{inCart.qty}</span>
                        <button
                          onClick={() => addToCart(item)}
                          className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => addToCart(item)}
                        className="h-8 text-xs font-bold rounded-xl gap-1 bg-primary text-primary-foreground"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      )}

      {/* Floating Bottom Cart Bar (When Items Added) */}
      {!orderPlaced && cartList.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-4 bg-card/95 backdrop-blur-lg border-t border-border shadow-2xl z-40 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-primary" />
              {cartList.reduce((acc, c) => acc + c.qty, 0)} Items Selected
            </span>
            <span className="font-black text-base font-mono text-primary">
              {formatCurrency(total)}
            </span>
          </div>

          <input
            type="text"
            placeholder="Special instructions (e.g. less spicy)..."
            value={guestNotes}
            onChange={(e) => setGuestNotes(e.target.value)}
            className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />

          <Button
            onClick={handlePlaceOrder}
            disabled={isSubmitting}
            className="w-full h-12 rounded-2xl font-black text-sm gap-2 shadow-lg shadow-primary/25"
          >
            <UtensilsCrossed className="w-4 h-4" />
            {isSubmitting ? 'Sending to Kitchen...' : 'Send Order to Kitchen'}
          </Button>
        </div>
      )}
    </div>
  );
}
