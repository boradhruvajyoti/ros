'use client';

import React, { useState } from 'react';
import { 
  TrendingUp, 
  Zap, 
  DollarSign, 
  Percent, 
  Sparkles, 
  ShieldCheck, 
  Sliders, 
  Layers, 
  Star, 
  HelpCircle, 
  Trash2, 
  ArrowUpRight,
  Flame,
  CloudRain,
  Users
} from 'lucide-react';

interface SurgeRule {
  id: string;
  name: string;
  condition: string;
  multiplier: string;
  isActive: boolean;
  affected: string;
}

interface BCGItem {
  id: string;
  name: string;
  salesCount: number;
  marginPercent: number;
  price: number;
  quadrant: 'STAR' | 'PLOWHORSE' | 'PUZZLE' | 'DOG';
  strategy: string;
}

const INITIAL_RULES: SurgeRule[] = [];
const BCG_ITEMS: BCGItem[] = [];

export default function DynamicPricingPage() {
  const [rules, setRules] = useState<SurgeRule[]>(INITIAL_RULES);
  const [selectedQuadrant, setSelectedQuadrant] = useState<string>('ALL');

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));
  };

  const filteredBCG = selectedQuadrant === 'ALL'
    ? BCG_ITEMS
    : BCG_ITEMS.filter(i => i.quadrant === selectedQuadrant);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <TrendingUp className="w-7 h-7 text-amber-400" /> Dynamic Pricing & BCG Menu Engineering
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Yield Optimization AI
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time algorithmic demand surge, occupancy yield pricing, and BCG matrix margin intelligence.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs font-medium text-slate-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Live Demand Multiplier: <strong className="text-amber-300 font-mono text-sm">1.00x (Standard)</strong>
          </div>
        </div>
      </div>

      {/* Live Conditions Trigger Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Restaurant Occupancy</span>
            <Users className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">68% Full</div>
            <div className="text-xs text-slate-400 mt-1">
              Surge threshold trigger: &gt;85%
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Kitchen Queue SLA</span>
            <Flame className="w-5 h-5 text-orange-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-orange-300">12 mins</div>
            <div className="text-xs text-emerald-400 mt-1 font-medium">
              Smooth throughput & capacity
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Local Micro-Weather</span>
            <CloudRain className="w-5 h-5 text-teal-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-teal-300">Clear • 27°C</div>
            <div className="text-xs text-slate-400 mt-1">
              No rain surge triggered
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Surge Rules Engine */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" /> Automated Surge & Yield Rules
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Rules automatically apply percentage modifiers during target demand windows</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`p-5 rounded-2xl border transition-all ${
                rule.isActive 
                  ? 'bg-slate-800/80 border-amber-500/50 shadow-lg' 
                  : 'bg-slate-950/40 border-slate-800/60 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{rule.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                  rule.multiplier.startsWith('+') ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                }`}>
                  {rule.multiplier}
                </span>
              </div>

              <div className="text-xs text-slate-400 mt-2 font-mono">{rule.condition}</div>
              <div className="text-[11px] text-indigo-400 mt-1">Applies to: {rule.affected}</div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">{rule.isActive ? 'Active & Monitoring' : 'Rule Paused'}</span>
                <button
                  onClick={() => toggleRule(rule.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    rule.isActive
                      ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {rule.isActive ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BCG Matrix Menu Engineering Studio */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400" /> BCG Menu Engineering Matrix (Profit vs. Popularity)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Categorization of menu items into Stars, Plowhorses, Puzzles, and Dogs</p>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            {['ALL', 'STAR', 'PLOWHORSE', 'PUZZLE', 'DOG'].map((quad) => (
              <button
                key={quad}
                onClick={() => setSelectedQuadrant(quad)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  selectedQuadrant === quad 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {quad}
              </button>
            ))}
          </div>
        </div>

        {/* 2x2 Grid Representation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBCG.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-slate-950/50 border border-slate-800/80 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-bold text-white">{item.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">Selling Price: ₹{item.price}</div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-bold text-emerald-400">{item.marginPercent}% Margin</div>
                  <div className="text-xs text-slate-400 font-mono">{item.salesCount} sold / mo</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                {item.strategy}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
