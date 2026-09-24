'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Grid3X3, List, Plus, Users, Clock, CircleCheck, CircleDot,
  Wrench, Ban, Edit3, Trash2, X, Check, QrCode, ShoppingCart,
  Utensils, DollarSign, CheckCircle2, AlertCircle, Sparkles, ArrowRight,
  Printer, Download, Eye, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
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

const STATUS_META = {
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

export default function TablesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Edit / Create Table Modal State
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [tableNameInput, setTableNameInput] = useState('');
  const [tableCapacityInput, setTableCapacityInput] = useState<number>(4);
  const [tableShapeInput, setTableShapeInput] = useState<'RECTANGLE' | 'CIRCLE' | 'SQUARE'>('SQUARE');
  const [tableStatusInput, setTableStatusInput] = useState<Table['status']>('AVAILABLE');
  const [tableFloorIdInput, setTableFloorIdInput] = useState<string>('');

  // QR Modal State
  const [qrModalTable, setQrModalTable] = useState<Table | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // POS Bill Modal State for Occupied Tables
  const [billModalOrder, setBillModalOrder] = useState<any | null>(null);
  const [billModalTable, setBillModalTable] = useState<Table | null>(null);

  const { data: floors = [] } = useQuery({
    queryKey: ['floors'],
    queryFn: () => apiGet<any[]>('/tables/floors'),
  });

  const { data: tables = [], isLoading } = useQuery<Table[]>({
    queryKey: ['tables', statusFilter],
    queryFn: () => apiGet(`/tables${statusFilter ? `?status=${statusFilter}` : ''}`),
    refetchInterval: 15000,
  });

  // Fetch current tenant for branding and logo
  const { data: tenant } = useQuery({
    queryKey: ['current-tenant'],
    queryFn: () => apiGet<any>('/tenants/current'),
  });

  // Fetch active running orders to link with occupied tables
  const { data: activeOrders = [] } = useQuery<any[]>({
    queryKey: ['active-orders'],
    queryFn: () => apiGet('/orders/active'),
    refetchInterval: 10000,
  });

  const activeOrderByTableId = (activeOrders || []).reduce((acc: Record<string, any>, ord: any) => {
    if (ord.tableId) acc[ord.tableId] = ord;
    return acc;
  }, {});

  const handlePrintPOSBill = (order: any, isKot = false) => {
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
            <p class="center bold title">${order.table ? `TABLE: ${order.table.name}` : billModalTable ? `TABLE: ${billModalTable.name}` : order.type}</p>
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
              <div class="subtitle">${order.table ? `Table: ${order.table.name}` : billModalTable ? `Table: ${billModalTable.name}` : `Type: ${order.type}`}</div>
              <div class="subtitle">${format(new Date(order.createdAt || Date.now()), 'dd MMM yyyy, h:mm a')}</div>
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
                ${(order.items || []).map((i: any) => {
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

  const updateOrderStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      apiPatch(`/orders/${orderId}/status`, { status }),
    onSuccess: (_, vars) => {
      toast.success('Status Updated', `Order changed to ${vars.status}`);
      queryClient.invalidateQueries({ queryKey: ['active-orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      if (vars.status === 'PAID' || vars.status === 'COMPLETED') {
        setBillModalOrder(null);
        setBillModalTable(null);
      } else if (billModalOrder) {
        setBillModalOrder((prev: any) => prev ? { ...prev, status: vars.status } : null);
      }
    },
    onError: () => toast.error('Update Failed', 'Could not update order status'),
  });

  // Generate QR image when QR modal opens
  useEffect(() => {
    if (qrModalTable) {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const qrUrl = `${origin}/order/${qrModalTable.qrCodeToken || qrModalTable.id}`;
      QRCode.toDataURL(qrUrl, {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error('QR generation error', err));
    }
  }, [qrModalTable]);

  // Mutations
  const updateTableMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiPatch(`/tables/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['floors'] });
      queryClient.invalidateQueries({ queryKey: ['table-stats'] });
      queryClient.invalidateQueries({ queryKey: ['active-orders'] });
      toast.success('Table Updated', 'Seating status saved.');
      setEditingTable(null);
    },
    onError: (err: any) => {
      toast.error('Update Failed', err.message || 'Could not update table.');
    },
  });

  const createTableMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiPost('/tables', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['floors'] });
      toast.success('Table Added', 'New dining table ready.');
      setIsCreateModalOpen(false);
    },
    onError: (err: any) => {
      toast.error('Creation Failed', err.message || 'Could not create table.');
    },
  });

  const deleteTableMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiDelete(`/tables/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['floors'] });
      toast.success('Table Deleted');
      setEditingTable(null);
    },
    onError: (err: any) => {
      toast.error('Delete Failed', err.message || 'Could not delete table.');
    },
  });

  const handleTableClick = (table: Table) => {
    if (table.status === 'OCCUPIED') {
      const activeOrder = activeOrderByTableId[table.id];
      if (activeOrder) {
        setBillModalOrder(activeOrder);
        setBillModalTable(table);
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
        name: tableNameInput.trim(),
        capacity: Number(tableCapacityInput) || 4,
        shape: tableShapeInput,
        status: tableStatusInput,
        floorId: tableFloorIdInput || undefined,
      },
    });
  };

  const handleOpenCreate = () => {
    setTableNameInput(`Table ${tables.length + 1}`);
    setTableCapacityInput(4);
    setTableShapeInput('SQUARE');
    setTableStatusInput('AVAILABLE');
    setTableFloorIdInput((floors[0] as any)?.id || '');
    setIsCreateModalOpen(true);
  };

  const handleSaveCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createTableMutation.mutate({
      name: tableNameInput.trim(),
      capacity: Number(tableCapacityInput) || 4,
      shape: tableShapeInput,
      floorId: tableFloorIdInput || undefined,
    });
  };

  const handleQuickStatusToggle = (table: Table, nextStatus: Table['status'], e: React.MouseEvent) => {
    e.stopPropagation();
    updateTableMutation.mutate({
      id: table.id,
      data: { status: nextStatus },
    });
  };

  const handlePrintStandee = (table: Table, qrDataUrl: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const orderUrl = `${origin}/order/${table.qrCodeToken || table.id}`;

    printWindow.document.write(`
      <html>
        <head>
          <title>QR Standee - ${table.name}</title>
          <style>
            body {
              font-family: sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: #fff;
            }
            .standee {
              border: 3px solid #000;
              border-radius: 24px;
              padding: 36px 28px;
              text-align: center;
              max-width: 320px;
              width: 100%;
              box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            }
            .title { font-size: 26px; font-weight: 900; margin: 0 0 4px; }
            .subtitle { font-size: 13px; color: #555; margin: 0 0 20px; }
            .qr-box { padding: 12px; background: #fff; display: inline-block; }
            .qr-box img { width: 220px; height: 220px; }
            .instruction { font-size: 14px; font-weight: bold; margin-top: 18px; color: #111; }
            .tagline { font-size: 11px; color: #777; margin-top: 6px; }
            @media print {
              body { background: none; }
              .standee { border: 2px solid #000; box-shadow: none; }
            }
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
        const url = `${origin}/order/${t.qrCodeToken || t.id}`;
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

  const statusCounts = Object.entries(STATUS_META).reduce((acc, [key]) => {
    acc[key] = tables.filter((t) => t.status === key).length;
    return acc;
  }, {} as Record<string, number>);

  const availableCount = statusCounts.AVAILABLE || 0;
  const occupiedCount = statusCounts.OCCUPIED || 0;

  return (
    <div className="space-y-5 animate-fade-in select-none">
      {/* Top Banner & Quick Metrics */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-card via-card/80 to-muted/40 border border-border shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center font-bold text-lg">
              🍽️
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-foreground">Dining Floor &amp; Table Seating</h1>
              <p className="text-xs text-muted-foreground font-medium">
                Tap any <span className="text-emerald-400 font-bold">Green Table</span> to take orders, or view Table QR Codes.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintAllStandees}
            disabled={tables.length === 0}
            className="gap-1.5 font-bold text-xs rounded-xl h-9"
          >
            <Printer className="w-3.5 h-3.5" /> Print All QR Standees
          </Button>

          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl h-9 shadow-md"
          >
            <Plus className="w-4 h-4" /> Add Table
          </Button>
        </div>
      </div>

      {/* Big Filter Buttons */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          type="button"
          onClick={() => setStatusFilter(null)}
          className={cn(
            'px-4 py-2 rounded-2xl text-xs font-black border transition-all cursor-pointer shadow-sm shrink-0',
            !statusFilter
              ? 'bg-foreground text-background border-transparent shadow-md scale-105'
              : 'bg-card border-border text-muted-foreground hover:text-foreground'
          )}
        >
          All Tables ({tables.length})
        </button>

        {Object.entries(STATUS_META).map(([status, meta]) => {
          const count = statusCounts[status] || 0;
          const active = statusFilter === status;
          return (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(active ? null : status)}
              className={cn(
                'px-4 py-2 rounded-2xl text-xs font-black border transition-all cursor-pointer shadow-sm shrink-0 flex items-center gap-2',
                active
                  ? `${meta.color} text-white border-transparent shadow-md scale-105`
                  : 'bg-card border-border text-muted-foreground hover:text-foreground'
              )}
            >
              <div className={cn('w-2.5 h-2.5 rounded-full', meta.color)} />
              <span>{meta.shortLabel}</span>
              <span className="opacity-80 text-[11px]">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Table Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {tables.map((table) => {
          const meta = STATUS_META[table.status] || STATUS_META.AVAILABLE;
          const isFree = table.status === 'AVAILABLE';
          const isDining = table.status === 'OCCUPIED';

          return (
            <div
              key={table.id}
              onClick={() => handleTableClick(table)}
              className={cn(
                'relative flex flex-col justify-between p-4 rounded-3xl border-2 transition-all duration-150 cursor-pointer shadow-sm select-none min-h-[185px] group active:scale-95',
                meta.border,
                meta.bg,
                isFree && 'hover:shadow-emerald-500/20 hover:shadow-lg',
                isDining && 'hover:shadow-red-500/20 hover:shadow-lg'
              )}
            >
              {/* Top Row: Table Name & Seating Pax */}
              <div className="flex items-start justify-between w-full">
                <div>
                  <h3 className="text-lg font-black text-foreground tracking-tight group-hover:text-primary transition-colors">
                    {table.name}
                  </h3>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground mt-0.5">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <span>{table.capacity} Seats</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setQrModalTable(table);
                    }}
                    title="View Table QR Code"
                    className="p-1.5 rounded-lg bg-background/80 hover:bg-background border border-border text-foreground hover:text-primary transition-colors"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                  </button>
                  <div className={cn('w-3 h-3 rounded-full shrink-0 shadow', meta.color, isDining && 'animate-pulse')} />
                </div>
              </div>

              {/* Middle: Visual Table Avatar / State */}
              <div className="my-auto py-2 text-center">
                <span className={cn('text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full border', meta.text, 'border-current/30 bg-background/60')}>
                  {meta.shortLabel}
                </span>
              </div>

              {/* Bottom: Action Shortcut */}
              <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-1.5">
                {isFree ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/pos?table=${table.id}`);
                    }}
                    className="w-full py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] flex items-center justify-center gap-1 shadow-sm"
                  >
                    <span>Take Order</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                ) : isDining ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const activeOrder = activeOrderByTableId[table.id];
                      if (activeOrder) {
                        setBillModalOrder(activeOrder);
                        setBillModalTable(table);
                      } else {
                        router.push(`/pos?table=${table.id}`);
                      }
                    }}
                    className="w-full py-1.5 px-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-[11px] flex items-center justify-center gap-1 shadow-sm"
                  >
                    <span>View Bill</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => handleQuickStatusToggle(table, 'AVAILABLE', e)}
                    className="w-full py-1.5 px-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-bold text-[11px]"
                  >
                    Mark Free
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {tables.length === 0 && !isLoading && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Utensils className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-base font-bold text-foreground">No Tables Created Yet</p>
            <p className="text-xs text-muted-foreground mt-1">Tap "Add Table" above to create dining tables.</p>
          </div>
        )}
      </div>

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
                  const url = `/order/${qrModalTable.qrCodeToken || qrModalTable.id}`;
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

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL: LIVE POS BILL & TABLE RECEIPT
      ───────────────────────────────────────────────────────────────────────────── */}
      {billModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
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
                    #{billModalOrder.orderNumber}
                  </span>
                  <Badge className="text-xs font-bold bg-primary text-primary-foreground">
                    {billModalTable?.name || billModalOrder.table?.name || 'Dining Table'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Ordered at {format(new Date(billModalOrder.createdAt || Date.now()), 'dd MMM yyyy, h:mm a')}
                  {billModalOrder.customer?.name && ` · ${billModalOrder.customer.name}`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setBillModalOrder(null);
                  setBillModalTable(null);
                }}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Status & Quick Print Actions */}
            <div className="p-3 rounded-2xl bg-muted/40 border border-border flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs">
                <span className="text-base">
                  {billModalOrder.status === 'READY' ? '🛎️' :
                   billModalOrder.status === 'PREPARING' || billModalOrder.status === 'SENT_TO_KITCHEN' ? '🍳' :
                   billModalOrder.status === 'SERVED' ? '🍽️' :
                   billModalOrder.status === 'BILLED' ? '🧾' : '📝'}
                </span>
                <span className="text-foreground">Status: <strong className="text-primary uppercase">{billModalOrder.status.replace(/_/g, ' ')}</strong></span>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePrintPOSBill(billModalOrder, true)}
                  className="h-8 text-xs font-bold gap-1 border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
                >
                  🍳 KOT
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePrintPOSBill(billModalOrder, false)}
                  className="h-8 text-xs font-bold gap-1 bg-background text-foreground"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Bill
                </Button>
              </div>
            </div>

            {/* Itemized Bill Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                <span>Dish Description</span>
                <span>Qty × Rate = Amount</span>
              </div>
              <div className="rounded-2xl border border-border divide-y divide-border bg-muted/20 overflow-hidden">
                {billModalOrder.items && billModalOrder.items.length > 0 ? (
                  billModalOrder.items.map((it: any, idx: number) => {
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
                    Items data not loaded
                  </div>
                )}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="rounded-2xl bg-card border border-border p-4 space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Subtotal:</span>
                <span className="font-mono">{formatCurrency(billModalOrder.subtotal || billModalOrder.total)}</span>
              </div>
              {Number(billModalOrder.taxAmount || 0) > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Taxes &amp; GST:</span>
                  <span className="font-mono">{formatCurrency(Number(billModalOrder.taxAmount || 0))}</span>
                </div>
              )}
              {!!billModalOrder.discountAmount && (
                <div className="flex justify-between text-xs text-emerald-500 font-medium">
                  <span>Discount:</span>
                  <span className="font-mono">-{formatCurrency(Number(billModalOrder.discountAmount || 0))}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-foreground pt-2 border-t border-border">
                <span>Total Bill Amount:</span>
                <span className="font-mono text-primary text-lg">{formatCurrency(billModalOrder.total)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const tableId = billModalTable?.id || billModalOrder.tableId;
                    router.push(`/pos?table=${tableId}`);
                  }}
                  className="font-bold text-xs h-10 gap-1.5"
                >
                  <ShoppingCart className="w-4 h-4" /> Add More in POS
                </Button>

                <Button
                  onClick={() => {
                    updateOrderStatusMutation.mutate({ orderId: billModalOrder.id, status: 'BILLED' });
                  }}
                  disabled={updateOrderStatusMutation.isPending || billModalOrder.status === 'BILLED'}
                  className="font-bold text-xs h-10 gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  🧾 Mark as Billed
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => {
                    updateOrderStatusMutation.mutate({ orderId: billModalOrder.id, status: 'PAID' });
                  }}
                  disabled={updateOrderStatusMutation.isPending}
                  className="w-full font-black text-xs h-11 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Settle &amp; Mark Paid
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setBillModalOrder(null);
                    setBillModalTable(null);
                  }}
                  className="w-full font-bold text-xs h-11"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
