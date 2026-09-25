'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Grid3X3, List, Plus, Users, Clock, CircleCheck, CircleDot,
  Wrench, Ban, Edit3, Trash2, X, Check, QrCode, ShoppingCart,
  Utensils, DollarSign, CheckCircle2, AlertCircle, Sparkles, ArrowRight,
  Printer, Download, Eye, ExternalLink, Search, RefreshCw, Receipt,
  CheckCircle, XCircle, LayoutGrid, UtensilsCrossed, Volume2, CreditCard,
  Banknote, User, AlertTriangle, Minus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { apiGet, apiPost, apiPatch, apiPut, apiDelete } from '@/lib/api';
import { onRosEvent } from '@/lib/socket';
import { toast } from '@/hooks/use-toast';
import QRCode from 'qrcode';
import { formatCurrency } from '@ros/utils';
import { format } from 'date-fns';

export interface Table {
  id: string;
  name: string;
  capacity: number;
  shape?: 'RECTANGLE' | 'CIRCLE' | 'SQUARE';
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | 'BLOCKED';
  qrCodeToken?: string;
  floorId?: string;
  floor?: { id: string; name: string };
  orders?: any[];
  posX: number;
  posY: number;
  width: number;
  height: number;
}

export interface OrderItem {
  id: string;
  name?: string;
  menuItemId?: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  menuItem?: { id?: string; name: string; foodType?: string };
  variant?: { id?: string; name: string };
}

export interface Order {
  id: string;
  orderNumber: string;
  type: string;
  status: string;
  subtotal: number;
  taxAmount?: number;
  discountAmount?: number;
  total: number;
  notes?: string;
  table?: { id?: string; name: string };
  customer?: { name: string; phone?: string };
  items?: OrderItem[];
  _count: { items: number };
  createdAt: string;
  completedAt?: string;
}

const TABLE_STATUS_META = {
  AVAILABLE: {
    label: '🟢 Available / Free',
    shortLabel: 'Available',
    color: 'bg-emerald-500',
    border: 'border-emerald-500/40 hover:border-emerald-500',
    bg: 'bg-emerald-950/20',
    text: 'text-emerald-400',
    action: 'Tap to Take Order',
  },
  OCCUPIED: {
    label: '🔴 Dining / Occupied',
    shortLabel: 'Dining',
    color: 'bg-red-500',
    border: 'border-red-500/40 hover:border-red-500',
    bg: 'bg-red-950/25',
    text: 'text-red-400',
    action: 'Running Order',
  },
  RESERVED: {
    label: '🔵 Reserved',
    shortLabel: 'Reserved',
    color: 'bg-blue-500',
    border: 'border-blue-500/40 hover:border-blue-500',
    bg: 'bg-blue-950/25',
    text: 'text-blue-400',
    action: 'Seat Guests',
  },
  CLEANING: {
    label: '🟡 Needs Cleaning',
    shortLabel: 'Cleaning',
    color: 'bg-amber-500',
    border: 'border-amber-500/40 hover:border-amber-500',
    bg: 'bg-amber-950/25',
    text: 'text-amber-400',
    action: 'Mark Clean',
  },
  BLOCKED: {
    label: '⚪ Out of Service',
    shortLabel: 'Blocked',
    color: 'bg-zinc-500',
    border: 'border-zinc-700 hover:border-zinc-500',
    bg: 'bg-zinc-900/40',
    text: 'text-zinc-400',
    action: 'Enable',
  },
};

const ORDER_STATUS_CONFIG: Record<string, { label: string; emoji: string; bg: string; border: string; text: string; nextStatus?: string; nextAction?: string }> = {
  DRAFT:           { label: 'Draft',        emoji: '📝', bg: 'bg-muted/40',       border: 'border-border',          text: 'text-muted-foreground', nextStatus: 'SENT_TO_KITCHEN', nextAction: 'Send Kitchen' },
  CONFIRMED:       { label: 'Pending Verification', emoji: '⚠️', bg: 'bg-amber-500/15', border: 'border-amber-500/40', text: 'text-amber-400', nextStatus: 'SENT_TO_KITCHEN', nextAction: 'Verify & Send' },
  SENT_TO_KITCHEN: { label: 'In Kitchen',   emoji: '🍳', bg: 'bg-amber-500/10',   border: 'border-amber-500/30',    text: 'text-amber-500' },
  PREPARING:       { label: 'Cooking',      emoji: '🔥', bg: 'bg-orange-500/10',  border: 'border-orange-500/30',   text: 'text-orange-500' },
  READY:           { label: 'Ready to Pick',emoji: '🛎️', bg: 'bg-emerald-500/15', border: 'border-emerald-500/40',  text: 'text-emerald-500' },
  SERVED:          { label: 'Served',       emoji: '🍽️', bg: 'bg-teal-500/10',    border: 'border-teal-500/30',     text: 'text-teal-500',         nextStatus: 'PAID',            nextAction: 'Mark as Paid' },
  BILLED:          { label: 'Billed',       emoji: '🧾', bg: 'bg-purple-500/15',  border: 'border-purple-500/40',   text: 'text-purple-500',       nextStatus: 'PAID',            nextAction: 'Mark as Paid' },
  PARTIALLY_PAID:  { label: 'Partial Paid', emoji: '⏳', bg: 'bg-indigo-500/10',  border: 'border-indigo-500/30',   text: 'text-indigo-500',       nextStatus: 'PAID',            nextAction: 'Settle Balance' },
  PAID:            { label: 'Paid & Done',  emoji: '✅', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30',  text: 'text-emerald-600' },
  COMPLETED:       { label: 'Finished',     emoji: '🏁', bg: 'bg-zinc-500/10',    border: 'border-zinc-500/30',     text: 'text-zinc-400' },
  CANCELLED:       { label: 'Cancelled',    emoji: '❌', bg: 'bg-rose-500/10',    border: 'border-rose-500/30',     text: 'text-rose-500' },
  VOIDED:          { label: 'Voided',       emoji: '🚫', bg: 'bg-rose-500/10',    border: 'border-rose-500/30',     text: 'text-rose-500' },
};

function getOrderKotProgress(order: any): { total: number; served: number; allServed: boolean } {
  const kots: any[] = order?.kots || [];
  const activeKots = kots.filter((k) => k.status !== 'CANCELLED');
  const total = activeKots.length;
  const served = activeKots.filter((k) => k.status === 'SERVED').length;
  return {
    total,
    served,
    allServed: total > 0 && served === total,
  };
}

function checkCanMarkPaid(order: any): { canPay: boolean; reason?: string } {
  if (['PAID', 'COMPLETED', 'CANCELLED', 'VOIDED'].includes(order.status)) {
    return { canPay: false, reason: 'Order is already completed or cancelled' };
  }
  if (['DRAFT', 'CONFIRMED'].includes(order.status)) {
    return { canPay: false, reason: 'Order must be sent to kitchen first' };
  }
  // Always check KOT progress first — even if order status is SERVED,
  // a new running round may have added unserved KOTs
  const { total, served, allServed } = getOrderKotProgress(order);
  if (total > 0 && !allServed) {
    return {
      canPay: false,
      reason: `Kitchen in progress: ${served}/${total} KOTs marked as Served. All KOTs (including running rounds) must be served before billing.`,
    };
  }
  // After KOT guard passes, verify order-level status
  if (!['SERVED', 'BILLED', 'PARTIALLY_PAID'].includes(order.status)) {
    return {
      canPay: false,
      reason: `Order is ${order.status}. Kitchen staff must mark all KOTs as SERVED on KDS first.`,
    };
  }
  return { canPay: true };
}

function checkCanCancel(order: any): { canCancel: boolean; reason?: string } {
  if (!order || ['PAID', 'COMPLETED', 'CANCELLED', 'VOIDED'].includes(order.status)) {
    return { canCancel: false, reason: 'Order is already completed or cancelled' };
  }
  // If order itself is in cooking/prepared/served/billed states
  if (['PREPARING', 'COOKING', 'READY', 'SERVED', 'BILLED', 'PARTIALLY_PAID'].includes(order.status)) {
    return {
      canCancel: false,
      reason: 'Order is in cooking/preparation and can no longer be cancelled from the order feed. Item adjustments must be handled by kitchen staff on KDS.',
    };
  }

  // Once any KOT in kitchen display status is In Cooking (PREPARING / COOKING) or accepted / ready / served
  const kots: any[] = order?.kots || [];
  const inCookingKot = kots.some((k) => ['PREPARING', 'COOKING'].includes(k.status));
  if (inCookingKot) {
    return {
      canCancel: false,
      reason: 'Order cannot be cancelled because KOT is In Cooking in the kitchen.',
    };
  }

  const kitchenAcceptedKot = kots.some(
    (k) => !['NEW', 'CANCELLED'].includes(k.status)
  );
  if (kitchenAcceptedKot) {
    return {
      canCancel: false,
      reason: 'Order cannot be cancelled after KOT is accepted in the kitchen. Item cancellations must be done by kitchen staff on KDS.',
    };
  }
  return { canCancel: true };
}

export default function TablesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // ── Tables State ────────────────────────────────────────────────────────────
  const [tableStatusFilter, setTableStatusFilter] = useState<string | null>(null);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [tableNameInput, setTableNameInput] = useState('');
  const [tableCapacityInput, setTableCapacityInput] = useState<number>(4);
  const [tableShapeInput, setTableShapeInput] = useState<'RECTANGLE' | 'CIRCLE' | 'SQUARE'>('SQUARE');
  const [tableStatusInput, setTableStatusInput] = useState<Table['status']>('AVAILABLE');
  const [tableFloorIdInput, setTableFloorIdInput] = useState<string>('');
  const [qrModalTable, setQrModalTable] = useState<Table | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // ── Table-Wise Orders History Modal State ───────────────────────────────────
  const [tableOrdersModalTable, setTableOrdersModalTable] = useState<Table | null>(null);
  const [tableOrdersDate, setTableOrdersDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // ── Orders State ────────────────────────────────────────────────────────────
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string | null>(null);
  const [orderTypeFilter, setOrderTypeFilter] = useState<string | null>(null);
  const [orderViewMode, setOrderViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedOrder, setSelectedOrder] = useState<Order | any | null>(null);
  const [billPreviewOrder, setBillPreviewOrder] = useState<Order | any | null>(null);

  // ── Realtime Socket Subscriptions for Tables & Order Feed ──────────────
  useEffect(() => {
    const unsub = onRosEvent((event) => {
      const t = event.type as string;
      if (
        t === 'ORDER_CREATED' ||
        t === 'ORDER_UPDATED' ||
        t === 'ORDER_STATUS_CHANGED' ||
        t === 'KOT_STATUS_CHANGED' ||
        t === 'KOT_ITEM_STATUS_CHANGED' ||
        t === 'QR_ORDER_PENDING' ||
        t === 'TABLE_STATUS_CHANGED' ||
        t === 'KOT_CREATED' ||
        t === 'PAYMENT_COMPLETED'
      ) {
        queryClient.invalidateQueries({ queryKey: ['active-orders'] });
        queryClient.invalidateQueries({ queryKey: ['tables'] });
        queryClient.invalidateQueries({ queryKey: ['orders'] });
      }
    });
    return () => unsub();
  }, [queryClient]);

  // ── Data Queries ────────────────────────────────────────────────────────────
  const { data: tenant } = useQuery({
    queryKey: ['current-tenant'],
    queryFn: () => apiGet<any>('/tenants/current'),
  });

  const { data: floors = [] } = useQuery({
    queryKey: ['floors'],
    queryFn: () => apiGet<any[]>('/tables/floors'),
  });

  const { data: tables = [], isLoading: isTablesLoading } = useQuery<Table[]>({
    queryKey: ['tables', tableStatusFilter],
    queryFn: () => apiGet(`/tables${tableStatusFilter ? `?status=${tableStatusFilter}` : ''}`),
    refetchInterval: 3000,
  });

  const { data: activeOrders = [] } = useQuery<any[]>({
    queryKey: ['active-orders'],
    queryFn: () => apiGet('/orders/active'),
    refetchInterval: 2000,
  });

  const { data: ordersData, isLoading: isOrdersLoading } = useQuery({
    queryKey: ['orders', orderStatusFilter, orderTypeFilter],
    queryFn: () => apiGet<{ orders: Order[]; total: number; page: number; limit: number }>(
      `/orders?${orderStatusFilter ? `status=${orderStatusFilter}&` : ''}${orderTypeFilter ? `type=${orderTypeFilter}&` : ''}limit=150`
    ),
    refetchInterval: 3000,
  });

  const { data: menuItems = [] } = useQuery<any[]>({
    queryKey: ['menu', 'items'],
    queryFn: () => apiGet<any[]>('/menu/items'),
  });

  const { data: tableOrdersData, isLoading: isTableOrdersLoading, refetch: refetchTableOrders } = useQuery({
    queryKey: ['table-orders-history', tableOrdersModalTable?.id, tableOrdersDate],
    queryFn: async () => {
      if (!tableOrdersModalTable) return [];
      const d = new Date(tableOrdersDate);
      const start = new Date(new Date(d).setHours(0, 0, 0, 0)).toISOString();
      const end = new Date(new Date(d).setHours(23, 59, 59, 999)).toISOString();
      const res = await apiGet<any>(`/orders?tableId=${tableOrdersModalTable.id}&from=${start}&to=${end}&limit=100`);
      return res?.data?.orders || res?.orders || [];
    },
    enabled: Boolean(tableOrdersModalTable),
    refetchInterval: 3000,
  });
  const tableOrdersHistory: any[] = tableOrdersData || [];

  const activeOrderByTableId = (activeOrders || []).reduce((acc: Record<string, any>, ord: any) => {
    if (ord.tableId && !['CANCELLED', 'VOIDED', 'COMPLETED', 'PAID'].includes(ord.status)) {
      acc[ord.tableId] = ord;
    }
    return acc;
  }, {});

  const orders = (ordersData?.orders || []).filter((o) =>
    !orderSearch ||
    o.orderNumber?.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.customer?.name?.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.table?.name?.toLowerCase().includes(orderSearch.toLowerCase())
  );

  // Generate QR image when QR modal opens
  useEffect(() => {
    if (qrModalTable) {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const suffix = (qrModalTable as any).qrUrlSuffix || ((qrModalTable as any).guestSessionToken ? `?session=${(qrModalTable as any).guestSessionToken}` : '');
      const qrUrl = `${origin}/order/${qrModalTable.qrCodeToken || qrModalTable.id}${suffix}`;
      QRCode.toDataURL(qrUrl, {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error('QR generation error', err));
    }
  }, [qrModalTable]);

  // ── Printing Logic (Strictly Disabled for Cancelled Orders & Pre-Serving) ────
  const handlePrintOrder = (order: any, isKot = false) => {
    if (!order) return;
    if (['CANCELLED', 'VOIDED'].includes(order.status)) {
      toast.error('Printing Disabled', 'KOT and bill printing is disabled for cancelled or voided orders.');
      return;
    }

    const isServedOrLater = ['SERVED', 'BILLED', 'PAID', 'PARTIALLY_PAID', 'COMPLETED'].includes(order.status);
    if (!isKot && !isServedOrLater) {
      setBillPreviewOrder(order);
      toast.info('Bill Preview Mode', 'This order has not been served yet. Showing pre-serving bill preview modal.');
      return;
    }

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
            .logo-img { width: 50px; height: 50px; border-radius: 50%; border: 2px solid #000; margin: 0 auto; object-fit: cover; display: block; }
          </style>
        </head>
        <body>
          ${isKot ? `
            ${tenant?.logoUrl ? `<div class="logo-header"><img src="${tenant.logoUrl}" class="logo-img" alt="Logo" /></div>` : ''}
            <div class="kot-box">*** KITCHEN ORDER TICKET (KOT) ***</div>
            <p class="center bold title">${order.table ? `TABLE: ${order.table.name}` : order.type}</p>
            <p class="center">Order #${order.orderNumber} · ${format(new Date(order.createdAt || Date.now()), 'dd MMM yyyy, h:mm a')}</p>
            <div class="divider"></div>
            <table>
              <thead>
                <tr>
                  <th style="width: 15%;">QTY</th>
                  <th style="width: 85%;">ITEM DESCRIPTION</th>
                </tr>
              </thead>
              <tbody>
                ${(order.items || [])
                  .filter((i: any) => !['CANCELLED', 'VOIDED'].includes(i.status))
                  .map((i: any) => `
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
              <div class="subtitle">${format(new Date(order.createdAt || Date.now()), 'dd MMM yyyy, h:mm a')}</div>
              ${order.customer?.name ? `<div class="subtitle">Guest: ${order.customer.name}</div>` : ''}
            </div>

            <div class="divider"></div>

            <table>
              <thead>
                <tr>
                  <th style="width: 45%;">Item</th>
                  <th style="width: 15%;" class="text-center">Qty</th>
                  <th style="width: 20%;" class="text-right">Rate</th>
                  <th style="width: 20%;" class="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${(order.items || [])
                  .filter((i: any) => !['CANCELLED', 'VOIDED'].includes(i.status))
                  .map((i: any) => {
                  const qty = Number(i.quantity || 1);
                  const rate = Number(i.unitPrice || i.variant?.price || 0);
                  const amt = Number(i.totalPrice || (qty * rate));
                  return `
                    <tr>
                      <td>
                        <div class="item-name">${i.menuItem?.name || i.name || 'Dish'}</div>
                        ${i.variant?.name ? `<div class="item-sub">${i.variant.name}</div>` : ''}
                      </td>
                      <td class="text-center bold">${qty}</td>
                      <td class="text-right font-mono">₹${rate.toFixed(2)}</td>
                      <td class="text-right font-mono bold">₹${amt.toFixed(2)}</td>
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

            ${Number(order.taxAmount || 0) > 0 ? `
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

  const speakOrder = (order: Order) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const text = `Order number ${order.orderNumber}. Table ${order.table?.name || order.type}. Status is ${ORDER_STATUS_CONFIG[order.status]?.label || order.status}. Total amount ${order.total} rupees.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  // ── Mutations ───────────────────────────────────────────────────────────────
  const updateStatus = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      apiPatch(`/orders/${orderId}/status`, { status }),
    onSuccess: (_, vars) => {
      toast.success('Status Updated', `Order changed to ${vars.status}`);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['active-orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['table-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      if (selectedOrder && selectedOrder.id === vars.orderId) {
        if (vars.status === 'PAID' || vars.status === 'COMPLETED') {
          setSelectedOrder((prev: any) => (prev ? { ...prev, status: vars.status } : null));
        } else {
          setSelectedOrder((prev: any) => (prev ? { ...prev, status: vars.status } : null));
        }
      }
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error?.message || err?.message || 'Could not update order status';
      toast.error('Update Failed', msg);
    },
  });

  const cancelOrderItemMutation = useMutation({
    mutationFn: ({ orderId, itemId, reason }: { orderId: string; itemId: string; reason?: string }) =>
      apiPost(`/orders/${orderId}/items/${itemId}/cancel`, { reason }),
    onSuccess: (res: any, vars) => {
      toast.success('Dish Cancelled', 'Item removed from bill & kitchen display.');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['active-orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['table-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      if (res?.data) {
        if (res.data.status === 'CANCELLED') {
          setSelectedOrder(null);
        } else {
          setSelectedOrder(res.data);
        }
      } else {
        setSelectedOrder((prev: any) => {
          if (!prev) return null;
          const updatedItems = (prev.items || []).filter((it: any) => it.id !== vars.itemId);
          return { ...prev, items: updatedItems };
        });
      }
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error?.message || err?.message || 'Could not cancel item';
      toast.error('Partial Cancel Failed', msg);
    },
  });

  const handleMarkAsPaidAndBill = (order: any) => {
    if (!order) return;
    const isServedOrLater = ['SERVED', 'BILLED', 'PAID', 'PARTIALLY_PAID', 'COMPLETED'].includes(order.status);
    if (!isServedOrLater) {
      toast.error(
        'Order Not Served Yet',
        'An order cannot be marked as paid until it is marked as SERVED in the Kitchen Display System.'
      );
      return;
    }
    updateStatus.mutate(
      { orderId: order.id, status: 'PAID' },
      {
        onSuccess: () => {
          toast.success('Order Settled & Paid', 'Generating tax invoice receipt.');
          handlePrintOrder({ ...order, status: 'PAID' }, false);
        },
      }
    );
  };

  const handleAdvanceStatus = (order: any, targetStatus: string) => {
    if (['DRAFT', 'CONFIRMED'].includes(order.status) || targetStatus === 'SENT_TO_KITCHEN') {
      const tableId = order.tableId || order.table?.id;
      if (tableId) {
        router.push(`/pos?table=${tableId}&orderId=${order.id}`);
      } else {
        router.push(`/pos?orderId=${order.id}`);
      }
      return;
    }
    updateStatus.mutate({ orderId: order.id, status: targetStatus });
  };

  const updateTableMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => apiPatch(`/tables/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['floors'] });
      queryClient.invalidateQueries({ queryKey: ['table-stats'] });
      queryClient.invalidateQueries({ queryKey: ['active-orders'] });
      toast.success('Table Updated', 'Seating status saved.');
      setEditingTable(null);
    },
    onError: (err: any) => toast.error('Update Failed', err.message || 'Could not update table.'),
  });

  const createTableMutation = useMutation({
    mutationFn: async (data: any) => apiPost('/tables', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['floors'] });
      toast.success('Table Added', 'New dining table ready.');
      setIsCreateModalOpen(false);
    },
    onError: (err: any) => toast.error('Creation Failed', err.message || 'Could not create table.'),
  });

  const deleteTableMutation = useMutation({
    mutationFn: async (id: string) => apiDelete(`/tables/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['floors'] });
      toast.success('Table Deleted');
      setEditingTable(null);
    },
    onError: (err: any) => toast.error('Delete Failed', err.message || 'Could not delete table.'),
  });

  const handleTableClick = (table: Table) => {
    if (table.status === 'OCCUPIED') {
      const activeOrder = activeOrderByTableId[table.id];
      if (activeOrder) {
        setSelectedOrder(activeOrder);
        return;
      }
      router.push(`/pos?table=${table.id}`);
    } else if (table.status === 'AVAILABLE') {
      router.push(`/pos?table=${table.id}`);
    } else {
      handleOpenEdit(table);
    }
  };

  const handleOpenEdit = (table: Table) => {
    setEditingTable(table);
    setTableNameInput(table.name);
    setTableCapacityInput(table.capacity);
    setTableShapeInput(table.shape || 'SQUARE');
    setTableStatusInput(table.status);
    setTableFloorIdInput(table.floorId || (floors[0] as any)?.id || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTable) return;
    updateTableMutation.mutate({
      id: editingTable.id,
      data: {
        name: tableNameInput,
        capacity: Number(tableCapacityInput),
        shape: tableShapeInput,
        status: tableStatusInput,
        floorId: tableFloorIdInput || null,
      },
    });
  };

  const handleSaveCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNameInput) return;
    createTableMutation.mutate({
      name: tableNameInput,
      capacity: Number(tableCapacityInput),
      shape: tableShapeInput,
      floorId: tableFloorIdInput || null,
      posX: 0,
      posY: 0,
    });
  };

  const handlePrintStandee = (table: Table, qrDataUrl: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Table Standee - ${table.name}</title>
          <style>
            @page { margin: 0; }
            body { font-family: sans-serif; margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f4f4f5; }
            .standee { width: 320px; border: 3px solid #000; border-radius: 24px; padding: 32px 24px; text-align: center; background: #fff; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
            .title { font-size: 26px; font-weight: 900; margin: 0 0 6px; }
            .subtitle { font-size: 13px; color: #555; margin: 0 0 20px; }
            .qr-box { padding: 12px; background: #fff; display: inline-block; }
            .qr-box img { width: 220px; height: 220px; }
            .instruction { font-size: 14px; font-weight: bold; margin-top: 18px; color: #111; }
            .tagline { font-size: 11px; color: #777; margin-top: 6px; }
            @media print { body { background: none; } .standee { border: 2px solid #000; box-shadow: none; } }
          </style>
        </head>
        <body>
          <div class="standee">
            ${tenant?.logoUrl ? `<div style="margin-bottom: 12px;"><img src="${tenant.logoUrl}" style="width: 50px; height: 50px; border-radius: 50%; border: 2px solid #000; object-fit: cover; display: inline-block;" alt="Logo" /></div>` : ''}
            <h1 class="title">${table.name}</h1>
            <p class="subtitle">Scan to View Digital Menu & Order</p>
            <div class="qr-box">
              <img src="${qrDataUrl}" alt="Table QR" />
            </div>
            <p class="instruction">📱 Point Camera at QR Code</p>
            <p class="tagline">Contactless Table Ordering</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  const handlePrintAllStandees = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const cardsHtml = await Promise.all(
      tables.map(async (t) => {
        const suffix = (t as any).qrUrlSuffix || ((t as any).guestSessionToken ? `?session=${(t as any).guestSessionToken}` : '');
        const url = `${origin}/order/${t.qrCodeToken || t.id}${suffix}`;
        const qrUrl = await QRCode.toDataURL(url, { width: 200, margin: 2 });
        return `
          <div class="standee">
            <h2>${t.name}</h2>
            <p class="sub">Scan for Menu &amp; Ordering</p>
            <img src="${qrUrl}" />
            <p class="foot">Point Camera at QR Code</p>
          </div>
        `;
      })
    );

    printWindow.document.write(`
      <html>
        <head>
          <title>All Table QR Standees Sheet</title>
          <style>
            body { font-family: sans-serif; padding: 20px; margin: 0; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
            .standee { border: 2px solid #000; border-radius: 16px; padding: 24px; text-align: center; page-break-inside: avoid; }
            h2 { margin: 0 0 4px; font-size: 22px; font-weight: 900; }
            .sub { font-size: 12px; color: #555; margin: 0 0 12px; }
            img { width: 180px; height: 180px; }
            .foot { font-size: 13px; font-weight: bold; margin: 12px 0 0; }
            @media print { .grid { grid-template-columns: repeat(2, 1fr); } }
          </style>
        </head>
        <body>
          <div class="grid">${cardsHtml.join('')}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 400);
  };

  const statusCounts = Object.entries(TABLE_STATUS_META).reduce((acc, [key]) => {
    acc[key] = tables.filter((t) => t.status === key).length;
    return acc;
  }, {} as Record<string, number>);

  const availableCount = statusCounts.AVAILABLE || 0;
  const occupiedCount = statusCounts.OCCUPIED || 0;

  return (
    <div className="space-y-8 animate-fade-in select-none pb-16">
      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION 1: DINING FLOOR & TABLE SEATING
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="space-y-5">
        {/* Top Banner & Quick Metrics */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-card via-card/80 to-muted/40 border border-border shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center font-bold text-lg">
                🍽️
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-foreground">Tables &amp; Orders Command Center</h1>
                <p className="text-xs text-muted-foreground font-medium">
                  {tables.length} Total Tables · {occupiedCount} Dining · {availableCount} Free
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintAllStandees}
              className="font-bold text-xs h-9 rounded-xl gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" /> Print All Standees
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setTableNameInput('');
                setTableCapacityInput(4);
                setTableShapeInput('SQUARE');
                setTableFloorIdInput((floors[0] as any)?.id || '');
                setIsCreateModalOpen(true);
              }}
              className="font-bold text-xs h-9 rounded-xl bg-primary text-primary-foreground gap-1.5 shadow-md"
            >
              <Plus className="w-4 h-4" /> Add Table
            </Button>
          </div>
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setTableStatusFilter(null)}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap',
              !tableStatusFilter
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-muted/70 text-muted-foreground hover:text-foreground'
            )}
          >
            All Tables ({tables.length})
          </button>
          {Object.entries(TABLE_STATUS_META).map(([key, meta]) => {
            const count = statusCounts[key] || 0;
            const isSelected = tableStatusFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTableStatusFilter(isSelected ? null : key)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap border',
                  isSelected
                    ? `${meta.bg} ${meta.text} ${meta.border} shadow-sm font-black`
                    : 'bg-card/50 text-muted-foreground border-border hover:text-foreground'
                )}
              >
                <span className={cn('w-2 h-2 rounded-full', meta.color)} />
                <span>{meta.shortLabel}</span>
                <span className="text-[10px] font-mono opacity-80">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tables.map((table) => {
            const meta = TABLE_STATUS_META[table.status] || TABLE_STATUS_META.AVAILABLE;
            const activeOrder = activeOrderByTableId[table.id];
            const kotProg = activeOrder ? getOrderKotProgress(activeOrder) : { total: 0, served: 0, allServed: false };
            const isServed = activeOrder ? ['SERVED', 'BILLED', 'PAID', 'PARTIALLY_PAID', 'COMPLETED'].includes(activeOrder.status) : false;
            const isCancelled = activeOrder ? ['CANCELLED', 'VOIDED'].includes(activeOrder.status) : false;
            const payCheck = activeOrder ? checkCanMarkPaid(activeOrder) : { canPay: false };
            const cancelCheck = activeOrder ? checkCanCancel(activeOrder) : { canCancel: false };
            const orderCfg = activeOrder ? (ORDER_STATUS_CONFIG[activeOrder.status] || ORDER_STATUS_CONFIG.DRAFT) : null;
            const validItems = activeOrder ? (activeOrder.items || []).filter((i: any) => !['CANCELLED', 'VOIDED'].includes(i.status)) : [];

            return (
              <div
                key={table.id}
                onClick={() => handleTableClick(table)}
                className={cn(
                  'group relative flex flex-col justify-between p-4 rounded-3xl border-2 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg hover:-translate-y-0.5 space-y-3',
                  meta.bg,
                  meta.border
                )}
              >
                {/* Header: Name + Capacity + Quick Icons */}
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-foreground group-hover:text-primary transition-colors">
                        {table.name}
                      </h3>
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border', meta.bg, meta.text, meta.border)}>
                        {meta.shortLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                      <Users className="w-3 h-3" /> {table.capacity} Seats
                    </p>
                  </div>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setQrModalTable(table)}
                      className="p-1.5 rounded-xl text-muted-foreground hover:text-primary hover:bg-muted/80 transition-colors cursor-pointer"
                      title="View & Print Table QR Standee"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(table)}
                      className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                      title="Edit Table Configuration"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Body: Active Order Details vs Available Placeholder */}
                {table.status === 'OCCUPIED' && activeOrder ? (
                  <div className="p-3 rounded-2xl bg-card border border-border/90 shadow-xs space-y-2.5">
                    {/* Order Number, Amount & Status */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-xs text-foreground">
                            #{activeOrder.orderNumber}
                          </span>
                          {orderCfg && (
                            <span className={cn('px-1.5 py-0.2 rounded-md text-[9px] font-black border', orderCfg.bg, orderCfg.text, orderCfg.border)}>
                              {orderCfg.emoji} {orderCfg.label}
                            </span>
                          )}
                        </div>
                        {kotProg.total > 0 && (
                          <span className={cn('text-[10px] font-bold block mt-0.5', kotProg.allServed ? 'text-teal-400' : 'text-amber-400')}>
                            🍳 {kotProg.served}/{kotProg.total} KOTs Served
                          </span>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-black text-sm text-primary block">
                          {formatCurrency(activeOrder.total)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {validItems.length} {validItems.length === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                    </div>

                    {/* Ordered Items Preview */}
                    <div className="max-h-24 overflow-y-auto space-y-1 divide-y divide-border/40 text-[11px] pr-1">
                      {validItems.map((it: any, idx: number) => (
                        <div key={it.id || idx} className="pt-1 flex items-center justify-between gap-1 text-muted-foreground">
                          <span className="truncate flex-1 font-medium text-foreground">
                            {it.quantity}x {it.menuItem?.name || it.name || 'Dish'}
                          </span>
                          <span className="font-mono text-[10px] shrink-0">
                            {formatCurrency(it.totalPrice || (it.quantity * (it.unitPrice || it.variant?.price || 0)))}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Table-Attached Direct Action Buttons */}
                    <div className="pt-2 border-t border-border/60 grid grid-cols-4 gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {/* 1. KOT Button */}
                      <button
                        type="button"
                        disabled={isCancelled}
                        onClick={() => handlePrintOrder(activeOrder, true)}
                        className={cn(
                          'h-8 rounded-xl border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 font-bold text-[10px] flex items-center justify-center gap-1 transition-colors cursor-pointer',
                          isCancelled && 'opacity-30 cursor-not-allowed'
                        )}
                        title="Print Kitchen Order Ticket (KOT)"
                      >
                        <span>🍳</span>
                        <span className="hidden sm:inline">KOT</span>
                      </button>

                      {/* 2. Print Bill Button */}
                      <button
                        type="button"
                        disabled={isCancelled}
                        onClick={() => {
                          if (isServed) {
                            handlePrintOrder(activeOrder, false);
                          } else {
                            setBillPreviewOrder(activeOrder);
                          }
                        }}
                        className={cn(
                          'h-8 rounded-xl border border-border text-foreground hover:bg-muted font-bold text-[10px] flex items-center justify-center gap-1 transition-colors cursor-pointer',
                          !isServed && 'text-amber-400 border-amber-500/30',
                          isCancelled && 'opacity-30 cursor-not-allowed'
                        )}
                        title={isServed ? 'Print Bill / Tax Invoice' : 'Preview Bill (Food in Kitchen)'}
                      >
                        <Printer className="w-3 h-3" />
                        <span className="hidden sm:inline">{isServed ? 'Bill' : 'Preview'}</span>
                      </button>

                      {/* 3. Mark Paid Button */}
                      <button
                        type="button"
                        disabled={!payCheck.canPay}
                        onClick={() => {
                          if (payCheck.canPay) {
                            handleMarkAsPaidAndBill(activeOrder);
                          }
                        }}
                        className={cn(
                          'h-8 rounded-xl font-bold text-[10px] flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-xs',
                          payCheck.canPay
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-muted/70 text-muted-foreground opacity-50 cursor-not-allowed'
                        )}
                        title={payCheck.reason || 'Mark as Paid & Done'}
                      >
                        <span>✅</span>
                        <span className="hidden sm:inline">Paid</span>
                      </button>

                      {/* 4. Cancel Button */}
                      <button
                        type="button"
                        disabled={!cancelCheck.canCancel}
                        onClick={() => {
                          if (cancelCheck.canCancel && confirm(`Cancel Order #${activeOrder.orderNumber}?`)) {
                            updateStatus.mutate({ orderId: activeOrder.id, status: 'CANCELLED' });
                          }
                        }}
                        className={cn(
                          'h-8 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 font-bold text-[10px] flex items-center justify-center gap-1 transition-colors cursor-pointer',
                          !cancelCheck.canCancel && 'opacity-30 cursor-not-allowed hover:bg-transparent'
                        )}
                        title={cancelCheck.canCancel ? 'Cancel Order' : cancelCheck.reason || 'Cannot cancel'}
                      >
                        <span>❌</span>
                        <span className="hidden sm:inline">Cancel</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 px-3 rounded-2xl bg-card/60 border border-dashed border-border flex flex-col items-center justify-center text-center space-y-1.5">
                    <span className="text-xl">🍽️</span>
                    <span className="text-xs font-bold text-muted-foreground">
                      Table is Free &amp; Available
                    </span>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/pos?table=${table.id}`);
                      }}
                      className="mt-1 h-8 px-3 rounded-xl text-xs font-bold gap-1 bg-primary text-primary-foreground shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Take Order (POS)
                    </Button>
                  </div>
                )}

                {/* Footer Controls: Orders Button & Quick Nav */}
                <div className="flex items-center justify-between pt-2 border-t border-border/60 text-[11px]" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => {
                      setTableOrdersModalTable(table);
                      setTableOrdersDate(format(new Date(), 'yyyy-MM-dd'));
                    }}
                    className="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-black text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-primary/20"
                    title={`View all orders for ${table.name} with calendar history`}
                  >
                    <span>📋</span>
                    <span>Orders History</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push(`/pos?table=${table.id}`)}
                    className="px-2.5 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    title="Open POS for Table"
                  >
                    <ShoppingCart className="w-3 h-3 text-primary" />
                    <span>POS</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {tables.length === 0 && !isTablesLoading && (
          <div className="rounded-3xl border-2 border-dashed border-border p-12 text-center">
            <Utensils className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
            <h3 className="text-sm font-bold text-foreground">No Tables Created</h3>
            <p className="text-xs text-muted-foreground mt-1">Tap "Add Table" above to create dining tables.</p>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION 2: LIVE ORDERS & BILLING COMMAND CENTER (MERGED DIRECTLY BELOW)
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="space-y-4 pt-4 border-t-2 border-border/80">
        {/* Orders Header & Search/Filter Controls */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-3xl bg-card border border-border shadow-sm">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center font-bold text-base">
                📋
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-foreground">Live Orders &amp; Billing Feed</h2>
                <p className="text-xs text-muted-foreground">
                  {orders.length} Orders Loaded · Live Socket Synchronization
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search order #, table, guest..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="pl-8 h-9 rounded-xl text-xs bg-background"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center border rounded-xl overflow-hidden bg-background p-0.5">
              <button
                type="button"
                onClick={() => setOrderViewMode('grid')}
                className={cn('p-1.5 rounded-lg transition-colors', orderViewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setOrderViewMode('table')}
                className={cn('p-1.5 rounded-lg transition-colors', orderViewMode === 'table' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
                title="Table View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Order Status & Type Filters */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 no-scrollbar flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setOrderStatusFilter(null)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer',
                !orderStatusFilter ? 'bg-foreground text-background shadow-xs font-black' : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              All Statuses
            </button>
            {['CONFIRMED', 'SENT_TO_KITCHEN', 'PREPARING', 'READY', 'PAID', 'CANCELLED'].map((st) => {
              const cfg = ORDER_STATUS_CONFIG[st];
              const isSelected = orderStatusFilter === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setOrderStatusFilter(isSelected ? null : st)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border flex items-center gap-1',
                    isSelected ? `${cfg.bg} ${cfg.text} ${cfg.border} font-black shadow-xs` : 'bg-card text-muted-foreground border-border hover:text-foreground'
                  )}
                >
                  <span>{cfg.emoji}</span>
                  <span>{cfg.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {['DINE_IN', 'TAKEAWAY', 'DELIVERY', 'QR_ORDER'].map((tp) => (
              <button
                key={tp}
                type="button"
                onClick={() => setOrderTypeFilter(orderTypeFilter === tp ? null : tp)}
                className={cn(
                  'px-2 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer border',
                  orderTypeFilter === tp ? 'bg-primary/20 text-primary border-primary/40' : 'bg-muted/40 text-muted-foreground border-border'
                )}
              >
                {tp.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Orders Listing Grid / Table */}
        {orderViewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {orders.map((order) => {
              const cfg = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.DRAFT;
              const isCancelled = ['CANCELLED', 'VOIDED'].includes(order.status);

              return (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={cn(
                    'flex flex-col justify-between p-4 rounded-3xl border-2 bg-card hover:border-primary/50 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md select-none',
                    cfg.border
                  )}
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-base text-foreground">
                            #{order.orderNumber}
                          </span>
                          <Badge className="font-black text-[10px] rounded-lg">
                            {order.table?.name ? `Table ${order.table.name}` : order.type}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {format(new Date(order.createdAt), 'h:mm a · dd MMM')}
                          {order.customer?.name && ` · ${order.customer.name}`}
                        </p>
                      </div>

                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border', cfg.bg, cfg.text, cfg.border)}>
                        <span>{cfg.emoji}</span>
                        <span>{cfg.label}</span>
                      </span>
                    </div>

                    {/* Dish Preview */}
                    <div className="p-2.5 rounded-2xl bg-muted/20 border border-border/50 text-xs space-y-1">
                      {(() => {
                        const activeItems = (order.items || []).filter((it: any) => !['CANCELLED', 'VOIDED'].includes(it.status));
                        return (
                          <>
                            {activeItems.length > 0 ? (
                              activeItems.slice(0, 3).map((it: any, idx: number) => (
                                <div key={idx} className="flex justify-between text-[11px] text-muted-foreground">
                                  <span className="truncate pr-2">
                                    <strong className="text-foreground">{it.quantity}x</strong> {it.menuItem?.name || it.name || 'Dish'}
                                  </span>
                                  <span className="font-mono shrink-0">
                                    {formatCurrency(it.totalPrice || (it.quantity * (it.unitPrice || it.variant?.price || 0)))}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <p className="text-muted-foreground text-[11px]">{order._count?.items || 0} items</p>
                            )}
                            {activeItems.length > 3 && (
                              <p className="text-[10px] text-muted-foreground italic font-medium">
                                + {activeItems.length - 3} more items...
                              </p>
                            )}
                          </>
                        );
                      })()}

                      {/* KOT Round Progress */}
                      {(() => {
                        const kotProg = getOrderKotProgress(order);
                        if (kotProg.total === 0) return null;
                        return (
                          <div className={cn(
                            'mt-2 pt-1.5 border-t border-border/40 flex items-center justify-between text-[10px] font-bold',
                            kotProg.allServed ? 'text-teal-400' : 'text-amber-400'
                          )}>
                            <span>🍳 Kitchen KOTs:</span>
                            <span>{kotProg.served}/{kotProg.total} Served {kotProg.allServed ? '✅' : '⏳'}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Footer & Quick Actions */}
                  <div className="pt-3 mt-3 border-t border-border flex items-center justify-between gap-2">
                    <div className="font-mono font-black text-sm text-foreground">
                      {formatCurrency(order.total)}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          speakOrder(order);
                        }}
                        className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
                        title="Voice Readout"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        disabled={isCancelled}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrintOrder(order, true);
                        }}
                        className={cn(
                          'p-1.5 rounded-xl border border-amber-500/30 text-amber-500 hover:bg-amber-500/10 text-xs font-bold',
                          isCancelled && 'opacity-30 cursor-not-allowed hover:bg-transparent'
                        )}
                        title={isCancelled ? 'Printing disabled for cancelled order' : 'Print KOT'}
                      >
                        🍳
                      </button>

                      {(() => {
                        const isServed = ['SERVED', 'BILLED', 'PAID', 'PARTIALLY_PAID', 'COMPLETED'].includes(order.status);
                        return (
                          <button
                            type="button"
                            disabled={isCancelled}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isServed) {
                                handlePrintOrder(order, false);
                              } else {
                                setBillPreviewOrder(order);
                              }
                            }}
                            className={cn(
                              'p-1.5 rounded-xl border border-border text-foreground hover:bg-muted text-xs font-bold',
                              isCancelled && 'opacity-30 cursor-not-allowed hover:bg-transparent',
                              !isServed && 'text-amber-500 border-amber-500/30'
                            )}
                            title={isCancelled ? 'Printing disabled for cancelled order' : isServed ? 'Print Bill' : 'Preview Bill (Food in Kitchen)'}
                          >
                            {isServed ? <Printer className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        );
                      })()}

                      {(() => {
                        const cancelCheck = checkCanCancel(order);
                        if (!cancelCheck.canCancel && ['PAID', 'COMPLETED', 'CANCELLED', 'VOIDED'].includes(order.status)) {
                          return null;
                        }
                        return (
                          <button
                            type="button"
                            disabled={!cancelCheck.canCancel}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!cancelCheck.canCancel) return;
                              if (confirm(`Are you sure you want to cancel Order #${order.orderNumber}?`)) {
                                updateStatus.mutate({ orderId: order.id, status: 'CANCELLED' });
                              }
                            }}
                            className={cn(
                              "p-1.5 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs font-bold transition-colors",
                              !cancelCheck.canCancel && "opacity-30 cursor-not-allowed hover:bg-transparent"
                            )}
                            title={cancelCheck.canCancel ? "Cancel Entire Order" : cancelCheck.reason || "Cannot cancel order"}
                          >
                            ❌
                          </button>
                        );
                      })()}

                      {/* Action Button: Staff can only Send Kitchen or Mark Paid when all KOTs are served */}
                      {(() => {
                        if (isCancelled || order.status === 'PAID' || order.status === 'COMPLETED') return null;

                        if (['DRAFT', 'CONFIRMED'].includes(order.status)) {
                          return (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAdvanceStatus(order, 'SENT_TO_KITCHEN');
                              }}
                              className="h-7 px-2.5 text-[10px] font-bold rounded-xl bg-primary text-primary-foreground ml-1"
                            >
                              {order.status === 'CONFIRMED' ? 'Verify & Send' : 'Send Kitchen'}
                            </Button>
                          );
                        }

                        if (['SENT_TO_KITCHEN', 'PREPARING', 'READY'].includes(order.status)) {
                          const kotProg = getOrderKotProgress(order);
                          return (
                            <span
                              title="Kitchen exclusive control: Line cooks must start cooking, finish, and mark SERVED on KDS."
                              className="px-2 py-1 rounded-xl text-[10px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1 cursor-default select-none ml-1"
                            >
                              <span>👨‍🍳</span>
                              <span>In Kitchen{kotProg.total > 0 ? ` (${kotProg.served}/${kotProg.total})` : ''}</span>
                            </span>
                          );
                        }

                        // For SERVED / BILLED / PARTIALLY_PAID — check if all KOTs (including running rounds) are served
                        const payCheck = checkCanMarkPaid(order);
                        return (
                          <Button
                            size="sm"
                            disabled={!payCheck.canPay}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (payCheck.canPay) {
                                handleMarkAsPaidAndBill(order);
                              }
                            }}
                            title={payCheck.reason || 'Mark as Paid & Generate Bill'}
                            className={cn(
                              'h-7 px-2.5 text-[10px] font-bold rounded-xl ml-1 transition-all',
                              payCheck.canPay
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                : 'bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-60'
                            )}
                          >
                            {payCheck.canPay ? 'Mark Paid & Bill' : 'Wait KOTs'}
                          </Button>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border border-border rounded-3xl overflow-hidden bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] font-bold border-b">
                  <tr>
                    <th className="p-3">Order #</th>
                    <th className="p-3">Table / Type</th>
                    <th className="p-3">Time</th>
                    <th className="p-3">Items</th>
                    <th className="p-3">Total</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orders.map((order) => {
                    const cfg = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.DRAFT;
                    const isCancelled = ['CANCELLED', 'VOIDED'].includes(order.status);
                    const isServed = ['SERVED', 'BILLED', 'PAID', 'PARTIALLY_PAID', 'COMPLETED'].includes(order.status);
                    const kotProg = getOrderKotProgress(order);

                    return (
                      <tr
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                      >
                        <td className="p-3 font-mono font-bold text-foreground">#{order.orderNumber}</td>
                        <td className="p-3 font-bold">{order.table?.name ? `Table ${order.table.name}` : order.type}</td>
                        <td className="p-3 text-muted-foreground">{format(new Date(order.createdAt), 'h:mm a')}</td>
                        <td className="p-3">
                          <div>
                            <span>{(order.items || []).filter((it: any) => !['CANCELLED', 'VOIDED'].includes(it.status)).length || order._count?.items || 1} items</span>
                            {kotProg.total > 0 && (
                              <span className={cn('block text-[10px] font-bold', kotProg.allServed ? 'text-teal-400' : 'text-amber-400')}>
                                🍳 {kotProg.served}/{kotProg.total} KOTs Served
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-mono font-black text-primary">{formatCurrency(order.total)}</td>
                        <td className="p-3">
                          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1', cfg.bg, cfg.text, cfg.border)}>
                            <span>{cfg.emoji}</span>
                            <span>{cfg.label}</span>
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              disabled={isCancelled}
                              onClick={() => handlePrintOrder(order, true)}
                              className={cn('p-1.5 rounded-lg border text-amber-500 hover:bg-amber-500/10', isCancelled && 'opacity-30 cursor-not-allowed')}
                              title="Print KOT"
                            >
                              🍳
                            </button>
                            <button
                              type="button"
                              disabled={isCancelled}
                              onClick={() => {
                                if (isServed) {
                                  handlePrintOrder(order, false);
                                } else {
                                  setBillPreviewOrder(order);
                                }
                              }}
                              className={cn(
                                'p-1.5 rounded-lg border text-foreground hover:bg-muted',
                                isCancelled && 'opacity-30 cursor-not-allowed',
                                !isServed && 'text-amber-500 border-amber-500/30'
                              )}
                              title={isCancelled ? 'Printing disabled for cancelled order' : isServed ? 'Print Bill' : 'Preview Bill (Food in Kitchen)'}
                            >
                              {isServed ? <Printer className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>

                            {(() => {
                              const cancelCheck = checkCanCancel(order);
                              if (!cancelCheck.canCancel && ['PAID', 'COMPLETED', 'CANCELLED', 'VOIDED'].includes(order.status)) {
                                return null;
                              }
                              return (
                                <button
                                  type="button"
                                  disabled={!cancelCheck.canCancel}
                                  onClick={() => {
                                    if (!cancelCheck.canCancel) return;
                                    if (confirm(`Are you sure you want to cancel Order #${order.orderNumber}?`)) {
                                      updateStatus.mutate({ orderId: order.id, status: 'CANCELLED' });
                                    }
                                  }}
                                  className={cn(
                                    "p-1.5 rounded-lg border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 transition-colors",
                                    !cancelCheck.canCancel && "opacity-30 cursor-not-allowed hover:bg-transparent"
                                  )}
                                  title={cancelCheck.canCancel ? "Cancel Entire Order" : cancelCheck.reason || "Cannot cancel order"}
                                >
                                  ❌
                                </button>
                              );
                            })()}

                            {/* Action Button */}
                            {(() => {
                              if (isCancelled || order.status === 'PAID' || order.status === 'COMPLETED') return null;

                              if (['DRAFT', 'CONFIRMED'].includes(order.status)) {
                                return (
                                  <Button
                                    size="sm"
                                    onClick={() => handleAdvanceStatus(order, 'SENT_TO_KITCHEN')}
                                    className="h-7 text-[10px] font-bold rounded-lg"
                                  >
                                    {order.status === 'CONFIRMED' ? 'Verify & Send' : 'Send Kitchen'}
                                  </Button>
                                );
                              }

                              if (['SENT_TO_KITCHEN', 'PREPARING', 'READY'].includes(order.status)) {
                                return (
                                  <span
                                    title="Controlled by Kitchen Staff on KDS"
                                    className="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 select-none"
                                  >
                                    👨‍🍳 Kitchen
                                  </span>
                                );
                              }

                              const payCheck = checkCanMarkPaid(order);
                              return (
                                <Button
                                  size="sm"
                                  disabled={!payCheck.canPay}
                                  onClick={() => {
                                    if (payCheck.canPay) {
                                      handleMarkAsPaidAndBill(order);
                                    }
                                  }}
                                  title={payCheck.reason || 'Mark as Paid'}
                                  className={cn(
                                    'h-7 text-[10px] font-bold rounded-lg',
                                    payCheck.canPay
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                      : 'bg-muted text-muted-foreground opacity-60'
                                  )}
                                >
                                  {payCheck.canPay ? 'Mark Paid' : 'Wait KOTs'}
                                </Button>
                              );
                            })()}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {orders.length === 0 && !isOrdersLoading && (
          <div className="rounded-3xl border-2 border-dashed border-border p-12 text-center">
            <Receipt className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
            <h3 className="text-sm font-bold text-foreground">No Orders Found</h3>
            <p className="text-xs text-muted-foreground mt-1">Orders created via POS or table QR scans will appear live here.</p>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL: VIEW ORDER DETAILS (SINGLE "MARK AS PAID" BUTTON + PRINTING OPTION)
      ───────────────────────────────────────────────────────────────────────────── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Top Restaurant Branding */}
            {tenant?.logoUrl && (
              <div className="flex justify-center pb-1">
                <div className="w-14 h-14 rounded-full border-2 border-primary/40 p-0.5 bg-card shadow-sm flex items-center justify-center overflow-hidden mx-auto">
                  <img
                    src={tenant.logoUrl}
                    alt={tenant.name || 'Logo'}
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
              </div>
            )}

            {/* Header */}
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-foreground font-mono">
                    #{selectedOrder.orderNumber}
                  </span>
                  <Badge className="text-xs font-bold bg-primary text-primary-foreground">
                    {selectedOrder.table?.name ? `Table ${selectedOrder.table.name}` : selectedOrder.type}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Ordered at {format(new Date(selectedOrder.createdAt || Date.now()), 'dd MMM yyyy, h:mm a')}
                  {selectedOrder.customer?.name && ` · ${selectedOrder.customer.name}`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Status & Quick Print Actions */}
            {(() => {
              const cfg = ORDER_STATUS_CONFIG[selectedOrder.status] || ORDER_STATUS_CONFIG.DRAFT;
              const isCancelled = ['CANCELLED', 'VOIDED'].includes(selectedOrder.status);
              const isServed = ['SERVED', 'BILLED', 'PAID', 'PARTIALLY_PAID', 'COMPLETED'].includes(selectedOrder.status);

              return (
                <div className={cn('p-3 rounded-2xl border flex items-center justify-between', cfg.bg, cfg.border)}>
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <span className="text-base">{cfg.emoji}</span>
                    <span className={cfg.text}>Status: <strong className="uppercase">{cfg.label}</strong></span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => speakOrder(selectedOrder)}
                      className="h-8 text-xs font-bold gap-1"
                    >
                      <Volume2 className="w-3.5 h-3.5" /> Read
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isCancelled}
                      onClick={() => handlePrintOrder(selectedOrder, true)}
                      className={cn(
                        'h-8 text-xs font-bold gap-1 border-amber-500/40 text-amber-500 hover:bg-amber-500/10',
                        isCancelled && 'opacity-30 cursor-not-allowed'
                      )}
                    >
                      🍳 KOT
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isCancelled}
                      onClick={() => {
                        if (isServed) {
                          handlePrintOrder(selectedOrder, false);
                        } else {
                          setBillPreviewOrder(selectedOrder);
                        }
                      }}
                      className={cn(
                        'h-8 text-xs font-bold gap-1 bg-background text-foreground',
                        isCancelled && 'opacity-30 cursor-not-allowed',
                        !isServed && 'text-amber-500 border-amber-500/30'
                      )}
                      title={!isServed ? 'Preview Bill (Physical printing locked until served)' : 'Print Bill'}
                    >
                      {isServed ? <Printer className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-amber-500" />}
                      {isServed ? 'Print Bill' : 'Preview Bill'}
                    </Button>
                  </div>
                </div>
              );
            })()}

            {/* Itemized Bill Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                <span>Dish Description</span>
                <span>Qty × Rate = Amount</span>
              </div>
              <div className="rounded-2xl border border-border divide-y divide-border bg-muted/20 overflow-hidden">
                {(() => {
                  const activeItems = (selectedOrder.items || []).filter((it: any) => !['CANCELLED', 'VOIDED'].includes(it.status));
                  if (activeItems.length === 0) {
                    return (
                      <div className="p-4 text-center text-xs text-muted-foreground">
                        No active billable items in order
                      </div>
                    );
                  }
                  const canPartiallyCancel = !['PAID', 'COMPLETED', 'CANCELLED', 'VOIDED'].includes(selectedOrder.status);

                  return activeItems.map((it: any, idx: number) => {
                    const unitPrice = Number(it.unitPrice || it.variant?.price || 0);
                    const qty = Number(it.quantity || 1);
                    const lineTotal = Number(it.totalPrice || (qty * unitPrice));
                    const foodType = it.menuItem?.foodType || 'VEG';
                    const dishName = it.menuItem?.name || it.name || 'Dish';

                    return (
                      <div key={it.id || idx} className="p-3 flex items-center justify-between text-sm gap-2 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <span className="text-xs mt-0.5 shrink-0">
                            {foodType === 'VEG' ? '🟢' : '🔴'}
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-foreground truncate">{dishName}</p>
                            {it.variant?.name && (
                              <p className="text-[11px] text-muted-foreground font-medium">Variant: {it.variant.name}</p>
                            )}
                            {it.notes && (
                              <p className="text-[10px] text-amber-500 italic">Note: {it.notes}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <div className="text-right">
                            <div className="font-bold font-mono text-foreground">
                              {formatCurrency(lineTotal)}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              {qty} × {formatCurrency(unitPrice)}
                            </div>
                          </div>

                          {canPartiallyCancel && it.id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={cancelOrderItemMutation.isPending}
                              className="h-7 w-7 p-0 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                const reason = prompt(`Cancel "${dishName}" from Order #${selectedOrder.orderNumber}? (Optional reason):`, 'Guest requested cancellation');
                                if (reason !== null) {
                                  cancelOrderItemMutation.mutate({
                                    orderId: selectedOrder.id,
                                    itemId: it.id,
                                    reason: reason.trim() || undefined,
                                  });
                                }
                              }}
                              title={`Partial Cancel "${dishName}"`}
                            >
                              <span className="text-xs">❌</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="rounded-2xl bg-card border border-border p-4 space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Subtotal:</span>
                <span className="font-mono">{formatCurrency(selectedOrder.subtotal || selectedOrder.total)}</span>
              </div>
              {Number(selectedOrder.taxAmount || 0) > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Taxes &amp; GST:</span>
                  <span className="font-mono">{formatCurrency(Number(selectedOrder.taxAmount || 0))}</span>
                </div>
              )}
              {!!selectedOrder.discountAmount && (
                <div className="flex justify-between text-xs text-emerald-500 font-medium">
                  <span>Discount:</span>
                  <span className="font-mono">-{formatCurrency(Number(selectedOrder.discountAmount || 0))}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-foreground pt-2 border-t border-border">
                <span>Total Amount:</span>
                <span className="font-mono text-primary text-lg">{formatCurrency(selectedOrder.total)}</span>
              </div>
            </div>

            {/* Unified Modal Actions: Single "Mark as Paid & Generate Bill" + POS & Cancel */}
            <div className="space-y-2 pt-1">
              {['DRAFT', 'CONFIRMED'].includes(selectedOrder.status) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const tableId = selectedOrder.tableId || selectedOrder.table?.id;
                    setSelectedOrder(null);
                    if (tableId) {
                      router.push(`/pos?table=${tableId}&orderId=${selectedOrder.id}`);
                    } else {
                      router.push(`/pos?orderId=${selectedOrder.id}`);
                    }
                  }}
                  className="w-full font-bold text-xs h-11 border-primary/40 text-primary hover:bg-primary/10 gap-1.5 rounded-2xl"
                >
                  🍳 Open in POS to Edit &amp; Send KOT
                </Button>
              )}

              {selectedOrder.status !== 'PAID' && selectedOrder.status !== 'COMPLETED' && selectedOrder.status !== 'CANCELLED' && (
                (() => {
                  const payCheck = checkCanMarkPaid(selectedOrder);
                  const kotProg = getOrderKotProgress(selectedOrder);
                  return (
                    <div className="space-y-1.5">
                      <Button
                        onClick={() => handleMarkAsPaidAndBill(selectedOrder)}
                        disabled={updateStatus.isPending || !payCheck.canPay}
                        className={cn(
                          'w-full font-black text-xs h-12 shadow-lg gap-2 text-sm rounded-2xl',
                          payCheck.canPay
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-75'
                        )}
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        {payCheck.canPay ? 'Mark as Paid & Generate Bill' : 'Mark as Paid (Locked: Food In Kitchen)'}
                      </Button>
                      {!payCheck.canPay && (
                        <p className="text-[11px] text-amber-500 text-center font-medium">
                          ⚠️ {payCheck.reason || 'Kitchen staff must mark all KOT tickets as SERVED on KDS before payment can be collected.'}
                        </p>
                      )}
                    </div>
                  );
                })()
              )}

              {(() => {
                const cancelCheck = checkCanCancel(selectedOrder);
                if (['CANCELLED', 'PAID', 'COMPLETED', 'VOIDED'].includes(selectedOrder.status)) return null;

                return (
                  <div className="w-full space-y-1">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (!cancelCheck.canCancel) return;
                        if (confirm(`Are you sure you want to cancel Order #${selectedOrder.orderNumber}?`)) {
                          updateStatus.mutate({ orderId: selectedOrder.id, status: 'CANCELLED' });
                          setSelectedOrder(null);
                        }
                      }}
                      disabled={!cancelCheck.canCancel || updateStatus.isPending}
                      className={cn(
                        "w-full font-bold text-xs h-10 border-rose-500/30 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 gap-1.5 rounded-2xl",
                        !cancelCheck.canCancel && "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-rose-500"
                      )}
                      title={cancelCheck.canCancel ? "Cancel Entire Order" : cancelCheck.reason}
                    >
                      ❌ Cancel Entire Order
                    </Button>
                    {!cancelCheck.canCancel && cancelCheck.reason && (
                      <p className="text-[11px] text-muted-foreground text-center">
                        ℹ️ {cancelCheck.reason}
                      </p>
                    )}
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-2 pt-1">
                {selectedOrder.tableId && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedOrder(null);
                      router.push(`/pos?table=${selectedOrder.tableId}&orderId=${selectedOrder.id}`);
                    }}
                    className="font-bold text-xs h-10 gap-1.5 rounded-xl"
                  >
                    <ShoppingCart className="w-4 h-4" /> Open in POS
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => setSelectedOrder(null)}
                  className="w-full font-bold text-xs h-10 ml-auto rounded-xl"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL: BILL PREVIEW (BEFORE SERVING)
      ───────────────────────────────────────────────────────────────────────────── */}
      {billPreviewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-card border-2 border-primary/30 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header with Circular Logo */}
            <div className="text-center space-y-2 border-b pb-4">
              {tenant?.logoUrl && (
                <div className="w-14 h-14 rounded-full border-2 border-primary/40 p-0.5 bg-card shadow-sm flex items-center justify-center overflow-hidden mx-auto">
                  <img
                    src={tenant.logoUrl}
                    alt={tenant.name || 'Logo'}
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
              )}
              <h3 className="text-lg font-black text-foreground">{tenant?.name || 'Restaurant Bill Preview'}</h3>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 font-bold text-xs">
                <Eye className="w-3.5 h-3.5" />
                <span>Pre-Serving Bill Preview</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Order <span className="font-mono font-bold text-foreground">#{billPreviewOrder.orderNumber}</span> • {billPreviewOrder.table ? `Table ${billPreviewOrder.table.name}` : billPreviewOrder.type}
              </p>
            </div>

            {/* Warning notice */}
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold text-amber-600 dark:text-amber-400">Order In Preparation ({billPreviewOrder.status})</p>
                <p className="text-[11px] opacity-90 leading-tight">
                  This is a live preview. Physical bill printing and payment settlement will be unlocked once this order is marked <strong>SERVED</strong> on the Kitchen Display System.
                </p>
              </div>
            </div>

            {/* Itemized List */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                <span>Item</span>
                <span>Qty × Rate = Amount</span>
              </div>
              <div className="rounded-2xl border divide-y bg-muted/20 overflow-hidden text-xs max-h-56 overflow-y-auto">
                {(() => {
                  const activeItems = (billPreviewOrder.items || []).filter((it: any) => !['CANCELLED', 'VOIDED'].includes(it.status));
                  if (activeItems.length === 0) {
                    return (
                      <div className="p-3 text-center text-xs text-muted-foreground">
                        No active billable items
                      </div>
                    );
                  }
                  return activeItems.map((it: any, idx: number) => {
                    const qty = Number(it.quantity || 1);
                    const rate = Number(it.unitPrice || it.variant?.price || 0);
                    const amt = Number(it.totalPrice || (qty * rate));
                    const foodType = it.menuItem?.foodType || 'VEG';

                    return (
                      <div key={idx} className="p-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                          <span className="text-xs shrink-0">{foodType === 'VEG' ? '🟢' : '🔴'}</span>
                          <div className="truncate">
                            <p className="font-bold text-foreground truncate">{it.menuItem?.name || it.name || 'Dish'}</p>
                            {it.variant?.name && <p className="text-[10px] text-muted-foreground">{it.variant.name}</p>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-foreground">{formatCurrency(amt)}</span>
                          <div className="text-[10px] text-muted-foreground font-mono">{qty} × {formatCurrency(rate)}</div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Summary */}
            <div className="p-3.5 rounded-2xl bg-card border space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal:</span>
                <span className="font-mono">{formatCurrency(billPreviewOrder.subtotal || billPreviewOrder.total)}</span>
              </div>
              {Number(billPreviewOrder.taxAmount || 0) > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Taxes &amp; GST:</span>
                  <span className="font-mono">{formatCurrency(Number(billPreviewOrder.taxAmount || 0))}</span>
                </div>
              )}
              {!!billPreviewOrder.discountAmount && (
                <div className="flex justify-between text-emerald-500">
                  <span>Discount:</span>
                  <span className="font-mono">-{formatCurrency(Number(billPreviewOrder.discountAmount || 0))}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm text-foreground pt-2 border-t">
                <span>Estimated Total:</span>
                <span className="font-mono text-primary text-base">{formatCurrency(billPreviewOrder.total)}</span>
              </div>
            </div>

            <Button
              onClick={() => setBillPreviewOrder(null)}
              className="w-full h-11 rounded-2xl font-bold text-xs"
            >
              Close Preview
            </Button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL: TABLE QR CODE STANDEE PREVIEW & PRINT
      ───────────────────────────────────────────────────────────────────────────── */}
      {qrModalTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-5 text-center">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-primary" />
                <h3 className="text-base font-black text-foreground">
                  {qrModalTable.name} QR Code
                </h3>
              </div>
              <button
                onClick={() => setQrModalTable(null)}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground font-bold"
              >
                ✕
              </button>
            </div>

            {/* Rendered Standee Preview Card */}
            <div className="p-5 rounded-2xl bg-white text-black border-2 border-zinc-900 shadow-lg space-y-3">
              {tenant?.logoUrl && (
                <div className="w-14 h-14 rounded-full border-2 border-zinc-900 p-0.5 bg-white shadow-sm flex items-center justify-center overflow-hidden mx-auto">
                  <img
                    src={tenant.logoUrl}
                    alt="Logo"
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
              )}
              <h2 className="text-2xl font-black">{qrModalTable.name}</h2>
              <p className="text-xs text-zinc-600 font-medium">Scan with Phone Camera to View Menu &amp; Order</p>

              <div className="p-2 bg-white inline-block rounded-xl shadow-inner">
                {qrCodeDataUrl ? (
                  <img src={qrCodeDataUrl} alt="Table QR" className="w-48 h-48 mx-auto" />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-xs text-zinc-400">
                    Generating QR...
                  </div>
                )}
              </div>

              <div className="text-[11px] font-bold text-zinc-800">
                Contactless Dining Order
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  const suffix = (qrModalTable as any).qrUrlSuffix || ((qrModalTable as any).guestSessionToken ? `?session=${(qrModalTable as any).guestSessionToken}` : '');
                  const url = `/order/${qrModalTable.qrCodeToken || qrModalTable.id}${suffix}`;
                  window.open(url, '_blank');
                }}
                className="flex-1 gap-1 text-xs font-bold"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Test Menu
              </Button>

              <Button
                onClick={() => handlePrintStandee(qrModalTable, qrCodeDataUrl)}
                className="flex-1 gap-1.5 text-xs font-bold bg-primary text-primary-foreground"
              >
                <Printer className="w-3.5 h-3.5" /> Print Standee
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL: EDIT / CREATE TABLE
      ───────────────────────────────────────────────────────────────────────────── */}
      {(editingTable || isCreateModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-black text-foreground">
                {editingTable ? `Edit ${editingTable.name}` : 'Add New Table'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingTable(null);
                  setIsCreateModalOpen(false);
                }}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={editingTable ? handleSaveEdit : handleSaveCreate} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-foreground">Table Name / Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Table 05, VIP 1"
                  value={tableNameInput}
                  onChange={(e) => setTableNameInput(e.target.value)}
                  className="w-full mt-1.5 h-11 px-3.5 rounded-xl border border-border bg-background text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground">Seating Capacity (Guests)</label>
                <div className="flex items-center gap-3 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setTableCapacityInput(Math.max(1, tableCapacityInput - 1))}
                    className="w-11 h-11 rounded-xl bg-muted border border-border text-lg font-black text-foreground hover:bg-muted/80 flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <div className="flex-1 text-center h-11 rounded-xl bg-background border border-border flex items-center justify-center text-base font-black text-foreground">
                    {tableCapacityInput} Persons
                  </div>
                  <button
                    type="button"
                    onClick={() => setTableCapacityInput(tableCapacityInput + 1)}
                    className="w-11 h-11 rounded-xl bg-primary text-primary-foreground text-lg font-black flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {editingTable && (
                <div>
                  <label className="text-xs font-bold text-foreground mb-2 block">Table Status</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { value: 'AVAILABLE', label: '🟢 Available', bg: 'hover:bg-emerald-500/10 hover:border-emerald-500/50', active: 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold shadow-xs' },
                      { value: 'OCCUPIED', label: '🔴 Occupied', bg: 'hover:bg-rose-500/10 hover:border-rose-500/50', active: 'bg-rose-500/20 border-rose-500 text-rose-400 font-bold shadow-xs' },
                      { value: 'RESERVED', label: '🔵 Reserved', bg: 'hover:bg-blue-500/10 hover:border-blue-500/50', active: 'bg-blue-500/20 border-blue-500 text-blue-400 font-bold shadow-xs' },
                      { value: 'CLEANING', label: '🟡 Cleaning', bg: 'hover:bg-amber-500/10 hover:border-amber-500/50', active: 'bg-amber-500/20 border-amber-500 text-amber-400 font-bold shadow-xs' },
                      { value: 'BLOCKED', label: '⚪ Blocked', bg: 'hover:bg-zinc-500/10 hover:border-zinc-500/50', active: 'bg-zinc-500/20 border-zinc-500 text-zinc-300 font-bold shadow-xs' },
                    ].map((st) => (
                      <button
                        key={st.value}
                        type="button"
                        onClick={() => setTableStatusInput(st.value as any)}
                        className={cn(
                          'px-3 py-2.5 rounded-xl border text-xs font-medium text-left transition-all flex items-center justify-between cursor-pointer',
                          tableStatusInput === st.value
                            ? st.active
                            : cn('border-border bg-card/60 text-muted-foreground', st.bg)
                        )}
                      >
                        <span>{st.label}</span>
                        {tableStatusInput === st.value && (
                          <Check className="w-3.5 h-3.5 text-foreground shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center gap-2 pt-3 border-t border-border">
                {editingTable && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteTableMutation.mutate(editingTable.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/15 text-xs font-bold"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                  </Button>
                )}
                <div className="flex gap-2 ml-auto">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingTable(null);
                      setIsCreateModalOpen(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                    Save Table
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL: TABLE ORDERS HISTORY (Date-Wise Calendar & Past Tickets)
      ───────────────────────────────────────────────────────────────────────────── */}
      {tableOrdersModalTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-5 my-auto max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📋</span>
                  <h3 className="text-lg font-black text-foreground">
                    {tableOrdersModalTable.name} — Orders Log
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono text-xs font-bold border border-primary/20">
                    Cap: {tableOrdersModalTable.capacity} Seats
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  View today's live &amp; historical orders or pick past dates from the calendar
                </p>
              </div>

              <button
                type="button"
                onClick={() => setTableOrdersModalTable(null)}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Date Picker & Quick Selectors */}
            <div className="p-3 rounded-2xl bg-muted/40 border border-border/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <span>📅</span> Date:
                </label>
                <input
                  type="date"
                  value={tableOrdersDate}
                  onChange={(e) => setTableOrdersDate(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-border bg-background text-xs font-mono font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTableOrdersDate(format(new Date(), 'yyyy-MM-dd'))}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border',
                    tableOrdersDate === format(new Date(), 'yyyy-MM-dd')
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-background text-muted-foreground hover:text-foreground border-border'
                  )}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const yest = new Date();
                    yest.setDate(yest.getDate() - 1);
                    setTableOrdersDate(format(yest, 'yyyy-MM-dd'));
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-background text-muted-foreground hover:text-foreground border border-border transition-colors cursor-pointer"
                >
                  Yesterday
                </button>
              </div>
            </div>

            {/* Orders Feed for this Table & Date */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  Orders ({tableOrdersHistory.length})
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {format(new Date(tableOrdersDate), 'dd MMMM yyyy')}
                </span>
              </div>

              {isTableOrdersLoading ? (
                <div className="py-12 text-center space-y-2">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-muted-foreground font-bold">Loading Table Orders...</p>
                </div>
              ) : tableOrdersHistory.length === 0 ? (
                <div className="py-12 text-center space-y-1.5 rounded-2xl bg-muted/20 border border-dashed border-border p-6">
                  <span className="text-2xl">🍽️</span>
                  <p className="text-sm font-bold text-foreground">No Orders Recorded</p>
                  <p className="text-xs text-muted-foreground">
                    No dining or POS orders were placed at {tableOrdersModalTable.name} on this date.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {tableOrdersHistory.map((ord: any) => {
                    const cfg = ORDER_STATUS_CONFIG[ord.status] || ORDER_STATUS_CONFIG.DRAFT;
                    const isServed = ['SERVED', 'BILLED', 'PAID', 'PARTIALLY_PAID', 'COMPLETED'].includes(ord.status);
                    const isCancelled = ['CANCELLED', 'VOIDED'].includes(ord.status);
                    const validItems = (ord.items || []).filter((i: any) => !['CANCELLED', 'VOIDED'].includes(i.status));

                    return (
                      <div
                        key={ord.id}
                        className="p-4 rounded-2xl border border-border bg-card space-y-3 shadow-xs hover:border-primary/40 transition-all"
                      >
                        <div className="flex items-center justify-between border-b border-border/60 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-sm text-foreground">
                              #{ord.orderNumber}
                            </span>
                            <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-black border', cfg.bg, cfg.text, cfg.border)}>
                              {cfg.emoji} {cfg.label}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="font-mono font-black text-sm text-primary">
                              {formatCurrency(ord.total)}
                            </span>
                            <span className="block text-[10px] text-muted-foreground">
                              {format(new Date(ord.createdAt), 'h:mm a')}
                            </span>
                          </div>
                        </div>

                        {/* Items list */}
                        <div className="space-y-1 text-xs">
                          {validItems.map((it: any, iIdx: number) => (
                            <div key={it.id || iIdx} className="flex justify-between text-muted-foreground">
                              <span className="truncate flex-1 font-medium text-foreground">
                                {it.quantity}x {it.menuItem?.name || it.name || 'Dish Item'}
                              </span>
                              <span className="font-mono text-[11px]">
                                {formatCurrency(it.totalPrice || (it.quantity * (it.unitPrice || it.variant?.price || 0)))}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Actions */}
                        <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground">
                            {validItems.length} {validItems.length === 1 ? 'item' : 'items'}
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handlePrintOrder(ord, true)}
                              className="px-2.5 py-1 rounded-lg border border-amber-500/30 text-amber-500 hover:bg-amber-500/10 text-xs font-bold flex items-center gap-1 cursor-pointer"
                              title="Print KOT"
                            >
                              <span>🍳</span> Print KOT
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (isServed) {
                                  handlePrintOrder(ord, false);
                                } else {
                                  setBillPreviewOrder(ord);
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg border border-border text-foreground hover:bg-muted text-xs font-bold flex items-center gap-1 cursor-pointer"
                              title="Print Bill Receipt"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>{isServed ? 'Print Bill' : 'Preview'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedOrder(ord)}
                              className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold flex items-center gap-1 cursor-pointer"
                              title="Open Full Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Details</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-border flex justify-end">
              <Button
                variant="outline"
                onClick={() => setTableOrdersModalTable(null)}
                className="rounded-xl text-xs font-bold"
              >
                Close Log
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
