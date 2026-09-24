'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package, Plus, Search, AlertTriangle, ArrowUpDown, TrendingDown,
  Scale, RefreshCw, Layers, CheckCircle2, History, Trash2, ArrowUpRight, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@ros/utils';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { apiGet, apiPost } from '@/lib/api';

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  lowStockThreshold: number;
  reorderLevel: number;
  costPerUnit: number;
  category?: {
    id: string;
    name: string;
  } | null;
  updatedAt: string;
}

export default function InventoryPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [adjustingItem, setAdjustingItem] = useState<Ingredient | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState<'STOCK_IN' | 'WASTAGE' | 'ADJUSTMENT'>('STOCK_IN');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addCat, setAddCat] = useState('Dairy');
  const [addUnit, setAddUnit] = useState('KG');
  const [addStock, setAddStock] = useState('10');
  const [addCost, setAddCost] = useState('100');
  const [addThreshold, setAddThreshold] = useState('5');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: ingredients = [], isLoading } = useQuery<Ingredient[]>({
    queryKey: ['inventory-ingredients'],
    queryFn: () => apiGet<Ingredient[]>('/inventory/ingredients'),
  });

  const createIngredientMutation = useMutation({
    mutationFn: (data: any) => apiPost('/inventory/ingredients', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-ingredients'] });
      toast.success('Ingredient added to inventory');
      setIsAddOpen(false);
      setAddName('');
      setAddStock('');
      setAddCost('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to add ingredient');
    },
  });

  const adjustStockMutation = useMutation({
    mutationFn: (data: any) => apiPost('/inventory/adjust', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-ingredients'] });
      toast.success('Stock adjusted successfully');
      setAdjustingItem(null);
      setAdjustQty('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to adjust stock');
    },
  });

  const categories = ['ALL', 'Dairy', 'Meat & Poultry', 'Fresh Produce', 'Grains & Dry Goods', 'Spices & Seasoning'];

  const filteredIngredients = ingredients.filter((ing) => {
    const catName = ing.category?.name || 'General';
    const matchesCat = selectedCategory === 'ALL' || catName === selectedCategory;
    const matchesSearch = ing.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const totalStockValue = ingredients.reduce(
    (sum, item) => sum + Number(item.currentStock || 0) * Number(item.costPerUnit || 0),
    0
  );
  const lowStockCount = ingredients.filter(
    (i) => Number(i.currentStock) <= Number(i.lowStockThreshold) && Number(i.lowStockThreshold) > 0
  ).length;

  const handleStockAdjustment = () => {
    if (!adjustingItem || !adjustQty || isNaN(Number(adjustQty)) || Number(adjustQty) <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }
    adjustStockMutation.mutate({
      ingredientId: adjustingItem.id,
      movementType: adjustType,
      quantity: Number(adjustQty),
    });
  };

  const handleCreateIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim()) {
      toast.error('Ingredient name is required');
      return;
    }
    createIngredientMutation.mutate({
      name: addName.trim(),
      categoryName: addCat,
      unit: addUnit,
      currentStock: Number(addStock) || 0,
      costPerUnit: Number(addCost) || 0,
      lowStockThreshold: Number(addThreshold) || 0,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            Inventory &amp; Stock Control
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Raw material inventory, recipe depletion tracking, stock alerts, and wastage logging
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsAddOpen(true)}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Ingredient
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Stock Value</span>
            <Scale className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">{formatCurrency(totalStockValue)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{ingredients.length} raw materials</p>
        </Card>

        <Card className={cn('p-4 bg-card/60 backdrop-blur-sm border-border', lowStockCount > 0 && 'border-amber-500/40 bg-amber-500/5')}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Low Stock Warnings</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-500 mt-2">{lowStockCount} items</p>
          <p className="text-[11px] text-amber-500/90 mt-0.5 font-medium">Reorder required soon</p>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Depletion Tracking</span>
            <RefreshCw className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">Active</p>
          <p className="text-[11px] text-emerald-500 mt-0.5 font-medium">Synced with KDS / POS</p>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Items</span>
            <Layers className="w-4 h-4 text-foreground" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">{ingredients.length}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Catalogued ingredients</p>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search raw ingredients by name..."
            className="pl-10 h-11 bg-card border-border rounded-xl"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap',
                selectedCategory === cat
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card text-muted-foreground border-border hover:bg-accent'
              )}
            >
              {cat === 'ALL' ? 'All Categories' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Table */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm">Loading inventory items...</p>
        </div>
      ) : filteredIngredients.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-border/80 bg-card/30">
          <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="text-lg font-semibold text-foreground">No Inventory Items Found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
            Add your raw ingredients like dairy, vegetables, spices, and packaging materials to monitor stock.
          </p>
          <Button onClick={() => setIsAddOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Add First Ingredient
          </Button>
        </Card>
      ) : (
        <Card className="border-border/70 bg-card/60 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Ingredient</th>
                  <th className="px-6 py-3.5 font-semibold">Category</th>
                  <th className="px-6 py-3.5 font-semibold">Current Stock</th>
                  <th className="px-6 py-3.5 font-semibold">Unit Cost</th>
                  <th className="px-6 py-3.5 font-semibold">Total Value</th>
                  <th className="px-6 py-3.5 font-semibold">Stock Status</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredIngredients.map((item) => {
                  const stockNum = Number(item.currentStock || 0);
                  const threshNum = Number(item.lowStockThreshold || 0);
                  const isLow = threshNum > 0 && stockNum <= threshNum;

                  return (
                    <tr key={item.id} className="hover:bg-accent/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-foreground">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        <span className="px-2 py-0.5 rounded-md bg-muted text-foreground border border-border">
                          {item.category?.name || 'General'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-foreground">
                        {stockNum.toFixed(1)} {item.unit}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-foreground">
                        {formatCurrency(item.costPerUnit)} / {item.unit}
                      </td>
                      <td className="px-6 py-4 font-bold text-foreground">
                        {formatCurrency(stockNum * Number(item.costPerUnit || 0))}
                      </td>
                      <td className="px-6 py-4">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                            <AlertTriangle className="w-3 h-3" /> Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" /> In Stock
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setAdjustingItem(item)}
                          className="text-xs h-8 gap-1.5"
                        >
                          <ArrowUpDown className="w-3.5 h-3.5" /> Adjust
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Adjust Stock Modal Dialog */}
      {adjustingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md border-border bg-card shadow-2xl animate-fade-in">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="text-lg font-bold">Stock Adjustment</CardTitle>
              <CardDescription>
                Update physical stock for <strong className="text-foreground">{adjustingItem.name}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'STOCK_IN', label: 'Stock In (+)' },
                  { id: 'WASTAGE', label: 'Wastage (-)' },
                  { id: 'ADJUSTMENT', label: 'Correction' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setAdjustType(t.id as any)}
                    className={cn(
                      'py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all',
                      adjustType === t.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Quantity ({adjustingItem.unit})
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  placeholder={`e.g. 5 ${adjustingItem.unit}`}
                  className="h-11 text-base font-bold"
                  autoFocus
                />
                <p className="text-[11px] text-muted-foreground">
                  Current stock level is {Number(adjustingItem.currentStock).toFixed(1)} {adjustingItem.unit}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-border">
                <Button variant="outline" className="flex-1" onClick={() => setAdjustingItem(null)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-primary text-primary-foreground font-semibold"
                  disabled={adjustStockMutation.isPending}
                  onClick={handleStockAdjustment}
                >
                  {adjustStockMutation.isPending ? 'Updating...' : 'Apply Adjustment'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Ingredient Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md border-border bg-card shadow-2xl animate-fade-in">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="text-lg font-bold">Add Raw Ingredient</CardTitle>
              <CardDescription>Catalogue a new item into inventory tracking</CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <form onSubmit={handleCreateIngredient} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Ingredient Name *</label>
                  <Input
                    required
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="e.g. Fresh Paneer"
                    className="h-10"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Category</label>
                    <select
                      value={addCat}
                      onChange={(e) => setAddCat(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option>Dairy</option>
                      <option>Meat &amp; Poultry</option>
                      <option>Fresh Produce</option>
                      <option>Grains &amp; Dry Goods</option>
                      <option>Spices &amp; Seasoning</option>
                      <option>Beverages &amp; Bar</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Unit of Measure</label>
                    <select
                      value={addUnit}
                      onChange={(e) => setAddUnit(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option>KG</option>
                      <option>G</option>
                      <option>L</option>
                      <option>ML</option>
                      <option>PCS</option>
                      <option>BOX</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Initial Stock</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={addStock}
                      onChange={(e) => setAddStock(e.target.value)}
                      placeholder="10"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Cost / Unit (₹)</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={addCost}
                      onChange={(e) => setAddCost(e.target.value)}
                      placeholder="250"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Low Alert</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={addThreshold}
                      onChange={(e) => setAddThreshold(e.target.value)}
                      placeholder="5"
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsAddOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createIngredientMutation.isPending}
                    className="flex-1 bg-primary text-primary-foreground font-semibold"
                  >
                    {createIngredientMutation.isPending ? 'Saving...' : 'Save Ingredient'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
