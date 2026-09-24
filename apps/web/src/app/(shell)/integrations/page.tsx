'use client';

import { useState } from 'react';
import {
  Radio, CheckCircle2, RefreshCw, Zap, ShieldCheck,
  Smartphone, MessageSquare, AlertCircle, PlayCircle,
  ExternalLink, Power, ToggleLeft, ToggleRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@ros/utils';

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

const defaultChannels: Channel[] = [
  {
    id: 'chan-zomato',
    name: 'Zomato Delivery',
    type: 'Aggregator Webhook API',
    platform: 'zomato',
    status: 'CONNECTED',
    autoAccept: true,
    activeOrders: 0,
    todayRevenue: 0,
    syncStatus: 'SYNCED',
    lastSync: 'Real-time',
    rating: 5.0,
  },
  {
    id: 'chan-swiggy',
    name: 'Swiggy Partner Live',
    type: 'Aggregator Webhook API',
    platform: 'swiggy',
    status: 'CONNECTED',
    autoAccept: true,
    activeOrders: 0,
    todayRevenue: 0,
    syncStatus: 'SYNCED',
    lastSync: 'Real-time',
    rating: 5.0,
  },
  {
    id: 'chan-ubereats',
    name: 'Uber Eats Direct',
    type: 'Global POS Sync',
    platform: 'ubereats',
    status: 'CONNECTED',
    autoAccept: false,
    activeOrders: 0,
    todayRevenue: 0,
    syncStatus: 'SYNCED',
    lastSync: 'Real-time',
    rating: 5.0,
  },
  {
    id: 'chan-whatsapp',
    name: 'WhatsApp Direct Bot',
    type: 'Conversational Commerce',
    platform: 'whatsapp',
    status: 'CONNECTED',
    autoAccept: true,
    activeOrders: 0,
    todayRevenue: 0,
    syncStatus: 'SYNCED',
    lastSync: 'Real-time',
    rating: 5.0,
  },
];

export default function IntegrationsPage() {
  const [channels, setChannels] = useState<Channel[]>(defaultChannels);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simulationLog, setSimulationLog] = useState<string | null>(null);

  const toggleAutoAccept = (id: string) => {
    setChannels((prev) =>
      prev.map((c) => (c.id === id ? { ...c, autoAccept: !c.autoAccept } : c))
    );
    toast.success('Settings Updated', 'Auto-accept rules updated.');
  };

  const handleSyncMenu = (id: string) => {
    setSyncingId(id);
    setTimeout(() => {
      setSyncingId(null);
      const chanName = channels.find(c => c.id === id)?.name;
      toast.success('Sync Complete', `Active dishes & 86 items synchronized with ${chanName}`);
    }, 800);
  };

  const totalAggregatorRevenue = channels.reduce((acc, c) => acc + c.todayRevenue, 0);
  const totalActiveOrders = channels.reduce((acc, c) => acc + c.activeOrders, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card/60 p-5 rounded-3xl border border-border backdrop-blur-sm">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Radio className="w-6 h-6 text-primary animate-pulse" />
            3rd-Party Delivery &amp; Channel Integrations
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Unified aggregator hub with automated KOT routing, live menu sync &amp; rider tracking
          </p>
        </div>
      </div>

      {/* Aggregator Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Aggregator Revenue</p>
          <p className="text-2xl font-black text-foreground font-mono mt-2">
            {formatCurrency(totalAggregatorRevenue)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">Live online receipts</p>
        </div>
        <div className="p-5 rounded-3xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Active Online Orders</p>
          <p className="text-2xl font-black text-primary font-mono mt-2">
            {totalActiveOrders} Live
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">Aggregator orders in queue</p>
        </div>
        <div className="p-5 rounded-3xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Connected Channels</p>
          <p className="text-2xl font-black text-emerald-500 font-mono mt-2">4 Active</p>
          <p className="text-[11px] text-muted-foreground mt-1">Zomato, Swiggy, Uber Eats, WhatsApp</p>
        </div>
        <div className="p-5 rounded-3xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Sync Engine</p>
          <p className="text-2xl font-black text-emerald-500 mt-2">100% Online</p>
          <p className="text-[11px] text-muted-foreground mt-1">Webhooks ready</p>
        </div>
      </div>

      {/* Channel Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {channels.map((chan) => (
          <div
            key={chan.id}
            className="p-6 rounded-3xl border border-border bg-card/70 backdrop-blur hover:border-border/80 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${
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
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
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
              <div className="grid grid-cols-3 gap-3 my-5 p-3 rounded-2xl bg-background/50 border border-border/50 text-center">
                <div>
                  <p className="text-[11px] text-muted-foreground">Active Orders</p>
                  <p className="text-lg font-bold text-foreground mt-0.5">{chan.activeOrders}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Today's Sales</p>
                  <p className="text-lg font-bold text-emerald-400 mt-0.5">{formatCurrency(chan.todayRevenue)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Sync Health</p>
                  <p className="text-xs font-bold text-emerald-500 mt-1.5">● Synced</p>
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
                    <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
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
                  className="h-8 text-xs font-bold rounded-xl"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncingId === chan.id ? 'animate-spin' : ''}`} />
                  Sync Catalogue
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
