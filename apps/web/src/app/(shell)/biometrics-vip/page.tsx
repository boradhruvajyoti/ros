'use client';

import React, { useState } from 'react';
import { 
  Camera, 
  Crown, 
  Heart, 
  AlertTriangle, 
  Sparkles, 
  UserCheck, 
  Utensils, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  Eye, 
  Zap,
  ShieldCheck,
  Coffee
} from 'lucide-react';

interface VIPGuest {
  id: string;
  name: string;
  vipTier: 'DIAMOND_ELITE' | 'PLATINUM' | 'GOLD_CONNOISSEUR';
  lifetimeSpendINR: number;
  totalVisits: number;
  lastVisit: string;
  preferredTable: string;
  preferredServer: string;
  favoriteDish: string;
  favoriteDrink: string;
  allergies: string[];
  specialNotes: string;
  checkInTime?: string;
}

const INITIAL_VIPS: VIPGuest[] = [
  {
    id: 'VIP-001',
    name: 'Rajesh Singhania',
    vipTier: 'DIAMOND_ELITE',
    lifetimeSpendINR: 840000,
    totalVisits: 62,
    lastVisit: '3 days ago',
    preferredTable: 'Table 4 (Quiet Corner Booth)',
    preferredServer: 'Aarav Sharma (Captain)',
    favoriteDish: 'Truffle Galouti Kebab + Dal Makhani',
    favoriteDrink: 'Château Margaux 2015 (Decanted 30m)',
    allergies: ['No Peanuts', 'Mild Spice Only'],
    specialNotes: 'Prefers warm sparkling water with 1 lemon slice upon seating. Celebrating 25th anniversary next month.',
    checkInTime: 'Just now (Podium Camera #1)'
  },
  {
    id: 'VIP-002',
    name: 'Tara Sethi',
    vipTier: 'PLATINUM',
    lifetimeSpendINR: 420000,
    totalVisits: 38,
    lastVisit: '1 week ago',
    preferredTable: 'Table 12 (Outdoor Courtyard)',
    preferredServer: 'Priya Patel',
    favoriteDish: 'Pan Seared Sea Bass + Burrata Salad',
    favoriteDrink: 'Cloudy Bay Sauvignon Blanc',
    allergies: ['Gluten Sensitive'],
    specialNotes: 'Loves fresh coriander garnish. Always requests candle on table.',
    checkInTime: '12 mins ago'
  },
  {
    id: 'VIP-003',
    name: 'Dr. Sameer Godbole',
    vipTier: 'GOLD_CONNOISSEUR',
    lifetimeSpendINR: 285000,
    totalVisits: 29,
    lastVisit: '2 weeks ago',
    preferredTable: 'Table 8 (Center Dining)',
    preferredServer: 'Kabir Verma',
    favoriteDish: 'Awadhi Mutton Biryani',
    favoriteDrink: 'Single Malt (Glenfiddich 18 on large rock)',
    allergies: ['None'],
    specialNotes: 'Entertains corporate medical executives. Ensure expedited appetizer pass.'
  }
];

export default function BiometricsVIPPage() {
  const [vips, setVips] = useState<VIPGuest[]>(INITIAL_VIPS);
  const [selectedVIP, setSelectedVIP] = useState<VIPGuest>(INITIAL_VIPS[0]);
  const [alertToast, setAlertToast] = useState<string | null>(null);

  const handleSimulateCheckIn = (id: string) => {
    setVips(prev => prev.map(v => v.id === id ? { ...v, checkInTime: 'Just now (Podium Recognition)' } : v));
    const guest = vips.find(v => v.id === id);
    if (guest) {
      setSelectedVIP(guest);
      setAlertToast(`VIP Recognized: ${guest.name} (${guest.vipTier})! Maitre D' alerted for Table ${guest.preferredTable.split(' ')[1]}.`);
      setTimeout(() => setAlertToast(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {alertToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-bold shadow-2xl border border-amber-300/40 animate-in slide-in-from-bottom-5">
          <Crown className="w-5 h-5 animate-bounce text-slate-950" />
          <span className="text-sm">{alertToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Camera className="w-7 h-7 text-amber-400" /> VIP Guest Biometrics & Host Stand AI
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Maitre D' Luxury Intelligence
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Opt-in facial recognition at host podium, instant dining dossiers, dietary restrictions & bespoke high-roller service alerts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs font-medium text-slate-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Host Podium AI: <strong className="text-emerald-300 font-mono">Camera #1 Active (99.1% Match)</strong>
          </div>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">VIP Members Recognized</span>
            <Crown className="w-5 h-5 text-amber-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">14 VIPs Seated</div>
            <div className="text-xs text-amber-400 mt-1 font-medium">
              3 Diamond Elite in House
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg VIP Check Size</span>
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-300">₹14,200</div>
            <div className="text-xs text-slate-400 mt-1">
              4.8x standard guest spend
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Greeting Readiness SLA</span>
            <Clock className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-indigo-300">&lt; 3.0s</div>
            <div className="text-xs text-slate-400 mt-1">
              Instant name & table recall
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Allergy Warning Alert</span>
            <ShieldCheck className="w-5 h-5 text-rose-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-300">100% Zero-Error</div>
            <div className="text-xs text-slate-400 mt-1">
              Auto-flagged to Chef pass
            </div>
          </div>
        </div>
      </div>

      {/* Main Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* VIP Recognition Roster (Left 5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Podium Check-in Feed ({vips.length} VIPs)
          </h2>

          <div className="space-y-3">
            {vips.map((vip) => {
              const isSelected = selectedVIP.id === vip.id;
              const isDiamond = vip.vipTier === 'DIAMOND_ELITE';

              return (
                <div
                  key={vip.id}
                  onClick={() => setSelectedVIP(vip)}
                  className={`cursor-pointer p-5 rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-slate-800 border-amber-500/80 shadow-xl ring-1 ring-amber-500/30'
                      : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5" /> {vip.vipTier.replace('_', ' ')}
                    </span>
                    {vip.checkInTime ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                        {vip.checkInTime}
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSimulateCheckIn(vip.id);
                        }}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition"
                      >
                        Recognize Entry
                      </button>
                    )}
                  </div>

                  <div className="text-base font-bold text-white mt-1.5">{vip.name}</div>
                  <div className="text-xs text-slate-400">Total Spend: ₹{(vip.lifetimeSpendINR / 100000).toFixed(1)} Lakhs • {vip.totalVisits} Visits</div>

                  <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Favorite Table: <strong className="text-amber-300">{vip.preferredTable.split(' ')[0]} {vip.preferredTable.split(' ')[1]}</strong></span>
                    <span className="text-indigo-400 font-medium">Server: {vip.preferredServer.split(' ')[0]}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* VIP Dining Dossier (Right 7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-2xl space-y-5">
            {/* Dossier Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <Crown className="w-6 h-6 text-amber-400" />
                  <h3 className="text-lg font-bold text-white">{selectedVIP.name}</h3>
                </div>
                <div className="text-xs text-amber-300 mt-1 font-semibold">{selectedVIP.vipTier.replace('_', ' ')} • Lifetime Spend: ₹{selectedVIP.lifetimeSpendINR.toLocaleString('en-IN')}</div>
              </div>

              <button
                onClick={() => handleSimulateCheckIn(selectedVIP.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition"
              >
                <Zap className="w-4 h-4" /> Trigger Maitre D' Alert
              </button>
            </div>

            {/* Special Greeting & Table Instructions */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Maitre D' Personalized Greeting & Seating Prompt
              </div>
              <p className="text-xs text-slate-200 leading-relaxed italic">
                "{selectedVIP.specialNotes}"
              </p>
            </div>

            {/* F&B Preferences Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold block">Favorite Dish</span>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-amber-400" />
                  <span>{selectedVIP.favoriteDish}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold block">Favorite Beverage</span>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Coffee className="w-3.5 h-3.5 text-rose-400" />
                  <span>{selectedVIP.favoriteDrink}</span>
                </div>
              </div>
            </div>

            {/* Dietary & Allergy Red Flags */}
            <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-2">
              <div className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" /> Critical Allergy & Dietary Flags
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {selectedVIP.allergies.map((a, idx) => (
                  <span key={idx} className="px-3 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
