'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, Calendar, Download, TrendingUp, DollarSign,
  PieChart, ArrowUpRight, ArrowDownRight, Layers, UtensilsCrossed,
  Clock, ShieldCheck, RefreshCw, ShoppingBag, Receipt, AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@ros/utils';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { apiGet } from '@/lib/api';

interface SummaryData {
  totalRevenue: number;
  totalOrders: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
  activeTables: number;
}

interface SalesData {
  totalSales: number;
  totalOrders: number;
  breakdown: {
    dineIn: number;
    takeaway: number;
    delivery: number;
  };
  recentOrders: Array<any>;
}

interface TaxData {
  taxableSales: number;
  totalTax: number;
  cgst: number;
  sgst: number;
  totalGrossSales: number;
  filingPeriod: string;
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<'today' | '7days' | 'month'>('today');
  const { toast } = useToast();

  const { data: summary, isLoading: isLoadingSummary, refetch: refetchSummary } = useQuery<SummaryData>({
    queryKey: ['reports', 'summary'],
    queryFn: () => apiGet<SummaryData>('/reports/summary'),
  });

  const { data: sales, isLoading: isLoadingSales, refetch: refetchSales } = useQuery<SalesData>({
    queryKey: ['reports', 'sales'],
    queryFn: () => apiGet<SalesData>('/reports/sales'),
  });

  const { data: taxReport, isLoading: isLoadingTax, refetch: refetchTax } = useQuery<TaxData>({
    queryKey: ['reports', 'tax'],
    queryFn: () => apiGet<TaxData>('/reports/tax'),
  });

  const handleExport = () => {
    const csvContent = `data:text/csv;charset=utf-8,Metric,Value\nTotal Revenue,${summary?.totalRevenue || 0}\nTotal Orders,${summary?.totalOrders || 0}\nTotal Expenses,${summary?.totalExpenses || 0}\nGross Profit,${summary?.grossProfit || 0}\nNet Profit,${summary?.netProfit || 0}\nTotal Tax Collected,${taxReport?.totalTax || 0}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `financial-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('P&L and Tax Report exported as CSV');
  };

  const handleRefresh = () => {
    refetchSummary();
    refetchSales();
    refetchTax();
    toast.success('Reports data refreshed');
  };

  const totalRev = summary?.totalRevenue || 0;
  const totalExp = summary?.totalExpenses || 0;
  const grossProfit = summary?.grossProfit || (totalRev * 0.7);
  const netProfit = summary?.netProfit || (grossProfit - totalExp);
  const totalOrders = summary?.totalOrders || sales?.totalOrders || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card/60 p-5 rounded-3xl border border-border backdrop-blur-sm">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Financial Intelligence &amp; Analytics
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time live Profit &amp; Loss statements, tax summaries, and dining channel breakdown
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm" className="gap-1.5 h-10 px-3.5 rounded-xl text-xs font-bold">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
          <Button onClick={handleExport} variant="outline" size="sm" className="gap-1.5 h-10 px-3.5 rounded-xl text-xs font-bold">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Executive P&L Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 bg-card/60 backdrop-blur-sm border-primary/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Gross Sales Revenue</span>
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <p className="text-3xl font-black text-foreground font-mono mt-3">{formatCurrency(totalRev)}</p>
          <div className="text-[11px] text-muted-foreground mt-1">
            {totalOrders} settled transactions
          </div>
        </Card>

        <Card className="p-5 bg-card/60 backdrop-blur-sm border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Logged Expenses</span>
            <PieChart className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-amber-500 font-mono mt-3">{formatCurrency(totalExp)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Operating &amp; petty cash vouchers</p>
        </Card>

        <Card className="p-5 bg-card/60 backdrop-blur-sm border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Estimated Gross Profit</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-black text-emerald-500 font-mono mt-3">{formatCurrency(grossProfit)}</p>
          <p className="text-[11px] text-emerald-500 font-medium mt-1">~70.0% Standard Gross Margin</p>
        </Card>

        <Card className="p-5 bg-card/60 backdrop-blur-sm border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Net Operating Profit</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-black text-foreground font-mono mt-3">{formatCurrency(netProfit)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">After deducting recorded expenses</p>
        </Card>
      </div>

      {/* Grid: Order Breakdown & Tax Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dining Channel Breakdown */}
        <Card className="border-border bg-card/60 backdrop-blur-sm p-6 space-y-4 rounded-3xl">
          <CardTitle className="text-base font-bold flex items-center justify-between">
            <span>Orders by Dining Channel</span>
            <span className="text-xs font-normal text-muted-foreground">{totalOrders} total orders</span>
          </CardTitle>

          {totalOrders === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-xs">No orders recorded yet. Fresh onboarding tenant status.</p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {[
                { channel: 'Dine-In Orders', count: sales?.breakdown?.dineIn || 0, color: 'bg-primary' },
                { channel: 'Takeaway / Parcel', count: sales?.breakdown?.takeaway || 0, color: 'bg-amber-500' },
                { channel: 'Delivery / Online', count: sales?.breakdown?.delivery || 0, color: 'bg-emerald-500' },
              ].map((item) => {
                const pct = totalOrders > 0 ? Math.round((item.count / totalOrders) * 100) : 0;
                return (
                  <div key={item.channel} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground">{item.channel}</span>
                      <span className="font-mono text-muted-foreground">{item.count} orders ({pct}%)</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all', item.color)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* GST & Tax Liability */}
        <Card className="border-border bg-card/60 backdrop-blur-sm p-6 space-y-4 rounded-3xl">
          <CardTitle className="text-base font-bold flex items-center justify-between">
            <span>GST &amp; Tax Compliance Breakdown</span>
            <Badge variant="outline" className="text-[10px]">Active</Badge>
          </CardTitle>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border">
              <span className="text-xs font-medium text-muted-foreground">Taxable Sales (Pre-Tax)</span>
              <span className="font-bold font-mono text-foreground">{formatCurrency(taxReport?.taxableSales || 0)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border">
              <span className="text-xs font-medium text-muted-foreground">CGST (Central GST)</span>
              <span className="font-bold font-mono text-foreground">{formatCurrency(taxReport?.cgst || 0)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border">
              <span className="text-xs font-medium text-muted-foreground">SGST (State GST)</span>
              <span className="font-bold font-mono text-foreground">{formatCurrency(taxReport?.sgst || 0)}</span>
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-primary/10 border border-primary/30">
              <span className="text-xs font-bold text-primary">Total Tax Collected</span>
              <span className="font-bold font-mono text-primary text-base">{formatCurrency(taxReport?.totalTax || 0)}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
