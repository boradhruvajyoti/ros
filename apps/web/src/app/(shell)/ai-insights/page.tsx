'use client';

import { useState } from 'react';
import {
  Sparkles, TrendingUp, Users, AlertTriangle, Lightbulb,
  CheckCircle2, Flame, RefreshCw, BarChart2, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AiInsightsPage() {
  const [optimizing, setOptimizing] = useState(false);
  const [optimizedSuccess, setOptimizedSuccess] = useState(false);

  const handleOptimizeSchedule = () => {
    setOptimizing(true);
    setTimeout(() => {
      setOptimizing(false);
      setOptimizedSuccess(true);
      setTimeout(() => setOptimizedSuccess(false), 6000);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            AI Predictive Operations & Demand Forecasting
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Machine-learning models for tomorrow's guest covers, recipe waste reduction & automated staffing
          </p>
        </div>
        <Button
          onClick={handleOptimizeSchedule}
          disabled={optimizing}
          className="gap-2 bg-gradient-to-r from-primary to-amber-500 text-primary-foreground font-semibold shadow-lg shadow-primary/20"
        >
          <RefreshCw className={`w-4 h-4 ${optimizing ? 'animate-spin' : ''}`} />
          {optimizing ? 'Optimizing Shifts...' : 'Run AI Shift Optimizer'}
        </Button>
      </div>

      {/* Optimized Notification */}
      {optimizedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          ✨ AI roster generated! Shift allocation calibrated to expected hourly table turnover. Estimated 8.4% labor cost savings.
        </div>
      )}

      {/* Top Level Predictions */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-semibold uppercase">Tomorrow's Revenue Forecast</p>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-foreground mt-2">₹84,500</p>
          <p className="text-xs text-emerald-400 mt-1">94.8% ML confidence score</p>
        </div>

        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-semibold uppercase">Predicted Guest Covers</p>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-black text-primary mt-2">210 Covers</p>
          <p className="text-xs text-muted-foreground mt-1">Peak: 13:00-15:00 & 20:00-22:30</p>
        </div>

        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-semibold uppercase">Weather & Footfall Impact</p>
            <span className="text-base">☀️</span>
          </div>
          <p className="text-base font-bold text-foreground mt-2">Sunny, 28°C</p>
          <p className="text-xs text-amber-400 mt-1">+35% outdoor & beverage surge</p>
        </div>

        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-semibold uppercase">Food Waste Health Score</p>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-2">96.2%</p>
          <p className="text-xs text-muted-foreground mt-1">Variance within 1.2% threshold</p>
        </div>
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Dish Demand Predictions */}
        <div className="lg:col-span-6 p-6 rounded-2xl border border-border bg-card/70 backdrop-blur space-y-4">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-400" />
            Predicted Menu Item Demand (Tomorrow)
          </h2>
          <div className="space-y-3">
            {[
              { name: 'Butter Chicken (Half & Full)', count: 48, status: 'Ready in Walk-in Chiller', color: 'emerald' },
              { name: 'Special Chicken Dum Biryani', count: 42, status: 'Pre-marination scheduled', color: 'emerald' },
              { name: 'Paneer Tikka (Tandoori)', count: 35, status: 'Sufficient fresh stock', color: 'emerald' },
              { name: 'Mango Lassi (Chilled)', count: 50, status: 'Need curd & mango pulp refill', color: 'amber' },
              { name: 'Garlic Butter Naan', count: 120, status: 'Flour batch prepared', color: 'emerald' },
            ].map((dish, i) => (
              <div key={i} className="p-3.5 rounded-xl bg-background/60 border border-border flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-foreground">{dish.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{dish.status}</p>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-primary">{dish.count}</span>
                  <span className="text-xs text-muted-foreground ml-1">orders</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="lg:col-span-6 p-6 rounded-2xl border border-border bg-card/70 backdrop-blur space-y-4">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-400" />
            Smart Waste & Prep Optimization
          </h2>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Raw Material Alert — Red Onions
              </div>
              <p className="text-xs text-foreground/90 leading-relaxed">
                Current stock is <strong>4.5 KG</strong>. Expected usage for tomorrow dinner rush is <strong>18 KG</strong>. AI recommends raising an urgent PO for 25 KG.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 space-y-1.5">
              <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase">
                <Sparkles className="w-4 h-4 shrink-0" />
                Dynamic Staffing Recommendation
              </div>
              <p className="text-xs text-foreground/90 leading-relaxed">
                Expected 35% surge during 20:00 - 22:30. Recommend allocating 1 additional F&B captain to the Ground Floor Dining VIP section.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Yield Optimization: Dairy & Paneer
              </div>
              <p className="text-xs text-foreground/90 leading-relaxed">
                Gravy portion consistency maintained 98.8% theoretical recipe yield over past 7 days. Zero dairy wastage logged.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
