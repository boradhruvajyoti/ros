import {
  LayoutDashboard, ShoppingCart, Grid3X3, ChefHat, BookOpen,
  Package, Truck, Users, UserCheck, BarChart3, Settings,
  ClipboardList, ArrowLeftRight, Radio, Tag, Sparkles, Star,
  Globe, Printer, ShieldAlert, Gift, Flame, Smartphone,
  Activity, Building2, CreditCard, Server, Wallet, Zap,
  ShoppingBag
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
  // Operations
  { type: 'divider', label: 'OPERATIONS' },
  { href: '/dashboard',     label: 'Dashboard',             icon: LayoutDashboard, permissions: ['reports:view'] },
  { href: '/orders',        label: 'Current Orders',        icon: ShoppingBag,     permissions: ['orders:create'] },
  { href: '/tables',        label: 'Tables',                icon: Grid3X3,         permissions: ['tables:view'] },
  { href: '/kitchen',       label: 'Kitchen Display (KDS)', icon: ChefHat,         permissions: ['kitchen:view'] },
  { href: '/order-history', label: 'Order History',         icon: ClipboardList,   permissions: ['payments:view'] },
  { href: '/reservations',  label: 'Reservations',          icon: Users,           permissions: ['reservations:view'] },

  // Inventory & Catalog
  { type: 'divider', label: 'INVENTORY & MENU' },
  { href: '/menu',          label: 'Menu Catalog',          icon: BookOpen,        permissions: ['menu:create'] },
  { href: '/inventory',     label: 'Stock Inventory',       icon: Package,         permissions: ['inventory:view'] },
  { href: '/production',    label: 'Recipe Yields',         icon: Flame,           permissions: ['inventory:write-off'] },
  { href: '/procurement',   label: 'Procurement & Vendors', icon: Truck,           permissions: ['procurement:view'] },
  { href: '/transfers',     label: 'Stock Transfers',       icon: ArrowLeftRight,  permissions: ['inventory:transfer'] },

  // Finance & Management
  { type: 'divider', label: 'FINANCE & TEAM' },
  { href: '/customers',     label: 'Customers & CRM',       icon: Users,           permissions: ['customers:view'] },
  { href: '/staff',         label: 'Staff & Team',          icon: UserCheck,       permissions: ['staff:view'] },
  { href: '/expenses',      label: 'Expenses',              icon: Wallet,          permissions: ['expenses:view'] },
  { href: '/reports',       label: 'Sales & Reports',       icon: BarChart3,       permissions: ['reports:export'] },

  // Growth & Promos
  { type: 'divider', label: 'MARKETING & GROWTH' },
  { href: '/ai-insights',   label: 'AI Insights',           icon: Sparkles,        permissions: ['loyalty:adjust'] },
  { href: '/marketing',     label: 'Promos & Coupons',      icon: Tag,             permissions: ['price:override'] },
  { href: '/gift-cards',    label: 'Gift Cards',            icon: Gift,            permissions: ['payments:refund'] },
  { href: '/feedback',      label: 'Guest Feedback',        icon: Star,            permissions: ['customers:edit'] },
  { href: '/integrations',  label: 'Aggregators Hub',       icon: Radio,           permissions: ['branches:view'] },

  // System & Administration
  { type: 'divider', label: 'SETTINGS & SYSTEM' },
  { href: '/kiosk',         label: 'Self-Serve Kiosk',      icon: Smartphone,      permissions: ['orders:void'] },
  { href: '/franchise',     label: 'Franchise HQ',          icon: Building2,       permissions: ['branches:create'] },
  { href: '/settings',      label: 'Settings',              icon: Settings,        permissions: ['settings:edit'] },
  { href: '/hardware',      label: 'Hardware & Printers',   icon: Printer,         permissions: ['cash:open'] },
  { href: '/audit-vault',   label: 'Audit Vault',           icon: ShieldAlert,     permissions: ['cash:close'] },
];

export const PLATFORM_SUPERADMIN_NAV_SECTIONS: Array<
  | { type: 'divider'; label: string }
  | { href: string; label: string; icon: any; permissions: null }
> = [
  { type: 'divider', label: 'PLATFORM SAAS CONTROL' },
  { href: '/super-admin',                label: 'Platform Overview',    icon: Globe,       permissions: null },
  { href: '/super-admin?tab=tenants',    label: 'Tenant Directory',     icon: Building2,   permissions: null },
  { href: '/super-admin?tab=plans',      label: 'SaaS Plans & Tiers',   icon: CreditCard,  permissions: null },
  { href: '/super-admin?tab=automation', label: 'Automation',           icon: Zap,         permissions: null },
  { href: '/super-admin?tab=system',     label: 'System & Infra',       icon: Server,      permissions: null },
  { type: 'divider', label: 'SECURITY & OBSERVABILITY' },
  { href: '/audit-vault',                label: 'Global Audit Logs',    icon: ShieldAlert, permissions: null },
  { href: '/hardware',                   label: 'Global Edge Hardware', icon: Activity,    permissions: null },
  { href: '/settings',                   label: 'Platform Settings',    icon: Settings,    permissions: null },
];

import type { Permission } from '@ros/shared-types';

export type PermissionChecker = (...p: (Permission | string | any)[]) => boolean;

// =============================================================================
// Submodule ID map — module href -> list of submodule IDs from FEATURE_MODULES
// Drives the sub:<id> permission check for staff users.
// If a staff user has ANY 'sub:<id>' from a module's list, they can access that module.
// =============================================================================
export const MODULE_SUBMODULE_MAP: Record<string, string[]> = {
  '/dashboard':     ['dashboard_revenue', 'dashboard_activity', 'dashboard_velocity', 'dashboard_actions'],
  '/orders':        ['orders_live_queue', 'orders_kot_progress', 'orders_status_bump', 'orders_quick_settle'],
  '/tables':        ['tables_floor_map', 'tables_occupancy', 'tables_active_kots', 'tables_transfer'],
  '/pos':           ['pos_touch_entry', 'pos_modifiers', 'pos_split_pay', 'pos_discounts'],
  '/kitchen':       ['kds_cook_station', 'kds_runner_station', 'kds_archive_undo', 'kds_routing'],
  '/order-history': ['history_ledger', 'history_reprint', 'history_void_audit', 'history_filter'],
  '/reservations':  ['res_calendar', 'res_booking_mgmt', 'res_checkin', 'res_alerts'],
  '/menu':          ['menu_dish_master', 'menu_categories', 'menu_variants', 'menu_modifiers', 'menu_86_toggle'],
  '/inventory':     ['inv_live_balance', 'inv_low_alerts', 'inv_adjustments', 'inv_reconciliation'],
  '/production':    ['prod_bom', 'prod_batch_prep', 'prod_yield_tracking', 'prod_auto_deduct'],
  '/procurement':   ['proc_vendors', 'proc_po', 'proc_grn', 'proc_invoices'],
  '/transfers':     ['transfer_requisitions', 'transfer_dispatch', 'transfer_receive'],
  '/customers':     ['cust_directory', 'cust_history', 'cust_loyalty', 'cust_segments'],
  '/staff':         ['staff_roster', 'staff_attendance', 'staff_rbac', 'staff_telegram'],
  '/expenses':      ['exp_daily_entry', 'exp_petty_cash', 'exp_categories', 'exp_approvals'],
  '/reports':       ['rep_sales_summary', 'rep_item_performance', 'rep_tax_gst', 'rep_pnl_statement'],
  '/ai-insights':   ['ai_revenue_forecast', 'ai_wastage_alerts', 'ai_menu_engineering', 'ai_staffing_recom'],
  '/marketing':     ['mktg_coupons', 'mktg_happy_hours', 'mktg_broadcasts', 'mktg_roi_tracker'],
  '/gift-cards':    ['gc_issuance', 'gc_balance_topup', 'gc_redemption', 'gc_liability'],
  '/feedback':      ['fb_qr_surveys', 'fb_rating_dashboard', 'fb_instant_alerts', 'fb_dish_quality'],
  '/integrations':  ['int_aggregators', 'int_whatsapp', 'int_riders', 'int_webhooks'],
  '/kiosk':         ['kiosk_touch_ui', 'kiosk_showcase', 'kiosk_self_checkout', 'kiosk_device_lock'],
  '/franchise':     ['fran_overview', 'fran_royalties', 'fran_central_menu', 'fran_benchmarks'],
  '/settings':      ['set_profile', 'set_tax_service', 'set_hours_shifts', 'set_gateways'],
  '/hardware':      ['hw_bill_printers', 'hw_kot_printers', 'hw_cash_drawers', 'hw_scanners'],
  '/audit-vault':   ['audit_login_ledger', 'audit_overrides', 'audit_reprints', 'audit_security_log'],
};

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

/**
 * Check if a staff user has access to a module via either:
 * 1. A module-level permission (e.g. 'tables:view') — legacy direct permission
 * 2. At least one submodule permission 'sub:<submoduleId>' granted for this module
 *
 * Admins (OWNER / platform admin) always return true.
 */
export function hasModuleOrSubmoduleAccess(
  href: string,
  modulePermissions: string[] | null,
  user: any,
  hasAnyPermission: PermissionChecker
): boolean {
  if (!user) return false;
  if (isPlatformAdmin(user) || isTenantAdmin(user)) return true;

  const userPerms: string[] = user?.permissions || [];
  const hasGranular = userPerms.some((p) => p.startsWith('sub:') || p.startsWith('module:') || p.startsWith('mod:'));

  if (hasGranular) {
    const modKey = href.split('?')[0].replace(/^\//, '');
    const isExplicitMod = userPerms.includes(`module:${modKey}`) || userPerms.includes(`mod:${modKey}`);
    const subIds = MODULE_SUBMODULE_MAP[href] || [];
    const hasAnySub = subIds.some((sid) => userPerms.includes(`sub:${sid}`) || userPerms.includes(sid));
    return isExplicitMod || hasAnySub;
  }

  // Check module-level permissions first (legacy/direct assignment)
  if (modulePermissions && modulePermissions.length > 0) {
    if (hasAnyPermission(...(modulePermissions as any[]))) return true;
  }

  // Check if any submodule of this module is granted via sub: prefix
  const subIds = MODULE_SUBMODULE_MAP[href] || [];
  if (subIds.some((sid) => userPerms.includes(`sub:${sid}`) || userPerms.includes(sid))) return true;

  return false;
}

/**
 * For a given submodule id, check if the staff user has explicit access.
 * - Admins always have access.
 * - Staff: must have 'sub:<submoduleId>' in their permissions.
 */
export function hasSubmoduleAccess(submoduleId: string, user: any): boolean {
  if (!user) return false;
  if (isPlatformAdmin(user) || isTenantAdmin(user)) return true;
  const userPerms: string[] = user?.permissions || [];
  return userPerms.includes(`sub:${submoduleId}`) || userPerms.includes(submoduleId);
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

  const cleanPath = pathname.split('?')[0];

  // /orders special case
  if (cleanPath === '/orders') {
    return hasModuleOrSubmoduleAccess('/orders', ['tables:view', 'tables:edit', 'orders:view'], user, hasAnyPermission);
  }

  // Find matching nav item
  const item = ALL_RESTAURANT_NAV_SECTIONS.find(
    (n): n is { href: string; label: string; icon: any; permissions: string[] | null } =>
      'href' in n && (n.href === cleanPath || cleanPath.startsWith(n.href + '/'))
  );

  if (!item || !('permissions' in item)) return false;

  return hasModuleOrSubmoduleAccess(item.href, item.permissions, user, hasAnyPermission);
}

/** Compute the best default landing page for a user role upon login / reload */
export function getDefaultLandingRoute(
  user: any,
  hasAnyPermission: PermissionChecker
): string {
  if (!user) return '/login';
  if (isPlatformAdmin(user)) return '/super-admin';

  if (hasAnyPermission('tables:view', 'tables:edit') || isTenantAdmin(user)) {
    return '/tables';
  }

  if (hasAnyPermission('orders:create', 'orders:view')) return '/orders';
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

  // Fallback: scan sub: permissions — navigate to first matching module
  const userPerms: string[] = user?.permissions || [];
  const routePriority = [
    '/tables', '/orders', '/kitchen', '/order-history',
    '/menu', '/inventory', '/reservations', '/procurement', '/customers',
    '/expenses', '/reports', '/staff', '/settings', '/dashboard',
  ];
  for (const href of routePriority) {
    const subIds = MODULE_SUBMODULE_MAP[href] || [];
    if (subIds.some((sid) => userPerms.includes(`sub:${sid}`))) return href;
  }

  return '/tables';
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
  const allowedItems: typeof ALL_RESTAURANT_NAV_SECTIONS = [];
  let pendingDivider: { type: 'divider'; label: string } | null = null;

  for (const item of ALL_RESTAURANT_NAV_SECTIONS) {
    if ('type' in item && item.type === 'divider') {
      pendingDivider = item;
      continue;
    }

    const navItem = item as { href: string; label: string; icon: any; permissions: string[] | null };
    const isAllowed =
      isFullAdmin ||
      !navItem.permissions ||
      navItem.permissions.length === 0 ||
      hasModuleOrSubmoduleAccess(navItem.href, navItem.permissions, user, hasAnyPermission);

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

/** Compute the bottom mobile icon tray items (up to 4 items) based on user permissions */
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

  if (isFullAdmin) {
    return [
      { href: '/tables', label: 'Tables', icon: Grid3X3 },
      { href: '/orders', label: 'Current', icon: ShoppingBag },
      { href: '/kitchen', label: 'Kitchen', icon: ChefHat },
      { href: '/order-history', label: 'History', icon: ClipboardList },
    ];
  }

  const candidates: Array<{ href: string; label: string; icon: any; permissions: string[] }> = [
    { href: '/tables',        label: 'Tables',    icon: Grid3X3,         permissions: ['tables:view'] },
    { href: '/orders',        label: 'Current',   icon: ShoppingBag,     permissions: ['orders:create'] },
    { href: '/kitchen',       label: 'Kitchen',   icon: ChefHat,         permissions: ['kitchen:view'] },
    { href: '/order-history', label: 'History',   icon: ClipboardList,   permissions: ['payments:view'] },
    { href: '/menu',          label: 'Menu',      icon: BookOpen,        permissions: ['menu:view'] },
    { href: '/inventory',     label: 'Inventory', icon: Package,         permissions: ['inventory:view'] },
    { href: '/reservations',  label: 'Bookings',  icon: Users,           permissions: ['reservations:view'] },
    { href: '/expenses',      label: 'Expenses',  icon: Wallet,          permissions: ['expenses:view'] },
    { href: '/reports',       label: 'Reports',   icon: BarChart3,       permissions: ['reports:view'] },
    { href: '/dashboard',     label: 'Dashboard', icon: LayoutDashboard, permissions: ['reports:view'] },
    { href: '/staff',         label: 'Staff',     icon: UserCheck,       permissions: ['staff:view'] },
    { href: '/settings',      label: 'Settings',  icon: Settings,        permissions: ['settings:view'] },
  ];

  const allowed = candidates.filter((c) =>
    hasModuleOrSubmoduleAccess(c.href, c.permissions, user, hasAnyPermission)
  );

  return allowed.slice(0, 4);
}
