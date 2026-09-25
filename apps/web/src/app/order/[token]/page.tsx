'use client';

import { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  UtensilsCrossed, Plus, Minus, ShoppingBag,
  ChefHat, MapPin, AlertCircle, ArrowRight,
  ShieldCheck, Lock, Eye, X, Ban,
  ChevronUp, ChevronDown, Download, CheckCircle2,
  ExternalLink, Receipt, Sparkles, Search, Clock
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

  const storageKey = `ros_guest_session_${token}`;
  const storageExpiryKey = `ros_guest_session_exp_${token}`;

  // Helper: Get stored session only if it has NOT expired yet
  const getValidStoredSession = useCallback(() => {
    if (typeof window === 'undefined') return null;
    try {
      const expStr = localStorage.getItem(storageExpiryKey);
      if (expStr) {
        const exp = Number(expStr);
        if (!isNaN(exp) && Date.now() > exp) {
          localStorage.removeItem(storageKey);
          localStorage.removeItem(storageExpiryKey);
          return null;
        }
      }
      return localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  }, [storageKey, storageExpiryKey]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableData, setTableData] = useState<any>(null);
  const [guestSessionToken, setGuestSessionToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return urlSession || getValidStoredSession();
    }
    return urlSession;
  });
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(45 * 60);
  const [isLocallyExpired, setIsLocallyExpired] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [foodFilter, setFoodFilter] = useState<'ALL' | 'VEG' | 'NON_VEG'>('ALL');
  
  // Selected variant per item ID: { [itemId]: variantId }
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  
  // Collapsible category accordion state (collapsed by default)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const toggleCategory = useCallback((catId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  }, []);
  
  // Cart keyed by item + variant: { [cartKey]: { item, variant, qty } }
  const [cart, setCart] = useState<{ [cartKey: string]: { item: any; variant: any; qty: number } }>({});
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

  const getCartKey = (itemId: string, variantId?: string) => {
    return `${itemId}_${variantId || 'std'}`;
  };

  const getActiveVariant = useCallback((item: any) => {
    if (!item?.variants || item.variants.length === 0) return null;
    const selectedId = selectedVariants[item.id];
    if (selectedId) {
      const found = item.variants.find((v: any) => v.id === selectedId);
      if (found) return found;
    }
    return item.variants[0];
  }, [selectedVariants]);

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
    try {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(storageExpiryKey);
    } catch {}
    playStatusChime('success');
  };

  // Sync session token into URL search params and localStorage (without page reloads)
  const syncSessionToken = useCallback((sessToken: string, expMs?: number) => {
    if (!sessToken) return;
    try {
      localStorage.setItem(storageKey, sessToken);
      if (expMs) {
        localStorage.setItem(storageExpiryKey, String(expMs));
      }
      if (typeof window !== 'undefined') {
        const currentUrl = new URL(window.location.href);
        if (currentUrl.searchParams.get('session') !== sessToken) {
          currentUrl.searchParams.set('session', sessToken);
          window.history.replaceState({}, '', currentUrl.toString());
        }
      }
    } catch {}
  }, [storageKey, storageExpiryKey]);

  // Session renewal handler (used on QR re-scan, session renew tap, or auto-renew)
  const renewSession = useCallback(async () => {
    if (!token) return;
    try {
      try {
        localStorage.removeItem(storageKey);
        localStorage.removeItem(storageExpiryKey);
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete('session');
          url.searchParams.delete('token');
          url.searchParams.delete('diningToken');
          window.history.replaceState({}, '', url.pathname);
        }
      } catch {}
      setGuestSessionToken(null);
      setSessionExpiresAt(null);
      setIsLocallyExpired(false);

      const res = await fetch(`${API_BASE}/tables/public/qr/${token}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data?.data) {
        setTableData(data.data);
        if (data.data.guestSessionToken) {
          setGuestSessionToken(data.data.guestSessionToken);
          syncSessionToken(data.data.guestSessionToken, data.data.sessionExpiresAt);
        }
        if (data.data.sessionExpiresAt) {
          setSessionExpiresAt(data.data.sessionExpiresAt);
        }
        setIsLocallyExpired(false);
      }
    } catch {}
  }, [token, storageKey, storageExpiryKey, syncSessionToken]);

  // Initial table data load
  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    const validStored = getValidStoredSession();
    // Only send session parameter if we have a valid non-expired token
    const sessionParam = urlSession || validStored;
    const query = sessionParam ? `?session=${encodeURIComponent(sessionParam)}` : '';

    fetch(`${API_BASE}/tables/public/qr/${token}${query}`)
      .then((res) => {
        if (!res.ok) throw new Error('Table QR token not found or expired');
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        setTableData(data.data);
        if (data.data?.isSessionExpired) {
          setIsLocallyExpired(true);
          try {
            localStorage.removeItem(storageKey);
            localStorage.removeItem(storageExpiryKey);
          } catch {}
        }
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
          syncSessionToken(data.data.guestSessionToken, data.data.sessionExpiresAt);
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
  }, [token, urlSession, storageKey, storageExpiryKey, syncSessionToken, getValidStoredSession]);

  // Real-time 45-min Session Timer countdown (Strict non-sliding)
  useEffect(() => {
    if (!sessionExpiresAt) return;

    const updateTimer = () => {
      const remainingMs = sessionExpiresAt - Date.now();
      const remainingSec = Math.max(0, Math.floor(remainingMs / 1000));
      setTimeRemainingSeconds(remainingSec);
      if (remainingSec <= 0) {
        setIsLocallyExpired(true);
        try {
          localStorage.removeItem(storageKey);
          localStorage.removeItem(storageExpiryKey);
        } catch {}
      }
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);
    return () => clearInterval(timerInterval);
  }, [sessionExpiresAt, storageKey, storageExpiryKey]);

  // Live polling for table active orders & status updates (2s fast sync with smart visibility pause)
  useEffect(() => {
    if (!token || isLocallyExpired) return;

    const performSync = async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      try {
        const validStored = getValidStoredSession();
        const sessionParam = guestSessionToken || urlSession || validStored;
        const query = sessionParam ? `?session=${encodeURIComponent(sessionParam)}` : '';
        const res = await fetch(`${API_BASE}/tables/public/qr/${token}${query}`);
        if (!res.ok) return;
        const json = await res.json();
        if (json.data) {
          setTableData(json.data);
          if (json.data?.isSessionExpired) {
            setIsLocallyExpired(true);
            try {
              localStorage.removeItem(storageKey);
              localStorage.removeItem(storageExpiryKey);
            } catch {}
          }
          if (json.data?.guestSessionToken) {
            setGuestSessionToken((prev) => prev || json.data.guestSessionToken);
            syncSessionToken(json.data.guestSessionToken, json.data.sessionExpiresAt);
          }
          if (json.data?.sessionExpiresAt) {
            setSessionExpiresAt((prev) => prev || json.data.sessionExpiresAt);
          }
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
    };

    const interval = setInterval(performSync, 2000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        performSync();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      clearInterval(interval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [token, guestSessionToken, urlSession, isLocallyExpired, storageKey, storageExpiryKey, syncSessionToken, getValidStoredSession]);

  const isSessionExpired = Boolean(
    isLocallyExpired ||
    tableData?.isSessionExpired ||
    (sessionExpiresAt ? Date.now() > sessionExpiresAt : false)
  );
  
  const canOrder = Boolean(tableData?.canOrder && guestSessionToken && !isSessionExpired);
  const minutesLeft = Math.floor(timeRemainingSeconds / 60);
  const secondsLeft = timeRemainingSeconds % 60;

  const addToCart = async (item: any, specificVariant?: any) => {
    if (tableData?.table?.status === 'BLOCKED') {
      alert('This dining table is currently blocked. Please speak with your dining captain.');
      return;
    }
    if (isSessionExpired || !guestSessionToken) {
      await renewSession();
    }
    const variant = specificVariant || getActiveVariant(item);
    const cartKey = getCartKey(item.id, variant?.id);
    setCart((prev) => {
      const existing = prev[cartKey];
      const nextQty = existing ? existing.qty + 1 : 1;
      return { ...prev, [cartKey]: { item, variant, qty: nextQty } };
    });
  };

  const removeFromCart = (cartKey: string) => {
    setCart((prev) => {
      const copy = { ...prev };
      if (!copy[cartKey]) return prev;
      if (copy[cartKey].qty > 1) {
        copy[cartKey].qty--;
      } else {
        delete copy[cartKey];
      }
      return copy;
    });
  };

  const cartList = Object.values(cart);
  const subtotal = cartList.reduce((acc, c) => {
    const itemPrice = c.variant?.price || c.item?.variants?.[0]?.price || 0;
    return acc + itemPrice * c.qty;
  }, 0);

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
        syncSessionToken(json.data.guestSessionToken);
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
  const currentActiveOrder = (activeOrders && activeOrders.length > 0)
    ? activeOrders[0]
    : (orderPlaced && !['PAID', 'COMPLETED', 'CANCELLED', 'VOIDED'].includes(orderPlaced.status))
      ? orderPlaced
      : null;

  const hasRunningOrder = Boolean(currentActiveOrder && !['PAID', 'COMPLETED', 'CANCELLED', 'VOIDED'].includes(currentActiveOrder.status));
  const activeTab = hasRunningOrder ? viewTab : 'MENU';

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
  useEffect(() => {
    if (!statusFlash) return;
    const timer = setTimeout(() => {
      setStatusFlash(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [statusFlash]);

  // Calculate ordered quantities for each dish across all active non-cancelled orders in this session
  const orderedQuantitiesByItemId = useMemo(() => {
    const map: Record<string, number> = {};
    const orders = tableData?.activeOrders || [];
    const allActive = [...orders];
    if (orderPlaced && !allActive.some((o: any) => o.id === orderPlaced.id)) {
      allActive.unshift(orderPlaced);
    }

    for (const order of allActive) {
      if (['PAID', 'COMPLETED', 'CANCELLED', 'VOIDED'].includes(order.status)) continue;
      for (const item of (order.items || [])) {
        if (['CANCELLED', 'VOIDED'].includes(item.status)) continue;
        const mId = item.menuItemId || item.menuItem?.id || item.id;
        if (mId) {
          map[mId] = (map[mId] || 0) + (item.quantity || 1);
        }
      }
    }
    return map;
  }, [tableData?.activeOrders, orderPlaced]);

  const processedCategories = useMemo(() => {
    if (!Array.isArray(categories)) return [];
    return categories.map((cat: any) => {
      let items = Array.isArray(cat.items) ? cat.items : [];
      if (foodFilter !== 'ALL') {
        items = items.filter((i: any) => i.foodType === foodFilter);
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        items = items.filter((i: any) =>
          (i.name && i.name.toLowerCase().includes(q)) ||
          (i.description && i.description.toLowerCase().includes(q))
        );
      }
      return { ...cat, items };
    }).filter((cat: any) => cat.items.length > 0);
  }, [categories, foodFilter, searchQuery]);

  // ── Early returns (after ALL hooks are declared to strictly satisfy Rules of Hooks) ────
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

      {/* ── Compact Fixed Header (Reduced height, Restaurant on Left, Logo at Center, Table on Right) ── */}
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border px-3 py-2 shadow-xs space-y-1.5">
        {/* Top Row: Restaurant on Left | Logo Center | Table Badge Right */}
        <div className="flex items-center justify-between gap-1.5">
          {/* Left: Restaurant Name & Outlet (Reduced font size to fit neatly) */}
          <div className="flex-1 min-w-0 pr-1">
            <h1 className="text-xs sm:text-sm font-black text-foreground truncate leading-tight">
              {restaurant?.name || 'Dining Restaurant'}
            </h1>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate leading-none mt-0.5">
              {restaurant?.branchName || 'Dine-In Menu'}
            </p>
          </div>

          {/* Center: Restaurant Logo */}
          <div className="shrink-0 flex items-center justify-center px-1">
            {restaurant?.logoUrl ? (
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-primary/30 p-0.5 bg-card shadow-2xs overflow-hidden">
                <img
                  src={restaurant.logoUrl}
                  alt={restaurant.name || 'Restaurant Logo'}
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
            ) : (
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center text-xs font-black border border-primary/30 shadow-2xs">
                🍴
              </div>
            )}
          </div>

          {/* Right: Quick Table Pill */}
          <div className="flex-1 min-w-0 flex justify-end pl-1">
            <div className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-xl bg-primary text-primary-foreground font-black text-[11px] sm:text-xs shadow-xs flex items-center gap-1 shrink-0 font-mono">
              <span className="text-[10px]">🍽️</span>
              <span className="truncate">{table?.name || 'Table'}</span>
            </div>
          </div>
        </div>

        {/* Subheader: Table Number Indicator (Without Active Countdown Timer) */}
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-muted/60 border border-border/80 text-[11px]">
          <div className="flex items-center gap-1.5 font-bold text-foreground">
            <span className="text-primary font-black">Table: {table?.name || '1'}</span>
            <span className="text-muted-foreground/60">•</span>
            <span className="text-[10px] text-muted-foreground font-medium">Digital QR Service</span>
          </div>

          {hasRunningOrder ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-black font-mono animate-pulse">
              <span>🍳</span>
              <span>Order Live</span>
            </span>
          ) : canOrder ? (
            <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Ready to Order
            </span>
          ) : (
            <button
              type="button"
              onClick={renewSession}
              className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
            >
              Tap to Order ⚡
            </button>
          )}
        </div>

        {/* Below Subheader: Tabs (Browse Menu & Live Order Status) */}
        {(canOrder || hasRunningOrder) && (
          <div className="grid grid-cols-2 gap-1 p-0.5 bg-muted/80 rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setViewTab('MENU')}
              className={cn(
                'py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5',
                activeTab === 'MENU'
                  ? 'bg-primary text-primary-foreground shadow-xs'
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
                'py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 relative',
                activeTab === 'LIVE_STATUS'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : hasRunningOrder
                  ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <ChefHat className="w-3.5 h-3.5" />
              <span>Live Order Status</span>
              {hasRunningOrder && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute right-2.5 top-2" />
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
                                          {variantName && <span className="font-bold text-primary">{variantName}</span>}
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

              {/* Ready to Take New Orders Card / Ordering Session Expired Card */}
              {canOrder ? (
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
              ) : isSessionExpired && hasRunningOrder ? (
                <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/25 text-center space-y-3 shadow-sm animate-in fade-in-50 duration-200">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center mx-auto text-sm font-bold">
                    ⏳
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-black text-foreground">
                      45-Minute Ordering Session Ended
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed max-w-xs mx-auto">
                      Your ongoing order is being prepared. Want to order another round of food?
                    </p>
                  </div>
                  <Button
                    onClick={async () => {
                      await renewSession();
                      setViewTab('MENU');
                    }}
                    className="w-full h-11 rounded-2xl font-bold text-xs gap-2 bg-primary text-primary-foreground shadow-md cursor-pointer"
                  >
                    <span>⚡</span>
                    <span>Start New Session &amp; Order Next Round</span>
                  </Button>
                </div>
              ) : null}

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
            TAB 2: DIGITAL FOOD MENU & 1-TAP ORDERING (VERTICAL CATEGORIES LAYOUT)
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

          {/* Search Bar & Dietary Filter Controls */}
          <div className="space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dishes, drinks, desserts..."
                className="w-full h-10 pl-10 pr-9 rounded-2xl bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              {/* Dietary Filter Pills */}
              <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => setFoodFilter('ALL')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                    foodFilter === 'ALL' ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setFoodFilter('VEG')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1",
                    foodFilter === 'VEG' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>🟢</span> Veg
                </button>
                <button
                  type="button"
                  onClick={() => setFoodFilter('NON_VEG')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1",
                    foodFilter === 'NON_VEG' ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>🔴</span> Non-Veg
                </button>
              </div>

              {/* Dishes Count Metric */}
              <span className="text-[11px] text-muted-foreground font-medium pr-1">
                {processedCategories.reduce((acc: number, c: any) => acc + c.items.length, 0)} dishes
              </span>
            </div>
          </div>

          {/* Sticky Category Quick Jump Anchor Strip */}
          {processedCategories.length > 1 && (
            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md py-2 -mx-4 px-4 border-b border-border/50 flex gap-2 overflow-x-auto no-scrollbar shadow-xs">
              {processedCategories.map((c: any) => {
                const isExpanded = searchQuery.trim().length > 0 || !!expandedCategories[c.id];
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setExpandedCategories((prev) => ({ ...prev, [c.id]: true }));
                      setTimeout(() => {
                        const el = document.getElementById(`cat-section-${c.id}`);
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }, 50);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap border transition-all cursor-pointer shrink-0 shadow-2xs flex items-center gap-1.5",
                      isExpanded
                        ? "bg-primary/15 text-primary border-primary/40 font-black"
                        : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                    )}
                  >
                    <span>{c.name}</span>
                    <span className="text-[10px] font-mono opacity-80">({c.items.length})</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Vertical Collapsible Category Sections with Food Items */}
          <div className="space-y-3 pt-1">
            {processedCategories.map((cat: any) => {
              const isExpanded = searchQuery.trim().length > 0 || !!expandedCategories[cat.id];
              const categoryCartCount = cat.items.reduce((acc: number, item: any) => {
                let count = 0;
                if (Array.isArray(item.variants) && item.variants.length > 0) {
                  for (const v of item.variants) {
                    const key = getCartKey(item.id, v.id);
                    if (cart[key]) count += cart[key].qty;
                  }
                } else {
                  const key = getCartKey(item.id);
                  if (cart[key]) count += cart[key].qty;
                }
                return acc + count;
              }, 0);

              return (
                <section key={cat.id} id={`cat-section-${cat.id}`} className="rounded-3xl bg-card border border-border/80 shadow-xs overflow-hidden scroll-mt-14 transition-all">
                  {/* Category Collapsible Header Button */}
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-3.5 text-left cursor-pointer transition-colors duration-200 select-none",
                      isExpanded
                        ? "bg-muted/60 border-b border-border/70"
                        : "bg-card hover:bg-muted/30"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center text-sm shrink-0">
                        🍽️
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-xs sm:text-sm font-black text-foreground uppercase tracking-wider truncate">
                          {cat.name}
                        </h2>
                        <p className="text-[10px] text-muted-foreground font-medium">
                          {cat.items.length} {cat.items.length === 1 ? 'dish' : 'dishes'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Active Items in Cart Pill */}
                      {categoryCartCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-black font-mono shadow-2xs animate-in zoom-in-75">
                          {categoryCartCount} in cart
                        </span>
                      )}
                      
                      <div className={cn(
                        "w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground transition-transform duration-200",
                        isExpanded && "rotate-180 bg-primary/20 text-primary border-primary/30"
                      )}>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </button>

                  {/* Food Items Under This Category (Revealed on Click) */}
                  {isExpanded && (
                    <div className="p-3 space-y-2.5 bg-background/50 animate-in fade-in slide-in-from-top-2 duration-200">
                      {cat.items.map((item: any) => {
                        const orderedQty = orderedQuantitiesByItemId[item.id] || 0;
                        const activeVariant = getActiveVariant(item);
                        const activeVariantPrice = activeVariant?.price || item.variants?.[0]?.price || 0;
                        const activeCartKey = getCartKey(item.id, activeVariant?.id);
                        const inCart = cart[activeCartKey];
                        const hasMultipleVariants = Array.isArray(item.variants) && item.variants.length > 1;

                        return (
                          <div
                            key={item.id}
                            className={cn(
                              "p-3.5 rounded-2xl bg-card border flex flex-col gap-2.5 shadow-2xs hover:border-primary/40 transition-all",
                              orderedQty > 0 ? "border-emerald-500/40 bg-emerald-500/[0.03]" : "border-border"
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1 flex-1 min-w-0 pr-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs shrink-0">
                                    {item.foodType === 'VEG' ? '🟢' : item.foodType === 'NON_VEG' ? '🔴' : '🟡'}
                                  </span>
                                  <h3 className="text-sm font-bold text-foreground truncate">{item.name}</h3>
                                </div>

                                {item.description && (
                                  <p className="text-[11px] text-muted-foreground line-clamp-2">{item.description}</p>
                                )}

                                <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                                  <span className="text-xs font-black text-primary font-mono">
                                    {safeFormatCurrency(activeVariantPrice)}
                                  </span>

                                  {/* Retained Ordered Quantity Badge on the Main Menu */}
                                  {orderedQty > 0 && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black font-mono shadow-2xs">
                                      <span>🍳</span>
                                      <span>{orderedQty} in Kitchen</span>
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Ordering Controls vs View-Only Badge */}
                              <div className="shrink-0 pt-0.5">
                                {canOrder ? (
                                  inCart ? (
                                    <div className="flex items-center gap-2 bg-primary/15 border border-primary/30 rounded-xl p-1">
                                      <button
                                        type="button"
                                        onClick={() => removeFromCart(activeCartKey)}
                                        className="w-7 h-7 rounded-lg bg-background flex items-center justify-center text-primary font-bold text-sm cursor-pointer hover:bg-muted transition-colors"
                                      >
                                        <Minus className="w-3.5 h-3.5" />
                                      </button>
                                      <span className="text-xs font-black text-primary px-1 font-mono">{inCart.qty}</span>
                                      <button
                                        type="button"
                                        onClick={() => addToCart(item, activeVariant)}
                                        className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm cursor-pointer hover:bg-primary/90 transition-colors"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <Button
                                      size="sm"
                                      onClick={() => addToCart(item, activeVariant)}
                                      className={cn(
                                        "h-8 text-xs font-bold rounded-xl gap-1 cursor-pointer transition-all",
                                        orderedQty > 0
                                          ? "bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/40"
                                          : "bg-primary text-primary-foreground"
                                      )}
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>{orderedQty > 0 ? 'Add More' : 'Add'}</span>
                                    </Button>
                                  )
                                ) : (
                                  <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-xl border border-border">
                                    View Only
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* ── HALF / FULL PORTION UNIFIED TOGGLE BUTTON ────────────── */}
                            {hasMultipleVariants && (
                              <div className="pt-1.5 border-t border-border/60 flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                  Portion:
                                </span>
                                {(() => {
                                  const isVeg = item.foodType === 'VEG' || item.foodType === 'VEGAN';
                                  return (
                                    <div
                                      className={cn(
                                        "inline-flex items-center p-0.5 rounded-full border transition-all duration-200",
                                        isVeg
                                          ? "bg-emerald-500/10 border-emerald-500/30 dark:bg-emerald-950/40"
                                          : "bg-rose-500/10 border-rose-500/30 dark:bg-rose-950/40"
                                      )}
                                    >
                                      {item.variants.map((v: any) => {
                                        const isSelected = activeVariant?.id === v.id;
                                        const vCartKey = getCartKey(item.id, v.id);
                                        const vQty = cart[vCartKey]?.qty || 0;

                                        return (
                                          <button
                                            key={v.id}
                                            type="button"
                                            onClick={() => {
                                              setSelectedVariants((prev) => ({ ...prev, [item.id]: v.id }));
                                            }}
                                            className={cn(
                                              "px-3 py-1 rounded-full text-[11px] font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 font-mono",
                                              isSelected
                                                ? (isVeg
                                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-black"
                                                    : "bg-rose-600 hover:bg-rose-700 text-white shadow-xs font-black")
                                                : (isVeg
                                                    ? "text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100"
                                                    : "text-rose-700 dark:text-rose-300 hover:text-rose-900 dark:hover:text-rose-100")
                                            )}
                                          >
                                            <span>{v.name}</span>
                                            <span className={cn(
                                              "text-[10px]",
                                              isSelected ? "opacity-90 font-bold" : "opacity-70"
                                            )}>
                                              ({safeFormatCurrency(v.price)})
                                            </span>
                                            {vQty > 0 && (
                                              <span className={cn(
                                                "w-3.5 h-3.5 rounded-full text-[8px] font-black flex items-center justify-center ml-0.5 shadow-2xs",
                                                isSelected ? "bg-white text-foreground" : "bg-foreground text-background"
                                              )}>
                                                {vQty}
                                              </span>
                                            )}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}

            {processedCategories.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground">
                <UtensilsCrossed className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm font-bold text-foreground">No dishes match your search</p>
                <p className="text-xs text-muted-foreground">Try searching for other items or reset dietary filters.</p>
              </div>
            )}
          </div>
        </main>
      )}

      {/* Floating Bottom Cart Tray (Distinct Elevated Background to distinguish from Menu) */}
      {canOrder && cartList.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-4 bg-slate-950/98 dark:bg-zinc-950/98 text-slate-100 border-t-2 border-primary/60 shadow-[0_-12px_40px_rgba(0,0,0,0.5)] z-40 space-y-3.5 rounded-t-3xl backdrop-blur-2xl animate-in slide-in-from-bottom-3 duration-200">
          {!isCartExpanded ? (
            /* Collapsed State View */
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsCartExpanded(true)}
                className="flex items-center gap-3 text-left flex-1 min-w-0 cursor-pointer group"
              >
                <div className="w-11 h-11 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary shrink-0 relative group-hover:bg-primary/30 transition-colors shadow-inner">
                  <ShoppingBag className="w-5 h-5 text-amber-400" />
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 text-slate-950 text-[10px] font-black rounded-full flex items-center justify-center shadow-md font-mono">
                    {cartList.reduce((acc, c) => acc + c.qty, 0)}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-base font-mono text-emerald-400">
                      {safeFormatCurrency(total)}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      ({cartList.reduce((acc, c) => acc + c.qty, 0)} {cartList.reduce((acc, c) => acc + c.qty, 0) === 1 ? 'item' : 'items'})
                    </span>
                  </div>
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1 group-hover:underline">
                    View itemized tray <ChevronUp className="w-3.5 h-3.5" />
                  </span>
                </div>
              </button>

              <Button
                onClick={async () => {
                  await handlePlaceOrder();
                  setViewTab('LIVE_STATUS');
                }}
                disabled={isSubmitting}
                className="h-11 px-4 rounded-xl font-black text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 cursor-pointer shrink-0"
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                {isSubmitting ? 'Sending...' : 'Send to Kitchen'}
              </Button>
            </div>
          ) : (
            /* Expanded State View */
            <>
              {/* Cart Tray Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-black text-xs text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                    <ShoppingBag className="w-4 h-4 text-amber-400" />
                    <span>Itemized Cart Tray ({cartList.reduce((acc, c) => acc + c.qty, 0)})</span>
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
                    className="text-[11px] font-bold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCartExpanded(false)}
                    className="flex items-center gap-0.5 text-xs font-bold text-amber-400 hover:underline cursor-pointer"
                  >
                    <span>Minimize</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Itemized List of Selected Items in distinct card containers */}
              <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                {cartList.map((entry) => {
                  const { item, variant, qty } = entry;
                  const unitPrice = variant?.price || item.variants?.[0]?.price || 0;
                  const lineTotal = unitPrice * qty;
                  const foodType = item.foodType || 'VEG';
                  const rowCartKey = getCartKey(item.id, variant?.id);

                  return (
                    <div
                      key={rowCartKey}
                      className="p-2.5 rounded-2xl bg-slate-900/90 dark:bg-zinc-900/90 border border-slate-800 dark:border-zinc-800 flex items-center justify-between gap-2 shadow-xs"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0 pr-1">
                        <span className="text-[11px] shrink-0">
                          {foodType === 'NON_VEG' ? '🔴' : '🟢'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-100 text-xs truncate">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {variant?.name ? <strong className="text-amber-400 font-bold">{variant.name} • </strong> : ''}
                            {safeFormatCurrency(unitPrice)} each
                          </p>
                        </div>
                      </div>

                      {/* Quantity Stepper & Line Price */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className="flex items-center gap-1 bg-slate-800 dark:bg-zinc-800 border border-slate-700/80 rounded-xl p-0.5">
                          <button
                            type="button"
                            onClick={() => removeFromCart(rowCartKey)}
                            className="w-6 h-6 rounded-lg bg-slate-700/80 dark:bg-zinc-700 flex items-center justify-center text-slate-200 font-bold text-xs cursor-pointer hover:bg-slate-600"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-black text-amber-400 px-1 font-mono">{qty}</span>
                          <button
                            type="button"
                            onClick={() => addToCart(item, variant)}
                            className="w-6 h-6 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs cursor-pointer hover:bg-primary/90"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <span className="font-mono font-black text-xs text-emerald-400 min-w-[55px] text-right">
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
                className="w-full h-9 px-3 rounded-xl border border-slate-800 bg-slate-900/90 dark:bg-zinc-900/90 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary"
              />

              {/* Subtotal / GST & Total Amount */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Total Amount ({cartList.reduce((acc, c) => acc + c.qty, 0)} items)
                  </span>
                  {taxRate > 0 && gst > 0 && (
                    <span className="text-[10px] text-slate-400 font-mono block">
                      Incl. GST ({taxRate}%): {safeFormatCurrency(gst)}
                    </span>
                  )}
                </div>
                <span className="font-black text-xl font-mono text-emerald-400">
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
                className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer"
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
                            {it.quantity || 1}x {it.menuItem?.name || it.name || 'Dish'} {it.variant?.name ? `(${it.variant.name})` : ''}
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

