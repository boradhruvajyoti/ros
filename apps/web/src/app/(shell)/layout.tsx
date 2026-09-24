'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppTopbar } from '@/components/layout/app-topbar';
import { Loader2 } from 'lucide-react';

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, _hasHydrated, setHasHydrated } = useAuthStore();
  const router = useRouter();
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
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <AppSidebar />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppTopbar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
