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
  Activity, Building2, PhoneCall, TrendingUp, Wine, Bike, Leaf,
  Bot, Camera, FileCheck2, Calendar, Server, ShieldCheck,
  CreditCard, Database, Terminal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';

// Navigation for Restaurant Tenants
const restaurantNavItems = [
  { href: '/dashboard',     label: 'Dashboard',     icon: LayoutDashboard,  permission: null },
  { href: '/pos',           label: 'POS',            icon: ShoppingCart,     permission: 'orders:create' },
  { href: '/orders',        label: 'Orders',         icon: ClipboardList,    permission: 'orders:view' },
  { href: '/tables',        label: 'Tables',         icon: Grid3X3,          permission: 'tables:view' },
  { href: '/reservations',  label: 'Reservations',   icon: CalendarDays,     permission: 'reservations:view' },
  { href: '/kitchen',       label: 'Kitchen Display', icon: ChefHat,          permission: 'kitchen:view' },
  { href: '/qr-order',      label: 'QR Ordering',   icon: QrCode,           permission: null },
  { type: 'divider', label: 'INVENTORY & KITCHEN' },
  { href: '/menu',          label: 'Menu',           icon: BookOpen,         permission: 'menu:view' },
  { href: '/inventory',     label: 'Inventory',      icon: Package,          permission: 'inventory:view' },
  { href: '/production',    label: 'Recipe Yields',  icon: Flame,            permission: 'inventory:view' },
  { href: '/procurement',   label: 'Procurement',    icon: Truck,            permission: 'procurement:view' },
  { href: '/transfers',     label: 'Stock Transfers', icon: ArrowLeftRight,  permission: 'inventory:view' },
  { type: 'divider', label: 'GROWTH & REVENUE' },
  { href: '/ai-insights',   label: 'AI Insights',    icon: Sparkles,         permission: null },
  { href: '/marketing',     label: 'Marketing & Promos', icon: Tag,          permission: 'reports:view' },
  { href: '/gift-cards',    label: 'Gift Cards',     icon: Gift,             permission: 'customers:view' },
  { href: '/integrations',  label: 'Aggregators Hub', icon: Radio,          permission: 'settings:view' },
  { href: '/feedback',      label: 'Guest Feedback',  icon: Star,           permission: 'customers:view' },
  { type: 'divider', label: 'PEOPLE & FINANCE' },
  { href: '/customers',     label: 'Customers CRM',  icon: Users,            permission: 'customers:view' },
  { href: '/staff',         label: 'Staff & HR',     icon: UserCheck,        permission: 'staff:view' },
  { href: '/expenses',      label: 'Expenses',       icon: Wallet,           permission: 'expenses:view' },
  { href: '/reports',       label: 'Reports & P&L',  icon: BarChart3,        permission: 'reports:view' },
  { type: 'divider', label: 'NEXT-GEN & OPERATIONS' },
  { href: '/kiosk',         label: 'Touch Kiosk',    icon: Smartphone,       permission: null },
  { href: '/drive-thru',    label: 'Drive-Thru SOS', icon: Car,              permission: 'orders:view' },
  { href: '/ai-expediter',  label: 'AI Expediter',   icon: Eye,              permission: 'kitchen:view' },
  { href: '/iot-sensors',   label: 'IoT HACCP Probes', icon: Activity,       permission: 'settings:view' },
  { href: '/franchise',     label: 'Franchise HQ',   icon: Building2,        permission: null },
  { type: 'divider', label: 'AI & ENTERPRISE EXPANSION' },
  { href: '/voice-agent',   label: 'AI Phone Voice', icon: PhoneCall,        permission: null },
  { href: '/dynamic-pricing', label: 'Dynamic Surge & BCG', icon: TrendingUp, permission: 'reports:view' },
  { href: '/catering',      label: 'Banquets & BEO', icon: Wine,             permission: 'orders:view' },
  { href: '/dark-kitchen',  label: 'Dark Kitchen Hub', icon: Bike,           permission: 'orders:view' },
  { href: '/sustainability', label: 'ESG Sustainability', icon: Leaf,        permission: 'settings:view' },
  { type: 'divider', label: 'ROBOTICS & LUXURY AUTOMATION' },
  { href: '/robotics',      label: 'Autonomous Robots', icon: Bot,           permission: 'kitchen:view' },
  { href: '/cellar',        label: 'Sommelier Wine Cellar', icon: Wine,      permission: 'inventory:view' },
  { href: '/biometrics-vip', label: 'VIP Biometrics Host', icon: Camera,     permission: 'customers:view' },
  { href: '/labor-scheduling', label: 'AI Labor Scheduler', icon: Calendar,  permission: 'staff:view' },
  { href: '/tax-eway',      label: 'GST E-Way & E-Invoice', icon: FileCheck2, permission: 'expenses:view' },
  { type: 'divider', label: 'ADMINISTRATION' },
  { href: '/settings',      label: 'Settings',       icon: Settings,         permission: 'settings:view' },
  { href: '/hardware',      label: 'Hardware & Printers', icon: Printer,     permission: 'settings:view' },
  { href: '/audit-vault',   label: 'Audit Vault',    icon: ShieldAlert,      permission: 'settings:view' },
];

// Dedicated Navigation for Waiters
const waiterNavItems = [
  { type: 'divider', label: 'WAITER SERVICE' },
  { href: '/tables',   label: '🍽️ Dining Tables', icon: Grid3X3, permission: null },
  { href: '/pos',      label: '🛒 Take Order (POS)', icon: ShoppingCart, permission: null },
  { href: '/orders',   label: '📋 Active Orders', icon: ClipboardList, permission: null },
  { href: '/kitchen',  label: '🛎️ Kitchen Queue', icon: ChefHat, permission: null },
];

// Dedicated Navigation for Kitchen Cooks
const kitchenNavItems = [
  { type: 'divider', label: 'KITCHEN OPS' },
  { href: '/kitchen',   label: '👨‍🍳 Kitchen Display (KDS)', icon: ChefHat, permission: null },
  { href: '/inventory', label: '📦 Stock & Ingredients', icon: Package, permission: null },
  { href: '/orders',    label: '📋 Orders Feed', icon: ClipboardList, permission: null },
];

// Dedicated Navigation for Cashiers
const cashierNavItems = [
  { type: 'divider', label: 'FAST BILLING & CASH' },
  { href: '/pos',      label: '💳 Fast Billing (POS)', icon: ShoppingCart, permission: null },
  { href: '/tables',   label: '🍽️ Dining Tables', icon: Grid3X3, permission: null },
  { href: '/orders',   label: '📋 Orders & Bills', icon: ClipboardList, permission: null },
  { href: '/expenses', label: '💰 Cash & Expenses', icon: Wallet, permission: null },
];

// Dedicated Navigation for Platform Super-Admin
const platformSuperAdminNavItems = [
  { type: 'divider', label: 'PLATFORM SAAS CONTROL' },
  { href: '/super-admin',   label: 'Platform Overview', icon: Globe,          permission: null },
  { href: '/super-admin?tab=tenants', label: 'Tenant Directory', icon: Building2, permission: null },
  { href: '/super-admin?tab=plans',   label: 'SaaS Plans & Tiers', icon: CreditCard, permission: null },
  { href: '/super-admin?tab=system',  label: 'System & Infra', icon: Server,     permission: null },
  { type: 'divider', label: 'SECURITY & OBSERVABILITY' },
  { href: '/audit-vault',   label: 'Global Audit Logs', icon: ShieldAlert,    permission: null },
  { href: '/hardware',      label: 'Global Edge Hardware', icon: Activity,    permission: null },
  { href: '/settings',      label: 'Platform Policies', icon: Settings,       permission: null },
];

export function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { hasAnyPermission, user } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  const currentTab = searchParams ? searchParams.get('tab') : null;

  // Check if current user is the Platform Super-Administrator (strictly superadmin@ros.com or tenant-platform)
  const isPlatformSuperAdmin =
    user?.email?.toLowerCase() === 'superadmin@ros.com' ||
    user?.tenantId === 'tenant-platform';

  const isOwnerOrAdmin = user?.roles?.some((r) => ['OWNER', 'ADMINISTRATOR', 'GENERAL_MANAGER', 'BRANCH_MANAGER'].includes(r));
  const isWaiterOnly = !isOwnerOrAdmin && user?.roles?.includes('WAITER');
  const isKitchenOnly = !isOwnerOrAdmin && user?.roles?.some((r) => ['CHEF', 'KITCHEN_STAFF'].includes(r));
  const isCashierOnly = !isOwnerOrAdmin && user?.roles?.includes('CASHIER');

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
    enabled: !isPlatformSuperAdmin && !!user?.tenantId,
  });

  const platformName = platformDetails?.platformName || 'ROS Platform';
  const platformTagline = platformDetails?.tagline || 'SaaS Control Plane';

  const tenantLogo = currentTenant?.logoUrl;
  const tenantDisplayName = currentTenant?.name || user?.name || 'Restaurant OS';
  let tenantTagline = 'Culinary OS';
  try {
    const parsed = typeof currentTenant?.settings === 'string' ? JSON.parse(currentTenant.settings) : (currentTenant?.settings || {});
    if (parsed?.tagline) tenantTagline = parsed.tagline;
  } catch {}

  let navItems = restaurantNavItems;
  if (isPlatformSuperAdmin) {
    navItems = platformSuperAdminNavItems;
  } else if (isWaiterOnly) {
    navItems = waiterNavItems;
  } else if (isKitchenOnly) {
    navItems = kitchenNavItems;
  } else if (isCashierOnly) {
    navItems = cashierNavItems;
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-full border-r border-sidebar-border bg-sidebar transition-all duration-300',
        collapsed ? 'w-[60px]' : 'w-[230px]'
      )}
    >
      {/* Logo Header */}
      <div className={cn(
        'flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0',
        collapsed && 'justify-center px-2',
        isPlatformSuperAdmin && 'bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-transparent'
      )}>
        <div className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md overflow-hidden',
          isPlatformSuperAdmin
            ? 'bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-indigo-500/25'
            : tenantLogo
            ? 'bg-card border border-border/80 p-0.5'
            : 'bg-primary'
        )}>
          {isPlatformSuperAdmin ? (
            <Globe className="w-5 h-5 text-white" />
          ) : tenantLogo ? (
            <img src={tenantLogo} alt={tenantDisplayName} className="w-full h-full object-contain rounded-lg" />
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

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto py-3 no-scrollbar space-y-0.5">
        {navItems.map((item: any, idx) => {
          if (item.type === 'divider') {
            return collapsed ? (
              <div key={idx} className="my-2 mx-2 border-t border-sidebar-border" />
            ) : (
              <div key={idx} className="px-4 pt-4 pb-1">
                <p className="text-[10px] font-bold text-sidebar-foreground/35 uppercase tracking-widest">
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
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 mx-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                collapsed ? 'justify-center px-2' : '',
                active
                  ? isPlatformSuperAdmin
                    ? 'bg-indigo-500/15 text-indigo-400 font-semibold shadow-sm'
                    : 'bg-sidebar-primary/15 text-sidebar-primary font-semibold'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
            >
              <Icon className={cn('shrink-0', collapsed ? 'w-5 h-5' : 'w-4 h-4', active && isPlatformSuperAdmin && 'text-indigo-400')} />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {active && !collapsed && (
                <div className={cn('ml-auto w-1.5 h-1.5 rounded-full', isPlatformSuperAdmin ? 'bg-indigo-400' : 'bg-sidebar-primary')} />
              )}
            </Link>
          );
        })}
      </nav>

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
            'w-full flex items-center justify-center p-2 rounded-lg text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all',
            !collapsed && 'gap-2 justify-end px-3'
          )}
        >
          {collapsed ? <Menu className="w-4 h-4" /> : (
            <>
              <span className="text-xs">Collapse</span>
              <ChevronLeft className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
