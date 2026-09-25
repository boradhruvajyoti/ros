'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, LogOut, Moon, Sun, Search, Building2, ChevronDown, Check, ShieldAlert, Sparkles, Menu, Maximize2, Minimize2 } from 'lucide-react';
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
  const { toggleMobileSidebar, isFullscreen, toggleFullscreen } = useUIStore();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
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
      setShowProfileMenu(false);
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
      setShowProfileMenu(false);
      toast.success('Switched tenant organization', tenantName);
      window.location.reload();
    } catch (err: any) {
      toast.error('Tenant switch failed', err?.response?.data?.error?.message || 'Could not switch tenant');
    } finally {
      setSwitching(false);
    }
  };

  return (
    <header className="h-14 sm:h-16 border-b border-border bg-card/75 backdrop-blur-md flex items-center px-3 sm:px-6 gap-2.5 sm:gap-4 shrink-0 relative z-30 justify-between">
      {/* Left: Mobile Drawer Trigger & Search */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        {/* Mobile Hamburger Drawer Trigger */}
        <button
          type="button"
          onClick={toggleMobileSidebar}
          className="md:hidden p-2 rounded-xl bg-muted/80 hover:bg-muted text-foreground border border-border shrink-0 cursor-pointer active:scale-95"
          title="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search bar (Desktop / Tablet) */}
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
      </div>

      {/* Right: Quick actions and clean Profile dropdown */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Notifications */}
        <Button variant="ghost" size="icon-sm" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full animate-pulse-dot" />
        </Button>

        {/* Fullscreen toggle (Desktop / Tablet only) */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleFullscreen}
          className={cn(
            'hidden sm:inline-flex text-muted-foreground hover:text-foreground transition-all cursor-pointer',
            isFullscreen && 'text-primary bg-primary/10'
          )}
          title={isFullscreen ? 'Exit Full Screen' : 'Enter Full Screen Mode'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </Button>

        {/* Theme toggle */}
        <Button variant="ghost" size="icon-sm" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="text-muted-foreground hover:text-foreground">
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>

        {/* Consolidated Profile Menu Dropdown */}
        <div className="relative ml-1">
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className={cn(
              "flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-2xl border transition-all cursor-pointer",
              showProfileMenu
                ? "bg-primary/15 border-primary/40 shadow-xs"
                : "border-border/80 bg-muted/50 hover:bg-muted hover:border-border"
            )}
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-primary/20 border border-primary/35 flex items-center justify-center font-bold text-xs text-primary shadow-xs">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:flex flex-col items-start text-left">
              <span className="text-xs font-bold text-foreground leading-tight">{user?.name || 'Staff User'}</span>
              <span className="text-[10px] text-muted-foreground capitalize leading-none">
                {user?.roles?.[0]?.toLowerCase().replace('_', ' ') || 'Manager'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:block ml-0.5" />
          </button>

          {/* Clean Profile & Organization Dropdown Panel */}
          {showProfileMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowProfileMenu(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl border border-border bg-popover/95 backdrop-blur-xl p-3.5 shadow-2xl space-y-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-foreground">
                {/* User Info Header */}
                <div className="flex items-center gap-3 pb-3 border-b border-border/70">
                  <div className="w-10 h-10 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center font-black text-sm text-primary shrink-0">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-foreground truncate">{user?.name || 'Staff User'}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user?.email || 'staff@restaurant.com'}</p>
                    <Badge variant="outline" className="mt-1 text-[9px] font-bold border-primary/30 text-primary py-0">
                      {user?.roles?.[0]?.replace('_', ' ') || 'STAFF'}
                    </Badge>
                  </div>
                </div>

                {/* Tenant / Organization Card */}
                <div className="p-2.5 rounded-xl bg-muted/60 border border-border/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-primary" /> Active Organization
                    </span>
                    {isSuperAdmin && (
                      <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">Super Admin</span>
                    )}
                  </div>
                  <p className="text-xs font-black text-foreground">
                    {user?.tenantId === 'tenant-sg-01' ? 'Spice Garden Hospitality' : user?.tenantId || 'Restaurant Organization'}
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground">
                    ID: {user?.tenantId || 'tenant-default'}
                  </p>
                </div>

                {/* Branch Selection List */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Select Branch
                  </p>
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
                          'w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all text-left cursor-pointer',
                          user?.branchId === b.id
                            ? 'bg-primary/15 text-primary font-bold border border-primary/30'
                            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <span className="truncate">{b.name}</span>
                        {user?.branchId === b.id && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Super Admin Cross-Tenant Switcher */}
                {isSuperAdmin && (
                  <div className="space-y-1.5 pt-2 border-t border-border/70">
                    <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" />
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
                            'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all text-left cursor-pointer',
                            user?.tenantId === t.id
                              ? 'bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30'
                              : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <span>{t.name}</span>
                          {user?.tenantId === t.id && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Log Out Action */}
                <div className="pt-2 border-t border-border/70">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

