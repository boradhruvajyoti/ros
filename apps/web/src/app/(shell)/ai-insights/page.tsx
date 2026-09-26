'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  Wallet,
  PieChart as PieChartIcon,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Building2,
  ChevronRight,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiGet } from '@/lib/api';
import { formatCurrency } from '@ros/utils';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

type PeriodMode = 'daily' | 'weekly' | 'monthly';

interface TimeSeriesPoint {
  key: string;
  label: string;
  revenue: number;
  expenses: number;
  pnl: number;
  margin: number;
  ordersCount: number;
}

interface FinancialData {
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    netPnl: number;
    profitMargin: number;
    totalOrders: number;
    avgOrderValue: number;
    isProfitable: boolean;
  };
  daily: TimeSeriesPoint[];
  weekly: TimeSeriesPoint[];
  monthly: TimeSeriesPoint[];
  expenseCategoryBreakdown: {
    name: string;
    amount: number;
    percentage: number;
  }[];
}

const PIE_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#14b8a6'];

export default function AiInsightsPage() {
  const [period, setPeriod] = useState<PeriodMode>('daily');
  const [activeChartTab, setActiveChartTab] = useState<'composed' | 'margin'>('composed');

  const { data: analytics, isLoading, refetch, isFetching } = useQuery<FinancialData>({
    queryKey: ['financial-analytics'],
    queryFn: () => apiGet<FinancialData>('/reports/financial-analytics'),
  });

  const timeSeriesData: TimeSeriesPoint[] = analytics
    ? period === 'daily'
      ? analytics.daily
      : period === 'weekly'
      ? analytics.weekly
      : analytics.monthly
    : [];

  const summary = analytics?.summary || {
    totalRevenue: 0,
    totalExpenses: 0,
    netPnl: 0,
    profitMargin: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    isProfitable: true,
  };

  // Compute period-specific totals
  const periodRevenue = timeSeriesData.reduce((acc, d) => acc + d.revenue, 0);
  const periodExpenses = timeSeriesData.reduce((acc, d) => acc + d.expenses, 0);
  const periodPnl = periodRevenue - periodExpenses;
  const periodMargin = periodRevenue > 0 ? Math.round((periodPnl / periodRevenue) * 1000) / 10 : 0;

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const rev = payload.find((p: any) => p.dataKey === 'revenue')?.value || 0;
      const exp = payload.find((p: any) => p.dataKey === 'expenses')?.value || 0;
      const pnlVal = rev - exp;
      const isProf = pnlVal >= 0;

      return (
        <div className="bg-slate-900/95 border border-slate-700/80 p-3.5 rounded-2xl shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[180px]">
          <p className="font-bold text-slate-200 border-b border-slate-800 pb-1.5">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-emerald-400 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Revenue:
              </span>
              <span>₹{rev.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between text-rose-400 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400" /> Expenses:
              </span>
              <span>₹{exp.toLocaleString('en-IN')}</span>
            </div>
            <div className="border-t border-slate-800 pt-1.5 flex items-center justify-between font-bold">
              <span className={isProf ? 'text-emerald-300' : 'text-rose-300'}>
                Net {isProf ? 'Profit' : 'Loss'}:
              </span>
              <span className={isProf ? 'text-emerald-300' : 'text-rose-300'}>
                {isProf ? '+' : ''}₹{pnlVal.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ── Top Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-card/60 border border-border backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              Financial Insights &amp; PNL Intelligence
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Live Audited
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time daily, weekly, and monthly Revenue vs Expenses trends, Profit &amp; Loss (P&amp;L) margins, and cost distribution.
          </p>
        </div>

        {/* Period Selector & Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-background/80 border border-border rounded-2xl shadow-inner">
            <button
              onClick={() => setPeriod('daily')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === 'daily'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Daily (14D)
            </button>
            <button
              onClick={() => setPeriod('weekly')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === 'weekly'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Weekly (8W)
            </button>
            <button
              onClick={() => setPeriod('monthly')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === 'monthly'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly (12M)
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-2xl gap-1.5 text-xs font-bold h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Sync
          </Button>
        </div>
      </div>

      {/* ── KPI Summary Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="p-5 rounded-3xl border border-border bg-card/60 backdrop-blur hover:border-emerald-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {period.toUpperCase()} REVENUE
            </span>
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-foreground font-mono">
              ₹{periodRevenue.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-emerald-500 flex items-center gap-1 mt-1 font-semibold">
              <ArrowUpRight className="w-3.5 h-3.5" /> Total POS &amp; Dining Sales
            </div>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="p-5 rounded-3xl border border-border bg-card/60 backdrop-blur hover:border-rose-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {period.toUpperCase()} EXPENSES
            </span>
            <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-400">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-foreground font-mono">
              ₹{periodExpenses.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-rose-400 flex items-center gap-1 mt-1 font-semibold">
              <ArrowDownRight className="w-3.5 h-3.5" /> Raw Material &amp; Overheads
            </div>
          </div>
        </div>

        {/* Net Profit & Loss (PNL) */}
        <div className="p-5 rounded-3xl border border-border bg-card/60 backdrop-blur hover:border-primary/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              NET P&amp;L (PROFIT / LOSS)
            </span>
            <div className={`p-2.5 rounded-2xl ${periodPnl >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-black font-mono ${periodPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {periodPnl >= 0 ? '+' : ''}₹{periodPnl.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                periodPnl >= 0
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              }`}>
                {periodPnl >= 0 ? 'Net Surplus (Profitable)' : 'Deficit (Loss)'}
              </span>
            </div>
          </div>
        </div>

        {/* Net Margin */}
        <div className="p-5 rounded-3xl border border-border bg-card/60 backdrop-blur hover:border-indigo-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              PROFIT MARGIN %
            </span>
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-indigo-400 font-mono">
              {periodMargin}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Net margin on {period} turnover
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Graphical Charts Section ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Primary Chart: Revenue vs Expenses vs Net PNL */}
        <div className="lg:col-span-8 p-6 rounded-3xl border border-border bg-card/70 backdrop-blur space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                Revenue vs. Expenses &amp; Net P&amp;L Curve
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Comparative time-series visualization for {period} performance
              </p>
            </div>

            <div className="flex items-center gap-1 bg-background/60 p-1 rounded-xl border border-border text-xs">
              <button
                onClick={() => setActiveChartTab('composed')}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  activeChartTab === 'composed'
                    ? 'bg-primary text-primary-foreground shadow'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Bar &amp; Trend
              </button>
              <button
                onClick={() => setActiveChartTab('margin')}
                className={`px-3 py-1 rounded-lg font-bold transition ${
                  activeChartTab === 'margin'
                    ? 'bg-primary text-primary-foreground shadow'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Profit Margin Curve
              </button>
            </div>
          </div>

          {timeSeriesData.length === 0 ? (
            <div className="h-72 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Info className="w-8 h-8 opacity-30" />
              <p className="text-xs">No transaction records available for this timeframe.</p>
            </div>
          ) : activeChartTab === 'composed' ? (
            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.4} />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#e11d48" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: '12px', fontSize: '11px' }}
                  />
                  <Bar dataKey="revenue" name="Revenue (Sales)" fill="url(#revenueGrad)" radius={[6, 6, 0, 0]} barSize={24} />
                  <Bar dataKey="expenses" name="Expenses (Costs)" fill="url(#expenseGrad)" radius={[6, 6, 0, 0]} barSize={24} />
                  <Line
                    type="monotone"
                    dataKey="pnl"
                    name="Net P&L"
                    stroke="#38bdf8"
                    strokeWidth={3}
                    dot={{ fill: '#38bdf8', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="marginGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip
                    formatter={(val: any) => [`${val}%`, 'Net Profit Margin']}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="margin"
                    name="Profit Margin %"
                    stroke="#818cf8"
                    strokeWidth={3}
                    fill="url(#marginGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Secondary Chart: Expense Distribution Donut */}
        <div className="lg:col-span-4 p-6 rounded-3xl border border-border bg-card/70 backdrop-blur space-y-4 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-indigo-400" />
                Expense Cost Split
              </h2>
              <span className="text-[11px] text-muted-foreground">Category share</span>
            </div>

            {(!analytics?.expenseCategoryBreakdown || analytics.expenseCategoryBreakdown.length === 0) ? (
              <div className="h-60 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Receipt className="w-8 h-8 opacity-30" />
                <p className="text-xs">No approved expenses recorded.</p>
              </div>
            ) : (
              <div className="h-56 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.expenseCategoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="amount"
                    >
                      {analytics.expenseCategoryBreakdown.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Amount']}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Legend / Category breakdown list */}
          <div className="space-y-2 pt-2 border-t border-border/60 max-h-40 overflow-y-auto no-scrollbar pr-1">
            {(analytics?.expenseCategoryBreakdown || []).map((cat, i) => (
              <div key={cat.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="text-slate-300 font-medium truncate max-w-[120px]">{cat.name}</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-white font-semibold">₹{cat.amount.toLocaleString('en-IN')}</span>
                  <span className="text-slate-400 text-[10px]">({cat.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Period-by-Period P&L Financial Ledger Table ───────────────────────── */}
      <div className="p-6 rounded-3xl border border-border bg-card/60 backdrop-blur shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              {period.toUpperCase()} Profit &amp; Loss Breakdown Ledger
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Granular audit trail of sales volume, operational deductions, and net retained margins
            </p>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            {timeSeriesData.length} Intervals Recorded
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-4">Period / Date</th>
                <th className="py-3 px-4 text-center">Orders</th>
                <th className="py-3 px-4 text-right text-emerald-400">Gross Revenue</th>
                <th className="py-3 px-4 text-right text-rose-400">Expenses &amp; Costs</th>
                <th className="py-3 px-4 text-right">Net P&amp;L</th>
                <th className="py-3 px-4 text-center">Net Margin</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 text-xs">
              {timeSeriesData.map((row) => {
                const isProf = row.pnl >= 0;
                return (
                  <tr key={row.key} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-foreground">
                      {row.label}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-muted-foreground">
                      {row.ordersCount}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-emerald-400">
                      ₹{row.revenue.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-rose-400">
                      ₹{row.expenses.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-black">
                      <span className={isProf ? 'text-emerald-400' : 'text-rose-400'}>
                        {isProf ? '+' : ''}₹{row.pnl.toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-foreground">
                      {row.margin}%
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isProf
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {isProf ? '✓ Profitable' : '⚠ Deficit'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── AI Financial Intelligence & Action Recommendations ──────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl border border-border bg-card/60 backdrop-blur space-y-2">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase">
            <Lightbulb className="w-4 h-4 text-primary shrink-0" />
            Operating Efficiency
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Overall restaurant profit margin stands at <strong className="text-foreground">{summary.profitMargin}%</strong>. 
            Healthy F&amp;B standard margins typically range between 40% – 65%.
          </p>
        </div>

        <div className="p-5 rounded-3xl border border-border bg-card/60 backdrop-blur space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            Cost-to-Sales Synchronization
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Raw material deductions are tied to live recipe batch disbursements and inventory procurement vouchers.
          </p>
        </div>

        <div className="p-5 rounded-3xl border border-border bg-card/60 backdrop-blur space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase">
            <TrendingUp className="w-4 h-4 text-amber-400 shrink-0" />
            Automated Forecasting
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Average ticket size across {summary.totalOrders} dining orders is <strong className="text-foreground">₹{summary.avgOrderValue}</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
