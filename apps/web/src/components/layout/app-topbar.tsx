'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { disconnectSocket } from '@/lib/socket';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Menu, Search, Sun, Moon, Maximize2, Minimize2, ChevronDown,
  LogOut, Send, UtensilsCrossed, Globe, Sparkles as SparklesIcon,
  MessageSquare, ExternalLink, Link2, Unlink, Check, Shield,
  Store, Building2, MapPin, CheckCircle2, ArrowRight, Plus
} from 'lucide-react';

export function AppTopbar() {
  const { user, setAuth, logout, setActiveBranch } = useAuthStore();
  const { toggleMobileSidebar, isFullscreen, toggleFullscreen } = useUIStore();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [telegramPhoneInput, setTelegramPhoneInput] = useState('');
  const [telegramChatIdInput, setTelegramChatIdInput] = useState('');
  const [telegramUsernameInput, setTelegramUsernameInput] = useState('');
  const [telegramOtpInput, setTelegramOtpInput] = useState('');
  const [otpStep, setOtpStep] = useState<'INPUT' | 'OTP'>('INPUT');
  const [isEditingTelegram, setIsEditingTelegram] = useState(false);
  const [otpDeepLink, setOtpDeepLink] = useState<string | null>(null);

  const [connectMode, setConnectMode] = useState<'username' | 'phone'>('username');

  const isSuperAdmin = user?.roles?.includes('SUPER_ADMIN');
  const isPlatformSuperAdmin =
    user?.email?.toLowerCase() === 'superadmin@ros.com' ||
    user?.tenantId === 'tenant-platform';

  // Platform details query for Superadmin
  const { data: platformDetails } = useQuery({
    queryKey: ['platform-details'],
    queryFn: async () => {
      try {
        const res = await apiGet<any>('/superadmin/platform-details');
        return res;
      } catch {
        return null;
      }
    },
    staleTime: 1000 * 60 * 2,
    enabled: isPlatformSuperAdmin,
  });

  // Current Tenant Details
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

  // Available Outlets / Branches query
  const { data: branches = [] } = useQuery({
    queryKey: ['tenant-branches', user?.tenantId],
    queryFn: async () => {
      try {
        const res = await apiGet<any[]>('/branches');
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 60 * 2,
    enabled: !!user?.tenantId,
  });

  // Switch Active Branch Mutation
  const switchBranchMutation = useMutation({
    mutationFn: (branchId: string) => apiPost<any>('/branches/switch', { branchId }),
    onSuccess: (data: any, branchId: string) => {
      const targetBranch = branches.find((b) => b.id === branchId);
      const branchName = targetBranch?.name || data?.user?.branchName || 'Selected Outlet';
      setActiveBranch(branchId, branchName, data?.accessToken);
      setShowBranchMenu(false);
      toast.success('Active Outlet Switched', `Now operating under ${branchName}`);
      // Invalidate queries to refresh data for the new branch
      queryClient.invalidateQueries();
    },
    onError: (err: any) => {
      toast.error('Could not switch outlet', err?.response?.data?.error?.message || err?.message || 'Failed to switch active outlet context.');
    },
  });

  // Current User Telegram Status
  const { data: telegramStatus } = useQuery({
    queryKey: ['my-telegram-status'],
    queryFn: async () => {
      try {
        const res = await apiGet<any>('/auth/me/telegram');
        return res;
      } catch {
        return { isConnected: false, chatId: null, username: null, botUsername: '', botConfigured: false };
      }
    },
    staleTime: 1000 * 30,
  });

  const requestOtpMutation = useMutation({
    mutationFn: (payload: { phone?: string; chatId?: string; username?: string }) =>
      apiPost<any>('/auth/me/telegram/request-otp', payload),
    onSuccess: (data: any) => {
      toast.info('OTP Generated! 📩', data?.message || 'Check your Telegram for the 6-digit verification code.');
      setOtpStep('OTP');
      setTelegramOtpInput('');
      if (data?.deepLink) setOtpDeepLink(data.deepLink);
    },
    onError: (err: any) => {
      toast.error('Could Not Send OTP', err?.response?.data?.error?.message || err?.message || 'Failed to dispatch Telegram verification code.');
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: (payload: { otp: string }) =>
      apiPost('/auth/me/telegram/verify-otp', payload),
    onSuccess: (data: any) => {
      toast.success('Telegram Connected! 🚀', data?.message || 'Your Telegram account is now verified and active.');
      setIsEditingTelegram(false);
      setOtpStep('INPUT');
      setTelegramOtpInput('');
      setOtpDeepLink(null);
      queryClient.invalidateQueries({ queryKey: ['my-telegram-status'] });
    },
    onError: (err: any) => {
      toast.error('Verification Failed', err?.response?.data?.error?.message || err?.message || 'Invalid or expired OTP code.');
    },
  });

  const disconnectTelegramMutation = useMutation({
    mutationFn: () => apiDelete('/auth/me/telegram'),
    onSuccess: () => {
      toast.info('Telegram Disconnected', 'Operational notifications have been stopped.');
      setTelegramPhoneInput('');
      setTelegramChatIdInput('');
      setTelegramUsernameInput('');
      setTelegramOtpInput('');
      setOtpStep('INPUT');
      setOtpDeepLink(null);
      setIsEditingTelegram(false);
      queryClient.invalidateQueries({ queryKey: ['my-telegram-status'] });
    },
    onError: (err: any) => {
      toast.error('Error', err?.response?.data?.error?.message || 'Could not disconnect Telegram.');
    },
  });

  const tenantLogo = currentTenant?.logoUrl;
  const tenantDisplayName = isPlatformSuperAdmin
    ? platformDetails?.platformName || currentTenant?.name || 'Restaurant OS (ROS)'
    : currentTenant?.name || 'Restaurant OS';

  let tenantTagline = isPlatformSuperAdmin
    ? platformDetails?.tagline || 'SaaS Global Control Plane'
    : 'Culinary Operating System';
  try {
    const parsed = typeof currentTenant?.settings === 'string' ? JSON.parse(currentTenant.settings) : (currentTenant?.settings || {});
    if (!isPlatformSuperAdmin && parsed?.tagline) tenantTagline = parsed.tagline;
  } catch {}

  const currentActiveBranch = branches.find((b) => b.id === user?.branchId) || (branches.length > 0 ? branches[0] : null);
  const activeBranchDisplayName = currentActiveBranch?.name || user?.branchName || 'Main Outlet';

  const handleLogout = async () => {
    try {
      await apiPost('/auth/logout');
    } catch {}
    disconnectSocket();
    logout();
    router.replace('/login');
    toast.success('Logged out successfully');
  };

  return (
    <header className="h-13 border-b border-border bg-card flex items-center px-3 sm:px-5 gap-2.5 sm:gap-4 shrink-0 sticky top-0 z-40 justify-between shadow-card">
      {/* Left: Mobile Drawer Trigger + Restaurant / Platform Logo & Title + Outlet Switcher */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Mobile Hamburger Drawer Trigger */}
        <button
          type="button"
          onClick={toggleMobileSidebar}
          className="md:hidden p-1.5 bg-muted/70 hover:bg-muted text-foreground border border-border shrink-0 cursor-pointer"
          title="Open Navigation Menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Frozen Brand Identity in Header */}
        <div className="flex items-center gap-2.5 min-w-0 max-w-xs sm:max-w-sm">
          <div className={cn(
            'w-7 h-7 flex items-center justify-center shrink-0 overflow-hidden',
            isPlatformSuperAdmin
              ? 'bg-indigo-500/15 border border-indigo-500/20'
              : tenantLogo
              ? 'border border-border'
              : 'bg-primary/15'
          )}>
            {isPlatformSuperAdmin ? (
              tenantLogo ? (
                <img src={tenantLogo} alt={tenantDisplayName} className="w-full h-full object-cover" />
              ) : (
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
              )
            ) : tenantLogo ? (
              <img src={tenantLogo} alt={tenantDisplayName} className="w-full h-full object-cover" />
            ) : (
              <UtensilsCrossed className="w-3.5 h-3.5 text-primary" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-xs font-semibold text-foreground tracking-tight truncate leading-tight" title={tenantDisplayName}>
              {tenantDisplayName}
            </h1>
            <p className="text-[10px] text-muted-foreground/70 truncate leading-none mt-px" title={tenantTagline}>
              {tenantTagline}
            </p>
          </div>
        </div>

        {/* ── MULTI-OUTLET / BRANCH SWITCHER (Header Dropdown) ── */}
        {!isPlatformSuperAdmin && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowBranchMenu(!showBranchMenu)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold border transition-all cursor-pointer select-none",
                showBranchMenu
                  ? "bg-primary/10 border-primary/40 text-primary ring-1 ring-primary/20"
                  : "bg-muted/40 hover:bg-muted border-border text-foreground hover:border-foreground/20"
              )}
              title="Switch Active Outlet / Branch"
            >
              <Store className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="truncate max-w-[100px] sm:max-w-[150px] md:max-w-[190px]">
                {activeBranchDisplayName}
              </span>
              {branches.length > 1 && (
                <span className="px-1.5 py-0.2 bg-primary/15 text-primary text-[10px] font-bold rounded-sm shrink-0">
                  {branches.length} Outlets
                </span>
              )}
              <ChevronDown className="w-3 h-3 text-muted-foreground ml-0.5 shrink-0" />
            </button>

            {/* Outlet Selector Dropdown Menu */}
            {showBranchMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowBranchMenu(false)}
                />
                <div
                  className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 border border-border bg-popover p-2.5 shadow-xl space-y-2 z-50 animate-in fade-in slide-in-from-top-1 duration-100 text-foreground"
                  style={{ borderRadius: 0 }}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-border px-1">
                    <div>
                      <p className="text-xs font-bold text-foreground">Select Operating Outlet</p>
                      <p className="text-[10px] text-muted-foreground">
                        {branches.length} registered location{branches.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Multi-Outlet
                    </Badge>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-1 pr-0.5">
                    {branches.length === 0 ? (
                      <div className="p-3 text-center text-xs text-muted-foreground">
                        No additional outlets found.
                      </div>
                    ) : (
                      branches.map((b) => {
                        const isCurrent = b.id === (user?.branchId || currentActiveBranch?.id);
                        return (
                          <button
                            key={b.id}
                            type="button"
                            disabled={switchBranchMutation.isPending}
                            onClick={() => switchBranchMutation.mutate(b.id)}
                            className={cn(
                              "w-full text-left p-2.5 border transition-all flex items-start justify-between gap-2 cursor-pointer",
                              isCurrent
                                ? "bg-primary/10 border-primary/40 text-foreground"
                                : "bg-card hover:bg-muted/60 border-border/80 text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className={cn("text-xs font-bold truncate", isCurrent && "text-primary")}>
                                  {b.name}
                                </span>
                                {isCurrent && (
                                  <span className="px-1.5 py-0.2 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold border border-emerald-500/30">
                                    ACTIVE
                                  </span>
                                )}
                              </div>
                              {b.address && (
                                <p className="text-[10px] text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                                  <MapPin className="w-2.5 h-2.5 shrink-0 opacity-70" />
                                  <span className="truncate">{b.address}</span>
                                </p>
                              )}
                              {b._count && (
                                <p className="text-[9px] text-muted-foreground/80 mt-1">
                                  {b._count.restaurantTables || 0} Tables • {b._count.kitchenStations || 0} Kitchen Stations
                                </p>
                              )}
                            </div>
                            {isCurrent ? (
                              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            ) : (
                              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 mt-0.5" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Manage / Add Outlets Link */}
                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setShowBranchMenu(false);
                        router.push('/settings');
                      }}
                      className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Manage Outlets in Settings</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Search bar (Desktop / Tablet) */}
        <div className="flex-1 max-w-xs hidden lg:block ml-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search dishes, orders..."
              className="w-full pl-8 pr-3 h-8 border border-border bg-muted/40 text-xs placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring transition-all"
              style={{ borderRadius: 0 }}
            />
          </div>
        </div>
      </div>

      {/* Right: Quick actions and clean Profile dropdown */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
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
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              if (user?.phone) setTelegramPhoneInput(user.phone);
              if (telegramStatus?.chatId) {
                setTelegramChatIdInput(telegramStatus.chatId);
                setTelegramUsernameInput(telegramStatus.username || '');
              }
            }}
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 border transition-all cursor-pointer",
              showProfileMenu
                ? "bg-muted border-border"
                : "border-transparent hover:border-border hover:bg-muted/50"
            )}
          >
            <div className="w-6 h-6 bg-primary/15 border border-primary/25 flex items-center justify-center font-semibold text-xs text-primary">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:flex flex-col items-start text-left min-w-0 max-w-[100px] md:max-w-[140px]">
              <span className="text-xs font-semibold text-foreground leading-tight truncate w-full">{user?.name || 'Staff User'}</span>
              <span className="text-[10px] text-muted-foreground capitalize leading-none truncate w-full">
                {user?.roles?.[0]?.toLowerCase().replace('_', ' ') || 'Staff'}
              </span>
            </div>
            <ChevronDown className="w-3 h-3 text-muted-foreground hidden sm:block ml-0.5 shrink-0" />
          </button>

          {/* Clean Profile Dropdown Panel */}
          {showProfileMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowProfileMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1.5 w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] max-h-[calc(100vh-4.5rem)] overflow-y-auto overscroll-contain border border-border bg-popover p-4 shadow-xl space-y-3 z-50 animate-in fade-in slide-in-from-top-1 duration-100 text-foreground" style={{ borderRadius: 0 }}>
                {/* User Info Header */}
                <div className="flex items-center gap-3 pb-3 border-b border-border">
                  <div className="w-8 h-8 bg-primary/15 border border-primary/25 flex items-center justify-center font-semibold text-sm text-primary shrink-0">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground truncate">{user?.name || 'Staff User'}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user?.email || 'staff@restaurant.com'}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge variant="outline" className="text-[9px] font-medium border-border text-muted-foreground py-0">
                        {user?.roles?.[0]?.replace('_', ' ') || 'STAFF'}
                      </Badge>
                      <Badge variant="secondary" className="text-[9px] font-medium py-0">
                        {activeBranchDisplayName}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* ── TELEGRAM NOTIFICATIONS CONNECTION CARD ── */}
                <div className="p-3 bg-sky-500/8 border border-sky-500/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-black text-sky-400">
                      <Send className="w-3.5 h-3.5" />
                      <span>Telegram Operational Alerts</span>
                    </div>
                    {telegramStatus?.isConnected ? (
                      <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-medium flex items-center gap-1">
                        <Check className="w-3 h-3" /> Connected
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-[10px] font-medium">
                        Not Linked
                      </span>
                    )}
                  </div>

                  {telegramStatus?.isConnected && !isEditingTelegram ? (
                    <div className="space-y-2 text-xs">
                      <div className="p-2 bg-muted/60 border border-border flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] text-muted-foreground font-semibold">Telegram Status</p>
                          <p className="font-mono font-bold text-foreground text-xs truncate">
                            {user?.phone ? user.phone : (telegramStatus.chatId ? `ID: ${telegramStatus.chatId}` : 'Connected')}
                          </p>
                        </div>
                        {telegramStatus.username && (
                          <div className="text-right min-w-0 max-w-[50%]">
                            <p className="text-[10px] text-muted-foreground font-semibold">Handle</p>
                            <p className="font-mono font-bold text-sky-400 text-xs truncate">@{telegramStatus.username}</p>
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Live notifications for orders, kitchen tickets, bills & reports are dispatched directly to your Telegram.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsEditingTelegram(true);
                            setOtpStep('INPUT');
                            setTelegramPhoneInput(user?.phone || '');
                          }}
                          className="h-7 text-[11px] rounded-lg border-border hover:bg-muted flex-1 cursor-pointer"
                        >
                          Change Number
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          loading={disconnectTelegramMutation.isPending}
                          onClick={() => disconnectTelegramMutation.mutate()}
                          className="h-7 text-[11px] rounded-lg flex-1 cursor-pointer"
                        >
                          <Unlink className="w-3 h-3 mr-1" /> Disconnect
                        </Button>
                      </div>
                    </div>
                  ) : otpStep === 'OTP' ? (
                    /* ── STEP 2: OTP VERIFICATION ── */
                    <div className="space-y-2.5">
                      <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-[11px] text-sky-200 space-y-1">
                        <p className="font-bold flex items-center gap-1.5 text-sky-400">
                          <MessageSquare className="w-3.5 h-3.5" /> Verification Code Sent!
                        </p>
                        <p className="text-[10px] opacity-80 break-words">
                          We sent a 6-digit OTP to your Telegram account for <span className="font-bold text-white break-all">{telegramPhoneInput || (telegramUsernameInput ? `@${telegramUsernameInput.replace(/^@/, '')}` : '') || telegramChatIdInput}</span>.
                        </p>
                        {otpDeepLink && (
                          <a
                            href={otpDeepLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-300 hover:text-white underline decoration-sky-400 pt-0.5"
                          >
                            <span>👉 Tap to Open Bot & View Code</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Enter 6-Digit Verification OTP
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            maxLength={6}
                            placeholder="123456"
                            value={telegramOtpInput}
                            onChange={(e) => setTelegramOtpInput(e.target.value.replace(/\D/g, ''))}
                            className="flex-1 px-3 py-1.5 text-center text-sm font-mono tracking-widest font-black rounded-xl bg-background border border-border focus:ring-2 focus:ring-sky-500"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            disabled={telegramOtpInput.length < 6 || verifyOtpMutation.isPending}
                            loading={verifyOtpMutation.isPending}
                            onClick={() => {
                              verifyOtpMutation.mutate({ otp: telegramOtpInput.trim() });
                            }}
                            className="h-8 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                          >
                            <Check className="w-3 h-3 mr-1" /> Verify & Connect
                          </Button>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                          <button
                            type="button"
                            disabled={requestOtpMutation.isPending}
                            onClick={() => {
                              requestOtpMutation.mutate({
                                phone: telegramPhoneInput.trim() || undefined,
                                chatId: telegramChatIdInput.trim() || undefined,
                                username: telegramUsernameInput.trim() || undefined,
                              });
                            }}
                            className="text-sky-400 hover:underline cursor-pointer font-semibold disabled:opacity-50"
                          >
                            Resend Code
                          </button>
                          <button
                            type="button"
                            onClick={() => setOtpStep('INPUT')}
                            className="hover:underline cursor-pointer"
                          >
                            Change Number
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ── STEP 1: ENTER USERNAME OR MOBILE & REQUEST OTP ── */
                    <div className="space-y-2.5">
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Connect your Telegram account to receive live kitchen tickets, order status, and bill notifications.
                      </p>

                      {/* Mode Selector Tabs */}
                      <div className="grid grid-cols-2 p-0.5 rounded-xl bg-background/80 border border-border/80 text-[11px] font-bold">
                        <button
                          type="button"
                          onClick={() => setConnectMode('username')}
                          className={cn(
                            "py-1 rounded-lg transition-all text-center cursor-pointer",
                            connectMode === 'username'
                              ? "bg-primary text-primary-foreground shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          By Username (@)
                        </button>
                        <button
                          type="button"
                          onClick={() => setConnectMode('phone')}
                          className={cn(
                            "py-1 rounded-lg transition-all text-center cursor-pointer",
                            connectMode === 'phone'
                              ? "bg-primary text-primary-foreground shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          By Phone Number
                        </button>
                      </div>

                      {connectMode === 'username' ? (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            Telegram Username (@handle)
                          </label>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              placeholder="e.g. @chef_alex or chef_alex"
                              value={telegramUsernameInput}
                              onChange={(e) => setTelegramUsernameInput(e.target.value)}
                              className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-background border border-border focus:ring-1 focus:ring-sky-500 font-mono"
                            />
                            <Button
                              size="sm"
                              disabled={!telegramUsernameInput.trim() || requestOtpMutation.isPending}
                              loading={requestOtpMutation.isPending}
                              onClick={() => {
                                requestOtpMutation.mutate({
                                  username: telegramUsernameInput.trim(),
                                });
                              }}
                              className="h-8 px-3 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white cursor-pointer"
                            >
                              <Shield className="w-3 h-3 mr-1" /> Get OTP
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            Telegram Registered Phone
                          </label>
                          <div className="flex gap-1.5">
                            <input
                              type="tel"
                              placeholder="e.g. +91 98765 43210"
                              value={telegramPhoneInput}
                              onChange={(e) => setTelegramPhoneInput(e.target.value)}
                              className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-background border border-border focus:ring-1 focus:ring-sky-500 font-mono"
                            />
                            <Button
                              size="sm"
                              disabled={!telegramPhoneInput.trim() || requestOtpMutation.isPending}
                              loading={requestOtpMutation.isPending}
                              onClick={() => {
                                requestOtpMutation.mutate({
                                  phone: telegramPhoneInput.trim(),
                                });
                              }}
                              className="h-8 px-3 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white cursor-pointer"
                            >
                              <Shield className="w-3 h-3 mr-1" /> Get OTP
                            </Button>
                          </div>
                        </div>
                      )}

                      {telegramStatus?.botUsername && (
                        <div className="pt-1 flex items-center justify-between gap-2 text-[10px] text-muted-foreground min-w-0">
                          <span className="truncate">Bot: @{telegramStatus.botUsername}</span>
                          <a
                            href={`https://t.me/${telegramStatus.botUsername}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sky-400 hover:underline font-bold inline-flex items-center gap-0.5 shrink-0"
                          >
                            Open Bot <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      )}

                      {isEditingTelegram && (
                        <button
                          type="button"
                          onClick={() => setIsEditingTelegram(false)}
                          className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer pt-0.5"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Log Out Action */}
                <div className="pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 p-2 text-xs font-medium text-destructive hover:bg-destructive/8 transition-colors cursor-pointer"
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
