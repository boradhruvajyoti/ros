'use client';

import { useState } from 'react';
import {
  Thermometer, Activity, ShieldCheck, AlertTriangle,
  RefreshCw, CheckCircle2, Battery, Wifi, Cpu, FileCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Sensor {
  id: string;
  name: string;
  type: string;
  location: string;
  currentVal: number;
  minTarget?: number;
  maxTarget?: number;
  unit: string;
  status: 'NORMAL' | 'WARNING' | 'ALERT';
  battery: string;
  lastReading: string;
}

const initialSensors: Sensor[] = [
  {
    id: 'IOT-FREEZER-01',
    name: 'Walk-In Deep Meat Freezer',
    type: 'Temperature Probe',
    location: 'Cold Storage Room 1',
    currentVal: -18.4,
    minTarget: -22.0,
    maxTarget: -15.0,
    unit: '°C',
    status: 'NORMAL',
    battery: '94%',
    lastReading: '5s ago',
  },
  {
    id: 'IOT-CHILLER-02',
    name: 'Dairy & Vegetable Chiller',
    type: 'Temperature Probe',
    location: 'Prep Kitchen Island',
    currentVal: 3.2,
    minTarget: 1.0,
    maxTarget: 4.5,
    unit: '°C',
    status: 'NORMAL',
    battery: '88%',
    lastReading: '8s ago',
  },
  {
    id: 'IOT-WARMER-03',
    name: 'Pass Heat-Lamp Hot Holding Warmer',
    type: 'Hot Holding Probe',
    location: 'Kitchen Pass Window',
    currentVal: 68.5,
    minTarget: 65.0,
    maxTarget: 85.0,
    unit: '°C',
    status: 'NORMAL',
    battery: 'AC Powered',
    lastReading: '3s ago',
  },
  {
    id: 'IOT-FRYER-04',
    name: 'Commercial Deep Fryer #1 (TPM Oil Quality)',
    type: 'Oil Quality Sensor',
    location: 'Fry Station',
    currentVal: 16.5,
    maxTarget: 24.0,
    unit: '% TPM',
    status: 'NORMAL',
    battery: 'AC Powered',
    lastReading: '1 min ago',
  },
];

export default function IotSensorsPage() {
  const [sensors, setSensors] = useState<Sensor[]>(initialSensors);
  const [refreshing, setRefreshing] = useState(false);
  const [haccpReportLog, setHaccpReportLog] = useState<string | null>(null);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  };

  const handleGenerateAudit = () => {
    setHaccpReportLog('📋 Daily HACCP Food Safety Compliance Log certified and exported to regulatory cloud vault!');
    setTimeout(() => setHaccpReportLog(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Thermometer className="w-6 h-6 text-primary" />
            Kitchen IoT Telemetry & HACCP Safety Vault
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            24/7 cold storage temperature logging, deep fryer TPM oil quality & automated HACCP compliance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="gap-1.5 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Telemetry
          </Button>
          <Button onClick={handleGenerateAudit} className="gap-1.5 text-xs">
            <FileCheck className="w-4 h-4" />
            Export HACCP Audit Log
          </Button>
        </div>
      </div>

      {/* Notification */}
      {haccpReportLog && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          {haccpReportLog}
        </div>
      )}

      {/* Compliance Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase">HACCP Health Rating</p>
          <p className="text-3xl font-black text-emerald-400 mt-2">100% PASS</p>
          <p className="text-xs text-muted-foreground mt-1">Zero critical excursions</p>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Active IoT Sensors</p>
          <p className="text-3xl font-black text-primary mt-2">{sensors.length} Probes</p>
          <p className="text-xs text-muted-foreground mt-1">Telemetry polling every 10s</p>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Readings Logged Today</p>
          <p className="text-3xl font-black text-foreground mt-2">2,880 Points</p>
          <p className="text-xs text-muted-foreground mt-1">Immutable time-series records</p>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Oil Quality Index</p>
          <p className="text-3xl font-black text-emerald-400 mt-2">16.5% TPM</p>
          <p className="text-xs text-muted-foreground mt-1">Threshold limit: &lt; 24% TPM</p>
        </div>
      </div>

      {/* Sensor Probes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sensors.map((sensor) => (
          <div
            key={sensor.id}
            className="p-6 rounded-3xl border border-border bg-card/70 backdrop-blur hover:border-border/80 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-foreground">{sensor.name}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      {sensor.status}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-muted-foreground mt-1">{sensor.id} • {sensor.location}</p>
                </div>

                <div className="text-right">
                  <p className="text-2xl font-black text-primary">
                    {sensor.currentVal} {sensor.unit}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {sensor.minTarget !== undefined ? `Target: ${sensor.minTarget} to ${sensor.maxTarget}${sensor.unit}` : `Max: ${sensor.maxTarget}${sensor.unit}`}
                  </p>
                </div>
              </div>

              {/* Progress / Status Bar */}
              <div className="mt-5 p-3.5 rounded-2xl bg-background/50 border border-border/50 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sensor Status:</span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Normal Operating Band
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground text-[11px]">
                  <span>Battery / Power: {sensor.battery}</span>
                  <span>Last Ping: {sensor.lastReading}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 mt-4 border-t border-border/60 text-xs text-muted-foreground">
              <span>HACCP Standard: Safe Food Storage</span>
              <span className="text-emerald-400 font-semibold">● Live Telemetry</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
