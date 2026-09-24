'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Search, Phone, Mail, Award, TrendingUp,
  CreditCard, Calendar, Star, Heart, Clock, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@ros/utils';
import { cn } from '@/lib/utils';
import { apiGet, apiPost } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  loyaltyPoints: number;
  creditBalance: number;
  totalSpent: number;
  visitCount: number;
  preferences?: string | null;
  updatedAt: string;
}

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [preferences, setPreferences] = useState('');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: () => apiGet<Customer[]>('/customers'),
  });

  const createCustomerMutation = useMutation({
    mutationFn: (data: any) => apiPost('/customers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer registered successfully');
      setIsAddOpen(false);
      setName('');
      setPhone('');
      setEmail('');
      setPreferences('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to register customer');
    },
  });

  const filteredCustomers = customers.filter((c) => {
    return (
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const totalSpent = customers.reduce((sum, c) => sum + Number(c.totalSpent || 0), 0);
  const totalPoints = customers.reduce((sum, c) => sum + Number(c.loyaltyPoints || 0), 0);

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error('Customer name and phone number are required');
      return;
    }
    createCustomerMutation.mutate({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      preferences: preferences.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Customer Relationship Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Guest profiles, dining history, loyalty points, and personalized preferences
          </p>
        </div>
        <Button
          onClick={() => setIsAddOpen(true)}
          className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Customer
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Guests</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">{customers.length}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Registered customer base</p>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">{formatCurrency(totalSpent)}</p>
          <p className="text-[11px] text-emerald-500 mt-0.5 font-medium">Customer lifetime spend</p>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Active Loyalty Points</span>
            <Star className="w-4 h-4 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">{totalPoints.toLocaleString()} pts</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Redeemable rewards</p>
        </Card>

        <Card className="p-4 bg-card/60 backdrop-blur-sm border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">VIP Guests</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">
            {customers.filter((c) => (c.visitCount || 0) >= 10).length}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Frequent diners (10+ visits)</p>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search customers by name, phone number, or email..."
          className="pl-10 h-11 bg-card border-border rounded-xl"
        />
      </div>

      {/* Customer Cards Grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm">Loading customer profiles...</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-border/80 bg-card/30">
          <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="text-lg font-semibold text-foreground">No Customers Registered</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
            Record guest profiles, contact numbers, dietary preferences, and track their visit frequency.
          </p>
          <Button onClick={() => setIsAddOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Add First Customer
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCustomers.map((c) => (
            <Card
              key={c.id}
              className="border-border/70 bg-card/60 backdrop-blur-sm transition-all hover:shadow-lg hover:border-border p-5 space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-foreground">{c.name}</h3>
                    {(c.visitCount || 0) >= 10 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                        👑 VIP
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full border border-border">
                        Regular
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-0.5">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" /> {c.phone}
                    </span>
                    {c.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" /> {c.email}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total Spend</p>
                  <p className="text-base font-bold text-foreground">
                    {formatCurrency(c.totalSpent || 0)}
                  </p>
                </div>
              </div>

              {/* Metrics pills */}
              <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-accent/40 text-xs">
                <div>
                  <p className="text-muted-foreground text-[11px]">Visits</p>
                  <p className="font-bold text-foreground">{c.visitCount || 0} times</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px]">Loyalty Points</p>
                  <p className="font-bold text-yellow-500">⭐ {c.loyaltyPoints || 0} pts</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px]">Last Updated</p>
                  <p className="font-medium text-foreground text-[11px] truncate">
                    {new Date(c.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Preferences */}
              {c.preferences && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Heart className="w-3 h-3 text-rose-500" /> Preferences &amp; Notes
                  </p>
                  <div className="p-2.5 rounded-lg bg-muted text-xs text-foreground">
                    {c.preferences}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Add Customer Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md border-border bg-card shadow-2xl animate-fade-in">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="text-lg font-bold">Add Customer Profile</CardTitle>
              <CardDescription>Enroll a new dining guest or loyalty member</CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <form onSubmit={handleCreateCustomer} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Customer Name *</label>
                  <Input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rajesh Khanna"
                    className="h-10"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Phone Number *</label>
                    <Input
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98200 44556"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Email</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="guest@example.com"
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Special Preferences &amp; Notes</label>
                  <Input
                    value={preferences}
                    onChange={(e) => setPreferences(e.target.value)}
                    placeholder="e.g. Less spicy, prefers corner booth, Jain food"
                    className="h-10"
                  />
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
                    disabled={createCustomerMutation.isPending}
                    className="flex-1 bg-primary text-primary-foreground font-semibold"
                  >
                    {createCustomerMutation.isPending ? 'Saving...' : 'Save Customer'}
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
