'use client';

import { useState } from 'react';
import {
  ShieldAlert, Shield, Search, Filter, Clock,
  User, Database, Lock, AlertTriangle, Eye, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  user: { name: string; email: string };
  previousValue: string | null;
  newValue: string | null;
  ipAddress: string;
  timeAgo: string;
}

const sampleLogs: AuditLog[] = [
  {
    id: 'aud-001',
    action: 'ORDER_DISCOUNT_APPLIED',
    entity: 'Order',
    entityId: 'ord-live-1001',
    user: { name: 'Raj Cashier', email: 'cashier@spicegarden.com' },
    previousValue: '{"discountAmount": 0, "total": 606.9}',
    newValue: '{"discountAmount": 50, "total": 556.9, "reason": "Manager Privilege"}',
    ipAddress: '192.168.1.45',
    timeAgo: '15 mins ago',
  },
  {
    id: 'aud-002',
    action: 'CASH_DRAWER_KICKED',
    entity: 'CashRegister',
    entityId: 'register-main',
    user: { name: 'Admin User', email: 'admin@spicegarden.com' },
    previousValue: null,
    newValue: '{"action": "MANUAL_DRAWER_PULSE", "reason": "Cash Reconciliation Audit"}',
    ipAddress: '127.0.0.1',
    timeAgo: '1 hour ago',
  },
  {
    id: 'aud-003',
    action: 'ORDER_ITEM_VOIDED',
    entity: 'OrderItem',
    entityId: 'item-lassi-01',
    user: { name: 'Sam Manager', email: 'manager@spicegarden.com' },
    previousValue: '{"status": "PREPARING", "qty": 1}',
    newValue: '{"status": "VOIDED", "voidReason": "Guest changed mind before prep"}',
    ipAddress: '192.168.1.18',
    timeAgo: '2 hours ago',
  },
  {
    id: 'aud-004',
    action: 'MENU_PRICE_OVERRIDE',
    entity: 'MenuItemVariant',
    entityId: 'var-butter-chicken',
    user: { name: 'Admin User', email: 'admin@spicegarden.com' },
    previousValue: '{"price": 620}',
    newValue: '{"price": 649}',
    ipAddress: '127.0.0.1',
    timeAgo: 'Yesterday',
  },
];

export default function AuditVaultPage() {
  const [logs, setLogs] = useState<AuditLog[]>(sampleLogs);
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const filteredLogs = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.user.name.toLowerCase().includes(search.toLowerCase()) ||
      l.entity.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-primary" />
            Security Audit Vault & Forensic Compliance
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tamper-proof immutable ledger tracking discounts, cash kicks, voids, refunds and price changes
          </p>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Total Audit Events (24h)</p>
          <p className="text-3xl font-black text-foreground mt-2">142 Logs</p>
          <p className="text-xs text-emerald-400 mt-1">Append-only sequence</p>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Discounts & Overrides</p>
          <p className="text-3xl font-black text-amber-400 mt-2">12 Logged</p>
          <p className="text-xs text-muted-foreground mt-1">All manager authorized</p>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Voided Items</p>
          <p className="text-3xl font-black text-rose-400 mt-2">3 Items</p>
          <p className="text-xs text-muted-foreground mt-1">Zero unauthorized voids</p>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Vault Integrity</p>
          <p className="text-3xl font-black text-emerald-400 mt-2">100% SHA-256</p>
          <p className="text-xs text-muted-foreground mt-1">Zero tamper anomalies</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Filter by action, user or entity..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 h-9 rounded-lg border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Audit Stream Table */}
      <div className="rounded-2xl border border-border bg-card/70 backdrop-blur overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
              <tr>
                <th className="p-4">Action Event</th>
                <th className="p-4">Entity</th>
                <th className="p-4">Staff Member</th>
                <th className="p-4">IP Address</th>
                <th className="p-4">Timestamp</th>
                <th className="p-4 text-right">Payload Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/20 transition-all">
                  <td className="p-4 font-bold text-sm text-foreground flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      log.action.includes('VOID') || log.action.includes('DRAWER') ? 'bg-amber-400' : 'bg-primary'
                    }`} />
                    {log.action}
                  </td>
                  <td className="p-4 font-mono text-muted-foreground">{log.entity}</td>
                  <td className="p-4 font-medium text-foreground">{log.user.name}</td>
                  <td className="p-4 font-mono text-muted-foreground">{log.ipAddress}</td>
                  <td className="p-4 text-muted-foreground">{log.timeAgo}</td>
                  <td className="p-4 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedLog(log)}
                      className="h-7 text-[11px] gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      View Diff
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Diff Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                Audit Snapshot: {selectedLog.action}
              </h3>
              <span className="text-xs text-muted-foreground">{selectedLog.timeAgo}</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-background/50 border border-border flex justify-between">
                <span>Staff: <strong className="text-foreground">{selectedLog.user.name}</strong></span>
                <span>IP: <strong className="text-foreground font-mono">{selectedLog.ipAddress}</strong></span>
              </div>

              {selectedLog.previousValue && (
                <div>
                  <p className="text-[11px] font-bold text-rose-400 uppercase tracking-wider mb-1">Previous State (-)</p>
                  <pre className="p-3 rounded-xl bg-background border border-rose-500/30 text-rose-300 font-mono text-xs overflow-x-auto">
                    {JSON.stringify(JSON.parse(selectedLog.previousValue), null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.newValue && (
                <div>
                  <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1">New State (+)</p>
                  <pre className="p-3 rounded-xl bg-background border border-emerald-500/30 text-emerald-300 font-mono text-xs overflow-x-auto">
                    {JSON.stringify(JSON.parse(selectedLog.newValue), null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setSelectedLog(null)} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
