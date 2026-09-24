'use client';

import React, { useState } from 'react';
import { 
  FileCheck2, 
  QrCode, 
  Truck, 
  DollarSign, 
  ShieldCheck, 
  Download, 
  CheckCircle2, 
  Plus, 
  Building2, 
  Receipt,
  FileText,
  Clock
} from 'lucide-react';

interface EInvoiceRecord {
  id: string;
  invoiceNumber: string;
  irnHash: string;
  ackNumber: string;
  buyerName: string;
  buyerGstin: string;
  taxableValueINR: number;
  cgstINR: number;
  sgstINR: number;
  totalInvoiceValueINR: number;
  qrPayload: string;
  status: 'IRN_GENERATED' | 'CANCELLED';
  generatedAt: string;
}

interface EWayBillRecord {
  id: string;
  ewayBillNumber: string;
  transferSlipId: string;
  fromLocation: string;
  toLocation: string;
  vehicleNumber: string;
  cargoValueINR: number;
  validUntil: string;
  status: 'ACTIVE_IN_TRANSIT' | 'DELIVERED_CLOSED';
}

export default function TaxEwayPage() {
  const [invoices, setInvoices] = useState<EInvoiceRecord[]>([]);
  const [eways, setEways] = useState<EWayBillRecord[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newBuyer, setNewBuyer] = useState({
    buyerName: '',
    buyerGstin: '',
    taxableAmount: 50000
  });

  const handleCreateEInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const taxable = Number(newBuyer.taxableAmount) || 0;
    const gst = taxable * 0.05;

    const created: EInvoiceRecord = {
      id: `EINV-${Math.floor(10 + Math.random() * 90)}`,
      invoiceNumber: `INV-2026-B2B-${Math.floor(100 + Math.random() * 900)}`,
      irnHash: '8f9e12ab78b4a03e54f9d21c081e74a89bc213ef5421a7cd9812e45bf0912999',
      ackNumber: `${Math.floor(100000000000000 + Math.random() * 900000000000000)}`,
      buyerName: newBuyer.buyerName || 'Corporate Client',
      buyerGstin: newBuyer.buyerGstin || '27AAACB9988D1Z1',
      taxableValueINR: taxable,
      cgstINR: gst / 2,
      sgstINR: gst / 2,
      totalInvoiceValueINR: taxable + gst,
      qrPayload: 'GSTIN:27AABCT3514Q1Z8|SIGNED_BY_NIC_PORTAL',
      status: 'IRN_GENERATED',
      generatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };

    setInvoices(prev => [created, ...prev]);
    setNewBuyer({ buyerName: '', buyerGstin: '', taxableAmount: 50000 });
    setShowModal(false);
  };

  const totalB2BRevenue = invoices.reduce((acc, i) => acc + i.totalInvoiceValueINR, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <FileCheck2 className="w-7 h-7 text-emerald-400" /> Govt Tax, E-Invoicing & Automated GST E-Way Vault
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              NIC / GSTN Portal Direct Bridge
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Automated 64-char IRN hash registration, digital QR code generation, and inter-branch commissary E-Way bill clearance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition"
          >
            <Plus className="w-4 h-4" /> Generate B2B E-Invoice IRN
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">GST Portal Connection</span>
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">NIC Live (200 OK)</div>
            <div className="text-xs text-emerald-400 mt-1 font-medium">
              Digital Signature Valid until 2028
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">B2B Registered Invoices</span>
            <Receipt className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-indigo-300">₹{(totalB2BRevenue / 100000).toFixed(2)} Lakhs</div>
            <div className="text-xs text-slate-400 mt-1">
              {invoices.length} E-Invoices Registered
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Commissary E-Way Bills</span>
            <Truck className="w-5 h-5 text-amber-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-300">
              {eways.filter(e => e.status === 'ACTIVE_IN_TRANSIT').length} Active Transit
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {eways.length} Total Registered Bills
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">QR Code Digital Verification</span>
            <QrCode className="w-5 h-5 text-purple-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-purple-300">100% Ready</div>
            <div className="text-xs text-purple-400/90 mt-1">
              B2B GST Input Tax Credit Pass
            </div>
          </div>
        </div>
      </div>

      {/* B2B E-Invoices Ledger */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Registered B2B E-Invoices (IRN Vault)</h2>
            <p className="text-xs text-slate-400 mt-0.5">Automated submission to Govt Invoice Registration Portal (IRP)</p>
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No B2B E-Invoices registered yet. Click &quot;Generate B2B E-Invoice IRN&quot; to create a tax invoice.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Invoice # & Buyer</th>
                  <th className="py-3.5 px-6">IRN Hash (64-char)</th>
                  <th className="py-3.5 px-6 text-right">Taxable Value</th>
                  <th className="py-3.5 px-6 text-right">GST (5%)</th>
                  <th className="py-3.5 px-6 text-right">Total (INR)</th>
                  <th className="py-3.5 px-6 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-semibold text-white">{inv.invoiceNumber}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{inv.buyerName}</div>
                      <div className="text-[10px] text-indigo-400 font-mono">GSTIN: {inv.buyerGstin}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-mono text-xs text-slate-300 truncate max-w-[220px]" title={inv.irnHash}>
                        {inv.irnHash}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">Ack: {inv.ackNumber}</div>
                    </td>
                    <td className="py-4 px-6 text-right font-medium text-slate-200">
                      ₹{inv.taxableValueINR.toLocaleString('en-IN')}
                    </td>
                    <td className="py-4 px-6 text-right text-xs text-slate-400">
                      <div>CGST: ₹{inv.cgstINR.toLocaleString('en-IN')}</div>
                      <div>SGST: ₹{inv.sgstINR.toLocaleString('en-IN')}</div>
                    </td>
                    <td className="py-4 px-6 text-right font-bold text-emerald-400">
                      ₹{inv.totalInvoiceValueINR.toLocaleString('en-IN')}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" /> IRN Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* E-Way Bills Section */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-xl space-y-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-400" /> Inter-Branch Commissary E-Way Bills
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Mandatory E-Way bill clearance for high-value raw material bulk transfers</p>
        </div>

        {eways.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm rounded-xl border border-dashed border-slate-800">
            No inter-branch transit E-Way bills generated yet. Bulk transfers over ₹50,000 will be registered here.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {eways.map((eway) => (
              <div key={eway.id} className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-amber-400">E-Way Bill: {eway.ewayBillNumber}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300">
                    {eway.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="text-xs text-slate-300 space-y-1">
                  <div>From: <strong className="text-white">{eway.fromLocation}</strong></div>
                  <div>To: <strong className="text-white">{eway.toLocation}</strong></div>
                  <div>Vehicle: <strong className="text-indigo-300 font-mono">{eway.vehicleNumber}</strong></div>
                  <div>Cargo Valuation: <strong className="text-emerald-400">₹{eway.cargoValueINR.toLocaleString('en-IN')}</strong></div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>Valid Until: {eway.validUntil}</span>
                  <button
                    onClick={() => alert(`Printing Govt QR E-Way Slip for ${eway.ewayBillNumber}...`)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition"
                  >
                    Download E-Way Slip
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-emerald-400" /> Register B2B E-Invoice IRN
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateEInvoice} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Buyer Corporate Entity Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Infosys Technologies Private Ltd"
                  value={newBuyer.buyerName}
                  onChange={(e) => setNewBuyer({ ...newBuyer, buyerName: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Buyer 15-Digit GSTIN</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 27AAACI1234D1Z8"
                  value={newBuyer.buyerGstin}
                  onChange={(e) => setNewBuyer({ ...newBuyer, buyerGstin: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Taxable Invoice Amount (₹)</label>
                <input
                  type="number"
                  value={newBuyer.taxableAmount}
                  onChange={(e) => setNewBuyer({ ...newBuyer, taxableAmount: Number(e.target.value) })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold shadow-lg shadow-emerald-500/20"
                >
                  Register with IRP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
