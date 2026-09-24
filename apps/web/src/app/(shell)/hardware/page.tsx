'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import {
  Printer, HardDrive, Wifi, Usb, Play, CheckCircle2,
  AlertTriangle, RefreshCw, Power, DollarSign, Volume2, Plus, Trash2, X, Cpu, Server
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HardwareDevice {
  id: string;
  name: string;
  type: string;
  connectionType: 'ETHERNET_IP' | 'USB' | 'BLUETOOTH';
  ipAddress?: string;
  port?: number;
  devicePath?: string;
  assignedStation?: string;
  paperWidthMm?: number;
  status: 'ONLINE' | 'OFFLINE';
  paperStatus: 'OK' | 'LOW' | 'EMPTY';
  driver: string;
  hasCashDrawer?: boolean;
  createdAt?: string;
}

export default function HardwarePage() {
  const queryClient = useQueryClient();
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testLog, setTestLog] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('THERMAL_PRINTER');
  const [formConnection, setFormConnection] = useState<'ETHERNET_IP' | 'USB' | 'BLUETOOTH'>('ETHERNET_IP');
  const [formIp, setFormIp] = useState('192.168.1.');
  const [formPort, setFormPort] = useState('9100');
  const [formPath, setFormPath] = useState('/dev/usb/lp0');
  const [formStation, setFormStation] = useState('Main Kitchen');
  const [formPaperWidth, setFormPaperWidth] = useState('80');
  const [formHasDrawer, setFormHasDrawer] = useState(false);

  // Fetch real devices from API
  const { data: devices = [], isLoading } = useQuery<HardwareDevice[]>({
    queryKey: ['hardware-devices'],
    queryFn: () => apiGet<HardwareDevice[]>('/hardware/devices'),
  });

  // Create Device Mutation
  const createMutation = useMutation({
    mutationFn: (newDev: any) => apiPost('/hardware/devices', newDev),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hardware-devices'] });
      setIsAddModalOpen(false);
      resetForm();
      setTestLog('Hardware device configured and added successfully!');
      setTimeout(() => setTestLog(null), 4000);
    },
  });

  // Delete Device Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/hardware/devices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hardware-devices'] });
      setTestLog('Hardware device removed.');
      setTimeout(() => setTestLog(null), 4000);
    },
  });

  const resetForm = () => {
    setFormName('');
    setFormType('THERMAL_PRINTER');
    setFormConnection('ETHERNET_IP');
    setFormIp('192.168.1.');
    setFormPort('9100');
    setFormPath('/dev/usb/lp0');
    setFormStation('Main Kitchen');
    setFormPaperWidth('80');
    setFormHasDrawer(false);
  };

  const handleSaveDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    createMutation.mutate({
      name: formName.trim(),
      type: formType,
      connectionType: formConnection,
      ipAddress: formConnection === 'ETHERNET_IP' ? formIp.trim() : undefined,
      port: formConnection === 'ETHERNET_IP' ? parseInt(formPort, 10) || 9100 : undefined,
      devicePath: formConnection === 'USB' ? formPath.trim() : undefined,
      assignedStation: formStation.trim() || 'General',
      paperWidthMm: parseInt(formPaperWidth, 10) || 80,
      driver: formConnection === 'ETHERNET_IP' ? 'ESC/POS Direct Socket' : 'USB Direct RAW',
      hasCashDrawer: formHasDrawer,
    });
  };

  const handleTestPrint = async (dev: HardwareDevice) => {
    setTestingId(dev.id);
    try {
      await apiPost('/hardware/test-print', {
        deviceId: dev.id,
        deviceName: dev.name,
      });
      setTestLog(`🖨️ Test ESC/POS sample slip dispatched to "${dev.name}" (${dev.ipAddress || dev.devicePath || 'Device'}) successfully!`);
    } catch {
      setTestLog(`⚠️ Could not reach printer "${dev.name}". Check network or cable connection.`);
    } finally {
      setTestingId(null);
      setTimeout(() => setTestLog(null), 5000);
    }
  };

  const handleKickDrawer = async () => {
    try {
      await apiPost('/hardware/cash-drawer/kick');
      setTestLog(`💵 RJ11 Cash Drawer 24V pulse triggered! Drawer latch opened.`);
    } catch {
      setTestLog(`⚠️ Cash drawer pulse failed. Verify billing printer connection.`);
    } finally {
      setTimeout(() => setTestLog(null), 5000);
    }
  };

  const onlineCount = devices.filter((d) => d.status === 'ONLINE').length;
  const ipCount = devices.filter((d) => d.connectionType === 'ETHERNET_IP').length;
  const drawerCount = devices.filter((d) => d.hasCashDrawer).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Printer className="w-6 h-6 text-primary" />
            Hardware Hub &amp; ESC/POS Thermal Printers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Network IP &amp; USB thermal printer routing, kitchen station dispatchers &amp; cash drawer triggers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleKickDrawer}
            variant="outline"
            className="gap-2 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
          >
            <DollarSign className="w-4 h-4" />
            Test Cash Drawer Kick
          </Button>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="gap-2 bg-primary text-primary-foreground shadow-lg cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Hardware Device
          </Button>
        </div>
      </div>

      {/* Notification Toast */}
      {testLog && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          {testLog}
        </div>
      )}

      {/* Hardware Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Configured Printers</p>
          <p className="text-3xl font-black text-emerald-400 mt-2">
            {onlineCount} / {devices.length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Active hardware stations</p>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Network IP Sockets</p>
          <p className="text-3xl font-black text-primary mt-2">{ipCount} Ethernet</p>
          <p className="text-xs text-muted-foreground mt-1">Direct Raw TCP Port 9100</p>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Cash Drawer Relays</p>
          <p className="text-3xl font-black text-amber-400 mt-2">{drawerCount} Linked</p>
          <p className="text-xs text-muted-foreground mt-1">RJ11 Solenoid Relay</p>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Hardware Health</p>
          <p className="text-3xl font-black text-emerald-400 mt-2">
            {devices.length > 0 ? '100% OK' : 'Ready'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Real-time spooler ready</p>
        </div>
      </div>

      {/* Empty State */}
      {devices.length === 0 && !isLoading && (
        <div className="py-16 text-center space-y-4 rounded-3xl border border-dashed border-border bg-card/40 p-8">
          <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary">
            <Printer className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-lg font-bold text-foreground">No Hardware Devices Configured</h3>
            <p className="text-xs text-muted-foreground">
              Connect your kitchen thermal printers (KOT), front desk receipt printers, and cash drawers by adding their IP address or USB port.
            </p>
          </div>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="gap-2 bg-primary text-primary-foreground font-bold text-xs"
          >
            <Plus className="w-4 h-4" />
            Configure First Printer
          </Button>
        </div>
      )}

      {/* Device Grid */}
      {devices.length > 0 && (
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
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {dev.paperWidthMm ? `${dev.paperWidthMm}mm ` : ''}{dev.type}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(dev.id)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-400 cursor-pointer"
                    title="Remove Device"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Hardware Specs */}
                <div className="grid grid-cols-2 gap-3 my-5 p-3.5 rounded-xl bg-background/50 border border-border/50 text-xs">
                  <div>
                    <span className="text-muted-foreground text-[11px] uppercase font-semibold">Assigned Station</span>
                    <p className="font-bold text-foreground mt-0.5">{dev.assignedStation || 'Kitchen'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[11px] uppercase font-semibold">Connection / Interface</span>
                    <p className="font-bold text-primary mt-0.5 flex items-center gap-1 font-mono">
                      {dev.connectionType === 'ETHERNET_IP' ? <Wifi className="w-3.5 h-3.5" /> : <Usb className="w-3.5 h-3.5" />}
                      {dev.ipAddress ? `${dev.ipAddress}:${dev.port || 9100}` : (dev.devicePath || 'Local Port')}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[11px] uppercase font-semibold">Paper Sensor</span>
                    <p className="font-bold text-emerald-400 mt-0.5">● {dev.paperStatus || 'OK'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[11px] uppercase font-semibold">Driver Protocol</span>
                    <p className="font-semibold text-muted-foreground mt-0.5">{dev.driver || 'ESC/POS Direct'}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-border/60">
                <span className="text-xs text-muted-foreground font-mono">
                  {dev.hasCashDrawer ? '💵 Cash Drawer Connected' : '80mm ESC/POS Standard'}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleTestPrint(dev)}
                  disabled={testingId === dev.id}
                  className="gap-1.5 text-xs cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingId === dev.id ? 'animate-spin' : ''}`} />
                  {testingId === dev.id ? 'Printing...' : 'Print Test Slip'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Device Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Server className="w-5 h-5 text-primary" />
                Configure Hardware / Printer Device
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAddModalOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={handleSaveDevice} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-foreground">Device Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Main Kitchen KOT Printer"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground">Device Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="THERMAL_PRINTER">Thermal KOT Printer</option>
                    <option value="RECEIPT_PRINTER">Receipt Billing Printer</option>
                    <option value="CASH_DRAWER">Cash Drawer Unit</option>
                    <option value="KDS_SCREEN">KDS Display Terminal</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-foreground">Connection Type</label>
                  <select
                    value={formConnection}
                    onChange={(e) => setFormConnection(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="ETHERNET_IP">Network IP / Ethernet</option>
                    <option value="USB">USB Direct RAW</option>
                    <option value="BLUETOOTH">Bluetooth Wireless</option>
                  </select>
                </div>
              </div>

              {formConnection === 'ETHERNET_IP' ? (
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <label className="font-bold text-foreground">Printer IP Address *</label>
                    <input
                      type="text"
                      required
                      placeholder="192.168.1.120"
                      value={formIp}
                      onChange={(e) => setFormIp(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-foreground">Port</label>
                    <input
                      type="number"
                      placeholder="9100"
                      value={formPort}
                      onChange={(e) => setFormPort(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground">Device Port / Path</label>
                  <input
                    type="text"
                    placeholder="/dev/usb/lp0 or COM1"
                    value={formPath}
                    onChange={(e) => setFormPath(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground">Assigned Kitchen / Bar Station</label>
                  <input
                    type="text"
                    placeholder="e.g. Main Kitchen & Curry"
                    value={formStation}
                    onChange={(e) => setFormStation(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground">Paper Roll Width</label>
                  <select
                    value={formPaperWidth}
                    onChange={(e) => setFormPaperWidth(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="80">80mm (Standard KOT / Bill)</option>
                    <option value="58">58mm (Compact Receipt)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formHasDrawer}
                    onChange={(e) => setFormHasDrawer(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                  />
                  <span className="font-medium text-foreground text-xs">
                    Equipped with RJ11 Solenoid Cash Drawer Kick Relay
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-primary text-primary-foreground font-bold"
                >
                  {createMutation.isPending ? 'Saving Device...' : 'Save & Connect'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
