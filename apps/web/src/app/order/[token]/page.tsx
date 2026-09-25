'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  UtensilsCrossed, Plus, Minus, ShoppingBag,
  ChefHat, MapPin, AlertCircle, ArrowRight,
  ShieldCheck, Lock, Eye, X, Ban,
  ChevronUp, ChevronDown, Download, CheckCircle2,
  ExternalLink, Receipt, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

// Self-contained currency formatter — no external package dependency
function safeFormatCurrency(amount: any): string {
  const num = Number(amount);
  if (isNaN(num) || !isFinite(num)) return '₹0.00';
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(num);
  } catch {
    return `₹${num.toFixed(2)}`;
  }
}

// ── Thermal & Standard Tax Invoice Printable Receipt Generator ────────────────
function handlePrintTaxInvoice(order: any, restaurant: any, table: any) {
  if (!order) return;
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to download and print the receipt.');
    return;
  }

  const itemsList = (order.items || []).filter((i: any) => !['CANCELLED', 'VOIDED'].includes(i.status));
  const itemsHtml = itemsList.map((i: any) => {
    const qty = Number(i.quantity || 1);
    const rate = Number(i.unitPrice || i.variant?.price || 0);
    const amt = Number(i.totalPrice || qty * rate);
    return `
      <tr>
        <td style="padding: 6px 0; border-bottom: 1px dashed #e2e8f0;">
          <div style="font-weight: 700; color: #0f172a; font-size: 12px;">${i.menuItem?.name || i.name || 'Dish Item'}</div>
          ${i.variant?.name ? `<div style="font-size: 10px; color: #64748b;">${i.variant.name}</div>` : ''}
        </td>
        <td style="padding: 6px 4px; text-align: center; font-weight: 700; border-bottom: 1px dashed #e2e8f0; font-size: 12px;">${qty}</td>
        <td style="padding: 6px 0; text-align: right; font-family: monospace; border-bottom: 1px dashed #e2e8f0; font-size: 11px;">₹${rate.toFixed(2)}</td>
        <td style="padding: 6px 0; text-align: right; font-family: monospace; font-weight: 700; border-bottom: 1px dashed #e2e8f0; font-size: 12px;">₹${amt.toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Dining Bill - ${restaurant?.name || 'Restaurant'} - #${order.orderNumber || ''}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          @page { margin: 8mm; size: 80mm auto; }
          body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; color: #0f172a; margin: 0; padding: 16px 12px; background: #fff; line-height: 1.4; }
          .receipt-box { max-width: 340px; margin: 0 auto; }
          .center { text-align: center; }
          .logo { width: 56px; height: 56px; border-radius: 50%; object-fit: cover; margin: 0 auto 8px; border: 2px solid #0f172a; display: block; }
          .title { font-size: 18px; font-weight: 900; text-transform: uppercase; margin: 0 0 2px; color: #0f172a; letter-spacing: -0.5px; }
          .subtitle { font-size: 11px; color: #64748b; margin-bottom: 2px; }
          .badge-paid { display: inline-block; background: #ecfdf5; color: #047857; border: 1.5px solid #059669; font-weight: 900; font-size: 11px; padding: 3px 12px; border-radius: 999px; margin: 8px 0; }
          .divider { border-top: 1px dashed #cbd5e1; margin: 10px 0; }
          .double-divider { border-top: 2px solid #0f172a; margin: 10px 0; }
          table { width: 100%; border-collapse: collapse; margin: 8px 0; }
          th { text-align: left; padding: 4px 0; font-size: 10px; text-transform: uppercase; color: #64748b; border-bottom: 1.5px solid #0f172a; }
          .row-flex { display: flex; justify-content: space-between; padding: 3px 0; font-size: 12px; }
          .grand-total { font-size: 15px; font-weight: 900; color: #0f172a; padding: 6px 0; }
          .footer-note { font-size: 11px; color: #475569; margin-top: 14px; text-align: center; }
          .oxom-brand { font-size: 10px; color: #64748b; margin-top: 14px; border-top: 1px dashed #cbd5e1; padding-top: 10px; text-align: center; }
          .oxom-brand a { color: #0284c7; text-decoration: none; font-weight: 700; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="receipt-box">
          <div class="center">
            ${restaurant?.logoUrl ? `<img src="${restaurant.logoUrl}" class="logo" alt="Logo" />` : ''}
            <div class="title">${restaurant?.name || 'Restaurant Dining'}</div>
            ${restaurant?.branchName ? `<div class="subtitle">${restaurant.branchName}</div>` : ''}
            ${restaurant?.address ? `<div class="subtitle">${restaurant.address}</div>` : ''}
            ${restaurant?.phone ? `<div class="subtitle">Tel: ${restaurant.phone}</div>` : ''}
            <div class="divider"></div>
            <div class="badge-paid">PAID &amp; SETTLED ✅</div>
            <div class="subtitle"><strong>Order #${order.orderNumber || ''}</strong> · Table: <strong>${table?.name || 'Table'}</strong></div>
            <div class="subtitle">${new Date(order.createdAt || Date.now()).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</div>
          </div>

          <div class="divider"></div>

          <table>
            <thead>
              <tr>
                <th style="width: 48%;">Item</th>
                <th style="width: 14%; text-align: center;">Qty</th>
                <th style="width: 18%; text-align: right;">Rate</th>
                <th style="width: 20%; text-align: right;">Amt</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="divider"></div>

          <div class="row-flex">
            <span style="color: #64748b;">Subtotal:</span>
            <span style="font-family: monospace; font-weight: 600;">₹${Number(order.subtotal || order.total || 0).toFixed(2)}</span>
          </div>

          ${Number(order.taxAmount || 0) > 0 ? `
            <div class="row-flex">
              <span style="color: #64748b;">Taxes &amp; GST:</span>
              <span style="font-family: monospace; font-weight: 600;">₹${Number(order.taxAmount).toFixed(2)}</span>
            </div>
          ` : ''}

          ${Number(order.discountAmount || 0) > 0 ? `
            <div class="row-flex">
              <span style="color: #64748b;">Discount:</span>
              <span style="font-family: monospace; font-weight: 600;">-₹${Number(order.discountAmount).toFixed(2)}</span>
            </div>
          ` : ''}

          <div class="double-divider"></div>

          <div class="row-flex grand-total">
            <span>TOTAL PAID:</span>
            <span style="font-family: monospace; color: #047857;">₹${Number(order.total || 0).toFixed(2)}</span>
          </div>

          <div class="double-divider"></div>

          <div class="footer-note">
            <p style="margin: 0;"><strong>Thank you for dining with us!</strong><br/>We look forward to serving you again.</p>
          </div>

          <div class="oxom-brand">
            Digital Experience Powered by <strong>Oxomsoft Software Solution</strong><br/>
            <a href="https://www.oxomsoft.com" target="_blank">www.oxomsoft.com</a>
          </div>
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
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
  const [isCartExpanded, setIsCartExpanded] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<any | null>(null);
  const [viewTab, setViewTab] = useState<'MENU' | 'LIVE_STATUS'>('MENU');
  const [statusFlash, setStatusFlash] = useState<StatusFlashNotification | null>(null);

  // Paid & Settled completion sequence state
  const [paidSettledOrder, setPaidSettledOrder] = useState<any | null>(null);
  const [isReceiptExpanded, setIsReceiptExpanded] = useState<boolean>(false);
  const handledPaidOrderIdsRef = useRef<Set<string>>(new Set());

  const lastSeenStatusRef = useRef<string | null>(null);
  const isInitialStatusLoadRef = useRef<boolean>(true);

  const triggerPaymentSettlement = (settledOrder: any) => {
    if (!settledOrder || !settledOrder.id) return;
    if (handledPaidOrderIdsRef.current.has(settledOrder.id)) return;
    handledPaidOrderIdsRef.current.add(settledOrder.id);
    setPaidSettledOrder(settledOrder);
    // Sequence Step 2: Close token session immediately
    setGuestSessionToken(null);
    setSessionExpiresAt(null);
    setCart({});
    setGuestNotes('');
    setOrderPlaced(null);
    playStatusChime('success');
  };

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
        if (data.data?.recentSettledOrder) {
          triggerPaymentSettlement(data.data.recentSettledOrder);
        }
        if (data.data?.activeOrders && data.data.activeOrders.length > 0) {
          setOrderPlaced(data.data.activeOrders[0]);
        } else {
          setOrderPlaced(null);
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
        if (data.data?.recentSettledOrder) {
          triggerPaymentSettlement(data.data.recentSettledOrder);
        }
        if (data.data?.activeOrders && data.data.activeOrders.length > 0) {
          setOrderPlaced(data.data.activeOrders[0]);
        } else {
          setOrderPlaced(null);
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
          if (json.data?.recentSettledOrder) {
            triggerPaymentSettlement(json.data.recentSettledOrder);
          }
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
      setTableData((prev: any) => {
        if (!prev) return prev;
        const active = prev.activeOrders ? [...prev.activeOrders] : [];
        const idx = active.findIndex((o: any) => o.id === json.data?.id);
        if (idx >= 0) {
          active[idx] = json.data;
        } else if (json.data) {
          active.unshift(json.data);
        }
        return { ...prev, activeOrders: active };
      });
      setCart({});
      setGuestNotes('');
      setIsCartExpanded(false);
      setViewTab('LIVE_STATUS');
    } catch (err: any) {
      alert(err.message || 'Failed to send order to kitchen');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Derive active order BEFORE early returns so hooks below can reference it safely
  const { table = {}, restaurant = {}, categories = [], activeOrders = [] } = tableData || {};
  const currentActiveOrder = (canOrder && activeOrders && activeOrders.length > 0)
    ? activeOrders[0]
    : (canOrder && orderPlaced && !['PAID', 'COMPLETED', 'CANCELLED', 'VOIDED'].includes(orderPlaced.status))
      ? orderPlaced
      : null;

  // ── Watch order status transitions and flash notifications ─────────────────
  // MUST be before any early returns to satisfy Rules of Hooks
  // eslint-disable-next-line react-hooks/rules-of-hooks
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
          icon: '👨\u200d🍳',
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
          triggerPaymentSettlement(currentActiveOrder);
        } else if (['CANCELLED', 'VOIDED'].includes(currentStatus)) {
          setCart({});
          setGuestNotes('');
          setOrderPlaced(null);
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
  // MUST be before any early returns to satisfy Rules of Hooks
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!statusFlash) return;
    const timer = setTimeout(() => {
      setStatusFlash(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [statusFlash]);

  // ── Early returns (after all hooks are declared) ────────────────────────────
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

  // (currentActiveOrder & hooks already declared above, before early returns)

  const allItems = Array.isArray(categories)
    ? categories.flatMap((c: any) => c?.items || [])
    : [];

  const filteredItems = selectedCategory === 'ALL'
    ? allItems
    : (Array.isArray(categories) ? (categories.find((c: any) => c.id === selectedCategory)?.items || []) : []);

  const hasRunningOrder = Boolean(canOrder && currentActiveOrder && !['PAID', 'COMPLETED', 'CANCELLED', 'VOIDED'].includes(currentActiveOrder.status));
  const activeTab = canOrder ? viewTab : 'MENU';

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
              {canOrder && activeTab !== 'LIVE_STATUS' && (
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

        {/* Tab Navigation: Enabled when ordering session is active; hidden in view-only mode */}
        {canOrder && (
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/80 rounded-2xl border border-border">
            <button
              type="button"
              onClick={() => setViewTab('MENU')}
              className={cn(
                'py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5',
                activeTab === 'MENU'
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
                activeTab === 'LIVE_STATUS'
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
        )}
      </header>

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 1: LIVE KITCHEN DISPLAY & ORDER TRACKER (Session only)
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'LIVE_STATUS' ? (
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

              {/* ───────────────────────────────────────────────────────────────────
                  KITCHEN DISPLAY LIVE TRACKER (KOTs & Preparation Rounds)
              ─────────────────────────────────────────────────────────────────── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <ChefHat className="w-3.5 h-3.5 text-primary" />
                    <span>Kitchen Display Live Tracking</span>
                  </h3>
                  {currentActiveOrder.kots && currentActiveOrder.kots.length > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {currentActiveOrder.kots.length} {currentActiveOrder.kots.length === 1 ? 'KOT Ticket' : 'KOT Tickets (Rounds)'}
                    </span>
                  )}
                </div>

                {currentActiveOrder.kots && currentActiveOrder.kots.length > 0 ? (
                  <div className="space-y-3">
                    {currentActiveOrder.kots.map((kot: any, kIdx: number) => {
                      const kotStatus = kot.status || 'NEW';
                      const isKotNew = kotStatus === 'NEW';
                      const isKotAccepted = kotStatus === 'ACCEPTED';
                      const isKotCooking = ['PREPARING', 'COOKING'].includes(kotStatus);
                      const isKotReady = kotStatus === 'READY';
                      const isKotServed = kotStatus === 'SERVED';
                      const isKotCancelled = kotStatus === 'CANCELLED';

                      return (
                        <div
                          key={kot.id || kIdx}
                          className={cn(
                            'p-4 rounded-3xl border-2 bg-card space-y-3 transition-all shadow-sm overflow-hidden',
                            isKotNew ? 'border-blue-500/40 bg-blue-500/5' :
                            isKotAccepted ? 'border-amber-500/50 bg-amber-500/5' :
                            isKotCooking ? 'border-orange-500/50 bg-orange-500/5' :
                            isKotReady ? 'border-emerald-500/50 bg-emerald-500/5' :
                            isKotServed ? 'border-teal-500/30 bg-teal-500/5' :
                            'border-rose-500/30 bg-rose-500/5'
                          )}
                        >
                          {/* KOT Header */}
                          <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-foreground">
                                KOT #{kot.kotNumber || kIdx + 1}
                              </span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                                Round {kIdx + 1}
                              </span>
                              {kot.kitchenStation?.name && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">
                                  {kot.kitchenStation.name}
                                </span>
                              )}
                            </div>

                            <span className={cn(
                              'text-[10px] font-black uppercase px-2.5 py-1 rounded-xl flex items-center gap-1 border shadow-xs',
                              isKotNew ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' :
                              isKotAccepted ? 'bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse' :
                              isKotCooking ? 'bg-orange-500/15 text-orange-400 border-orange-500/30 animate-pulse' :
                              isKotReady ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-bounce' :
                              isKotServed ? 'bg-teal-500/15 text-teal-400 border-teal-500/30' :
                              'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            )}>
                              {isKotNew ? '⏳ Queued' :
                               isKotAccepted ? '👨‍🍳 Accepted' :
                               isKotCooking ? '🔥 Cooking' :
                               isKotReady ? '🛎️ Ready' :
                               isKotServed ? '🍽️ Served' : '❌ Cancelled'}
                            </span>
                          </div>

                          {/* KOT Progress Stepper */}
                          {!isKotCancelled && (
                            <div className="pt-1 pb-1">
                              <div className="grid grid-cols-4 gap-1 text-center">
                                {[
                                  { label: 'Queued', done: true, active: isKotNew },
                                  { label: 'Accepted', done: isKotAccepted || isKotCooking || isKotReady || isKotServed, active: isKotAccepted },
                                  { label: 'Cooking', done: isKotCooking || isKotReady || isKotServed, active: isKotCooking },
                                  { label: 'Served', done: isKotServed, active: isKotServed || isKotReady },
                                ].map((step, sIdx) => (
                                  <div key={sIdx} className="space-y-1">
                                    <div
                                      className={cn(
                                        'h-1.5 rounded-full transition-all',
                                        step.active ? 'bg-primary animate-pulse' :
                                        step.done ? 'bg-emerald-500' : 'bg-muted'
                                      )}
                                    />
                                    <span
                                      className={cn(
                                        'text-[9px] font-bold block truncate',
                                        step.active ? 'text-primary font-black' :
                                        step.done ? 'text-foreground' : 'text-muted-foreground opacity-60'
                                      )}
                                    >
                                      {step.label}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Dishes in this KOT */}
                          <div className="space-y-1.5 pt-1">
                            {kot.items && kot.items.length > 0 ? (
                              kot.items.map((kItem: any, iIdx: number) => {
                                const oItem = kItem.orderItem || {};
                                const mItem = oItem.menuItem || {};
                                const variant = oItem.variant || {};
                                const dishName = mItem.name || oItem.name || 'Dish Item';
                                const variantName = variant.name;
                                const qty = oItem.quantity || 1;
                                const itemStatus = kItem.status || kotStatus;
                                const isItemCancelled = itemStatus === 'CANCELLED';

                                return (
                                  <div
                                    key={kItem.id || iIdx}
                                    className={cn(
                                      'flex items-center justify-between p-2 rounded-2xl bg-muted/40 border border-border/50 text-xs',
                                      isItemCancelled && 'opacity-50 line-through bg-rose-500/5 border-rose-500/20'
                                    )}
                                  >
                                    <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                                      <span className="text-[10px] shrink-0">
                                        {mItem.foodType === 'NON_VEG' ? '🔴' : '🟢'}
                                      </span>
                                      <div className="min-w-0 flex-1">
                                        <p className="font-bold text-foreground truncate">
                                          {dishName}
                                        </p>
                                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                          {variantName && <span>{variantName}</span>}
                                          <span>Qty: <strong className="text-foreground font-mono">{qty}</strong></span>
                                          {oItem.notes && <span className="text-amber-400 italic">({oItem.notes})</span>}
                                        </div>
                                      </div>
                                    </div>

                                    <span className={cn(
                                      'text-[9px] font-bold uppercase px-2 py-0.5 rounded-lg shrink-0',
                                      itemStatus === 'CANCELLED' ? 'bg-rose-500/15 text-rose-400' :
                                      itemStatus === 'SERVED' ? 'bg-teal-500/15 text-teal-400' :
                                      itemStatus === 'READY' ? 'bg-emerald-500/15 text-emerald-400' :
                                      itemStatus === 'PREPARING' ? 'bg-orange-500/15 text-orange-400' :
                                      itemStatus === 'ACCEPTED' ? 'bg-amber-500/15 text-amber-400' :
                                      'bg-blue-500/15 text-blue-400'
                                    )}>
                                      {itemStatus === 'PREPARING' ? 'Cooking' : itemStatus}
                                    </span>
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-[11px] text-muted-foreground italic">Dishes sent to kitchen.</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 rounded-3xl bg-muted/30 border border-border text-center space-y-1 text-xs text-muted-foreground">
                    <p className="font-bold text-foreground">⏳ Waiting for Kitchen KOT Acceptance</p>
                    <p className="text-[11px]">Your dishes are sent to the kitchen and will appear with live station tracking once accepted.</p>
                  </div>
                )}
              </div>

              {/* Ready to Take New Orders Card */}
              {canOrder && (
                <div className="p-4 rounded-3xl bg-primary/10 border border-primary/25 text-center space-y-3 shadow-sm animate-in fade-in-50 duration-200">
                  <div className="space-y-1">
                    <p className="text-sm font-black text-foreground flex items-center justify-center gap-1.5">
                      <span>✨</span> Ready to Take New Orders
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Dishes sent to kitchen. Cart is cleared and ready for your next round of items.
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      setCart({});
                      setGuestNotes('');
                      setIsCartExpanded(false);
                      setViewTab('MENU');
                    }}
                    className="w-full h-12 rounded-2xl font-black text-xs gap-2 bg-primary text-primary-foreground shadow-lg cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>
                      {['PAID', 'COMPLETED'].includes(currentActiveOrder.status)
                        ? 'Start New Order / Browse Menu'
                        : ['CANCELLED', 'VOIDED'].includes(currentActiveOrder.status)
                        ? 'Place a New Order'
                        : 'Add More Dishes / Order Next Round'}
                    </span>
                  </Button>
                </div>
              )}

              {/* Current Bill Summary (Compact) */}
              <div className="p-4 rounded-3xl bg-card border border-border space-y-2.5">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Current Bill Summary
                  </span>
                  <span className="text-[11px] font-bold text-foreground">
                    {table?.name}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
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
                    <span>Total Running Amount:</span>
                    <span className="text-base font-mono text-emerald-400">
                      {safeFormatCurrency(currentActiveOrder.total || 0)}
                    </span>
                  </div>
                </div>
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

      {/* Floating Bottom Cart Bar (Collapsed by default, expandable to view itemized list) */}
      {canOrder && cartList.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-3.5 bg-card/95 backdrop-blur-xl border-t border-border shadow-2xl z-40 space-y-3 animate-in slide-in-from-bottom-3 duration-200">
          {!isCartExpanded ? (
            /* Collapsed State View */
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsCartExpanded(true)}
                className="flex items-center gap-2.5 text-left flex-1 min-w-0 cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 relative group-hover:bg-primary/20 transition-colors">
                  <ShoppingBag className="w-5 h-5" />
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary text-primary-foreground text-[10px] font-black rounded-full flex items-center justify-center shadow-md font-mono">
                    {cartList.reduce((acc, c) => acc + c.qty, 0)}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-sm font-mono text-foreground">
                      {safeFormatCurrency(total)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      ({cartList.reduce((acc, c) => acc + c.qty, 0)} {cartList.reduce((acc, c) => acc + c.qty, 0) === 1 ? 'item' : 'items'})
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-primary flex items-center gap-0.5 group-hover:underline">
                    View order details <ChevronUp className="w-3.5 h-3.5" />
                  </span>
                </div>
              </button>

              <Button
                onClick={async () => {
                  await handlePlaceOrder();
                  setViewTab('LIVE_STATUS');
                }}
                disabled={isSubmitting}
                className="h-11 px-4 rounded-xl font-black text-xs gap-1.5 shadow-md shadow-primary/20 cursor-pointer shrink-0"
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                {isSubmitting ? 'Sending...' : 'Send to Kitchen'}
              </Button>
            </div>
          ) : (
            /* Expanded State View */
            <>
              {/* Cart Header */}
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <span className="font-black text-xs text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                    <ShoppingBag className="w-4 h-4 text-primary" />
                    <span>Selected Dishes ({cartList.reduce((acc, c) => acc + c.qty, 0)})</span>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCart({});
                      setGuestNotes('');
                      setIsCartExpanded(false);
                    }}
                    className="text-[11px] font-bold text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer"
                  >
                    Clear Cart
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCartExpanded(false)}
                    className="flex items-center gap-0.5 text-[11px] font-bold text-primary hover:underline cursor-pointer"
                  >
                    <span>Hide</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Itemized List of Selected Items with Title, Quantity Controls & Price */}
              <div className="max-h-48 overflow-y-auto divide-y divide-border/50 pr-1 space-y-1">
                {cartList.map((entry) => {
                  const { item, variant, qty } = entry;
                  const unitPrice = variant?.price || item.variants?.[0]?.price || 150;
                  const lineTotal = unitPrice * qty;
                  const foodType = item.foodType || 'VEG';

                  return (
                    <div
                      key={item.id}
                      className="py-2 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                        <span className="text-[10px] shrink-0">
                          {foodType === 'NON_VEG' ? '🔴' : '🟢'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-foreground truncate">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {variant?.name ? `${variant.name} • ` : ''}
                            {safeFormatCurrency(unitPrice)} each
                          </p>
                        </div>
                      </div>

                      {/* Quantity Stepper & Line Price */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-xl p-0.5">
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            className="w-6 h-6 rounded-lg bg-background flex items-center justify-center text-primary font-bold text-xs cursor-pointer hover:bg-muted"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-black text-primary px-1 font-mono">{qty}</span>
                          <button
                            type="button"
                            onClick={() => addToCart(item)}
                            className="w-6 h-6 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs cursor-pointer hover:bg-primary/90"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="font-mono font-black text-xs text-foreground min-w-[55px] text-right">
                          {safeFormatCurrency(lineTotal)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Special Instructions Note */}
              <input
                type="text"
                placeholder="Special instructions (e.g. less spicy, no onions)..."
                value={guestNotes}
                onChange={(e) => setGuestNotes(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />

              {/* Subtotal / GST & Total Amount */}
              <div className="pt-2 border-t border-border/80 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Total ({cartList.reduce((acc, c) => acc + c.qty, 0)} items)
                  </span>
                  {taxRate > 0 && gst > 0 && (
                    <span className="text-[10px] text-muted-foreground font-mono block">
                      Incl. GST ({taxRate}%): {safeFormatCurrency(gst)}
                    </span>
                  )}
                </div>
                <span className="font-black text-lg font-mono text-primary">
                  {safeFormatCurrency(total)}
                </span>
              </div>

              {/* Place Order Button */}
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
            </>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          PAID & SETTLED COMPLETION MODAL (Payment Confirmation, Bill Download & Branding)
      ───────────────────────────────────────────────────────────────────────────── */}
      {paidSettledOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-card border-2 border-emerald-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 text-center my-auto relative">
            
            {/* Step 1: Payment Confirmation Message */}
            <div className="space-y-3">
              <div className="w-16 h-16 bg-emerald-500/15 border-2 border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-3xl shadow-inner animate-bounce">
                ✅
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full inline-block">
                  Payment Confirmed &amp; Settled
                </span>
                <h2 className="text-xl font-black text-foreground">
                  Thank You for Dining With Us!
                </h2>
                <p className="text-xs text-muted-foreground">
                  Order <strong className="text-foreground">#{paidSettledOrder.orderNumber}</strong> for <strong className="text-foreground">{table?.name || 'Table'}</strong> has been successfully settled.
                </p>
              </div>

              {/* Amount Paid Pill */}
              <div className="p-3 rounded-2xl bg-muted/50 border border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-bold">Total Amount Paid:</span>
                <span className="text-lg font-mono font-black text-emerald-400">
                  {safeFormatCurrency(paidSettledOrder.total || 0)}
                </span>
              </div>
            </div>

            {/* Step 2: Session Closed Notice */}
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground bg-muted/30 border border-border/80 px-3 py-2 rounded-2xl">
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              <span>Dining Token Session Closed &amp; Cleared</span>
            </div>

            {/* Step 3: Download Bill & Itemized Preview */}
            <div className="space-y-3 pt-1 text-left">
              <Button
                onClick={() => handlePrintTaxInvoice(paidSettledOrder, restaurant, table)}
                className="w-full h-12 rounded-2xl font-black text-xs gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download / Print Tax Invoice Receipt</span>
              </Button>

              {/* Expandable itemized summary */}
              <div className="border border-border/70 rounded-2xl p-3 bg-muted/20 space-y-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsReceiptExpanded(!isReceiptExpanded)}
                  className="w-full flex items-center justify-between font-bold text-muted-foreground hover:text-foreground cursor-pointer text-[11px]"
                >
                  <span>View Itemized Bill Details</span>
                  {isReceiptExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {isReceiptExpanded && (
                  <div className="space-y-1.5 pt-2 border-t border-border/50 divide-y divide-border/30 max-h-40 overflow-y-auto pr-1">
                    {(paidSettledOrder.items || [])
                      .filter((i: any) => !['CANCELLED', 'VOIDED'].includes(i.status))
                      .map((it: any, idx: number) => (
                        <div key={idx} className="flex justify-between py-1 text-[11px]">
                          <span className="truncate flex-1 pr-2">
                            {it.quantity || 1}x {it.menuItem?.name || it.name || 'Dish'}
                          </span>
                          <span className="font-mono font-bold text-foreground shrink-0">
                            {safeFormatCurrency(
                              it.totalPrice ||
                                (it.quantity || 1) * (it.unitPrice || it.variant?.price || 0)
                            )}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Thank you & Powered by Oxomsoft Branding */}
            <div className="pt-3 border-t border-border/80 space-y-3 text-center">
              <div className="space-y-1.5">
                {restaurant?.logoUrl && (
                  <div className="w-12 h-12 rounded-full border-2 border-primary/30 p-0.5 mx-auto overflow-hidden shadow-sm">
                    <img
                      src={restaurant.logoUrl}
                      alt={restaurant?.name}
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                )}
                <p className="text-sm font-black text-foreground">
                  Thank you for choosing {restaurant?.name || 'our restaurant'}!
                </p>
              </div>

              <div className="text-[11px] text-muted-foreground space-y-1 bg-muted/40 p-3 rounded-2xl border border-border/60">
                <p className="font-medium">
                  Digital Experience Powered by <strong className="text-foreground font-bold">Oxomsoft Software Solution</strong>
                </p>
                <a
                  href="https://www.oxomsoft.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-bold inline-flex items-center gap-1"
                >
                  <span>www.oxomsoft.com</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <Button
                variant="outline"
                onClick={() => setPaidSettledOrder(null)}
                className="w-full h-10 rounded-2xl text-xs font-bold border-border hover:bg-muted cursor-pointer"
              >
                Close &amp; Browse Menu (View Only)
              </Button>
            </div>

          </div>
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
