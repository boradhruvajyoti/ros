'use client';

import { useState } from 'react';
import {
  Sparkles, Flame, Coffee, Heart, Utensils, Plus, Minus,
  ShoppingBag, CheckCircle2, CreditCard, QrCode, ArrowRight,
  RotateCcw, ShieldCheck, Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ComboItem {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  calories: string;
  foodType: 'VEG' | 'NON_VEG';
  popular?: boolean;
}

const combos: ComboItem[] = [
  {
    id: 'k-combo-01',
    name: 'Royal Biryani Solo Meal',
    description: 'Dum Biryani + Cold Beverage + 1 Gulab Jamun',
    price: 399,
    originalPrice: 480,
    calories: '650 kcal',
    foodType: 'NON_VEG',
    popular: true,
  },
  {
    id: 'k-combo-02',
    name: 'Makhani Classic Feast',
    description: 'Paneer Makhani + 2 Butter Naan + Mango Lassi',
    price: 349,
    originalPrice: 420,
    calories: '580 kcal',
    foodType: 'VEG',
    popular: true,
  },
  {
    id: 'k-combo-03',
    name: 'Family Tandoori Platter',
    description: 'Paneer Tikka + Chicken 65 + 4 Naans + 2 Lassi',
    price: 999,
    originalPrice: 1250,
    calories: '1450 kcal',
    foodType: 'NON_VEG',
    popular: true,
  },
  {
    id: 'k-combo-04',
    name: 'Express Lunch Box',
    description: 'Dal Makhani + Jeera Rice + 1 Butter Naan',
    price: 279,
    originalPrice: 330,
    calories: '490 kcal',
    foodType: 'VEG',
  },
];

export default function KioskPage() {
  const [diningOption, setDiningOption] = useState<'DINE_IN' | 'TAKEAWAY'>('DINE_IN');
  const [cart, setCart] = useState<{ [id: string]: number }>({ 'k-combo-01': 1 });
  const [tokenGenerated, setTokenGenerated] = useState<string | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

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

  const cartList = Object.entries(cart).map(([id, qty]) => {
    const item = combos.find((c) => c.id === id)!;
    return { ...item, qty };
  });

  const subtotal = cartList.reduce((acc, i) => acc + i.price * i.qty, 0);
  const tax = subtotal * 0.05;
  const grandTotal = subtotal + tax;

  const handlePay = () => {
    setPaymentProcessing(true);
    setTimeout(() => {
      setPaymentProcessing(false);
      const token = `K-${Math.floor(100 + Math.random() * 900)}`;
      setTokenGenerated(token);
      setCart({});
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Self-Service Interactive Kiosk Terminal (Touch Screen)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Full-screen guest ordering terminal with combo upsells, UPI QR tap-to-pay & order token beacon
          </p>
        </div>

        {/* Dining Mode Toggle */}
        <div className="flex items-center gap-1 p-1 bg-card border border-border rounded-xl">
          <button
            onClick={() => setDiningOption('DINE_IN')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              diningOption === 'DINE_IN'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            🍽️ Eat Here (Dine-In)
          </button>
          <button
            onClick={() => setDiningOption('TAKEAWAY')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              diningOption === 'TAKEAWAY'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            🛍️ Take Away (Bag)
          </button>
        </div>
      </div>

      {/* Success Token Screen */}
      {tokenGenerated && (
        <div className="p-8 rounded-3xl bg-gradient-to-br from-card to-primary/10 border-2 border-primary/50 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-primary/20 text-primary mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div>
            <span className="text-xs uppercase font-bold text-muted-foreground tracking-widest">
              Please Collect Your Order Receipt
            </span>
            <p className="text-5xl font-black text-primary tracking-wider mt-1">{tokenGenerated}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Payment Confirmed via UPI QR. Your order is now cooking on the Kitchen Display System (KDS).
            </p>
          </div>
          <Button onClick={() => setTokenGenerated(null)} className="mt-2 text-xs font-bold">
            Start Next Guest Order
          </Button>
        </div>
      )}

      {/* Main Kiosk Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Combos Visual Grid (Left 8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-400" />
              Special Value Meal Combos & Boxes
            </h2>
            <span className="text-xs font-bold text-emerald-400">Save up to 25% on combos</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {combos.map((item) => {
              const inCartQty = cart[item.id] || 0;
              return (
                <div
                  key={item.id}
                  className="p-5 rounded-3xl border border-border bg-card/70 backdrop-blur hover:border-primary/50 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            item.foodType === 'VEG' ? 'border-emerald-500' : 'border-rose-500'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              item.foodType === 'VEG' ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                        </span>
                        <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                          {item.name}
                        </h3>
                      </div>
                      {item.popular && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          Bestseller
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="flex items-baseline gap-2 mt-4">
                      <span className="text-xl font-black text-foreground">₹{item.price}</span>
                      <span className="text-xs text-muted-foreground line-through">₹{item.originalPrice}</span>
                      <span className="text-[11px] font-semibold text-muted-foreground ml-auto">{item.calories}</span>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-border/50 flex items-center justify-end">
                    {inCartQty > 0 ? (
                      <div className="flex items-center gap-3 bg-primary/15 border border-primary/30 rounded-xl p-1.5">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="w-7 h-7 rounded-lg bg-background flex items-center justify-center text-primary font-bold hover:bg-primary/20"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-black text-primary px-1">{inCartQty}</span>
                        <button
                          onClick={() => addToCart(item.id)}
                          className="w-7 h-7 rounded-lg bg-background flex items-center justify-center text-primary font-bold hover:bg-primary/20"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => addToCart(item.id)}
                        className="font-bold text-xs gap-1.5 rounded-xl py-4"
                      >
                        <Plus className="w-4 h-4" />
                        Select Combo
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Kiosk Cart & Checkout Drawer (Right 4 cols) */}
        <div className="lg:col-span-4">
          <div className="p-6 rounded-3xl border border-border bg-card/80 backdrop-blur sticky top-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
                Your Kiosk Tray
              </h2>
              <span className="text-xs font-bold text-muted-foreground uppercase">
                {diningOption === 'DINE_IN' ? '🍽️ Dine-In' : '🛍️ Takeaway'}
              </span>
            </div>

            {cartList.length > 0 ? (
              <div className="space-y-4">
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1 no-scrollbar">
                  {cartList.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-2xl bg-background/50 border border-border/50 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-foreground">{item.name}</p>
                        <p className="text-[11px] text-muted-foreground">₹{item.price} × {item.qty}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="w-6 h-6 rounded bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-black text-primary">{item.qty}</span>
                        <button
                          onClick={() => addToCart(item.id)}
                          className="w-6 h-6 rounded bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5 pt-3 border-t border-border text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Items Total</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>GST (5%)</span>
                    <span>₹{tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-black text-foreground pt-2 border-t border-border/50">
                    <span>To Pay</span>
                    <span className="text-primary">₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Instant Tap & Pay Action */}
                <Button
                  onClick={handlePay}
                  disabled={paymentProcessing}
                  className="w-full py-6 font-bold text-base shadow-xl gap-2 rounded-2xl bg-gradient-to-r from-primary to-amber-500 text-primary-foreground"
                >
                  <QrCode className="w-5 h-5" />
                  {paymentProcessing ? 'Processing UPI Payment...' : 'Tap to Pay (UPI / Card)'}
                </Button>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                <ShoppingBag className="w-10 h-10 mx-auto text-muted-foreground/30" />
                <p className="font-semibold text-foreground">Your tray is empty</p>
                <p className="text-[11px]">Select any meal combo to start self-ordering.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
