// =============================================================================
// Typed API client — wraps axios with auth header injection
// =============================================================================

import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import type { ApiResponse, ApiSuccess } from '@ros/shared-types';
import { useAuthStore } from '@/stores/auth.store';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: BASE_URL,
    withCredentials: true, // needed for refresh token cookie
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
  });

  // ── Request interceptor — inject access token & tenant context ───────
  client.interceptors.request.use((config) => {
    const authState = useAuthStore.getState();
    const token = authState.accessToken;
    const user = authState.user;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (user?.tenantId) {
      config.headers['X-Tenant-ID'] = user.tenantId;
    }
    if (user?.branchId) {
      config.headers['X-Branch-ID'] = user.branchId;
    }
    return config;
  });

  // ── Response interceptor — handle 401, refresh token ─────────────────
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const original = error.config;
      const url = original?.url || '';

      const isAuthEndpoint =
        url.includes('/auth/login') ||
        url.includes('/auth/refresh') ||
        url.includes('/auth/onboard') ||
        url.includes('/auth/parse-menu');

      if (error.response?.status === 401 && !original?._retry && !isAuthEndpoint) {
        original._retry = true;
        try {
          const res = await client.post<ApiSuccess<{ accessToken: string }>>('/auth/refresh');
          const newToken = res.data.data.accessToken;
          useAuthStore.getState().setAccessToken(newToken);
          original.headers.Authorization = `Bearer ${newToken}`;
          return client(original);
        } catch {
          const authState = useAuthStore.getState();
          if (authState.isAuthenticated) {
            authState.logout();
          }
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/onboard')) {
            window.location.href = '/login';
          }
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
}

export const api = createApiClient();

// ── Typed request helpers ─────────────────────────────────────────────────

export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await api.get<ApiSuccess<T>>(url, config);
  return res.data.data;
}

export async function apiPost<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await api.post<ApiSuccess<T>>(url, data, config);
  return res.data.data;
}

export async function apiPatch<T>(url: string, data?: unknown): Promise<T> {
  const res = await api.patch<ApiSuccess<T>>(url, data);
  return res.data.data;
}

export async function apiDelete<T = void>(url: string): Promise<T> {
  const res = await api.delete<ApiSuccess<T>>(url);
  return res.data.data;
}
