'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, RefreshCw, Eye, Receipt, CheckCircle,
  Clock, XCircle, Download, LayoutGrid, List,
  Printer, ArrowRight, UtensilsCrossed, AlertCircle,
  Volume2, CreditCard, Banknote, QrCode, User, Check, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { apiGet, apiPatch } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@ros/utils';
import { format } from 'date-fns';

const STATUS_CONFIG: Record<string, { label: string; emoji: string; bg: string; border: string; text: string; nextStatus?: string; nextAction?: string }> = {
  DRAFT:           { label: 'Draft',        emoji: '📝', bg: 'bg-muted/40',       border: 'border-border',          text: 'text-muted-foreground', nextStatus: 'SENT_TO_KITCHEN', nextAction: 'Send Kitchen' },
  CONFIRMED:       { label: 'Pending Verification', emoji: '⚠️', bg: 'bg-amber-500/15', border: 'border-amber-500/40', text: 'text-amber-400', nextStatus: 'SENT_TO_KITCHEN', nextAction: 'Verify & Send' },
  SENT_TO_KITCHEN: { label: 'In Kitchen',   emoji: '🍳', bg: 'bg-amber-500/10',   border: 'border-amber-500/30',    text: 'text-amber-500',        nextStatus: 'READY',           nextAction: 'Mark Ready' },
  PREPARING:       { label: 'Cooking',      emoji: '🔥', bg: 'bg-orange-500/10',  border: 'border-orange-500/30',   text: 'text-orange-500',       nextStatus: 'READY',           nextAction: 'Mark Ready' },
  READY:           { label: 'Ready to Pick',emoji: '🛎️', bg: 'bg-emerald-500/15', border: 'border-emerald-500/40',  text: 'text-emerald-500',      nextStatus: 'SERVED',          nextAction: 'Mark Served' },
  SERVED:          { label: 'Served',       emoji: '🍽️', bg: 'bg-teal-500/10',    border: 'border-teal-500/30',     text: 'text-teal-500',         nextStatus: 'BILLED',          nextAction: 'Generate Bill' },
  BILLED:          { label: 'Bill Given',   emoji: '🧾', bg: 'bg-purple-500/15',  border: 'border-purple-500/40',   text: 'text-purple-500',       nextStatus: 'PAID',            nextAction: 'Collect Payment' },
  PARTIALLY_PAID:  { label: 'Partial Paid', emoji: '⏳', bg: 'bg-indigo-500/10',  border: 'border-indigo-500/30',   text: 'text-indigo-500',       nextStatus: 'PAID',            nextAction: 'Settle Balance' },
  PAID:            { label: 'Paid & Done',  emoji: '✅', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30',  text: 'text-emerald-600',      nextStatus: 'COMPLETED',       nextAction: 'Complete' },
  COMPLETED:       { label: 'Finished',     emoji: '🏁', bg: 'bg-zinc-500/10',    border: 'border-zinc-500/30',     text: 'text-zinc-400' },
  CANCELLED:       { label: 'Cancelled',    emoji: '❌', bg: 'bg-rose-500/10',    border: 'border-rose-500/30',     text: 'text-rose-500' },
  VOIDED:          { label: 'Voided',       emoji: '🚫', bg: 'bg-rose-500/10',    border: 'border-rose-500/30',     text: 'text-rose-500' },
};

interface OrderItem {
  id: string;
  name?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  menuItem?: { name: string; foodType?: string };
  variant?: { name: string };
  notes?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  type: string;
  status: string;
  subtotal: number;
  taxAmount?: number;
  discountAmount?: number;
  total: number;
  table?: { name: string };
  customer?: { name: string; phone?: string };
  items?: OrderItem[];
  _count: { items: number };
  createdAt: string;
  completedAt?: string;
}

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [verifyingOrder, setVerifyingOrder] = useState<Order | null>(null);

  const { data: tenant } = useQuery({
    queryKey: ['current-tenant'],
    queryFn: () => apiGet<any>('/tenants/current'),
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['orders', statusFilter, typeFilter],
    queryFn: () => apiGet<{ orders: Order[]; total: number; page: number; limit: number }>(
      `/orders?${statusFilter ? `status=${statusFilter}&` : ''}${typeFilter ? `type=${typeFilter}&` : ''}limit=150`
    ),
    refetchInterval: 15000,
  });

  const orders = (data?.orders || []).filter((o) =>
    !search ||
    o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
    o.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
    o.table?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const updateStatus = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      apiPatch(`/orders/${orderId}/status`, { status }),
    onSuccess: (_, vars) => {
      toast.success('Status Updated', `Order changed to ${vars.status}`);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      if (selectedOrder && selectedOrder.id === vars.orderId) {
        setSelectedOrder((prev) => prev ? { ...prev, status: vars.status } : null);
      }
    },
    onError: () => toast.error('Update Failed', 'Could not update order status'),
  });

  const handleAdvanceStatus = (order: Order, targetStatus: string) => {
    if (targetStatus === 'SENT_TO_KITCHEN' && ['DRAFT', 'CONFIRMED'].includes(order.status)) {
      setVerifyingOrder(order);
      return;
    }
    updateStatus.mutate({ orderId: order.id, status: targetStatus });
  };

  const speakOrder = (order: Order) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const text = `Order number ${order.orderNumber}. Table ${order.table?.name || order.type}. Status is ${STATUS_CONFIG[order.status]?.label || order.status}. Total amount ${order.total} rupees.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handlePrint = (order: Order, isKot = false) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${isKot ? 'KOT' : 'POS Bill'} - #${order.orderNumber}</title>
          <style>
            @page { margin: 4mm; }
            body {
              font-family: 'Courier New', Courier, monospace;
              padding: 10px;
              max-width: 320px;
              margin: 0 auto;
              font-size: 12px;
              color: #000;
              line-height: 1.3;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .title { font-size: 16px; font-weight: 900; margin: 0 0 4px; }
            .subtitle { font-size: 12px; margin: 2px 0; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .double-divider { border-top: 2px solid #000; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 12px; }
            th { text-align: left; border-bottom: 1px dashed #000; padding: 4px 2px; font-size: 11px; text-transform: uppercase; }
            td { padding: 4px 2px; vertical-align: top; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .item-name { font-weight: bold; }
            .item-sub { font-size: 10px; color: #333; }
            .row-flex { display: flex; justify-content: space-between; margin: 3px 0; }
            .grand-total { font-size: 14px; font-weight: 900; }
            .kot-box { border: 2px solid #000; padding: 4px; text-align: center; font-size: 14px; font-weight: 900; margin-bottom: 6px; }
            .logo-header { text-align: center; margin-bottom: 8px; }
            .logo-img { max-height: 55px; max-width: 140px; margin: 0 auto; object-fit: contain; display: block; }
          </style>
        </head>
        <body>
          ${isKot ? `
            ${tenant?.logoUrl ? `<div class="logo-header"><img src="${tenant.logoUrl}" class="logo-img" alt="Logo" /></div>` : ''}
            <div class="kot-box">*** KITCHEN ORDER TICKET (KOT) ***</div>
            <p class="center bold title">${order.table ? `TABLE: ${order.table.name}` : order.type}</p>
            <p class="center">Order #${order.orderNumber} · ${format(new Date(order.createdAt), 'dd MMM yyyy, h:mm a')}</p>
            <div class="divider"></div>
            <table>
              <thead>
                <tr>
                  <th style="width: 15%;">QTY</th>
                  <th style="width: 85%;">ITEM DESCRIPTION</th>
                </tr>
              </thead>
              <tbody>
                ${(order.items || []).map(i => `
                  <tr>
                    <td class="bold font-mono" style="font-size: 13px;">${i.quantity}x</td>
                    <td>
                      <div class="item-name">${i.menuItem?.name || i.name || 'Dish'}</div>
                      ${i.variant?.name ? `<div class="item-sub">Variant: ${i.variant.name}</div>` : ''}
                      ${i.notes ? `<div class="item-sub bold" style="color: #000;">* Instructions: ${i.notes}</div>` : ''}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="divider"></div>
            <p class="center bold" style="font-size: 11px;">--- END OF KOT ---</p>
          ` : `
            ${tenant?.logoUrl ? `<div class="logo-header"><img src="${tenant.logoUrl}" class="logo-img" alt="Logo" /></div>` : ''}
            <div class="center">
              <div class="title">${tenant?.name || 'RESTAURANT RECEIPT'}</div>
              <div class="subtitle">Tax Invoice / Dining Bill</div>
              <div class="subtitle">Order #${order.orderNumber}</div>
              <div class="subtitle">${order.table ? `Table: ${order.table.name}` : `Type: ${order.type}`}</div>
              <div class="subtitle">${format(new Date(order.createdAt), 'dd MMM yyyy, h:mm a')}</div>
              ${order.customer?.name ? `<div class="subtitle">Guest: ${order.customer.name}</div>` : ''}
            </div>

            <div class="divider"></div>

            <table>
              <thead>
                <tr>
                  <th style="width: 45%;">Item</th>
                  <th class="text-center" style="width: 15%;">Qty</th>
                  <th class="text-right" style="width: 20%;">Rate</th>
                  <th class="text-right" style="width: 20%;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${(order.items || []).map(i => {
                  const rate = Number(i.unitPrice || 0);
                  const qty = Number(i.quantity || 1);
                  const lineTotal = Number(i.totalPrice || (rate * qty));
                  return `
                    <tr>
                      <td>
                        <div class="item-name">${i.menuItem?.name || i.name || 'Dish'}</div>
                        ${i.variant?.name ? `<div class="item-sub">(${i.variant.name})</div>` : ''}
                      </td>
                      <td class="text-center bold">${qty}</td>
                      <td class="text-right">₹${rate.toFixed(2)}</td>
                      <td class="text-right bold">₹${lineTotal.toFixed(2)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>

            <div class="divider"></div>

            <div class="row-flex">
              <span>Subtotal:</span>
              <span>₹${Number(order.subtotal || order.total).toFixed(2)}</span>
            </div>

            ${order.taxAmount ? `
              <div class="row-flex">
                <span>Taxes &amp; GST:</span>
                <span>₹${Number(order.taxAmount).toFixed(2)}</span>
              </div>
            ` : ''}

            ${order.discountAmount ? `
              <div class="row-flex">
                <span>Discount:</span>
                <span>-₹${Number(order.discountAmount).toFixed(2)}</span>
              </div>
            ` : ''}

            <div class="double-divider"></div>

            <div class="row-flex grand-total">
              <span>TOTAL PAYABLE:</span>
              <span>₹${Number(order.total).toFixed(2)}</span>
            </div>

            <div class="double-divider"></div>

            <p class="center" style="font-size: 11px; margin-top: 10px;">
              Thank you for dining with us!<br/>
              Please visit again.
            </p>
          `}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // Status counts
  const countPendingVerification = (data?.orders || []).filter(o => o.status === 'CONFIRMED').length;
  const countInKitchen = (data?.orders || []).filter(o => ['SENT_TO_KITCHEN', 'PREPARING'].includes(o.status)).length;
  const countReady = (data?.orders || []).filter(o => o.status === 'READY').length;
  const countBilled = (data?.orders || []).filter(o => ['SERVED', 'BILLED', 'PARTIALLY_PAID'].includes(o.status)).length;
  const countCompleted = (data?.orders || []).filter(o => ['PAID', 'COMPLETED'].includes(o.status)).length;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-card/60 p-4 rounded-2xl border border-border">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2.5">
            <Receipt className="w-7 h-7 text-primary" />
            Live Orders & Billing
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Total {data?.total || orders.length} orders · Real-time status tracker and one-tap payment
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-muted/40 p-1 rounded-xl border border-border flex items-center gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn('p-2 rounded-lg transition-colors', viewMode === 'grid' ? 'bg-primary text-primary-foreground font-bold shadow-sm' : 'text-muted-foreground hover:text-foreground')}
              title="Touch Cards Grid"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={cn('p-2 rounded-lg transition-colors', viewMode === 'table' ? 'bg-primary text-primary-foreground font-bold shadow-sm' : 'text-muted-foreground hover:text-foreground')}
              title="Compact List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 h-10 px-3">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* QR Order Physical Presence Verification Alert Banner */}
      {countPendingVerification > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-amber-500/10 animate-pulse">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-black text-sm text-foreground flex items-center gap-2">
                ⚠️ {countPendingVerification} QR Code {countPendingVerification === 1 ? 'Order' : 'Orders'} Awaiting Guest Table Verification
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Staff must look at the physical table to confirm guests are seated before sending food tickets (KOT) to the kitchen.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setStatusFilter(statusFilter === 'CONFIRMED' ? null : 'CONFIRMED')}
            className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shrink-0 rounded-xl shadow-sm"
          >
            {statusFilter === 'CONFIRMED' ? 'Show All Orders' : `View ${countPendingVerification} Pending`}
          </Button>
        </div>
      )}

      {/* Quick Visual Status Cards Filter */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setStatusFilter(null)}
          className={cn(
            'p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between relative overflow-hidden',
            statusFilter === null ? 'bg-primary text-primary-foreground border-primary shadow-md ring-2 ring-primary/30' : 'bg-card border-border hover:border-primary/40'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-lg">🌟</span>
            <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', statusFilter === null ? 'bg-black/20 text-white' : 'bg-muted text-foreground')}>
              {data?.total || orders.length}
            </span>
          </div>
          <p className="font-black text-sm mt-2">All Orders</p>
        </button>

        <button
          onClick={() => setStatusFilter('SENT_TO_KITCHEN')}
          className={cn(
            'p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between relative overflow-hidden',
            statusFilter === 'SENT_TO_KITCHEN' ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-500/30' : 'bg-card border-border hover:border-amber-500/40'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-lg">🍳</span>
            <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', statusFilter === 'SENT_TO_KITCHEN' ? 'bg-black/20 text-white' : 'bg-amber-500/10 text-amber-500')}>
              {countInKitchen}
            </span>
          </div>
          <p className="font-black text-sm mt-2">In Kitchen</p>
        </button>

        <button
          onClick={() => setStatusFilter('READY')}
          className={cn(
            'p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between relative overflow-hidden',
            statusFilter === 'READY' ? 'bg-emerald-500 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/30' : 'bg-card border-border hover:border-emerald-500/40'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-lg">🛎️</span>
            <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', statusFilter === 'READY' ? 'bg-black/20 text-white' : 'bg-emerald-500/10 text-emerald-500')}>
              {countReady}
            </span>
          </div>
          <p className="font-black text-sm mt-2">Ready to Serve</p>
        </button>

        <button
          onClick={() => setStatusFilter('BILLED')}
          className={cn(
            'p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between relative overflow-hidden',
            statusFilter === 'BILLED' ? 'bg-purple-600 text-white border-purple-700 shadow-md ring-2 ring-purple-500/30' : 'bg-card border-border hover:border-purple-500/40'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-lg">🧾</span>
            <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', statusFilter === 'BILLED' ? 'bg-black/20 text-white' : 'bg-purple-500/10 text-purple-500')}>
              {countBilled}
            </span>
          </div>
          <p className="font-black text-sm mt-2">Bill Given</p>
        </button>

        <button
          onClick={() => setStatusFilter('PAID')}
          className={cn(
            'p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between relative overflow-hidden',
            statusFilter === 'PAID' ? 'bg-zinc-700 text-white border-zinc-800 shadow-md ring-2 ring-zinc-500/30' : 'bg-card border-border hover:border-zinc-500/40'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-lg">✅</span>
            <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', statusFilter === 'PAID' ? 'bg-black/20 text-white' : 'bg-muted text-muted-foreground')}>
              {countCompleted}
            </span>
          </div>
          <p className="font-black text-sm mt-2">Paid / Done</p>
        </button>
      </div>

      {/* Search & Dining Type Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search Order #, Table, or Customer Name..."
          className="h-11 bg-card rounded-xl text-sm"
        />

        <div className="flex gap-2 shrink-0">
          {(['DINE_IN', 'TAKEAWAY', 'DELIVERY'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(typeFilter === t ? null : t)}
              className={cn(
                'px-4 py-2 rounded-xl border text-xs font-bold transition-all shrink-0',
                typeFilter === t ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-card border-border text-muted-foreground hover:border-primary/50'
              )}
            >
              {t === 'DINE_IN' ? '🍽️ Dine-In' : t === 'TAKEAWAY' ? '🥡 Takeaway' : '🛵 Delivery'}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN VIEW: TOUCH CARDS OR TABLE */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 rounded-2xl bg-muted/40 animate-pulse border border-border" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="py-24 text-center border-2 border-dashed border-border rounded-3xl bg-card/30">
          <Receipt className="w-16 h-16 mx-auto mb-3 text-muted-foreground/30" />
          <h3 className="text-lg font-bold text-foreground">No orders matching filter</h3>
          <p className="text-xs text-muted-foreground mt-1">Select another filter tab or create a new order in POS.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {orders.map((order) => {
            const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.DRAFT;

            return (
              <div
                key={order.id}
                className={cn(
                  'rounded-2xl border bg-card p-4 flex flex-col justify-between transition-all hover:shadow-lg relative overflow-hidden',
                  cfg.border
                )}
              >
                {/* Header info */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-foreground font-mono">
                          #{order.orderNumber}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
                          {order.table ? `Table ${order.table.name}` : order.type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(order.createdAt), 'h:mm a')}
                        {order.customer?.name && ` · ${order.customer.name}`}
                      </p>
                    </div>

                    <span className={cn('px-2.5 py-1 rounded-xl text-xs font-bold border flex items-center gap-1 shrink-0', cfg.bg, cfg.border, cfg.text)}>
                      <span>{cfg.emoji}</span>
                      <span>{cfg.label}</span>
                    </span>
                  </div>

                  {/* Itemized summary with Qty and Rate */}
                  <div className="mt-3 pt-3 border-t border-border/50 space-y-1.5">
                    {order.items && order.items.length > 0 ? (
                      <div className="space-y-1 max-h-24 overflow-y-auto pr-1 no-scrollbar">
                        {order.items.map((it, idx) => (
                          <div key={it.id || idx} className="flex items-center justify-between text-[11px]">
                            <span className="truncate pr-2 font-medium text-foreground">
                              <strong className="text-primary font-bold">{it.quantity}x</strong> {it.menuItem?.name || it.name || 'Item'}
                              {it.variant?.name && <span className="text-muted-foreground text-[10px] ml-1">({it.variant.name})</span>}
                            </span>
                            <span className="font-mono text-muted-foreground shrink-0 text-[10px]">
                              @{formatCurrency(it.unitPrice)} <span className="text-foreground font-bold">({formatCurrency(it.totalPrice || it.quantity * it.unitPrice)})</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <UtensilsCrossed className="w-3.5 h-3.5" />
                        {order._count?.items || 1} items
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-border/30 text-xs font-bold">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="text-base font-black text-foreground font-mono">
                        {formatCurrency(order.total)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Big Action Buttons */}
                <div className="mt-3 pt-2 border-t border-border/60 flex items-center gap-1.5 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedOrder(order)}
                    className="flex-1 text-xs font-bold h-9 gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" /> View
                  </Button>

                  <button
                    onClick={() => handlePrint(order, true)}
                    title="Print KOT Slip"
                    className="h-9 px-2 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 flex items-center justify-center font-black text-[10px] gap-1 shrink-0 transition-colors"
                  >
                    🍳 KOT
                  </button>

                  <button
                    onClick={() => handlePrint(order, false)}
                    title="Print POS Bill"
                    className="h-9 px-2 rounded-xl border border-border bg-muted/40 hover:bg-muted flex items-center justify-center text-foreground font-black text-[10px] gap-1 shrink-0 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" /> Bill
                  </button>

                  {cfg.nextStatus && (
                    <Button
                      size="sm"
                      onClick={() => handleAdvanceStatus(order, cfg.nextStatus!)}
                      disabled={updateStatus.isPending}
                      className={cn(
                        'flex-1 text-xs font-bold h-9 gap-1 text-white shadow-sm',
                        cfg.nextStatus === 'PAID' ? 'bg-emerald-600 hover:bg-emerald-700' :
                        cfg.nextStatus === 'BILLED' ? 'bg-purple-600 hover:bg-purple-700' :
                        cfg.nextStatus === 'READY' ? 'bg-emerald-600 hover:bg-emerald-700' :
                        order.status === 'CONFIRMED' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary'
                      )}
                    >
                      {cfg.nextAction || 'Next'}
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr_1.5fr] gap-4 px-5 py-3 border-b border-border bg-muted/30 text-xs font-bold text-muted-foreground uppercase">
            <div>Order & Table</div>
            <div>Ordered Items (Qty @ Rate)</div>
            <div>Status</div>
            <div>Total</div>
            <div className="text-right">Actions</div>
          </div>

          <div className="divide-y divide-border">
            {orders.map((order) => {
              const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.DRAFT;
              return (
                <div key={order.id} className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr_1.5fr] items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                  <div>
                    <p className="font-bold text-foreground font-mono">#{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.table ? `Table ${order.table.name}` : order.type}
                      {order.customer?.name ? ` · ${order.customer.name}` : ''}
                      {' · '}{format(new Date(order.createdAt), 'h:mm a')}
                    </p>
                  </div>
                  <div className="text-xs space-y-0.5 max-h-16 overflow-y-auto">
                    {order.items && order.items.length > 0 ? (
                      order.items.map((it, idx) => (
                        <div key={idx} className="text-[11px] text-muted-foreground truncate">
                          <strong className="text-foreground">{it.quantity}x</strong> {it.menuItem?.name || it.name || 'Dish'}
                          {it.variant?.name ? ` (${it.variant.name})` : ''} @ {formatCurrency(it.unitPrice)}
                        </div>
                      ))
                    ) : (
                      <span className="text-muted-foreground">{order._count?.items || 1} items</span>
                    )}
                  </div>
                  <div>
                    <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold border inline-flex items-center gap-1', cfg.bg, cfg.border, cfg.text)}>
                      {cfg.emoji} {cfg.label}
                    </span>
                  </div>
                  <div className="font-bold font-mono text-foreground">
                    {formatCurrency(order.total)}
                  </div>
                  <div className="flex items-center justify-end gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)} className="h-8 text-xs font-bold">
                      View
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handlePrint(order, false)} className="h-8 px-2 text-[11px] font-bold">
                      <Printer className="w-3.5 h-3.5 mr-1" /> Bill
                    </Button>
                    {cfg.nextStatus && (
                      <Button
                        size="sm"
                        onClick={() => handleAdvanceStatus(order, cfg.nextStatus!)}
                        className={cn(
                          'h-8 text-xs font-bold text-white',
                          order.status === 'CONFIRMED' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary'
                        )}
                      >
                        {cfg.nextAction}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ORDER DETAIL & SETTLE SLIP MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Top Center Restaurant Logo */}
            {tenant?.logoUrl && (
              <div className="flex justify-center pb-1">
                <img
                  src={tenant.logoUrl}
                  alt={tenant.name || 'Restaurant Logo'}
                  className="max-h-14 max-w-[150px] object-contain mx-auto"
                />
              </div>
            )}

            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-foreground font-mono">
                    #{selectedOrder.orderNumber}
                  </span>
                  <Badge className="text-xs font-bold">
                    {selectedOrder.table ? `Table ${selectedOrder.table.name}` : selectedOrder.type}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Ordered on {format(new Date(selectedOrder.createdAt), 'dd MMMM yyyy, h:mm a')}
                </p>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Current Status Pill */}
            {(() => {
              const cfg = STATUS_CONFIG[selectedOrder.status] || STATUS_CONFIG.DRAFT;
              return (
                <div className={cn('p-3 rounded-2xl border flex items-center justify-between', cfg.bg, cfg.border)}>
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <span className="text-xl">{cfg.emoji}</span>
                    <span className={cfg.text}>{cfg.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => speakOrder(selectedOrder)}
                      className="h-8 text-xs gap-1"
                    >
                      <Volume2 className="w-3.5 h-3.5" /> Read
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePrint(selectedOrder, true)}
                      className="h-8 text-xs gap-1 border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
                    >
                      🍳 KOT
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePrint(selectedOrder, false)}
                      className="h-8 text-xs gap-1"
                    >
                      <Printer className="w-3.5 h-3.5" /> Bill
                    </Button>
                  </div>
                </div>
              );
            })()}

            {/* Items Listing with item name, quantity, rate, line total */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                <span>Dish Description</span>
                <span>Qty × Rate = Total</span>
              </div>
              <div className="rounded-2xl border border-border divide-y divide-border bg-muted/20 overflow-hidden">
                {selectedOrder.items && selectedOrder.items.length > 0 ? (
                  selectedOrder.items.map((it, idx) => {
                    const unitPrice = Number(it.unitPrice || 0);
                    const qty = Number(it.quantity || 1);
                    const lineTotal = Number(it.totalPrice || (qty * unitPrice));
                    const foodType = it.menuItem?.foodType || 'VEG';

                    return (
                      <div key={it.id || idx} className="p-3 flex items-start justify-between text-sm gap-2">
                        <div className="flex items-start gap-2.5">
                          <span className="text-xs mt-0.5 shrink-0">
                            {foodType === 'VEG' ? '🟢' : '🔴'}
                          </span>
                          <div>
                            <p className="font-bold text-foreground">{it.menuItem?.name || it.name || 'Dish'}</p>
                            {it.variant?.name && (
                              <p className="text-[11px] text-muted-foreground font-medium">Variant: {it.variant.name}</p>
                            )}
                            {it.notes && (
                              <p className="text-[10px] text-amber-500 italic">Note: {it.notes}</p>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-bold font-mono text-foreground">
                            {formatCurrency(lineTotal)}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {qty} × {formatCurrency(unitPrice)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    {selectedOrder._count?.items || 1} items in order
                  </div>
                )}
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="rounded-2xl bg-card border border-border p-4 space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono">{formatCurrency(selectedOrder.subtotal || selectedOrder.total)}</span>
              </div>
              {!!selectedOrder.taxAmount && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Taxes & GST</span>
                  <span className="font-mono">{formatCurrency(selectedOrder.taxAmount)}</span>
                </div>
              )}
              {!!selectedOrder.discountAmount && (
                <div className="flex justify-between text-xs text-emerald-500 font-medium">
                  <span>Discount</span>
                  <span className="font-mono">-{formatCurrency(selectedOrder.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-foreground pt-2 border-t border-border">
                <span>Total Amount</span>
                <span className="font-mono text-primary">{formatCurrency(selectedOrder.total)}</span>
              </div>
            </div>

            {/* Quick Status Control Buttons */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Change Status</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAdvanceStatus(selectedOrder, 'SENT_TO_KITCHEN')}
                  className="text-xs font-bold border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
                >
                  🍳 Kitchen
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateStatus.mutate({ orderId: selectedOrder.id, status: 'READY' })}
                  className="text-xs font-bold border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10"
                >
                  🛎️ Ready
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateStatus.mutate({ orderId: selectedOrder.id, status: 'BILLED' })}
                  className="text-xs font-bold border-purple-500/40 text-purple-500 hover:bg-purple-500/10"
                >
                  🧾 Billed
                </Button>
                <Button
                  size="sm"
                  onClick={() => updateStatus.mutate({ orderId: selectedOrder.id, status: 'PAID' })}
                  className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  ✅ Paid
                </Button>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => setSelectedOrder(null)}
              className="w-full font-bold"
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* PHYSICAL PRESENCE VERIFICATION MODAL FOR QR ORDERS */}
      {verifyingOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border-2 border-amber-500/50 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center mx-auto text-2xl shadow-inner">
                ⚠️
              </div>
              <h3 className="text-lg font-black text-foreground">Verify Guest Physical Presence</h3>
              <p className="text-xs text-muted-foreground">
                Order <span className="font-mono font-bold text-foreground">#{verifyingOrder.orderNumber}</span> for <strong className="text-foreground">{verifyingOrder.table ? `Table ${verifyingOrder.table.name}` : 'Dine-In Table'}</strong>
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2 text-amber-900 dark:text-amber-200">
              <p className="font-bold flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Please look at the table before confirming!
              </p>
              <p className="text-[11px] leading-relaxed opacity-90">
                To prevent fake orders from saved photos or remote scans, verify that guests are physically seated at <strong>{verifyingOrder.table?.name || 'this table'}</strong> before dispatching tickets to the kitchen.
              </p>
            </div>

            <div className="space-y-2 text-xs border rounded-2xl p-3 bg-muted/20">
              <div className="flex justify-between font-bold text-muted-foreground uppercase text-[10px]">
                <span>Dish Description</span>
                <span>Qty × Rate = Line Total</span>
              </div>
              {verifyingOrder.items && verifyingOrder.items.length > 0 && (
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {verifyingOrder.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-start text-[11px]">
                      <div>
                        <span className="font-bold">{it.quantity}x</span> {it.menuItem?.name || it.name || 'Dish'}
                        {it.variant?.name && <span className="text-muted-foreground text-[10px]"> ({it.variant.name})</span>}
                      </div>
                      <span className="font-mono text-muted-foreground shrink-0">
                        {it.quantity} × {formatCurrency(it.unitPrice)} = <strong className="text-foreground">{formatCurrency(it.totalPrice || it.quantity * it.unitPrice)}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t font-bold text-xs">
                <span>Order Total:</span>
                <span className="font-mono text-primary text-sm">{formatCurrency(verifyingOrder.total)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  updateStatus.mutate({ orderId: verifyingOrder.id, status: 'CANCELLED' });
                  setVerifyingOrder(null);
                }}
                disabled={updateStatus.isPending}
                className="h-11 rounded-xl text-rose-500 border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-600 font-bold text-xs"
              >
                ❌ Table Empty (Reject)
              </Button>
              <Button
                onClick={() => {
                  updateStatus.mutate({ orderId: verifyingOrder.id, status: 'SENT_TO_KITCHEN' });
                  setVerifyingOrder(null);
                }}
                disabled={updateStatus.isPending}
                className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
              >
                ✅ Guest Seated (Send)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
