'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, LogOut, Moon, Sun, Search, Building2, ChevronDown, Check, ShieldAlert, Sparkles, Menu } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiPost } from '@/lib/api';
import { disconnectSocket, connectSocket } from '@/lib/socket';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function AppTopbar() {
  const { user, setAuth, logout } = useAuthStore();
  const { toggleMobileSidebar } = useUIStore();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);
  const [switching, setSwitching] = useState(false);

  const isSuperAdmin = user?.roles?.includes('SUPER_ADMIN');

  const handleLogout = async () => {
    try {
      await apiPost('/auth/logout');
    } catch {}
    disconnectSocket();
    logout();
    router.replace('/login');
    toast.success('Logged out successfully');
  };

  const handleSwitchBranch = async (branchId: string, branchName: string) => {
    try {
      setSwitching(true);
      const res = await apiPost<{ accessToken: string; user: any }>('/auth/switch-branch', { branchId });
      setAuth(res.accessToken, res.user);
      connectSocket(res.accessToken);
      setShowSwitchMenu(false);
      toast.success('Switched active branch', branchName);
      window.location.reload();
    } catch (err: any) {
      toast.error('Branch switch failed', err?.response?.data?.error?.message || 'Could not switch branch');
    } finally {
      setSwitching(false);
    }
  };

  const handleSwitchTenant = async (tenantId: string, tenantName: string) => {
    try {
      setSwitching(true);
      const res = await apiPost<{ accessToken: string; user: any; tenant: any }>('/auth/switch-tenant', { tenantId });
      setAuth(res.accessToken, res.user);
      connectSocket(res.accessToken);
      setShowSwitchMenu(false);
      toast.success('Switched tenant organization', tenantName);
      window.location.reload();
    } catch (err: any) {
      toast.error('Tenant switch failed', err?.response?.data?.error?.message || 'Could not switch tenant');
    } finally {
      setSwitching(false);
    }
  };

  return (
    <header className="h-16 border-b border-border bg-card/60 backdrop-blur-md flex items-center px-3 sm:px-6 gap-2.5 sm:gap-4 shrink-0 relative z-30">
      {/* Mobile Hamburger Drawer Trigger */}
      <button
        type="button"
        onClick={toggleMobileSidebar}
        className="md:hidden p-2 rounded-xl bg-muted/80 hover:bg-muted text-foreground border border-border shrink-0 cursor-pointer active:scale-95"
        title="Open Navigation Menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Search bar */}
      <div className="flex-1 max-w-md hidden sm:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search orders, menu, customers..."
            className="w-full pl-9 pr-4 h-9 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-2.5 ml-auto">
        {/* Tenant & Branch Switcher Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowSwitchMenu(!showSwitchMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-muted/60 hover:bg-muted text-xs transition-all"
          >
            <Building2 className="w-3.5 h-3.5 text-primary" />
            <div className="flex flex-col items-start text-left">
              <span className="font-semibold text-foreground leading-none">
                {user?.branchId === 'branch-sg-main' ? 'Main Branch' : user?.branchId || 'Active Branch'}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {user?.tenantId === 'tenant-sg-01' ? 'Spice Garden' : user?.tenantId || 'Multi-Tenant'}
              </span>
            </div>
            <ChevronDown className="w-3 h-3 text-muted-foreground ml-1" />
          </button>

          {showSwitchMenu && (
            <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-border bg-popover/95 backdrop-blur-md p-3 shadow-xl space-y-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div>
                  <p className="text-xs font-bold text-foreground">Multi-Tenant Context</p>
                  <p className="text-[10px] text-muted-foreground">Tenant ID: {user?.tenantId}</p>
                </div>
                {isSuperAdmin && (
                  <Badge variant="outline" className="text-[9px] border-primary/40 text-primary">Super Admin</Badge>
                )}
              </div>

              {/* Branch Selection */}
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Branches</p>
                <div className="space-y-1">
                  {[
                    { id: 'branch-sg-main', name: 'Main Branch - Indiranagar' },
                    { id: 'branch-sg-whitefield', name: 'Whitefield Outlet' },
                  ].map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      disabled={switching}
                      onClick={() => handleSwitchBranch(b.id, b.name)}
                      className={cn(
                        'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all text-left',
                        user?.branchId === b.id
                          ? 'bg-primary/15 text-primary font-semibold'
                          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <span>{b.name}</span>
                      {user?.branchId === b.id && <Check className="w-3.5 h-3.5 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Super Admin Tenant Quick Switcher */}
              {isSuperAdmin && (
                <div className="space-y-1 pt-2 border-t border-border/60">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 text-amber-400" />
                    <span>Cross-Tenant Switch</span>
                  </p>
                  <div className="space-y-1">
                    {[
                      { id: 'tenant-sg-01', name: 'Spice Garden' },
                      { id: 'tenant-ub-01', name: 'Urban Bistro' },
                      { id: 'tenant-tr-01', name: 'Tokyo Ramen' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        disabled={switching}
                        onClick={() => handleSwitchTenant(t.id, t.name)}
                        className={cn(
                          'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all text-left',
                          user?.tenantId === t.id
                            ? 'bg-amber-500/15 text-amber-400 font-semibold'
                            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <span>{t.name}</span>
                        {user?.tenantId === t.id && <Check className="w-3.5 h-3.5 text-amber-400" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notifications */}
        <Button variant="ghost" size="icon-sm" className="relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full animate-pulse-dot" />
        </Button>

        {/* Theme toggle */}
        <Button variant="ghost" size="icon-sm" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>

        {/* User avatar + logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
            <span className="text-xs font-bold text-primary">
              {user?.name?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-foreground leading-none">{user?.name}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{user?.roles?.[0]?.toLowerCase().replace('_', ' ')}</p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={handleLogout} title="Logout">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}

