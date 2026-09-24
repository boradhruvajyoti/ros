'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, RefreshCw, Eye, Receipt, CheckCircle,
  Clock, XCircle, Download, LayoutGrid, List,
  Printer, ArrowRight, UtensilsCrossed, AlertCircle,
  Volume2, CreditCard, Banknote, QrCode, User, Check
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
  CONFIRMED:       { label: 'Confirmed',    emoji: '👍', bg: 'bg-blue-500/10',    border: 'border-blue-500/30',     text: 'text-blue-500',         nextStatus: 'SENT_TO_KITCHEN', nextAction: 'Send Kitchen' },
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

  const speakOrder = (order: Order) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const text = `Order number ${order.orderNumber}. Table ${order.table?.name || order.type}. Status is ${STATUS_CONFIG[order.status]?.label || order.status}. Total amount ${order.total} rupees.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handlePrint = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - Order ${order.orderNumber}</title>
          <style>
            body { font-family: monospace; padding: 20px; max-width: 320px; margin: 0 auto; }
            h2 { text-align: center; margin: 0 0 4px; }
            p { margin: 2px 0; font-size: 12px; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .item { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px; }
            .total { font-weight: bold; font-size: 15px; }
          </style>
        </head>
        <body>
          <h2>RESTAURANT RECEIPT</h2>
          <p style="text-align: center;">Order: #${order.orderNumber}</p>
          <p style="text-align: center;">${order.table ? `Table: ${order.table.name}` : `Type: ${order.type}`}</p>
          <p style="text-align: center;">${format(new Date(order.createdAt), 'dd MMM yyyy, h:mm a')}</p>
          <div class="divider"></div>
          ${(order.items || []).map(i => `
            <div class="item">
              <span>${i.quantity}x ${i.menuItem?.name || i.name || 'Item'}</span>
              <span>₹${i.totalPrice || (i.quantity * i.unitPrice)}</span>
            </div>
          `).join('')}
          <div class="divider"></div>
          <div class="item total">
            <span>TOTAL AMOUNT:</span>
            <span>₹${order.total}</span>
          </div>
          <div class="divider"></div>
          <p style="text-align: center; font-size: 11px;">Thank you for dining with us!</p>
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

                  {/* Summary row */}
                  <div className="mt-3.5 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium flex items-center gap-1">
                      <UtensilsCrossed className="w-3.5 h-3.5" />
                      {order._count?.items || order.items?.length || 1} items
                    </span>
                    <span className="text-base font-black text-foreground font-mono">
                      {formatCurrency(order.total)}
                    </span>
                  </div>
                </div>

                {/* Big Action Buttons */}
                <div className="mt-4 pt-3 border-t border-border/60 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedOrder(order)}
                    className="flex-1 text-xs font-bold h-9 gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" /> View
                  </Button>

                  <button
                    onClick={() => speakOrder(order)}
                    title="Speak Order Aloud"
                    className="h-9 w-9 rounded-xl border border-border bg-muted/40 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handlePrint(order)}
                    title="Print Receipt / Slip"
                    className="h-9 w-9 rounded-xl border border-border bg-muted/40 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                  </button>

                  {cfg.nextStatus && (
                    <Button
                      size="sm"
                      onClick={() => updateStatus.mutate({ orderId: order.id, status: cfg.nextStatus! })}
                      disabled={updateStatus.isPending}
                      className={cn(
                        'flex-1 text-xs font-bold h-9 gap-1 text-white shadow-sm',
                        cfg.nextStatus === 'PAID' ? 'bg-emerald-600 hover:bg-emerald-700' :
                        cfg.nextStatus === 'BILLED' ? 'bg-purple-600 hover:bg-purple-700' :
                        cfg.nextStatus === 'READY' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-primary'
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
          <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1.5fr] gap-4 px-5 py-3 border-b border-border bg-muted/30 text-xs font-bold text-muted-foreground uppercase">
            <div>Order & Table</div>
            <div>Time</div>
            <div>Status</div>
            <div>Total</div>
            <div className="text-right">Actions</div>
          </div>

          <div className="divide-y divide-border">
            {orders.map((order) => {
              const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.DRAFT;
              return (
                <div key={order.id} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1.5fr] items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                  <div>
                    <p className="font-bold text-foreground font-mono">#{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.table ? `Table ${order.table.name}` : order.type}
                      {order.customer?.name ? ` · ${order.customer.name}` : ''}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(order.createdAt), 'h:mm a')}
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
                    <Button variant="outline" size="sm" onClick={() => handlePrint(order)} className="h-8 w-8 p-0">
                      <Printer className="w-3.5 h-3.5" />
                    </Button>
                    {cfg.nextStatus && (
                      <Button
                        size="sm"
                        onClick={() => updateStatus.mutate({ orderId: order.id, status: cfg.nextStatus! })}
                        className="h-8 text-xs font-bold bg-primary text-primary-foreground"
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
                      onClick={() => handlePrint(selectedOrder)}
                      className="h-8 text-xs gap-1"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print
                    </Button>
                  </div>
                </div>
              );
            })()}

            {/* Items Listing */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Order Items</p>
              <div className="rounded-2xl border border-border divide-y divide-border bg-muted/20 overflow-hidden">
                {selectedOrder.items && selectedOrder.items.length > 0 ? (
                  selectedOrder.items.map((it, idx) => (
                    <div key={it.id || idx} className="p-3 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary font-black text-xs flex items-center justify-center">
                          {it.quantity}x
                        </span>
                        <div>
                          <p className="font-bold text-foreground">{it.menuItem?.name || it.name || 'Dish'}</p>
                          {it.variant?.name && (
                            <p className="text-[11px] text-muted-foreground font-medium">{it.variant.name}</p>
                          )}
                          {it.notes && (
                            <p className="text-[10px] text-amber-500 italic">Note: {it.notes}</p>
                          )}
                        </div>
                      </div>
                      <span className="font-bold font-mono text-foreground">
                        {formatCurrency(it.totalPrice || (it.quantity * it.unitPrice))}
                      </span>
                    </div>
                  ))
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
                  onClick={() => updateStatus.mutate({ orderId: selectedOrder.id, status: 'SENT_TO_KITCHEN' })}
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
    </div>
  );
}
