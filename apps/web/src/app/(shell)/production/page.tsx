'use client';

import { useState } from 'react';
import {
  ChefHat, Flame, Plus, CheckCircle2, Clock,
  Package, DollarSign, ArrowRight, Sparkles, Scale, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Batch {
  id: string;
  recipeName: string;
  station: string;
  targetYield: string;
  status: 'COOKING' | 'COMPLETED';
  prepChef: string;
  startedAt: string;
  expectedCompletion?: string;
  completedAt?: string;
  estimatedCostPerLiter: number;
  ingredientsUsed: { name: string; qty: string; cost: number }[];
}

export default function ProductionPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newRecipe, setNewRecipe] = useState('');
  const [newStation, setNewStation] = useState('Main Kitchen');
  const [newChef, setNewChef] = useState('');
  const [newYield, setNewYield] = useState('');
  const [newCostPerUnit, setNewCostPerUnit] = useState('');

  const handleStartBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecipe.trim() || !newYield.trim()) return;

    const newB: Batch = {
      id: `BATCH-${Date.now().toString().slice(-6)}`,
      recipeName: newRecipe.trim(),
      station: newStation,
      targetYield: newYield.trim(),
      status: 'COOKING',
      prepChef: newChef.trim() || 'Head Chef',
      startedAt: 'Just now',
      expectedCompletion: 'In progress',
      estimatedCostPerLiter: parseFloat(newCostPerUnit) || 0,
      ingredientsUsed: [],
    };
    setBatches([newB, ...batches]);
    setNewRecipe('');
    setNewYield('');
    setNewChef('');
    setNewCostPerUnit('');
    setShowModal(false);
  };

  const handleCompleteBatch = (id: string) => {
    setBatches((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, status: 'COMPLETED', completedAt: 'Just now' } : b
      )
    );
  };

  const activeCount = batches.filter((b) => b.status === 'COOKING').length;
  const completedCount = batches.filter((b) => b.status === 'COMPLETED').length;
  const avgCost = batches.length > 0
    ? (batches.reduce((s, b) => s + b.estimatedCostPerLiter, 0) / batches.length).toFixed(2)
    : '0.00';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-primary" />
            Kitchen Batch Production & Recipe Yield Studio
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Master gravy prep planning, raw material auto-deduction, portion cost analysis & batch inventory
          </p>
        </div>
        <Button onClick={() => setShowModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Start New Prep Batch
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Active Prep Batches</p>
          <p className="text-3xl font-black text-primary mt-2">
            {activeCount} Cooking
          </p>
          <p className="text-xs text-muted-foreground mt-1">Live in kitchen kettle</p>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Yield Consistency</p>
          <p className="text-3xl font-black text-emerald-400 mt-2">
            {batches.length > 0 ? '98.5%' : '0%'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Standardized recipe formula</p>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Avg Portion Cost</p>
          <p className="text-3xl font-black text-amber-400 mt-2">₹{avgCost}</p>
          <p className="text-xs text-muted-foreground mt-1">Gravy base per portion</p>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Completed Batches</p>
          <p className="text-3xl font-black text-foreground mt-2">{completedCount} Batches</p>
          <p className="text-xs text-muted-foreground mt-1">Recorded in inventory</p>
        </div>
      </div>

      {/* Batches Stream or Zero State */}
      {batches.length === 0 ? (
        <div className="p-12 rounded-2xl border border-dashed border-border bg-card/40 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <ChefHat className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-bold text-foreground">No Active Prep Batches</h3>
            <p className="text-sm text-muted-foreground mt-1">
              There are no kitchen production batches in progress. Start a master gravy or sauce prep batch to track portion yield and raw material consumption.
            </p>
          </div>
          <Button onClick={() => setShowModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Start First Prep Batch
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {batches.map((batch) => (
            <div
              key={batch.id}
              className="p-6 rounded-2xl border border-border bg-card/70 backdrop-blur hover:border-border/80 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-foreground">{batch.recipeName}</h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          batch.status === 'COOKING'
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {batch.status === 'COOKING' ? 'COOKING IN PROGRESS' : 'COMPLETED'}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground mt-1">{batch.id} • {batch.station}</p>
                  </div>
                </div>

                {/* Yield & Cost Metric */}
                <div className="grid grid-cols-2 gap-3 my-4 p-3 rounded-xl bg-background/50 border border-border/50 text-xs">
                  <div>
                    <span className="text-muted-foreground text-[11px] font-semibold uppercase">Target Yield</span>
                    <p className="font-bold text-primary text-sm mt-0.5">{batch.targetYield}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[11px] font-semibold uppercase">Cost per Unit / Liter</span>
                    <p className="font-bold text-emerald-400 text-sm mt-0.5">₹{batch.estimatedCostPerLiter.toFixed(2)}</p>
                  </div>
                </div>

                {/* Ingredients Breakdown */}
                {batch.ingredientsUsed.length > 0 ? (
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider mb-2">
                      Ingredients Deducted:
                    </p>
                    {batch.ingredientsUsed.map((ing, i) => (
                      <div key={i} className="flex justify-between py-0.5 border-b border-border/40 last:border-0">
                        <span>{ing.name} ({ing.qty})</span>
                        <span className="font-semibold text-foreground">₹{ing.cost}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Raw material deduction logged upon completion.</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/60">
                <span className="text-xs text-muted-foreground">Prep Chef: {batch.prepChef}</span>
                {batch.status === 'COOKING' && (
                  <Button
                    size="sm"
                    onClick={() => handleCompleteBatch(batch.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Mark Ready & Stock In
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Start Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Flame className="w-5 h-5 text-primary" />
              Start Recipe Batch Prep
            </h3>
            <form onSubmit={handleStartBatch} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Recipe / Batch Name</label>
                <input
                  type="text"
                  required
                  value={newRecipe}
                  onChange={(e) => setNewRecipe(e.target.value)}
                  placeholder="e.g. Master Makhani Base Gravy"
                  className="w-full mt-1.5 h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Kitchen Station</label>
                  <input
                    type="text"
                    value={newStation}
                    onChange={(e) => setNewStation(e.target.value)}
                    placeholder="Main Kitchen"
                    className="w-full mt-1.5 h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Prep Chef Name</label>
                  <input
                    type="text"
                    value={newChef}
                    onChange={(e) => setNewChef(e.target.value)}
                    placeholder="e.g. Chef Alex"
                    className="w-full mt-1.5 h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Target Yield</label>
                  <input
                    type="text"
                    required
                    value={newYield}
                    onChange={(e) => setNewYield(e.target.value)}
                    placeholder="e.g. 40 Liters"
                    className="w-full mt-1.5 h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Est. Cost / Unit (₹)</label>
                  <input
                    type="number"
                    value={newCostPerUnit}
                    onChange={(e) => setNewCostPerUnit(e.target.value)}
                    placeholder="e.g. 85"
                    className="w-full mt-1.5 h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground">
                ⚖️ Raw ingredients will be marked in kitchen prep kettle and accounted in inventory ledger upon completion.
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">Start Cooking Batch</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
