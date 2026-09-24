'use client';

import React, { useState } from 'react';
import { 
  Wine, 
  Calendar, 
  Users, 
  DollarSign, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Download, 
  Utensils, 
  Tv, 
  ChevronRight,
  ShieldCheck,
  Building
} from 'lucide-react';

interface BanquetEvent {
  id: string;
  beoNumber: string;
  eventName: string;
  clientName: string;
  clientPhone: string;
  eventType: 'WEDDING' | 'CORPORATE' | 'ANNIVERSARY' | 'COCKTAIL';
  eventDate: string;
  hallName: string;
  guestCount: number;
  totalBudget: number;
  depositReceived: number;
  status: 'INQUIRY' | 'TASTING_SCHEDULED' | 'BEO_CONFIRMED' | 'EXECUTED';
  courses: string[];
  avSpecs: string[];
}

const INITIAL_EVENTS: BanquetEvent[] = [
  {
    id: 'EVT-501',
    beoNumber: 'BEO-2026-089',
    eventName: 'Singhania Silver Jubilee Gala',
    clientName: 'Vikram Singhania',
    clientPhone: '+91 98210 99882',
    eventType: 'ANNIVERSARY',
    eventDate: '2026-10-12',
    hallName: 'Grand Imperial Ballroom',
    guestCount: 220,
    totalBudget: 480000,
    depositReceived: 240000,
    status: 'BEO_CONFIRMED',
    courses: [
      'Welcome Drinks: Passionfruit Basil Spritz & Prosecco',
      'Live Chaat & Woodfired Neapolitan Pizza Bar',
      'Awadhi Dum Biryani & Dal Bukhara Royal Buffet',
      'Gulab Jamun Cheesecake & Kesar Kulfi Shots'
    ],
    avSpecs: ['Dual 4K Projectors', 'Wireless Lapel Mics (x4)', 'Ambient Amber Mood Uplighting', 'Live Band Sound System']
  },
  {
    id: 'EVT-502',
    beoNumber: 'BEO-2026-092',
    eventName: 'NexGen Fintech Leadership Summit',
    clientName: 'Pooja Kashyap',
    clientPhone: '+91 97114 33221',
    eventType: 'CORPORATE',
    eventDate: '2026-10-18',
    hallName: 'The Sapphire Executive Suite',
    guestCount: 85,
    totalBudget: 195000,
    depositReceived: 100000,
    status: 'TASTING_SCHEDULED',
    courses: [
      'High Tea: Artisanal Espresso & Avocado Crostini',
      'Executive Buffet: Grilled Sea Bass & Wild Mushroom Stroganoff',
      'Dessert: Dark Chocolate Mousse & French Macarons'
    ],
    avSpecs: ['Podium Mic', 'Ultra-Wide Keynote Display', 'Dedicated 1Gbps WiFi']
  }
];

export default function CateringPage() {
  const [events, setEvents] = useState<BanquetEvent[]>(INITIAL_EVENTS);
  const [selectedEvent, setSelectedEvent] = useState<BanquetEvent>(INITIAL_EVENTS[0]);
  const [showModal, setShowModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    eventName: '',
    clientName: '',
    clientPhone: '',
    eventType: 'CORPORATE',
    eventDate: '2026-11-15',
    hallName: 'Grand Imperial Ballroom',
    guestCount: 100,
    totalBudget: 250000,
    depositReceived: 75000
  });

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const created: BanquetEvent = {
      id: `EVT-${Math.floor(600 + Math.random() * 300)}`,
      beoNumber: `BEO-2026-0${Math.floor(100 + Math.random() * 900)}`,
      eventName: newEvent.eventName || 'Corporate Banquet',
      clientName: newEvent.clientName || 'Guest Organizer',
      clientPhone: newEvent.clientPhone || '+91 90000 00000',
      eventType: newEvent.eventType as any,
      eventDate: newEvent.eventDate,
      hallName: newEvent.hallName,
      guestCount: Number(newEvent.guestCount),
      totalBudget: Number(newEvent.totalBudget),
      depositReceived: Number(newEvent.depositReceived),
      status: 'INQUIRY',
      courses: ['Welcome Cocktail & Canapés', 'Royal Multi-Cuisine Buffet', 'Chef Signature Dessert Station'],
      avSpecs: ['Sound System & Wireless Mics', 'Projector Screen']
    };

    setEvents(prev => [created, ...prev]);
    setSelectedEvent(created);
    setShowModal(false);
  };

  const totalPipeline = events.reduce((acc, e) => acc + e.totalBudget, 0);
  const totalDeposits = events.reduce((acc, e) => acc + e.depositReceived, 0);
  const totalGuests = events.reduce((acc, e) => acc + e.guestCount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Wine className="w-7 h-7 text-purple-400" /> Banquets, Catering & Event BEO Planner
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Banquet Event Order (BEO)
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            End-to-end banquet lifecycle: bespoke course tastings, AV setup contracts, guest headcount & payment milestones.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white text-xs font-bold shadow-lg shadow-purple-500/20 transition"
          >
            <Plus className="w-4 h-4" /> New Banquet Booking
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Catering Pipeline</span>
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">₹{(totalPipeline / 100000).toFixed(2)} Lakhs</div>
            <div className="text-xs text-emerald-400 mt-1 font-medium">
              {events.length} Active Banquets
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Deposits Secured</span>
            <ShieldCheck className="w-5 h-5 text-purple-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-purple-300">₹{(totalDeposits / 100000).toFixed(2)} Lakhs</div>
            <div className="text-xs text-slate-400 mt-1">
              {Math.round((totalDeposits / totalPipeline) * 100)}% Milestone Secured
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Banquet Covers</span>
            <Users className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-indigo-300">{totalGuests} Guests</div>
            <div className="text-xs text-slate-400 mt-1">
              Avg ₹{Math.round(totalPipeline / totalGuests)} per plate
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ballroom Utilization</span>
            <Building className="w-5 h-5 text-amber-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-300">92% Booked</div>
            <div className="text-xs text-amber-400/90 mt-1">
              Weekend Slots Fully Reserved
            </div>
          </div>
        </div>
      </div>

      {/* Main BEO Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Events List (Left 4 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Banquet Events Schedule ({events.length})
          </h2>

          <div className="space-y-3">
            {events.map((evt) => {
              const isSelected = selectedEvent.id === evt.id;
              return (
                <div
                  key={evt.id}
                  onClick={() => setSelectedEvent(evt)}
                  className={`cursor-pointer p-5 rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-slate-800 border-purple-500/80 shadow-xl ring-1 ring-purple-500/30'
                      : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-purple-400">{evt.beoNumber}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300">
                      {evt.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="text-base font-bold text-white mt-1.5">{evt.eventName}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{evt.clientName} • {evt.clientPhone}</div>

                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Date</span>
                      <span className="font-semibold text-slate-300">{evt.eventDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Guests</span>
                      <span className="font-semibold text-slate-300">{evt.guestCount} pax</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Budget</span>
                      <span className="font-semibold text-emerald-400">₹{(evt.totalBudget / 1000).toFixed(0)}k</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* BEO Detail Sheet (Right 7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-2xl space-y-5">
            {/* Sheet Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-400" />
                  <span className="text-xs font-mono font-bold text-purple-300">{selectedEvent.beoNumber}</span>
                </div>
                <div className="text-lg font-bold text-white mt-1">{selectedEvent.eventName}</div>
                <div className="text-xs text-slate-400">{selectedEvent.hallName} • {selectedEvent.eventDate}</div>
              </div>

              <button
                onClick={() => alert(`Generating official Banquet Event Order (BEO) PDF for ${selectedEvent.beoNumber}...`)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              >
                <Download className="w-4 h-4" /> Export BEO PDF
              </button>
            </div>

            {/* Financial Milestones */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Payment Schedule & Deposit Milestones
              </div>
              <div className="grid grid-cols-3 gap-4 text-xs pt-1">
                <div>
                  <span className="text-slate-400">Total Contract Value:</span>
                  <div className="text-sm font-bold text-white mt-0.5">₹{selectedEvent.totalBudget.toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <span className="text-slate-400">Deposit Received:</span>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5">₹{selectedEvent.depositReceived.toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <span className="text-slate-400">Final Balance Due:</span>
                  <div className="text-sm font-bold text-amber-300 mt-0.5">₹{(selectedEvent.totalBudget - selectedEvent.depositReceived).toLocaleString('en-IN')}</div>
                </div>
              </div>
            </div>

            {/* Menu Courses */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5 text-purple-400" /> Approved Banquet Menu Courses
              </div>
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-2">
                {selectedEvent.courses.map((course, idx) => (
                  <div key={idx} className="text-xs text-slate-200 flex items-start gap-2">
                    <span className="text-purple-400 font-bold">•</span>
                    <span>{course}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AV & Stage Requirements */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5 text-indigo-400" /> Audio-Visual & Production Setup
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedEvent.avSpecs.map((spec, idx) => (
                  <span key={idx} className="px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-300">
                    {spec}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Event Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Wine className="w-5 h-5 text-purple-400" /> Book New Banquet Event
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Event Name / Occasion</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sharma Wedding Reception"
                  value={newEvent.eventName}
                  onChange={(e) => setNewEvent({ ...newEvent, eventName: e.target.value })}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Client Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Sharma"
                    value={newEvent.clientName}
                    onChange={(e) => setNewEvent({ ...newEvent, clientName: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Phone</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98000 00000"
                    value={newEvent.clientPhone}
                    onChange={(e) => setNewEvent({ ...newEvent, clientPhone: e.target.value })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Guest Count</label>
                  <input
                    type="number"
                    value={newEvent.guestCount}
                    onChange={(e) => setNewEvent({ ...newEvent, guestCount: Number(e.target.value) })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Total Budget (₹)</label>
                  <input
                    type="number"
                    value={newEvent.totalBudget}
                    onChange={(e) => setNewEvent({ ...newEvent, totalBudget: Number(e.target.value) })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Deposit (₹)</label>
                  <input
                    type="number"
                    value={newEvent.depositReceived}
                    onChange={(e) => setNewEvent({ ...newEvent, depositReceived: Number(e.target.value) })}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-purple-500/20"
                >
                  Save & Generate BEO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
