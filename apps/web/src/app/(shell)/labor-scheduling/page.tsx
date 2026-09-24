'use client';

import React, { useState } from 'react';
import { 
  Users, 
  Calendar, 
  Clock, 
  DollarSign, 
  Sparkles, 
  CheckCircle2, 
  Send, 
  TrendingUp, 
  ShieldCheck, 
  UserCheck, 
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';

interface ScheduledShift {
  id: string;
  employeeName: string;
  role: string;
  day: string;
  shiftTime: string;
  forecastedDemand: 'PEAK' | 'HIGH' | 'MODERATE' | 'LOW';
  hourlyWageINR: number;
  totalHours: number;
  status: 'SCHEDULED' | 'CONFIRMED' | 'SWAP_REQUESTED';
}

const INITIAL_SHIFTS: ScheduledShift[] = [
  { id: 'SHF-101', employeeName: 'Chef Sanjay Rao', role: 'Head Chef', day: 'Friday', shiftTime: '16:00 - 00:00 (Dinner Peak)', forecastedDemand: 'PEAK', hourlyWageINR: 450, totalHours: 8, status: 'CONFIRMED' },
  { id: 'SHF-102', employeeName: 'Aarav Sharma', role: 'Captain', day: 'Friday', shiftTime: '17:00 - 00:30 (Dinner Peak)', forecastedDemand: 'PEAK', hourlyWageINR: 320, totalHours: 7.5, status: 'CONFIRMED' },
  { id: 'SHF-103', employeeName: 'Priya Patel', role: 'Server', day: 'Friday', shiftTime: '18:00 - 23:30 (Peak Rush)', forecastedDemand: 'PEAK', hourlyWageINR: 240, totalHours: 5.5, status: 'CONFIRMED' },
  { id: 'SHF-104', employeeName: 'Dev Nair', role: 'Bartender', day: 'Friday', shiftTime: '18:00 - 01:00 (Late Night Lounge)', forecastedDemand: 'HIGH', hourlyWageINR: 280, totalHours: 7, status: 'SCHEDULED' },
  { id: 'SHF-105', employeeName: 'Ravi Verma', role: 'Line Cook', day: 'Friday', shiftTime: '11:00 - 16:00 (Lunch Shift)', forecastedDemand: 'MODERATE', hourlyWageINR: 220, totalHours: 5, status: 'CONFIRMED' }
];

export default function LaborSchedulingPage() {
  const [shifts, setShifts] = useState<ScheduledShift[]>(INITIAL_SHIFTS);
  const [broadcastSent, setBroadcastSent] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const totalHours = shifts.reduce((acc, s) => acc + s.totalHours, 0);
  const totalCost = shifts.reduce((acc, s) => acc + (s.totalHours * s.hourlyWageINR), 0);

  const handleAutoOptimize = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      setIsOptimizing(false);
      alert('AI Labor Optimizer applied! Demand curve matched with zero overtime infractions.');
    }, 800);
  };

  const handleBroadcast = () => {
    setBroadcastSent(true);
    setTimeout(() => setBroadcastSent(false), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Users className="w-7 h-7 text-indigo-400" /> AI Predictive Labor Scheduling & Shift Optimizer
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Machine Learning Workforce AI
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Algorithmic shift matching with forecasted hourly covers, overtime penalty prevention, and instant WhatsApp roster dispatch.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleAutoOptimize}
            disabled={isOptimizing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 transition"
          >
            <Sparkles className="w-4 h-4" /> {isOptimizing ? 'Optimizing Matrix...' : 'AI Auto-Schedule'}
          </button>
          <button
            onClick={handleBroadcast}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <Send className="w-4 h-4" /> Broadcast via WhatsApp
          </button>
        </div>
      </div>

      {/* Broadcast Toast */}
      {broadcastSent && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          Roster successfully dispatched to all 5 staff WhatsApp numbers with digital acknowledgement links!
        </div>
      )}

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Labor-to-Sales Target</span>
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">18.2% Target</div>
            <div className="text-xs text-emerald-400 mt-1 font-medium">
              Within optimal 18-20% benchmark
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Scheduled Cost</span>
            <DollarSign className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-indigo-300">₹{totalCost.toLocaleString('en-IN')}</div>
            <div className="text-xs text-slate-400 mt-1">
              {totalHours} Rostered Labor Hours
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overtime Infractions</span>
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-300">0 Alerts</div>
            <div className="text-xs text-emerald-400/90 mt-1">
              100% legal labor compliance
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Staff Confirmations</span>
            <UserCheck className="w-5 h-5 text-purple-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-purple-300">80% Confirmed</div>
            <div className="text-xs text-slate-400 mt-1">
              4 of 5 staff accepted shift
            </div>
          </div>
        </div>
      </div>

      {/* Shifts Table */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Shift Schedule Roster (Upcoming Weekend Rush)</h2>
            <p className="text-xs text-slate-400 mt-0.5">Optimized staffing curve matching 8 PM - 10 PM peak covers</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-6">Employee Name</th>
                <th className="py-3.5 px-6">Assigned Role</th>
                <th className="py-3.5 px-6">Day & Shift Window</th>
                <th className="py-3.5 px-6 text-center">Forecasted Rush</th>
                <th className="py-3.5 px-6 text-right">Wage (INR)</th>
                <th className="py-3.5 px-6 text-center">Roster Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {shifts.map((shift) => (
                <tr key={shift.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-4 px-6 font-semibold text-white">
                    {shift.employeeName}
                  </td>
                  <td className="py-4 px-6">
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                      {shift.role}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-slate-300 font-mono text-xs">
                    {shift.day} • {shift.shiftTime} ({shift.totalHours} hrs)
                  </td>
                  <td className="py-4 px-6 text-center">
                    {shift.forecastedDemand === 'PEAK' && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        🔥 Peak Rush
                      </span>
                    )}
                    {shift.forecastedDemand === 'HIGH' && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        ⚡ High
                      </span>
                    )}
                    {shift.forecastedDemand === 'MODERATE' && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        Moderate
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right font-medium text-emerald-400">
                    ₹{shift.totalHours * shift.hourlyWageINR}
                  </td>
                  <td className="py-4 px-6 text-center">
                    {shift.status === 'CONFIRMED' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Clock className="w-3.5 h-3.5" /> Pending Acknowledgment
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
