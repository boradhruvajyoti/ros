'use client';

import React, { useState } from 'react';
import { 
  Leaf, 
  Zap, 
  Flame, 
  Recycle, 
  TrendingDown, 
  Award, 
  FileText, 
  Download, 
  CheckCircle2, 
  AlertTriangle,
  Layers,
  BarChart3,
  Calendar
} from 'lucide-react';

interface ApplianceLog {
  id: string;
  name: string;
  category: 'COOKING' | 'REFRIGERATION' | 'HVAC' | 'LIGHTING';
  powerKWh: number;
  gasKg: number;
  costINR: number;
  status: 'OPTIMAL' | 'ELEVATED' | 'OFF';
}

interface WasteLog {
  date: string;
  foodWasteKg: number;
  compostConvertedKg: number;
  oilRecycledLiters: number;
  co2OffsetKg: number;
}

const APPLIANCES: ApplianceLog[] = [
  { id: 'APP-01', name: 'Rational Combi Oven #1', category: 'COOKING', powerKWh: 18.4, gasKg: 0, costINR: 184, status: 'OPTIMAL' },
  { id: 'APP-02', name: 'Tandoor & Clay Oven Burner', category: 'COOKING', powerKWh: 0, gasKg: 6.2, costINR: 496, status: 'OPTIMAL' },
  { id: 'APP-03', name: 'Walk-in Freezer Compressor', category: 'REFRIGERATION', powerKWh: 32.1, gasKg: 0, costINR: 321, status: 'OPTIMAL' },
  { id: 'APP-04', name: 'Kitchen Hood Exhaust & Scrubber', category: 'HVAC', powerKWh: 24.5, gasKg: 0, costINR: 245, status: 'ELEVATED' },
  { id: 'APP-05', name: 'Double Well Deep Fryer #1', category: 'COOKING', powerKWh: 14.8, gasKg: 0, costINR: 148, status: 'OPTIMAL' }
];

const WASTE_LOGS: WasteLog[] = [
  { date: '2026-09-22', foodWasteKg: 14.2, compostConvertedKg: 11.5, oilRecycledLiters: 18, co2OffsetKg: 38.6 },
  { date: '2026-09-21', foodWasteKg: 16.8, compostConvertedKg: 13.0, oilRecycledLiters: 20, co2OffsetKg: 42.1 },
  { date: '2026-09-20', foodWasteKg: 12.5, compostConvertedKg: 10.2, oilRecycledLiters: 15, co2OffsetKg: 31.4 },
  { date: '2026-09-19', foodWasteKg: 15.0, compostConvertedKg: 12.4, oilRecycledLiters: 16, co2OffsetKg: 36.2 }
];

export default function SustainabilityPage() {
  const [appliances, setAppliances] = useState<ApplianceLog[]>(APPLIANCES);
  const [wasteLogs, setWasteLogs] = useState<WasteLog[]>(WASTE_LOGS);

  const totalKWh = appliances.reduce((acc, a) => acc + a.powerKWh, 0);
  const totalGas = appliances.reduce((acc, a) => acc + a.gasKg, 0);
  const totalCost = appliances.reduce((acc, a) => acc + a.costINR, 0);
  const totalCO2 = Math.round((totalKWh * 0.82) + (totalGas * 3.0));

  const totalWaste = wasteLogs.reduce((acc, w) => acc + w.foodWasteKg, 0);
  const totalCompost = wasteLogs.reduce((acc, w) => acc + w.compostConvertedKg, 0);
  const diversionRate = Math.round((totalCompost / totalWaste) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Leaf className="w-7 h-7 text-emerald-400" /> Kitchen Energy & Carbon ESG Vault
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Gold Green Certified (A+)
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time equipment kWh/gas energy tracking, organic waste-to-compost yields, and Scope 1/2 carbon audit logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => alert('Exporting ISO 14001 & ESG Green Kitchen Compliance Certificate...')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <Download className="w-4 h-4" /> Export ESG Report
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Electricity Usage (Today)</span>
            <Zap className="w-5 h-5 text-amber-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">{totalKWh.toFixed(1)} kWh</div>
            <div className="text-xs text-emerald-400 mt-1 font-medium flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5" /> -8.4% vs kitchen benchmark
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Commercial LPG Burn</span>
            <Flame className="w-5 h-5 text-orange-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-orange-300">{totalGas.toFixed(1)} kg</div>
            <div className="text-xs text-slate-400 mt-1">
              Tandoor induction assist enabled
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Daily Carbon Footprint</span>
            <Leaf className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-300">{totalCO2} kg CO2e</div>
            <div className="text-xs text-emerald-400/90 mt-1 font-medium">
              Neutralized via biogas compost
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Waste Diversion Rate</span>
            <Recycle className="w-5 h-5 text-teal-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-teal-300">{diversionRate}% Diverted</div>
            <div className="text-xs text-slate-400 mt-1">
              {totalCompost.toFixed(1)} kg converted to organic fertilizer
            </div>
          </div>
        </div>
      </div>

      {/* Equipment Energy Breakdown Table */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Appliance Sub-Metered Energy Telemetry</h2>
            <p className="text-xs text-slate-400 mt-0.5">Real-time smart breaker telemetry monitoring power draw & carbon footprint</p>
          </div>
          <span className="text-xs font-medium text-slate-400">
            Total Daily Energy Cost: <strong className="text-white">₹{totalCost}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-6">Equipment Name</th>
                <th className="py-3.5 px-6">Category</th>
                <th className="py-3.5 px-6 text-right">Power (kWh)</th>
                <th className="py-3.5 px-6 text-right">LPG Gas (kg)</th>
                <th className="py-3.5 px-6 text-right">Est. Cost (₹)</th>
                <th className="py-3.5 px-6 text-center">Efficiency Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {appliances.map((app) => (
                <tr key={app.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-4 px-6 font-semibold text-white">
                    {app.name}
                  </td>
                  <td className="py-4 px-6">
                    <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                      {app.category}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right font-mono font-medium text-slate-200">
                    {app.powerKWh > 0 ? `${app.powerKWh} kWh` : '—'}
                  </td>
                  <td className="py-4 px-6 text-right font-mono font-medium text-orange-300">
                    {app.gasKg > 0 ? `${app.gasKg} kg` : '—'}
                  </td>
                  <td className="py-4 px-6 text-right font-medium text-emerald-400">
                    ₹{app.costINR}
                  </td>
                  <td className="py-4 px-6 text-center">
                    {app.status === 'OPTIMAL' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Optimal
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5" /> Elevated Load
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Waste Audit & Oil Recycling Ledger */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Recycle className="w-5 h-5 text-teal-400" /> Food Waste Composting & Biofuel Recycling Ledger
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Audit trail of kitchen organics converted to bio-compost and used frying oil handed to biodiesel recyclers</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {wasteLogs.map((log, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono font-bold text-slate-300">{log.date}</span>
                <span className="text-emerald-400 font-semibold">+{log.co2OffsetKg}kg CO2 Offset</span>
              </div>
              <div className="text-xs text-slate-300 pt-1">
                <div>• Food Waste: <strong className="text-white">{log.foodWasteKg} kg</strong></div>
                <div>• Compost Converted: <strong className="text-teal-300">{log.compostConvertedKg} kg</strong></div>
                <div>• Used Oil Recycled: <strong className="text-amber-300">{log.oilRecycledLiters} L</strong></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
