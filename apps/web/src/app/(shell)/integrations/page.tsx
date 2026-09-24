'use client';

import { useState } from 'react';
import {
  Radio, CheckCircle2, RefreshCw, Zap, ShieldCheck,
  Smartphone, MessageSquare, AlertCircle, PlayCircle,
  ExternalLink, Power, ToggleLeft, ToggleRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Channel {
  id: string;
  name: string;
  type: string;
  platform: 'zomato' | 'swiggy' | 'ubereats' | 'whatsapp';
  status: 'CONNECTED' | 'DISCONNECTED';
  autoAccept: boolean;
  activeOrders: number;
  todayRevenue: number;
  syncStatus: 'SYNCED' | 'PENDING';
  lastSync: string;
  rating: number;
}

const initialChannels: Channel[] = [
  {
    id: 'chan-zomato',
    name: 'Zomato Food Delivery',
    type: 'Aggregator API v2',
    platform: 'zomato',
    status: 'CONNECTED',
    autoAccept: true,
    activeOrders: 4,
    todayRevenue: 14280,
    syncStatus: 'SYNCED',
    lastSync: '2 mins ago',
    rating: 4.4,
  },
  {
    id: 'chan-swiggy',
    name: 'Swiggy Partner Live',
    type: 'Aggregator Webhook Direct',
    platform: 'swiggy',
    status: 'CONNECTED',
    autoAccept: true,
    activeOrders: 7,
    todayRevenue: 22450,
    syncStatus: 'SYNCED',
    lastSync: 'Just now',
    rating: 4.6,
  },
  {
    id: 'chan-ubereats',
    name: 'Uber Eats Marketplace',
    type: 'Global POS Sync',
    platform: 'ubereats',
    status: 'CONNECTED',
    autoAccept: false,
    activeOrders: 1,
    todayRevenue: 3890,
    syncStatus: 'SYNCED',
    lastSync: '5 mins ago',
    rating: 4.2,
  },
  {
    id: 'chan-whatsapp',
    name: 'WhatsApp Direct Bot',
    type: 'Conversational Commerce',
    platform: 'whatsapp',
    status: 'CONNECTED',
    autoAccept: true,
    activeOrders: 3,
    todayRevenue: 6120,
    syncStatus: 'SYNCED',
    lastSync: 'Real-time Webhook',
    rating: 4.9,
  },
];

export default function IntegrationsPage() {
  const [channels, setChannels] = useState<Channel[]>(initialChannels);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simulationLog, setSimulationLog] = useState<string | null>(null);

  const toggleAutoAccept = (id: string) => {
    setChannels((prev) =>
      prev.map((c) => (c.id === id ? { ...c, autoAccept: !c.autoAccept } : c))
    );
  };

  const handleSyncMenu = (id: string) => {
    setSyncingId(id);
    setTimeout(() => {
      setSyncingId(null);
      setSimulationLog(`✅ Menu & 86-item stock levels synchronized with ${channels.find(c => c.id === id)?.name}!`);
    }, 1000);
  };

  const handleSimulateOrder = async (platform: string) => {
    setSimulating(true);
    setSimulationLog(`⚡ Ingesting simulated webhook from ${platform.toUpperCase()}...`);
    try {
      await fetch('http://localhost:4000/api/v1/integrations/simulate-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: platform,
          customerName: `Online Guest (${platform.toUpperCase()})`,
          total: Math.floor(450 + Math.random() * 800),
        }),
      });
      setTimeout(() => {
        setSimulating(false);
        setSimulationLog(`🎉 Simulated order received from ${platform.toUpperCase()} → Auto-accepted and routed to Kitchen KDS!`);
      }, 800);
    } catch (e) {
      setSimulating(false);
      setSimulationLog(`🎉 Simulated order dispatched locally to KDS queue!`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Radio className="w-6 h-6 text-primary animate-pulse" />
            3rd-Party Delivery & Channel Integrations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Unified omnichannel aggregator hub with automated KOT routing, live menu sync & rider tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSimulateOrder('Swiggy')}
            disabled={simulating}
            className="border-primary/40 text-primary hover:bg-primary/10"
          >
            <PlayCircle className="w-4 h-4 mr-2" />
            Simulate Swiggy Order
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSimulateOrder('Zomato')}
            disabled={simulating}
            className="border-rose-500/40 text-rose-400 hover:bg-rose-500/10"
          >
            <PlayCircle className="w-4 h-4 mr-2" />
            Simulate Zomato Order
          </Button>
        </div>
      </div>

      {/* Simulation Banner */}
      {simulationLog && (
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-between text-sm">
          <span className="font-medium text-primary flex items-center gap-2">
            <Zap className="w-4 h-4 shrink-0" />
            {simulationLog}
          </span>
          <button onClick={() => setSimulationLog(null)} className="text-muted-foreground hover:text-foreground text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Aggregator Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Aggregator Revenue (Today)</p>
          <p className="text-2xl font-black text-foreground mt-2">
            ₹{channels.reduce((acc, c) => acc + c.todayRevenue, 0).toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-emerald-400 mt-1">↑ 24% vs yesterday</p>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Active Online Orders</p>
          <p className="text-2xl font-black text-primary mt-2">
            {channels.reduce((acc, c) => acc + c.activeOrders, 0)} Live
          </p>
          <p className="text-xs text-muted-foreground mt-1">Cooking in kitchen / rider dispatched</p>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Avg Order Fulfillment</p>
          <p className="text-2xl font-black text-amber-400 mt-2">14.2 mins</p>
          <p className="text-xs text-muted-foreground mt-1">Target: &lt; 18 mins SLA</p>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Aggregator Sync Health</p>
          <p className="text-2xl font-black text-emerald-400 mt-2">100% Synced</p>
          <p className="text-xs text-muted-foreground mt-1">All 4 channels active & healthy</p>
        </div>
      </div>

      {/* Channel Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {channels.map((chan) => (
          <div
            key={chan.id}
            className="p-6 rounded-2xl border border-border bg-card/70 backdrop-blur hover:border-border/80 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                    chan.platform === 'zomato' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                    chan.platform === 'swiggy' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                    chan.platform === 'ubereats' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {chan.platform === 'zomato' && 'Z'}
                    {chan.platform === 'swiggy' && 'S'}
                    {chan.platform === 'ubereats' && 'U'}
                    {chan.platform === 'whatsapp' && 'W'}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                      {chan.name}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                        {chan.status}
                      </span>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{chan.type}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-muted-foreground">Rating</span>
                  <p className="text-sm font-bold text-amber-400">★ {chan.rating.toFixed(1)}</p>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-3 my-5 p-3 rounded-xl bg-background/50 border border-border/50 text-center">
                <div>
                  <p className="text-[11px] text-muted-foreground">Active Orders</p>
                  <p className="text-lg font-bold text-foreground mt-0.5">{chan.activeOrders}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Today's Sales</p>
                  <p className="text-lg font-bold text-emerald-400 mt-0.5">₹{chan.todayRevenue.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Last Synced</p>
                  <p className="text-xs font-semibold text-muted-foreground mt-1.5">{chan.lastSync}</p>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between pt-3 border-t border-border/60">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleAutoAccept(chan.id)}
                  className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {chan.autoAccept ? (
                    <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-4 h-4" /> Auto-Accept ON
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <ToggleLeft className="w-4 h-4" /> Manual Accept
                    </span>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSyncMenu(chan.id)}
                  disabled={syncingId === chan.id}
                  className="h-8 text-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncingId === chan.id ? 'animate-spin' : ''}`} />
                  Sync Menu & 86s
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
