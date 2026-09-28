'use client';

import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, ShoppingBag, Receipt, Users, UtensilsCrossed,
  ChefHat, ArrowRight, RefreshCw, DollarSign, Store,
  Clock, ArrowUpRight
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
  DRAFT:           { bg: 'bg-muted/60',       text: 'text-muted-foreground', label: 'Draft' },
  CONFIRMED:       { bg: 'bg-blue-500/10',    text: 'text-blue-400',         label: 'Confirmed' },
  SENT_TO_KITCHEN: { bg: 'bg-amber-500/10',   text: 'text-amber-400',        label: 'In Kitchen' },
  PREPARING:       { bg: 'bg-orange-500/10',  text: 'text-orange-400',       label: 'Cooking' },
  READY:           { bg: 'bg-emerald-500/10', text: 'text-emerald-400',      label: 'Ready' },
  SERVED:          { bg: 'bg-teal-500/10',    text: 'text-teal-400',         label: 'Served' },
  BILLED:          { bg: 'bg-purple-500/10',  text: 'text-purple-400',       label: 'Billed' },
  PAID:            { bg: 'bg-emerald-500/10', text: 'text-emerald-400',      label: 'Paid' },
  COMPLETED:       { bg: 'bg-zinc-500/10',    text: 'text-zinc-400',         label: 'Completed' },
  CANCELLED:       { bg: 'bg-rose-500/10',    text: 'text-rose-400',         label: 'Cancelled' },
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

  const revenue = summary?.totalRevenue || salesReport?.totalSales || 0;
  const ordersCount = summary?.totalOrders || salesReport?.totalOrders || 0;
  const avgOrderVal = ordersCount > 0 ? revenue / ordersCount : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* ── Minimalist Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Overview
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            {format(new Date(), 'EEEE, d MMMM yyyy')} &bull; Live restaurant activity
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="gap-2 h-9 px-3 rounded-xl text-xs font-semibold border-border/70 hover:bg-muted/50 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* ── Key Metrics Cards (Minimalist & Soothing) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="p-5 rounded-2xl bg-card border border-border/60 hover:border-border transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Today&apos;s Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold text-foreground font-mono tracking-tight">
              {formatCurrency(revenue)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Recorded revenue today
            </p>
          </div>
        </div>

        {/* Total Orders */}
        <div className="p-5 rounded-2xl bg-card border border-border/60 hover:border-border transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Orders</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold text-foreground font-mono tracking-tight">
              {ordersCount}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Dine-In: {salesReport?.breakdown?.dineIn || 0} &bull; Parcel: {salesReport?.breakdown?.takeaway || 0}
            </p>
          </div>
        </div>

        {/* Active Tables */}
        <div className="p-5 rounded-2xl bg-card border border-border/60 hover:border-border transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Active Dining Tables</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold text-foreground font-mono tracking-tight">
              {summary?.activeTables || 0}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Tables in service
            </p>
          </div>
        </div>

        {/* Average Order Value */}
        <div className="p-5 rounded-2xl bg-card border border-border/60 hover:border-border transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Average Order Value</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold text-foreground font-mono tracking-tight">
              {formatCurrency(avgOrderVal)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Per order average
            </p>
          </div>
        </div>
      </div>

      {/* ── Quick Navigation (Minimalist Clean Cards) ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">
          Quick Access
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/tables"
            className="group p-4 rounded-2xl bg-card border border-border/60 hover:border-primary/50 hover:bg-muted/20 transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-muted/60 group-hover:bg-primary/10 group-hover:text-primary transition-colors flex items-center justify-center text-foreground">
                <UtensilsCrossed className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Dining Tables</p>
                <p className="text-[11px] text-muted-foreground">Floors & seating</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
          </Link>

          <Link
            href="/kitchen"
            className="group p-4 rounded-2xl bg-card border border-border/60 hover:border-primary/50 hover:bg-muted/20 transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-muted/60 group-hover:bg-primary/10 group-hover:text-primary transition-colors flex items-center justify-center text-foreground">
                <ChefHat className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Kitchen (KDS)</p>
                <p className="text-[11px] text-muted-foreground">Live order queue</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
          </Link>

          <Link
            href="/orders"
            className="group p-4 rounded-2xl bg-card border border-border/60 hover:border-primary/50 hover:bg-muted/20 transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-muted/60 group-hover:bg-primary/10 group-hover:text-primary transition-colors flex items-center justify-center text-foreground">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Active Orders</p>
                <p className="text-[11px] text-muted-foreground">Billing & settlement</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
          </Link>

          <Link
            href="/order-history"
            className="group p-4 rounded-2xl bg-card border border-border/60 hover:border-primary/50 hover:bg-muted/20 transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-muted/60 group-hover:bg-primary/10 group-hover:text-primary transition-colors flex items-center justify-center text-foreground">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Order History</p>
                <p className="text-[11px] text-muted-foreground">Past audit records</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
          </Link>
        </div>
      </div>

      {/* ── Recent Live Orders Table ── */}
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border/60 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">
              Recent Activity
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Latest transactions recorded across POS, kitchen & tables
            </p>
          </div>
          <Link
            href="/orders"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div>
          {isLoadingSales ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 bg-muted/30 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : !salesReport?.recentOrders || salesReport.recentOrders.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs font-medium">No orders recorded yet today.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {salesReport.recentOrders.slice(0, 7).map((order) => {
                const cfg = statusColors[order.status] || { bg: 'bg-muted/60', text: 'text-muted-foreground', label: order.status };
                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between px-4 sm:px-5 py-3.5 hover:bg-muted/20 transition-colors text-sm"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-muted/50 border border-border/40 flex items-center justify-center font-bold text-xs font-mono text-muted-foreground shrink-0">
                        #{order.orderNumber.slice(-4)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">
                          Order #{order.orderNumber}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {order.table?.name ? `Table ${order.table.name}` : order.type}
                          {order.customer?.name ? ` &bull; ${order.customer.name}` : ''}
                          {' &bull; '}
                          {format(new Date(order.createdAt), 'h:mm a')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3.5 shrink-0 ml-2">
                      <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${cfg.bg} ${cfg.text}`}>
                        {cfg.label}
                      </span>
                      <span className="text-sm font-bold text-foreground font-mono">
                        {formatCurrency(order.total)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
