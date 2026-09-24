'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Filter, RefreshCw, Eye, Receipt, CheckCircle,
  Circle, Clock, XCircle, ChevronRight, Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { apiGet, apiPatch } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@ros/utils';
import { format } from 'date-fns';

const STATUS_CONFIG: Record<string, { label: string; variant: any; icon: React.ElementType }> = {
  DRAFT:           { label: 'Draft',          variant: 'muted',       icon: Circle },
  CONFIRMED:       { label: 'Confirmed',       variant: 'info',        icon: CheckCircle },
  SENT_TO_KITCHEN: { label: 'In Kitchen',      variant: 'info',        icon: Clock },
  PREPARING:       { label: 'Preparing',       variant: 'warning',     icon: Clock },
  READY:           { label: 'Ready',           variant: 'success',     icon: CheckCircle },
  SERVED:          { label: 'Served',          variant: 'success',     icon: CheckCircle },
  BILLED:          { label: 'Billed',          variant: 'warning',     icon: Receipt },
  PARTIALLY_PAID:  { label: 'Partial',         variant: 'warning',     icon: Receipt },
  PAID:            { label: 'Paid',            variant: 'success',     icon: CheckCircle },
  COMPLETED:       { label: 'Completed',       variant: 'secondary',   icon: CheckCircle },
  CANCELLED:       { label: 'Cancelled',       variant: 'destructive', icon: XCircle },
  VOIDED:          { label: 'Voided',          variant: 'destructive', icon: XCircle },
};

const STATUSES = Object.keys(STATUS_CONFIG);

interface Order {
  id: string;
  orderNumber: string;
  type: string;
  status: string;
  subtotal: number;
  total: number;
  table?: { name: string };
  customer?: { name: string };
  _count: { items: number };
  createdAt: string;
  completedAt?: string;
}

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['orders', statusFilter, typeFilter],
    queryFn: () => apiGet<{ orders: Order[]; total: number; page: number; limit: number }>(
      `/orders?${statusFilter ? `status=${statusFilter}&` : ''}${typeFilter ? `type=${typeFilter}&` : ''}limit=100`
    ),
    refetchInterval: 30000,
  });

  const orders = (data?.orders || []).filter((o) =>
    !search || o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
    o.customer?.name.toLowerCase().includes(search.toLowerCase()) ||
    o.table?.name.toLowerCase().includes(search.toLowerCase())
  );

  const updateStatus = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      apiPatch(`/orders/${orderId}/status`, { status }),
    onSuccess: () => {
      toast.success('Order status updated');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: () => toast.error('Failed to update order status'),
  });

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Orders</h1>
          <p className="text-sm text-muted-foreground">{data?.total || 0} orders today</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search orders, customers, tables..."
          leftIcon={<Search />}
          className="max-w-xs"
        />

        <div className="flex gap-1.5 flex-wrap">
          {(['DINE_IN', 'TAKEAWAY', 'DELIVERY'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(typeFilter === t ? null : t)}
              className={cn(
                'px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                typeFilter === t ? 'bg-primary text-primary-foreground border-transparent' : 'border-border text-muted-foreground hover:border-primary/50'
              )}
            >
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setStatusFilter(null)}
          className={cn('shrink-0 px-4 py-1.5 rounded-full border text-xs font-medium transition-all',
            !statusFilter ? 'bg-primary text-primary-foreground border-transparent' : 'border-border text-muted-foreground hover:border-primary/50'
          )}
        >
          All
        </button>
        {['PREPARING', 'READY', 'BILLED', 'PAID', 'COMPLETED', 'CANCELLED'].map((s) => {
          const cfg = STATUS_CONFIG[s];
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? null : s)}
              className={cn('shrink-0 px-4 py-1.5 rounded-full border text-xs font-medium transition-all',
                statusFilter === s ? 'bg-primary text-primary-foreground border-transparent' : 'border-border text-muted-foreground hover:border-primary/50'
              )}
            >
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Orders table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-3 border-b border-border bg-muted/30">
          {['Order', 'Type', 'Items', 'Status', 'Total', 'Actions'].map((h) => (
            <p key={h} className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">{h}</p>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-0 divide-y divide-border">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="px-5 py-4 flex gap-4">
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-48 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
            <Receipt className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm">No orders found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {orders.map((order) => {
              const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.DRAFT;
              const StatusIcon = cfg.icon;

              return (
                <div
                  key={order.id}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors"
                >
                  {/* Order info */}
                  <div>
                    <p className="text-sm font-bold text-foreground">{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.table ? `Table ${order.table.name}` : order.type}
                      {order.customer ? ` · ${order.customer.name}` : ''}
                      {' · '}
                      {format(new Date(order.createdAt), 'h:mm a')}
                    </p>
                  </div>

                  {/* Type */}
                  <Badge variant="outline" className="text-[10px]">
                    {order.type.replace('_', ' ')}
                  </Badge>

                  {/* Items count */}
                  <span className="text-sm text-muted-foreground font-medium w-8 text-center">
                    {order._count.items}
                  </span>

                  {/* Status */}
                  <Badge variant={cfg.variant} className="gap-1 text-[10px]">
                    <StatusIcon className="w-3 h-3" />
                    {cfg.label}
                  </Badge>

                  {/* Total */}
                  <span className="text-sm font-bold tabular text-foreground">
                    {formatCurrency(order.total)}
                  </span>

                  {/* Actions */}
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon-sm" asChild>
                      <a href={`/orders/${order.id}`}><Eye className="w-3.5 h-3.5" /></a>
                    </Button>
                    {order.status === 'SERVED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 px-2.5"
                        onClick={() => updateStatus.mutate({ orderId: order.id, status: 'BILLED' })}
                      >
                        Bill
                      </Button>
                    )}
                    {order.status === 'BILLED' && (
                      <Button
                        size="sm"
                        className="text-xs h-7 px-2.5"
                        onClick={() => updateStatus.mutate({ orderId: order.id, status: 'PAID' })}
                      >
                        Pay
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
