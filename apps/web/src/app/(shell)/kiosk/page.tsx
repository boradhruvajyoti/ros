'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api';
import {
  Sparkles, Flame, Plus, Minus,
  ShoppingBag, CheckCircle2, QrCode, Search, Loader2,
  Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { printHtmlInSameTab } from '@/lib/print-utils';
import { format } from 'date-fns';

interface MenuItemVariant {
  id: string;
  name: string;
  price: string | number;
}

interface MenuItem {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  foodType?: string;
  category?: { id: string; name: string };
  variants: MenuItemVariant[];
}

interface MenuCategory {
  id: string;
  name: string;
}

interface CartItem {
  id: string;
  menuItemId: string;
  variantId?: string;
  name: string;
  price: number;
  qty: number;
  foodType?: string;
}

export default function KioskPage() {
  const [diningOption, setDiningOption] = useState<'DINE_IN' | 'TAKEAWAY'>('DINE_IN');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<{ [key: string]: CartItem }>({});
  const [tokenGenerated, setTokenGenerated] = useState<string | null>(null);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<any>(null);

  const { data: tenant } = useQuery({
    queryKey: ['current-tenant'],
    queryFn: () => apiGet<any>('/tenants/current'),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['kiosk-menu'],
    queryFn: () => apiGet<{ categories: MenuCategory[]; items: MenuItem[] }>('/kiosk/menu'),
  });

  const categories = data?.categories || [];
  const items = data?.items || [];

  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategoryId === 'ALL' || item.category?.id === selectedCategoryId;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const getItemPrice = (item: MenuItem): number => {
    if (item.variants && item.variants.length > 0) {
      return Number(item.variants[0].price);
    }
    return 0;
  };

  const addToCart = (item: MenuItem, variant?: MenuItemVariant) => {
    const selectedVariant = variant || (item.variants && item.variants.length > 0 ? item.variants[0] : null);
    const key = selectedVariant ? `${item.id}-${selectedVariant.id}` : item.id;
    const price = selectedVariant ? Number(selectedVariant.price) : 0;
    const displayName = selectedVariant && selectedVariant.name !== 'Standard' && selectedVariant.name !== 'Default'
      ? `${item.name} (${selectedVariant.name})`
      : item.name;

    setCart((prev) => {
      const existing = prev[key];
      const qty = (existing?.qty || 0) + 1;
      return {
        ...prev,
        [key]: {
          id: key,
          menuItemId: item.id,
          variantId: selectedVariant?.id,
          name: displayName,
          price,
          qty,
          foodType: item.foodType,
        },
      };
    });
  };

  const removeFromCart = (key: string) => {
    setCart((prev) => {
      const copy = { ...prev };
      if (!copy[key]) return copy;
      if (copy[key].qty > 1) {
        copy[key] = { ...copy[key], qty: copy[key].qty - 1 };
      } else {
        delete copy[key];
      }
      return copy;
    });
  };

  const cartList = Object.values(cart);
  const subtotal = cartList.reduce((acc, i) => acc + i.price * i.qty, 0);
  const tax = Math.round(subtotal * 0.05 * 100) / 100;
  const grandTotal = subtotal + tax;

  const submitOrderMutation = useMutation({
    mutationFn: (orderPayload: any) => apiPost<{ tokenNumber: string }>('/kiosk/order', orderPayload),
    onSuccess: (res) => {
      setLastPlacedOrder({
        tokenNumber: res.tokenNumber,
        items: cartList,
        subtotal,
        tax,
        grandTotal,
        diningOption,
        createdAt: new Date(),
      });
      setTokenGenerated(res.tokenNumber);
      setCart({});
    },
  });

  const handlePay = () => {
    if (cartList.length === 0) return;
    submitOrderMutation.mutate({
      items: cartList,
      diningOption,
      paymentMethod: 'UPI_QR',
    });
  };

  const printKioskReceipt = () => {
    if (!lastPlacedOrder) return;
    const htmlContent = `
      <html>
        <head>
          <title>Kiosk Token - #${lastPlacedOrder.tokenNumber}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            @media print {
              html, body {
                width: 80mm;
                max-width: 80mm;
                margin: 0 auto;
                padding: 2mm 3mm;
                background: #fff;
              }
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              width: 80mm;
              max-width: 80mm;
              padding: 6px 4px;
              margin: 0 auto;
              font-size: 12px;
              color: #000;
              line-height: 1.3;
              box-sizing: border-box;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .token-box { border: 2px solid #000; padding: 6px; text-align: center; margin: 8px 0; }
            .token-num { font-size: 28px; font-weight: 900; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            table { width: 100%; border-collapse: collapse; margin: 4px 0; font-size: 12px; }
            th { text-align: left; border-bottom: 1px dashed #000; padding: 2px 0; }
            td { padding: 3px 0; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .row-flex { display: flex; justify-content: space-between; margin: 2px 0; }
          </style>
        </head>
        <body>
          <div class="center">
            <div class="bold" style="font-size: 16px;">${tenant?.name || 'RESTAURANT KIOSK'}</div>
            <div style="font-size: 11px;">Self-Service Ordering Terminal</div>
            <div class="token-box">
              <div>ORDER TOKEN</div>
              <div class="token-num">${lastPlacedOrder.tokenNumber}</div>
              <div style="font-size: 11px;">${lastPlacedOrder.diningOption === 'TAKEAWAY' ? 'TAKEAWAY / PARCEL' : 'DINE-IN'}</div>
            </div>
            <div style="font-size: 11px;">${format(new Date(lastPlacedOrder.createdAt), 'dd MMM yyyy, h:mm a')}</div>
          </div>
          <div class="divider"></div>
          <table>
            <thead>
              <tr>
                <th style="width: 60%;">Item</th>
                <th style="width: 15%;" class="text-center">Qty</th>
                <th style="width: 25%;" class="text-right">Price</th>
              </tr>
            </thead>
            <tbody>
              ${lastPlacedOrder.items.map((i: CartItem) => `
                <tr>
                  <td class="bold">${i.name}</td>
                  <td class="text-center bold">${i.qty}</td>
                  <td class="text-right">₹${(i.price * i.qty).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="divider"></div>
          <div class="row-flex"><span>Subtotal:</span><span>₹${lastPlacedOrder.subtotal.toFixed(2)}</span></div>
          <div class="row-flex"><span>GST (5%):</span><span>₹${lastPlacedOrder.tax.toFixed(2)}</span></div>
          <div class="row-flex bold" style="font-size: 14px; margin-top: 4px;">
            <span>TOTAL PAID:</span>
            <span>₹${lastPlacedOrder.grandTotal.toFixed(2)}</span>
          </div>
          <div class="divider"></div>
          <p class="center" style="font-size: 11px; margin-top: 6px;">
            Please watch the kitchen order display for your token number!<br/>
            Thank you!
          </p>
        </body>
      </html>
    `;
    printHtmlInSameTab(htmlContent);
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
            Live guest ordering touch terminal with real-time menu synchronization and instant kitchen dispatch.
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
            🛍️ Take Away (Parcel)
          </button>
        </div>
      </div>

      {/* Success Token Screen */}
      {tokenGenerated && (
        <div className="p-8 rounded-3xl bg-gradient-to-br from-card to-primary/10 border-2 border-primary/50 text-center space-y-4 shadow-2xl animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-primary/20 text-primary mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div>
            <span className="text-xs uppercase font-bold text-muted-foreground tracking-widest">
              Please Collect Your Order Receipt
            </span>
            <p className="text-5xl font-black text-primary tracking-wider mt-1">{tokenGenerated}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Payment Confirmed. Your order has been dispatched directly to the Kitchen Display System (KDS).
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              onClick={printKioskReceipt}
              variant="outline"
              className="text-xs font-bold gap-2 border-primary/30"
            >
              <Printer className="w-4 h-4" /> Print Thermal Slip
            </Button>
            <Button
              onClick={() => {
                setTokenGenerated(null);
                setLastPlacedOrder(null);
              }}
              className="text-xs font-bold"
            >
              Start Next Guest Order
            </Button>
          </div>
        </div>
      )}

      {/* Category & Search Filter Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 no-scrollbar">
          <button
            onClick={() => setSelectedCategoryId('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              selectedCategoryId === 'ALL'
                ? 'bg-primary text-primary-foreground shadow'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            All Items
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedCategoryId === cat.id
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search food & beverages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Loading Live Menu Catalogue...</p>
        </div>
      ) : (
        /* Main Kiosk Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Menu Items Grid (Left 8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {filteredItems.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground border border-dashed border-border rounded-3xl space-y-2">
                <Flame className="w-8 h-8 mx-auto text-muted-foreground/40" />
                <p className="font-semibold text-foreground">No menu items found</p>
                <p className="text-xs">Add items in the Menu Management tab to populate the kiosk.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredItems.map((item) => {
                  const defaultPrice = getItemPrice(item);
                  const primaryVariant = item.variants?.[0];
                  const itemKey = primaryVariant ? `${item.id}-${primaryVariant.id}` : item.id;
                  const inCartQty = cart[itemKey]?.qty || 0;

                  return (
                    <div
                      key={item.id}
                      className="p-5 rounded-3xl border border-border bg-card/70 backdrop-blur hover:border-primary/50 transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                item.foodType === 'NON_VEG' ? 'border-rose-500' : 'border-emerald-500'
                              }`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  item.foodType === 'NON_VEG' ? 'bg-rose-500' : 'bg-emerald-500'
                                }`}
                              />
                            </span>
                            <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                              {item.name}
                            </h3>
                          </div>
                          {item.category?.name && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                              {item.category.name}
                            </span>
                          )}
                        </div>

                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-2">
                            {item.description}
                          </p>
                        )}

                        <div className="flex items-baseline gap-2 mt-4">
                          <span className="text-xl font-black text-foreground">₹{defaultPrice.toFixed(2)}</span>
                          {item.variants && item.variants.length > 1 && (
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                              ({item.variants.length} options)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-border/50 flex items-center justify-end">
                        {inCartQty > 0 ? (
                          <div className="flex items-center gap-3 bg-primary/15 border border-primary/30 rounded-xl p-1.5">
                            <button
                              onClick={() => removeFromCart(itemKey)}
                              className="w-7 h-7 rounded-lg bg-background flex items-center justify-center text-primary font-bold hover:bg-primary/20"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="text-sm font-black text-primary px-1">{inCartQty}</span>
                            <button
                              onClick={() => addToCart(item, primaryVariant)}
                              className="w-7 h-7 rounded-lg bg-background flex items-center justify-center text-primary font-bold hover:bg-primary/20"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => addToCart(item, primaryVariant)}
                            className="font-bold text-xs gap-1.5 rounded-xl py-4"
                          >
                            <Plus className="w-4 h-4" />
                            Add to Tray
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
                          <p className="text-[11px] text-muted-foreground">₹{item.price.toFixed(2)} × {item.qty}</p>
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
                            onClick={() => {
                              const found = items.find((i) => i.id === item.menuItemId);
                              if (found) addToCart(found);
                            }}
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
                    disabled={submitOrderMutation.isPending}
                    className="w-full py-6 font-bold text-base shadow-xl gap-2 rounded-2xl bg-gradient-to-r from-primary to-amber-500 text-primary-foreground"
                  >
                    {submitOrderMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing Order...
                      </>
                    ) : (
                      <>
                        <QrCode className="w-5 h-5" />
                        Tap to Pay (UPI / Card)
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                  <ShoppingBag className="w-10 h-10 mx-auto text-muted-foreground/30" />
                  <p className="font-semibold text-foreground">Your tray is empty</p>
                  <p className="text-[11px]">Select any menu dish to start self-ordering.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
