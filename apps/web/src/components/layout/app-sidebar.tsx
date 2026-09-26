'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard, ShoppingCart, UtensilsCrossed, Grid3X3,
  CalendarDays, ChefHat, BookOpen, Package, Truck,
  Users, UserCheck, BarChart3, Settings, Menu, X,
  ChevronLeft, Wallet, ClipboardList, ArrowLeftRight,
  Radio, Tag, Sparkles, Star, QrCode, Globe, Printer,
  ShieldAlert, Gift, Flame, Smartphone, Car, Eye,
  Activity, Building2, Server, ShieldCheck,
  CreditCard, Database, Terminal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';

import { useUIStore } from '@/stores/ui.store';
import { getFilteredSidebarItems, isPlatformAdmin } from '@/lib/nav-permissions';

export function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { hasAnyPermission, user } = useAuthStore();
  const { mobileSidebarOpen, setMobileSidebarOpen } = useUIStore();
  const [collapsed, setCollapsed] = useState(false);

  const currentTab = searchParams ? searchParams.get('tab') : null;

  const isPlatformSuperAdmin = isPlatformAdmin(user);

  const { data: platformDetails } = useQuery({
    queryKey: ['superadmin-platform-details'],
    queryFn: async () => {
      try {
        const res = await apiGet<any>('/tenants/platform-details');
        return res;
      } catch {
        return { platformName: 'Restaurant OS (ROS)', tagline: 'SaaS Control Plane' };
      }
    },
    staleTime: 1000 * 60 * 2,
    enabled: isPlatformSuperAdmin,
  });

  const { data: currentTenant } = useQuery({
    queryKey: ['current-tenant'],
    queryFn: async () => {
      try {
        const res = await apiGet<any>('/tenants/current');
        return res;
      } catch {
        return null;
      }
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!user?.tenantId,
  });

  const platformName = platformDetails?.platformName || 'ROS Platform';
  const platformTagline = platformDetails?.tagline || 'SaaS Control Plane';

  const tenantLogo = currentTenant?.logoUrl;
  const tenantDisplayName = isPlatformSuperAdmin
    ? platformName
    : currentTenant?.name || user?.name || 'Restaurant OS';
  let tenantTagline = isPlatformSuperAdmin ? platformTagline : 'Culinary OS';
  try {
    const parsed = typeof currentTenant?.settings === 'string' ? JSON.parse(currentTenant.settings) : (currentTenant?.settings || {});
    if (!isPlatformSuperAdmin && parsed?.tagline) tenantTagline = parsed.tagline;
  } catch {}

  const navItems = getFilteredSidebarItems(user, hasAnyPermission);

  const renderNavLinks = (isMobile = false) => (
    <nav className="flex-1 overflow-y-auto py-3 no-scrollbar space-y-1">
      {navItems.map((item: any, idx) => {
        if (item.type === 'divider') {
          return !isMobile && collapsed ? (
            <div key={idx} className="my-2 mx-2 border-t border-sidebar-border" />
          ) : (
            <div key={idx} className="px-4 pt-4 pb-1">
              <p className="text-[10px] font-black text-sidebar-foreground/40 uppercase tracking-widest">
                {item.label}
              </p>
            </div>
          );
        }

        const Icon = item.icon!;
        const allowed = isPlatformSuperAdmin || !item.permission || hasAnyPermission(item.permission as any);
        if (!allowed) return null;

        let active = false;
        if (item.href?.includes('?tab=')) {
          const itemTab = item.href.split('?tab=')[1];
          active = pathname === '/super-admin' && currentTab === itemTab;
        } else if (item.href === '/super-admin') {
          active = pathname === '/super-admin' && (!currentTab || currentTab === 'overview');
        } else {
          active = pathname === item.href || (item.href !== '/dashboard' && item.href !== '/super-admin' && pathname.startsWith(item.href!));
        }

        return (
          <Link
            key={item.href + idx}
            href={item.href!}
            onClick={() => {
              if (isMobile) setMobileSidebarOpen(false);
            }}
            title={!isMobile && collapsed ? item.label : undefined}
            className={cn(
              'flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-95',
              !isMobile && collapsed ? 'justify-center px-2' : '',
              active
                ? isPlatformSuperAdmin
                  ? 'bg-indigo-500/20 text-indigo-400 font-bold shadow-xs'
                  : 'bg-primary text-primary-foreground font-black shadow-sm'
                : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground'
            )}
          >
            <Icon className={cn('shrink-0', !isMobile && collapsed ? 'w-5 h-5' : 'w-4.5 h-4.5', active && !isPlatformSuperAdmin && 'text-primary-foreground')} />
            {(isMobile || !collapsed) && <span className="truncate">{item.label}</span>}
            {active && (isMobile || !collapsed) && (
              <div className={cn('ml-auto w-2 h-2 rounded-full', isPlatformSuperAdmin ? 'bg-indigo-400' : 'bg-primary-foreground')} />
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* ── DESKTOP DOCKED SIDEBAR (Visible on md and larger) ──────────────────── */}
      <aside
        className={cn(
          'hidden md:flex flex-col h-full border-r border-sidebar-border bg-sidebar transition-all duration-300 shrink-0 select-none',
          collapsed ? 'w-[64px]' : 'w-[235px]'
        )}
      >
        {/* Logo Header */}
        <div className={cn(
          'flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0',
          collapsed && 'justify-center px-2',
          isPlatformSuperAdmin && 'bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-transparent'
        )}>
          <div className={cn(
            'w-9 h-9 flex items-center justify-center shrink-0 shadow-md overflow-hidden',
            isPlatformSuperAdmin
              ? 'rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-indigo-500/25'
              : tenantLogo
              ? 'rounded-full bg-card border-2 border-primary/40 p-0.5'
              : 'rounded-xl bg-primary'
          )}>
            {isPlatformSuperAdmin ? (
              tenantLogo ? (
                <img src={tenantLogo} alt={platformName} className="w-full h-full object-cover rounded-xl" />
              ) : (
                <Globe className="w-5 h-5 text-white" />
              )
            ) : tenantLogo ? (
              <img src={tenantLogo} alt={tenantDisplayName} className="w-full h-full object-cover rounded-full" />
            ) : (
              <UtensilsCrossed className="w-5 h-5 text-primary-foreground" />
            )}
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="flex items-center gap-1.5">
                <p className="text-sidebar-foreground font-black text-sm tracking-tight truncate" title={isPlatformSuperAdmin ? platformName : tenantDisplayName}>
                  {isPlatformSuperAdmin ? platformName : tenantDisplayName}
                </p>
                {isPlatformSuperAdmin && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    ROOT
                  </span>
                )}
              </div>
              <p className="text-sidebar-foreground/50 text-[10px] truncate font-medium" title={isPlatformSuperAdmin ? platformTagline : tenantTagline}>
                {isPlatformSuperAdmin ? platformTagline : tenantTagline}
              </p>
            </div>
          )}
        </div>

        {/* Desktop Nav Links */}
        {renderNavLinks(false)}

        {/* Footer / Toggle */}
        <div className="border-t border-sidebar-border p-2 space-y-1">
          {isPlatformSuperAdmin && !collapsed && (
            <div className="px-3 py-2 rounded-lg bg-indigo-950/40 border border-indigo-500/20 text-[11px] text-indigo-300 flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="truncate font-semibold">Multi-Tenant Root Access</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'w-full flex items-center justify-center p-2 rounded-lg text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all cursor-pointer',
              !collapsed && 'gap-2 justify-end px-3'
            )}
          >
            {collapsed ? <Menu className="w-4 h-4" /> : (
              <>
                <span className="text-xs font-semibold">Collapse</span>
                <ChevronLeft className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ── MOBILE SLIDE-IN DRAWER (Visible when opened on screens < md) ───────── */}
      {mobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop Blur */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setMobileSidebarOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-4/5 max-w-xs bg-sidebar border-r border-sidebar-border h-full flex flex-col shadow-2xl z-10 animate-in slide-in-from-left duration-300">
            {/* Mobile Header */}
            <div className="flex items-center justify-between px-4 h-16 border-b border-sidebar-border bg-card/40">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm overflow-hidden',
                  isPlatformSuperAdmin
                    ? 'bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500'
                    : 'bg-primary text-primary-foreground'
                )}>
                  {isPlatformSuperAdmin ? (
                    tenantLogo ? (
                      <img src={tenantLogo} alt={tenantDisplayName} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <Globe className="w-4 h-4 text-white" />
                    )
                  ) : tenantLogo ? (
                    <img src={tenantLogo} alt={tenantDisplayName} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <UtensilsCrossed className="w-4 h-4 text-primary-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-foreground truncate">{tenantDisplayName}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{tenantTagline}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className="w-8 h-8 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Nav Items */}
            {renderNavLinks(true)}

            {/* Mobile Footer */}
            <div className="p-3 border-t border-sidebar-border bg-sidebar text-xs text-sidebar-foreground/50 text-center font-mono">
              ROS • Touch Mobile POS v2.0
            </div>
          </div>
        </div>
      )}
    </>
  );
}
