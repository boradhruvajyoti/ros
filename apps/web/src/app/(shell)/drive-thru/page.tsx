'use client';

import { useState } from 'react';
import {
  Car, Clock, CheckCircle2, AlertTriangle, Play,
  Volume2, ShieldCheck, ArrowRight, Gauge, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VehicleOrder {
  id: string;
  orderNumber: string;
  vehicleDesc: string;
  lane: string;
  position: 'SPEAKER_ORDERING' | 'WINDOW_PAYMENT' | 'WINDOW_HANDOFF' | 'CURBSIDE_BAY';
  total: number;
  itemsCount: number;
  durationSeconds: number;
  targetSlaSeconds: number;
  status: string;
}

const initialQueue: VehicleOrder[] = [
  {
    id: 'DT-101',
    orderNumber: 'DT-101',
    vehicleDesc: 'White Honda City (KA-05-MN-9921)',
    lane: 'Lane 1 (Express Window)',
    position: 'WINDOW_HANDOFF',
    total: 680,
    itemsCount: 3,
    durationSeconds: 62,
    targetSlaSeconds: 90,
    status: 'BAG_READY',
  },
  {
    id: 'DT-102',
    orderNumber: 'DT-102',
    vehicleDesc: 'Grey Hyundai Creta (KA-03-JJ-4412)',
    lane: 'Lane 1 (Speaker Post)',
    position: 'SPEAKER_ORDERING',
    total: 420,
    itemsCount: 2,
    durationSeconds: 28,
    targetSlaSeconds: 90,
    status: 'ORDER_IN_PROGRESS',
  },
  {
    id: 'CS-201',
    orderNumber: 'CS-201',
    vehicleDesc: 'Red Kia Seltos (Curbside Bay #3)',
    lane: 'Curbside Bay 3',
    position: 'CURBSIDE_BAY',
    total: 1250,
    itemsCount: 5,
    durationSeconds: 115,
    targetSlaSeconds: 180,
    status: 'RUNNER_DISPATCHED',
  },
];

export default function DriveThruPage() {
  const [queue, setQueue] = useState<VehicleOrder[]>(initialQueue);
  const [handoffSuccess, setHandoffSuccess] = useState<string | null>(null);

  const handleHandoff = (id: string, orderNumber: string) => {
    setQueue((prev) => prev.filter((o) => o.id !== id));
    setHandoffSuccess(`🚗 Order ${orderNumber} handed off! Speed-of-Service timer stopped.`);
    setTimeout(() => setHandoffSuccess(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Car className="w-6 h-6 text-primary" />
            Drive-Thru & Curbside Speed-of-Service (SOS)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Loop detector sensor telemetry, vehicle queue timing milestones & runner window dispatch
          </p>
        </div>
      </div>

      {/* Alert */}
      {handoffSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          {handoffSuccess}
        </div>
      )}

      {/* Speed of Service Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-semibold uppercase">Avg Speed of Service</p>
            <Gauge className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-emerald-400 mt-2">72s</p>
          <p className="text-xs text-muted-foreground mt-1">Target SLA: &lt; 90s</p>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-semibold uppercase">Vehicles Served Today</p>
            <Car className="w-4 h-4 text-primary" />
          </div>
          <p className="text-3xl font-black text-foreground mt-2">184 Cars</p>
          <p className="text-xs text-emerald-400 mt-1">↑ 14% vs last week</p>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-semibold uppercase">SLA Compliance Rate</p>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-foreground mt-2">96.4%</p>
          <p className="text-xs text-emerald-400 mt-1">Under target duration</p>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-semibold uppercase">Drive-Thru Revenue</p>
            <span className="text-xs text-muted-foreground">Today</span>
          </div>
          <p className="text-3xl font-black text-primary mt-2">₹68,400</p>
          <p className="text-xs text-muted-foreground mt-1">Express lane sales</p>
        </div>
      </div>

      {/* Live Lane Queue Visualizer */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Active Drive-Thru & Curbside Queue ({queue.length} Vehicles in Lane)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {queue.map((order) => {
            const isNearSla = order.durationSeconds > order.targetSlaSeconds * 0.8;
            return (
              <div
                key={order.id}
                className="p-6 rounded-3xl border border-border bg-card/70 backdrop-blur hover:border-border/80 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-foreground">{order.orderNumber}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                          {order.lane}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-foreground mt-1 flex items-center gap-1.5">
                        <Car className="w-3.5 h-3.5 text-muted-foreground" />
                        {order.vehicleDesc}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className={`text-xl font-black ${isNearSla ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                        {order.durationSeconds}s
                      </span>
                      <p className="text-[10px] text-muted-foreground">/ {order.targetSlaSeconds}s Target</p>
                    </div>
                  </div>

                  {/* Progress Step Indicator */}
                  <div className="mt-4 p-3 rounded-2xl bg-background/50 border border-border/50 space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="text-primary font-bold">{order.status}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          order.durationSeconds > order.targetSlaSeconds
                            ? 'bg-rose-500'
                            : order.durationSeconds > order.targetSlaSeconds * 0.8
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, (order.durationSeconds / order.targetSlaSeconds) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                    <span>{order.itemsCount} Food Items</span>
                    <span className="font-bold text-foreground">₹{order.total}</span>
                  </div>
                </div>

                <Button
                  onClick={() => handleHandoff(order.id, order.orderNumber)}
                  className="w-full gap-2 text-xs font-bold rounded-xl py-4 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Check className="w-4 h-4" />
                  Complete Window Handoff
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
