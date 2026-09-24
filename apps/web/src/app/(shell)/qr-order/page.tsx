'use client';

import { useState } from 'react';
import {
  QrCode, UtensilsCrossed, Plus, Minus, ShoppingBag,
  Sparkles, CheckCircle2, ChevronRight, ShieldCheck, Flame
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  foodType: 'VEG' | 'NON_VEG';
  popular?: boolean;
}

const sampleMenu: MenuItem[] = [
  {
    id: 'm1',
    name: 'Paneer Tikka (Tandoori)',
    category: 'Starters',
    price: 249,
    description: 'Cottage cheese marinated in tandoori spices and cooked over charcoal in clay oven.',
    foodType: 'VEG',
    popular: true,
  },
  {
    id: 'm2',
    name: 'Chicken 65 (Crispy)',
    category: 'Starters',
    price: 299,
    description: 'Deep-fried spicy chicken morsels tossed with curry leaves, crushed pepper and lemon.',
    foodType: 'NON_VEG',
    popular: true,
  },
  {
    id: 'm3',
    name: 'Butter Chicken (Rich Makhani)',
    category: 'Main Course',
    price: 349,
    description: 'Tender tandoori chicken simmered in rich creamy tomato and butter silk gravy.',
    foodType: 'NON_VEG',
    popular: true,
  },
  {
    id: 'm4',
    name: 'Dal Makhani (Slow Cooked 24hr)',
    category: 'Main Course',
    price: 249,
    description: 'Black lentils slow cooked overnight with churned butter and fresh cream.',
    foodType: 'VEG',
  },
  {
    id: 'm5',
    name: 'Garlic Butter Naan',
    category: 'Breads',
    price: 65,
    description: 'Fluffy refined flour bread topped with minced garlic, coriander and butter.',
    foodType: 'VEG',
  },
  {
    id: 'm6',
    name: 'Mango Lassi (Special Chilled)',
    category: 'Beverages',
    price: 129,
    description: 'Thick yogurt blend with organic Alphonso mango pulp and saffron notes.',
    foodType: 'VEG',
    popular: true,
  },
];

export default function QrOrderPage() {
  const [selectedTable, setSelectedTable] = useState('T5');
  const [cart, setCart] = useState<{ [id: string]: number }>({ m1: 1, m5: 2 });
  const [orderPlaced, setOrderPlaced] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState('ALL');

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

  const cartItems = Object.entries(cart).map(([id, qty]) => {
    const item = sampleMenu.find((m) => m.id === id)!;
    return { ...item, qty };
  });

  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);
  const tax = subtotal * 0.05; // 5% GST
  const grandTotal = subtotal + tax;

  const handlePlaceOrder = () => {
    const orderNo = `QR-${Math.floor(1000 + Math.random() * 9000)}`;
    setOrderPlaced(orderNo);
    setCart({});
  };

  const filteredMenu = filterCategory === 'ALL'
    ? sampleMenu
    : sampleMenu.filter((m) => m.category === filterCategory);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <QrCode className="w-6 h-6 text-primary" />
            Contactless QR Dine-In Ordering Portal
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Guest self-service digital menu with live modifier selection, table cart & direct KOT kitchen dispatch
          </p>
        </div>

        {/* Table Selector */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-border">
          <span className="text-xs text-muted-foreground font-semibold">Table:</span>
          <select
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
            className="bg-transparent text-sm font-bold text-primary focus:outline-none cursor-pointer"
          >
            {['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10'].map((t) => (
              <option key={t} value={t} className="bg-card text-foreground">
                Table {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Order Confirmation Banner */}
      {orderPlaced && (
        <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            Order {orderPlaced} Placed Successfully for Table {selectedTable}!
          </div>
          <p className="text-xs text-muted-foreground">
            Your kitchen order ticket (KOT) has been routed to the respective cooking stations. Estimated prep time: ~15 mins.
          </p>
          <Button size="sm" onClick={() => setOrderPlaced(null)} className="mt-2 text-xs">
            Order More Dishes
          </Button>
        </div>
      )}

      {/* Two Column Ordering Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Menu Catalog (Left) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Category Chips */}
          <div className="flex flex-wrap items-center gap-2 pb-2">
            {['ALL', 'Starters', 'Main Course', 'Breads', 'Beverages'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  filterCategory === cat
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Menu Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredMenu.map((item) => {
              const inCartQty = cart[item.id] || 0;
              return (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl border border-border bg-card/70 backdrop-blur hover:border-border/80 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-3 h-3 rounded-full border flex items-center justify-center p-0.5 ${
                              item.foodType === 'VEG'
                                ? 'border-emerald-500 text-emerald-500'
                                : 'border-rose-500 text-rose-500'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                item.foodType === 'VEG' ? 'bg-emerald-500' : 'bg-rose-500'
                              }`}
                            />
                          </span>
                          <h3 className="font-bold text-sm text-foreground">{item.name}</h3>
                        </div>
                        <p className="text-xs font-bold text-primary mt-1">₹{item.price}</p>
                      </div>

                      {item.popular && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                          <Flame className="w-3 h-3" /> Chef Pick
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-2">
                      {item.description}
                    </p>
                  </div>

                  {/* Add Button */}
                  <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-end">
                    {inCartQty > 0 ? (
                      <div className="flex items-center gap-2 bg-primary/15 border border-primary/30 rounded-lg p-1">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="w-6 h-6 rounded flex items-center justify-center text-primary hover:bg-primary/20"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-bold text-primary px-1">{inCartQty}</span>
                        <button
                          onClick={() => addToCart(item.id)}
                          className="w-6 h-6 rounded flex items-center justify-center text-primary hover:bg-primary/20"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addToCart(item.id)}
                        className="h-8 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/10"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add to Table Cart
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Guest Cart (Right) */}
        <div className="lg:col-span-4">
          <div className="p-6 rounded-2xl border border-border bg-card/80 backdrop-blur sticky top-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
                Table {selectedTable} Cart
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold">
                {cartItems.reduce((acc, i) => acc + i.qty, 0)} Items
              </span>
            </div>

            {cartItems.length > 0 ? (
              <div className="space-y-3">
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1 no-scrollbar">
                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-background/50 border border-border/50 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-foreground">{item.name}</p>
                        <p className="text-[11px] text-muted-foreground">₹{item.price} × {item.qty}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="w-5 h-5 rounded bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold text-primary">{item.qty}</span>
                        <button
                          onClick={() => addToCart(item.id)}
                          className="w-5 h-5 rounded bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
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
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>GST (5%)</span>
                    <span>₹{tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-foreground pt-2 border-t border-border/50">
                    <span>Total Bill</span>
                    <span className="text-primary">₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <Button onClick={handlePlaceOrder} className="w-full py-5 font-bold text-sm shadow-lg gap-2 mt-2">
                  <UtensilsCrossed className="w-4 h-4" />
                  Send Order to Kitchen
                </Button>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                <ShoppingBag className="w-8 h-8 mx-auto text-muted-foreground/40" />
                <p>Your table cart is empty.</p>
                <p className="text-[11px]">Tap "+ Add to Table Cart" on any dish to order.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
