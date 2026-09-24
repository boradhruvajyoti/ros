'use client';

import { useState } from 'react';
import {
  ArrowLeftRight, Truck, Plus, CheckCircle2, Clock,
  Package, Search, Building2, ChevronRight, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TransferItem {
  name: string;
  qty: number;
  unit: string;
}

interface StockTransfer {
  id: string;
  transferNumber: string;
  sourceBranch: string;
  destBranch: string;
  status: 'IN_TRANSIT' | 'COMPLETED' | 'REQUESTED';
  itemCount: number;
  totalUnits: number;
  dispatchedAt: string;
  driverName: string;
  expectedDelivery?: string;
  receivedAt?: string;
  items: TransferItem[];
}

const initialTransfers: StockTransfer[] = [
  {
    id: 'TRF-089',
    transferNumber: 'TRF-2026-089',
    sourceBranch: 'Central Commissary & Warehouse',
    destBranch: 'Main Branch - Indiranagar',
    status: 'IN_TRANSIT',
    itemCount: 4,
    totalUnits: 140,
    dispatchedAt: 'Today, 10:30 AM',
    driverName: 'Ramesh Transport (KA-01-AB-1234)',
    expectedDelivery: 'Today, 01:30 PM',
    items: [
      { name: 'Fresh Malai Paneer', qty: 25, unit: 'KG' },
      { name: 'Amul Salted Butter', qty: 20, unit: 'KG' },
      { name: 'Royal Basmati Rice XXL', qty: 80, unit: 'KG' },
      { name: 'House Special Garam Masala', qty: 15, unit: 'KG' },
    ],
  },
  {
    id: 'TRF-088',
    transferNumber: 'TRF-2026-088',
    sourceBranch: 'Main Branch - Indiranagar',
    destBranch: 'Koramangala Outlet',
    status: 'COMPLETED',
    itemCount: 2,
    totalUnits: 45,
    dispatchedAt: 'Yesterday, 04:00 PM',
    receivedAt: 'Yesterday, 06:15 PM',
    driverName: 'QuickLogistics Van 4',
    items: [
      { name: 'Farm Tomatoes', qty: 30, unit: 'KG' },
      { name: 'Red Onions', qty: 15, unit: 'KG' },
    ],
  },
  {
    id: 'TRF-087',
    transferNumber: 'TRF-2026-087',
    sourceBranch: 'Central Commissary & Warehouse',
    destBranch: 'Whitefield Outlet',
    status: 'COMPLETED',
    itemCount: 6,
    totalUnits: 210,
    dispatchedAt: '2 days ago',
    receivedAt: '2 days ago',
    driverName: 'BlueDart Freight',
    items: [
      { name: 'Farm Fresh Chicken (Boneless)', qty: 60, unit: 'KG' },
      { name: 'Cooking Cream', qty: 30, unit: 'L' },
      { name: 'Royal Basmati Rice XXL', qty: 120, unit: 'KG' },
    ],
  },
];

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<StockTransfer[]>(initialTransfers);
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(initialTransfers[0]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newSource, setNewSource] = useState('Central Commissary & Warehouse');
  const [newDest, setNewDest] = useState('Main Branch - Indiranagar');

  const handleReceive = (id: string) => {
    setTransfers((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: 'COMPLETED', receivedAt: 'Just now' } : t
      )
    );
    if (selectedTransfer?.id === id) {
      setSelectedTransfer((prev) => prev ? { ...prev, status: 'COMPLETED', receivedAt: 'Just now' } : null);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const newTrf: StockTransfer = {
      id: `TRF-${Math.floor(100 + Math.random() * 900)}`,
      transferNumber: `TRF-2026-${Math.floor(100 + Math.random() * 900)}`,
      sourceBranch: newSource,
      destBranch: newDest,
      status: 'IN_TRANSIT',
      itemCount: 3,
      totalUnits: 75,
      dispatchedAt: 'Just now',
      driverName: 'Internal Logistics Driver',
      expectedDelivery: 'In 2 hours',
      items: [
        { name: 'Fresh Malai Paneer', qty: 20, unit: 'KG' },
        { name: 'Farm Tomatoes', qty: 35, unit: 'KG' },
        { name: 'Cooking Cream', qty: 20, unit: 'L' },
      ],
    };
    setTransfers([newTrf, ...transfers]);
    setSelectedTransfer(newTrf);
    setShowNewModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-primary" />
            Inter-Branch Stock Transfers & Commissary
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Centralized kitchen inventory dispatch, transit tracking and warehouse requisition
          </p>
        </div>
        <Button onClick={() => setShowNewModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Transfer Request
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Truck className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase">In-Transit Shipments</p>
            <p className="text-2xl font-black text-foreground">
              {transfers.filter((t) => t.status === 'IN_TRANSIT').length}
            </p>
          </div>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase">Completed Transfers (Week)</p>
            <p className="text-2xl font-black text-foreground">
              {transfers.filter((t) => t.status === 'COMPLETED').length + 8}
            </p>
          </div>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase">Active Outlets Connected</p>
            <p className="text-2xl font-black text-foreground">3 Branches</p>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Transfers List */}
        <div className="lg:col-span-6 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Transfer Manifests ({transfers.length})
          </h2>
          <div className="space-y-3">
            {transfers.map((t) => {
              const isSelected = selectedTransfer?.id === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTransfer(t)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border bg-card/70 hover:border-border/80'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{t.transferNumber}</span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            t.status === 'IN_TRANSIT'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {t.status === 'IN_TRANSIT' ? 'IN TRANSIT' : 'RECEIVED'}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" />
                        <span className="font-medium text-foreground">{t.sourceBranch}</span>
                        <span>→</span>
                        <span className="font-medium text-primary">{t.destBranch}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{t.itemCount} items ({t.totalUnits} total units)</span>
                    <span>Dispatched: {t.dispatchedAt}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Transfer Detail Card */}
        <div className="lg:col-span-6">
          {selectedTransfer ? (
            <div className="p-6 rounded-2xl border border-border bg-card/80 backdrop-blur sticky top-6 space-y-6">
              <div className="flex items-start justify-between pb-4 border-b border-border">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-foreground">{selectedTransfer.transferNumber}</h3>
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                        selectedTransfer.status === 'IN_TRANSIT'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {selectedTransfer.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Vehicle / Carrier: {selectedTransfer.driverName}</p>
                </div>

                {selectedTransfer.status === 'IN_TRANSIT' && (
                  <Button
                    size="sm"
                    onClick={() => handleReceive(selectedTransfer.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Confirm Goods Received
                  </Button>
                )}
              </div>

              {/* Route Info */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-background/50 border border-border/50">
                <div>
                  <p className="text-[11px] text-muted-foreground font-semibold uppercase">Origin Location</p>
                  <p className="text-sm font-bold text-foreground mt-1">{selectedTransfer.sourceBranch}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedTransfer.dispatchedAt}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-semibold uppercase">Destination Branch</p>
                  <p className="text-sm font-bold text-primary mt-1">{selectedTransfer.destBranch}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedTransfer.receivedAt ? `Received: ${selectedTransfer.receivedAt}` : `ETA: ${selectedTransfer.expectedDelivery}`}
                  </p>
                </div>
              </div>

              {/* Manifest Items Table */}
              <div>
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                  Transferred Commodities & Raw Materials
                </h4>
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                      <tr>
                        <th className="p-3">Ingredient / Item</th>
                        <th className="p-3 text-right">Quantity</th>
                        <th className="p-3 text-right">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {selectedTransfer.items.map((item, i) => (
                        <tr key={i} className="hover:bg-muted/20">
                          <td className="p-3 font-medium text-foreground">{item.name}</td>
                          <td className="p-3 text-right font-bold text-primary">{item.qty}</td>
                          <td className="p-3 text-right text-muted-foreground">{item.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-2xl border border-dashed border-border text-center text-muted-foreground">
              Select a transfer manifest on the left to view cargo details
            </div>
          )}
        </div>
      </div>

      {/* New Transfer Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-primary" />
              Dispatch Stock Requisition
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Source Warehouse / Kitchen</label>
                <select
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  className="w-full mt-1.5 h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Central Commissary & Warehouse">Central Commissary & Warehouse</option>
                  <option value="Main Branch - Indiranagar">Main Branch - Indiranagar</option>
                  <option value="Koramangala Outlet">Koramangala Outlet</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Destination Branch</label>
                <select
                  value={newDest}
                  onChange={(e) => setNewDest(e.target.value)}
                  className="w-full mt-1.5 h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Main Branch - Indiranagar">Main Branch - Indiranagar</option>
                  <option value="Koramangala Outlet">Koramangala Outlet</option>
                  <option value="Whitefield Outlet">Whitefield Outlet</option>
                </select>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground">
                📦 Standard requisition batch includes: Malai Paneer (20 KG), Farm Tomatoes (35 KG), Cooking Cream (20 L).
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowNewModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Dispatch Shipment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
