// =============================================================================
// Auth store — Zustand with persist & safe fallback
// =============================================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Permission } from '@ros/shared-types';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  tenantId: string;
  branchId: string;
  roles?: string[];
  role?: string;
  permissions?: Permission[];
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;

  setAuth: (token: string, user: Partial<AuthUser> & { id: string; name: string; email: string }) => void;
  setAccessToken: (token: string) => void;
  setHasHydrated: (state: boolean) => void;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (...permissions: Permission[]) => boolean;
  hasRole: (role: string) => boolean;
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
          branchId: user.branchId || 'branch-default',
          roles,
          permissions,
        };

        set({ accessToken: token, user: normalizedUser, isAuthenticated: true });
      },

      setAccessToken: (token) => set({ accessToken: token }),

      logout: () => set({ accessToken: null, user: null, isAuthenticated: false }),

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
