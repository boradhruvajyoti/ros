'use client';

import { useState } from 'react';
import {
  Gift, CreditCard, Plus, CheckCircle2, Search,
  Sparkles, Wallet, RefreshCw, Send, DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@ros/utils';

interface GiftCard {
  id: string;
  cardNumber: string;
  recipientName: string;
  recipientPhone: string;
  initialBalance: number;
  currentBalance: number;
  status: 'ACTIVE' | 'REDEEMED' | 'EXPIRED';
  issuedAt: string;
  expiryDate: string;
}

export default function GiftCardsPage() {
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('2000');

  const filteredCards = cards.filter(
    (c) =>
      c.recipientName.toLowerCase().includes(search.toLowerCase()) ||
      c.cardNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.recipientPhone.includes(search)
  );

  const handleIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error('Required', 'Please enter recipient name and phone number');
      return;
    }
    const val = parseFloat(amount) || 2000;
    const newC: GiftCard = {
      id: `GC-${Math.floor(1000 + Math.random() * 9000)}`,
      cardNumber: `ROS-GIFT-${Math.floor(1000 + Math.random() * 9000)}`,
      recipientName: name.trim(),
      recipientPhone: phone.trim(),
      initialBalance: val,
      currentBalance: val,
      status: 'ACTIVE',
      issuedAt: new Date().toLocaleDateString(),
      expiryDate: '1 Year Validity',
    };
    setCards([newC, ...cards]);
    setShowModal(false);
    setName('');
    setPhone('');
    toast.success('Gift Card Issued', `Card ${newC.cardNumber} activated with ${formatCurrency(val)}`);
  };

  const totalFloat = cards.reduce((acc, c) => acc + c.currentBalance, 0);
  const totalIssued = cards.reduce((acc, c) => acc + c.initialBalance, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card/60 p-5 rounded-3xl border border-border backdrop-blur-sm">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Gift className="w-6 h-6 text-primary" />
            Digital Gift Cards &amp; Prepaid Customer Wallets
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Issue branded digital gift cards, corporate vouchers &amp; fast POS payment redemptions
          </p>
        </div>
        <Button onClick={() => setShowModal(true)} className="gap-2 font-bold rounded-2xl h-10 px-4">
          <Plus className="w-4 h-4" />
          Issue New Gift Card
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Total Prepaid Float</p>
          <p className="text-2xl font-black text-emerald-500 font-mono mt-2">{formatCurrency(totalFloat)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Outstanding unredeemed balance</p>
        </div>
        <div className="p-5 rounded-3xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Active Gift Cards</p>
          <p className="text-2xl font-black text-primary font-mono mt-2">
            {cards.filter((c) => c.status === 'ACTIVE').length} Cards
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">Ready for POS redemption</p>
        </div>
        <div className="p-5 rounded-3xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Total Value Issued</p>
          <p className="text-2xl font-black text-foreground font-mono mt-2">{formatCurrency(totalIssued)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Cumulative card sales</p>
        </div>
        <div className="p-5 rounded-3xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Wallet Engine Status</p>
          <p className="text-2xl font-black text-emerald-500 mt-2">Online</p>
          <p className="text-[11px] text-muted-foreground mt-1">Instant billing integration</p>
        </div>
      </div>

      {/* Search & Cards Table */}
      {cards.length === 0 ? (
        <Card className="p-16 text-center border-dashed border-2 border-border/80 bg-card/30 rounded-3xl">
          <Gift className="w-12 h-12 mx-auto text-primary/30 mb-3" />
          <h3 className="text-lg font-bold text-foreground">No Gift Cards Issued Yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
            Issue your first digital prepaid card or corporate voucher for diners.
          </p>
          <Button onClick={() => setShowModal(true)} className="gap-2 font-bold rounded-2xl">
            <Plus className="w-4 h-4" /> Issue First Gift Card
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search card number, guest or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 h-10 rounded-xl border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="rounded-3xl border border-border bg-card/70 backdrop-blur overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground font-bold uppercase border-b border-border">
                  <tr>
                    <th className="p-4">Card Number</th>
                    <th className="p-4">Recipient Guest</th>
                    <th className="p-4">Phone Number</th>
                    <th className="p-4 text-right">Initial Value</th>
                    <th className="p-4 text-right">Current Balance</th>
                    <th className="p-4">Validity</th>
                    <th className="p-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredCards.map((card) => (
                    <tr key={card.id} className="hover:bg-muted/20 transition-all">
                      <td className="p-4 font-mono font-bold text-primary flex items-center gap-2">
                        <CreditCard className="w-4 h-4 shrink-0" />
                        {card.cardNumber}
                      </td>
                      <td className="p-4 font-medium text-foreground">{card.recipientName}</td>
                      <td className="p-4 font-mono text-muted-foreground">{card.recipientPhone}</td>
                      <td className="p-4 text-right font-medium text-muted-foreground">{formatCurrency(card.initialBalance)}</td>
                      <td className="p-4 text-right font-bold text-emerald-500 font-mono text-sm">
                        {formatCurrency(card.currentBalance)}
                      </td>
                      <td className="p-4 text-muted-foreground">{card.expiryDate}</td>
                      <td className="p-4 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-500/15 text-emerald-500 border-emerald-500/30">
                          {card.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Issue Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              Issue Digital Gift Card
            </h3>
            <form onSubmit={handleIssue} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Recipient Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Kapoor"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full mt-1 h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Mobile Phone Number</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full mt-1 h-10 px-3 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Prepaid Amount (₹)</label>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full mt-1 h-10 px-3 rounded-xl border border-border bg-background text-sm font-bold text-emerald-500 font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">Activate &amp; Issue Card</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
