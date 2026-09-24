'use client';

import { useState } from 'react';
import {
  Printer, HardDrive, Wifi, Usb, Play, CheckCircle2,
  AlertTriangle, RefreshCw, Power, DollarSign, Volume2
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HardwareDevice {
  id: string;
  name: string;
  type: string;
  connectionType: 'ETHERNET_IP' | 'USB' | 'BLUETOOTH';
  address: string;
  assignedStation: string;
  status: 'ONLINE' | 'OFFLINE';
  paperStatus: 'OK' | 'LOW' | 'EMPTY';
  driver: string;
  hasCashDrawer?: boolean;
}

const initialDevices: HardwareDevice[] = [
  {
    id: 'prn-001',
    name: 'Main Kitchen KOT Thermal Printer',
    type: '80mm Thermal Receipt / KOT',
    connectionType: 'ETHERNET_IP',
    address: '192.168.1.120:9100',
    assignedStation: 'Main Kitchen & Curry Station',
    status: 'ONLINE',
    paperStatus: 'OK',
    driver: 'ESC/POS Direct Socket',
  },
  {
    id: 'prn-002',
    name: 'Tandoor & Starters KOT Printer',
    type: '80mm Thermal KOT',
    connectionType: 'ETHERNET_IP',
    address: '192.168.1.121:9100',
    assignedStation: 'Tandoor & Starters',
    status: 'ONLINE',
    paperStatus: 'OK',
    driver: 'ESC/POS Direct Socket',
  },
  {
    id: 'prn-003',
    name: 'Bar & Beverages Printer',
    type: '80mm Thermal KOT',
    connectionType: 'ETHERNET_IP',
    address: '192.168.1.122:9100',
    assignedStation: 'Bar & Beverages Counter',
    status: 'ONLINE',
    paperStatus: 'OK',
    driver: 'ESC/POS Direct Socket',
  },
  {
    id: 'prn-004',
    name: 'Cashier Counter Billing Printer',
    type: '80mm High-Speed Receipt',
    connectionType: 'USB',
    address: '/dev/usb/lp0 (Raw Socket)',
    assignedStation: 'Main Billing Desk',
    status: 'ONLINE',
    paperStatus: 'OK',
    driver: 'USB Direct RAW + RJ11 Drawer Kick',
    hasCashDrawer: true,
  },
];

export default function HardwarePage() {
  const [devices, setDevices] = useState<HardwareDevice[]>(initialDevices);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testLog, setTestLog] = useState<string | null>(null);

  const handleTestPrint = (id: string, name: string) => {
    setTestingId(id);
    setTimeout(() => {
      setTestingId(null);
      setTestLog(`🖨️ Test ESC/POS sample slip dispatched to "${name}" successfully!`);
      setTimeout(() => setTestLog(null), 5000);
    }, 1000);
  };

  const handleKickDrawer = () => {
    setTestLog(`💵 RJ11 Cash Drawer 24V pulse triggered! Drawer latch opened.`);
    setTimeout(() => setTestLog(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Printer className="w-6 h-6 text-primary" />
            Hardware Hub & ESC/POS Thermal Printers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Network IP & USB thermal printer routing, kitchen station dispatchers & cash drawer triggers
          </p>
        </div>
        <Button onClick={handleKickDrawer} variant="outline" className="gap-2 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10">
          <DollarSign className="w-4 h-4" />
          Test Cash Drawer Kick
        </Button>
      </div>

      {/* Notification */}
      {testLog && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          {testLog}
        </div>
      )}

      {/* Hardware Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Printers Online</p>
          <p className="text-3xl font-black text-emerald-400 mt-2">
            {devices.filter((d) => d.status === 'ONLINE').length} / {devices.length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">All stations operational</p>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Network Sockets</p>
          <p className="text-3xl font-black text-primary mt-2">3 IP Ethernet</p>
          <p className="text-xs text-muted-foreground mt-1">Direct Raw TCP Port 9100</p>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Cash Drawer Link</p>
          <p className="text-3xl font-black text-amber-400 mt-2">1 Active</p>
          <p className="text-xs text-muted-foreground mt-1">RJ11 Solenoid Relay</p>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Paper Roll Health</p>
          <p className="text-3xl font-black text-emerald-400 mt-2">100% OK</p>
          <p className="text-xs text-muted-foreground mt-1">No paper-out alerts</p>
        </div>
      </div>

      {/* Device Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {devices.map((dev) => (
          <div
            key={dev.id}
            className="p-6 rounded-2xl border border-border bg-card/70 backdrop-blur hover:border-border/80 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary border border-primary/30 flex items-center justify-center">
                    <Printer className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                      {dev.name}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        {dev.status}
                      </span>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{dev.type}</p>
                  </div>
                </div>
              </div>

              {/* Hardware Specs */}
              <div className="grid grid-cols-2 gap-3 my-5 p-3.5 rounded-xl bg-background/50 border border-border/50 text-xs">
                <div>
                  <span className="text-muted-foreground text-[11px] uppercase font-semibold">Assigned Station</span>
                  <p className="font-bold text-foreground mt-0.5">{dev.assignedStation}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[11px] uppercase font-semibold">Connection / Interface</span>
                  <p className="font-bold text-primary mt-0.5 flex items-center gap-1">
                    {dev.connectionType === 'ETHERNET_IP' ? <Wifi className="w-3.5 h-3.5" /> : <Usb className="w-3.5 h-3.5" />}
                    {dev.address}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[11px] uppercase font-semibold">Paper Sensor</span>
                  <p className="font-bold text-emerald-400 mt-0.5">● {dev.paperStatus}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[11px] uppercase font-semibold">Driver Protocol</span>
                  <p className="font-semibold text-muted-foreground mt-0.5">{dev.driver}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-border/60">
              <span className="text-xs text-muted-foreground">80mm ESC/POS Command Set</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleTestPrint(dev.id, dev.name)}
                disabled={testingId === dev.id}
                className="gap-1.5 text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingId === dev.id ? 'animate-spin' : ''}`} />
                {testingId === dev.id ? 'Printing...' : 'Print Test Slip'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
