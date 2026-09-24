'use client';

import { useState } from 'react';
import {
  ChefHat, Flame, Plus, CheckCircle2, Clock,
  Package, DollarSign, ArrowRight, Sparkles, Scale
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

const initialBatches: Batch[] = [
  {
    id: 'BATCH-2026-042',
    recipeName: 'Makhani Base Gravy (Master Batch)',
    station: 'Main Kitchen & Curry Station',
    targetYield: '50 Liters (~125 portions)',
    status: 'COOKING',
    prepChef: 'Chef Kumar',
    startedAt: 'Today, 08:30 AM',
    expectedCompletion: 'Today, 11:30 AM',
    estimatedCostPerLiter: 94.5,
    ingredientsUsed: [
      { name: 'Farm Tomatoes', qty: '35 KG', cost: 1400 },
      { name: 'Amul Salted Butter', qty: '8 KG', cost: 3360 },
      { name: 'Fresh Cooking Cream', qty: '5 L', cost: 900 },
      { name: 'Garam Masala Special', qty: '1.2 KG', cost: 780 },
    ],
  },
  {
    id: 'BATCH-2026-041',
    recipeName: 'Biryani Yakhni Dum Gravy',
    station: 'Main Kitchen',
    targetYield: '30 Liters (~60 portions)',
    status: 'COMPLETED',
    prepChef: 'Chef Kumar',
    startedAt: 'Yesterday, 02:00 PM',
    completedAt: 'Yesterday, 05:00 PM',
    estimatedCostPerLiter: 142.0,
    ingredientsUsed: [
      { name: 'Red Onions (Crispy Fried)', qty: '12 KG', cost: 420 },
      { name: 'Pure Cow Ghee', qty: '4 KG', cost: 2400 },
      { name: 'Saffron & Whole Spices', qty: '500 G', cost: 1800 },
    ],
  },
];

export default function ProductionPage() {
  const [batches, setBatches] = useState<Batch[]>(initialBatches);
  const [showModal, setShowModal] = useState(false);
  const [newRecipe, setNewRecipe] = useState('Makhani Base Gravy (Master Batch)');
  const [newYield, setNewYield] = useState('40 Liters');

  const handleStartBatch = (e: React.FormEvent) => {
    e.preventDefault();
    const newB: Batch = {
      id: `BATCH-2026-${Math.floor(100 + Math.random() * 900)}`,
      recipeName: newRecipe,
      station: 'Main Kitchen',
      targetYield: newYield,
      status: 'COOKING',
      prepChef: 'Chef Kumar',
      startedAt: 'Just now',
      expectedCompletion: 'In 3 hours',
      estimatedCostPerLiter: 98.0,
      ingredientsUsed: [
        { name: 'Farm Tomatoes', qty: '25 KG', cost: 1000 },
        { name: 'Amul Salted Butter', qty: '6 KG', cost: 2520 },
        { name: 'Fresh Cooking Cream', qty: '4 L', cost: 720 },
      ],
    };
    setBatches([newB, ...batches]);
    setShowModal(false);
  };

  const handleCompleteBatch = (id: string) => {
    setBatches((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, status: 'COMPLETED', completedAt: 'Just now' } : b
      )
    );
  };

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
            {batches.filter((b) => b.status === 'COOKING').length} Cooking
          </p>
          <p className="text-xs text-muted-foreground mt-1">Live in kitchen kettle</p>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Yield Consistency</p>
          <p className="text-3xl font-black text-emerald-400 mt-2">98.4%</p>
          <p className="text-xs text-muted-foreground mt-1">Standardized recipe formula</p>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Avg Portion Cost</p>
          <p className="text-3xl font-black text-amber-400 mt-2">₹37.80</p>
          <p className="text-xs text-muted-foreground mt-1">Gravy base per plate</p>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Completed Batches (7d)</p>
          <p className="text-3xl font-black text-foreground mt-2">18 Batches</p>
          <p className="text-xs text-muted-foreground mt-1">680 Liters produced</p>
        </div>
      </div>

      {/* Batches Stream */}
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
                  <span className="text-muted-foreground text-[11px] font-semibold uppercase">Cost per Liter</span>
                  <p className="font-bold text-emerald-400 text-sm mt-0.5">₹{batch.estimatedCostPerLiter.toFixed(2)}</p>
                </div>
              </div>

              {/* Ingredients Breakdown */}
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
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/60">
              <span className="text-xs text-muted-foreground">Head Chef: {batch.prepChef}</span>
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
                <label className="text-xs font-semibold text-muted-foreground">Recipe Template</label>
                <select
                  value={newRecipe}
                  onChange={(e) => setNewRecipe(e.target.value)}
                  className="w-full mt-1.5 h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Makhani Base Gravy (Master Batch)">Makhani Base Gravy (Master Batch)</option>
                  <option value="Biryani Yakhni Dum Gravy">Biryani Yakhni Dum Gravy</option>
                  <option value="Yellow Dal Tadka Master Boil">Yellow Dal Tadka Master Boil</option>
                  <option value="Tandoori Tikka Marinade Red">Tandoori Tikka Marinade Red</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Target Batch Yield</label>
                <input
                  type="text"
                  required
                  value={newYield}
                  onChange={(e) => setNewYield(e.target.value)}
                  placeholder="e.g. 50 Liters"
                  className="w-full mt-1.5 h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground">
                ⚖️ Raw ingredients will be automatically deducted from inventory ledger and marked in kitchen prep kettle.
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
