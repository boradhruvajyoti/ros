'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings, Building2, Percent, Printer, Shield, Save,
  CheckCircle2, Bell, Globe, Sparkles, UploadCloud, Trash2,
  ChefHat, Store, Phone, Mail, MapPin, Receipt, FileText, Loader2,
  Sliders, Server, Laptop, Copy, ExternalLink, Clock, AlertTriangle,
  Plus, Edit3, Check, X, RefreshCw, UtensilsCrossed
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { downscaleImage } from '@/lib/image-utils';
import { useAuthStore } from '@/stores/auth.store';

interface BranchOutlet {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  timezone?: string;
  currency?: string;
  isActive?: boolean;
  isActiveBranch?: boolean;
  _count?: {
    restaurantTables?: number;
    floors?: number;
    kitchenStations?: number;
    orders?: number;
    userBranchRoles?: number;
  };
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'outlets' | 'preorder' | 'logo' | 'tax' | 'printer' | 'security'>('general');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, setActiveBranch } = useAuthStore();

  // Load current tenant settings from API
  const { data: tenant, isLoading } = useQuery({
    queryKey: ['current-tenant'],
    queryFn: async () => {
      const res = await apiGet<any>('/tenants/current');
      return res;
    },
  });

  // Load tenant branches / outlets
  const { data: branches = [], isLoading: isLoadingBranches } = useQuery({
    queryKey: ['tenant-branches', user?.tenantId],
    queryFn: async () => {
      try {
        const res = await apiGet<BranchOutlet[]>('/branches');
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const isPlatformSuperAdmin =
    user?.email?.toLowerCase() === 'superadmin@ros.com' ||
    user?.tenantId === 'tenant-platform' ||
    tenant?.id === 'tenant-platform';

  // Load platform details if superadmin
  const { data: platformConfig } = useQuery({
    queryKey: ['platform-details'],
    queryFn: async () => {
      try {
        const res = await apiGet<any>('/superadmin/platform-details');
        return res;
      } catch {
        return null;
      }
    },
    enabled: !!isPlatformSuperAdmin,
  });

  // Local Form State
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [tagline, setTagline] = useState('');
  const [branchName, setBranchName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [fssai, setFssai] = useState('');
  const [address, setAddress] = useState('');
  const [cgst, setCgst] = useState('2.5');
  const [sgst, setSgst] = useState('2.5');
  const [serviceCharge, setServiceCharge] = useState('5.0');
  const [packagingFee, setPackagingFee] = useState('25');

  // Pre-Order & Table Reservation Policy State
  const [preOrderEnabled, setPreOrderEnabled] = useState(true);
  const [noShowGraceMinutes, setNoShowGraceMinutes] = useState('30');
  const [noShowPolicy, setNoShowPolicy] = useState<'REALLOCATE_TABLE' | 'CHARGEABLE_HOURLY' | 'CHARGEABLE_HALF_HOURLY' | 'FREE_HOLD'>('REALLOCATE_TABLE');
  const [noShowHoldingCharge, setNoShowHoldingCharge] = useState('150');
  const [restaurantSlug, setRestaurantSlug] = useState('');
  const [preOrderWelcomeNote, setPreOrderWelcomeNote] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Outlet Modal State
  const [showOutletModal, setShowOutletModal] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<BranchOutlet | null>(null);
  const [outletForm, setOutletForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    gstin: '',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
  });

  // Populate state when tenant or platformConfig loads
  useEffect(() => {
    if (tenant || platformConfig) {
      let parsedSettings: any = {};
      try {
        parsedSettings = typeof tenant?.settings === 'string' ? JSON.parse(tenant.settings) : (tenant?.settings || {});
      } catch {}

      if (isPlatformSuperAdmin) {
        setName(platformConfig?.platformName || tenant?.name || 'Restaurant OS (ROS)');
        setTagline(platformConfig?.tagline || parsedSettings?.tagline || 'Enterprise Multi-Tenant Restaurant Cloud & Point of Sale');
        setPhone(platformConfig?.supportPhone || tenant?.branches?.[0]?.phone || '');
        setEmail(platformConfig?.supportEmail || tenant?.branches?.[0]?.email || 'support@restaurantos.cloud');
        setFaviconUrl(platformConfig?.faviconUrl || parsedSettings?.faviconUrl || '');
      } else {
        setName(tenant?.name || '');
        setTagline(parsedSettings?.tagline || '');
        setFaviconUrl(parsedSettings?.faviconUrl || '');
      }

      setLogoUrl(tenant?.logoUrl || '');

      if (parsedSettings?.taxRate) {
        const half = (Number(parsedSettings.taxRate) / 2).toFixed(1);
        setCgst(half);
        setSgst(half);
      }
      if (parsedSettings?.serviceChargeRate !== undefined) {
        setServiceCharge(String(parsedSettings.serviceChargeRate));
      }

      // Pre-order & Reservation policies
      setRestaurantSlug(tenant?.slug || '');
      if (parsedSettings?.preOrderEnabled !== undefined) setPreOrderEnabled(Boolean(parsedSettings.preOrderEnabled));
      if (parsedSettings?.noShowGraceMinutes) setNoShowGraceMinutes(String(parsedSettings.noShowGraceMinutes));
      if (parsedSettings?.noShowPolicy) setNoShowPolicy(parsedSettings.noShowPolicy);
      if (parsedSettings?.noShowHoldingCharge) setNoShowHoldingCharge(String(parsedSettings.noShowHoldingCharge));
      if (parsedSettings?.preOrderWelcomeNote) setPreOrderWelcomeNote(parsedSettings.preOrderWelcomeNote);

      // Populate flagship branch info if available
      const mainBranch = tenant?.branches?.[0];
      if (mainBranch) {
        setBranchName(mainBranch.name || (isPlatformSuperAdmin ? 'Global Multi-Tenant Cloud Cluster' : ''));
        if (!isPlatformSuperAdmin) {
          setPhone(mainBranch.phone || '');
          setEmail(mainBranch.email || '');
        }
        setGstin(mainBranch.gstin || '');
        setAddress(mainBranch.address || '');

        let branchSettings: any = {};
        try {
          branchSettings = typeof mainBranch.settings === 'string' ? JSON.parse(mainBranch.settings) : (mainBranch.settings || {});
        } catch {}
        if (branchSettings?.fssai) setFssai(branchSettings.fssai);
      }
    }
  }, [tenant, platformConfig, isPlatformSuperAdmin]);

  // Handle Logo file upload (auto-downscaled to max 150px)
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File Too Large', 'Please select an image under 10MB.');
      return;
    }
    try {
      const downscaledBase64 = await downscaleImage(file, 150);
      setLogoUrl(downscaledBase64);
      toast.success(
        isPlatformSuperAdmin ? 'Platform Logo Optimized & Selected' : 'Logo Optimized & Selected',
        'Logo auto-downscaled to 150px. Click "Save All Changes" to persist.'
      );
    } catch (err: any) {
      toast.error('Upload Failed', err.message || 'Could not process logo');
    }
  };

  // Handle Favicon file upload (auto-downscaled to 64px square)
  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File Too Large', 'Please select an image under 5MB.');
      return;
    }
    try {
      const downscaledBase64 = await downscaleImage(file, 64);
      setFaviconUrl(downscaledBase64);
      toast.success(
        'Favicon Selected',
        'Favicon auto-downscaled to 64px. Click "Save All Changes" to persist.'
      );
    } catch (err: any) {
      toast.error('Upload Failed', err.message || 'Could not process favicon');
    }
  };

  // Save Settings Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      let currentSettings: any = {};
      try {
        currentSettings = typeof tenant?.settings === 'string' ? JSON.parse(tenant.settings) : (tenant?.settings || {});
      } catch {}

      const totalTax = (parseFloat(cgst) || 0) + (parseFloat(sgst) || 0);

      const payload = {
        name: name.trim(),
        slug: restaurantSlug.trim() || undefined,
        logoUrl: logoUrl.trim() || null,
        settings: {
          ...currentSettings,
          tagline: tagline.trim(),
          faviconUrl: faviconUrl.trim() || null,
          taxRate: totalTax,
          serviceChargeRate: parseFloat(serviceCharge) || 0,
          preOrderEnabled,
          noShowGraceMinutes: parseInt(noShowGraceMinutes, 10) || 30,
          noShowPolicy,
          noShowHoldingCharge: parseFloat(noShowHoldingCharge) || 0,
          preOrderWelcomeNote: preOrderWelcomeNote.trim(),
          ...(isPlatformSuperAdmin
            ? {
                platformConfig: {
                  ...(currentSettings.platformConfig || {}),
                  platformName: name.trim(),
                  tagline: tagline.trim(),
                  faviconUrl: faviconUrl.trim() || null,
                  supportEmail: email.trim(),
                  supportPhone: phone.trim(),
                },
              }
            : {}),
        },
      };

      const res = await apiPatch('/tenants/current', payload);

      if (isPlatformSuperAdmin) {
        try {
          await apiPatch('/superadmin/platform-details', {
            platformName: name.trim(),
            tagline: tagline.trim(),
            faviconUrl: faviconUrl.trim() || null,
            supportEmail: email.trim(),
            supportPhone: phone.trim(),
          });
        } catch {}
      }

      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-tenant'] });
      queryClient.invalidateQueries({ queryKey: ['platform-details'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-overview'] });
      toast.success(
        isPlatformSuperAdmin ? 'Platform Settings Saved' : 'Settings Saved',
        isPlatformSuperAdmin
          ? 'Platform brand identity, site title, tagline, logo, and global policies updated successfully.'
          : 'Restaurant identity, logo and parameters updated successfully.'
      );
    },
    onError: (err: any) => {
      toast.error('Save Failed', err?.message || 'Could not save settings.');
    },
  });

  // Switch Branch Mutation
  const switchBranchMutation = useMutation({
    mutationFn: (branchId: string) => apiPost<any>('/branches/switch', { branchId }),
    onSuccess: (data: any, branchId: string) => {
      const targetBranch = branches.find((b) => b.id === branchId);
      const bName = targetBranch?.name || data?.user?.branchName || 'Selected Outlet';
      setActiveBranch(branchId, bName, data?.accessToken);
      toast.success('Active Outlet Switched', `Now operating under ${bName}`);
      queryClient.invalidateQueries();
    },
    onError: (err: any) => {
      toast.error('Switch Failed', err?.response?.data?.error?.message || err?.message || 'Could not switch active branch.');
    },
  });

  // Save / Create Outlet Mutation
  const saveOutletMutation = useMutation({
    mutationFn: async () => {
      if (editingOutlet) {
        return await apiPatch(`/branches/${editingOutlet.id}`, outletForm);
      } else {
        return await apiPost('/branches', outletForm);
      }
    },
    onSuccess: () => {
      toast.success(
        editingOutlet ? 'Outlet Updated' : 'Outlet Created',
        `Outlet '${outletForm.name}' has been successfully ${editingOutlet ? 'updated' : 'provisioned and configured'}.`
      );
      setShowOutletModal(false);
      setEditingOutlet(null);
      queryClient.invalidateQueries({ queryKey: ['tenant-branches'] });
    },
    onError: (err: any) => {
      toast.error(
        editingOutlet ? 'Update Failed' : 'Outlet Creation Failed',
        err?.response?.data?.error?.message || err?.message || 'Could not save outlet.'
      );
    },
  });

  // Delete / Archive Outlet Mutation
  const deleteOutletMutation = useMutation({
    mutationFn: (branchId: string) => apiDelete(`/branches/${branchId}`),
    onSuccess: () => {
      toast.success('Outlet Archived', 'The outlet has been deactivated.');
      queryClient.invalidateQueries({ queryKey: ['tenant-branches'] });
    },
    onError: (err: any) => {
      toast.error('Archive Failed', err?.response?.data?.error?.message || err?.message || 'Could not archive outlet.');
    },
  });

  const openAddOutletModal = () => {
    setEditingOutlet(null);
    setOutletForm({
      name: '',
      address: '',
      phone: '',
      email: '',
      gstin: '',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
    });
    setShowOutletModal(true);
  };

  const openEditOutletModal = (b: BranchOutlet) => {
    setEditingOutlet(b);
    setOutletForm({
      name: b.name,
      address: b.address || '',
      phone: b.phone || '',
      email: b.email || '',
      gstin: b.gstin || '',
      timezone: b.timezone || 'Asia/Kolkata',
      currency: b.currency || 'INR',
    });
    setShowOutletModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            {isPlatformSuperAdmin ? (
              <Globe className="w-6 h-6 text-indigo-400" />
            ) : (
              <Settings className="w-6 h-6 text-primary" />
            )}
            {isPlatformSuperAdmin ? 'Platform Settings' : 'Restaurant Profile & System Settings'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isPlatformSuperAdmin
              ? 'Configure global platform brand identity, site title, tagline, logo, support contacts, and system policies'
              : 'Configure restaurant brand logo, multi-outlet locations, GST tax rules, and receipt printing'}
          </p>
        </div>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || isLoading}
          className={cn(
            'gap-2 shadow-sm cursor-pointer',
            isPlatformSuperAdmin
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold'
              : 'bg-primary hover:bg-primary/90 text-primary-foreground'
          )}
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saveMutation.isPending ? 'Saving...' : 'Save All Changes'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto scrollbar-none">
        {[
          { id: 'general', label: isPlatformSuperAdmin ? 'Platform Info' : 'Restaurant Info', icon: isPlatformSuperAdmin ? Globe : Building2 },
          ...(!isPlatformSuperAdmin ? [{ id: 'outlets', label: `Outlets & Locations (${branches.length})`, icon: Store }] : []),
          ...(!isPlatformSuperAdmin ? [{ id: 'preorder', label: 'Pre-Orders & Reservations', icon: Sparkles }] : []),
          { id: 'logo', label: isPlatformSuperAdmin ? 'Platform Logo & Media' : 'Brand Logo & Media', icon: UploadCloud },
          { id: 'tax', label: isPlatformSuperAdmin ? 'Global Tax Defaults' : 'Taxes & Charges', icon: Percent },
          { id: 'printer', label: isPlatformSuperAdmin ? 'Hardware & Printers' : 'KOT & Printers', icon: Printer },
          { id: 'security', label: isPlatformSuperAdmin ? 'Platform Security & Policies' : 'Security & Access', icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer',
                activeTab === tab.id
                  ? isPlatformSuperAdmin
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── OUTLETS & BRANCHES TAB ── */}
      {activeTab === 'outlets' && (
        <div className="space-y-6">
          <Card className="border-border/70 bg-card/60 backdrop-blur-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Store className="w-5 h-5 text-primary" />
                  <span>Restaurant Outlets & Multi-Unit Branches</span>
                </CardTitle>
                <CardDescription>
                  Manage all physical outlets, sister branches, and franchise locations operating under your restaurant brand.
                </CardDescription>
              </div>
              <Button
                onClick={openAddOutletModal}
                className="gap-1.5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" /> Add New Outlet
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingBranches ? (
                <div className="p-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading outlets...
                </div>
              ) : branches.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground space-y-2 border border-dashed border-border rounded-xl">
                  <p className="font-semibold text-foreground">No Outlets Registered</p>
                  <p className="text-xs">Click "Add New Outlet" to initialize your first restaurant branch location.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {branches.map((b) => {
                    const isCurrent = b.id === (user?.branchId || branches[0]?.id);
                    return (
                      <div
                        key={b.id}
                        className={cn(
                          "p-4 rounded-xl border transition-all space-y-3 relative",
                          isCurrent
                            ? "bg-primary/5 border-primary/40 shadow-xs ring-1 ring-primary/20"
                            : "bg-accent/20 border-border hover:border-foreground/20"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-sm text-foreground">{b.name}</h3>
                              {isCurrent ? (
                                <Badge className="bg-primary text-primary-foreground text-[10px] font-bold">
                                  CURRENT OPERATING OUTLET
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px]">
                                  {b.isActive ? 'ACTIVE' : 'INACTIVE'}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3 shrink-0 opacity-70" />
                              <span>{b.address || 'Address not specified'}</span>
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1 border-t border-border/60">
                          <div>
                            <span className="font-semibold text-foreground/80">Phone:</span> {b.phone || 'N/A'}
                          </div>
                          <div>
                            <span className="font-semibold text-foreground/80">GSTIN:</span> {b.gstin || 'N/A'}
                          </div>
                          <div>
                            <span className="font-semibold text-foreground/80">Tables:</span> {b._count?.restaurantTables || 0}
                          </div>
                          <div>
                            <span className="font-semibold text-foreground/80">Kitchen Stations:</span> {b._count?.kitchenStations || 0}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
                          <div>
                            {!isCurrent ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={switchBranchMutation.isPending}
                                onClick={() => switchBranchMutation.mutate(b.id)}
                                className="h-7 text-xs font-semibold hover:bg-primary hover:text-primary-foreground cursor-pointer"
                              >
                                <RefreshCw className="w-3 h-3 mr-1" /> Switch to This Outlet
                              </Button>
                            ) : (
                              <span className="text-xs font-semibold text-primary flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Active in POS & Kitchen
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditOutletModal(b)}
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit
                            </Button>
                            {branches.length > 1 && !isCurrent && (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={deleteOutletMutation.isPending}
                                onClick={() => {
                                  if (confirm(`Archive outlet '${b.name}'?`)) {
                                    deleteOutletMutation.mutate(b.id);
                                  }
                                }}
                                className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── ADD / EDIT OUTLET MODAL ── */}
      {showOutletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="w-full max-w-lg bg-card border border-border p-6 shadow-2xl space-y-4 text-foreground relative">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-base text-foreground">
                  {editingOutlet ? `Edit Outlet: ${editingOutlet.name}` : 'Add New Restaurant Outlet'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowOutletModal(false)}
                className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Outlet Name *</label>
                <Input
                  placeholder="e.g. Indiranagar Flagship Outlet or Downtown Express"
                  value={outletForm.name}
                  onChange={(e) => setOutletForm({ ...outletForm, name: e.target.value })}
                  className="bg-background text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Street Address / Location</label>
                <Input
                  placeholder="e.g. 100 Feet Rd, Indiranagar, Bengaluru"
                  value={outletForm.address}
                  onChange={(e) => setOutletForm({ ...outletForm, address: e.target.value })}
                  className="bg-background text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Phone Number</label>
                  <Input
                    placeholder="+91 98765 43210"
                    value={outletForm.phone}
                    onChange={(e) => setOutletForm({ ...outletForm, phone: e.target.value })}
                    className="bg-background text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Email Address</label>
                  <Input
                    placeholder="branch@restaurant.com"
                    value={outletForm.email}
                    onChange={(e) => setOutletForm({ ...outletForm, email: e.target.value })}
                    className="bg-background text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">GSTIN / Tax ID</label>
                  <Input
                    placeholder="29AAAAA0000A1Z5"
                    value={outletForm.gstin}
                    onChange={(e) => setOutletForm({ ...outletForm, gstin: e.target.value })}
                    className="bg-background text-xs font-mono uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Currency</label>
                  <Input
                    value={outletForm.currency}
                    onChange={(e) => setOutletForm({ ...outletForm, currency: e.target.value })}
                    className="bg-background text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOutletModal(false)}
                className="text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!outletForm.name.trim() || saveOutletMutation.isPending}
                onClick={() => saveOutletMutation.mutate()}
                className="text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
              >
                {saveOutletMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                ) : (
                  <Save className="w-3.5 h-3.5 mr-1" />
                )}
                {editingOutlet ? 'Update Outlet' : 'Provision Outlet'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Orders & Table Reservation Policy Tab */}
      {activeTab === 'preorder' && (
        <div className="space-y-6">
          {/* Public Welcome Page & Link Card */}
          <Card className="border-border/70 bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span>Public Welcome & Pre-Order Link</span>
              </CardTitle>
              <CardDescription>
                Your guests can view your restaurant welcome page, book tables on interactive layouts, and pre-order food online before visiting.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Public URL Box */}
              <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 dark:bg-purple-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                    Live Public Welcome URL
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    ● Active
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1 px-3 py-2 rounded-lg bg-background border border-border font-mono text-xs text-foreground select-all overflow-x-auto">
                    https://ros.oxomsoft.com/{restaurantSlug || tenant?.slug || 'restaurant'}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const url = `https://ros.oxomsoft.com/${restaurantSlug || tenant?.slug || 'restaurant'}`;
                        navigator.clipboard.writeText(url);
                        setCopiedLink(true);
                        toast.success('Link Copied!', 'Public welcome URL copied to clipboard.');
                        setTimeout(() => setCopiedLink(false), 2500);
                      }}
                      className="gap-1.5 text-xs h-8"
                    >
                      {copiedLink ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.open(`/${restaurantSlug || tenant?.slug || 'restaurant'}`, '_blank');
                      }}
                      className="gap-1.5 text-xs h-8"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Slug customization */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Custom Handle / URL Slug</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono">ros.oxomsoft.com/</span>
                    <Input
                      value={restaurantSlug}
                      onChange={(e) => setRestaurantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="royal-biryani"
                      className="font-mono text-xs bg-background"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Enable Online Pre-Orders</label>
                  <div className="flex items-center gap-3 pt-1">
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preOrderEnabled}
                        onChange={(e) => setPreOrderEnabled(e.target.checked)}
                        className="rounded border-border"
                      />
                      <span>Allow guests to pre-order dishes from public menu</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Custom Welcome Note */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Hero Welcome Note / Tagline for Guests</label>
                <Input
                  value={preOrderWelcomeNote}
                  onChange={(e) => setPreOrderWelcomeNote(e.target.value)}
                  placeholder="Welcome to our restaurant! Book your favorite table & order fresh gourmet food in advance."
                  className="text-xs bg-background"
                />
              </div>
            </CardContent>
          </Card>

          {/* Table Reservation & No-Show Policy Card */}
          <Card className="border-border/70 bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span>Table Reservation & No-Show Grace Period Policies</span>
              </CardTitle>
              <CardDescription>
                Define automated rules for late guest arrivals, grace duration, and holding compensation charges.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Grace Period */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Grace Period (Minutes)</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="5"
                      max="120"
                      value={noShowGraceMinutes}
                      onChange={(e) => setNoShowGraceMinutes(e.target.value)}
                      className="w-32 text-xs bg-background font-mono"
                    />
                    <span className="text-xs text-muted-foreground">minutes after scheduled booking time</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Table is protected during this period. Once expired, the configured no-show policy triggers automatically.
                  </p>
                </div>

                {/* Policy Action */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Action Upon Grace Period Expiry</label>
                  <select
                    value={noShowPolicy}
                    onChange={(e) => setNoShowPolicy(e.target.value as any)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="REALLOCATE_TABLE">Auto-Reallocate Table to Walk-in Guests (Release Hold)</option>
                    <option value="CHARGEABLE_HOURLY">Charge Retainer / Holding Fee (Per Hour Table Occupancy)</option>
                    <option value="CHARGEABLE_HALF_HOURLY">Charge Retainer / Holding Fee (Per 30 Mins)</option>
                    <option value="FREE_HOLD">Keep Reserved Indefinitely (No Auto-Release)</option>
                  </select>
                </div>
              </div>

              {/* Charge amount if chargeable */}
              {(noShowPolicy === 'CHARGEABLE_HOURLY' || noShowPolicy === 'CHARGEABLE_HALF_HOURLY') && (
                <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Table Holding Rate</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold">₹</span>
                    <Input
                      type="number"
                      value={noShowHoldingCharge}
                      onChange={(e) => setNoShowHoldingCharge(e.target.value)}
                      className="w-32 text-xs bg-background font-mono"
                    />
                    <span className="text-xs text-muted-foreground">
                      {noShowPolicy === 'CHARGEABLE_HOURLY' ? 'per hour delay added to final invoice' : 'per 30-min delay added to final invoice'}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* General Settings */}
      {activeTab === 'general' && (
        <Card className="border-border/70 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">
              {isPlatformSuperAdmin ? 'Platform Brand Identity & Support Coordinates' : 'Restaurant Identity & Flagship Outlet'}
            </CardTitle>
            <CardDescription>
              {isPlatformSuperAdmin
                ? 'Global public metadata displayed across platform dashboards, tenant consoles, and system communications'
                : 'Basic restaurant brand info displayed on customer receipts, invoices, and digital menus'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {isPlatformSuperAdmin ? 'Primary Platform / System Name' : 'Restaurant Brand Name'}
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isPlatformSuperAdmin ? 'Restaurant OS (ROS)' : 'Royal Biryani House'}
                  className="bg-background text-xs font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Tagline / Motto</label>
                <Input
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder={isPlatformSuperAdmin ? 'Culinary Operating System' : 'Authentic Hyderabadi Flavors Since 1998'}
                  className="bg-background text-xs font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {isPlatformSuperAdmin ? 'Platform Support Phone' : 'Flagship Outlet Phone'}
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="bg-background text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  {isPlatformSuperAdmin ? 'Platform Support Email' : 'Official Business Email'}
                </label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isPlatformSuperAdmin ? 'support@restaurantos.cloud' : 'info@royalbiryani.com'}
                  className="bg-background text-xs font-medium"
                />
              </div>

              {!isPlatformSuperAdmin && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">GSTIN / Tax Identification</label>
                    <Input
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value)}
                      placeholder="29AAAAA0000A1Z5"
                      className="bg-background text-xs font-mono uppercase"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">FSSAI Food License No.</label>
                    <Input
                      value={fssai}
                      onChange={(e) => setFssai(e.target.value)}
                      placeholder="11223344556677"
                      className="bg-background text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold text-foreground">Primary Flagship Address</label>
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Plot 42, 100 Feet Rd, Indiranagar, Bengaluru, Karnataka 560038"
                      className="bg-background text-xs font-medium"
                    />
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Brand Logo & Media */}
      {activeTab === 'logo' && (
        <Card className="border-border/70 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">
              {isPlatformSuperAdmin ? 'Platform Brand Identity & Media' : 'Brand Logo & Favicon'}
            </CardTitle>
            <CardDescription>
              {isPlatformSuperAdmin
                ? 'High-definition brand logos and browser icons displayed across the global control plane and client portals'
                : 'Upload your restaurant brand logo and favicon. Automatically resized and optimized for receipts and digital menus.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Logo Upload Box */}
              <div className="p-4 rounded-xl border border-border bg-accent/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-foreground">Primary Brand Logo</span>
                  {logoUrl && (
                    <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Configured
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl border border-border bg-background flex items-center justify-center overflow-hidden p-1 shrink-0">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Brand Logo" className="w-full h-full object-contain" />
                    ) : (
                      <UtensilsCrossed className="w-8 h-8 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="space-y-2 flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      id="logo-upload"
                      className="hidden"
                    />
                    <label
                      htmlFor="logo-upload"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer transition-all"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Upload Logo</span>
                    </label>
                    <p className="text-[11px] text-muted-foreground">PNG, SVG or JPEG. Max 10MB.</p>
                  </div>
                </div>
              </div>

              {/* Favicon Upload Box */}
              <div className="p-4 rounded-xl border border-border bg-accent/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-foreground">Browser Tab Favicon</span>
                  {faviconUrl && (
                    <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Configured
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl border border-border bg-background flex items-center justify-center overflow-hidden p-1 shrink-0">
                    {faviconUrl ? (
                      <img src={faviconUrl} alt="Favicon" className="w-full h-full object-contain" />
                    ) : (
                      <Globe className="w-6 h-6 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="space-y-2 flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFaviconUpload}
                      id="favicon-upload"
                      className="hidden"
                    />
                    <label
                      htmlFor="favicon-upload"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer transition-all"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Upload Favicon</span>
                    </label>
                    <p className="text-[11px] text-muted-foreground">Square PNG or ICO (64x64px recommended).</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tax & Charges Settings */}
      {activeTab === 'tax' && (
        <Card className="border-border/70 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">
              {isPlatformSuperAdmin ? 'Platform Global Tax Rules' : 'GST Tax & Service Charges'}
            </CardTitle>
            <CardDescription>
              {isPlatformSuperAdmin
                ? 'Default tax rates applied to new restaurant workspaces created on the platform'
                : 'Configure CGST, SGST, service charges and packaging fees automatically applied to dine-in and takeaway bills'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-border bg-accent/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-foreground">CGST (Central GST)</span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="0.1"
                      value={cgst}
                      onChange={(e) => setCgst(e.target.value)}
                      className="w-16 h-8 text-right bg-background text-xs font-bold"
                    />
                    <span className="text-xs font-bold">%</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Standard restaurant CGST rate (usually 2.5% for non-AC/AC composite)</p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-accent/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-foreground">SGST (State GST)</span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="0.1"
                      value={sgst}
                      onChange={(e) => setSgst(e.target.value)}
                      className="w-16 h-8 text-right bg-background text-xs font-bold"
                    />
                    <span className="text-xs font-bold">%</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Standard restaurant SGST rate (usually 2.5% for non-AC/AC composite)</p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-accent/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-foreground">Service Charge</span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="0.5"
                      value={serviceCharge}
                      onChange={(e) => setServiceCharge(e.target.value)}
                      className="w-16 h-8 text-right bg-background text-xs font-bold"
                    />
                    <span className="text-xs font-bold">%</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Optional dine-in hospitality service charge (0% to disable)</p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-accent/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-foreground">Takeaway Packaging Fee</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold">₹</span>
                    <Input
                      type="number"
                      value={packagingFee}
                      onChange={(e) => setPackagingFee(e.target.value)}
                      className="w-16 h-8 text-right bg-background text-xs font-bold"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Flat charge for delivery and takeaway packaging</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Printer Settings */}
      {activeTab === 'printer' && (
        <Card className="border-border/70 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">KOT & Thermal Printer Routing</CardTitle>
            <CardDescription>Network thermal printers (80mm ESC/POS) for bill and kitchen routing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {[
                { name: 'Billing Desk Printer', ip: '192.168.1.101', role: 'Invoices & Customer Receipts', status: 'Online' },
                { name: 'Main Kitchen Printer', ip: '192.168.1.102', role: 'Mains & Tandoor KOTs', status: 'Online' },
                { name: 'Bar & Beverage Printer', ip: '192.168.1.103', role: 'Beverages & Mocktails', status: 'Online' },
              ].map((p, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-xl border border-border bg-accent/30">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-foreground">{p.name}</p>
                      <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        ● {p.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{p.role} · <code className="text-foreground">{p.ip}</code></p>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs h-8">
                    Test Print
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Settings */}
      {activeTab === 'security' && (
        <Card className="border-border/70 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">Security & Access Controls</CardTitle>
            <CardDescription>JWT token expiration, password policies, and role permissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-border bg-accent/30 space-y-1">
                <p className="font-semibold text-sm text-foreground">Access Token Lifetime</p>
                <p className="text-xs text-muted-foreground">15 minutes (with automated silent refresh)</p>
              </div>
              <div className="p-4 rounded-xl border border-border bg-accent/30 space-y-1">
                <p className="font-semibold text-sm text-foreground">Refresh Token Lifetime</p>
                <p className="text-xs text-muted-foreground">30 days (opaque hash with revocation)</p>
              </div>
              <div className="p-4 rounded-xl border border-border bg-accent/30 space-y-1">
                <p className="font-semibold text-sm text-foreground">Audit Logging</p>
                <p className="text-xs text-emerald-500 font-medium">✓ Enabled for all orders, payments & discounts</p>
              </div>
              <div className="p-4 rounded-xl border border-border bg-accent/30 space-y-1">
                <p className="font-semibold text-sm text-foreground">Role-Based Access Control</p>
                <p className="text-xs text-emerald-500 font-medium">✓ Granular permissions enforced on all API endpoints</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
