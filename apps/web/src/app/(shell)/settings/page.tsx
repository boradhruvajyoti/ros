'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings, Building2, Percent, Printer, Shield, Save,
  CheckCircle2, Bell, Globe, Sparkles, UploadCloud, Trash2,
  ChefHat, Store, Phone, Mail, MapPin, Receipt, FileText, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { apiGet, apiPatch } from '@/lib/api';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'logo' | 'tax' | 'printer' | 'security'>('general');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load current tenant settings from API
  const { data: tenant, isLoading } = useQuery({
    queryKey: ['current-tenant'],
    queryFn: async () => {
      const res = await apiGet<any>('/tenants/current');
      return res;
    },
  });

  // Local Form State
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
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

  // Populate state when tenant loads
  useEffect(() => {
    if (tenant) {
      setName(tenant.name || '');
      setLogoUrl(tenant.logoUrl || '');

      let parsedSettings: any = {};
      try {
        parsedSettings = typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : (tenant.settings || {});
      } catch {}

      setTagline(parsedSettings?.tagline || '');
      if (parsedSettings?.taxRate) {
        const half = (Number(parsedSettings.taxRate) / 2).toFixed(1);
        setCgst(half);
        setSgst(half);
      }
      if (parsedSettings?.serviceChargeRate !== undefined) {
        setServiceCharge(String(parsedSettings.serviceChargeRate));
      }

      // Populate flagship branch info if available
      const mainBranch = tenant.branches?.[0];
      if (mainBranch) {
        setBranchName(mainBranch.name || '');
        setPhone(mainBranch.phone || '');
        setEmail(mainBranch.email || '');
        setGstin(mainBranch.gstin || '');
        setAddress(mainBranch.address || '');

        let branchSettings: any = {};
        try {
          branchSettings = typeof mainBranch.settings === 'string' ? JSON.parse(mainBranch.settings) : (mainBranch.settings || {});
        } catch {}
        if (branchSettings?.fssai) setFssai(branchSettings.fssai);
      }
    }
  }, [tenant]);

  // Handle Logo file upload (base64 Data URI)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File Too Large', 'Please select an image under 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setLogoUrl(base64);
      toast.success('Logo Selected', 'Click "Save All Changes" to persist your brand logo.');
    };
    reader.readAsDataURL(file);
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
        logoUrl: logoUrl.trim() || null,
        settings: {
          ...currentSettings,
          tagline: tagline.trim(),
          taxRate: totalTax,
          serviceChargeRate: parseFloat(serviceCharge) || 0,
        },
      };

      return await apiPatch('/tenants/current', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-tenant'] });
      toast.success('Settings Saved', 'Restaurant identity, logo and parameters updated successfully.');
    },
    onError: (err: any) => {
      toast.error('Save Failed', err?.message || 'Could not save settings.');
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" />
            Restaurant Profile & System Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure restaurant brand logo, outlet address, GST tax rules, and receipt printing
          </p>
        </div>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || isLoading}
          className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
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
          { id: 'general', label: 'Restaurant Info', icon: Building2 },
          { id: 'logo', label: 'Brand Logo & Media', icon: UploadCloud },
          { id: 'tax', label: 'Taxes & Charges', icon: Percent },
          { id: 'printer', label: 'KOT & Printers', icon: Printer },
          { id: 'security', label: 'Security & Access', icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap',
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Brand Logo & Media Tab */}
      {activeTab === 'logo' && (
        <Card className="border-border/70 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-primary" />
              Restaurant Brand Logo & Digital Identity
            </CardTitle>
            <CardDescription>
              This logo will appear on your top navigation bar, guest QR ordering menus, invoices, and physical standees.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-6 rounded-2xl border border-border bg-background/50 flex flex-col md:flex-row items-center gap-6">
              {/* Logo Preview Container */}
              <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-border bg-card flex flex-col items-center justify-center overflow-hidden shrink-0 relative shadow-sm">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={name || 'Restaurant Logo'}
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <div className="flex flex-col items-center text-muted-foreground p-3 text-center">
                    <ChefHat className="w-8 h-8 opacity-40 mb-1" />
                    <span className="text-[10px] font-bold tracking-wider">NO LOGO</span>
                  </div>
                )}
              </div>

              {/* Upload Actions & Direct URL */}
              <div className="flex-1 w-full space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <div className="h-10 px-4 rounded-xl border border-border bg-card hover:bg-accent text-xs font-bold text-foreground flex items-center gap-2 transition-colors shadow-sm">
                      <UploadCloud className="w-4 h-4 text-primary" />
                      Upload Logo Image File (PNG/JPG/SVG)
                    </div>
                  </label>

                  {logoUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setLogoUrl('')}
                      className="text-xs h-10 rounded-xl text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4 mr-1.5" /> Remove Logo
                    </Button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Or specify Direct Public Image URL
                  </label>
                  <Input
                    placeholder="https://example.com/logo.png"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="h-10 bg-card text-xs font-mono"
                  />
                </div>

                <p className="text-[11px] text-muted-foreground">
                  💡 Tip: High-resolution PNG or SVG files with transparent backgrounds display best in dark and light modes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* General Settings */}
      {activeTab === 'general' && (
        <Card className="border-border/70 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">Restaurant Identity & Flagship Outlet</CardTitle>
            <CardDescription>Details printed on guest invoices, receipts, and KOT tickets</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quick Logo Bar in General Tab */}
            <div className="p-4 rounded-xl border border-border bg-background/50 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl border border-border bg-card flex items-center justify-center overflow-hidden shrink-0">
                  {logoUrl ? (
                    <img src={logoUrl} alt={name} className="w-full h-full object-contain p-1" />
                  ) : (
                    <ChefHat className="w-6 h-6 text-muted-foreground opacity-50" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Restaurant Brand Logo</p>
                  <p className="text-[11px] text-muted-foreground">
                    {logoUrl ? 'Custom logo is active' : 'No custom logo uploaded yet'}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('logo')}
                className="text-xs gap-1.5"
              >
                <UploadCloud className="w-3.5 h-3.5 text-primary" />
                Change Logo
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Restaurant Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Restaurant Name"
                  className="h-10 bg-background font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Tagline / Brand Slogan</label>
                <Input
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Authentic Wood-Fired Dining"
                  className="h-10 bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Primary Branch / Outlet Name</label>
                <Input
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="Connaught Place Flagship"
                  className="h-10 bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Contact Phone Number</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="h-10 bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Official Email Address</label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@restaurant.com"
                  className="h-10 bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">GSTIN / Tax ID</label>
                <Input
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="27AAAAA0000A1Z5"
                  className="h-10 bg-background font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">FSSAI License No.</label>
                <Input
                  value={fssai}
                  onChange={(e) => setFssai(e.target.value)}
                  placeholder="10019011000543"
                  className="h-10 bg-background font-mono"
                />
              </div>
              <div className="col-span-full space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Full Physical Address</label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Full street address, city, state, postal code"
                  className="h-10 bg-background"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tax Settings */}
      {activeTab === 'tax' && (
        <Card className="border-border/70 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">Tax Configuration & Surcharges</CardTitle>
            <CardDescription>Configure itemized GST rates and optional service charges applied on billing</CardDescription>
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
                <p className="text-xs text-muted-foreground">Applies automatically to all food & beverage items</p>
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
                <p className="text-xs text-muted-foreground">Applies automatically to all food & beverage items</p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-accent/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-foreground">Service Charge (Optional)</span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="0.1"
                      value={serviceCharge}
                      onChange={(e) => setServiceCharge(e.target.value)}
                      className="w-16 h-8 text-right bg-background text-xs font-bold"
                    />
                    <span className="text-xs font-bold">%</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Discretionary service charge for dine-in orders</p>
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
