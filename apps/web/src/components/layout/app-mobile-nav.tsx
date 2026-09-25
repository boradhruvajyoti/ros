'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, ShoppingCart, Grid3X3, ChefHat, Menu,
  ClipboardList, Globe, Building2, CreditCard, ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { getMobileBottomNavItems } from '@/lib/nav-permissions';

export function AppMobileNav() {
  const pathname = usePathname();
  const { user, hasAnyPermission } = useAuthStore();
  const { toggleMobileSidebar, mobileSidebarOpen } = useUIStore();

  const navItems = getMobileBottomNavItems(user, hasAnyPermission);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border shadow-2xl safe-bottom">
      <div className="flex items-center justify-around h-16 px-1.5 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.href === '/super-admin'
            ? pathname === '/super-admin'
            : pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 py-1 rounded-2xl transition-all duration-200 active:scale-90',
                active
                  ? 'text-primary font-black'
                  : 'text-muted-foreground hover:text-foreground font-medium'
              )}
            >
              <div className={cn(
                'p-1.5 rounded-xl transition-all duration-200',
                active ? 'bg-primary/15 shadow-xs' : ''
              )}>
                <Icon className={cn('w-5 h-5', active ? 'text-primary stroke-[2.5]' : 'stroke-2')} />
              </div>
              <span className="text-[10px] leading-tight tracking-tight mt-0.5">{item.label}</span>
            </Link>
          );
        })}

        {/* More / All Panels Drawer Trigger Button */}
        <button
          type="button"
          onClick={toggleMobileSidebar}
          className={cn(
            'flex flex-col items-center justify-center flex-1 py-1 rounded-2xl transition-all duration-200 active:scale-90 cursor-pointer',
            mobileSidebarOpen ? 'text-primary font-black' : 'text-muted-foreground hover:text-foreground font-medium'
          )}
        >
          <div className={cn(
            'p-1.5 rounded-xl transition-all duration-200',
            mobileSidebarOpen ? 'bg-primary/15 shadow-xs' : ''
          )}>
            <Menu className={cn('w-5 h-5', mobileSidebarOpen ? 'text-primary stroke-[2.5]' : 'stroke-2')} />
          </div>
          <span className="text-[10px] leading-tight tracking-tight mt-0.5">All Panels</span>
        </button>
      </div>
    </nav>
  );
}
