'use client';

import React, { useState } from 'react';
import { 
  Building2, 
  DollarSign, 
  TrendingUp, 
  FileText, 
  Download, 
  CheckCircle2, 
  Clock, 
  Percent, 
  AlertCircle,
  ArrowUpRight,
  ShieldCheck,
  Building,
  Layers,
  ChevronRight
} from 'lucide-react';

interface FranchiseOutlet {
  id: string;
  name: string;
  code: string;
  brand: string;
  franchisee: string;
  city: string;
  grossSales: number;
  royaltyRate: number; // e.g. 0.05
  brandFundRate: number; // e.g. 0.02
  royaltyDue: number;
  brandFundDue: number;
  totalDue: number;
  status: 'SETTLED' | 'PENDING' | 'OVERDUE';
  slaScore: number;
  lastSettlement: string;
}

const INITIAL_OUTLETS: FranchiseOutlet[] = [
  {
    id: 'OUT-001',
    name: 'Gourmet Bistro - Bandra West',
    code: 'BOM-01',
    brand: 'The Artisanal Fork',
    franchisee: 'Apex Hospitality LLP',
    city: 'Mumbai',
    grossSales: 3850000,
    royaltyRate: 0.05,
    brandFundRate: 0.02,
    royaltyDue: 192500,
    brandFundDue: 77000,
    totalDue: 269500,
    status: 'SETTLED',
    slaScore: 98.4,
    lastSettlement: '2026-09-01'
  },
  {
    id: 'OUT-002',
    name: 'Gourmet Bistro - Indiranagar',
    code: 'BLR-04',
    brand: 'The Artisanal Fork',
    franchisee: 'Southern Epicure Enterprises',
    city: 'Bengaluru',
    grossSales: 4620000,
    royaltyRate: 0.05,
    brandFundRate: 0.02,
    royaltyDue: 231000,
    brandFundDue: 92400,
    totalDue: 323400,
    status: 'PENDING',
    slaScore: 95.8,
    lastSettlement: '2026-08-01'
  },
  {
    id: 'OUT-003',
    name: 'Fire & Stone Smokehouse',
    code: 'DEL-02',
    brand: 'Smoke & Spice Co.',
    franchisee: 'Vanguard F&B Ventures',
    city: 'New Delhi',
    grossSales: 2980000,
    royaltyRate: 0.06,
    brandFundRate: 0.02,
    royaltyDue: 178800,
    brandFundDue: 59600,
    totalDue: 238400,
    status: 'PENDING',
    slaScore: 91.2,
    lastSettlement: '2026-08-15'
  },
  {
    id: 'OUT-004',
    name: 'Artisanal Bakery & Cafe',
    code: 'PUN-01',
    brand: 'Crust & Crumb',
    franchisee: 'Skyline Gourmet Group',
    city: 'Pune',
    grossSales: 1820000,
    royaltyRate: 0.045,
    brandFundRate: 0.015,
    royaltyDue: 81900,
    brandFundDue: 27300,
    totalDue: 109200,
    status: 'OVERDUE',
    slaScore: 84.5,
    lastSettlement: '2026-07-20'
  },
  {
    id: 'OUT-005',
    name: 'Fire & Stone Express',
    code: 'HYD-03',
    brand: 'Smoke & Spice Co.',
    franchisee: 'Apex Hospitality LLP',
    city: 'Hyderabad',
    grossSales: 3140000,
    royaltyRate: 0.06,
    brandFundRate: 0.02,
    royaltyDue: 188400,
    brandFundDue: 62800,
    totalDue: 251200,
    status: 'SETTLED',
    slaScore: 97.1,
    lastSettlement: '2026-09-05'
  }
];

export default function FranchisePage() {
  const [outlets, setOutlets] = useState<FranchiseOutlet[]>(INITIAL_OUTLETS);
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [invoicingModal, setInvoicingModal] = useState<FranchiseOutlet | null>(null);
  const [invoiceSent, setInvoiceSent] = useState(false);

  const brands = ['ALL', 'The Artisanal Fork', 'Smoke & Spice Co.', 'Crust & Crumb'];

  const filteredOutlets = selectedBrand === 'ALL' 
    ? outlets 
    : outlets.filter(o => o.brand === selectedBrand);

  const totalGrossSales = filteredOutlets.reduce((acc, o) => acc + o.grossSales, 0);
  const totalRoyalties = filteredOutlets.reduce((acc, o) => acc + o.royaltyDue, 0);
  const totalBrandFund = filteredOutlets.reduce((acc, o) => acc + o.brandFundDue, 0);
  const totalReceivable = filteredOutlets.filter(o => o.status !== 'SETTLED').reduce((acc, o) => acc + o.totalDue, 0);

  const handleSettle = (id: string) => {
    setOutlets(prev => prev.map(o => o.id === id ? { ...o, status: 'SETTLED', lastSettlement: 'Just now' } : o));
    setInvoicingModal(null);
  };

  const handleGenerateInvoice = (outlet: FranchiseOutlet) => {
    setInvoicingModal(outlet);
    setInvoiceSent(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Building2 className="w-7 h-7 text-indigo-400" /> Franchise Royalty & Multi-Brand Settlement
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              HQ Financial Master
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Multi-brand royalty aggregation, centralized marketing fund reconciliation, and automated GST-compliant billing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select 
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            {brands.map(b => (
              <option key={b} value={b}>{b === 'ALL' ? '🏢 All Franchise Brands' : b}</option>
            ))}
          </select>
          <button 
            onClick={() => alert('Exporting all royalty schedules as CSV/XLSX for HQ ERP integration...')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition"
          >
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Gross Network Sales</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">₹{(totalGrossSales / 100000).toFixed(2)} Lakhs</div>
            <div className="text-xs text-emerald-400 flex items-center gap-1 mt-1 font-medium">
              <ArrowUpRight className="w-3.5 h-3.5" /> +14.2% vs previous cycle
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Royalties Accrued</span>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-indigo-300">₹{totalRoyalties.toLocaleString('en-IN')}</div>
            <div className="text-xs text-slate-400 mt-1">
              Standard 5% - 6% Brand Licensing
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">National Ad/Brand Fund</span>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-purple-300">₹{totalBrandFund.toLocaleString('en-IN')}</div>
            <div className="text-xs text-slate-400 mt-1">
              2.0% Pooled Global Campaign Fund
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Unsettled Balance</span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-300">₹{totalReceivable.toLocaleString('en-IN')}</div>
            <div className="text-xs text-amber-400/90 mt-1">
              {filteredOutlets.filter(o => o.status === 'OVERDUE').length} Outlets Overdue
            </div>
          </div>
        </div>
      </div>

      {/* Outlets Table & Settlement Console */}
      <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-xl shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Franchise Outlets & Settlement Ledger</h2>
            <p className="text-xs text-slate-400 mt-0.5">Automated calculation of royalties, brand fees, and QA SLA ratings</p>
          </div>
          <span className="text-xs font-medium text-slate-400">
            Showing {filteredOutlets.length} Active Franchisees
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-6">Outlet & Franchisee</th>
                <th className="py-3.5 px-6">Brand Portfolio</th>
                <th className="py-3.5 px-6 text-right">Gross Sales (M-T-D)</th>
                <th className="py-3.5 px-6 text-right">Royalty + Brand Fund</th>
                <th className="py-3.5 px-6 text-center">QA Audit SLA</th>
                <th className="py-3.5 px-6 text-center">Settlement Status</th>
                <th className="py-3.5 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {filteredOutlets.map((outlet) => (
                <tr key={outlet.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-4 px-6">
                    <div className="font-semibold text-white">{outlet.name}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">{outlet.code}</span>
                      <span>{outlet.franchisee}</span>
                      <span>•</span>
                      <span>{outlet.city}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700/60">
                      {outlet.brand}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right font-medium text-slate-200">
                    ₹{outlet.grossSales.toLocaleString('en-IN')}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="font-semibold text-indigo-300">₹{outlet.totalDue.toLocaleString('en-IN')}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Royalty: ₹{outlet.royaltyDue.toLocaleString('en-IN')} | Fund: ₹{outlet.brandFundDue.toLocaleString('en-IN')}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <ShieldCheck className="w-3.5 h-3.5" /> {outlet.slaScore}%
                    </div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    {outlet.status === 'SETTLED' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Settled
                      </span>
                    )}
                    {outlet.status === 'PENDING' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Clock className="w-3.5 h-3.5" /> Due in 5 days
                      </span>
                    )}
                    {outlet.status === 'OVERDUE' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse">
                        <AlertCircle className="w-3.5 h-3.5" /> Overdue
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => handleGenerateInvoice(outlet)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-indigo-200 text-xs font-medium border border-indigo-500/30 transition"
                    >
                      <FileText className="w-3.5 h-3.5" /> Settle / Invoice
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice & Settlement Modal */}
      {invoicingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Franchise Royalty Invoice</h3>
              </div>
              <button
                onClick={() => setInvoicingModal(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>OUTLET CODE: <strong className="text-slate-200">{invoicingModal.code}</strong></span>
                  <span>GSTIN: <strong className="text-slate-200">27AABCT3514Q1Z8</strong></span>
                </div>
                <div className="text-base font-bold text-white">{invoicingModal.name}</div>
                <div className="text-xs text-indigo-400">{invoicingModal.franchisee}</div>
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between text-slate-300">
                  <span>Gross Monthly Sales (POS Audited)</span>
                  <span className="font-semibold text-white">₹{invoicingModal.grossSales.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Franchise Royalty ({(invoicingModal.royaltyRate * 100).toFixed(1)}%)</span>
                  <span className="font-semibold text-indigo-300">₹{invoicingModal.royaltyDue.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>National Brand & Marketing ({(invoicingModal.brandFundRate * 100).toFixed(1)}%)</span>
                  <span className="font-semibold text-purple-300">₹{invoicingModal.brandFundDue.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>GST on Licensing Fees (18%)</span>
                  <span className="font-semibold text-slate-300">₹{(invoicingModal.totalDue * 0.18).toLocaleString('en-IN')}</span>
                </div>
                <div className="border-t border-slate-800 pt-3 flex justify-between text-base font-bold">
                  <span className="text-white">Total Net Settlement Due</span>
                  <span className="text-emerald-400">₹{(invoicingModal.totalDue * 1.18).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {invoiceSent ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  E-Invoice dispatched to franchisee finance portal & registered GST mail!
                </div>
              ) : null}

              <div className="pt-3 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setInvoiceSent(true)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Dispatch PDF Invoice
                </button>
                <button
                  onClick={() => handleSettle(invoicingModal.id)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                  <CheckCircle2 className="w-4 h-4" /> Mark as Settled
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
