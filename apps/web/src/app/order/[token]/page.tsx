'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  UtensilsCrossed, Plus, Minus, ShoppingBag, CheckCircle2,
  Clock, Sparkles, ChefHat, Phone, MapPin, AlertCircle, ArrowRight,
  ShieldCheck, RefreshCw, Lock, Eye, Bell, X, Volume2, Download, Receipt, Printer, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@ros/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

function safeFormatCurrency(amount: any): string {
  const num = Number(amount);
  if (isNaN(num)) return '₹0.00';
  try {
    return formatCurrency(num);
  } catch {
    return `₹${num.toFixed(2)}`;
  }
}

interface StatusFlashNotification {
  id: string;
  orderNumber?: string;
  title: string;
  message: string;
  icon: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  bg: string;
  border: string;
  text: string;
}

function playStatusChime(type: 'success' | 'info' | 'alert') {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16); // G5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } else if (type === 'alert') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(330, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    }
  } catch {}

  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([120, 60, 120]);
    }
  } catch {}
}

function TableOrderContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = (params?.token as string) || '';
  const urlSession = searchParams
    ? (searchParams.get('session') || searchParams.get('token') || searchParams.get('diningToken'))
    : null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableData, setTableData] = useState<any>(null);
  const [guestSessionToken, setGuestSessionToken] = useState<string | null>(null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(45 * 60);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [cart, setCart] = useState<{ [itemId: string]: { item: any; variant: any; qty: number } }>({});
  const [guestNotes, setGuestNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<any | null>(null);
  const [viewTab, setViewTab] = useState<'MENU' | 'LIVE_STATUS'>('MENU');
  const [statusFlash, setStatusFlash] = useState<StatusFlashNotification | null>(null);

  const lastSeenStatusRef = useRef<string | null>(null);
  const isInitialStatusLoadRef = useRef<boolean>(true);

  const fetchTableData = () => {
    if (!token) return;
    setLoading(true);
    const sessionParam = urlSession || guestSessionToken;
    const query = sessionParam ? `?session=${encodeURIComponent(sessionParam)}` : '';

    fetch(`${API_BASE}/tables/public/qr/${token}${query}`)
      .then((res) => {
        if (!res.ok) throw new Error('Table QR token not found or expired');
        return res.json();
      })
      .then((data) => {
        setTableData(data.data);
        if (data.data?.activeOrders && data.data.activeOrders.length > 0) {
          setOrderPlaced(data.data.activeOrders[0]);
        }
        if (data.data?.guestSessionToken) {
          setGuestSessionToken(data.data.guestSessionToken);
        }
        if (data.data?.sessionExpiresAt) {
          setSessionExpiresAt(data.data.sessionExpiresAt);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Could not load table menu');
        setLoading(false);
      });
  };

  // Initial table data load
  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    const sessionParam = urlSession;
    const query = sessionParam ? `?session=${encodeURIComponent(sessionParam)}` : '';

    fetch(`${API_BASE}/tables/public/qr/${token}${query}`)
      .then((res) => {
        if (!res.ok) throw new Error('Table QR token not found or expired');
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        setTableData(data.data);
        if (data.data?.activeOrders && data.data.activeOrders.length > 0) {
          setOrderPlaced(data.data.activeOrders[0]);
        }
        if (data.data?.guestSessionToken) {
          setGuestSessionToken(data.data.guestSessionToken);
        }
        if (data.data?.sessionExpiresAt) {
          setSessionExpiresAt(data.data.sessionExpiresAt);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Could not load table menu');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token, urlSession]);

  // Real-time 45-min Session Timer countdown
  useEffect(() => {
    if (!sessionExpiresAt) return;

    const updateTimer = () => {
      const remainingMs = sessionExpiresAt - Date.now();
      const remainingSec = Math.max(0, Math.floor(remainingMs / 1000));
      setTimeRemainingSeconds(remainingSec);
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);
    return () => clearInterval(timerInterval);
  }, [sessionExpiresAt]);

  // Live polling for table active orders & status updates (2s fast sync)
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(async () => {
      try {
        const sessionParam = guestSessionToken || urlSession;
        const query = sessionParam ? `?session=${encodeURIComponent(sessionParam)}` : '';
        const res = await fetch(`${API_BASE}/tables/public/qr/${token}${query}`);
        if (!res.ok) return;
        const json = await res.json();
        if (json.data) {
          setTableData(json.data);
          if (json.data.activeOrders && json.data.activeOrders.length > 0) {
            setOrderPlaced(json.data.activeOrders[0]);
          } else {
            setOrderPlaced(null);
          }
        }
      } catch {
        // silent catch for background polling
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [token, guestSessionToken, urlSession]);

  const isSessionExpired = sessionExpiresAt ? Date.now() > sessionExpiresAt : false;
  const canOrder = Boolean(tableData?.canOrder && guestSessionToken && !isSessionExpired);
  const minutesLeft = Math.floor(timeRemainingSeconds / 60);
  const secondsLeft = timeRemainingSeconds % 60;

  const addToCart = (item: any) => {
    if (!canOrder) {
      alert('Please scan the QR code at your dining table to unlock ordering.');
      return;
    }
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
    if (!canOrder || !guestSessionToken) {
      alert('Ordering is only available when scanning the QR code inside the restaurant.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/tables/public/qr/${token}/order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-guest-session-token': guestSessionToken,
        },
        body: JSON.stringify({
          guestSessionToken,
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
      if (json.data?.guestSessionToken) {
        setGuestSessionToken(json.data.guestSessionToken);
      }
      if (json.data?.sessionExpiresAt) {
        setSessionExpiresAt(json.data.sessionExpiresAt);
      }
      setCart({});
    } catch (err: any) {
      alert(err.message || 'Failed to send order to kitchen');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadBill = (order: any) => {
    if (!order) return;
    if (!['PAID', 'COMPLETED'].includes(order.status)) {
      alert('Bill download is only available after payment has been marked as PAID.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups in your browser to download/print your dining bill.');
      return;
    }

    const tenantName = tableData?.restaurant?.name || 'Restaurant Dining';
    const tenantLogo = tableData?.restaurant?.logoUrl;
    const branchName = tableData?.restaurant?.branchName || 'Main Dining Hall';
    const tableName = tableData?.table?.name || 'Table';
    const orderDate = new Date(order.createdAt || Date.now()).toLocaleString();
    const subtotalAmt = Number(order.subtotal || order.total || 0);
    const taxAmt = Number(order.taxAmount || 0);
    const discountAmt = Number(order.discountAmount || 0);
    const totalAmt = Number(order.total || 0);

    const itemsHtml = (order.items || []).map((it: any) => {
      const name = it.menuItem?.name || it.name || 'Dish';
      const variant = it.variant?.name ? ` (${it.variant.name})` : '';
      const qty = it.quantity || 1;
      const unitPrice = Number(it.variant?.price || it.unitPrice || 0);
      const lineTotal = Number(it.totalPrice || it.lineTotal || (unitPrice * qty));
      return `
        <tr>
          <td style="padding: 6px 2px; border-bottom: 1px dashed #e2e8f0;">
            <div style="font-weight: bold; color: #0f172a;">${name}${variant}</div>
            <div style="font-size: 11px; color: #64748b;">${qty} × ₹${unitPrice.toFixed(2)}</div>
          </td>
          <td style="padding: 6px 2px; text-align: right; font-weight: bold; font-family: monospace; border-bottom: 1px dashed #e2e8f0; vertical-align: middle;">
            ₹${lineTotal.toFixed(2)}
          </td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bill_Receipt_${order.orderNumber}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            @page { margin: 6mm; size: auto; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              background: #fff;
              max-width: 380px;
              margin: 0 auto;
              padding: 16px;
              font-size: 13px;
              line-height: 1.4;
            }
            .center { text-align: center; }
            .header-logo { width: 55px; height: 55px; border-radius: 50%; object-fit: cover; margin: 0 auto 8px; display: block; border: 2px solid #059669; }
            .restaurant-title { font-size: 18px; font-weight: 900; margin: 0 0 2px; }
            .branch-subtitle { font-size: 12px; color: #64748b; margin: 0 0 10px; }
            .paid-badge {
              display: inline-block;
              border: 2px solid #059669;
              background: #ecfdf5;
              color: #059669;
              padding: 4px 14px;
              border-radius: 9999px;
              font-weight: 900;
              font-size: 12px;
              letter-spacing: 0.5px;
              margin: 6px 0;
            }
            .divider { border-top: 1px dashed #cbd5e1; margin: 12px 0; }
            .double-divider { border-top: 2px solid #0f172a; margin: 12px 0; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 13px; }
            .row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 12px; }
            .total-row { display: flex; justify-content: space-between; margin-top: 8px; font-size: 16px; font-weight: 900; color: #0f172a; }
            .footer { text-align: center; font-size: 11px; color: #64748b; margin-top: 20px; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="center">
            ${tenantLogo ? `<img src="${tenantLogo}" class="header-logo" alt="Logo" />` : ''}
            <h1 class="restaurant-title">${tenantName}</h1>
            <p class="branch-subtitle">${branchName}</p>
            <div class="paid-badge">✓ OFFICIAL TAX RECEIPT — PAID</div>
          </div>

          <div class="divider"></div>

          <div class="row"><span><strong>Invoice / Order:</strong></span><span>#${order.orderNumber}</span></div>
          <div class="row"><span><strong>Table:</strong></span><span>${tableName}</span></div>
          <div class="row"><span><strong>Date:</strong></span><span>${orderDate}</span></div>

          <div class="divider"></div>

          <table>
            <thead>
              <tr style="border-bottom: 2px solid #0f172a; text-transform: uppercase; font-size: 11px; color: #64748b;">
                <th style="text-align: left; padding: 4px 2px;">Item</th>
                <th style="text-align: right; padding: 4px 2px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="divider"></div>

          <div class="row"><span>Subtotal:</span><span>₹${subtotalAmt.toFixed(2)}</span></div>
          ${discountAmt > 0 ? `<div class="row" style="color: #059669;"><span>Discount:</span><span>-₹${discountAmt.toFixed(2)}</span></div>` : ''}
          ${taxAmt > 0 ? `<div class="row"><span>GST &amp; Taxes:</span><span>₹${taxAmt.toFixed(2)}</span></div>` : ''}

          <div class="double-divider"></div>

          <div class="total-row">
            <span>Total Paid:</span>
            <span style="font-family: monospace;">₹${totalAmt.toFixed(2)}</span>
          </div>

          <div class="footer">
            <p style="margin: 4px 0; font-weight: bold; color: #0f172a;">Thank you for dining with us!</p>
            <p style="margin: 2px 0;">Have a wonderful rest of your day.</p>
          </div>

          <div class="no-print" style="margin-top: 24px; text-align: center;">
            <button onclick="window.print()" style="background: #059669; color: #fff; border: none; padding: 12px 28px; border-radius: 12px; font-weight: 900; cursor: pointer; font-size: 14px; box-shadow: 0 4px 12px rgba(5,150,105,0.3);">
              🖨️ Print / Save PDF
            </button>
          </div>

          <script>
            setTimeout(() => {
              window.print();
            }, 400);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

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

  const { table = {}, restaurant = {}, categories = [], activeOrders = [] } = tableData || {};
  const currentActiveOrder = (activeOrders && activeOrders.length > 0) ? activeOrders[0] : orderPlaced;

  // ── Watch order status transitions and flash notifications ─────────────────
  useEffect(() => {
    if (!currentActiveOrder) {
      lastSeenStatusRef.current = null;
      return;
    }

    const currentStatus = currentActiveOrder.status;
    const orderNum = currentActiveOrder.orderNumber;

    if (isInitialStatusLoadRef.current) {
      isInitialStatusLoadRef.current = false;
      lastSeenStatusRef.current = currentStatus;
      return;
    }

    if (lastSeenStatusRef.current && lastSeenStatusRef.current !== currentStatus) {
      const prev = lastSeenStatusRef.current;
      lastSeenStatusRef.current = currentStatus;

      let config: {
        title: string;
        message: string;
        icon: string;
        type: 'info' | 'success' | 'warning' | 'alert';
        bg: string;
        border: string;
        text: string;
      } | null = null;

      if (['SENT_TO_KITCHEN', 'PREPARING'].includes(currentStatus)) {
        config = {
          title: 'Cooking in Kitchen!',
          message: 'Our kitchen team is now preparing your dishes fresh at the station.',
          icon: '👨‍🍳',
          type: 'info',
          bg: 'bg-emerald-950/95 text-white',
          border: 'border-emerald-500/60 shadow-emerald-500/20',
          text: 'text-emerald-400',
        };
      } else if (currentStatus === 'READY') {
        config = {
          title: 'Food is Ready to Serve!',
          message: 'Your dishes are plated and our waitstaff is bringing them straight to your table.',
          icon: '🛎️',
          type: 'success',
          bg: 'bg-amber-950/95 text-white',
          border: 'border-amber-500/60 shadow-amber-500/20',
          text: 'text-amber-400',
        };
      } else if (currentStatus === 'SERVED') {
        config = {
          title: 'Dishes Served!',
          message: 'Enjoy your meal! You can order more dishes anytime from your phone.',
          icon: '🍽️',
          type: 'success',
          bg: 'bg-teal-950/95 text-white',
          border: 'border-teal-500/60 shadow-teal-500/20',
          text: 'text-teal-400',
        };
      } else if (currentStatus === 'BILLED') {
        config = {
          title: 'Bill Prepared',
          message: 'Your dining bill has been prepared. Please settle with the staff.',
          icon: '🧾',
          type: 'info',
          bg: 'bg-blue-950/95 text-white',
          border: 'border-blue-500/60 shadow-blue-500/20',
          text: 'text-blue-400',
        };
      } else if (['PAID', 'COMPLETED'].includes(currentStatus)) {
        config = {
          title: 'Payment Complete!',
          message: 'Thank you for dining with us! Have a wonderful day.',
          icon: '✅',
          type: 'success',
          bg: 'bg-emerald-950/95 text-white',
          border: 'border-emerald-500/60 shadow-emerald-500/20',
          text: 'text-emerald-400',
        };
      } else if (['CANCELLED', 'VOIDED'].includes(currentStatus)) {
        config = {
          title: 'Order Cancelled',
          message: 'This dining order was cancelled. Please speak with your dining captain.',
          icon: '❌',
          type: 'alert',
          bg: 'bg-rose-950/95 text-white',
          border: 'border-rose-500/60 shadow-rose-500/20',
          text: 'text-rose-400',
        };
      } else if (currentStatus === 'CONFIRMED' && prev === 'DRAFT') {
        config = {
          title: 'Order Confirmed!',
          message: 'Your order was confirmed and sent to the kitchen queue.',
          icon: '✨',
          type: 'info',
          bg: 'bg-indigo-950/95 text-white',
          border: 'border-indigo-500/60 shadow-indigo-500/20',
          text: 'text-indigo-400',
        };
      }

      if (config) {
        if (['PAID', 'COMPLETED'].includes(currentStatus)) {
          setCart({});
          setGuestNotes('');
        }

        setStatusFlash({
          id: `${currentStatus}-${Date.now()}`,
          orderNumber: orderNum,
          ...config,
        });

        playStatusChime(config.type === 'alert' ? 'alert' : config.type === 'success' ? 'success' : 'info');
      }
    } else if (!lastSeenStatusRef.current) {
      lastSeenStatusRef.current = currentStatus;
    }
  }, [currentActiveOrder]);

  // Auto-dismiss status flash notification after 7 seconds
  useEffect(() => {
    if (!statusFlash) return;
    const timer = setTimeout(() => {
      setStatusFlash(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [statusFlash]);

  const allItems = Array.isArray(categories)
    ? categories.flatMap((c: any) => c?.items || [])
    : [];

  const filteredItems = selectedCategory === 'ALL'
    ? allItems
    : (Array.isArray(categories) ? (categories.find((c: any) => c.id === selectedCategory)?.items || []) : []);

  const hasRunningOrder = !!currentActiveOrder;

  return (
    <div className="min-h-screen bg-background text-foreground pb-36 max-w-lg mx-auto shadow-2xl border-x border-border relative">
      {/* ── Floating Status Change Flash Notification ───────────────────────── */}
      {statusFlash && (
        <div className="fixed top-4 left-4 right-4 max-w-md mx-auto z-50 animate-in slide-in-from-top-4 duration-300">
          <div
            className={cn(
              'p-4 rounded-3xl border shadow-2xl backdrop-blur-xl flex items-start gap-3.5 relative overflow-hidden ring-2 ring-white/10',
              statusFlash.bg,
              statusFlash.border
            )}
          >
            {/* Ambient background glow */}
            <div className="absolute -right-8 -top-8 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />

            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-2xl shrink-0 shadow-inner">
              {statusFlash.icon}
            </div>

            <div className="flex-1 min-w-0 pr-5 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn('text-xs font-black uppercase tracking-wider', statusFlash.text)}>
                  {statusFlash.title}
                </span>
                {statusFlash.orderNumber && (
                  <span className="text-[10px] font-mono bg-white/20 border border-white/30 px-1.5 py-0.5 rounded-md text-white font-bold">
                    #{statusFlash.orderNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-white/95 font-medium leading-snug">
                {statusFlash.message}
              </p>
              {viewTab !== 'LIVE_STATUS' && (
                <button
                  type="button"
                  onClick={() => {
                    setViewTab('LIVE_STATUS');
                    setStatusFlash(null);
                  }}
                  className="mt-1 inline-flex items-center gap-1 text-[11px] font-black underline text-white hover:text-white/80 cursor-pointer pt-0.5"
                >
                  View Live Tracking <ArrowRight className="w-3 h-3 inline" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setStatusFlash(null)}
              aria-label="Close notification"
              className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/10 hover:bg-white/25 text-white/90 hover:text-white flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Top Restaurant & Table Banner */}
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border p-4 shadow-sm space-y-3">
        {restaurant?.logoUrl && (
          <div className="flex justify-center pb-0.5">
            <div className="w-14 h-14 rounded-full border-2 border-primary/40 p-0.5 bg-card shadow-sm flex items-center justify-center overflow-hidden mx-auto">
              <img
                src={restaurant.logoUrl}
                alt={restaurant.name || 'Restaurant Logo'}
                className="w-full h-full object-cover rounded-full"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-foreground">{restaurant?.name || 'Dining Restaurant'}</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3 text-primary" /> {restaurant?.branchName || 'Main Dining Hall'}
            </p>
          </div>
          <div className="px-3 py-1.5 rounded-2xl bg-primary text-primary-foreground font-black text-xs shadow flex items-center gap-1.5">
            <span>🍽️</span>
            <span>{table?.name || 'Table'}</span>
          </div>
        </div>

        {/* Security & Access State Indicator */}
        {canOrder ? (
          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px]">
            <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">In-Restaurant Session Active</span>
            </div>
            <div className="flex items-center gap-1 shrink-0 font-mono font-bold text-emerald-600 dark:text-emerald-400">
              ⏳ {minutesLeft}m {secondsLeft < 10 ? `0${secondsLeft}` : secondsLeft}s
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
              <Eye className="w-3.5 h-3.5 shrink-0" />
              <span>View-Only Digital Menu</span>
            </div>
            <span className="text-[10px] opacity-90 font-medium">Scan Table QR to Order</span>
          </div>
        )}

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
                const status = currentActiveOrder.status || 'DRAFT';
                const isDraft = status === 'DRAFT';
                const isReceived = status === 'CONFIRMED' || isDraft;
                const isCooking = ['SENT_TO_KITCHEN', 'PREPARING'].includes(status);
                const isReady = status === 'READY';
                const isServed = status === 'SERVED';
                const isBilled = status === 'BILLED';
                const isPaid = ['PAID', 'COMPLETED'].includes(status);
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
                            isDraft ? 'bg-amber-500/15 text-amber-400 animate-pulse' :
                            isReceived ? 'bg-amber-500/15 text-amber-400 animate-pulse' :
                            isCooking ? 'bg-emerald-500/15 text-emerald-400 animate-pulse' :
                            isReady ? 'bg-emerald-500/20 text-emerald-300 animate-bounce' :
                            isServed ? 'bg-teal-500/15 text-teal-400' :
                            isPaid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-primary/15 text-primary'
                          )}>
                            {isDraft ? '✍️' : isReceived ? '✨' : isCooking ? '👨‍🍳' : isReady ? '🛎️' : isServed ? '🍽️' : isPaid ? '✅' : '🧾'}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <h2 className="text-lg font-black text-foreground">
                            {isDraft ? 'Updating Items (Draft)' :
                             isReceived ? 'Order Received & Queued' :
                             isCooking ? 'Cooking in Kitchen!' :
                             isReady ? 'Food is Ready to Serve!' :
                             isServed ? 'Dishes Served to Table' :
                             isPaid ? 'Payment Settled & Complete' : 'Order Billed & Settling'}
                          </h2>
                          <p className="text-xs font-bold text-emerald-400">Order #{currentActiveOrder.orderNumber}</p>
                        </div>

                        {/* Kitchen Display Progress Stepper */}
                        <div className="pt-2 pb-1">
                          <div className="grid grid-cols-4 gap-1 text-center">
                            {[
                              { label: 'Received', done: true, active: isReceived || isDraft },
                              { label: 'Cooking', done: isCooking || isReady || isServed || isBilled || isPaid, active: isCooking },
                              { label: 'Ready', done: isReady || isServed || isBilled || isPaid, active: isReady },
                              { label: 'Served', done: isServed || isBilled || isPaid, active: isServed || isBilled || isPaid },
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
                          {isDraft && 'Items are currently being updated or added by restaurant staff.'}
                          {isReceived && !isDraft && 'Your order is safely received and ready to be accepted by the kitchen staff.'}
                          {isCooking && 'Chefs are currently preparing your fresh hot dishes at the kitchen stations.'}
                          {isReady && 'Your dishes are plated and our waitstaff is bringing them directly to your table.'}
                          {isServed && `Enjoy your meal at ${table?.name || 'your table'}! You can order more items whenever you wish.`}
                          {isBilled && 'Your dining bill has been prepared. Please settle with the staff.'}
                          {isPaid && 'Thank you for dining with us! Have a wonderful day.'}
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* Itemized Order Breakdown with Rate & Qty */}
              <div className="p-4 rounded-3xl bg-card border border-border space-y-3">
                {restaurant?.logoUrl && (
                  <div className="flex justify-center pb-1 border-b border-border/50">
                    <div className="w-12 h-12 rounded-full border-2 border-primary/40 p-0.5 bg-card shadow-sm flex items-center justify-center overflow-hidden mx-auto">
                      <img
                        src={restaurant.logoUrl}
                        alt={restaurant.name || 'Restaurant Logo'}
                        className="w-full h-full object-cover rounded-full"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Ordered Dishes ({currentActiveOrder.items?.length || 0})
                  </span>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {table?.name}
                  </span>
                </div>

                <div className="divide-y divide-border/60">
                  {(() => {
                    const items = currentActiveOrder.items || [];
                    const consolidated = items.reduce((acc: any[], it: any) => {
                      const mId = it.menuItemId || it.menuItem?.id || it.name || 'item';
                      const vId = it.variantId || it.variant?.id || 'std';
                      const existing = acc.find(
                        (x) => (x.menuItemId || x.menuItem?.id || x.name) === mId && (x.variantId || x.variant?.id || 'std') === vId
                      );
                      if (existing) {
                        existing.quantity = (existing.quantity || 1) + (it.quantity || 1);
                        existing.totalPrice = Number(existing.totalPrice || existing.lineTotal || 0) + Number(it.totalPrice || it.lineTotal || ((it.variant?.price || it.unitPrice || 0) * (it.quantity || 1)));
                      } else {
                        acc.push({ ...it, quantity: it.quantity || 1 });
                      }
                      return acc;
                    }, []);

                    return consolidated.map((it: any, i: number) => {
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
                                <span>@ {safeFormatCurrency(unitPrice)}</span>
                              </div>
                              {it.notes && (
                                <p className="text-[10px] text-amber-400 italic mt-0.5">Note: {it.notes}</p>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0 font-mono font-bold text-foreground">
                            {safeFormatCurrency(lineTotal)}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Running Total */}
                <div className="border-t border-border pt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal:</span>
                    <span className="font-mono">{safeFormatCurrency(currentActiveOrder.subtotal || currentActiveOrder.total || 0)}</span>
                  </div>
                  {Number(currentActiveOrder.taxAmount || 0) > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Taxes &amp; GST:</span>
                      <span className="font-mono">{safeFormatCurrency(Number(currentActiveOrder.taxAmount || 0))}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline pt-2 border-t border-border text-sm font-black text-foreground">
                    <span>Total Amount:</span>
                    <span className="text-base font-mono text-emerald-400">
                      {safeFormatCurrency(currentActiveOrder.total || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Download Bill / Receipt Action (Enabled only once marked PAID) */}
              <div className="space-y-2 pt-1">
                {['PAID', 'COMPLETED'].includes(currentActiveOrder.status) ? (
                  <div className="space-y-2">
                    <Button
                      onClick={() => handleDownloadBill(currentActiveOrder)}
                      className="w-full h-12 rounded-2xl font-black text-xs gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Paid Bill / Receipt 🧾</span>
                    </Button>

                    {canOrder && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCart({});
                          setViewTab('MENU');
                        }}
                        className="w-full h-11 rounded-2xl font-bold text-xs gap-2 border-primary/40 text-primary hover:bg-primary/10"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Start New Order / Add More Dishes</span>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button
                      disabled
                      className="w-full h-12 rounded-2xl font-black text-xs gap-2 bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-60"
                      title="Download Bill will unlock once payment has been completed & marked as PAID by cashier."
                    >
                      <Lock className="w-4 h-4" />
                      <span>Download Bill (Available Once Paid) 🧾</span>
                    </Button>

                    {canOrder && (
                      <Button
                        onClick={() => setViewTab('MENU')}
                        className="w-full h-12 rounded-2xl font-black text-xs gap-2 bg-primary text-primary-foreground shadow-lg"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add More Dishes to this Table</span>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-16 text-center space-y-3 bg-card rounded-3xl border border-border p-6">
              <div className="w-16 h-16 rounded-3xl bg-muted/60 border border-border flex items-center justify-center mx-auto text-2xl">
                🍽️
              </div>
              <h3 className="text-base font-black text-foreground">No Active Orders Yet</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                {canOrder
                  ? 'Browse our delicious menu and place an order directly from your phone.'
                  : 'Browse our menu below. To order, please scan the QR standee on your dining table.'}
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
            {Array.isArray(categories) && categories.map((c: any) => (
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
                    <p className="text-xs font-black text-primary font-mono">{safeFormatCurrency(price)}</p>
                  </div>

                  {/* Ordering Controls vs View-Only Badge */}
                  <div className="shrink-0">
                    {canOrder ? (
                      inCart ? (
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
                      )
                    ) : (
                      <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-xl border border-border">
                        View Only
                      </span>
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

      {/* Floating Bottom Cart Bar (Only when In-Store Session is Active) */}
      {canOrder && cartList.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-4 bg-card/95 backdrop-blur-lg border-t border-border shadow-2xl z-40 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-primary" />
              {cartList.reduce((acc, c) => acc + c.qty, 0)} Items Selected
            </span>
            <div className="text-right">
              {taxRate > 0 && gst > 0 && (
                <div className="text-[10px] text-muted-foreground font-mono">
                  Subtotal: {safeFormatCurrency(subtotal)} + GST ({taxRate}%): {safeFormatCurrency(gst)}
                </div>
              )}
              <span className="font-black text-base font-mono text-primary">
                {safeFormatCurrency(total)}
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

export default function PublicTableOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 space-y-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-muted-foreground">Loading Table Menu...</p>
        </div>
      }
    >
      <TableOrderContent />
    </Suspense>
  );
}
