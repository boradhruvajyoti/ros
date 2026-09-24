'use client';

import { useState } from 'react';
import {
  Tag, Percent, Plus, Gift, Clock, Send, CheckCircle2,
  Sparkles, Megaphone, Users, ArrowUpRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

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

const initialCampaigns: Campaign[] = [
  {
    id: 'camp-happy-hours',
    name: 'Happy Hours 20% Off',
    code: 'HAPPY20',
    type: 'PERCENTAGE',
    discountValue: 20,
    minOrderValue: 499,
    maxDiscount: 200,
    timing: 'Mon-Thu, 16:00 - 19:00',
    status: 'ACTIVE',
    redemptions: 142,
    totalSavings: 24650,
  },
  {
    id: 'camp-weekend-bogo',
    name: 'Weekend Biryani Feast (BOGO)',
    code: 'BIRYANIFEST',
    type: 'BOGO',
    discountValue: 100,
    minOrderValue: 699,
    timing: 'Fri-Sun, All Day',
    status: 'ACTIVE',
    redemptions: 89,
    totalSavings: 31061,
  },
  {
    id: 'camp-welcome-first',
    name: 'Welcome New Guest ₹150 Flat Off',
    code: 'FIRST150',
    type: 'FLAT',
    discountValue: 150,
    minOrderValue: 500,
    status: 'ACTIVE',
    redemptions: 320,
    totalSavings: 48000,
  },
  {
    id: 'camp-vip-points-2x',
    name: 'VIP Loyalty 2x Point Booster',
    code: 'VIPDOUBLE',
    type: 'LOYALTY_BOOST',
    discountValue: 2,
    minOrderValue: 0,
    status: 'ACTIVE',
    redemptions: 64,
    totalSavings: 12800,
  },
];

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [showNewModal, setShowNewModal] = useState(false);
  const [broadcastLog, setBroadcastLog] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newDiscount, setNewDiscount] = useState('15');
  const [newType, setNewType] = useState<'PERCENTAGE' | 'FLAT' | 'BOGO'>('PERCENTAGE');

  const handleBroadcast = (campaignName: string) => {
    setBroadcastLog(`📱 WhatsApp & SMS Promo blast dispatched for "${campaignName}" to 450 loyalty club members!`);
    setTimeout(() => setBroadcastLog(null), 5000);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const newCamp: Campaign = {
      id: `camp-${Date.now()}`,
      name: newName || 'Flash Deal Promo',
      code: (newCode || 'FLASHDEAL').toUpperCase(),
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
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Tag className="w-6 h-6 text-primary" />
            Marketing & Dynamic Promotions Studio
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automated happy hours, BOGO combo rules, coupon engine and targeted SMS broadcasts
          </p>
        </div>
        <Button onClick={() => setShowNewModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Promotion
        </Button>
      </div>

      {/* Broadcast Alert */}
      {broadcastLog && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          {broadcastLog}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Total Redemptions</p>
          <p className="text-2xl font-black text-foreground mt-2">
            {campaigns.reduce((acc, c) => acc + c.redemptions, 0)} Coupons
          </p>
          <p className="text-xs text-emerald-400 mt-1">↑ 18% redemption rate</p>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Discount Generated Revenue</p>
          <p className="text-2xl font-black text-primary mt-2">₹4,28,900</p>
          <p className="text-xs text-muted-foreground mt-1">Directly attributed sales</p>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Customer Savings</p>
          <p className="text-2xl font-black text-amber-400 mt-2">
            ₹{campaigns.reduce((acc, c) => acc + c.totalSavings, 0).toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Total discounts granted</p>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Active Loyalty Reach</p>
          <p className="text-2xl font-black text-emerald-400 mt-2">1,280 Guests</p>
          <p className="text-xs text-muted-foreground mt-1">Subscribed to SMS/WhatsApp</p>
        </div>
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {campaigns.map((camp) => (
          <div
            key={camp.id}
            className="p-6 rounded-2xl border border-border bg-card/70 backdrop-blur hover:border-border/80 transition-all flex flex-col justify-between"
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
                  <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-background border border-dashed border-primary/50 text-sm font-mono font-bold text-primary tracking-wider">
                    {camp.code}
                  </div>
                </div>

                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30">
                  {camp.status}
                </span>
              </div>

              {/* Conditions */}
              <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                <p>• Min Order: <strong className="text-foreground">₹{camp.minOrderValue}</strong></p>
                {camp.timing && <p>• Active Hours: <strong className="text-foreground">{camp.timing}</strong></p>}
                {camp.maxDiscount && <p>• Max Discount Cap: <strong className="text-foreground">₹{camp.maxDiscount}</strong></p>}
              </div>

              {/* Redemptions count */}
              <div className="grid grid-cols-2 gap-3 my-4 p-3 rounded-xl bg-background/50 border border-border/50 text-center">
                <div>
                  <p className="text-[11px] text-muted-foreground">Times Redeemed</p>
                  <p className="text-base font-bold text-foreground mt-0.5">{camp.redemptions}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Total Discount Given</p>
                  <p className="text-base font-bold text-emerald-400 mt-0.5">₹{camp.totalSavings.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBroadcast(camp.name)}
                className="gap-1.5 text-xs border-primary/40 text-primary hover:bg-primary/10"
              >
                <Megaphone className="w-3.5 h-3.5" />
                Broadcast via SMS / WhatsApp
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* New Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4">
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
                  placeholder="e.g. Monsoon Special 25% Off"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full mt-1 h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Coupon Code</label>
                  <input
                    type="text"
                    required
                    placeholder="MONSOON25"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full mt-1 h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground uppercase font-mono font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Discount Value (%)</label>
                  <input
                    type="number"
                    required
                    placeholder="25"
                    value={newDiscount}
                    onChange={(e) => setNewDiscount(e.target.value)}
                    className="w-full mt-1 h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
