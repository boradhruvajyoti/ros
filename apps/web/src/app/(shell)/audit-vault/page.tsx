'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import {
  ShieldAlert, Shield, Search, Filter, Clock,
  User, Database, Lock, AlertTriangle, Eye, ChevronDown, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  user?: { id: string; name: string; email: string };
  previousValue: any;
  newValue: any;
  ipAddress?: string;
  createdAt: string;
}

export default function AuditVaultPage() {
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Fetch real audit logs from database
  const { data: logs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ['audit-logs'],
    queryFn: () => apiGet<AuditLog[]>('/audit/logs'),
  });

  const filteredLogs = logs.filter(
    (l) =>
      !search ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      (l.user?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.user?.email || '').toLowerCase().includes(search.toLowerCase()) ||
      l.entity.toLowerCase().includes(search.toLowerCase()) ||
      (l.entityId || '').toLowerCase().includes(search.toLowerCase())
  );

  // Compute live forensic metrics from actual database records
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const recentLogs = logs.filter((l) => new Date(l.createdAt).getTime() >= dayAgo);
  const discountEvents = logs.filter((l) => l.action.toUpperCase().includes('DISCOUNT') || l.action.toUpperCase().includes('PRICE'));
  const voidEvents = logs.filter((l) => l.action.toUpperCase().includes('VOID') || l.action.toUpperCase().includes('CANCEL'));
  const activeStaffCount = new Set(logs.map((l) => l.user?.id || 'sys').filter(Boolean)).size;

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  const renderJsonOrString = (val: any) => {
    if (!val) return 'None';
    if (typeof val === 'object') return JSON.stringify(val, null, 2);
    try {
      const parsed = JSON.parse(val);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return String(val);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-primary" />
            Security Audit Vault &amp; Forensic Compliance
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tamper-proof immutable ledger tracking discounts, cash kicks, voids, refunds and price changes
          </p>
        </div>
      </div>

      {/* Real Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Total Recorded Events</p>
          <p className="text-3xl font-black text-foreground mt-2">{logs.length} Logs</p>
          <p className="text-xs text-emerald-400 mt-1">
            {recentLogs.length} in last 24h
          </p>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Discounts &amp; Price Overrides</p>
          <p className="text-3xl font-black text-amber-400 mt-2">{discountEvents.length} Logged</p>
          <p className="text-xs text-muted-foreground mt-1">Manager privilege tracked</p>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Voided / Cancelled Items</p>
          <p className="text-3xl font-black text-rose-400 mt-2">{voidEvents.length} Actions</p>
          <p className="text-xs text-muted-foreground mt-1">Full audit reason trail</p>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card/60 backdrop-blur">
          <p className="text-xs text-muted-foreground font-semibold uppercase">Active Actors &amp; Staff</p>
          <p className="text-3xl font-black text-primary mt-2">{activeStaffCount} Users</p>
          <p className="text-xs text-muted-foreground mt-1">Append-only compliance</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Filter by action, user, entity or order #..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 h-9 rounded-lg border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Audit Stream Table or Empty State */}
      {logs.length === 0 && !isLoading ? (
        <div className="py-16 text-center space-y-3 rounded-3xl border border-dashed border-border bg-card/40 p-8">
          <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary">
            <Shield className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-lg font-bold text-foreground">No Audit Logs Yet</h3>
            <p className="text-xs text-muted-foreground">
              All financial operations, manager discount authorizations, item voids, and access events will be automatically logged here in real-time.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card/70 backdrop-blur overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-4">Action Event</th>
                  <th className="p-4">Entity</th>
                  <th className="p-4">Staff Member / User</th>
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
                        log.action.includes('VOID') || log.action.includes('DRAWER')
                          ? 'bg-amber-400'
                          : log.action.includes('REFUND') || log.action.includes('DELETE')
                          ? 'bg-rose-400'
                          : 'bg-primary'
                      }`} />
                      {log.action}
                    </td>
                    <td className="p-4 font-mono text-muted-foreground">{log.entity}</td>
                    <td className="p-4 font-medium text-foreground">
                      {log.user?.name || log.user?.email || 'System'}
                    </td>
                    <td className="p-4 font-mono text-muted-foreground">{log.ipAddress || '127.0.0.1'}</td>
                    <td className="p-4 text-muted-foreground">{formatTime(log.createdAt)}</td>
                    <td className="p-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedLog(log)}
                        className="h-7 text-[11px] gap-1 cursor-pointer"
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
      )}

      {/* Diff Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                Audit Snapshot: {selectedLog.action}
              </h3>
              <span className="text-xs text-muted-foreground">{formatTime(selectedLog.createdAt)}</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-background/50 border border-border flex justify-between">
                <span>Staff: <strong className="text-foreground">{selectedLog.user?.name || selectedLog.user?.email || 'System'}</strong></span>
                <span>IP: <strong className="text-foreground font-mono">{selectedLog.ipAddress || '127.0.0.1'}</strong></span>
              </div>

              {selectedLog.previousValue && (
                <div>
                  <p className="text-[11px] font-bold text-rose-400 uppercase tracking-wider mb-1">Previous State (-)</p>
                  <pre className="p-3 rounded-xl bg-background border border-rose-500/30 text-rose-300 font-mono text-xs overflow-x-auto max-h-48">
                    {renderJsonOrString(selectedLog.previousValue)}
                  </pre>
                </div>
              )}

              {selectedLog.newValue && (
                <div>
                  <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1">New State (+)</p>
                  <pre className="p-3 rounded-xl bg-background border border-emerald-500/30 text-emerald-300 font-mono text-xs overflow-x-auto max-h-48">
                    {renderJsonOrString(selectedLog.newValue)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setSelectedLog(null)} variant="outline" className="cursor-pointer">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
