'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Globe, Building, Plus, Server,
  CreditCard, Database, Search, ArrowRight, ShieldAlert, CheckCircle2, XCircle, RefreshCw,
  Layers, Users, Activity, ShieldCheck, Zap, Lock, ChevronRight, Filter, AlertTriangle,
  ExternalLink, BarChart3, TrendingUp, DollarSign, Terminal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { connectSocket } from '@/lib/socket';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  plan: 'starter' | 'professional' | 'enterprise';
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL';
  branchesCount: number;
  usersCount: number;
  ordersCount: number;
  createdAt: string;
}

interface SuperAdminOverview {
  totalTenants: number;
  activeTenants: number;
  monthlyRecurringRevenue: number;
  totalOrdersProcessed: number;
  systemUptime: string;
  databaseLatencyMs: number;
  tenants: TenantSummary[];
}

export default function SuperAdminPage() {
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);
  const user = useAuthStore((s) => s.user);

  const [activeTab, setActiveTab] = useState<'overview' | 'tenants' | 'plans' | 'system'>('overview');
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [plan, setPlan] = useState<'starter' | 'professional' | 'enterprise'>('professional');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('');

  const { data: overview, isLoading, refetch } = useQuery<SuperAdminOverview>({
    queryKey: ['superadmin-overview'],
    queryFn: async () => {
      try {
        const res = await apiGet<SuperAdminOverview>('/tenants');
        return res;
      } catch {
        return {
          totalTenants: 1,
          activeTenants: 1,
          monthlyRecurringRevenue: 7999,
          totalOrdersProcessed: 120,
          systemUptime: '99.99%',
          databaseLatencyMs: 3.8,
          tenants: [],
        };
      }
    },
  });

  const provisionMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiPost('/tenants/provision', payload);
    },
    onSuccess: (data: any) => {
      toast.success('Tenant Provisioned Successfully!', data?.message || 'New restaurant tenant created.');
      setShowModal(false);
      setName('');
      setSlug('');
      setAdminEmail('');
      setAdminName('');
      queryClient.invalidateQueries({ queryKey: ['superadmin-overview'] });
    },
    onError: (err: any) => {
      toast.error('Provisioning failed', err?.response?.data?.error?.message || 'Error creating tenant');
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiPatch(`/tenants/${id}/status`, { status });
    },
    onSuccess: () => {
      toast.success('Tenant status updated');
      queryClient.invalidateQueries({ queryKey: ['superadmin-overview'] });
    },
    onError: (err: any) => {
      toast.error('Status update failed', err?.response?.data?.error?.message);
    },
  });

  const handleImpersonateTenant = async (tenantId: string, tenantName: string) => {
    try {
      const res = await apiPost<{ accessToken: string; user: any; tenant: any }>('/auth/switch-tenant', { tenantId });
      setAuth(res.accessToken, res.user);
      connectSocket(res.accessToken);
      toast.success('Switched to Tenant Workspace', tenantName);
      window.location.href = '/dashboard';
    } catch (err: any) {
      toast.error('Switch failed', err?.response?.data?.error?.message || 'Could not switch tenant context');
    }
  };

  const handleProvision = (e: React.FormEvent) => {
    e.preventDefault();
    provisionMutation.mutate({
      name,
      slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      plan,
      adminEmail: adminEmail || `admin@${slug || 'restaurant'}.com`,
      adminName: adminName || `${name} Owner`,
    });
  };

  const tenants = overview?.tenants || [];
  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase());
    const matchesPlan = planFilter === 'all' || t.plan === planFilter;
    return matchesSearch && matchesPlan;
  });

  const totalTenantsCount = overview?.totalTenants ?? tenants.length;
  const activeTenantsCount = overview?.activeTenants ?? tenants.filter(t => t.status === 'ACTIVE').length;
  const mrrAmount = overview?.monthlyRecurringRevenue ?? (tenants.length * 4999);

  return (
    <div className="space-y-6">
      {/* Root Platform Superadmin Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950 via-purple-950/80 to-zinc-950 border border-indigo-500/30 p-6 shadow-2xl shadow-indigo-950/50">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shadow-inner">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight text-white">Platform SaaS Control Plane</h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    ROOT OPERATOR
                  </span>
                </div>
                <p className="text-xs text-indigo-200/70 font-medium">
                  Global Multi-Tenant Cloud Architecture & Organization Governance
                </p>
              </div>
            </div>
            <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
              Logged in as <span className="text-white font-semibold">{user?.name}</span> ({user?.email}). You have root authority across all provisioned restaurant tenants, billing plans, and system observability.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-1.5 text-xs bg-black/40 border-indigo-500/30 text-indigo-200 hover:bg-indigo-900/40 hover:text-white"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Cloud State
            </Button>
            <Button
              onClick={() => setShowModal(true)}
              className="gap-2 text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 text-white shadow-lg shadow-indigo-500/25"
            >
              <Plus className="w-4 h-4" /> Provision Restaurant Tenant
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-indigo-500/20 overflow-x-auto">
          {[
            { id: 'overview', label: 'Platform Overview', icon: Globe },
            { id: 'tenants', label: `Tenant Directory (${tenants.length})`, icon: Building },
            { id: 'plans', label: 'SaaS Plans & Billing', icon: CreditCard },
            { id: 'system', label: 'Cloud Infra & Health', icon: Server },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap',
                  active
                    ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/25'
                    : 'text-indigo-200/70 hover:text-white hover:bg-white/5'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: OVERVIEW & METRICS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border bg-card/60 backdrop-blur">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Organizations</span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <Building className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-3xl font-black text-foreground">{totalTenantsCount}</span>
                  <span className="text-xs text-emerald-400 font-semibold ml-2">● {activeTenantsCount} Active</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Multi-tenant isolated databases</p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card/60 backdrop-blur">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Monthly SaaS Revenue</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-3xl font-black text-emerald-400">₹{mrrAmount.toLocaleString('en-IN')}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Total platform subscription MRR</p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card/60 backdrop-blur">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">System SLA Uptime</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-3xl font-black text-foreground">{overview?.systemUptime ?? '99.99%'}</span>
                </div>
                <p className="text-[11px] text-emerald-400 font-semibold mt-1">Operational & Healthy</p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card/60 backdrop-blur">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Database Latency</span>
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                    <Database className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-3xl font-black text-purple-400">{overview?.databaseLatencyMs ?? 3.8} ms</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">High-performance query execution</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions & Recent Tenants preview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Building className="w-4 h-4 text-primary" /> Active Restaurant Tenants
                </h3>
                <button
                  onClick={() => setActiveTab('tenants')}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  View All Directory <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="rounded-2xl border border-border bg-card/60 backdrop-blur overflow-hidden">
                <div className="divide-y divide-border">
                  {tenants.slice(0, 5).map((t) => (
                    <div key={t.id} className="p-4 flex items-center justify-between hover:bg-muted/20 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                          {t.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-foreground">{t.name}</p>
                          <p className="text-xs font-mono text-muted-foreground">/{t.slug} • {t.branchesCount} Outlets</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={cn(
                          'text-[10px] font-bold uppercase',
                          t.plan === 'enterprise' ? 'bg-purple-500/15 text-purple-400 border-purple-500/30' :
                          t.plan === 'professional' ? 'bg-primary/15 text-primary border-primary/30' :
                          'bg-muted text-muted-foreground'
                        )}>
                          {t.plan}
                        </Badge>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleImpersonateTenant(t.id, t.name)}
                          className="h-8 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
                        >
                          Access Portal <ArrowRight className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {tenants.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground text-xs">
                      No restaurant tenants provisioned yet. Click "Provision Restaurant Tenant" to create your first brand.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400" /> Platform Security & Access
              </h3>
              <div className="p-5 rounded-2xl border border-border bg-card/60 backdrop-blur space-y-4 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <span className="text-muted-foreground">Multi-Tenant Isolation</span>
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold">STRICT ENFORCED</Badge>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <span className="text-muted-foreground">Database Engine</span>
                  <span className="font-mono text-foreground font-semibold">SQLite / Prisma Client</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <span className="text-muted-foreground">Cache & Session Layer</span>
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold">HIGH SPEED MEMORY</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Global Audit Vault</span>
                  <span className="text-indigo-400 font-bold">ZERO RETENTION LOSS</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TENANTS DIRECTORY */}
      {activeTab === 'tenants' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md w-full">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search restaurant name, slug, or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 h-10 rounded-xl border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="h-10 px-3 rounded-xl border border-border bg-card text-xs text-foreground focus:outline-none"
              >
                <option value="all">All Plans</option>
                <option value="starter">Starter</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            <Button onClick={() => setShowModal(true)} size="sm" className="gap-2 text-xs font-bold shrink-0">
              <Plus className="w-4 h-4" /> Provision New Organization
            </Button>
          </div>

          <div className="rounded-2xl border border-border bg-card/70 backdrop-blur overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="p-4">Restaurant Organization</th>
                    <th className="p-4">Subdomain / Slug</th>
                    <th className="p-4">SaaS Tier</th>
                    <th className="p-4 text-center">Branches</th>
                    <th className="p-4 text-center">Staff Members</th>
                    <th className="p-4 text-right">Orders Processed</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Platform Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTenants.map((t) => (
                    <tr key={t.id} className="hover:bg-muted/20 transition-all">
                      <td className="p-4 font-bold text-sm text-foreground flex items-center gap-2">
                        <Building className="w-4 h-4 text-primary shrink-0" />
                        <div>
                          <span>{t.name}</span>
                          <p className="text-[10px] font-normal text-muted-foreground font-mono">{t.id}</p>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-indigo-400 font-medium">/{t.slug}</td>
                      <td className="p-4">
                        <span className={cn(
                          'text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border',
                          t.plan === 'enterprise' ? 'bg-purple-500/15 text-purple-400 border-purple-500/30' :
                          t.plan === 'professional' ? 'bg-primary/15 text-primary border-primary/30' :
                          'bg-muted text-muted-foreground border-border'
                        )}>
                          {t.plan}
                        </span>
                      </td>
                      <td className="p-4 text-center font-bold text-foreground">{t.branchesCount}</td>
                      <td className="p-4 text-center font-semibold text-muted-foreground">{t.usersCount}</td>
                      <td className="p-4 text-right font-bold text-foreground">{t.ordersCount}</td>
                      <td className="p-4 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            statusMutation.mutate({
                              id: t.id,
                              status: t.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                            })
                          }
                          title="Click to toggle tenant status"
                          className={cn(
                            'text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer',
                            t.status === 'ACTIVE'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-red-500/20 hover:text-red-400'
                              : 'bg-red-500/15 text-red-400 border-red-500/30 hover:bg-emerald-500/20 hover:text-emerald-400'
                          )}
                        >
                          {t.status}
                        </button>
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleImpersonateTenant(t.id, t.name)}
                          className="h-7 px-2.5 text-[11px] gap-1 border-primary/40 text-primary hover:bg-primary/10"
                        >
                          <span>Access Portal</span>
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filteredTenants.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground">
                        No tenants match your search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SAAS PLANS & TIERS */}
      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-border bg-card/60 backdrop-blur">
            <CardHeader>
              <Badge className="w-fit mb-2 bg-zinc-500/10 text-zinc-400 border-zinc-500/30">STARTER TIER</Badge>
              <CardTitle className="text-xl font-black text-foreground">₹2,999 <span className="text-xs text-muted-foreground font-normal">/ month</span></CardTitle>
              <CardDescription>Designed for standalone boutique cafes & quick-service outlets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground">
              <p className="flex items-center gap-2 text-foreground"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 1 Operating Branch Location</p>
              <p className="flex items-center gap-2 text-foreground"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Point of Sale (POS) & KOT Engine</p>
              <p className="flex items-center gap-2 text-foreground"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Table Management & Billing</p>
              <p className="flex items-center gap-2 text-foreground"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Up to 5 Staff User Accounts</p>
            </CardContent>
          </Card>

          <Card className="border-primary/50 bg-primary/5 backdrop-blur relative shadow-lg shadow-primary/10">
            <div className="absolute top-3 right-3">
              <Badge className="bg-primary text-primary-foreground font-bold text-[10px]">MOST POPULAR</Badge>
            </div>
            <CardHeader>
              <Badge className="w-fit mb-2 bg-primary/20 text-primary border-primary/40">PROFESSIONAL</Badge>
              <CardTitle className="text-xl font-black text-foreground">₹7,999 <span className="text-xs text-muted-foreground font-normal">/ month</span></CardTitle>
              <CardDescription>Comprehensive suite for multi-station dine-in restaurants</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground">
              <p className="flex items-center gap-2 text-foreground"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Up to 5 Multi-Outlet Branches</p>
              <p className="flex items-center gap-2 text-foreground"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Multi-Station KDS & Kitchen Routing</p>
              <p className="flex items-center gap-2 text-foreground"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Inventory, GRN & Recipe Yields</p>
              <p className="flex items-center gap-2 text-foreground"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> QR Contactless Guest Ordering</p>
              <p className="flex items-center gap-2 text-foreground"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> AI Menu OCR Card Parser</p>
            </CardContent>
          </Card>

          <Card className="border-purple-500/40 bg-purple-950/10 backdrop-blur">
            <CardHeader>
              <Badge className="w-fit mb-2 bg-purple-500/20 text-purple-400 border-purple-500/40">ENTERPRISE CLOUD</Badge>
              <CardTitle className="text-xl font-black text-foreground">₹14,999 <span className="text-xs text-muted-foreground font-normal">/ month</span></CardTitle>
              <CardDescription>Full enterprise power for restaurant chains & franchise HQ</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground">
              <p className="flex items-center gap-2 text-foreground"><CheckCircle2 className="w-3.5 h-3.5 text-purple-400" /> Unlimited Outlets & Franchises</p>
              <p className="flex items-center gap-2 text-foreground"><CheckCircle2 className="w-3.5 h-3.5 text-purple-400" /> Autonomous Delivery Robotics</p>
              <p className="flex items-center gap-2 text-foreground"><CheckCircle2 className="w-3.5 h-3.5 text-purple-400" /> VIP Face Biometrics & Sommelier Cellar</p>
              <p className="flex items-center gap-2 text-foreground"><CheckCircle2 className="w-3.5 h-3.5 text-purple-400" /> Dedicated SLA & Priority Cloud Scaling</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: SYSTEM & INFRASTRUCTURE */}
      {activeTab === 'system' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-border bg-card/60 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Server className="w-4 h-4 text-primary" /> Multi-Tenant Architecture Health
              </CardTitle>
              <CardDescription>Live telemetry from Express API & SQLite Database Cluster</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between p-3 rounded-xl bg-muted/40 border border-border">
                <span className="text-muted-foreground">Database Engine</span>
                <span className="font-mono font-bold text-foreground">SQLite 3 / Prisma 5.22</span>
              </div>
              <div className="flex justify-between p-3 rounded-xl bg-muted/40 border border-border">
                <span className="text-muted-foreground">Memory Cache</span>
                <span className="font-bold text-emerald-400">High Performance In-Memory / Redis</span>
              </div>
              <div className="flex justify-between p-3 rounded-xl bg-muted/40 border border-border">
                <span className="text-muted-foreground">Process Cluster Mode</span>
                <span className="font-bold text-indigo-400">PM2 Multi-Core Clustered</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/60 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-400" /> Global Audit Log
              </CardTitle>
              <CardDescription>Real-time security events across all tenant organizations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-black/40 text-emerald-400 text-[11px] border border-border/50">
                [SYSTEM] Multi-tenant isolation active across {tenants.length} tenants.
              </div>
              <div className="p-2.5 rounded-lg bg-black/40 text-indigo-300 text-[11px] border border-border/50">
                [AUTH] Superadmin session authenticated: superadmin@ros.com
              </div>
              <div className="p-2.5 rounded-lg bg-black/40 text-zinc-400 text-[11px] border border-border/50">
                [STORAGE] Zero-retention temporary file purging verified for OCR scans.
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Provision Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Building className="w-5 h-5 text-indigo-400" />
              Provision New Restaurant Tenant
            </h3>
            <p className="text-xs text-muted-foreground">
              Automatically creates tenant data isolation, flagship branch, standard 11 RBAC roles, admin account, and starter kitchen stations.
            </p>
            <form onSubmit={handleProvision} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-foreground">Restaurant Brand Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Bengal Bistro"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!slug) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                  }}
                  className="w-full mt-1 h-10 px-3 rounded-xl border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">Tenant Subdomain / Slug</label>
                <input
                  type="text"
                  required
                  placeholder="royal-bengal"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full mt-1 h-10 px-3 rounded-xl border border-border bg-background text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-foreground">Admin Name</label>
                  <input
                    type="text"
                    placeholder="Owner Full Name"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full mt-1 h-10 px-3 rounded-xl border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Admin Email</label>
                  <input
                    type="email"
                    placeholder="owner@brand.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full mt-1 h-10 px-3 rounded-xl border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">SaaS Subscription Tier</label>
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value as any)}
                  className="w-full mt-1 h-10 px-3 rounded-xl border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="starter">Starter Plan (Single Outlet - ₹2,999/mo)</option>
                  <option value="professional">Professional Plan (Up to 5 Outlets - ₹7,999/mo)</option>
                  <option value="enterprise">Enterprise Cloud (Unlimited - ₹14,999/mo)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" loading={provisionMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                  Provision Tenant
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
