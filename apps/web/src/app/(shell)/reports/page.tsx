'use client';

import { useState } from 'react';
import {
  BarChart3, Calendar, Download, TrendingUp, DollarSign,
  PieChart, ArrowUpRight, ArrowDownRight, Layers, UtensilsCrossed,
  Clock, ShieldCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@ros/utils';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function ReportsPage() {
  const [period, setPeriod] = useState<'today' | '7days' | 'month'>('month');
  const { toast } = useToast();

  const handleExport = () => {
    toast.success('P&L and Tax Report exported as CSV');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Financial Intelligence &amp; Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Profit &amp; Loss statements, Food Cost percentage, item popularity matrix, and hourly peak analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex items-center bg-card border border-border rounded-xl p-1">
            {[
              { id: 'today', label: 'Today' },
              { id: '7days', label: 'Last 7 Days' },
              { id: 'month', label: 'This Month (Sep)' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id as any)}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all',
                  period === p.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Button onClick={handleExport} variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Export P&amp;L
          </Button>
        </div>
      </div>

      {/* Executive P&L Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Gross Sales Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">{formatCurrency(482500)}</p>
          <div className="flex items-center gap-1 text-xs text-emerald-500 font-medium mt-0.5">
            <ArrowUpRight className="w-3.5 h-3.5" /> +18.4% vs last month
          </div>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Cost of Goods (COGS)</span>
            <PieChart className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">{formatCurrency(144750)}</p>
          <p className="text-[11px] text-emerald-500 font-medium mt-0.5">30.0% of sales (Target: &lt;32%)</p>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Gross Profit</span>
            <DollarSign className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">{formatCurrency(337750)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">70.0% Gross Margin</p>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Net Operating Profit</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-500 mt-2">{formatCurrency(189400)}</p>
          <p className="text-[11px] text-emerald-500 font-medium mt-0.5">39.2% Net Margin</p>
        </Card>
      </div>

      {/* Grid: Category Breakdown & Peak Hours */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Contribution */}
        <Card className="border-border/70 bg-card/60 backdrop-blur-sm p-6 space-y-4">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Sales by Category</span>
            <span className="text-xs font-normal text-muted-foreground">Top revenue drivers</span>
          </CardTitle>
          <div className="space-y-3">
            {[
              { category: 'Main Course', revenue: 218000, percentage: 45, color: 'bg-primary' },
              { category: 'Starters & Tandoor', revenue: 145000, percentage: 30, color: 'bg-amber-500' },
              { category: 'Beverages & Bar', revenue: 68000, percentage: 14, color: 'bg-blue-500' },
              { category: 'Breads & Accompaniments', revenue: 32000, percentage: 7, color: 'bg-emerald-500' },
              { category: 'Desserts', revenue: 19500, percentage: 4, color: 'bg-purple-500' },
            ].map((cat) => (
              <div key={cat.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">{cat.category}</span>
                  <span className="font-bold text-foreground">{formatCurrency(cat.revenue)} ({cat.percentage}%)</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div className={cn('h-full rounded-full', cat.color)} style={{ width: `${cat.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Hourly Peak Dining Heatmap */}
        <Card className="border-border/70 bg-card/60 backdrop-blur-sm p-6 space-y-4">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Hourly Revenue Heatmap</span>
            <span className="text-xs font-normal text-muted-foreground">Peak rush: 8:00 PM - 10:00 PM</span>
          </CardTitle>
          <div className="grid grid-cols-6 gap-2">
            {[
              { time: '12 PM', orders: 18, intensity: 'bg-primary/20' },
              { time: '1 PM', orders: 42, intensity: 'bg-primary/60' },
              { time: '2 PM', orders: 38, intensity: 'bg-primary/50' },
              { time: '3 PM', orders: 12, intensity: 'bg-primary/10' },
              { time: '4 PM', orders: 8, intensity: 'bg-primary/10' },
              { time: '5 PM', orders: 15, intensity: 'bg-primary/20' },
              { time: '6 PM', orders: 24, intensity: 'bg-primary/30' },
              { time: '7 PM', orders: 48, intensity: 'bg-primary/60' },
              { time: '8 PM', orders: 85, intensity: 'bg-primary' },
              { time: '9 PM', orders: 92, intensity: 'bg-primary' },
              { time: '10 PM', orders: 64, intensity: 'bg-primary/75' },
              { time: '11 PM', orders: 22, intensity: 'bg-primary/30' },
            ].map((slot) => (
              <div key={slot.time} className="p-2.5 rounded-xl border border-border bg-accent/30 text-center space-y-1">
                <p className="text-[10px] text-muted-foreground font-semibold">{slot.time}</p>
                <div className={cn('w-full h-8 rounded-lg flex items-center justify-center font-bold text-xs text-primary-foreground', slot.intensity)}>
                  {slot.orders}
                </div>
                <p className="text-[9px] text-muted-foreground">orders</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Top 5 High Margin Dishes */}
      <Card className="border-border/70 bg-card/60 backdrop-blur-sm p-6 space-y-4">
        <CardTitle className="text-base">Top Performing &amp; High Margin Menu Items</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
              <tr>
                <th className="px-4 py-3 font-semibold">Dish Name</th>
                <th className="px-4 py-3 font-semibold">Units Sold</th>
                <th className="px-4 py-3 font-semibold">Selling Price</th>
                <th className="px-4 py-3 font-semibold">Food Cost</th>
                <th className="px-4 py-3 font-semibold">Margin (%)</th>
                <th className="px-4 py-3 font-semibold text-right">Total Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 text-xs">
              {[
                { name: 'Butter Chicken (Full)', qty: 384, price: 460, cost: 160, margin: '65.2%', profit: 115200 },
                { name: 'Paneer Tikka (Full)', qty: 412, price: 320, cost: 100, margin: '68.8%', profit: 90640 },
                { name: 'Dal Makhani', qty: 490, price: 260, cost: 50, margin: '80.8%', profit: 102900 },
                { name: 'Butter Garlic Naan', qty: 940, price: 75, cost: 15, margin: '80.0%', profit: 56400 },
                { name: 'Mango Lassi', qty: 280, price: 120, cost: 35, margin: '70.8%', profit: 23800 },
              ].map((item, idx) => (
                <tr key={idx} className="hover:bg-accent/30">
                  <td className="px-4 py-3 font-bold text-foreground">{item.name}</td>
                  <td className="px-4 py-3 font-semibold text-foreground">{item.qty} pcs</td>
                  <td className="px-4 py-3">{formatCurrency(item.price)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatCurrency(item.cost)}</td>
                  <td className="px-4 py-3 font-bold text-emerald-500">{item.margin}</td>
                  <td className="px-4 py-3 font-bold text-foreground text-right">{formatCurrency(item.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
