'use client';

import { useState } from 'react';
import {
  Tag, Percent, Plus, Gift, Clock, Send, CheckCircle2,
  Sparkles, Megaphone, Users, ArrowUpRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@ros/utils';

interface Campaign {
  id: string;
  name: string;
  code: string;
  type: 'PERCENTAGE' | 'BOGO' | 'FLAT' | 'LOYALTY_BOOST';
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number;
  timing?: string;
  status: 'ACTIVE' | 'PAUSED';
  redemptions: number;
  totalSavings: number;
}

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [broadcastLog, setBroadcastLog] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newDiscount, setNewDiscount] = useState('15');
  const [newType, setNewType] = useState<'PERCENTAGE' | 'FLAT' | 'BOGO'>('PERCENTAGE');

  const handleBroadcast = (campaignName: string) => {
    setBroadcastLog(`📱 WhatsApp & SMS Promo blast dispatched for "${campaignName}"!`);
    setTimeout(() => setBroadcastLog(null), 5000);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newCode.trim()) {
      toast.error('Required', 'Please enter a campaign name and coupon code');
      return;
    }
    const newCamp: Campaign = {
      id: `camp-${Date.now()}`,
      name: newName.trim(),
      code: newCode.trim().toUpperCase(),
      type: newType,
      discountValue: parseFloat(newDiscount) || 15,
      minOrderValue: 499,
      status: 'ACTIVE',
      redemptions: 0,
      totalSavings: 0,
    };
    setCampaigns([newCamp, ...campaigns]);
    setShowNewModal(false);
    setNewName('');
    setNewCode('');
    toast.success('Campaign Created', `Coupon code ${newCamp.code} is now active.`);
  };

  const totalRedemptions = campaigns.reduce((acc, c) => acc + c.redemptions, 0);
  const totalSavings = campaigns.reduce((acc, c) => acc + c.totalSavings, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card/60 p-5 rounded-3xl border border-border backdrop-blur-sm">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Tag className="w-6 h-6 text-primary" />
            Marketing &amp; Dynamic Promotions Studio
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automated happy hours, BOGO combo rules, coupon engine and targeted SMS broadcasts
          </p>
        </div>
        <Button onClick={() => setShowNewModal(true)} className="gap-2 font-bold rounded-2xl h-10 px-4">
          <Plus className="w-4 h-4" />
          Create Promotion
        </Button>
      </div>

      {/* Broadcast Alert */}
      {broadcastLog && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {broadcastLog}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Total Redemptions</p>
          <p className="text-2xl font-black text-foreground font-mono mt-2">{totalRedemptions} Coupons</p>
          <p className="text-[11px] text-muted-foreground mt-1">Total claimed coupons</p>
        </div>
        <div className="p-5 rounded-3xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Active Campaigns</p>
          <p className="text-2xl font-black text-primary font-mono mt-2">{campaigns.length}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Configured promotions</p>
        </div>
        <div className="p-5 rounded-3xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Customer Savings</p>
          <p className="text-2xl font-black text-emerald-500 font-mono mt-2">{formatCurrency(totalSavings)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Total discounts given</p>
        </div>
        <div className="p-5 rounded-3xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Marketing Status</p>
          <p className="text-2xl font-black text-foreground mt-2">{campaigns.length > 0 ? 'Active' : 'Ready'}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Coupon engine online</p>
        </div>
      </div>

      {/* Campaigns Grid */}
      {campaigns.length === 0 ? (
        <Card className="p-16 text-center border-dashed border-2 border-border/80 bg-card/30 rounded-3xl">
          <Tag className="w-12 h-12 mx-auto text-primary/30 mb-3" />
          <h3 className="text-lg font-bold text-foreground">No Active Marketing Campaigns</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
            Create your first coupon discount or promotional campaign to attract more diners.
          </p>
          <Button onClick={() => setShowNewModal(true)} className="gap-2 font-bold rounded-2xl">
            <Plus className="w-4 h-4" /> Create First Promotion
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {campaigns.map((camp) => (
            <div
              key={camp.id}
              className="p-6 rounded-3xl border border-border bg-card/70 backdrop-blur hover:border-border/80 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-foreground">{camp.name}</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                        {camp.type}
                      </span>
                    </div>
                    <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-background border border-dashed border-primary/50 text-xs font-mono font-bold text-primary tracking-wider">
                      {camp.code}
                    </div>
                  </div>

                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-bold border border-emerald-500/30">
                    {camp.status}
                  </span>
                </div>

                <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                  <p>• Min Order: <strong className="text-foreground">{formatCurrency(camp.minOrderValue)}</strong></p>
                  <p>• Discount: <strong className="text-foreground">{camp.discountValue}%</strong></p>
                </div>

                <div className="grid grid-cols-2 gap-3 my-4 p-3 rounded-2xl bg-background/50 border border-border/50 text-center">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Times Redeemed</p>
                    <p className="text-base font-bold text-foreground mt-0.5">{camp.redemptions}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">Total Discount Given</p>
                    <p className="text-base font-bold text-emerald-500 mt-0.5">{formatCurrency(camp.totalSavings)}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBroadcast(camp.name)}
                  className="gap-1.5 text-xs font-bold rounded-xl border-primary/40 text-primary hover:bg-primary/10"
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  Broadcast via SMS / WhatsApp
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Create Promo Campaign
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Campaign Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekend Special 20% Off"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full mt-1 h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Coupon Code</label>
                  <input
                    type="text"
                    required
                    placeholder="WEEKEND20"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full mt-1 h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground uppercase font-mono font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Discount Value (%)</label>
                  <input
                    type="number"
                    required
                    placeholder="20"
                    value={newDiscount}
                    onChange={(e) => setNewDiscount(e.target.value)}
                    className="w-full mt-1 h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowNewModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">Launch Campaign</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
