'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppTopbar } from '@/components/layout/app-topbar';
import { AppMobileNav } from '@/components/layout/app-mobile-nav';
import { Loader2, ShieldAlert, ArrowRight, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isRouteAccessible, getDefaultLandingRoute } from '@/lib/nav-permissions';

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, hasAnyPermission, _hasHydrated, setHasHydrated } = useAuthStore();
  const { isFullscreen, toggleFullscreen } = useUIStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Fallback: If zustand has already hydrated before mount
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ros-auth');
      if (stored && !_hasHydrated) {
        setHasHydrated(true);
      }
    }
  }, [_hasHydrated, setHasHydrated]);

  useEffect(() => {
    // Only redirect to /login AFTER zustand has finished hydrating from localStorage
    if (mounted && _hasHydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [mounted, _hasHydrated, isAuthenticated, router]);

  // Check route accessibility for logged-in user
  const isAllowed = !user || isRouteAccessible(pathname, user, hasAnyPermission);
  const defaultRoute = getDefaultLandingRoute(user, hasAnyPermission);

  useEffect(() => {
    if (mounted && _hasHydrated && isAuthenticated && user && !isAllowed) {
      router.replace(defaultRoute);
    }
  }, [mounted, _hasHydrated, isAuthenticated, user, isAllowed, defaultRoute, router]);

  // If not hydrated yet, show a sleek workspace loading spinner so the page does not flash or log out
  if (!mounted || !_hasHydrated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs font-semibold text-muted-foreground">Loading workspace session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen w-full max-w-full overflow-hidden bg-background">
      {/* Sidebar (Desktop docked + Mobile Slide-over Drawer) */}
      <AppSidebar />

      {/* Main content area */}
      <div className="flex flex-1 flex-col min-w-0 w-full overflow-hidden relative">
        <AppTopbar />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 pb-20 md:pb-6 w-full max-w-full">
          {isAllowed ? (
            children
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-md">
                <h2 className="text-lg font-black text-foreground">Feature Not Accessible</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your staff account has not been granted access to this module. Please contact your restaurant administrator to request access permissions.
                </p>
              </div>
              <Button
                onClick={() => router.push(defaultRoute)}
                className="gap-2 font-bold text-xs rounded-xl"
              >
                <span>Go to Allowed Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </main>
      </div>

      {/* Bottom Mobile Navigation for 1-Tap Thumb Action */}
      <AppMobileNav />

      {/* Floating Minimise Button when Fullscreen Mode is Active */}
      {isFullscreen && (
        <button
          type="button"
          onClick={toggleFullscreen}
          className="fixed top-2.5 right-2.5 sm:top-3.5 sm:right-3.5 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/90 hover:bg-slate-900 text-white border border-white/25 shadow-2xl backdrop-blur-md cursor-pointer transition-all active:scale-95 text-xs font-bold animate-in fade-in zoom-in-95 duration-200"
          title="Exit Full Screen (or press Esc)"
        >
          <Minimize2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="hidden sm:inline">Exit Fullscreen</span>
          <span className="sm:hidden">Exit</span>
        </button>
      )}
    </div>
  );
}
