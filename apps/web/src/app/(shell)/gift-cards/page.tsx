'use client';

import { useState } from 'react';
import {
  Gift, CreditCard, Plus, CheckCircle2, Search,
  Sparkles, Wallet, RefreshCw, Send, DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  lastUsedAt?: string;
}

const initialCards: GiftCard[] = [
  {
    id: 'GC-9081',
    cardNumber: 'ROS-GIFT-9081',
    recipientName: 'Ananya Sharma',
    recipientPhone: '+91 98765 43210',
    initialBalance: 5000,
    currentBalance: 3200,
    status: 'ACTIVE',
    issuedAt: '2026-08-15',
    expiryDate: '2027-08-15',
    lastUsedAt: 'Yesterday at Table T5',
  },
  {
    id: 'GC-4412',
    cardNumber: 'ROS-GIFT-4412',
    recipientName: 'Rohan Mehra',
    recipientPhone: '+91 91234 56789',
    initialBalance: 2500,
    currentBalance: 2500,
    status: 'ACTIVE',
    issuedAt: '2026-09-01',
    expiryDate: '2027-09-01',
  },
  {
    id: 'GC-1102',
    cardNumber: 'ROS-GIFT-1102',
    recipientName: 'Corporate Banquet Gifting',
    recipientPhone: '+91 99001 22334',
    initialBalance: 10000,
    currentBalance: 0,
    status: 'REDEEMED',
    issuedAt: '2026-07-20',
    expiryDate: '2027-07-20',
    lastUsedAt: 'Table T7 (Full redemption)',
  },
];

export default function GiftCardsPage() {
  const [cards, setCards] = useState<GiftCard[]>(initialCards);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('2500');

  const filteredCards = cards.filter(
    (c) =>
      c.recipientName.toLowerCase().includes(search.toLowerCase()) ||
      c.cardNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.recipientPhone.includes(search)
  );

  const handleIssue = (e: React.FormEvent) => {
    e.preventDefault();
    const newC: GiftCard = {
      id: `GC-${Math.floor(1000 + Math.random() * 9000)}`,
      cardNumber: `ROS-GIFT-${Math.floor(1000 + Math.random() * 9000)}`,
      recipientName: name,
      recipientPhone: phone,
      initialBalance: parseFloat(amount) || 2000,
      currentBalance: parseFloat(amount) || 2000,
      status: 'ACTIVE',
      issuedAt: 'Today',
      expiryDate: '1 Year from today',
    };
    setCards([newC, ...cards]);
    setShowModal(false);
    setName('');
    setPhone('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Gift className="w-6 h-6 text-primary" />
            Digital Gift Cards & Prepaid Customer Wallets
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Issue branded digital gift cards, corporate vouchers, digital wallet top-ups & POS payment redemptions
          </p>
        </div>
        <Button onClick={() => setShowModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Issue New Gift Card
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Total Prepaid Float</p>
          <p className="text-3xl font-black text-emerald-400 mt-2">
            ₹{cards.reduce((acc, c) => acc + c.currentBalance, 0).toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Outstanding unredeemed float</p>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Active Gift Cards</p>
          <p className="text-3xl font-black text-primary mt-2">
            {cards.filter((c) => c.status === 'ACTIVE').length} Cards
          </p>
          <p className="text-xs text-muted-foreground mt-1">Ready for POS redemption</p>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Total Value Issued</p>
          <p className="text-3xl font-black text-foreground mt-2">
            ₹{cards.reduce((acc, c) => acc + c.initialBalance, 0).toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Lifetime card sales</p>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Redemption Rate</p>
          <p className="text-3xl font-black text-amber-400 mt-2">68.5%</p>
          <p className="text-xs text-muted-foreground mt-1">Drives 2.4x repeat visits</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search card number, guest or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 h-9 rounded-lg border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Cards Table */}
      <div className="rounded-2xl border border-border bg-card/70 backdrop-blur overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
              <tr>
                <th className="p-4">Card Number</th>
                <th className="p-4">Recipient Guest</th>
                <th className="p-4">Phone Number</th>
                <th className="p-4 text-right">Initial Value</th>
                <th className="p-4 text-right">Current Balance</th>
                <th className="p-4">Expiry Date</th>
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
                  <td className="p-4 text-right font-medium text-muted-foreground">₹{card.initialBalance.toLocaleString('en-IN')}</td>
                  <td className="p-4 text-right font-bold text-emerald-400 text-sm">
                    ₹{card.currentBalance.toLocaleString('en-IN')}
                  </td>
                  <td className="p-4 text-muted-foreground">{card.expiryDate}</td>
                  <td className="p-4 text-center">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      card.status === 'ACTIVE'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-muted text-muted-foreground border-border'
                    }`}>
                      {card.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issue Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4">
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
                  className="w-full mt-1 h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
                  className="w-full mt-1 h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Prepaid Amount (₹)</label>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full mt-1 h-10 px-3 rounded-lg border border-border bg-background text-sm font-bold text-emerald-400 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">Activate & Issue Card</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
