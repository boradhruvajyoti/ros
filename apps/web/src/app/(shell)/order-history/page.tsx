'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { format, subDays, startOfDay, endOfDay, isSameDay } from 'date-fns';
import {
  ClipboardList, Search, Calendar, Filter, Printer,
  Eye, RefreshCw, ChevronRight, ChevronDown, ChevronUp, X, ArrowUpDown,
  UtensilsCrossed, ChefHat, CheckCircle2, AlertCircle,
  ShoppingBag, Download, Clock, DollarSign, Table as TableIcon,
  Users, Layers, Sparkles, Package, Bike, QrCode, Receipt
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `₹${num.toFixed(0)}`;
  }
}

function extractGuestCount(order: any): number {
  if (typeof order?.guestCount === 'number' && order.guestCount > 0) return order.guestCount;
  if (typeof order?.covers === 'number' && order.covers > 0) return order.covers;
  if (order?.notes) {
    const match = String(order.notes).match(/(?:\[(?:Pax|Guests|Guest Count):\s*(\d+)\])|(?:(?:Pax|Guests|Guest Count):\s*(\d+))/i);
    if (match) {
      const c = parseInt(match[1] || match[2], 10);
      if (!isNaN(c) && c > 0) return c;
    }
  }
  return order?.table?.capacity || 1;
}

function getOrderTypeBadge(type?: string) {
  const t = (type || 'DINE_IN').toUpperCase();
  switch (t) {
    case 'PRE_ORDER':
      return (
        <span className="inline-flex items-center gap-1 text-[10.5px] font-black px-2 py-0.5 rounded-lg bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/40">
          🎟️ Pre Order
        </span>
      );
    case 'DINE_IN':
      return (
        <span className="inline-flex items-center gap-1 text-[10.5px] font-black px-2 py-0.5 rounded-lg bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40">
          🍽️ Dine-In
        </span>
      );
    case 'TAKEAWAY':
    case 'PICKUP':
    case 'DRIVE_THRU':
      return (
        <span className="inline-flex items-center gap-1 text-[10.5px] font-black px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/40">
          📦 Takeaway
        </span>
      );
    case 'DELIVERY':
      return (
        <span className="inline-flex items-center gap-1 text-[10.5px] font-black px-2 py-0.5 rounded-lg bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/40">
          🛵 Delivery
        </span>
      );
    case 'ONLINE':
    case 'QR_ORDER':
      return (
        <span className="inline-flex items-center gap-1 text-[10.5px] font-black px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/40">
          📱 Online QR
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-[10.5px] font-black px-2 py-0.5 rounded-lg bg-muted text-foreground border border-border">
          {t}
        </span>
      );
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

type GroupByMode = 'DATE' | 'WEEK' | 'MONTH' | 'YEAR' | 'FLAT';

interface OrderGroup {
  id: string;
  title: string;
  subtitle?: string;
  orders: any[];
  totalOrders: number;
  totalGuests: number;
  totalRevenue: number;
}

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
  const [groupBy, setGroupBy] = useState<GroupByMode>('DATE');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
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
      params.set('limit', '500');

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
    const totalGuests = filteredOrders.reduce((acc, o) => acc + extractGuestCount(o), 0);
    const paidOrders = filteredOrders.filter((o) => ['PAID', 'COMPLETED'].includes(o.status));
    const activeOrders = filteredOrders.filter((o) =>
      ['DRAFT', 'CONFIRMED', 'SENT_TO_KITCHEN', 'PREPARING', 'READY', 'SERVED', 'BILLED', 'PARTIALLY_PAID'].includes(o.status)
    );
    const cancelledOrders = filteredOrders.filter((o) => ['CANCELLED', 'VOIDED'].includes(o.status));
    const grossRevenue = paidOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);
    const aov = paidOrders.length > 0 ? grossRevenue / paidOrders.length : 0;

    return {
      totalOrders,
      totalGuests,
      paidCount: paidOrders.length,
      activeCount: activeOrders.length,
      cancelledCount: cancelledOrders.length,
      grossRevenue,
      aov,
    };
  }, [filteredOrders]);

  // Group orders as per subfilter selection (Date Wise, Week Wise, Month Wise, Year Wise, Flat)
  const groupedOrders = useMemo<OrderGroup[]>(() => {
    if (groupBy === 'FLAT') {
      return [{
        id: 'all',
        title: 'All Orders',
        orders: filteredOrders,
        totalOrders: filteredOrders.length,
        totalGuests: filteredOrders.reduce((acc, o) => acc + extractGuestCount(o), 0),
        totalRevenue: filteredOrders.filter((o) => ['PAID', 'COMPLETED'].includes(o.status)).reduce((acc, o) => acc + Number(o.total || 0), 0),
      }];
    }

    const map = new Map<string, OrderGroup>();

    filteredOrders.forEach((o) => {
      const d = new Date(o.createdAt);
      let key = '';
      let title = '';
      let subtitle = '';

      if (groupBy === 'DATE') {
        key = format(d, 'yyyy-MM-dd');
        title = format(d, 'EEEE, dd MMMM yyyy');
        if (isSameDay(d, new Date())) title = `Today · ${title}`;
      } else if (groupBy === 'WEEK') {
        const weekNum = format(d, 'w');
        const year = format(d, 'yyyy');
        key = `${year}-W${weekNum}`;
        title = `Week ${weekNum} (${year})`;
      } else if (groupBy === 'MONTH') {
        key = format(d, 'yyyy-MM');
        title = format(d, 'MMMM yyyy');
      } else if (groupBy === 'YEAR') {
        key = format(d, 'yyyy');
        title = `Year ${format(d, 'yyyy')}`;
      }

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          title,
          subtitle,
          orders: [],
          totalOrders: 0,
          totalGuests: 0,
          totalRevenue: 0,
        });
      }

      const group = map.get(key)!;
      group.orders.push(o);
      group.totalOrders += 1;
      group.totalGuests += extractGuestCount(o);
      if (['PAID', 'COMPLETED'].includes(o.status)) {
        group.totalRevenue += Number(o.total || 0);
      }
    });

    return Array.from(map.values());
  }, [filteredOrders, groupBy]);

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const expandAll = () => {
    setCollapsedGroups({});
  };

  const collapseAll = () => {
    const allCollapsed: Record<string, boolean> = {};
    groupedOrders.forEach((g) => {
      allCollapsed[g.id] = true;
    });
    setCollapsedGroups(allCollapsed);
  };

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
            ${i.notes ? `<div style="font-size: 10px; color: #d97706;">* ${i.notes}</div>` : ''}
          </td>
          <td style="padding: 6px 0; text-align: center; border-bottom: 1px dashed #e2e8f0; font-weight: 600;">${qty}</td>
          <td style="padding: 6px 0; text-align: right; border-bottom: 1px dashed #e2e8f0; font-family: monospace;">₹${rate.toFixed(0)}</td>
          <td style="padding: 6px 0; text-align: right; border-bottom: 1px dashed #e2e8f0; font-weight: 700; font-family: monospace;">₹${amt.toFixed(0)}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bill #${order.orderNumber}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              width: 76mm;
              margin: 0 auto;
              padding: 10px 4px;
              color: #0f172a;
              background: #fff;
              font-size: 12px;
            }
            .center { text-align: center; }
            .bold { font-weight: 800; }
            .divider { border-top: 1px dashed #64748b; margin: 8px 0; }
            .title { font-size: 16px; font-weight: 900; text-transform: uppercase; margin-bottom: 2px; }
            .subtitle { font-size: 11px; color: #475569; margin-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; margin: 6px 0; }
            th { border-bottom: 1px solid #0f172a; padding: 4px 0; font-size: 10px; text-transform: uppercase; }
            .total-row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 12px; }
            .grand-total { font-size: 15px; font-weight: 900; border-top: 1px solid #0f172a; border-bottom: 1px solid #0f172a; padding: 6px 0; margin-top: 4px; }
          </style>
        </head>
        <body>
          <div class="center">
            <div class="title">${tenant?.name || 'RESTAURANT OS'}</div>
            <div class="subtitle">${tenant?.address || 'Tax Invoice Receipt'}</div>
            ${tenant?.phone ? `<div class="subtitle">Tel: ${tenant.phone}</div>` : ''}
            ${tenant?.gstin ? `<div class="subtitle bold">GSTIN: ${tenant.gstin}</div>` : ''}
          </div>

          <div class="divider"></div>

          <div style="font-size: 11px; line-height: 1.4;">
            <div style="display: flex; justify-content: space-between;">
              <span><strong>Bill #:</strong> ${order.orderNumber}</span>
              <span><strong>Type:</strong> ${order.type}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span><strong>Table:</strong> ${order.table?.name || 'N/A'}</span>
              <span><strong>Guests:</strong> ${extractGuestCount(order)} Pax</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span><strong>Date:</strong> ${format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm')}</span>
              <span><strong>Status:</strong> ${order.status}</span>
            </div>
            ${order.customer?.name ? `<div class="subtitle">Guest: ${order.customer.name} (${order.customer.phone || ''})</div>` : ''}
          </div>

          <div class="divider"></div>

          <table>
            <thead>
              <tr>
                <th style="text-align: left;">Item</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Rate</th>
                <th style="text-align: right;">Amt</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="divider"></div>

          <div>
            <div class="total-row">
              <span>Items Subtotal:</span>
              <span style="font-family: monospace;">₹${Number(order.subtotal || 0).toFixed(2)}</span>
            </div>
            ${Number(order.discountAmount || 0) > 0 ? `
              <div class="total-row" style="color: #16a34a; font-weight: 700;">
                <span>Discount Savings:</span>
                <span style="font-family: monospace;">-₹${Number(order.discountAmount).toFixed(2)}</span>
              </div>
            ` : ''}
            ${Number(order.taxAmount || 0) > 0 ? `
              <div class="total-row">
                <span>Taxes & GST:</span>
                <span style="font-family: monospace;">₹${Number(order.taxAmount).toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="total-row grand-total">
              <span>TOTAL PAYABLE:</span>
              <span style="font-family: monospace;">₹${Number(order.total || 0).toFixed(2)}</span>
            </div>
          </div>

          <div class="divider"></div>
          <p class="center bold" style="font-size: 11px; margin-top: 8px;">THANK YOU FOR DINING WITH US!</p>
          <p class="center" style="font-size: 9px; color: #94a3b8;">Powered by RestaurantOS</p>
        </body>
      </html>
    `;

    printHtmlInSameTab(htmlContent);
  };

  // Handle Kitchen KOT Printing
  const handlePrintKot = (order: any) => {
    if (!order) return;

    const itemsList = (order.items || []).filter((i: any) => !['CANCELLED', 'VOIDED'].includes(i.status));
    const kotItemsHtml = itemsList.map((i: any) => `
      <tr>
        <td style="padding: 6px 0; border-bottom: 1px dashed #cbd5e1; font-weight: 800; font-size: 13px;">
          ${formatItemTitle(i)}
          ${i.notes ? `<div style="font-size: 11px; color: #b45309; font-weight: 700;">⚠️ NOTE: ${i.notes}</div>` : ''}
        </td>
        <td style="padding: 6px 0; text-align: center; border-bottom: 1px dashed #cbd5e1; font-weight: 900; font-size: 15px;">
          ${i.quantity}
        </td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>KOT #${order.orderNumber}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              width: 76mm;
              margin: 0 auto;
              padding: 10px 4px;
              color: #0f172a;
              background: #fff;
            }
            .center { text-align: center; }
            .bold { font-weight: 900; }
            .divider { border-top: 2px dashed #0f172a; margin: 8px 0; }
            .title { font-size: 18px; font-weight: 900; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin: 8px 0; }
            th { border-bottom: 2px solid #0f172a; padding: 4px 0; font-size: 12px; text-transform: uppercase; }
          </style>
        </head>
        <body>
          <div class="center">
            <div class="title">🍳 KITCHEN TICKET (KOT)</div>
            <div style="font-size: 12px; font-weight: 700; margin-top: 2px;">TABLE: ${order.table?.name ? `TABLE ${order.table.name}` : order.type}</div>
          </div>
          <div class="divider"></div>
          <div style="font-size: 11px; line-height: 1.4;">
            <div style="display: flex; justify-content: space-between;">
              <span><strong>Order #:</strong> ${order.orderNumber}</span>
              <span><strong>Guests:</strong> ${extractGuestCount(order)} Pax</span>
            </div>
            <div><strong>Time:</strong> ${format(new Date(order.createdAt), 'dd MMM yyyy, HH:mm')}</div>
          </div>
          <div class="divider"></div>
          <table>
            <thead>
              <tr>
                <th style="text-align: left;">Item Description</th>
                <th style="text-align: center; width: 40px;">Qty</th>
              </tr>
            </thead>
            <tbody>
              ${kotItemsHtml || `<tr><td colspan="2" style="text-align: center;">No KOT items recorded</td></tr>`}
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
              Order History &amp; Dining Ledger
            </h1>
            <p className="text-xs text-muted-foreground">
              Historical dining logs, order type tagging, guest covers &amp; receipt archive
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

      {/* ── Metrics Summary Strip (5 Pillars: Orders, Guests, Revenue, AOV, Cancelled) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        {/* Total Orders */}
        <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-1 shadow-xs">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block">
            Total Orders
          </span>
          <p className="text-2xl font-semibold font-mono tracking-tight text-foreground">{metrics.totalOrders}</p>
          <span className="text-[11px] text-muted-foreground">In selected timeframe</span>
        </div>

        {/* Total Guests (Pax) */}
        <div className="p-4 rounded-2xl bg-card border border-primary/30 bg-primary/5 space-y-1 shadow-xs">
          <span className="text-[11px] font-bold text-primary uppercase tracking-wide block flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            <span>Total Guests (Pax)</span>
          </span>
          <p className="text-2xl font-bold font-mono tracking-tight text-primary">
            {metrics.totalGuests}
          </p>
          <span className="text-[11px] text-muted-foreground">
            Diners served in filter
          </span>
        </div>

        {/* Gross Revenue */}
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

        {/* Avg Order Value */}
        <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-1 shadow-xs">
          <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide block">
            Avg Order Value
          </span>
          <p className="text-2xl font-semibold font-mono tracking-tight text-blue-600 dark:text-blue-400">
            {formatCurrency(metrics.aov)}
          </p>
          <span className="text-[11px] text-muted-foreground">Per settled order</span>
        </div>

        {/* Cancelled */}
        <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-1 shadow-xs col-span-2 sm:col-span-1">
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

        {/* Multi-Filters: Table Selector, Status, Type, Search */}
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
              <option value="ALL">All Types (Dine-In / Pre-Order / Takeaway)</option>
              <option value="PRE_ORDER">🎟️ Pre-Order (Advance Booking)</option>
              <option value="DINE_IN">🍽️ Dine-In Table</option>
              <option value="TAKEAWAY">📦 Takeaway / Pickup</option>
              <option value="DELIVERY">🛵 Direct Delivery</option>
              <option value="ONLINE">📱 Online QR Order</option>
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

      {/* ── Subfilter: Grouping / Clubbing Selection Bar ────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-card border border-border/60 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mr-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span>Group History By:</span>
          </span>

          {[
            { id: 'DATE', label: '📅 Date Wise' },
            { id: 'WEEK', label: '📆 Week Wise' },
            { id: 'MONTH', label: '🗓️ Month Wise' },
            { id: 'YEAR', label: '📊 Year Wise' },
            { id: 'FLAT', label: '📋 Flat List' },
          ].map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setGroupBy(mode.id as GroupByMode)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border',
                groupBy === mode.id
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                  : 'bg-muted/50 border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {groupBy !== 'FLAT' && groupedOrders.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={expandAll}
              className="text-[11px] h-7 px-2.5 rounded-lg border-border/60"
            >
              Expand All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={collapseAll}
              className="text-[11px] h-7 px-2.5 rounded-lg border-border/60"
            >
              Collapse All
            </Button>
          </div>
        )}
      </div>

      {/* ── Orders Grouped Accordion / List View ───────────────────────────────── */}
      {isLoading ? (
        <div className="py-20 rounded-2xl border border-border/60 bg-card flex flex-col items-center justify-center space-y-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Loading orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="py-20 rounded-2xl border border-border/60 bg-card text-center space-y-2 text-muted-foreground">
          <UtensilsCrossed className="w-10 h-10 mx-auto opacity-20" />
          <p className="text-sm font-medium text-foreground">No Orders Found</p>
          <p className="text-xs">Try selecting a different date range or clearing your filter criteria.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedOrders.map((group) => {
            const isCollapsed = Boolean(collapsedGroups[group.id]);

            return (
              <div
                key={group.id}
                className="rounded-2xl border border-border/60 bg-card shadow-xs overflow-hidden transition-all"
              >
                {/* Accordion Group Header */}
                <div
                  onClick={() => toggleGroup(group.id)}
                  className="px-4 py-3 bg-muted/40 hover:bg-muted/70 transition-colors border-b border-border/40 flex flex-wrap items-center justify-between gap-2 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      className="w-6 h-6 rounded-lg bg-background border border-border flex items-center justify-center text-muted-foreground shrink-0"
                    >
                      {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    <div>
                      <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                        <span>{group.title}</span>
                      </h3>
                      {group.subtitle && <p className="text-[10px] text-muted-foreground">{group.subtitle}</p>}
                    </div>
                  </div>

                  {/* Summary Badges for the Group */}
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-lg bg-background border border-border text-foreground">
                      🏷️ {group.totalOrders} {group.totalOrders === 1 ? 'Order' : 'Orders'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-lg bg-primary/10 border border-primary/30 text-primary">
                      👥 {group.totalGuests} Guests
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-mono font-black px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(group.totalRevenue)}
                    </span>
                  </div>
                </div>

                {/* Group Orders Table (Visible when not collapsed) */}
                {!isCollapsed && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/20 text-muted-foreground font-medium uppercase tracking-wider text-[10px] border-b border-border/40">
                        <tr>
                          <th className="p-3">Order #</th>
                          <th className="p-3">Order Type</th>
                          <th className="p-3">Table / Guest</th>
                          <th className="p-3">Date &amp; Time</th>
                          <th className="p-3">Ordered Items</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Total Amount</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {group.orders.map((order) => {
                          const statusCfg = ORDER_STATUS_META[order.status] || ORDER_STATUS_META.DRAFT;
                          const isPaid = ['PAID', 'COMPLETED'].includes(order.status);
                          const isCancelled = ['CANCELLED', 'VOIDED'].includes(order.status);
                          const validItems = (order.items || []).filter((i: any) => !['CANCELLED', 'VOIDED'].includes(i.status));
                          const guestCount = extractGuestCount(order);

                          return (
                            <tr
                              key={order.id}
                              onClick={() => setSelectedOrderDetails(order)}
                              className="hover:bg-muted/30 transition-colors cursor-pointer"
                            >
                              {/* Order Number */}
                              <td className="p-3 font-mono font-bold text-foreground">
                                #{order.orderNumber}
                              </td>

                              {/* Order Type Badge (Job 1) */}
                              <td className="p-3">
                                {getOrderTypeBadge(order.type)}
                              </td>

                              {/* Table & Guest Tagging (Job 2) */}
                              <td className="p-3 font-medium">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span>{order.table?.name ? `Table ${order.table.name}` : order.type}</span>
                                  {order.type === 'DINE_IN' && (
                                    <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/25 font-mono">
                                      👥 {guestCount}p
                                    </span>
                                  )}
                                </div>
                                {order.customer?.name && (
                                  <span className="text-[10px] text-muted-foreground block font-normal mt-0.5">
                                    {order.customer.name} {order.customer.phone ? `(${order.customer.phone})` : ''}
                                  </span>
                                )}
                              </td>

                              {/* Date & Time */}
                              <td className="p-3 text-muted-foreground">
                                <div>{format(new Date(order.createdAt), 'dd MMM yyyy')}</div>
                                <div className="text-[10px] text-muted-foreground/70">{format(new Date(order.createdAt), 'h:mm a')}</div>
                              </td>

                              {/* Ordered Items */}
                              <td className="p-3">
                                <div className="font-medium text-foreground">
                                  {validItems.length} {validItems.length === 1 ? 'Dish' : 'Dishes'}
                                </div>
                                <div className="text-[10px] text-muted-foreground line-clamp-1 max-w-xs">
                                  {validItems.map((i: any) => `${i.quantity}x ${formatItemTitle(i)}`).join(', ')}
                                </div>
                              </td>

                              {/* Status */}
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

                              {/* Total Amount */}
                              <td className="p-3 font-mono font-medium text-xs">
                                <span className={cn(isPaid ? 'text-emerald-600 dark:text-emerald-400 font-bold' : isCancelled ? 'text-rose-500 line-through' : 'text-foreground font-semibold')}>
                                  {formatCurrency(order.total)}
                                </span>
                              </td>

                              {/* Actions */}
                              <td className="p-3 text-right">
                                <div
                                  className="flex items-center justify-end gap-1.5"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handlePrintKot(order)}
                                    className="p-1.5 rounded-xl border border-amber-500/30 text-amber-500 hover:bg-amber-500/10 cursor-pointer"
                                    title="Print KOT Ticket"
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
                                    className="p-1.5 rounded-xl border border-border text-foreground hover:bg-muted cursor-pointer"
                                    title="View Full Details"
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
            );
          })}
        </div>
      )}

      {/* ── Order Detail Modal Sheet ────────────────────────────────────────── */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-foreground">
                    Order #{selectedOrderDetails.orderNumber}
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(selectedOrderDetails.createdAt), 'dd MMMM yyyy, h:mm a')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {getOrderTypeBadge(selectedOrderDetails.type)}
                <button
                  type="button"
                  onClick={() => setSelectedOrderDetails(null)}
                  className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              {/* Table & Guest Banner */}
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-muted/30 border border-border">
                <div>
                  <span className="text-[10px] text-muted-foreground block font-medium">Table / Location</span>
                  <span className="text-xs font-bold text-foreground">
                    {selectedOrderDetails.table?.name ? `Table ${selectedOrderDetails.table.name}` : selectedOrderDetails.type}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-medium">Number of Guests</span>
                  <span className="text-xs font-bold text-primary flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>{extractGuestCount(selectedOrderDetails)} Pax</span>
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Order Items Breakdown
                </span>
                <div className="divide-y divide-border/40 border border-border/60 rounded-xl overflow-hidden">
                  {(selectedOrderDetails.items || []).map((item: any) => (
                    <div key={item.id} className="p-2.5 flex items-center justify-between bg-card">
                      <div>
                        <p className="font-bold text-foreground">{formatItemTitle(item)}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {item.quantity} x ₹{item.unitPrice || item.variant?.price || 0}
                        </p>
                        {item.notes && <p className="text-[10px] text-amber-500">* {item.notes}</p>}
                      </div>
                      <span className="font-mono font-bold text-foreground">
                        ₹{Number(item.totalPrice || item.quantity * (item.unitPrice || item.variant?.price || 0)).toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Totals */}
              <div className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-1.5">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal:</span>
                  <span className="font-mono text-foreground font-semibold">₹{Number(selectedOrderDetails.subtotal || 0).toFixed(2)}</span>
                </div>
                {Number(selectedOrderDetails.discountAmount || 0) > 0 && (
                  <div className="flex justify-between text-emerald-500 font-bold">
                    <span>Discount:</span>
                    <span className="font-mono">-₹{Number(selectedOrderDetails.discountAmount).toFixed(2)}</span>
                  </div>
                )}
                {Number(selectedOrderDetails.taxAmount || 0) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax &amp; GST:</span>
                    <span className="font-mono text-foreground font-semibold">₹{Number(selectedOrderDetails.taxAmount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-2 border-t border-border font-black text-sm">
                  <span className="text-foreground">Total Payable:</span>
                  <span className="text-base font-mono text-emerald-500">₹{Number(selectedOrderDetails.total || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-border bg-muted/30 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePrintKot(selectedOrderDetails)}
                className="text-xs rounded-xl gap-1.5"
              >
                🍳 Print KOT
              </Button>
              <Button
                size="sm"
                onClick={() => handlePrintOrderBill(selectedOrderDetails)}
                className="text-xs rounded-xl gap-1.5 bg-primary text-primary-foreground"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Bill Receipt</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
