'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, ShoppingCart, UtensilsCrossed, Grid3X3,
  CalendarDays, ChefHat, BookOpen, Package, Truck,
  Users, UserCheck, BarChart3, Settings, Menu, X,
  ChevronLeft, Wallet, ClipboardList, ArrowLeftRight,
  Radio, Tag, Sparkles, Star, QrCode, Globe, Printer,
  ShieldAlert, Gift, Flame, Smartphone, Car, Eye,
  Activity, Building2, PhoneCall, TrendingUp, Wine, Bike, Leaf,
  Bot, Camera, FileCheck2, Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useState } from 'react';

const navItems = [
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
  { type: 'divider', label: 'ADMIN & PLATFORM' },
  { href: '/settings',      label: 'Settings',       icon: Settings,         permission: 'settings:view' },
  { href: '/hardware',      label: 'Hardware & Printers', icon: Printer,     permission: 'settings:view' },
  { href: '/audit-vault',   label: 'Audit Vault',    icon: ShieldAlert,      permission: 'settings:view' },
  { href: '/super-admin',   label: 'Super-Admin SaaS', icon: Globe,          permission: null },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { hasAnyPermission, user } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'flex flex-col h-full border-r border-sidebar-border bg-sidebar transition-all duration-300',
        collapsed ? 'w-[60px]' : 'w-[220px]'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0',
        collapsed && 'justify-center px-2'
      )}>
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <UtensilsCrossed className="w-4 h-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sidebar-foreground font-bold text-sm truncate">ROS</p>
            <p className="text-sidebar-foreground/50 text-[10px] truncate">{user?.name}</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 no-scrollbar">
        {navItems.map((item, idx) => {
          if (item.type === 'divider') {
            return collapsed ? (
              <div key={idx} className="my-2 mx-2 border-t border-sidebar-border" />
            ) : (
              <div key={idx} className="px-4 pt-4 pb-1">
                <p className="text-[10px] font-semibold text-sidebar-foreground/30 uppercase tracking-widest">
                  {item.label}
                </p>
              </div>
            );
          }

          const Icon = item.icon!;
          const allowed = !item.permission || hasAnyPermission(item.permission as any);
          if (!allowed) return null;

          const active = pathname.startsWith(item.href!);

          return (
            <Link
              key={item.href}
              href={item.href!}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 mx-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                collapsed ? 'justify-center px-2' : '',
                active
                  ? 'bg-sidebar-primary/15 text-sidebar-primary'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
            >
              <Icon className={cn('shrink-0', collapsed ? 'w-5 h-5' : 'w-4 h-4')} />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {active && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-sidebar-border p-2">
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
