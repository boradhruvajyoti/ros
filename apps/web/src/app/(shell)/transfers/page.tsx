'use client';

import { useState } from 'react';
import {
  ArrowLeftRight, Truck, Plus, CheckCircle2, Clock,
  Package, Search, Building2, ChevronRight, FileText, Trash2
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

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newSource, setNewSource] = useState('');
  const [newDest, setNewDest] = useState('');
  const [newDriver, setNewDriver] = useState('');
  const [modalItems, setModalItems] = useState<TransferItem[]>([{ name: '', qty: 1, unit: 'KG' }]);

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

  const handleAddItemRow = () => {
    setModalItems([...modalItems, { name: '', qty: 1, unit: 'KG' }]);
  };

  const handleRemoveItemRow = (index: number) => {
    setModalItems(modalItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof TransferItem, value: any) => {
    const updated = [...modalItems];
    updated[index] = { ...updated[index], [field]: value };
    setModalItems(updated);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSource.trim() || !newDest.trim()) return;

    const validItems = modalItems.filter((i) => i.name.trim().length > 0);
    const totalUnits = validItems.reduce((acc, it) => acc + (Number(it.qty) || 0), 0);

    const newTrf: StockTransfer = {
      id: `TRF-${Date.now().toString().slice(-4)}`,
      transferNumber: `TRF-2026-${Math.floor(100 + Math.random() * 900)}`,
      sourceBranch: newSource.trim(),
      destBranch: newDest.trim(),
      status: 'IN_TRANSIT',
      itemCount: validItems.length,
      totalUnits,
      dispatchedAt: 'Just now',
      driverName: newDriver.trim() || 'Internal Logistics',
      expectedDelivery: 'In transit',
      items: validItems.length > 0 ? validItems : [{ name: 'Kitchen Stock Batch', qty: 1, unit: 'PKG' }],
    };

    setTransfers([newTrf, ...transfers]);
    setSelectedTransfer(newTrf);
    setNewSource('');
    setNewDest('');
    setNewDriver('');
    setModalItems([{ name: '', qty: 1, unit: 'KG' }]);
    setShowNewModal(false);
  };

  const inTransitCount = transfers.filter((t) => t.status === 'IN_TRANSIT').length;
  const completedCount = transfers.filter((t) => t.status === 'COMPLETED').length;
  const connectedBranches = new Set(transfers.flatMap((t) => [t.sourceBranch, t.destBranch])).size;

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
            <p className="text-2xl font-black text-foreground">{inTransitCount}</p>
          </div>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase">Completed Transfers</p>
            <p className="text-2xl font-black text-foreground">{completedCount}</p>
          </div>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase">Active Outlets Connected</p>
            <p className="text-2xl font-black text-foreground">
              {connectedBranches > 0 ? `${connectedBranches} Locations` : '0 Connected'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Layout or Zero State */}
      {transfers.length === 0 ? (
        <div className="p-12 rounded-2xl border border-dashed border-border bg-card/40 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <ArrowLeftRight className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-bold text-foreground">No Stock Transfers Dispatched</h3>
            <p className="text-sm text-muted-foreground mt-1">
              There are no active or historical stock transfer manifests between branches or central commissary warehouses.
            </p>
          </div>
          <Button onClick={() => setShowNewModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Dispatch First Transfer Requisition
          </Button>
        </div>
      ) : (
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
                      {selectedTransfer.receivedAt ? `Received: ${selectedTransfer.receivedAt}` : `Status: ${selectedTransfer.status}`}
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
      )}

      {/* New Transfer Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-primary" />
              Dispatch Stock Requisition
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Source Warehouse / Kitchen</label>
                  <input
                    type="text"
                    required
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    placeholder="e.g. Central Commissary"
                    className="w-full mt-1.5 h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Destination Branch</label>
                  <input
                    type="text"
                    required
                    value={newDest}
                    onChange={(e) => setNewDest(e.target.value)}
                    placeholder="e.g. Main Dining Outlet"
                    className="w-full mt-1.5 h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Driver / Carrier Name</label>
                <input
                  type="text"
                  value={newDriver}
                  onChange={(e) => setNewDriver(e.target.value)}
                  placeholder="e.g. Internal Logistics Van / Driver Name"
                  className="w-full mt-1.5 h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Manifest Items
                  </label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddItemRow} className="text-xs h-7 gap-1">
                    <Plus className="w-3 h-3" /> Add Item
                  </Button>
                </div>
                {modalItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Item name (e.g. Malai Paneer)"
                      value={item.name}
                      onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                      className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="Qty"
                      value={item.qty}
                      onChange={(e) => handleItemChange(index, 'qty', Number(e.target.value))}
                      className="w-16 h-9 px-2 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <select
                      value={item.unit}
                      onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                      className="w-20 h-9 px-2 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="KG">KG</option>
                      <option value="L">Liters</option>
                      <option value="G">Grams</option>
                      <option value="PCS">Pieces</option>
                      <option value="BOX">Box</option>
                      <option value="PKG">Pkg</option>
                    </select>
                    {modalItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(index)}
                        className="p-1.5 text-muted-foreground hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setShowNewModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">Dispatch Shipment</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
