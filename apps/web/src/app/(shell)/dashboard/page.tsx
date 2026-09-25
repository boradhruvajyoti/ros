'use client';

import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, ShoppingBag, Receipt, Users, UtensilsCrossed,
  ChefHat, AlertTriangle, ArrowRight, Plus, Eye,
  RefreshCw, Layers, DollarSign, Store
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiGet } from '@/lib/api';
import { formatCurrency } from '@ros/utils';
import { format } from 'date-fns';
import Link from 'next/link';

interface ReportSummary {
  totalRevenue: number;
  totalOrders: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
  activeTables: number;
}

interface SalesReport {
  totalSales: number;
  totalOrders: number;
  breakdown: {
    dineIn: number;
    takeaway: number;
    delivery: number;
  };
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    type: string;
    table?: { name: string };
    customer?: { name: string };
    createdAt: string;
  }>;
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  DRAFT:           { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Draft' },
  CONFIRMED:       { bg: 'bg-blue-500/10', text: 'text-blue-500', label: 'Confirmed' },
  SENT_TO_KITCHEN: { bg: 'bg-amber-500/10', text: 'text-amber-500', label: 'In Kitchen' },
  PREPARING:       { bg: 'bg-orange-500/10', text: 'text-orange-500', label: 'Cooking' },
  READY:           { bg: 'bg-emerald-500/15', text: 'text-emerald-500', label: 'Ready' },
  SERVED:          { bg: 'bg-teal-500/10', text: 'text-teal-500', label: 'Served' },
  BILLED:          { bg: 'bg-purple-500/15', text: 'text-purple-500', label: 'Billed' },
  PAID:            { bg: 'bg-emerald-500/10', text: 'text-emerald-600', label: 'Paid' },
  COMPLETED:       { bg: 'bg-zinc-500/10', text: 'text-zinc-400', label: 'Done' },
  CANCELLED:       { bg: 'bg-rose-500/10', text: 'text-rose-500', label: 'Cancelled' },
};

export default function DashboardPage() {
  const { data: summary, isLoading: isLoadingSummary, refetch: refetchSummary } = useQuery<ReportSummary>({
    queryKey: ['reports', 'summary'],
    queryFn: () => apiGet<ReportSummary>('/reports/summary'),
    refetchInterval: 15000,
  });

  const { data: salesReport, isLoading: isLoadingSales, refetch: refetchSales } = useQuery<SalesReport>({
    queryKey: ['reports', 'sales'],
    queryFn: () => apiGet<SalesReport>('/reports/sales'),
    refetchInterval: 15000,
  });

  const handleRefresh = () => {
    refetchSummary();
    refetchSales();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Welcome Bar & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card/60 border border-border p-5 rounded-3xl backdrop-blur-sm">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2.5">
            <Store className="w-7 h-7 text-primary" />
            Restaurant Dashboard
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(new Date(), 'EEEE, d MMMM yyyy')} · Real-time operational overview
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-1.5 h-10 px-3.5 rounded-xl text-xs font-bold"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* BIG FOOLPROOF SHORTCUT TILES (Designed for Laymen & Fast Tapping) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Link
          href="/pos"
          className="p-4 rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/40 hover:border-primary transition-all hover:scale-[1.02] shadow-sm flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-3xl">🛍️</span>
            <span className="text-xs font-black text-primary group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              Open <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-base font-black text-foreground">New Order (POS)</p>
            <p className="text-[11px] text-muted-foreground">Take dine-in or parcel order</p>
          </div>
        </Link>

        <Link
          href="/tables"
          className="p-4 rounded-3xl bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent border border-emerald-500/40 hover:border-emerald-500 transition-all hover:scale-[1.02] shadow-sm flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-3xl">🪑</span>
            <span className="text-xs font-black text-emerald-500 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              View <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-base font-black text-foreground">Dining Tables</p>
            <p className="text-[11px] text-muted-foreground">{summary?.activeTables || 0} active dining tables</p>
          </div>
        </Link>

        <Link
          href="/kitchen"
          className="p-4 rounded-3xl bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/40 hover:border-amber-500 transition-all hover:scale-[1.02] shadow-sm flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-3xl">🍳</span>
            <span className="text-xs font-black text-amber-500 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              Live <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-base font-black text-foreground">Kitchen Display</p>
            <p className="text-[11px] text-muted-foreground">Chef KOT ticket bump screen</p>
          </div>
        </Link>

        <Link
          href="/orders"
          className="p-4 rounded-3xl bg-gradient-to-br from-purple-500/20 via-purple-500/10 to-transparent border border-purple-500/40 hover:border-purple-500 transition-all hover:scale-[1.02] shadow-sm flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-3xl">🧾</span>
            <span className="text-xs font-black text-purple-500 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              Manage <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-3">
            <p className="text-base font-black text-foreground">Orders & Billing</p>
            <p className="text-[11px] text-muted-foreground">Settle payment & print slips</p>
          </div>
        </Link>
      </div>

      {/* METRIC STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="rounded-3xl border border-primary/30 bg-primary/5 p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-primary">Today's Sales</span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black text-foreground font-mono">
              {formatCurrency(summary?.totalRevenue || 0)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Live recorded gross receipts</p>
          </div>
        </div>

        {/* Total Orders */}
        <div className="rounded-3xl border border-border bg-card p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Total Orders</span>
            <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black text-foreground font-mono">
              {summary?.totalOrders || salesReport?.totalOrders || 0}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Dine-In: {salesReport?.breakdown?.dineIn || 0} · Parcel: {salesReport?.breakdown?.takeaway || 0}
            </p>
          </div>
        </div>

        {/* Active Tables */}
        <div className="rounded-3xl border border-border bg-card p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Dining Capacity</span>
            <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black text-foreground font-mono">
              {summary?.activeTables || 0}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Configured dining tables</p>
          </div>
        </div>

        {/* Net Profit Margin */}
        <div className="rounded-3xl border border-border bg-card p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-500">Gross Estimate</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black text-foreground font-mono">
              {formatCurrency(summary?.grossProfit || (summary?.totalRevenue || 0) * 0.7)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">~70% estimated gross margin</p>
          </div>
        </div>
      </div>

      {/* RECENT ORDERS TABLE */}
      <Card className="rounded-3xl border-border bg-card shadow-sm overflow-hidden">
        <CardHeader className="p-5 border-b border-border/60 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-black flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" />
              Recent Live Orders
            </CardTitle>
            <p className="text-xs text-muted-foreground">Latest transactions synced from POS and kitchen</p>
          </div>
          <Link href="/orders" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
            View All Orders <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingSales ? (
            <div className="p-8 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 bg-muted/40 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : !salesReport?.recentOrders || salesReport.recentOrders.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-xs">No orders recorded yet today.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {salesReport.recentOrders.slice(0, 8).map((order) => {
                const cfg = statusColors[order.status] || { bg: 'bg-muted', text: 'text-muted-foreground', label: order.status };
                return (
                  <div key={order.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-muted/60 flex items-center justify-center font-bold text-xs font-mono text-foreground shrink-0">
                        #{order.orderNumber.slice(-4)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">
                          Order #{order.orderNumber}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {order.table?.name ? `Table ${order.table.name}` : order.type}
                          {order.customer?.name ? ` · ${order.customer.name}` : ''}
                          {' · '}
                          {format(new Date(order.createdAt), 'h:mm a')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${cfg.bg} ${cfg.text}`}>
                        {cfg.label}
                      </span>
                      <span className="text-sm font-black text-foreground font-mono">
                        {formatCurrency(order.total)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
