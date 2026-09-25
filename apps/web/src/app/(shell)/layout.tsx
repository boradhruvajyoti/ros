'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppTopbar } from '@/components/layout/app-topbar';
import { AppMobileNav } from '@/components/layout/app-mobile-nav';
import { Loader2, ShieldAlert, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isRouteAccessible, getDefaultLandingRoute } from '@/lib/nav-permissions';

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, hasAnyPermission, _hasHydrated, setHasHydrated } = useAuthStore();
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
    </div>
  );
}
