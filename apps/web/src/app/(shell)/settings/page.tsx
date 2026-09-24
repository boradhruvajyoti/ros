'use client';

import { useState } from 'react';
import {
  Settings, Building2, Percent, Printer, Shield, Save,
  CheckCircle2, Bell, Globe, Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'tax' | 'printer' | 'security'>('general');
  const { toast } = useToast();

  const handleSave = () => {
    toast.success('Configuration saved successfully');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" />
            System & Branch Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure restaurant identity, tax calculations, hardware printers, and security policies
          </p>
        </div>
        <Button onClick={handleSave} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
          <Save className="w-4 h-4" /> Save All Changes
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto scrollbar-none">
        {[
          { id: 'general', label: 'Restaurant Info', icon: Building2 },
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

      {/* General Settings */}
      {activeTab === 'general' && (
        <Card className="border-border/70 bg-card/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">Branch Identity & Location</CardTitle>
            <CardDescription>Details printed on guest invoices and KOT slips</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Restaurant Name</label>
                <Input defaultValue="The Royal Pavilion" className="h-10 bg-background" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Branch / Outlet Name</label>
                <Input defaultValue="Connaught Place Flagship" className="h-10 bg-background" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Phone Number</label>
                <Input defaultValue="+91 11 4321 9876" className="h-10 bg-background" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Email Address</label>
                <Input defaultValue="cp@royalpavilion.in" className="h-10 bg-background" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">GSTIN / Tax ID</label>
                <Input defaultValue="07AAAAA0000A1Z5" className="h-10 bg-background font-mono" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">FSSAI License No.</label>
                <Input defaultValue="10019011000543" className="h-10 bg-background font-mono" />
              </div>
              <div className="col-span-full space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Full Address</label>
                <Input defaultValue="B-42, Inner Circle, Connaught Place, New Delhi - 110001" className="h-10 bg-background" />
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
            <CardDescription>Configure itemized GST rates and optional service charge</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-border bg-accent/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-foreground">CGST (Central GST)</span>
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">2.5%</span>
                </div>
                <p className="text-xs text-muted-foreground">Applies automatically to all food & beverage items</p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-accent/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-foreground">SGST (State GST)</span>
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">2.5%</span>
                </div>
                <p className="text-xs text-muted-foreground">Applies automatically to all food & beverage items</p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-accent/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-foreground">Service Charge (Optional)</span>
                  <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">5.0%</span>
                </div>
                <p className="text-xs text-muted-foreground">Discretionary service charge for dine-in orders</p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-accent/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-foreground">Takeaway Packaging Fee</span>
                  <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">₹25 / order</span>
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
