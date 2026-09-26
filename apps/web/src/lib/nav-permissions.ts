import {
  LayoutDashboard, ShoppingCart, Grid3X3, ChefHat, BookOpen,
  Package, Truck, Users, UserCheck, BarChart3, Settings,
  ClipboardList, ArrowLeftRight, Radio, Tag, Sparkles, Star,
  QrCode, Globe, Printer, ShieldAlert, Gift, Flame, Smartphone,
  Car, Eye, Activity, Building2, CreditCard, Server, Wallet
} from 'lucide-react';

export interface NavItemConfig {
  href?: string;
  label: string;
  icon?: any;
  permissions?: string[] | null;
  type?: 'item' | 'divider';
}

export const ALL_RESTAURANT_NAV_SECTIONS: Array<
  | { type: 'divider'; label: string }
  | { href: string; label: string; icon: any; permissions: string[] | null }
> = [
  // Primary Operations
  { href: '/dashboard',     label: 'Dashboard',             icon: LayoutDashboard, permissions: ['reports:view'] },
  { href: '/tables',        label: 'Tables',                icon: Grid3X3,         permissions: ['tables:view'] },
  { href: '/pos',           label: 'Point of Sale (POS)',   icon: ShoppingCart,    permissions: ['orders:create'] },
  { href: '/kitchen',       label: 'Kitchen Display (KDS)', icon: ChefHat,         permissions: ['kitchen:view'] },
  { href: '/order-history', label: 'Order History',          icon: ClipboardList,   permissions: ['payments:view'] },
  { href: '/reservations',  label: 'Reservations',           icon: Users,           permissions: ['reservations:view'] },

  // Inventory & Kitchen
  { type: 'divider', label: 'INVENTORY & RECIPES' },
  { href: '/menu',          label: 'Menu Catalog',          icon: BookOpen,        permissions: ['menu:create'] },
  { href: '/inventory',     label: 'Stock & Inventory',     icon: Package,         permissions: ['inventory:view'] },
  { href: '/production',    label: 'Recipe Yields',          icon: Flame,           permissions: ['inventory:write-off'] },
  { href: '/procurement',   label: 'Procurement & Vendors', icon: Truck,           permissions: ['procurement:view'] },
  { href: '/transfers',     label: 'Stock Transfers',        icon: ArrowLeftRight,  permissions: ['inventory:transfer'] },

  // Finance & Management
  { type: 'divider', label: 'PEOPLE & FINANCE' },
  { href: '/customers',     label: 'Customers & CRM',       icon: Users,           permissions: ['customers:view'] },
  { href: '/staff',         label: 'Staff & HR',            icon: UserCheck,       permissions: ['staff:view'] },
  { href: '/expenses',      label: 'Expenses',              icon: Wallet,          permissions: ['expenses:view'] },
  { href: '/reports',       label: 'Reports & P&L',         icon: BarChart3,       permissions: ['reports:export'] },

  // Growth & Engagement
  { type: 'divider', label: 'GROWTH & REVENUE' },
  { href: '/ai-insights',   label: 'AI Insights',           icon: Sparkles,        permissions: ['loyalty:adjust'] },
  { href: '/marketing',     label: 'Marketing & Promos',    icon: Tag,             permissions: ['price:override'] },
  { href: '/gift-cards',    label: 'Gift Cards',            icon: Gift,            permissions: ['payments:refund'] },
  { href: '/feedback',      label: 'Guest Feedback',        icon: Star,            permissions: ['customers:edit'] },
  { href: '/integrations',  label: 'Aggregators Hub',       icon: Radio,           permissions: ['branches:view'] },

  // Operations & Tech
  { type: 'divider', label: 'NEXT-GEN OPERATIONS' },
  { href: '/kiosk',         label: 'Touch Kiosk',           icon: Smartphone,      permissions: ['orders:void'] },
  { href: '/franchise',     label: 'Franchise HQ',          icon: Building2,       permissions: ['branches:create'] },

  // Administration
  { type: 'divider', label: 'ADMINISTRATION' },
  { href: '/settings',      label: 'Settings',              icon: Settings,        permissions: ['settings:edit'] },
  { href: '/hardware',      label: 'Hardware & Printers',   icon: Printer,         permissions: ['cash:open'] },
  { href: '/audit-vault',   label: 'Audit Vault',           icon: ShieldAlert,     permissions: ['cash:close'] },
];

export const PLATFORM_SUPERADMIN_NAV_SECTIONS: Array<
  | { type: 'divider'; label: string }
  | { href: string; label: string; icon: any; permissions: null }
> = [
  { type: 'divider', label: 'PLATFORM SAAS CONTROL' },
  { href: '/super-admin',   label: 'Platform Overview',   icon: Globe,       permissions: null },
  { href: '/super-admin?tab=tenants', label: 'Tenant Directory', icon: Building2, permissions: null },
  { href: '/super-admin?tab=plans',   label: 'SaaS Plans & Tiers', icon: CreditCard, permissions: null },
  { href: '/super-admin?tab=system',  label: 'System & Infra',   icon: Server,      permissions: null },
  { type: 'divider', label: 'SECURITY & OBSERVABILITY' },
  { href: '/audit-vault',   label: 'Global Audit Logs',   icon: ShieldAlert, permissions: null },
  { href: '/hardware',      label: 'Global Edge Hardware', icon: Activity,    permissions: null },
  { href: '/settings',      label: 'Platform Policies',   icon: Settings,    permissions: null },
];

import type { Permission } from '@ros/shared-types';

export type PermissionChecker = (...p: (Permission | string | any)[]) => boolean;

/** Check if user is platform level super admin */
export function isPlatformAdmin(user: any): boolean {
  return (
    user?.email?.toLowerCase() === 'superadmin@ros.com' ||
    user?.tenantId === 'tenant-platform'
  );
}

/** Check if user is restaurant owner / full administrator */
export function isTenantAdmin(user: any): boolean {
  if (isPlatformAdmin(user)) return true;
  return user?.roles?.some((r: string) => ['OWNER'].includes(r));
}

/** Check if a specific route is accessible by the user */
export function isRouteAccessible(
  pathname: string,
  user: any,
  hasAnyPermission: PermissionChecker
): boolean {
  if (!user) return false;
  if (isPlatformAdmin(user)) return true;
  if (isTenantAdmin(user)) return true;

  // Platform super-admin exclusive routes
  if (pathname.startsWith('/super-admin')) {
    return isPlatformAdmin(user);
  }

  // Find matching nav item
  const cleanPath = pathname.split('?')[0];
  const item = ALL_RESTAURANT_NAV_SECTIONS.find(
    (n): n is { href: string; label: string; icon: any; permissions: string[] | null } =>
      'href' in n && (n.href === cleanPath || cleanPath.startsWith(n.href + '/'))
  );

  // If route is /orders, treat like /tables
  if (cleanPath === '/orders') {
    return hasAnyPermission('tables:view', 'tables:edit', 'orders:view');
  }

  if (!item || !('permissions' in item)) {
    // If not found in known list, allow only if user has any permission
    return false;
  }

  if (!item.permissions || item.permissions.length === 0) {
    return true;
  }

  return hasAnyPermission(...(item.permissions as any[]));
}

/** Compute the best default landing page for a user role upon login / reload */
export function getDefaultLandingRoute(
  user: any,
  hasAnyPermission: PermissionChecker
): string {
  if (!user) return '/login';
  if (isPlatformAdmin(user)) return '/super-admin';

  // If user has tables access (or is tenant admin who has access to all restaurant operations including tables), bring them directly to Tables tab
  if (hasAnyPermission('tables:view', 'tables:edit') || isTenantAdmin(user)) {
    return '/tables';
  }

  // Priority order for remaining staff roles based on granted permissions
  if (hasAnyPermission('orders:create')) return '/pos';
  if (hasAnyPermission('tables:view', 'tables:edit')) return '/tables';
  if (hasAnyPermission('kitchen:view', 'kitchen:update')) return '/kitchen';
  if (hasAnyPermission('orders:view', 'payments:view')) return '/order-history';
  if (hasAnyPermission('inventory:view')) return '/inventory';
  if (hasAnyPermission('menu:create', 'menu:edit')) return '/menu';
  if (hasAnyPermission('reservations:view')) return '/reservations';
  if (hasAnyPermission('procurement:view')) return '/procurement';
  if (hasAnyPermission('customers:view')) return '/customers';
  if (hasAnyPermission('expenses:view')) return '/expenses';
  if (hasAnyPermission('reports:view')) return '/reports';
  if (hasAnyPermission('staff:view')) return '/staff';
  if (hasAnyPermission('settings:view')) return '/settings';

  return '/pos';
}

/** Get filtered sidebar nav items and dividers (excluding empty sections) */
export function getFilteredSidebarItems(
  user: any,
  hasAnyPermission: PermissionChecker
) {
  if (isPlatformAdmin(user)) {
    return PLATFORM_SUPERADMIN_NAV_SECTIONS;
  }

  const isFullAdmin = isTenantAdmin(user);

  // Filter allowed items
  const allowedItems: typeof ALL_RESTAURANT_NAV_SECTIONS = [];
  let pendingDivider: { type: 'divider'; label: string } | null = null;

  for (const item of ALL_RESTAURANT_NAV_SECTIONS) {
    if ('type' in item && item.type === 'divider') {
      pendingDivider = item;
      continue;
    }

    const isAllowed =
      isFullAdmin ||
      !('permissions' in item) ||
      !item.permissions ||
      item.permissions.length === 0 ||
      hasAnyPermission(...(item.permissions as any[]));

    if (isAllowed) {
      if (pendingDivider) {
        allowedItems.push(pendingDivider);
        pendingDivider = null;
      }
      allowedItems.push(item);
    }
  }

  return allowedItems;
}

/** Compute the bottom mobile icon tray items (up to 4 items) based purely on user permissions */
export function getMobileBottomNavItems(
  user: any,
  hasAnyPermission: PermissionChecker
) {
  if (isPlatformAdmin(user)) {
    return [
      { href: '/super-admin', label: 'Platform', icon: Globe },
      { href: '/super-admin?tab=tenants', label: 'Tenants', icon: Building2 },
      { href: '/super-admin?tab=plans', label: 'Plans', icon: CreditCard },
      { href: '/audit-vault', label: 'Audit', icon: ShieldAlert },
    ];
  }

  const isFullAdmin = isTenantAdmin(user);

  const candidates: Array<{ href: string; label: string; icon: any; permissions: string[] }> = [
    { href: '/tables',        label: 'Tables',    icon: Grid3X3,      permissions: ['tables:view'] },
    { href: '/pos',           label: 'POS',       icon: ShoppingCart, permissions: ['orders:create'] },
    { href: '/kitchen',       label: 'Kitchen',   icon: ChefHat,      permissions: ['kitchen:view'] },
    { href: '/order-history', label: 'History',   icon: ClipboardList,permissions: ['payments:view'] },
    { href: '/menu',          label: 'Menu',      icon: BookOpen,     permissions: ['menu:view'] },
    { href: '/inventory',     label: 'Inventory', icon: Package,      permissions: ['inventory:view'] },
    { href: '/reservations',  label: 'Bookings',  icon: Users,        permissions: ['reservations:view'] },
    { href: '/expenses',      label: 'Expenses',  icon: Wallet,       permissions: ['expenses:view'] },
    { href: '/reports',       label: 'Reports',   icon: BarChart3,    permissions: ['reports:view'] },
    { href: '/dashboard',     label: 'Dashboard', icon: LayoutDashboard, permissions: ['reports:view'] },
    { href: '/staff',         label: 'Staff',     icon: UserCheck,    permissions: ['staff:view'] },
    { href: '/settings',      label: 'Settings',  icon: Settings,     permissions: ['settings:view'] },
  ];

  const allowed = candidates.filter((c) => {
    if (isFullAdmin) return true;
    return hasAnyPermission(...c.permissions);
  });

  if (isFullAdmin) {
    // Standard 4 items for restaurant owners/admins
    return [
      { href: '/tables', label: 'Tables', icon: Grid3X3 },
      { href: '/pos', label: 'POS', icon: ShoppingCart },
      { href: '/kitchen', label: 'Kitchen', icon: ChefHat },
      { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
    ];
  }

  // Return up to 4 granted features for the specific user role
  return allowed.slice(0, 4);
}
