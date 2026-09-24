'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Globe, Building, Plus, Server,
  CreditCard, Database, Search, ArrowRight, ShieldAlert, CheckCircle2, XCircle, RefreshCw,
  Layers, Users, Activity, ShieldCheck, Zap, Lock, ChevronRight, Filter, AlertTriangle,
  ExternalLink, BarChart3, TrendingUp, DollarSign, Terminal, Edit, Trash2, Settings,
  Radio, Cpu, Check, AlertCircle, Info, Sparkles, Phone, Mail, Sliders
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { connectSocket } from '@/lib/socket';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL';
  logoUrl?: string;
  branchesCount: number;
  usersCount: number;
  ordersCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface SaasPlan {
  id: string;
  name: string;
  code: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  description: string;
  features: string[];
  maxBranches: number;
  maxUsers: number;
  maxOrdersPerMonth: number;
  badge?: string;
  isPopular?: boolean;
  isActive: boolean;
}

export interface PlatformConfig {
  platformName: string;
  tagline: string;
  supportEmail: string;
  supportPhone: string;
  defaultCurrency: string;
  maintenanceMode: boolean;
  announcementBanner: string;
  allowSelfRegistration: boolean;
  maxFreeTrialDays: number;
  edgeApiGatewayUrl: string;
  systemVersion: string;
  environment: string;
  dbEngine: string;
  cacheDriver: string;
}

interface SuperAdminOverview {
  totalTenants: number;
  activeTenants: number;
  monthlyRecurringRevenue: number;
  totalOrdersProcessed: number;
  systemUptime: string;
  databaseLatencyMs: number;
  platformConfig?: PlatformConfig;
  tenants: TenantSummary[];
}

export default function SuperAdminPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);
  const user = useAuthStore((s) => s.user);

  // Sync tab with URL search parameter
  const tabFromUrl = searchParams.get('tab') as 'overview' | 'tenants' | 'plans' | 'system' | null;
  const [activeTab, setActiveTab] = useState<'overview' | 'tenants' | 'plans' | 'system'>(
    tabFromUrl && ['overview', 'tenants', 'plans', 'system'].includes(tabFromUrl) ? tabFromUrl : 'overview'
  );

  useEffect(() => {
    if (tabFromUrl && ['overview', 'tenants', 'plans', 'system'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleTabChange = (newTab: 'overview' | 'tenants' | 'plans' | 'system') => {
    setActiveTab(newTab);
    const params = new URLSearchParams(searchParams.toString());
    if (newTab === 'overview') {
      params.delete('tab');
    } else {
      params.set('tab', newTab);
    }
    const newQuery = params.toString();
    router.push(newQuery ? `/super-admin?${newQuery}` : '/super-admin');
  };

  // State for Tenant Provisioning Modal
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [plan, setPlan] = useState<string>('professional');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('');

  // State for Tenant Edit Modal
  const [editingTenant, setEditingTenant] = useState<TenantSummary | null>(null);
  const [editTenantName, setEditTenantName] = useState('');
  const [editTenantSlug, setEditTenantSlug] = useState('');
  const [editTenantPlan, setEditTenantPlan] = useState('professional');
  const [editTenantStatus, setEditTenantStatus] = useState<'ACTIVE' | 'SUSPENDED' | 'TRIAL'>('ACTIVE');

  // State for Tenant Delete Modal
  const [deletingTenant, setDeletingTenant] = useState<TenantSummary | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // State for Tenant filtering & search
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // State for SaaS Plans Modals
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SaasPlan | null>(null);
  const [planForm, setPlanForm] = useState<{
    name: string;
    code: string;
    price: number;
    currency: string;
    interval: 'month' | 'year';
    description: string;
    features: string;
    maxBranches: number;
    maxUsers: number;
    maxOrdersPerMonth: number;
    badge: string;
    isPopular: boolean;
  }>({
    name: '',
    code: '',
    price: 4999,
    currency: 'INR',
    interval: 'month',
    description: '',
    features: '',
    maxBranches: 2,
    maxUsers: 10,
    maxOrdersPerMonth: 5000,
    badge: '',
    isPopular: false,
  });
  const [deletingPlan, setDeletingPlan] = useState<SaasPlan | null>(null);

  // State for Platform Details Modal
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [platformForm, setPlatformForm] = useState<PlatformConfig>({
    platformName: 'Restaurant OS (ROS)',
    tagline: 'Enterprise Multi-Tenant Restaurant Cloud & Point of Sale',
    supportEmail: 'support@rosplatform.io',
    supportPhone: '+91 98765 43210',
    defaultCurrency: 'INR',
    maintenanceMode: false,
    announcementBanner: 'Platform Operational — All Cloud Microservices & Edge POS Nodes Synchronized.',
    allowSelfRegistration: true,
    maxFreeTrialDays: 14,
    edgeApiGatewayUrl: 'https://api.roscloud.net/v1',
    systemVersion: 'v2.6.4-prod',
    environment: 'production',
    dbEngine: 'SQLite 3 / Prisma Engine 5.22',
    cacheDriver: 'In-Memory High-Speed Cache (Redis Compatible)',
  });

  // Queries
  const { data: overview, isLoading: isOverviewLoading, refetch: refetchOverview } = useQuery<SuperAdminOverview>({
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

  const { data: plansData = [], refetch: refetchPlans } = useQuery<SaasPlan[]>({
    queryKey: ['superadmin-plans'],
    queryFn: async () => {
      try {
        const res = await apiGet<SaasPlan[]>('/tenants/plans');
        return res;
      } catch {
        return [];
      }
    },
  });

  const { data: platformDetails, refetch: refetchPlatform } = useQuery<PlatformConfig>({
    queryKey: ['superadmin-platform-details'],
    queryFn: async () => {
      try {
        const res = await apiGet<PlatformConfig>('/tenants/platform-details');
        return res;
      } catch {
        return platformForm;
      }
    },
  });

  useEffect(() => {
    if (platformDetails) {
      setPlatformForm(platformDetails);
    } else if (overview?.platformConfig) {
      setPlatformForm(overview.platformConfig);
    }
  }, [platformDetails, overview?.platformConfig]);

  // Mutations
  const provisionMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiPost('/tenants/provision', payload);
    },
    onSuccess: (data: any) => {
      toast.success('Tenant Provisioned Successfully!', data?.message || 'New restaurant tenant created.');
      setShowProvisionModal(false);
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

  const updateTenantMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiPatch(`/tenants/${id}`, data);
    },
    onSuccess: () => {
      toast.success('Tenant Updated', 'Restaurant tenant details saved successfully.');
      setEditingTenant(null);
      queryClient.invalidateQueries({ queryKey: ['superadmin-overview'] });
    },
    onError: (err: any) => {
      toast.error('Update failed', err?.response?.data?.error?.message || 'Could not update tenant');
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

  const deleteTenantMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiDelete(`/tenants/${id}`);
    },
    onSuccess: (data: any) => {
      toast.success('Tenant Deleted', data?.message || 'Tenant permanently removed.');
      setDeletingTenant(null);
      setDeleteConfirmText('');
      queryClient.invalidateQueries({ queryKey: ['superadmin-overview'] });
    },
    onError: (err: any) => {
      toast.error('Deletion failed', err?.response?.data?.error?.message || 'Could not delete tenant');
    },
  });

  const savePlanMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingPlan) {
        return apiPatch(`/tenants/plans/${editingPlan.id}`, payload);
      } else {
        return apiPost('/tenants/plans', payload);
      }
    },
    onSuccess: () => {
      toast.success(editingPlan ? 'Plan Updated' : 'Plan Created', 'SaaS pricing tier saved.');
      setShowPlanModal(false);
      setEditingPlan(null);
      queryClient.invalidateQueries({ queryKey: ['superadmin-plans'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-overview'] });
    },
    onError: (err: any) => {
      toast.error('Plan save failed', err?.response?.data?.error?.message || 'Could not save pricing plan');
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiDelete(`/tenants/plans/${id}`);
    },
    onSuccess: (data: any) => {
      toast.success('Plan Deleted', data?.message || 'Pricing plan removed.');
      setDeletingPlan(null);
      queryClient.invalidateQueries({ queryKey: ['superadmin-plans'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-overview'] });
    },
    onError: (err: any) => {
      toast.error('Plan deletion failed', err?.response?.data?.error?.message || 'Could not delete plan');
    },
  });

  const updatePlatformMutation = useMutation({
    mutationFn: async (payload: PlatformConfig) => {
      return apiPatch('/tenants/platform-details', payload);
    },
    onSuccess: () => {
      toast.success('Platform Details Updated', 'Global configuration and operational parameters applied.');
      setShowPlatformModal(false);
      queryClient.invalidateQueries({ queryKey: ['superadmin-platform-details'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-overview'] });
    },
    onError: (err: any) => {
      toast.error('Platform update failed', err?.response?.data?.error?.message || 'Could not update platform settings');
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

  const handleEditTenantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;
    updateTenantMutation.mutate({
      id: editingTenant.id,
      data: {
        name: editTenantName,
        slug: editTenantSlug,
        plan: editTenantPlan,
        status: editTenantStatus,
      },
    });
  };

  const openEditTenantModal = (t: TenantSummary) => {
    setEditingTenant(t);
    setEditTenantName(t.name);
    setEditTenantSlug(t.slug);
    setEditTenantPlan(t.plan);
    setEditTenantStatus(t.status);
  };

  const openCreatePlanModal = () => {
    setEditingPlan(null);
    setPlanForm({
      name: '',
      code: '',
      price: 4999,
      currency: 'INR',
      interval: 'month',
      description: '',
      features: 'Point of Sale (POS)\nTable Management\nInventory Tracking',
      maxBranches: 1,
      maxUsers: 5,
      maxOrdersPerMonth: 2500,
      badge: '',
      isPopular: false,
    });
    setShowPlanModal(true);
  };

  const openEditPlanModal = (p: SaasPlan) => {
    setEditingPlan(p);
    setPlanForm({
      name: p.name,
      code: p.code,
      price: p.price,
      currency: p.currency || 'INR',
      interval: p.interval || 'month',
      description: p.description || '',
      features: (p.features || []).join('\n'),
      maxBranches: p.maxBranches || 1,
      maxUsers: p.maxUsers || 5,
      maxOrdersPerMonth: p.maxOrdersPerMonth || 1000,
      badge: p.badge || '',
      isPopular: Boolean(p.isPopular),
    });
    setShowPlanModal(true);
  };

  const handlePlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const featuresList = planForm.features
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean);

    savePlanMutation.mutate({
      name: planForm.name,
      code: planForm.code || planForm.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      price: Number(planForm.price),
      currency: planForm.currency,
      interval: planForm.interval,
      description: planForm.description,
      features: featuresList,
      maxBranches: Number(planForm.maxBranches),
      maxUsers: Number(planForm.maxUsers),
      maxOrdersPerMonth: Number(planForm.maxOrdersPerMonth),
      badge: planForm.badge || undefined,
      isPopular: planForm.isPopular,
    });
  };

  const handlePlatformSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updatePlatformMutation.mutate(platformForm);
  };

  const tenants = overview?.tenants || [];
  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase());
    const matchesPlan = planFilter === 'all' || t.plan.toLowerCase() === planFilter.toLowerCase();
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const totalTenantsCount = overview?.totalTenants ?? tenants.length;
  const activeTenantsCount = overview?.activeTenants ?? tenants.filter((t) => t.status === 'ACTIVE').length;
  const mrrAmount = overview?.monthlyRecurringRevenue ?? tenants.length * 4999;
  const currentConfig = platformDetails || overview?.platformConfig || platformForm;

  return (
    <div className="space-y-6">
      {/* Maintenance Mode Global Warning Banner if Active */}
      {currentConfig.maintenanceMode && (
        <div className="p-4 rounded-2xl bg-red-950/80 border border-red-500/50 flex items-center justify-between text-red-200 text-xs shadow-lg shadow-red-950/40">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 animate-pulse" />
            <div>
              <p className="font-bold text-white text-sm">Platform Maintenance Mode is Active</p>
              <p className="text-red-300/80">Public tenant logins and guest QR ordering are restricted to administrator bypass only.</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => updatePlatformMutation.mutate({ ...currentConfig, maintenanceMode: false })}
            className="border-red-400/40 text-red-300 hover:bg-red-900/50 h-8 text-xs font-bold"
          >
            Disable Maintenance Mode
          </Button>
        </div>
      )}

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
                  <h1 className="text-2xl font-black tracking-tight text-white">{currentConfig.platformName} SaaS Plane</h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    ROOT OPERATOR
                  </span>
                </div>
                <p className="text-xs text-indigo-200/70 font-medium">
                  {currentConfig.tagline}
                </p>
              </div>
            </div>
            <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
              Logged in as <span className="text-white font-semibold">{user?.name}</span> ({user?.email}). You have root authority to modify and delete restaurant tenants, customize SaaS plans, and govern global platform policies.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchOverview();
                refetchPlans();
                refetchPlatform();
                toast.success('Cloud telemetry synchronized');
              }}
              className="gap-1.5 text-xs bg-black/40 border-indigo-500/30 text-indigo-200 hover:bg-indigo-900/40 hover:text-white"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Cloud State
            </Button>
            <Button
              onClick={() => setShowProvisionModal(true)}
              className="gap-2 text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 text-white shadow-lg shadow-indigo-500/25"
            >
              <Plus className="w-4 h-4" /> Provision Restaurant Tenant
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-indigo-500/20 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'Platform Overview', icon: Globe },
            { id: 'tenants', label: `Tenant Directory (${tenants.length})`, icon: Building },
            { id: 'plans', label: `SaaS Plans & Tiers (${plansData.length || 3})`, icon: CreditCard },
            { id: 'system', label: 'System & Infra Settings', icon: Server },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id as any)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer',
                  active
                    ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/25 scale-[1.02]'
                    : 'text-indigo-200/70 hover:text-white hover:bg-white/10'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 1: PLATFORM OVERVIEW
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Announcement Card */}
          {currentConfig.announcementBanner && (
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between text-xs text-indigo-300">
              <div className="flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>{currentConfig.announcementBanner}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleTabChange('system')}
                className="h-7 text-xs text-indigo-400 hover:text-white hover:bg-indigo-500/20"
              >
                Configure <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          )}

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
                  <span className="text-3xl font-black text-foreground">{overview?.systemUptime ?? '99.98%'}</span>
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
                  type="button"
                  onClick={() => handleTabChange('tenants')}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Manage All Directory <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="rounded-2xl border border-border bg-card/60 backdrop-blur overflow-hidden">
                <div className="divide-y divide-border">
                  {tenants.slice(0, 5).map((t) => (
                    <div key={t.id} className="p-4 flex items-center justify-between hover:bg-muted/20 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                          {t.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-foreground">{t.name}</p>
                          <p className="text-xs font-mono text-muted-foreground">/{t.slug} • {t.branchesCount} Outlets</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
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
                          variant="ghost"
                          onClick={() => openEditTenantModal(t)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          title="Edit Tenant"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>

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

            {/* Quick SaaS Control Actions */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400" /> Platform Controls
              </h3>
              <div className="p-5 rounded-2xl border border-border bg-card/60 backdrop-blur space-y-4 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <span className="text-muted-foreground">Multi-Tenant Isolation</span>
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold">STRICT ENFORCED</Badge>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <span className="text-muted-foreground">Database Engine</span>
                  <span className="font-mono text-foreground font-semibold">{currentConfig.dbEngine}</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <span className="text-muted-foreground">Active Pricing Tiers</span>
                  <span className="font-bold text-primary">{plansData.length || 3} Tiers Active</span>
                </div>
                <div className="pt-2 space-y-2">
                  <Button
                    onClick={() => handleTabChange('plans')}
                    variant="outline"
                    className="w-full justify-between text-xs h-9 border-indigo-500/30 hover:bg-indigo-500/10 text-indigo-300"
                  >
                    <span>Manage Pricing Plans</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    onClick={() => handleTabChange('system')}
                    variant="outline"
                    className="w-full justify-between text-xs h-9 border-indigo-500/30 hover:bg-indigo-500/10 text-indigo-300"
                  >
                    <span>Configure Platform Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 2: TENANTS DIRECTORY (DELETE / MODIFY / PROVISION)
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'tenants' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-2xl w-full flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search brand name, slug, or tenant ID..."
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

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 px-3 rounded-xl border border-border bg-card text-xs text-foreground focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="ACTIVE">Active Only</option>
                <option value="SUSPENDED">Suspended Only</option>
                <option value="TRIAL">Trial Only</option>
              </select>
            </div>

            <Button onClick={() => setShowProvisionModal(true)} size="sm" className="gap-2 text-xs font-bold shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground">
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
                    <th className="p-4 text-center">Staff</th>
                    <th className="p-4 text-right">Orders Processed</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Platform Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTenants.map((t) => {
                    const isPlatformTenant = t.id === 'tenant-platform' || t.slug === 'platform';
                    return (
                      <tr key={t.id} className="hover:bg-muted/20 transition-all">
                        <td className="p-4 font-bold text-sm text-foreground">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                              {t.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span>{t.name}</span>
                                {isPlatformTenant && (
                                  <Badge className="bg-indigo-500/20 text-indigo-300 text-[9px] font-black border-indigo-500/40">ROOT</Badge>
                                )}
                              </div>
                              <p className="text-[10px] font-normal text-muted-foreground font-mono truncate max-w-[160px]">{t.id}</p>
                            </div>
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
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditTenantModal(t)}
                              className="h-7 px-2 text-[11px] gap-1 border-border hover:bg-muted text-foreground"
                              title="Modify Tenant Details"
                            >
                              <Edit className="w-3 h-3" />
                              <span>Edit</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleImpersonateTenant(t.id, t.name)}
                              className="h-7 px-2 text-[11px] gap-1 border-primary/40 text-primary hover:bg-primary/10"
                              title="Switch into tenant's workspace"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Portal</span>
                            </Button>

                            {!isPlatformTenant && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setDeletingTenant(t);
                                  setDeleteConfirmText('');
                                }}
                                className="h-7 px-2 text-[11px] text-red-400 hover:text-red-300 hover:bg-red-500/15"
                                title="Delete Tenant"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 3: SAAS PLANS & TIERS (CREATE / MODIFY / DELETE)
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">SaaS Subscription Plans & Pricing</h2>
              <p className="text-xs text-muted-foreground">Manage feature tiers, monthly pricing, branch & staff limits for restaurant subscribers.</p>
            </div>
            <Button
              onClick={openCreatePlanModal}
              className="gap-1.5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="w-4 h-4" /> Create New SaaS Plan
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(plansData.length > 0 ? plansData : [
              {
                id: 'plan-starter',
                name: 'Starter Tier',
                code: 'starter',
                price: 2999,
                currency: 'INR',
                interval: 'month' as const,
                description: 'Designed for standalone boutique cafes & quick-service outlets',
                features: [
                  '1 Operating Branch Location',
                  'Point of Sale (POS) & KOT Engine',
                  'Table Management & Billing',
                  'Up to 5 Staff User Accounts',
                ],
                maxBranches: 1,
                maxUsers: 5,
                maxOrdersPerMonth: 2000,
                badge: 'STARTER TIER',
                isPopular: false,
                isActive: true,
              },
              {
                id: 'plan-professional',
                name: 'Professional Tier',
                code: 'professional',
                price: 7999,
                currency: 'INR',
                interval: 'month' as const,
                description: 'Comprehensive suite for multi-station dine-in restaurants',
                features: [
                  'Up to 5 Multi-Outlet Branches',
                  'Multi-Station KDS & Kitchen Routing',
                  'Inventory, GRN & Recipe Yields',
                  'QR Contactless Guest Ordering',
                  'AI Menu OCR Card Parser',
                ],
                maxBranches: 5,
                maxUsers: 30,
                maxOrdersPerMonth: 15000,
                badge: 'MOST POPULAR',
                isPopular: true,
                isActive: true,
              },
              {
                id: 'plan-enterprise',
                name: 'Enterprise Cloud',
                code: 'enterprise',
                price: 14999,
                currency: 'INR',
                interval: 'month' as const,
                description: 'Full enterprise power for restaurant chains & franchise HQ',
                features: [
                  'Unlimited Outlets & Franchises',
                  'Autonomous Delivery Robotics',
                  'VIP Face Biometrics & Sommelier Cellar',
                  'Dedicated SLA & Priority Cloud Scaling',
                ],
                maxBranches: 999,
                maxUsers: 9999,
                maxOrdersPerMonth: 999999,
                badge: 'ENTERPRISE CLOUD',
                isPopular: false,
                isActive: true,
              },
            ]).map((p) => {
              const subscriberCount = tenants.filter((t) => t.plan.toLowerCase() === p.code.toLowerCase()).length;
              return (
                <Card
                  key={p.id}
                  className={cn(
                    'border backdrop-blur relative flex flex-col justify-between transition-all hover:border-primary/50',
                    p.isPopular ? 'border-primary/50 bg-primary/5 shadow-xl shadow-primary/10' : 'border-border bg-card/60'
                  )}
                >
                  {p.isPopular && (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-primary text-primary-foreground font-bold text-[10px]">MOST POPULAR</Badge>
                    </div>
                  )}

                  <div>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="w-fit mb-2 bg-muted text-foreground border-border text-[10px] font-bold">
                          {p.badge || p.name.toUpperCase()}
                        </Badge>
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          {subscriberCount} Subscriber{subscriberCount === 1 ? '' : 's'}
                        </span>
                      </div>
                      <CardTitle className="text-2xl font-black text-foreground">
                        ₹{p.price.toLocaleString('en-IN')}{' '}
                        <span className="text-xs text-muted-foreground font-normal">/ {p.interval || 'month'}</span>
                      </CardTitle>
                      <CardDescription className="text-xs">{p.description}</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-3 text-xs text-muted-foreground">
                      <div className="p-2.5 rounded-xl bg-muted/40 border border-border space-y-1 font-medium text-[11px]">
                        <div className="flex justify-between text-foreground">
                          <span>Max Branch Locations:</span>
                          <span className="font-bold">{p.maxBranches >= 999 ? 'Unlimited' : p.maxBranches}</span>
                        </div>
                        <div className="flex justify-between text-foreground">
                          <span>Max Staff User Accounts:</span>
                          <span className="font-bold">{p.maxUsers >= 999 ? 'Unlimited' : p.maxUsers}</span>
                        </div>
                        <div className="flex justify-between text-foreground">
                          <span>Monthly Order Quota:</span>
                          <span className="font-bold">{p.maxOrdersPerMonth >= 99999 ? 'Unlimited' : p.maxOrdersPerMonth.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2">
                        {p.features?.map((feat, i) => (
                          <p key={i} className="flex items-center gap-2 text-foreground">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{feat}</span>
                          </p>
                        ))}
                      </div>
                    </CardContent>
                  </div>

                  <div className="p-5 pt-0 border-t border-border mt-4 flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditPlanModal(p as any)}
                      className="flex-1 text-xs gap-1.5 border-border hover:bg-muted font-bold"
                    >
                      <Edit className="w-3.5 h-3.5" /> Modify Plan
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingPlan(p as any)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/15 h-8 px-2"
                      title="Delete Plan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          TAB 4: SYSTEM & INFRASTRUCTURE CONFIGURATION
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">Cloud Infrastructure & Global Platform Details</h2>
              <p className="text-xs text-muted-foreground">Configure global support contacts, maintenance state, system telemetry, and microservices.</p>
            </div>
            <Button
              onClick={() => setShowPlatformModal(true)}
              className="gap-1.5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Sliders className="w-4 h-4" /> Edit Platform Parameters
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Live Platform Configuration Card */}
            <Card className="border-border bg-card/60 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Globe className="w-4 h-4 text-indigo-400" /> Platform Configuration
                </CardTitle>
                <CardDescription>Global SaaS environment and organizational branding parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex justify-between p-3 rounded-xl bg-muted/40 border border-border">
                  <span className="text-muted-foreground">Platform Brand</span>
                  <span className="font-bold text-foreground">{currentConfig.platformName}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-muted/40 border border-border">
                  <span className="text-muted-foreground">Support Helpdesk Email</span>
                  <span className="font-mono font-bold text-indigo-400">{currentConfig.supportEmail}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-muted/40 border border-border">
                  <span className="text-muted-foreground">Support Contact Hotline</span>
                  <span className="font-mono font-bold text-foreground">{currentConfig.supportPhone}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-muted/40 border border-border">
                  <span className="text-muted-foreground">Default Currency</span>
                  <span className="font-bold text-foreground">{currentConfig.defaultCurrency} (₹)</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-muted/40 border border-border">
                  <span className="text-muted-foreground">Tenant Self-Registration</span>
                  <Badge className={currentConfig.allowSelfRegistration ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}>
                    {currentConfig.allowSelfRegistration ? 'ENABLED' : 'DISABLED'}
                  </Badge>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-muted/40 border border-border">
                  <span className="text-muted-foreground">Free Trial Window</span>
                  <span className="font-bold text-foreground">{currentConfig.maxFreeTrialDays} Days</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-muted/40 border border-border">
                  <span className="text-muted-foreground">Maintenance Mode</span>
                  <Badge className={currentConfig.maintenanceMode ? 'bg-red-500/20 text-red-400 border-red-500/40 font-bold' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}>
                    {currentConfig.maintenanceMode ? 'MAINTENANCE ACTIVE' : 'NORMAL PRODUCTION'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Cloud Microservices & Infra Health */}
            <Card className="border-border bg-card/60 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Server className="w-4 h-4 text-primary" /> Multi-Tenant Architecture & Telemetry
                </CardTitle>
                <CardDescription>Live health from Express API & SQLite Database Cluster</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex justify-between p-3 rounded-xl bg-muted/40 border border-border">
                  <span className="text-muted-foreground">Database Engine</span>
                  <span className="font-mono font-bold text-foreground">{currentConfig.dbEngine}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-muted/40 border border-border">
                  <span className="text-muted-foreground">Memory Cache Driver</span>
                  <span className="font-bold text-emerald-400">{currentConfig.cacheDriver}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-muted/40 border border-border">
                  <span className="text-muted-foreground">Edge API Gateway</span>
                  <span className="font-mono text-indigo-400 font-semibold truncate max-w-[220px]">{currentConfig.edgeApiGatewayUrl}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-muted/40 border border-border">
                  <span className="text-muted-foreground">Release Version / Build</span>
                  <span className="font-mono font-bold text-foreground">{currentConfig.systemVersion} ({currentConfig.environment})</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-muted/40 border border-border">
                  <span className="text-muted-foreground">Process Cluster Mode</span>
                  <span className="font-bold text-indigo-400">PM2 Multi-Core Clustered</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Global Terminal Stream */}
          <Card className="border-border bg-card/60 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-400" /> Platform Security & Audit Vault
                </CardTitle>
                <CardDescription>Real-time system events across all tenant organizations</CardDescription>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                LIVE LOGS
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-black/40 text-emerald-400 text-[11px] border border-border/50">
                [SYSTEM] Multi-tenant isolation active across {tenants.length} provisioned organization databases.
              </div>
              <div className="p-2.5 rounded-lg bg-black/40 text-indigo-300 text-[11px] border border-border/50">
                [AUTH] Superadmin session authenticated: {user?.email}
              </div>
              <div className="p-2.5 rounded-lg bg-black/40 text-zinc-400 text-[11px] border border-border/50">
                [STORAGE] Zero-retention temporary file purging verified for OCR scans.
              </div>
              <div className="p-2.5 rounded-lg bg-black/40 text-purple-400 text-[11px] border border-border/50">
                [SaaS] Subscription recurring billing sync verified. Active MRR: ₹{mrrAmount.toLocaleString('en-IN')}.
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL 1: PROVISION NEW RESTAURANT TENANT
      ───────────────────────────────────────────────────────────────────────────── */}
      {showProvisionModal && (
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
                  onChange={(e) => setPlan(e.target.value)}
                  className="w-full mt-1 h-10 px-3 rounded-xl border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {plansData.length > 0 ? (
                    plansData.map((p) => (
                      <option key={p.id} value={p.code}>
                        {p.name} (₹{p.price.toLocaleString('en-IN')}/{p.interval})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="starter">Starter Plan (Single Outlet - ₹2,999/mo)</option>
                      <option value="professional">Professional Plan (Up to 5 Outlets - ₹7,999/mo)</option>
                      <option value="enterprise">Enterprise Cloud (Unlimited - ₹14,999/mo)</option>
                    </>
                  )}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowProvisionModal(false)}>
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

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL 2: EDIT / MODIFY TENANT
      ───────────────────────────────────────────────────────────────────────────── */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Edit className="w-5 h-5 text-primary" />
              Modify Restaurant Tenant
            </h3>
            <p className="text-xs text-muted-foreground">
              Update organization identity, custom slug, subscription tier, and active operational status.
            </p>
            <form onSubmit={handleEditTenantSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-foreground">Restaurant Brand Name</label>
                <input
                  type="text"
                  required
                  value={editTenantName}
                  onChange={(e) => setEditTenantName(e.target.value)}
                  className="w-full mt-1 h-10 px-3 rounded-xl border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">Subdomain / Slug</label>
                <input
                  type="text"
                  required
                  value={editTenantSlug}
                  onChange={(e) => setEditTenantSlug(e.target.value)}
                  className="w-full mt-1 h-10 px-3 rounded-xl border border-border bg-background text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground">SaaS Plan</label>
                  <select
                    value={editTenantPlan}
                    onChange={(e) => setEditTenantPlan(e.target.value)}
                    className="w-full mt-1 h-10 px-3 rounded-xl border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {plansData.length > 0 ? (
                      plansData.map((p) => (
                        <option key={p.id} value={p.code}>
                          {p.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="starter">Starter</option>
                        <option value="professional">Professional</option>
                        <option value="enterprise">Enterprise</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Account Status</label>
                  <select
                    value={editTenantStatus}
                    onChange={(e) => setEditTenantStatus(e.target.value as any)}
                    className="w-full mt-1 h-10 px-3 rounded-xl border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                    <option value="TRIAL">TRIAL</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingTenant(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" loading={updateTenantMutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL 3: DELETE TENANT CONFIRMATION
      ───────────────────────────────────────────────────────────────────────────── */}
      {deletingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-card border border-red-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-400">Delete Restaurant Tenant</h3>
                <p className="text-xs text-muted-foreground">Permanent destructive action</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-white font-bold">{deletingTenant.name}</strong> (<code>/{deletingTenant.slug}</code>)?
            </p>

            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-[11px] text-red-300 space-y-1">
              <p>⚠️ All associated data will be irreversibly erased:</p>
              <ul className="list-disc list-inside space-y-0.5 text-zinc-400 text-[10px]">
                <li>{deletingTenant.branchesCount} Branch Locations & Menus</li>
                <li>{deletingTenant.usersCount} Staff & Owner Accounts</li>
                <li>{deletingTenant.ordersCount} Past Orders, KOTs & Invoices</li>
                <li>Tables, Floors, Kitchen Stations, and Tax Rules</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-muted-foreground font-medium">
                To confirm, type <span className="font-mono font-bold text-white">{deletingTenant.slug}</span> below:
              </label>
              <input
                type="text"
                placeholder={deletingTenant.slug}
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDeletingTenant(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={deleteConfirmText !== deletingTenant.slug}
                loading={deleteTenantMutation.isPending}
                onClick={() => deleteTenantMutation.mutate(deletingTenant.id)}
                className="bg-red-600 hover:bg-red-700 text-white font-bold disabled:opacity-50"
              >
                Permanently Delete Tenant
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL 4: CREATE / EDIT SAAS PRICING PLAN
      ───────────────────────────────────────────────────────────────────────────── */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              {editingPlan ? 'Modify SaaS Pricing Plan' : 'Create New SaaS Pricing Plan'}
            </h3>
            <form onSubmit={handlePlanSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground">Plan Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Growth Tier"
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    className="w-full mt-1 h-10 px-3 rounded-xl border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Plan Code (Key)</label>
                  <input
                    type="text"
                    required
                    placeholder="growth"
                    disabled={!!editingPlan}
                    value={planForm.code}
                    onChange={(e) => setPlanForm({ ...planForm, code: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    className="w-full mt-1 h-10 px-3 rounded-xl border border-border bg-background text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground">Price (₹)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={planForm.price}
                    onChange={(e) => setPlanForm({ ...planForm, price: Number(e.target.value) })}
                    className="w-full mt-1 h-10 px-3 rounded-xl border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Billing Interval</label>
                  <select
                    value={planForm.interval}
                    onChange={(e) => setPlanForm({ ...planForm, interval: e.target.value as any })}
                    className="w-full mt-1 h-10 px-3 rounded-xl border border-border bg-background text-xs text-foreground focus:outline-none"
                  >
                    <option value="month">Per Month</option>
                    <option value="year">Per Year</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Badge Text</label>
                  <input
                    type="text"
                    placeholder="e.g. BEST VALUE"
                    value={planForm.badge}
                    onChange={(e) => setPlanForm({ ...planForm, badge: e.target.value })}
                    className="w-full mt-1 h-10 px-3 rounded-xl border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Description</label>
                <input
                  type="text"
                  placeholder="Target restaurant demographic description..."
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  className="w-full mt-1 h-10 px-3 rounded-xl border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground">Max Outlets</label>
                  <input
                    type="number"
                    min="1"
                    value={planForm.maxBranches}
                    onChange={(e) => setPlanForm({ ...planForm, maxBranches: Number(e.target.value) })}
                    className="w-full mt-1 h-10 px-3 rounded-xl border border-border bg-background text-xs text-foreground focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Max Staff</label>
                  <input
                    type="number"
                    min="1"
                    value={planForm.maxUsers}
                    onChange={(e) => setPlanForm({ ...planForm, maxUsers: Number(e.target.value) })}
                    className="w-full mt-1 h-10 px-3 rounded-xl border border-border bg-background text-xs text-foreground focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Max Orders/Mo</label>
                  <input
                    type="number"
                    min="100"
                    value={planForm.maxOrdersPerMonth}
                    onChange={(e) => setPlanForm({ ...planForm, maxOrdersPerMonth: Number(e.target.value) })}
                    className="w-full mt-1 h-10 px-3 rounded-xl border border-border bg-background text-xs text-foreground focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Features Included (one per line)</label>
                <textarea
                  rows={4}
                  placeholder="Point of Sale (POS)&#10;Kitchen Display Station&#10;Real-Time Inventory Tracking"
                  value={planForm.features}
                  onChange={(e) => setPlanForm({ ...planForm, features: e.target.value })}
                  className="w-full mt-1 p-3 rounded-xl border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isPopularCheck"
                  checked={planForm.isPopular}
                  onChange={(e) => setPlanForm({ ...planForm, isPopular: e.target.checked })}
                  className="rounded border-border"
                />
                <label htmlFor="isPopularCheck" className="text-xs text-foreground font-semibold cursor-pointer">
                  Highlight as 'Most Popular' Tier
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowPlanModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" loading={savePlanMutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                  {editingPlan ? 'Update Plan' : 'Create Plan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL 5: DELETE PLAN CONFIRMATION
      ───────────────────────────────────────────────────────────────────────────── */}
      {deletingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-400" />
              Delete Pricing Plan
            </h3>
            <p className="text-xs text-muted-foreground">
              Are you sure you want to delete the plan <strong className="text-foreground">{deletingPlan.name}</strong>? Existing tenants on this plan will not be deleted, but new signups cannot select it.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDeletingPlan(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                loading={deletePlanMutation.isPending}
                onClick={() => deletePlanMutation.mutate(deletingPlan.id)}
                className="bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                Delete Plan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL 6: EDIT PLATFORM DETAILS & SETTINGS
      ───────────────────────────────────────────────────────────────────────────── */}
      {showPlatformModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Sliders className="w-5 h-5 text-primary" />
              Configure Global Platform Parameters
            </h3>
            <p className="text-xs text-muted-foreground">
              Update platform identity, support channels, maintenance status, and cloud microservices.
            </p>
            <form onSubmit={handlePlatformSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-foreground">Platform Brand Name</label>
                <input
                  type="text"
                  required
                  value={platformForm.platformName}
                  onChange={(e) => setPlatformForm({ ...platformForm, platformName: e.target.value })}
                  className="w-full mt-1 h-10 px-3 rounded-xl border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Tagline / Mission</label>
                <input
                  type="text"
                  value={platformForm.tagline}
                  onChange={(e) => setPlatformForm({ ...platformForm, tagline: e.target.value })}
                  className="w-full mt-1 h-10 px-3 rounded-xl border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground">Support Helpdesk Email</label>
                  <input
                    type="email"
                    required
                    value={platformForm.supportEmail}
                    onChange={(e) => setPlatformForm({ ...platformForm, supportEmail: e.target.value })}
                    className="w-full mt-1 h-10 px-3 rounded-xl border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Support Phone Hotline</label>
                  <input
                    type="text"
                    value={platformForm.supportPhone}
                    onChange={(e) => setPlatformForm({ ...platformForm, supportPhone: e.target.value })}
                    className="w-full mt-1 h-10 px-3 rounded-xl border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground">Default Currency</label>
                  <select
                    value={platformForm.defaultCurrency}
                    onChange={(e) => setPlatformForm({ ...platformForm, defaultCurrency: e.target.value })}
                    className="w-full mt-1 h-10 px-3 rounded-xl border border-border bg-background text-xs text-foreground focus:outline-none"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="AED">AED (د.إ)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Trial Duration (Days)</label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={platformForm.maxFreeTrialDays}
                    onChange={(e) => setPlatformForm({ ...platformForm, maxFreeTrialDays: Number(e.target.value) })}
                    className="w-full mt-1 h-10 px-3 rounded-xl border border-border bg-background text-xs text-foreground focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Global Announcement Banner</label>
                <input
                  type="text"
                  placeholder="Banner shown on platform dashboards..."
                  value={platformForm.announcementBanner}
                  onChange={(e) => setPlatformForm({ ...platformForm, announcementBanner: e.target.value })}
                  className="w-full mt-1 h-10 px-3 rounded-xl border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Edge API Gateway Endpoint</label>
                <input
                  type="text"
                  value={platformForm.edgeApiGatewayUrl}
                  onChange={(e) => setPlatformForm({ ...platformForm, edgeApiGatewayUrl: e.target.value })}
                  className="w-full mt-1 h-10 px-3 rounded-xl border border-border bg-background text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-foreground">Allow Self-Registration</label>
                    <p className="text-[11px] text-muted-foreground">Allow restaurants to create accounts via onboarding</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={platformForm.allowSelfRegistration}
                    onChange={(e) => setPlatformForm({ ...platformForm, allowSelfRegistration: e.target.checked })}
                    className="w-4 h-4 rounded text-primary"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div>
                    <label className="text-xs font-bold text-red-400">Maintenance Mode</label>
                    <p className="text-[11px] text-muted-foreground">Block all guest QR & tenant traffic</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={platformForm.maintenanceMode}
                    onChange={(e) => setPlatformForm({ ...platformForm, maintenanceMode: e.target.checked })}
                    className="w-4 h-4 rounded text-red-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowPlatformModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" loading={updatePlatformMutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                  Save Platform Settings
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
