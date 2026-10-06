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
    <nav className="flex-1 overflow-y-auto py-2 no-scrollbar space-y-px">
      {navItems.map((item: any, idx) => {
        if (item.type === 'divider') {
          return !isMobile && collapsed ? (
            <div key={idx} className="my-2 mx-3 border-t border-sidebar-border/30" />
          ) : (
            <div key={idx} className="px-4 pt-4 pb-1">
              <p className="text-[10px] font-semibold text-sidebar-foreground/35 uppercase tracking-widest">
                {item.label}
              </p>
            </div>
          );
        }

        const Icon = item.icon!;
        // null permissions = accessible to all authenticated users (e.g. Help page)
        const allowed = isPlatformSuperAdmin
          || item.permissions === null
          || !item.permissions
          || hasAnyPermission(...(item.permissions as any[]));
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
              'group flex items-center gap-2.5 mx-2 px-3 py-2 text-[12.5px] font-medium transition-all duration-100',
              !isMobile && collapsed ? 'justify-center px-2' : '',
              active
                ? isPlatformSuperAdmin
                  ? 'bg-indigo-500/12 text-indigo-300 border-l-2 border-l-indigo-400 pl-2.5'
                  : 'bg-primary/12 text-primary border-l-2 border-l-primary pl-2.5'
                : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground'
            )}
          >
            <Icon
              className={cn(
                'shrink-0 transition-colors',
                !isMobile && collapsed ? 'w-4.5 h-4.5' : 'w-3.5 h-3.5',
                active
                  ? (isPlatformSuperAdmin ? 'text-indigo-400' : 'text-primary')
                  : 'text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70'
              )}
            />
            {(isMobile || !collapsed) && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* ── DESKTOP DOCKED SIDEBAR ──────────────────────────────────────────── */}
      <aside
        className={cn(
          'hidden md:flex flex-col h-full border-r border-sidebar-border bg-sidebar transition-all duration-200 shrink-0 select-none',
          collapsed ? 'w-[56px]' : 'w-[220px]'
        )}
      >
        {/* Logo Header */}
        <div className={cn(
          'flex items-center gap-2.5 px-4 h-14 border-b border-sidebar-border/50 shrink-0',
          collapsed && 'justify-center px-2'
        )}>
          <div className={cn(
            'flex items-center justify-center shrink-0 overflow-hidden',
            collapsed ? 'w-7 h-7' : 'max-w-[140px]'
          )}>
            {isPlatformSuperAdmin ? (
              (platformDetails?.logoUrl || tenantLogo) ? (
                <img
                  src={platformDetails?.logoUrl || tenantLogo}
                  alt={platformName}
                  style={{
                    height: collapsed
                      ? '26px'
                      : `${Math.min(36, Math.max(18, Math.round((platformDetails?.logoHeight || 32) * ((platformDetails?.logoScale || 100) / 100))))}px`,
                    objectFit: 'contain',
                  }}
                  className="w-auto max-w-full"
                />
              ) : (
                <div className="w-7 h-7 bg-indigo-500/20 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-indigo-300" />
                </div>
              )
            ) : tenantLogo ? (
              <img
                src={tenantLogo}
                alt={tenantDisplayName}
                style={{
                  height: collapsed ? '26px' : '30px',
                  objectFit: 'contain',
                }}
                className="w-auto max-w-full"
              />
            ) : (
              <div className="w-7 h-7 bg-primary/20 flex items-center justify-center">
                <UtensilsCrossed className="w-4 h-4 text-primary" />
              </div>
            )}
          </div>
          {!collapsed && (
            <div className="overflow-hidden min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sidebar-foreground font-semibold text-xs tracking-tight truncate" title={isPlatformSuperAdmin ? platformName : tenantDisplayName}>
                  {isPlatformSuperAdmin ? platformName : tenantDisplayName}
                </p>
                {isPlatformSuperAdmin && (
                  <span className="px-1 py-px text-[9px] font-bold bg-indigo-500/15 text-indigo-400 shrink-0">
                    ROOT
                  </span>
                )}
              </div>
              <p className="text-sidebar-foreground/40 text-[10px] truncate" title={isPlatformSuperAdmin ? platformTagline : tenantTagline}>
                {isPlatformSuperAdmin ? platformTagline : tenantTagline}
              </p>
            </div>
          )}
        </div>

        {/* Desktop Nav Links */}
        {renderNavLinks(false)}

        {/* Footer / Toggle */}
        <div className="border-t border-sidebar-border/50 p-2">
          {isPlatformSuperAdmin && !collapsed && (
            <div className="px-3 py-2 mb-1 bg-indigo-500/8 border-l-2 border-indigo-500/40 text-[10.5px] text-indigo-300/80 flex items-center gap-2">
              <ShieldCheck className="w-3 h-3 text-indigo-400 shrink-0" />
              <span className="truncate">Multi-Tenant Root Access</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'w-full flex items-center justify-center p-2 text-sidebar-foreground/30 hover:text-sidebar-foreground/70 hover:bg-sidebar-accent/40 transition-all cursor-pointer text-xs',
              !collapsed && 'gap-2 justify-end px-3'
            )}
          >
            {collapsed ? <Menu className="w-3.5 h-3.5" /> : (
              <>
                <span className="font-medium">Collapse</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ── MOBILE SLIDE-IN DRAWER ───────────────────────────────────────────── */}
      {mobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 animate-in fade-in duration-150"
            onClick={() => setMobileSidebarOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-4/5 max-w-xs bg-sidebar border-r border-sidebar-border h-full flex flex-col shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {/* Mobile Header */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-sidebar-border/50">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex items-center justify-center shrink-0 overflow-hidden max-w-[140px]">
                  {isPlatformSuperAdmin ? (
                    (platformDetails?.logoUrl || tenantLogo)
                      ? <img
                          src={platformDetails?.logoUrl || tenantLogo}
                          alt={tenantDisplayName}
                          style={{
                            height: `${Math.min(36, Math.max(18, Math.round((platformDetails?.logoHeight || 32) * ((platformDetails?.logoScale || 100) / 100))))}px`,
                            objectFit: 'contain',
                          }}
                          className="w-auto max-w-full"
                        />
                      : <div className="w-7 h-7 bg-indigo-500/20 flex items-center justify-center"><Globe className="w-4 h-4 text-indigo-300" /></div>
                  ) : tenantLogo ? (
                    <img
                      src={tenantLogo}
                      alt={tenantDisplayName}
                      style={{ height: '30px', objectFit: 'contain' }}
                      className="w-auto max-w-full"
                    />
                  ) : (
                    <div className="w-7 h-7 bg-primary/20 flex items-center justify-center"><UtensilsCrossed className="w-4 h-4 text-primary" /></div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-sidebar-foreground truncate">{tenantDisplayName}</p>
                  <p className="text-[10px] text-sidebar-foreground/40 truncate">{tenantTagline}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className="w-7 h-7 flex items-center justify-center text-sidebar-foreground/50 hover:text-sidebar-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Nav Items */}
            {renderNavLinks(true)}

            {/* Mobile Footer */}
            <div className="p-3 border-t border-sidebar-border/50 text-[10px] text-sidebar-foreground/30 text-center font-mono">
              ROS v2.0
            </div>
          </div>
        </div>
      )}
    </>
  );
}
