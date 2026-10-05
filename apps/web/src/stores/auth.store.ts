// =============================================================================
// Auth store — Zustand with persist & safe fallback
// =============================================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Permission } from '@ros/shared-types';

export interface AvailableBranch {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  gstin?: string | null;
  isActive?: boolean;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  tenantId: string;
  tenantName?: string;
  branchId: string;
  branchName?: string;
  availableBranches?: AvailableBranch[];
  roles?: string[];
  role?: string;
  designation?: string;
  department?: string;
  permissions?: Permission[];
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;

  setAuth: (token: string, user: Partial<AuthUser> & { id: string; name: string; email: string }) => void;
  setAccessToken: (token: string) => void;
  setActiveBranch: (branchId: string, branchName: string, newAccessToken?: string) => void;
  setAvailableBranches: (branches: AvailableBranch[]) => void;
  updateUser: (partialUser: Partial<AuthUser>) => void;
  setHasHydrated: (state: boolean) => void;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (...permissions: Permission[]) => boolean;
  hasRole: (role: string) => boolean;
}

export function clearWebSessionCache() {
  if (typeof window === 'undefined') return;
  try {
    // Clear session storage completely
    window.sessionStorage.clear();

    // Preserve UI theme preference if any, purge all other cached items
    const theme = window.localStorage.getItem('theme') || window.localStorage.getItem('ros-theme');
    
    // Clear all localStorage keys except theme
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key !== 'theme' && key !== 'ros-theme') {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => window.localStorage.removeItem(k));

    if (theme) {
      window.localStorage.setItem('theme', theme);
    }
  } catch (e) {
    console.warn('Failed to clear session cache:', e);
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setHasHydrated: (state) => set({ _hasHydrated: state }),

      setAuth: (token, user) => {
        // Clear prior session cache first
        clearWebSessionCache();

        const roles = Array.isArray(user.roles)
          ? user.roles
          : user.role
          ? [user.role]
          : ['ADMIN', 'SUPER_ADMIN'];

        const permissions = Array.isArray(user.permissions)
          ? user.permissions
          : [];

        const normalizedUser: AuthUser = {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: (user as any).phone || undefined,
          tenantId: user.tenantId || 'tenant-default',
          tenantName: user.tenantName || undefined,
          branchId: user.branchId || (user as any).activeBranchId || 'branch-default',
          branchName: user.branchName || 'Main Outlet',
          availableBranches: user.availableBranches || [],
          roles,
          permissions,
        };

        set({ accessToken: token, user: normalizedUser, isAuthenticated: true });
      },

      setAccessToken: (token) => set({ accessToken: token }),

      setActiveBranch: (branchId, branchName, newAccessToken) => {
        const { user, accessToken } = get();
        if (!user) return;
        set({
          user: { ...user, branchId, branchName },
          accessToken: newAccessToken || accessToken,
        });
      },

      setAvailableBranches: (branches) => {
        const { user } = get();
        if (!user) return;
        set({
          user: { ...user, availableBranches: branches },
        });
      },

      updateUser: (partialUser) => {
        const { user } = get();
        if (!user) return;
        set({
          user: { ...user, ...partialUser },
        });
      },

      logout: () => {
        clearWebSessionCache();
        set({ accessToken: null, user: null, isAuthenticated: false });
      },

      hasPermission: (permission) => {
        const { user } = get();
        if (!user) return false;
        if (
          user.email?.toLowerCase() === 'superadmin@ros.com' ||
          user.tenantId === 'tenant-platform' ||
          user.roles?.includes('OWNER')
        ) {
          return true;
        }
        const permissions = user.permissions || [];
        return permissions.includes(permission);
      },

      hasAnyPermission: (...permissions) => {
        const { user } = get();
        if (!user) return false;
        if (
          user.email?.toLowerCase() === 'superadmin@ros.com' ||
          user.tenantId === 'tenant-platform' ||
          user.roles?.includes('OWNER')
        ) {
          return true;
        }
        const userPerms = user.permissions || [];
        return permissions.some((p) => userPerms.includes(p));
      },

      hasRole: (role) => {
        const { user } = get();
        if (!user) return false;
        const roles = user.roles || (user.role ? [user.role] : []);
        return roles.includes(role);
      },
    }),
    {
      name: 'ros-auth',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
