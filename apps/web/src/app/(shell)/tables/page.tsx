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
  SENT_TO_KITCHEN: { label: 'In Kitchen',   emoji: '🍳', bg: 'bg-amber-500/10',   border: 'border-amber-500/30',    text: 'text-amber-500',        nextStatus: 'READY',           nextAction: 'Mark Ready' },
  PREPARING:       { label: 'Cooking',      emoji: '🔥', bg: 'bg-orange-500/10',  border: 'border-orange-500/30',   text: 'text-orange-500',       nextStatus: 'READY',           nextAction: 'Mark Ready' },
  READY:           { label: 'Ready to Pick',emoji: '🛎️', bg: 'bg-emerald-500/15', border: 'border-emerald-500/40',  text: 'text-emerald-500',      nextStatus: 'PAID',            nextAction: 'Mark as Paid' },
  SERVED:          { label: 'Served',       emoji: '🍽️', bg: 'bg-teal-500/10',    border: 'border-teal-500/30',     text: 'text-teal-500',         nextStatus: 'PAID',            nextAction: 'Mark as Paid' },
  BILLED:          { label: 'Billed',       emoji: '🧾', bg: 'bg-purple-500/15',  border: 'border-purple-500/40',   text: 'text-purple-500',       nextStatus: 'PAID',            nextAction: 'Mark as Paid' },
  PARTIALLY_PAID:  { label: 'Partial Paid', emoji: '⏳', bg: 'bg-indigo-500/10',  border: 'border-indigo-500/30',   text: 'text-indigo-500',       nextStatus: 'PAID',            nextAction: 'Settle Balance' },
  PAID:            { label: 'Paid & Done',  emoji: '✅', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30',  text: 'text-emerald-600' },
  COMPLETED:       { label: 'Finished',     emoji: '🏁', bg: 'bg-zinc-500/10',    border: 'border-zinc-500/30',     text: 'text-zinc-400' },
  CANCELLED:       { label: 'Cancelled',    emoji: '❌', bg: 'bg-rose-500/10',    border: 'border-rose-500/30',     text: 'text-rose-500' },
  VOIDED:          { label: 'Voided',       emoji: '🚫', bg: 'bg-rose-500/10',    border: 'border-rose-500/30',     text: 'text-rose-500' },
};

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

  // ── Orders State ────────────────────────────────────────────────────────────
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string | null>(null);
  const [orderTypeFilter, setOrderTypeFilter] = useState<string | null>(null);
  const [orderViewMode, setOrderViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedOrder, setSelectedOrder] = useState<Order | any | null>(null);
  const [verifyingOrder, setVerifyingOrder] = useState<Order | any | null>(null);
  const [editableItems, setEditableItems] = useState<any[]>([]);
  const [selectedAddDishId, setSelectedAddDishId] = useState<string>('');

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
    refetchInterval: 15000,
  });

  const { data: activeOrders = [] } = useQuery<any[]>({
    queryKey: ['active-orders'],
    queryFn: () => apiGet('/orders/active'),
    refetchInterval: 10000,
  });

  const { data: ordersData, isLoading: isOrdersLoading } = useQuery({
    queryKey: ['orders', orderStatusFilter, orderTypeFilter],
    queryFn: () => apiGet<{ orders: Order[]; total: number; page: number; limit: number }>(
      `/orders?${orderStatusFilter ? `status=${orderStatusFilter}&` : ''}${orderTypeFilter ? `type=${orderTypeFilter}&` : ''}limit=150`
    ),
    refetchInterval: 15000,
  });

  const { data: menuItems = [] } = useQuery<any[]>({
    queryKey: ['menu', 'items'],
    queryFn: () => apiGet<any[]>('/menu/items'),
  });

  const activeOrderByTableId = (activeOrders || []).reduce((acc: Record<string, any>, ord: any) => {
    if (ord.tableId) acc[ord.tableId] = ord;
    return acc;
  }, {});

  const orders = (ordersData?.orders || []).filter((o) =>
    !orderSearch ||
    o.orderNumber?.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.customer?.name?.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.table?.name?.toLowerCase().includes(orderSearch.toLowerCase())
  );

  // Sync editable items when verifyingOrder modal opens
  useEffect(() => {
    if (verifyingOrder) {
      setEditableItems(
        (verifyingOrder.items || []).map((it: any) => ({
          ...it,
          menuItemId: it.menuItemId || it.menuItem?.id,
          variantId: it.variantId || it.variant?.id,
          name: it.menuItem?.name || it.name || 'Dish',
          unitPrice: Number(it.unitPrice || it.variant?.price || 0),
          quantity: Number(it.quantity || 1),
          notes: it.notes || '',
        }))
      );
      setSelectedAddDishId('');
    }
  }, [verifyingOrder]);

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

  // ── Printing Logic (Strictly Disabled for Cancelled Orders) ─────────────────
  const handlePrintOrder = (order: any, isKot = false) => {
    if (['CANCELLED', 'VOIDED'].includes(order.status)) {
      toast.error('Printing Disabled', 'KOT and bill printing is disabled for cancelled or voided orders.');
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
            .logo-img { max-height: 55px; max-width: 140px; margin: 0 auto; object-fit: contain; display: block; }
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
                ${(order.items || []).map((i: any) => `
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
                ${(order.items || []).map((i: any) => {
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

  const handleMarkAsPaidAndBill = (order: any) => {
    if (!order) return;
    updateStatus.mutate(
      { orderId: order.id, status: 'PAID' },
      {
        onSuccess: () => {
          toast.success('Order Settled & Paid', 'Generating tax invoice receipt.');
          handlePrintOrder(order, false);
        },
      }
    );
  };

  const updateOrderItemsMutation = useMutation({
    mutationFn: ({ orderId, items, sendToKitchen }: { orderId: string; items: any[]; sendToKitchen?: boolean }) =>
      apiPut(`/orders/${orderId}/items`, {
        items: items.map((i) => ({
          menuItemId: i.menuItemId || i.id,
          variantId: i.variantId,
          quantity: i.quantity || 1,
          notes: i.notes,
        })),
        sendToKitchen,
      }),
    onSuccess: (_, vars) => {
      toast.success(
        vars.sendToKitchen ? 'Order Sent to Kitchen' : 'Order Updated',
        vars.sendToKitchen ? 'Dispatched to kitchen stations & KOT generated.' : 'Order items updated.'
      );
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['active-orders'] });
      queryClient.invalidateQueries({ queryKey: ['kds-kots'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      setVerifyingOrder(null);
    },
    onError: (err: any) => toast.error('Update Failed', err.message || 'Could not update order items'),
  });

  const handleAdvanceStatus = (order: any, targetStatus: string) => {
    if (targetStatus === 'SENT_TO_KITCHEN' && ['DRAFT', 'CONFIRMED'].includes(order.status)) {
      setVerifyingOrder(order);
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
          {tables.map((table) => {
            const meta = TABLE_STATUS_META[table.status] || TABLE_STATUS_META.AVAILABLE;
            const activeOrder = activeOrderByTableId[table.id];

            return (
              <div
                key={table.id}
                onClick={() => handleTableClick(table)}
                className={cn(
                  'group relative flex flex-col justify-between p-4 rounded-3xl border-2 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg hover:-translate-y-0.5',
                  meta.bg,
                  meta.border
                )}
              >
                {/* Header: Name + Capacity */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-black text-foreground group-hover:text-primary transition-colors">
                      {table.name}
                    </h3>
                    <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 mt-0.5">
                      <Users className="w-3 h-3" /> {table.capacity} Seats
                    </p>
                  </div>

                  <span className={cn('w-3 h-3 rounded-full shrink-0 shadow-xs', meta.color)} />
                </div>

                {/* Body / Active Running Order details */}
                <div className="my-3 space-y-1">
                  {table.status === 'OCCUPIED' && activeOrder ? (
                    <div className="p-2 rounded-xl bg-background/80 border border-border/80 shadow-xs space-y-0.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono font-bold text-foreground">#{activeOrder.orderNumber}</span>
                        <span className="font-mono font-black text-primary">{formatCurrency(activeOrder.total)}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {activeOrder.items?.length || 1} items · {ORDER_STATUS_CONFIG[activeOrder.status]?.label || activeOrder.status}
                      </p>
                    </div>
                  ) : (
                    <div className="h-9 flex items-center justify-center text-[11px] font-bold text-muted-foreground/80 border border-dashed border-border/60 rounded-xl">
                      {meta.shortLabel}
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px]">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setQrModalTable(table);
                    }}
                    className="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                    title="View & Print QR Code"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEdit(table);
                    }}
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Edit Table"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
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
                      {order.items && order.items.length > 0 ? (
                        order.items.slice(0, 3).map((it: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-[11px] text-muted-foreground">
                            <span className="truncate pr-2">
                              <strong className="text-foreground">{it.quantity}x</strong> {it.menuItem?.name || it.name || 'Dish'}
                            </span>
                            <span className="font-mono shrink-0">
                              {formatCurrency(it.totalPrice || (it.quantity * it.unitPrice))}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-[11px]">{order._count?.items || 1} items</p>
                      )}
                      {(order.items?.length || 0) > 3 && (
                        <p className="text-[10px] text-muted-foreground italic font-medium">
                          + {(order.items?.length || 0) - 3} more items...
                        </p>
                      )}
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

                      <button
                        type="button"
                        disabled={isCancelled}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrintOrder(order, false);
                        }}
                        className={cn(
                          'p-1.5 rounded-xl border border-border text-foreground hover:bg-muted text-xs font-bold',
                          isCancelled && 'opacity-30 cursor-not-allowed hover:bg-transparent'
                        )}
                        title={isCancelled ? 'Printing disabled for cancelled order' : 'Print Bill'}
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>

                      {cfg.nextStatus && !isCancelled && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (cfg.nextStatus === 'PAID') {
                              handleMarkAsPaidAndBill(order);
                            } else {
                              handleAdvanceStatus(order, cfg.nextStatus!);
                            }
                          }}
                          className="h-7 px-2.5 text-[10px] font-bold rounded-xl bg-primary text-primary-foreground ml-1"
                        >
                          {cfg.nextAction || 'Next'}
                        </Button>
                      )}
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

                    return (
                      <tr
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                      >
                        <td className="p-3 font-mono font-bold text-foreground">#{order.orderNumber}</td>
                        <td className="p-3 font-bold">{order.table?.name ? `Table ${order.table.name}` : order.type}</td>
                        <td className="p-3 text-muted-foreground">{format(new Date(order.createdAt), 'h:mm a')}</td>
                        <td className="p-3">{order.items?.length || order._count?.items || 1} items</td>
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
                              onClick={() => handlePrintOrder(order, false)}
                              className={cn('p-1.5 rounded-lg border text-foreground hover:bg-muted', isCancelled && 'opacity-30 cursor-not-allowed')}
                              title="Print Bill"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            {cfg.nextStatus && !isCancelled && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  if (cfg.nextStatus === 'PAID') {
                                    handleMarkAsPaidAndBill(order);
                                  } else {
                                    handleAdvanceStatus(order, cfg.nextStatus!);
                                  }
                                }}
                                className="h-7 text-[10px] font-bold rounded-lg"
                              >
                                {cfg.nextAction || 'Advance'}
                              </Button>
                            )}
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
                <img
                  src={tenant.logoUrl}
                  alt={tenant.name || 'Logo'}
                  className="max-h-14 max-w-[150px] object-contain mx-auto"
                />
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
                      onClick={() => handlePrintOrder(selectedOrder, false)}
                      className={cn(
                        'h-8 text-xs font-bold gap-1 bg-background text-foreground',
                        isCancelled && 'opacity-30 cursor-not-allowed'
                      )}
                    >
                      <Printer className="w-3.5 h-3.5" /> Print Bill
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
                {selectedOrder.items && selectedOrder.items.length > 0 ? (
                  selectedOrder.items.map((it: any, idx: number) => {
                    const unitPrice = Number(it.unitPrice || it.variant?.price || 0);
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

            {/* Unified Modal Actions: Single "Mark as Paid & Generate Bill" */}
            <div className="space-y-2 pt-1">
              {['DRAFT', 'CONFIRMED'].includes(selectedOrder.status) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setVerifyingOrder(selectedOrder);
                  }}
                  className="w-full font-bold text-xs h-10 border-amber-500/40 text-amber-500 hover:bg-amber-500/10 gap-1.5"
                >
                  🍳 Edit Dishes &amp; Send to Kitchen
                </Button>
              )}

              {selectedOrder.status !== 'PAID' && selectedOrder.status !== 'COMPLETED' && selectedOrder.status !== 'CANCELLED' && (
                <Button
                  onClick={() => handleMarkAsPaidAndBill(selectedOrder)}
                  disabled={updateStatus.isPending}
                  className="w-full font-black text-xs h-12 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg gap-2 text-sm"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Mark as Paid &amp; Generate Bill
                </Button>
              )}

              <div className="grid grid-cols-2 gap-2">
                {selectedOrder.tableId && (
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/pos?table=${selectedOrder.tableId}`)}
                    className="font-bold text-xs h-10 gap-1.5"
                  >
                    <ShoppingCart className="w-4 h-4" /> Open in POS
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => setSelectedOrder(null)}
                  className="w-full font-bold text-xs h-10 ml-auto"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL: PHYSICAL PRESENCE & ORDER MODIFICATION (BEFORE KITCHEN DISPATCH)
      ───────────────────────────────────────────────────────────────────────────── */}
      {verifyingOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border-2 border-primary/40 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-2 border-b">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center text-xl font-bold shadow-inner">
                  🍳
                </div>
                <div>
                  <h3 className="text-lg font-black text-foreground">Review &amp; Edit Order</h3>
                  <p className="text-xs text-muted-foreground">
                    Order <span className="font-mono font-bold text-foreground">#{verifyingOrder.orderNumber}</span> • <strong className="text-foreground">{verifyingOrder.table ? `Table ${verifyingOrder.table.name}` : 'Dine-In Table'}</strong>
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVerifyingOrder(null)}
                className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground"
              >
                ✕
              </Button>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1 text-amber-900 dark:text-amber-200">
              <p className="font-bold flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Staff Order Customization &amp; Presence Verification
              </p>
              <p className="text-[11px] leading-relaxed opacity-90">
                Verify guest presence at <strong>{verifyingOrder.table?.name || 'the table'}</strong>. You can modify quantities, delete, or add extra dishes before sending the order to kitchen stations.
              </p>
            </div>

            {/* Editable Items List */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                <span>Ordered Dishes ({editableItems.length})</span>
                <span>Qty &amp; Total</span>
              </div>

              <div className="border rounded-2xl divide-y bg-muted/10 max-h-56 overflow-y-auto">
                {editableItems.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-xs font-medium">
                    No items in order. Please add dishes below or cancel.
                  </div>
                ) : (
                  editableItems.map((it, idx) => {
                    const lineTotal = (Number(it.unitPrice) || 0) * (Number(it.quantity) || 1);
                    return (
                      <div key={idx} className="p-3 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs text-foreground truncate">{it.name || it.menuItem?.name || 'Dish'}</p>
                          {it.variant?.name && <p className="text-[10px] text-muted-foreground">Variant: {it.variant.name}</p>}
                          <p className="text-[11px] font-mono text-muted-foreground">
                            {formatCurrency(it.unitPrice)} each
                          </p>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center border rounded-xl bg-background/80 shadow-xs overflow-hidden">
                            <button
                              type="button"
                              onClick={() => {
                                setEditableItems((prev) =>
                                  prev
                                    .map((item, i) => (i === idx ? { ...item, quantity: (item.quantity || 1) - 1 } : item))
                                    .filter((item) => item.quantity > 0)
                                );
                              }}
                              className="px-2.5 py-1 text-xs hover:bg-muted font-bold text-muted-foreground transition-colors"
                            >
                              -
                            </button>
                            <span className="px-2 font-mono font-bold text-xs">{it.quantity}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditableItems((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, quantity: (item.quantity || 1) + 1 } : item))
                                );
                              }}
                              className="px-2.5 py-1 text-xs hover:bg-muted font-bold text-muted-foreground transition-colors"
                            >
                              +
                            </button>
                          </div>

                          <span className="w-16 text-right font-mono font-bold text-xs text-foreground">
                            {formatCurrency(lineTotal)}
                          </span>

                          <button
                            type="button"
                            onClick={() => setEditableItems((prev) => prev.filter((_, i) => i !== idx))}
                            className="p-1.5 rounded-lg text-rose-500/70 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Add New Dish to Order */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Add Dish to this Order:
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedAddDishId}
                  onChange={(e) => setSelectedAddDishId(e.target.value)}
                  className="flex-1 h-10 px-3 rounded-xl border bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- Select a dish from menu --</option>
                  {menuItems.map((mi: any) => (
                    <option key={mi.id} value={mi.id}>
                      {mi.name} ({formatCurrency(mi.basePrice || mi.price || 0)})
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (!selectedAddDishId) return;
                    const item = menuItems.find((m: any) => m.id === selectedAddDishId);
                    if (!item) return;
                    const existingIndex = editableItems.findIndex((it) => (it.menuItemId || it.id) === item.id && !it.variantId);
                    if (existingIndex >= 0) {
                      setEditableItems((prev) =>
                        prev.map((it, idx) => (idx === existingIndex ? { ...it, quantity: (it.quantity || 1) + 1 } : it))
                      );
                    } else {
                      setEditableItems((prev) => [
                        ...prev,
                        {
                          menuItemId: item.id,
                          name: item.name,
                          unitPrice: Number(item.basePrice || item.price || 0),
                          quantity: 1,
                          notes: '',
                        },
                      ]);
                    }
                    setSelectedAddDishId('');
                  }}
                  disabled={!selectedAddDishId}
                  className="h-10 px-4 text-xs font-bold rounded-xl shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add
                </Button>
              </div>
            </div>

            {/* Order Summary Calculations */}
            {(() => {
              const subtotal = editableItems.reduce(
                (acc, it) => acc + (Number(it.unitPrice) || 0) * (Number(it.quantity) || 1),
                0
              );
              const taxRate = tenant?.taxRate !== undefined && tenant?.taxRate !== null ? Number(tenant.taxRate) : 5;
              const taxAmount = taxRate > 0 ? (subtotal * taxRate) / 100 : 0;
              const grandTotal = subtotal + taxAmount;

              return (
                <div className="p-3.5 rounded-2xl bg-muted/30 border space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal:</span>
                    <span className="font-mono font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  {taxRate > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>GST ({taxRate}%):</span>
                      <span className="font-mono font-medium">{formatCurrency(taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t font-black text-sm text-foreground">
                    <span>New Total:</span>
                    <span className="font-mono text-primary text-base">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              );
            })()}

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  updateStatus.mutate({ orderId: verifyingOrder.id, status: 'CANCELLED' });
                  setVerifyingOrder(null);
                }}
                disabled={updateStatus.isPending || updateOrderItemsMutation.isPending}
                className="h-11 rounded-xl text-rose-500 border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-600 font-bold text-xs order-3 sm:order-1"
              >
                ❌ Cancel Order
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  if (editableItems.length === 0) {
                    toast.error('Empty Order', 'Please add at least one dish');
                    return;
                  }
                  updateOrderItemsMutation.mutate({
                    orderId: verifyingOrder.id,
                    items: editableItems,
                    sendToKitchen: false,
                  });
                }}
                disabled={updateOrderItemsMutation.isPending || editableItems.length === 0}
                className="h-11 rounded-xl border-primary/40 text-primary hover:bg-primary/10 font-bold text-xs order-2"
              >
                💾 Save Edits
              </Button>

              <Button
                onClick={() => {
                  if (editableItems.length === 0) {
                    toast.error('Empty Order', 'Please add at least one dish');
                    return;
                  }
                  updateOrderItemsMutation.mutate({
                    orderId: verifyingOrder.id,
                    items: editableItems,
                    sendToKitchen: true,
                  });
                }}
                disabled={updateOrderItemsMutation.isPending || editableItems.length === 0}
                className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md order-1 sm:order-3"
              >
                🍳 Send to Kitchen
              </Button>
            </div>
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
                  <label className="text-xs font-bold text-foreground">Current Status</label>
                  <select
                    value={tableStatusInput}
                    onChange={(e) => setTableStatusInput(e.target.value as any)}
                    className="w-full mt-1.5 h-11 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none"
                  >
                    <option value="AVAILABLE">🟢 Available / Free</option>
                    <option value="OCCUPIED">🔴 Dining / Occupied</option>
                    <option value="RESERVED">🔵 Reserved</option>
                    <option value="CLEANING">🟡 Needs Cleaning</option>
                    <option value="BLOCKED">⚪ Blocked / Out of Service</option>
                  </select>
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
    </div>
  );
}
