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
  MessageSquare, ExternalLink, Link2, Unlink, Check, Shield
} from 'lucide-react';

export function AppTopbar() {
  const { user, setAuth, logout } = useAuthStore();
  const { toggleMobileSidebar, isFullscreen, toggleFullscreen } = useUIStore();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [telegramPhoneInput, setTelegramPhoneInput] = useState('');
  const [telegramChatIdInput, setTelegramChatIdInput] = useState('');
  const [telegramUsernameInput, setTelegramUsernameInput] = useState('');
  const [telegramOtpInput, setTelegramOtpInput] = useState('');
  const [otpStep, setOtpStep] = useState<'INPUT' | 'OTP'>('INPUT');
  const [isEditingTelegram, setIsEditingTelegram] = useState(false);
  const [otpDeepLink, setOtpDeepLink] = useState<string | null>(null);

  const isSuperAdmin = user?.roles?.includes('SUPER_ADMIN');
  const isPlatformSuperAdmin =
    user?.email?.toLowerCase() === 'superadmin@ros.com' ||
    user?.tenantId === 'tenant-platform';

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
    enabled: !isPlatformSuperAdmin && !!user?.tenantId,
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
      toast.info('OTP Sent! 📩', data?.message || 'Check your Telegram for the 6-digit verification code.');
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
    ? 'ROS Platform Superadmin'
    : currentTenant?.name || 'Restaurant OS';

  let tenantTagline = isPlatformSuperAdmin ? 'SaaS Global Control Plane' : 'Culinary Operating System';
  try {
    const parsed = typeof currentTenant?.settings === 'string' ? JSON.parse(currentTenant.settings) : (currentTenant?.settings || {});
    if (parsed?.tagline) tenantTagline = parsed.tagline;
  } catch {}

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
    <header className="h-14 sm:h-16 border-b border-border bg-card/95 backdrop-blur-xl flex items-center px-3 sm:px-6 gap-2.5 sm:gap-4 shrink-0 sticky top-0 z-40 justify-between shadow-xs">
      {/* Left: Mobile Drawer Trigger + Restaurant Logo & Title (Frozen) */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Mobile Hamburger Drawer Trigger */}
        <button
          type="button"
          onClick={toggleMobileSidebar}
          className="md:hidden p-2 rounded-xl bg-muted/80 hover:bg-muted text-foreground border border-border shrink-0 cursor-pointer active:scale-95"
          title="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Frozen Restaurant Brand Identity in Header */}
        <div className="flex items-center gap-2.5 min-w-0 max-w-xs sm:max-w-sm">
          <div className={cn(
            'w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center shrink-0 shadow-sm overflow-hidden rounded-xl',
            isPlatformSuperAdmin
              ? 'bg-gradient-to-tr from-indigo-500 to-purple-600'
              : tenantLogo
              ? 'bg-card border border-border p-0.5'
              : 'bg-primary text-primary-foreground'
          )}>
            {isPlatformSuperAdmin ? (
              <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            ) : tenantLogo ? (
              <img src={tenantLogo} alt={tenantDisplayName} className="w-full h-full object-cover rounded-lg" />
            ) : (
              <UtensilsCrossed className="w-4 h-4 text-primary-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-black text-foreground tracking-tight truncate leading-tight" title={tenantDisplayName}>
              {tenantDisplayName}
            </h1>
            <p className="text-[10px] text-muted-foreground truncate leading-none mt-0.5" title={tenantTagline}>
              {tenantTagline}
            </p>
          </div>
        </div>

        {/* Search bar (Desktop / Tablet) */}
        <div className="flex-1 max-w-xs hidden lg:block ml-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search dishes, tables, staff..."
              className="w-full pl-8 pr-4 h-8 rounded-xl border border-border bg-background/60 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
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
                {user?.roles?.[0]?.toLowerCase().replace('_', ' ') || 'Staff Member'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:block ml-0.5" />
          </button>

          {/* Clean Profile Dropdown Panel */}
          {showProfileMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowProfileMenu(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-popover/95 backdrop-blur-2xl p-4 shadow-2xl space-y-3.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-foreground">
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

                {/* ── TELEGRAM NOTIFICATIONS CONNECTION CARD ── */}
                <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-black text-sky-400">
                      <Send className="w-3.5 h-3.5" />
                      <span>Telegram Operational Alerts</span>
                    </div>
                    {telegramStatus?.isConnected ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Connected
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                        Not Linked
                      </span>
                    )}
                  </div>

                  {telegramStatus?.isConnected && !isEditingTelegram ? (
                    <div className="space-y-2 text-xs">
                      <div className="p-2 rounded-xl bg-background/80 border border-border/60 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-muted-foreground font-semibold">Telegram Status</p>
                          <p className="font-mono font-bold text-foreground text-xs">
                            {user?.phone ? user.phone : (telegramStatus.chatId ? `ID: ${telegramStatus.chatId}` : 'Connected')}
                          </p>
                        </div>
                        {telegramStatus.username && (
                          <div className="text-right">
                            <p className="text-[10px] text-muted-foreground font-semibold">Handle</p>
                            <p className="font-mono font-bold text-sky-400 text-xs">@{telegramStatus.username}</p>
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
                        <p className="text-[10px] opacity-80">
                          We sent a 6-digit OTP to your Telegram account for <span className="font-bold text-white">{telegramPhoneInput || telegramChatIdInput}</span>.
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
                    /* ── STEP 1: ENTER TELEGRAM NUMBER & SEND OTP ── */
                    <div className="space-y-2">
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Enter your Telegram registered mobile number to receive live kitchen, order, and billing updates.
                      </p>

                      <div className="space-y-1.5 pt-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Telegram Mobile Number
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
                                username: telegramUsernameInput.trim() || undefined,
                              });
                            }}
                            className="h-8 px-3 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white cursor-pointer"
                          >
                            <Shield className="w-3 h-3 mr-1" /> Send OTP
                          </Button>
                        </div>

                        {telegramStatus?.botUsername && (
                          <div className="pt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>Bot: @{telegramStatus.botUsername}</span>
                            <a
                              href={`https://t.me/${telegramStatus.botUsername}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sky-400 hover:underline font-bold inline-flex items-center gap-0.5"
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
                    </div>
                  )}
                </div>

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

