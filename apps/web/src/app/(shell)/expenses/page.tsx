'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wallet, Plus, Search, Filter, Receipt, CheckCircle2,
  TrendingDown, DollarSign, Calendar, Paperclip, ArrowUpRight, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@ros/utils';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { apiGet, apiPost } from '@/lib/api';

interface Expense {
  id: string;
  amount: number;
  date: string;
  paymentMode: 'CASH' | 'UPI' | 'BANK' | 'CARD';
  vendor?: string | null;
  description: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  receiptUrl?: string | null;
  category?: {
    id: string;
    name: string;
  } | null;
}

export default function ExpensesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newMode, setNewMode] = useState<'CASH' | 'UPI' | 'BANK' | 'CARD'>('CASH');
  const [newVendor, setNewVendor] = useState('');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ['expenses'],
    queryFn: () => apiGet<Expense[]>('/expenses'),
  });

  const createExpenseMutation = useMutation({
    mutationFn: (data: any) => apiPost('/expenses', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense voucher logged successfully');
      setIsAdding(false);
      setNewDesc('');
      setNewAmount('');
      setNewVendor('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to log expense');
    },
  });

  const totalExpense = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  const filteredExpenses = expenses.filter((e) => {
    return (
      e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.vendor && e.vendor.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc.trim() || !newAmount || isNaN(Number(newAmount)) || Number(newAmount) <= 0) {
      toast.error('Please enter a valid description and amount');
      return;
    }
    createExpenseMutation.mutate({
      description: newDesc.trim(),
      amount: Number(newAmount),
      paymentMode: newMode,
      vendor: newVendor.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Wallet className="w-6 h-6 text-primary" />
            Expenses &amp; Cash Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Log petty cash disbursements, utility payments, vendor invoices, and cash register shifts
          </p>
        </div>
        <Button onClick={() => setIsAdding(true)} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
          <Plus className="w-4 h-4" /> Log Expense Voucher
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border">
          <span className="text-xs font-semibold text-muted-foreground">Total Month Expenses</span>
          <p className="text-2xl font-bold text-foreground mt-2">{formatCurrency(totalExpense)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{expenses.length} logged vouchers</p>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border">
          <span className="text-xs font-semibold text-muted-foreground">Petty Cash In Register</span>
          <p className="text-2xl font-bold text-emerald-500 mt-2">{formatCurrency(0)}</p>
          <p className="text-[11px] text-emerald-500 mt-0.5 font-medium">Reconciled register</p>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border">
          <span className="text-xs font-semibold text-muted-foreground">Total Vouchers</span>
          <p className="text-2xl font-bold text-foreground mt-2">{expenses.length}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Approved vouchers</p>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border">
          <span className="text-xs font-semibold text-muted-foreground">Highest Single Outflow</span>
          <p className="text-2xl font-bold text-foreground mt-2">
            {formatCurrency(Math.max(0, ...expenses.map((e) => Number(e.amount) || 0)))}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Peak expense voucher</p>
        </Card>
      </div>

      {/* Expense Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search expenses by description or vendor..."
          className="pl-10 h-11 bg-card border-border rounded-xl"
        />
      </div>

      {/* Expense Ledger Table */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm">Loading expense records...</p>
        </div>
      ) : filteredExpenses.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-border/80 bg-card/30">
          <Wallet className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="text-lg font-semibold text-foreground">No Expense Vouchers Found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
            Record emergency groceries, utilities, equipment repairs, or daily staff meal vouchers.
          </p>
          <Button onClick={() => setIsAdding(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Log First Voucher
          </Button>
        </Card>
      ) : (
        <Card className="border-border/70 bg-card/60 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Description</th>
                  <th className="px-6 py-3.5 font-semibold">Category</th>
                  <th className="px-6 py-3.5 font-semibold">Date</th>
                  <th className="px-6 py-3.5 font-semibold">Payment Mode</th>
                  <th className="px-6 py-3.5 font-semibold">Amount</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-foreground">{exp.description}</p>
                      {exp.vendor && <p className="text-[11px] text-muted-foreground">Vendor: {exp.vendor}</p>}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <span className="px-2 py-0.5 rounded-md bg-muted text-foreground border border-border">
                        {exp.category?.name || 'Operating Expense'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {new Date(exp.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono font-bold text-foreground">{exp.paymentMode}</td>
                    <td className="px-6 py-4 font-bold text-foreground">{formatCurrency(exp.amount)}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        {exp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Expense Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md border-border bg-card shadow-2xl animate-fade-in">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="text-lg font-bold">Log New Expense Voucher</CardTitle>
              <CardDescription>Record an operational expense or petty cash payout</CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <form onSubmit={handleAddExpense} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Expense Description *</label>
                  <Input
                    required
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="e.g. Emergency dairy supply & lemon purchase"
                    className="h-10"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Amount (₹) *</label>
                    <Input
                      type="number"
                      required
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      placeholder="e.g. 750"
                      className="h-10 font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Vendor / Payee</label>
                    <Input
                      value={newVendor}
                      onChange={(e) => setNewVendor(e.target.value)}
                      placeholder="e.g. Local Stall"
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Payment Mode</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['CASH', 'UPI', 'CARD', 'BANK'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setNewMode(m)}
                        className={cn(
                          'py-2 text-xs font-bold rounded-lg border transition-all text-center',
                          newMode === m ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-muted text-muted-foreground border-border'
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-border">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsAdding(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createExpenseMutation.isPending}
                    className="flex-1 bg-primary text-primary-foreground font-semibold"
                  >
                    {createExpenseMutation.isPending ? 'Saving...' : 'Save Voucher'}
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
