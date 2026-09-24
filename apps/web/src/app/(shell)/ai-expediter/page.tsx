'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Flame, 
  Clock, 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  Camera, 
  Eye, 
  Send, 
  UserCheck, 
  Utensils, 
  ShieldCheck, 
  Volume2, 
  RefreshCw,
  Sparkle
} from 'lucide-react';

interface PlatedDish {
  id: string;
  orderNumber: string;
  table: string;
  server: string;
  items: string[];
  platedAt: Date;
  lampStation: string;
  aiScore: number; // 0-100
  aiVerdict: 'PASSED' | 'WARNING' | 'INSPECTING';
  aiChecks: {
    garnishCheck: boolean;
    portionCheck: boolean;
    tempCheck: boolean;
    cleanRimCheck: boolean;
  };
  status: 'HEAT_LAMP' | 'PAGED_SERVER' | 'DISPATCHED';
}

const INITIAL_DISHES: PlatedDish[] = [
  {
    id: 'PLT-101',
    orderNumber: '#4092',
    table: 'Table 4',
    server: 'Aarav Sharma',
    items: ['1x Truffle Risotto', '1x Seared Sea Bass with Asparagus'],
    platedAt: new Date(Date.now() - 1000 * 95), // 95s ago
    lampStation: 'Lamp #1 (South Pass)',
    aiScore: 98,
    aiVerdict: 'PASSED',
    aiChecks: {
      garnishCheck: true,
      portionCheck: true,
      tempCheck: true,
      cleanRimCheck: true
    },
    status: 'HEAT_LAMP'
  },
  {
    id: 'PLT-102',
    orderNumber: '#4094',
    table: 'Table 12',
    server: 'Priya Patel',
    items: ['2x Wagyu Ribeye (Medium Rare)', '1x Rosemary Roasted Potatoes'],
    platedAt: new Date(Date.now() - 1000 * 240), // 4 mins ago (critical lamp time)
    lampStation: 'Lamp #2 (South Pass)',
    aiScore: 94,
    aiVerdict: 'PASSED',
    aiChecks: {
      garnishCheck: true,
      portionCheck: true,
      tempCheck: true,
      cleanRimCheck: true
    },
    status: 'PAGED_SERVER'
  },
  {
    id: 'PLT-103',
    orderNumber: '#4096',
    table: 'VIP Booth 2',
    server: 'Kabir Verma',
    items: ['1x Lobster Thermidor', '1x Smoked Burrata Salad'],
    platedAt: new Date(Date.now() - 1000 * 30), // 30s ago
    lampStation: 'Lamp #3 (North Pass)',
    aiScore: 78,
    aiVerdict: 'WARNING',
    aiChecks: {
      garnishCheck: false, // missing microgreens
      portionCheck: true,
      tempCheck: true,
      cleanRimCheck: true
    },
    status: 'HEAT_LAMP'
  },
  {
    id: 'PLT-104',
    orderNumber: '#4097',
    table: 'Takeout Bay A',
    server: 'Dev Nair',
    items: ['3x Butter Chicken Pizza', '2x Truffle Fries'],
    platedAt: new Date(Date.now() - 1000 * 15), // 15s ago
    lampStation: 'Lamp #4 (To-Go Station)',
    aiScore: 99,
    aiVerdict: 'PASSED',
    aiChecks: {
      garnishCheck: true,
      portionCheck: true,
      tempCheck: true,
      cleanRimCheck: true
    },
    status: 'HEAT_LAMP'
  }
];

export default function AIExpediterPage() {
  const [dishes, setDishes] = useState<PlatedDish[]>(INITIAL_DISHES);
  const [selectedDish, setSelectedDish] = useState<PlatedDish | null>(INITIAL_DISHES[0]);
  const [activeLamp, setActiveLamp] = useState<string>('ALL');
  const [now, setNow] = useState<number>(Date.now());
  const [pagedToast, setPagedToast] = useState<string | null>(null);

  // Update elapsed timer every second
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handlePageServer = (dishId: string) => {
    const dish = dishes.find(d => d.id === dishId);
    if (!dish) return;

    setDishes(prev => prev.map(d => d.id === dishId ? { ...d, status: 'PAGED_SERVER' } : d));
    setPagedToast(`Haptic alert & smartwatch push sent to ${dish.server} for ${dish.table} (${dish.orderNumber})`);
    setTimeout(() => setPagedToast(null), 4000);
  };

  const handleDispatch = (dishId: string) => {
    setDishes(prev => prev.map(d => d.id === dishId ? { ...d, status: 'DISPATCHED' } : d));
    if (selectedDish?.id === dishId) {
      const remaining = dishes.filter(d => d.id !== dishId && d.status !== 'DISPATCHED');
      setSelectedDish(remaining[0] || null);
    }
  };

  const handleReinspect = (dishId: string) => {
    setDishes(prev => prev.map(d => {
      if (d.id === dishId) {
        return {
          ...d,
          aiScore: 97,
          aiVerdict: 'PASSED',
          aiChecks: {
            garnishCheck: true,
            portionCheck: true,
            tempCheck: true,
            cleanRimCheck: true
          }
        };
      }
      return d;
    }));
  };

  const activeDishes = dishes.filter(d => d.status !== 'DISPATCHED');
  const filteredDishes = activeLamp === 'ALL' 
    ? activeDishes 
    : activeDishes.filter(d => d.lampStation.includes(activeLamp));

  const getLampTimerColor = (platedAt: Date) => {
    const elapsedSeconds = Math.floor((now - platedAt.getTime()) / 1000);
    if (elapsedSeconds > 180) return 'text-rose-400 bg-rose-500/10 border-rose-500/30 animate-pulse'; // >3m danger
    if (elapsedSeconds > 90) return 'text-amber-400 bg-amber-500/10 border-amber-500/30'; // >90s warm
    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'; // fresh
  };

  const formatElapsed = (platedAt: Date) => {
    const totalSec = Math.max(0, Math.floor((now - platedAt.getTime()) / 1000));
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {pagedToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-indigo-600 text-white shadow-2xl border border-indigo-400/30 animate-in slide-in-from-bottom-5">
          <Bell className="w-5 h-5 animate-bounce" />
          <span className="text-sm font-medium">{pagedToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Sparkles className="w-7 h-7 text-amber-400" /> AI Kitchen Expediter & Pass Master
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Computer Vision Plating QA
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time heat-lamp countdowns, visual AI presentation QA, and instant smartwatch/haptic server dispatch.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-1">
            {['ALL', 'South', 'North', 'To-Go'].map((station) => (
              <button
                key={station}
                onClick={() => setActiveLamp(station)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeLamp === station 
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {station} Pass
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Expediter Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pass Heat Lamp Cards (Left 7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" /> Active Pass Queue ({filteredDishes.length} Plated)
            </h2>
            <span className="text-xs text-slate-500">Max Lamp SLA: 3m 00s</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDishes.map((dish) => {
              const isSelected = selectedDish?.id === dish.id;
              const isWarning = dish.aiVerdict === 'WARNING';
              const timerClass = getLampTimerColor(dish.platedAt);

              return (
                <div 
                  key={dish.id}
                  onClick={() => setSelectedDish(dish)}
                  className={`cursor-pointer rounded-2xl border transition-all p-5 backdrop-blur-xl relative overflow-hidden ${
                    isSelected 
                      ? 'bg-slate-800/90 border-amber-500/80 ring-2 ring-amber-500/20 shadow-2xl' 
                      : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  {/* Top bar with Station & Lamp SLA */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-400">{dish.orderNumber}</span>
                    <div className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold border flex items-center gap-1.5 ${timerClass}`}>
                      <Clock className="w-3.5 h-3.5" />
                      {formatElapsed(dish.platedAt)}
                    </div>
                  </div>

                  {/* Table & Server */}
                  <div className="mt-3">
                    <div className="text-lg font-bold text-white flex items-center justify-between">
                      <span>{dish.table}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        isWarning ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        AI QA: {dish.aiScore}%
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-indigo-400" /> Server: {dish.server}
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="mt-3 py-2 border-t border-slate-800/80 space-y-1">
                    {dish.items.map((item, idx) => (
                      <div key={idx} className="text-xs text-slate-300 font-medium truncate">
                        • {item}
                      </div>
                    ))}
                  </div>

                  {/* Station & Actions */}
                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-mono">{dish.lampStation}</span>
                    {dish.status === 'PAGED_SERVER' ? (
                      <span className="text-[11px] font-semibold text-indigo-400 flex items-center gap-1 animate-pulse">
                        <Bell className="w-3 h-3" /> Paged
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePageServer(dish.id);
                        }}
                        className="text-xs px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 font-medium border border-indigo-500/40 transition flex items-center gap-1"
                      >
                        <Volume2 className="w-3 h-3" /> Page Server
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Plating QA & Dispatch Panel (Right 5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Camera className="w-4 h-4 text-indigo-400" /> AI Vision Inspection Pass
            </h2>
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> 4K Pass Camera Live
            </span>
          </div>

          {selectedDish ? (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-2xl space-y-5">
              {/* Dish Visual Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-amber-400">{selectedDish.orderNumber}</span>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs text-slate-400">{selectedDish.table}</span>
                  </div>
                  <div className="text-base font-bold text-white mt-1">{selectedDish.items[0]}</div>
                  <div className="text-xs text-slate-400 mt-0.5">Assigned to {selectedDish.server}</div>
                </div>

                <div className={`text-right p-3 rounded-xl border ${
                  selectedDish.aiVerdict === 'PASSED' 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}>
                  <div className="text-2xl font-black">{selectedDish.aiScore}%</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider">{selectedDish.aiVerdict}</div>
                </div>
              </div>

              {/* Computer Vision Checks Checklist */}
              <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Computer Vision Criteria
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">Garnish & Microgreens Alignment</span>
                  {selectedDish.aiChecks.garnishCheck ? (
                    <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Perfect (Parsley / Chives)
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1 font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5" /> Missing Microgreens
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">Portion & Sizing Calibration</span>
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Exact (Within ±3% variance)
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">Thermal Infrared Probe</span>
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 68.5°C (Optimal Serving)
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">Rim Smudge & Splatter Check</span>
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Clean Porcelain Rim
                  </span>
                </div>
              </div>

              {/* Expediter Actions */}
              <div className="space-y-3 pt-2">
                {selectedDish.aiVerdict === 'WARNING' && (
                  <button
                    onClick={() => handleReinspect(selectedDish.id)}
                    className="w-full py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold border border-amber-500/40 transition flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" /> Re-inspect After Chef Fix
                  </button>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handlePageServer(selectedDish.id)}
                    className="py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                  >
                    <Bell className="w-4 h-4" /> Send Haptic Page
                  </button>
                  <button
                    onClick={() => handleDispatch(selectedDish.id)}
                    className="py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    <Utensils className="w-4 h-4" /> Cleared / Runner Handed
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-400/60" />
              <div className="text-sm font-semibold text-slate-300">All Plated Orders Dispatched!</div>
              <p className="text-xs text-slate-500 mt-1">Pass is clear. Waiting for upcoming kitchen station tickets.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
