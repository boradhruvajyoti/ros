'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { format, subDays, startOfDay, endOfDay, isSameDay } from 'date-fns';
import {
  ClipboardList, Search, Calendar, Filter, Printer,
  Eye, RefreshCw, ChevronRight, X, ArrowUpDown,
  UtensilsCrossed, ChefHat, CheckCircle2, AlertCircle,
  ShoppingBag, Download, Clock, DollarSign, Table as TableIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { printHtmlInSameTab } from '@/lib/print-utils';

// Self-contained currency formatter
function formatCurrency(amount: any): string {
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

function formatItemTitle(itemOrMenuName?: any, variantName?: string): string {
  let base = '';
  let vName = '';
  if (typeof itemOrMenuName === 'object' && itemOrMenuName !== null) {
    base = itemOrMenuName.menuItem?.name || itemOrMenuName.name || 'Dish Item';
    vName = itemOrMenuName.variant?.name || itemOrMenuName.variantName || variantName || '';
  } else {
    base = itemOrMenuName || 'Dish Item';
    vName = variantName || '';
  }
  if (!vName) return base;
  const lower = vName.toLowerCase().trim();
  if (
    lower === 'regular' ||
    lower === 'regular portion' ||
    lower === 'standard' ||
    lower === 'default' ||
    lower === 'single' ||
    lower === 'normal' ||
    lower === 'standard portion' ||
    lower === 'portion' ||
    lower.includes('regular portion')
  ) {
    return base;
  }
  return `${base} (${vName})`;
}

const ORDER_STATUS_META: Record<string, { label: string; bg: string; border: string; text: string }> = {
  DRAFT:           { label: 'Draft',        bg: 'bg-muted/40',       border: 'border-border/60',          text: 'text-muted-foreground' },
  CONFIRMED:       { label: 'Confirmed',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',     text: 'text-blue-500 dark:text-blue-400' },
  SENT_TO_KITCHEN: { label: 'In Kitchen',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',    text: 'text-amber-500 dark:text-amber-400' },
  PREPARING:       { label: 'Cooking',      bg: 'bg-orange-500/10',  border: 'border-orange-500/20',   text: 'text-orange-500 dark:text-orange-400' },
  READY:           { label: 'Ready',        bg: 'bg-emerald-500/10', border: 'border-emerald-500/20',  text: 'text-emerald-600 dark:text-emerald-400' },
  SERVED:          { label: 'Served',       bg: 'bg-teal-500/10',    border: 'border-teal-500/20',     text: 'text-teal-600 dark:text-teal-400' },
  BILLED:          { label: 'Billed',       bg: 'bg-purple-500/10',  border: 'border-purple-500/20',   text: 'text-purple-600 dark:text-purple-400' },
  PARTIALLY_PAID:  { label: 'Partial Paid', bg: 'bg-indigo-500/10',  border: 'border-indigo-500/20',   text: 'text-indigo-600 dark:text-indigo-400' },
  PAID:            { label: 'Paid',         bg: 'bg-emerald-500/10', border: 'border-emerald-500/20',  text: 'text-emerald-600 dark:text-emerald-400' },
  COMPLETED:       { label: 'Completed',    bg: 'bg-muted/60',       border: 'border-border/60',     text: 'text-muted-foreground' },
  CANCELLED:       { label: 'Cancelled',    bg: 'bg-rose-500/10',    border: 'border-rose-500/20',     text: 'text-rose-600 dark:text-rose-400' },
  VOIDED:          { label: 'Voided',       bg: 'bg-rose-500/10',    border: 'border-rose-500/20',     text: 'text-rose-600 dark:text-rose-400' },
};

export default function OrderHistoryPage() {
  const { data: tenant } = useQuery({
    queryKey: ['current-tenant'],
    queryFn: () => apiGet<any>('/tenants/current'),
  });

  // Filter States
  const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | '7days' | '30days' | '90days' | '365days' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTableId, setSelectedTableId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any | null>(null);

  // Compute actual date range
  const { dateFrom, dateTo } = useMemo(() => {
    const today = new Date();
    if (datePreset === 'today') {
      return {
        dateFrom: startOfDay(today).toISOString(),
        dateTo: endOfDay(today).toISOString(),
      };
    }
    if (datePreset === 'yesterday') {
      const yest = subDays(today, 1);
      return {
        dateFrom: startOfDay(yest).toISOString(),
        dateTo: endOfDay(yest).toISOString(),
      };
    }
    if (datePreset === '7days') {
      return {
        dateFrom: startOfDay(subDays(today, 7)).toISOString(),
        dateTo: endOfDay(today).toISOString(),
      };
    }
    if (datePreset === '30days') {
      return {
        dateFrom: startOfDay(subDays(today, 30)).toISOString(),
        dateTo: endOfDay(today).toISOString(),
      };
    }
    if (datePreset === '90days') {
      return {
        dateFrom: startOfDay(subDays(today, 90)).toISOString(),
        dateTo: endOfDay(today).toISOString(),
      };
    }
    if (datePreset === '365days') {
      return {
        dateFrom: startOfDay(subDays(today, 365)).toISOString(),
        dateTo: endOfDay(today).toISOString(),
      };
    }
    // Custom
    const start = customStartDate ? startOfDay(new Date(customStartDate)) : startOfDay(today);
    const end = customEndDate ? endOfDay(new Date(customEndDate)) : endOfDay(today);
    return {
      dateFrom: start.toISOString(),
      dateTo: end.toISOString(),
    };
  }, [datePreset, customStartDate, customEndDate]);

  // Fetch Tables list for filter dropdown
  const { data: tablesData } = useQuery({
    queryKey: ['tables-lookup'],
    queryFn: async () => {
      const res = await apiGet<any>('/tables');
      return Array.isArray(res) ? res : res?.data || [];
    },
  });
  const tables: any[] = tablesData || [];

  // Fetch Orders based on active date range & table
  const { data: ordersData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['order-history', dateFrom, dateTo, selectedTableId, selectedStatus, selectedType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      if (selectedTableId !== 'ALL') params.set('tableId', selectedTableId);
      if (selectedStatus !== 'ALL') params.set('status', selectedStatus);
      if (selectedType !== 'ALL') params.set('type', selectedType);
      params.set('limit', '300');

      const res = await apiGet<any>(`/orders?${params.toString()}`);
      return res?.orders || res?.data?.orders || (Array.isArray(res) ? res : []);
    },
    refetchInterval: 5000,
  });

  const orders: any[] = ordersData || [];

  // Filter by search query
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase().trim();
    return orders.filter((o) => {
      const orderNum = String(o.orderNumber || '').toLowerCase();
      const tableName = String(o.table?.name || '').toLowerCase();
      const custName = String(o.customer?.name || '').toLowerCase();
      const custPhone = String(o.customer?.phone || '').toLowerCase();
      const itemsStr = (o.items || [])
        .map((i: any) => i.menuItem?.name || i.name || '')
        .join(' ')
        .toLowerCase();

      return (
        orderNum.includes(q) ||
        tableName.includes(q) ||
        custName.includes(q) ||
        custPhone.includes(q) ||
        itemsStr.includes(q)
      );
    });
  }, [orders, searchQuery]);

  // Calculate Summary Metrics
  const metrics = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const paidOrders = filteredOrders.filter((o) => ['PAID', 'COMPLETED'].includes(o.status));
    const activeOrders = filteredOrders.filter((o) =>
      ['DRAFT', 'CONFIRMED', 'SENT_TO_KITCHEN', 'PREPARING', 'READY', 'SERVED', 'BILLED', 'PARTIALLY_PAID'].includes(o.status)
    );
    const cancelledOrders = filteredOrders.filter((o) => ['CANCELLED', 'VOIDED'].includes(o.status));
    const grossRevenue = paidOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);
    const aov = paidOrders.length > 0 ? grossRevenue / paidOrders.length : 0;

    return {
      totalOrders,
      paidCount: paidOrders.length,
      activeCount: activeOrders.length,
      cancelledCount: cancelledOrders.length,
      grossRevenue,
      aov,
    };
  }, [filteredOrders]);

  // Handle Tax Invoice Receipt Printing
  const handlePrintOrderBill = (order: any) => {
    if (!order) return;

    const itemsList = (order.items || []).filter((i: any) => !['CANCELLED', 'VOIDED'].includes(i.status));
    const itemsHtml = itemsList.map((i: any) => {
      const qty = Number(i.quantity || 1);
      const rate = Number(i.unitPrice || i.variant?.price || 0);
      const amt = Number(i.totalPrice || qty * rate);
      return `
        <tr>
          <td style="padding: 6px 0; border-bottom: 1px dashed #e2e8f0;">
            <div style="font-weight: 700; color: #0f172a; font-size: 12px;">${formatItemTitle(i)}</div>
          </td>
          <td style="padding: 6px 4px; text-align: center; font-weight: 700; border-bottom: 1px dashed #e2e8f0; font-size: 12px;">${qty}</td>
          <td style="padding: 6px 0; text-align: right; font-family: monospace; border-bottom: 1px dashed #e2e8f0; font-size: 11px;">₹${rate.toFixed(2)}</td>
          <td style="padding: 6px 0; text-align: right; font-family: monospace; font-weight: 700; border-bottom: 1px dashed #e2e8f0; font-size: 12px;">₹${amt.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${tenant?.name || 'Restaurant'} - #${order.orderNumber || ''}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            @page { size: 80mm auto; margin: 0; }
            @media print {
              html, body {
                width: 80mm !important;
                max-width: 80mm !important;
                margin: 0 auto !important;
                padding: 2mm 3mm !important;
                background: #fff !important;
              }
            }
            body {
              font-family: system-ui, -apple-system, sans-serif;
              font-size: 12px;
              color: #0f172a;
              margin: 0 auto;
              padding: 6px 4px;
              background: #fff;
              line-height: 1.4;
              width: 80mm;
              max-width: 80mm;
              box-sizing: border-box;
            }
            .receipt-box { width: 100%; margin: 0 auto; }
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
          </style>
        </head>
        <body>
          <div class="receipt-box">
            <div class="center">
              ${tenant?.logoUrl ? `<img src="${tenant.logoUrl}" class="logo" alt="Logo" />` : ''}
              <div class="title">${tenant?.name || 'Restaurant Dining'}</div>
              <div class="subtitle">Tax Invoice / Official Bill</div>
              <div class="divider"></div>
              <div class="badge-paid">${order.status === 'PAID' ? 'PAID &amp; SETTLED ✅' : order.status}</div>
              <div class="subtitle"><strong>Order #${order.orderNumber || ''}</strong> · Table: <strong>${order.table?.name ? `Table ${order.table.name}` : order.type}</strong></div>
              <div class="subtitle">${format(new Date(order.createdAt || Date.now()), 'dd MMM yyyy, h:mm a')}</div>
              ${order.customer?.name ? `<div class="subtitle">Guest: ${order.customer.name} (${order.customer.phone || ''})</div>` : ''}
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
              <span>TOTAL AMOUNT:</span>
              <span style="font-family: monospace; color: #047857;">₹${Number(order.total || 0).toFixed(2)}</span>
            </div>

            <div class="double-divider"></div>

            <div class="footer-note">
              <p style="margin: 0;"><strong>Thank you for dining with us!</strong><br/>Please visit again.</p>
            </div>

            <div class="oxom-brand">
              Digital Experience Powered by <strong>Oxomsoft Software Solution</strong><br/>
              <a href="https://www.oxomsoft.com" target="_blank">www.oxomsoft.com</a>
            </div>
          </div>
        </body>
      </html>
    `;

    printHtmlInSameTab(htmlContent);
  };

  // Handle Kitchen Order Ticket (KOT) Printing
  const handlePrintKot = (order: any) => {
    if (!order) return;

    const isHalfOrFull = (name?: string) => {
      if (!name) return false;
      const lower = name.toLowerCase().trim();
      if (
        lower === 'regular' ||
        lower === 'regular portion' ||
        lower === 'standard' ||
        lower === 'default' ||
        lower === 'single' ||
        lower === 'normal' ||
        lower === 'standard portion' ||
        lower === 'portion' ||
        lower.includes('regular portion')
      ) {
        return false;
      }
      return true;
    };

    const kots = order.kots || [];
    const kotItemsHtml = kots.flatMap((kot: any) => {
      const station = kot.kitchenStation?.name ? ` [${kot.kitchenStation.name}]` : '';
      return (kot.items || []).map((kItem: any) => {
        const oItem = kItem.orderItem || {};
        const baseName = oItem.menuItem?.name || oItem.name || 'Dish';
        const vName = oItem.variant?.name || oItem.variantName;
        const itemTitle = isHalfOrFull(vName) ? `${baseName} (${vName})` : baseName;
        const mods = Array.isArray(oItem.modifiers) && oItem.modifiers.length > 0
          ? `<div style="font-size: 11px; font-weight: normal; color: #444;">+ ${oItem.modifiers.map((m: any) => m.name).join(', ')}</div>`
          : '';
        const notes = oItem.notes ? `<div style="font-size: 11px; font-style: italic; color: #c00;">Note: ${oItem.notes}</div>` : '';

        return `
          <tr>
            <td style="padding: 5px 0; font-weight: bold; font-size: 13px;">${itemTitle}${station}${mods}${notes}</td>
            <td style="padding: 5px 4px; text-align: center; font-size: 15px; font-weight: 900;">${oItem.quantity || 1}</td>
            <td style="padding: 5px 0; text-align: right; font-weight: bold;">${kot.kotNumber ? `#${kot.kotNumber}` : ''}</td>
          </tr>
        `;
      });
    }).join('');

    const htmlContent = `
      <html>
        <head>
          <title>KOT - Order #${order.orderNumber}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            @media print {
              html, body {
                width: 80mm !important;
                max-width: 80mm !important;
                margin: 0 auto !important;
                padding: 2mm 3mm !important;
                background: #fff !important;
              }
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 13px;
              color: #000;
              padding: 6px 4px;
              margin: 0 auto;
              width: 80mm;
              max-width: 80mm;
              box-sizing: border-box;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; }
          </style>
        </head>
        <body>
          <div class="center">
            <h2 style="margin: 0;">*** KITCHEN ORDER TICKET ***</h2>
            <p style="margin: 2px 0;">Order #${order.orderNumber} · Table: ${order.table?.name || order.type}</p>
            <p style="margin: 2px 0; font-size: 11px;">${format(new Date(order.createdAt), 'dd/MM/yyyy h:mm a')}</p>
          </div>
          <div class="divider"></div>
          <table>
            <thead>
              <tr>
                <th style="text-align: left;">Item</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">KOT#</th>
              </tr>
            </thead>
            <tbody>
              ${kotItemsHtml || `<tr><td colspan="3" style="text-align: center;">No KOT items recorded</td></tr>`}
            </tbody>
          </table>
          <div class="divider"></div>
          <p class="center bold">--- END OF KOT ---</p>
        </body>
      </html>
    `;

    printHtmlInSameTab(htmlContent);
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* ── Top Header & Title ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-card border border-border/60 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Order History
            </h1>
            <p className="text-xs text-muted-foreground">
              Historical dining logs, order records, and receipt archive
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs h-9 rounded-xl gap-1.5 border-border/60 hover:bg-muted/50"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* ── Metrics Summary Strip ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-1 shadow-xs">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block">
            Total Orders
          </span>
          <p className="text-2xl font-semibold font-mono tracking-tight text-foreground">{metrics.totalOrders}</p>
          <span className="text-[11px] text-muted-foreground">In selected timeframe</span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-1 shadow-xs">
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide block">
            Gross Paid Revenue
          </span>
          <p className="text-2xl font-semibold font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
            {formatCurrency(metrics.grossRevenue)}
          </p>
          <span className="text-[11px] text-muted-foreground">
            {metrics.paidCount} Settled Orders
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-1 shadow-xs">
          <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide block">
            Avg Order Value
          </span>
          <p className="text-2xl font-semibold font-mono tracking-tight text-blue-600 dark:text-blue-400">
            {formatCurrency(metrics.aov)}
          </p>
          <span className="text-[11px] text-muted-foreground">Per settled order</span>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-1 shadow-xs">
          <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wide block">
            Cancelled / Voided
          </span>
          <p className="text-2xl font-semibold font-mono tracking-tight text-rose-600 dark:text-rose-400">{metrics.cancelledCount}</p>
          <span className="text-[11px] text-muted-foreground">Cancelled tickets</span>
        </div>
      </div>

      {/* ── Filters & Search Control Bar ───────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-3.5 shadow-xs">
        {/* Date Presets + Custom Calendar */}
        <div className="space-y-2">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span>Date Range Filter</span>
          </span>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: '7days', label: 'Last 7 Days' },
              { id: '30days', label: 'Last 30 Days' },
              { id: '90days', label: 'Last 90 Days' },
              { id: '365days', label: 'Last 365 Days' },
              { id: 'custom', label: 'Custom Calendar' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setDatePreset(p.id as any)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border',
                  datePreset === p.id
                    ? 'bg-primary/10 text-primary border-primary/30 font-semibold'
                    : 'bg-muted/40 border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/70'
                )}
              >
                {p.label}
              </button>
            ))}

            {/* Custom Date Pickers */}
            {datePreset === 'custom' && (
              <div className="flex items-center gap-2 pt-1 sm:pt-0">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="h-8 px-2.5 rounded-lg border border-border/60 bg-background text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="h-8 px-2.5 rounded-lg border border-border/60 bg-background text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}
          </div>
        </div>

        {/* Multi-Filters: Table Selector, Status, Search */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-2 border-t border-border/40">
          {/* Table Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium uppercase text-muted-foreground">
              Table / Location
            </label>
            <select
              value={selectedTableId}
              onChange={(e) => setSelectedTableId(e.target.value)}
              className="w-full h-8.5 px-2.5 rounded-lg border border-border/60 bg-background text-xs text-foreground font-normal focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="ALL">All Tables &amp; Orders</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (Cap: {t.capacity})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium uppercase text-muted-foreground">
              Order Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full h-8.5 px-2.5 rounded-lg border border-border/60 bg-background text-xs text-foreground font-normal focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="PAID">Paid</option>
              <option value="COMPLETED">Completed</option>
              <option value="SERVED">Served</option>
              <option value="BILLED">Billed</option>
              <option value="SENT_TO_KITCHEN">In Kitchen</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Order Type Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium uppercase text-muted-foreground">
              Order Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full h-8.5 px-2.5 rounded-lg border border-border/60 bg-background text-xs text-foreground font-normal focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="ALL">All Types (Dine-In / Online / Takeaway)</option>
              <option value="DINE_IN">Dine-In Table</option>
              <option value="TAKEAWAY">Takeaway / Pickup</option>
              <option value="DELIVERY">Direct Delivery</option>
              <option value="ONLINE">Online QR Order</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium uppercase text-muted-foreground">
              Quick Search
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Order #, Table, Guest..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8.5 pl-8 text-xs rounded-lg border-border/60 bg-background"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Orders List Table ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/60 bg-card shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Order Records ({filteredOrders.length})
            </h2>
          </div>
        </div>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-muted-foreground">Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 text-center space-y-2 text-muted-foreground">
            <UtensilsCrossed className="w-10 h-10 mx-auto opacity-20" />
            <p className="text-sm font-medium text-foreground">No Orders Found</p>
            <p className="text-xs">Try selecting a different date range or clearing your filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/30 text-muted-foreground font-medium uppercase tracking-wider text-[10px] border-b border-border/40">
                <tr>
                  <th className="p-3">Order #</th>
                  <th className="p-3">Table / Location</th>
                  <th className="p-3">Date &amp; Time</th>
                  <th className="p-3">Ordered Items</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Total Amount</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredOrders.map((order) => {
                  const statusCfg = ORDER_STATUS_META[order.status] || ORDER_STATUS_META.DRAFT;
                  const isPaid = ['PAID', 'COMPLETED'].includes(order.status);
                  const isCancelled = ['CANCELLED', 'VOIDED'].includes(order.status);
                  const validItems = (order.items || []).filter((i: any) => !['CANCELLED', 'VOIDED'].includes(i.status));

                  return (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrderDetails(order)}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <td className="p-3 font-mono font-medium text-foreground">
                        #{order.orderNumber}
                      </td>

                      <td className="p-3 font-medium">
                        <div className="flex items-center gap-1.5">
                          <span>{order.table?.name ? `Table ${order.table.name}` : order.type}</span>
                        </div>
                        {order.customer?.name && (
                          <span className="text-[10px] text-muted-foreground block font-normal">
                            {order.customer.name}
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-muted-foreground">
                        <div>{format(new Date(order.createdAt), 'dd MMM yyyy')}</div>
                        <div className="text-[10px] text-muted-foreground/70">{format(new Date(order.createdAt), 'h:mm a')}</div>
                      </td>

                      <td className="p-3">
                        <div className="font-medium text-foreground">
                          {validItems.length} {validItems.length === 1 ? 'Dish' : 'Dishes'}
                        </div>
                        <div className="text-[10px] text-muted-foreground line-clamp-1 max-w-xs">
                          {validItems.map((i: any) => `${i.quantity}x ${formatItemTitle(i)}`).join(', ')}
                        </div>
                      </td>

                      <td className="p-3">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-md text-[10px] font-medium border inline-flex items-center gap-1',
                            statusCfg.bg,
                            statusCfg.text,
                            statusCfg.border
                          )}
                        >
                          <span>{statusCfg.label}</span>
                        </span>
                      </td>

                      <td className="p-3 font-mono font-medium text-xs">
                        <span className={cn(isPaid ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : isCancelled ? 'text-rose-500 line-through' : 'text-foreground font-semibold')}>
                          {formatCurrency(order.total)}
                        </span>
                      </td>

                      <td className="p-3.5 text-right">
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handlePrintKot(order)}
                            className="p-1.5 rounded-xl border border-amber-500/30 text-amber-500 hover:bg-amber-500/10 cursor-pointer"
                            title="Print KOT"
                          >
                            🍳
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePrintOrderBill(order)}
                            className="p-1.5 rounded-xl border border-border text-foreground hover:bg-muted cursor-pointer"
                            title="Print Bill Receipt"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedOrderDetails(order)}
                            className="p-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer"
                            title="View Full Itemized Breakdown"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          ORDER DETAILS SLIDEOVER / MODAL
      ───────────────────────────────────────────────────────────────────────────── */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 my-auto max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-foreground">
                    Order #{selectedOrderDetails.orderNumber}
                  </h3>
                  {(() => {
                    const cfg = ORDER_STATUS_META[selectedOrderDetails.status] || ORDER_STATUS_META.DRAFT;
                    return (
                      <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-medium border', cfg.bg, cfg.text, cfg.border)}>
                        {cfg.label}
                      </span>
                    );
                  })()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedOrderDetails.table?.name ? `Table ${selectedOrderDetails.table.name}` : selectedOrderDetails.type} · {format(new Date(selectedOrderDetails.createdAt), 'dd MMM yyyy, h:mm a')}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrderDetails(null)}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Customer Details if available */}
            {selectedOrderDetails.customer && (
              <div className="p-3 rounded-2xl bg-muted/40 border border-border text-xs space-y-1">
                <span className="font-bold text-muted-foreground block text-[10px] uppercase">
                  Guest Information
                </span>
                <p className="font-bold text-foreground">
                  {selectedOrderDetails.customer.name} {selectedOrderDetails.customer.phone && `(${selectedOrderDetails.customer.phone})`}
                </p>
              </div>
            )}

            {/* Itemized Bill Table */}
            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <UtensilsCrossed className="w-3.5 h-3.5 text-primary" />
                <span>Itemized Dishes</span>
              </span>

              <div className="border border-border/80 rounded-2xl overflow-hidden divide-y divide-border/60">
                {(selectedOrderDetails.items || []).map((item: any, idx: number) => {
                  const isCancelled = ['CANCELLED', 'VOIDED'].includes(item.status);
                  const lineAmt = item.totalPrice || (item.quantity * (item.unitPrice || item.variant?.price || 0));

                  return (
                    <div
                      key={item.id || idx}
                      className={cn(
                        'p-3 flex items-center justify-between gap-3 text-xs bg-card',
                        isCancelled && 'opacity-50 line-through bg-rose-500/5'
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-foreground truncate">
                            {item.quantity}x {formatItemTitle(item)}
                          </span>
                        </div>
                        {item.notes && (
                          <p className="text-[10px] text-amber-400 italic">Note: {item.notes}</p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-foreground">
                          {formatCurrency(lineAmt)}
                        </span>
                        {isCancelled && (
                          <span className="block text-[9px] text-rose-400 font-bold uppercase">Cancelled</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bill Summary */}
            <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal:</span>
                <span className="font-mono font-medium">
                  {formatCurrency(selectedOrderDetails.subtotal || selectedOrderDetails.total)}
                </span>
              </div>
              {Number(selectedOrderDetails.taxAmount || 0) > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Taxes &amp; GST:</span>
                  <span className="font-mono font-medium">
                    {formatCurrency(selectedOrderDetails.taxAmount)}
                  </span>
                </div>
              )}
              {Number(selectedOrderDetails.discountAmount || 0) > 0 && (
                <div className="flex justify-between text-emerald-400 font-medium">
                  <span>Discount Applied:</span>
                  <span className="font-mono">- {formatCurrency(selectedOrderDetails.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-2 border-t border-border text-sm font-black text-foreground">
                <span>Grand Total:</span>
                <span className="text-base font-mono text-emerald-400">
                  {formatCurrency(selectedOrderDetails.total)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => handlePrintKot(selectedOrderDetails)}
                className="rounded-xl text-xs font-bold gap-1.5 h-11"
              >
                🍳 Print KOT
              </Button>
              <Button
                onClick={() => handlePrintOrderBill(selectedOrderDetails)}
                className="rounded-xl text-xs font-bold gap-1.5 h-11 bg-primary text-primary-foreground shadow-md"
              >
                <Printer className="w-3.5 h-3.5" /> Print Tax Invoice
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
