'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag, Search, Filter, Printer, CheckCircle2,
  AlertCircle, UtensilsCrossed, Clock, CreditCard,
  Plus, RefreshCw, X, ChevronRight, ArrowRight,
  Package, Bike, DollarSign, Sparkles, ChefHat,
  Ban, ShieldCheck, Flame, Receipt
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { printHtmlInSameTab } from '@/lib/print-utils';

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
    lower === 'portion' ||
    lower.includes('regular portion')
  ) {
    return base;
  }
  return `${base} (${vName})`;
}

const ORDER_STATUS_META: Record<string, { label: string; emoji: string; bg: string; border: string; text: string }> = {
  DRAFT:           { label: 'Draft',        emoji: '📝', bg: 'bg-muted/40',       border: 'border-border',          text: 'text-muted-foreground' },
  CONFIRMED:       { label: 'Confirmed',    emoji: '✨', bg: 'bg-blue-500/15',    border: 'border-blue-500/40',     text: 'text-blue-400' },
  SENT_TO_KITCHEN: { label: 'In Kitchen',   emoji: '🍳', bg: 'bg-amber-500/15',   border: 'border-amber-500/40',    text: 'text-amber-400' },
  PREPARING:       { label: 'Cooking',      emoji: '🔥', bg: 'bg-orange-500/15',  border: 'border-orange-500/40',   text: 'text-orange-400' },
  READY:           { label: 'Ready',        emoji: '🛎️', bg: 'bg-emerald-500/15', border: 'border-emerald-500/40',  text: 'text-emerald-400' },
  SERVED:          { label: 'Served',       emoji: '🍽️', bg: 'bg-teal-500/15',    border: 'border-teal-500/40',     text: 'text-teal-400' },
  BILLED:          { label: 'Billed',       emoji: '🧾', bg: 'bg-purple-500/15',  border: 'border-purple-500/40',   text: 'text-purple-400' },
  PARTIALLY_PAID:  { label: 'Partial Paid', emoji: '⏳', bg: 'bg-indigo-500/15',  border: 'border-indigo-500/40',   text: 'text-indigo-400' },
};

export default function CurrentOrdersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'ALL' | 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [settlingOrder, setSettlingOrder] = useState<any | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any | null>(null);
  const [isSettling, setIsSettling] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch Current Active Orders
  const {
    data: activeOrders = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<any[]>({
    queryKey: ['active-orders'],
    queryFn: async () => {
      const res = await apiGet<any[]>('/orders/active');
      return Array.isArray(res) ? res : [];
    },
    refetchInterval: 6000,
  });

  // Fetch Current Tenant for Bill Print
  const { data: tenant } = useQuery({
    queryKey: ['current-tenant'],
    queryFn: () => apiGet<any>('/tenants/current'),
    staleTime: 1000 * 60 * 10,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtered orders based on Tab and Search
  const filteredOrders = useMemo(() => {
    return activeOrders.filter((order) => {
      // Tab filter
      if (activeTab === 'DINE_IN' && order.type !== 'DINE_IN') return false;
      if (activeTab === 'TAKEAWAY' && !['TAKEAWAY', 'PICKUP', 'DRIVE_THRU'].includes(order.type)) return false;
      if (activeTab === 'DELIVERY' && !['DELIVERY', 'ONLINE', 'ROOM_SERVICE', 'AGGREGATOR_ZOMATO', 'AGGREGATOR_SWIGGY'].includes(order.type)) return false;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const numMatch = (order.orderNumber || '').toLowerCase().includes(query);
        const tableNameMatch = order.table?.name?.toLowerCase().includes(query);
        const custNameMatch = order.customer?.name?.toLowerCase().includes(query);
        const custPhoneMatch = order.customer?.phone?.includes(query);
        const itemMatch = (order.items || []).some((it: any) =>
          (it.menuItem?.name || it.name || '').toLowerCase().includes(query)
        );
        return numMatch || tableNameMatch || custNameMatch || custPhoneMatch || itemMatch;
      }

      return true;
    });
  }, [activeOrders, activeTab, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    let dineInCount = 0;
    let takeawayCount = 0;
    let deliveryCount = 0;
    let totalRevenue = 0;

    for (const ord of activeOrders) {
      const tot = Number(ord.total) || 0;
      totalRevenue += tot;
      if (ord.type === 'DINE_IN') {
        dineInCount++;
      } else if (['TAKEAWAY', 'PICKUP', 'DRIVE_THRU'].includes(ord.type)) {
        takeawayCount++;
      } else {
        deliveryCount++;
      }
    }

    return {
      total: activeOrders.length,
      dineInCount,
      takeawayCount,
      deliveryCount,
      totalRevenue,
    };
  }, [activeOrders]);

  // Settle Payment Action (Cash, UPI, Card)
  const handleSettlePayment = async (order: any, method: string) => {
    try {
      setIsSettling(true);
      const settleAmount = Number(order.total) || 0;

      // 1. Post Payment
      await apiPost('/payments', {
        orderId: order.id,
        method: method,
        amount: settleAmount,
      });

      // 2. Mark order PAID
      await apiPatch(`/orders/${order.id}/status`, {
        status: 'PAID',
      });

      // 3. If dine-in, mark table AVAILABLE
      if (order.tableId) {
        await apiPatch(`/tables/${order.tableId}`, {
          status: 'AVAILABLE',
        });
      }

      // 4. Invalidate queries so order immediately clears from active list
      queryClient.invalidateQueries({ queryKey: ['active-orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });

      setSettlingOrder(null);
      setSelectedOrderDetails(null);
      showToast(`✓ Order #${order.orderNumber} Settled with ${method} & Cleared!`);
    } catch (e: any) {
      showToast(`Settlement failed: ${e?.message || 'Error processing payment'}`);
    } finally {
      setIsSettling(false);
    }
  };

  // Cancel Order Action
  const handleCancelOrder = async (order: any) => {
    const reason = window.prompt(`Reason for cancelling Order #${order.orderNumber}:`, 'Guest requested cancellation');
    if (reason === null) return;

    try {
      await apiPatch(`/orders/${order.id}/status`, {
        status: 'CANCELLED',
        reason: reason.trim() || 'Cancelled from Current Orders screen',
      });

      if (order.tableId) {
        await apiPatch(`/tables/${order.tableId}`, {
          status: 'AVAILABLE',
        });
      }

      queryClient.invalidateQueries({ queryKey: ['active-orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      showToast(`✓ Order #${order.orderNumber} Cancelled & Cleared`);
      setSelectedOrderDetails(null);
    } catch (e: any) {
      showToast(`Failed to cancel order: ${e?.message || 'Error'}`);
    }
  };

  // Print Bill Receipt
  const handlePrintReceipt = (order: any) => {
    const restaurantName = tenant?.name || 'Restaurant OS';
    const address = tenant?.address || '';
    const phone = tenant?.phone || '';
    const dateStr = new Date(order.createdAt).toLocaleString();

    const itemsRows = (order.items || [])
      .filter((it: any) => it.status !== 'CANCELLED' && it.status !== 'VOIDED')
      .map((it: any) => {
        const title = formatItemTitle(it);
        const qty = it.quantity;
        const rate = it.unitPrice || (it.lineTotal / qty);
        const tot = it.lineTotal || (qty * rate);
        return `
          <tr>
            <td style="padding: 4px 0; text-align: left; font-size: 12px;">${qty}x ${title}</td>
            <td style="padding: 4px 0; text-align: right; font-size: 12px; font-family: monospace;">₹${Number(tot).toFixed(2)}</td>
          </tr>
        `;
      })
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - #${order.orderNumber}</title>
        <style>
          @page { margin: 0; size: 80mm auto; }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 72mm;
            margin: 0 auto;
            padding: 10px;
            color: #000;
          }
          .center { text-align: center; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; font-size: 12px; margin: 3px 0; }
          .total { font-size: 15px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="center">
          <h2 style="margin: 0; font-size: 16px;">${restaurantName}</h2>
          ${address ? `<p style="margin: 2px 0; font-size: 10px;">${address}</p>` : ''}
          ${phone ? `<p style="margin: 2px 0; font-size: 10px;">Phone: ${phone}</p>` : ''}
          <p style="margin: 4px 0; font-size: 11px; font-weight: bold;">CURRENT BILL ESTIMATE</p>
        </div>
        <div class="divider"></div>
        <div class="row"><span>Order: <strong>#${order.orderNumber}</strong></span><span>Type: ${order.type.replace('_', ' ')}</span></div>
        ${order.table ? `<div class="row"><span>Table: <strong>${order.table.name}</strong></span></div>` : ''}
        <div class="row"><span>Date: ${dateStr}</span></div>
        <div class="divider"></div>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1px dashed #000;">
              <th style="text-align: left; font-size: 11px; padding-bottom: 4px;">Item</th>
              <th style="text-align: right; font-size: 11px; padding-bottom: 4px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>
        <div class="divider"></div>
        <div class="row"><span>Subtotal:</span><span>₹${Number(order.subtotal || order.total).toFixed(2)}</span></div>
        ${order.taxAmount > 0 ? `<div class="row"><span>Taxes & GST:</span><span>+₹${Number(order.taxAmount).toFixed(2)}</span></div>` : ''}
        ${order.discountAmount > 0 ? `<div class="row"><span>Discount:</span><span>-₹${Number(order.discountAmount).toFixed(2)}</span></div>` : ''}
        <div class="divider"></div>
        <div class="row total"><span>TOTAL PAYABLE:</span><span>₹${Number(order.total).toFixed(2)}</span></div>
        <div class="divider"></div>
        <div class="center" style="font-size: 10px; margin-top: 10px;">
          <p style="margin: 0;">Thank you for dining with us!</p>
        </div>
      </body>
      </html>
    `;

    printHtmlInSameTab(html);
  };

  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white font-bold text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Fast Navigation */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/25 text-primary">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <h1 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
              Current Active Orders
            </h1>
            <Badge variant="outline" className="font-mono text-xs bg-primary/10 border-primary/30 text-primary">
              {activeOrders.length} Live
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time live queue for Dine-In tables, Takeaway / Packaging, and Delivery orders. Marked orders clear immediately upon payment.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button
            onClick={() => refetch()}
            variant="outline"
            size="sm"
            className="rounded-xl border-border hover:bg-muted font-bold text-xs gap-1.5"
            disabled={isRefetching}
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isRefetching && 'animate-spin')} />
            <span>Refresh</span>
          </Button>

          <Button
            onClick={() => router.push('/pos')}
            className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs gap-1.5 shadow-md shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            <span>New Order (POS)</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Active */}
        <div className="p-3.5 rounded-2xl bg-card border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">All Active</span>
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground font-mono">{stats.total}</span>
            <span className="text-[11px] text-muted-foreground font-medium">orders</span>
          </div>
        </div>

        {/* Dine In Running */}
        <div
          onClick={() => setActiveTab('DINE_IN')}
          className={cn(
            'p-3.5 rounded-2xl border shadow-xs flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02]',
            activeTab === 'DINE_IN'
              ? 'bg-rose-500/10 border-rose-500/50 shadow-rose-500/10'
              : 'bg-card border-border'
          )}
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">Dine-In</span>
            <UtensilsCrossed className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-400 font-mono">{stats.dineInCount}</span>
            <span className="text-[11px] text-muted-foreground font-medium">tables</span>
          </div>
        </div>

        {/* Takeaway / Packaging */}
        <div
          onClick={() => setActiveTab('TAKEAWAY')}
          className={cn(
            'p-3.5 rounded-2xl border shadow-xs flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02]',
            activeTab === 'TAKEAWAY'
              ? 'bg-amber-500/10 border-amber-500/50 shadow-amber-500/10'
              : 'bg-card border-border'
          )}
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Takeaway</span>
            <Package className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400 font-mono">{stats.takeawayCount}</span>
            <span className="text-[11px] text-muted-foreground font-medium">parcels</span>
          </div>
        </div>

        {/* Delivery / Online */}
        <div
          onClick={() => setActiveTab('DELIVERY')}
          className={cn(
            'p-3.5 rounded-2xl border shadow-xs flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02]',
            activeTab === 'DELIVERY'
              ? 'bg-blue-500/10 border-blue-500/50 shadow-blue-500/10'
              : 'bg-card border-border'
          )}
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">Delivery</span>
            <Bike className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-400 font-mono">{stats.deliveryCount}</span>
            <span className="text-[11px] text-muted-foreground font-medium">riders</span>
          </div>
        </div>

        {/* Unsettled Volume */}
        <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-card border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Total</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl font-black text-emerald-400 font-mono">
              {formatCurrency(stats.totalRevenue)}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-2 rounded-2xl border border-border">
        {/* Category Pill Switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1">
          {[
            { id: 'ALL', label: 'All Live', count: stats.total, icon: ShoppingBag },
            { id: 'DINE_IN', label: 'Dine-In', count: stats.dineInCount, icon: UtensilsCrossed },
            { id: 'TAKEAWAY', label: 'Takeaway / Parcel', count: stats.takeawayCount, icon: Package },
            { id: 'DELIVERY', label: 'Delivery / Online', count: stats.deliveryCount, icon: Bike },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer',
                  isSel
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'px-1.5 py-0.2 text-[10px] rounded-md font-mono',
                    isSel ? 'bg-black/20 text-white' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Box */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search #ORD, table, dish..."
            className="pl-8 h-9 text-xs rounded-xl bg-background border-border"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Orders Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-8">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-64 rounded-2xl bg-card border border-border animate-pulse p-4 space-y-4">
              <div className="h-6 bg-muted rounded-lg w-1/3" />
              <div className="h-24 bg-muted/60 rounded-xl" />
              <div className="h-10 bg-muted rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="py-20 text-center flex flex-col items-center justify-center p-6 bg-card rounded-3xl border border-dashed border-border">
          <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3">
            <ShoppingBag className="w-8 h-8 opacity-70" />
          </div>
          <h3 className="text-base font-black text-foreground">No Current Active Orders</h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1">
            {searchQuery
              ? `No active orders matching "${searchQuery}".`
              : activeTab !== 'ALL'
              ? `No active orders currently under "${activeTab.replace('_', ' ')}".`
              : 'All active orders have been billed and paid. Create a new order via POS or Tables.'}
          </p>
          <Button
            onClick={() => router.push('/pos')}
            className="mt-4 gap-1.5 rounded-xl text-xs font-black bg-primary text-primary-foreground"
          >
            <Plus className="w-4 h-4" />
            <span>Open POS to Create Order</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const elapsedMin = Math.max(0, Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000));
            const statusMeta = ORDER_STATUS_META[order.status] || {
              label: order.status,
              emoji: '📋',
              bg: 'bg-muted',
              border: 'border-border',
              text: 'text-muted-foreground',
            };

            const isDineIn = order.type === 'DINE_IN';
            const isTakeaway = ['TAKEAWAY', 'PICKUP', 'DRIVE_THRU'].includes(order.type);
            const isDelivery = ['DELIVERY', 'ONLINE', 'ROOM_SERVICE', 'AGGREGATOR_ZOMATO', 'AGGREGATOR_SWIGGY'].includes(order.type);

            const activeKots = (order.kots || []).filter((k: any) => k.status !== 'CANCELLED');
            const totalKots = activeKots.length;
            const servedKots = activeKots.filter((k: any) => k.status === 'SERVED').length;

            const activeItems = (order.items || []).filter((it: any) => it.status !== 'CANCELLED' && it.status !== 'VOIDED');

            return (
              <div
                key={order.id}
                className={cn(
                  'rounded-2xl bg-card border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-lg',
                  isDineIn ? 'border-rose-500/20 hover:border-rose-500/40' : '',
                  isTakeaway ? 'border-amber-500/20 hover:border-amber-500/40' : '',
                  isDelivery ? 'border-blue-500/20 hover:border-blue-500/40' : ''
                )}
              >
                {/* Order Card Header */}
                <div className="p-4 border-b border-border bg-muted/20">
                  <div className="flex items-center justify-between gap-2">
                    {/* Order Number & Table / Type Badge */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-sm text-foreground">
                        #{order.orderNumber}
                      </span>

                      {/* Bold Table Badge if Table Order */}
                      {order.table ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-xs shadow-rose-500/20">
                          <UtensilsCrossed className="w-3.5 h-3.5 text-rose-400 stroke-[2.5]" />
                          <span className="text-xs font-black uppercase tracking-wide">
                            TABLE: {order.table.name}
                          </span>
                          {order.table.capacity && (
                            <span className="text-[10px] text-rose-300/70 font-bold">
                              ({order.table.capacity}p)
                            </span>
                          )}
                        </div>
                      ) : isDineIn ? (
                        <Badge variant="outline" className="gap-1 bg-rose-500/10 text-rose-400 border-rose-500/30 text-xs font-black">
                          <UtensilsCrossed className="w-3 h-3" />
                          <span>Dine-In Table</span>
                        </Badge>
                      ) : isTakeaway ? (
                        <Badge variant="outline" className="gap-1 bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs font-black">
                          <Package className="w-3 h-3" />
                          <span>Takeaway</span>
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 bg-blue-500/10 text-blue-400 border-blue-500/30 text-xs font-black">
                          <Bike className="w-3 h-3" />
                          <span>Delivery</span>
                        </Badge>
                      )}
                    </div>

                    {/* Elapsed Timer with Warning Alert */}
                    <div
                      className={cn(
                        'flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono shrink-0',
                        elapsedMin > 30
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          : elapsedMin > 15
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <Clock className="w-3 h-3" />
                      <span>{elapsedMin}m ago</span>
                    </div>
                  </div>

                  {/* Prominent Running Order Table Banner */}
                  {order.table && (
                    <div className="mt-2.5 flex items-center justify-between px-3 py-1.5 rounded-xl bg-rose-950/40 border border-rose-500/30 shadow-inner">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                        <span className="text-[11px] font-black text-rose-300 uppercase tracking-wider">
                          RUNNING TABLE ORDER · TABLE {order.table.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-rose-400/80 font-mono">
                        {order.table.floor?.name || order.table.shape || 'Active'}
                      </span>
                    </div>
                  )}

                  {/* Status & KDS Kitchen Progress Row */}
                  <div className="flex items-center justify-between mt-2.5">
                    <div
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10.5px] font-bold border',
                        statusMeta.bg,
                        statusMeta.border,
                        statusMeta.text
                      )}
                    >
                      <span>{statusMeta.emoji}</span>
                      <span>{statusMeta.label}</span>
                    </div>

                    {totalKots > 0 && (
                      <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                        <ChefHat className="w-3 h-3 text-amber-400" />
                        <span>{servedKots}/{totalKots} KOTs Served</span>
                      </span>
                    )}
                  </div>

                  {/* Customer Info (if Takeaway or Delivery) */}
                  {order.customer && (
                    <div className="mt-2 text-[11px] text-muted-foreground truncate flex items-center gap-1.5">
                      <span className="font-semibold text-foreground">Guest:</span>
                      <span>{order.customer.name}</span>
                      {order.customer.phone && <span className="font-mono text-[10px]">({order.customer.phone})</span>}
                    </div>
                  )}
                </div>

                {/* Items Breakdown Box */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar pr-1">
                    {activeItems.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-2">No active items</p>
                    ) : (
                      activeItems.map((item: any, idx: number) => {
                        const title = formatItemTitle(item);
                        const qty = item.quantity;
                        const lineTot = item.lineTotal > 0 ? item.lineTotal : qty * (item.unitPrice || 0);

                        return (
                          <div key={item.id || idx} className="flex items-start justify-between text-xs py-0.5">
                            <div className="flex items-start gap-1.5 flex-1 min-w-0 pr-2">
                              <span className="font-bold text-primary font-mono text-[11px]">{qty}x</span>
                              <div className="flex flex-col min-w-0">
                                <span className="text-foreground font-medium truncate">{title}</span>
                                {item.modifiers && item.modifiers.length > 0 && (
                                  <span className="text-[10px] text-indigo-400 font-medium">
                                    + {item.modifiers.map((m: any) => m.name).join(', ')}
                                  </span>
                                )}
                                {item.notes && (
                                  <span className="text-[10px] text-rose-400 italic">
                                    Note: {item.notes}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="font-mono text-muted-foreground text-xs font-semibold whitespace-nowrap">
                              {formatCurrency(lineTot)}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Total & Price Strip */}
                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Total Amount
                      </span>
                      <span className="text-lg font-black text-foreground font-mono">
                        {formatCurrency(order.total)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Print Receipt */}
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handlePrintReceipt(order)}
                        title="Print Estimate Receipt"
                        className="w-8 h-8 rounded-xl border-border hover:bg-muted"
                      >
                        <Printer className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>

                      {/* Add Items in POS */}
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => {
                          if (order.tableId) {
                            router.push(`/pos?tableId=${order.tableId}`);
                          } else {
                            router.push(`/pos?orderType=${order.type}`);
                          }
                        }}
                        title="Add more items in POS"
                        className="w-8 h-8 rounded-xl border-border hover:bg-muted"
                      >
                        <Plus className="w-3.5 h-3.5 text-primary" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Primary Settle & Clear Action Footer */}
                <div className="p-3 bg-muted/15 border-t border-border flex items-center gap-2">
                  <Button
                    onClick={() => setSettlingOrder(order)}
                    className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs h-9 gap-1.5 shadow-sm"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Settle & Mark Paid</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancelOrder(order)}
                    className="h-9 px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl text-xs"
                    title="Cancel Order"
                  >
                    <Ban className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Settlement Modal (Fast 1-Click Pay & Clear) ── */}
      {settlingOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground">
                    Settle Order #{settlingOrder.orderNumber}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {settlingOrder.type.replace('_', ' ')} {settlingOrder.table ? `· ${settlingOrder.table.name}` : ''}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSettlingOrder(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bill Amount Display */}
            <div className="p-4 rounded-2xl bg-muted/40 border border-border flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase">Total Payable</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">
                {formatCurrency(settlingOrder.total)}
              </span>
            </div>

            {/* Payment Method Selectors */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Select Settlement Method:
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                <Button
                  onClick={() => handleSettlePayment(settlingOrder, 'CASH')}
                  disabled={isSettling}
                  className="flex flex-col items-center justify-center h-20 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-black text-xs gap-1.5 cursor-pointer active:scale-95"
                >
                  <span className="text-xl">💵</span>
                  <span>Cash</span>
                </Button>

                <Button
                  onClick={() => handleSettlePayment(settlingOrder, 'UPI')}
                  disabled={isSettling}
                  className="flex flex-col items-center justify-center h-20 rounded-2xl bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary font-black text-xs gap-1.5 cursor-pointer active:scale-95"
                >
                  <span className="text-xl">📱</span>
                  <span>UPI / QR</span>
                </Button>

                <Button
                  onClick={() => handleSettlePayment(settlingOrder, 'CARD')}
                  disabled={isSettling}
                  className="flex flex-col items-center justify-center h-20 rounded-2xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-400 font-black text-xs gap-1.5 cursor-pointer active:scale-95"
                >
                  <span className="text-xl">💳</span>
                  <span>Card</span>
                </Button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <Button
                variant="ghost"
                onClick={() => setSettlingOrder(null)}
                className="text-xs text-muted-foreground hover:text-foreground font-semibold"
              >
                Cancel
              </Button>

              <Button
                variant="outline"
                onClick={() => handlePrintReceipt(settlingOrder)}
                className="text-xs font-bold gap-1.5 border-border"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Bill</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
