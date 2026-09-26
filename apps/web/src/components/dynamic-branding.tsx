'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

export function DynamicBranding() {
  const user = useAuthStore((s) => s.user);
  const isPlatformSuperAdmin =
    user?.email?.toLowerCase() === 'superadmin@ros.com' ||
    user?.tenantId === 'tenant-platform';

  // Load platform details
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
    staleTime: 1000 * 60 * 5,
  });

  // Load current tenant details if restaurant user
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

  useEffect(() => {
    let faviconUrl = '';
    let parsedTenantSettings: any = {};
    try {
      parsedTenantSettings =
        typeof currentTenant?.settings === 'string'
          ? JSON.parse(currentTenant.settings)
          : currentTenant?.settings || {};
    } catch {}

    if (isPlatformSuperAdmin) {
      faviconUrl = platformDetails?.faviconUrl || parsedTenantSettings?.faviconUrl || currentTenant?.logoUrl || '';
    } else {
      faviconUrl = parsedTenantSettings?.faviconUrl || currentTenant?.logoUrl || platformDetails?.faviconUrl || '';
    }

    if (faviconUrl) {
      // Find or create favicon links
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = faviconUrl;

      // Also update shortcut icon and apple-touch-icon
      let shortcutLink: HTMLLinkElement | null = document.querySelector("link[rel='shortcut icon']");
      if (!shortcutLink) {
        shortcutLink = document.createElement('link');
        shortcutLink.rel = 'shortcut icon';
        document.head.appendChild(shortcutLink);
      }
      shortcutLink.href = faviconUrl;

      let appleLink: HTMLLinkElement | null = document.querySelector("link[rel='apple-touch-icon']");
      if (!appleLink) {
        appleLink = document.createElement('link');
        appleLink.rel = 'apple-touch-icon';
        document.head.appendChild(appleLink);
      }
      appleLink.href = faviconUrl;
    }
  }, [platformDetails, currentTenant, isPlatformSuperAdmin]);

  return null;
}
