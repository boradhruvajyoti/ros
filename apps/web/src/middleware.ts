import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const RESERVED_SUBDOMAINS = new Set([
  'www',
  'api',
  'app',
  'admin',
  'pos',
  'mail',
  'minio',
  'ws',
  'localhost',
]);

const RESERVED_INTERNAL_ROUTES = new Set([
  'dashboard',
  'pos',
  'orders',
  'order-history',
  'kitchen',
  'kds',
  'tables',
  'settings',
  'menu',
  'inventory',
  'customers',
  'reports',
  'login',
  'register',
  'onboard',
  'kiosk',
  'drivethru',
  'marketing',
  'super-admin',
  'reservations',
]);

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const host = (request.headers.get('host') || '').toLowerCase().split(':')[0];
  const baseDomain = (process.env.NEXT_PUBLIC_APP_DOMAIN || 'oxomsoft.com').toLowerCase();

  let subdomain: string | null = null;

  if (host.endsWith(`.${baseDomain}`)) {
    const sub = host.slice(0, -(baseDomain.length + 1));
    if (sub && !RESERVED_SUBDOMAINS.has(sub)) {
      subdomain = sub;
    }
  } else if (host.endsWith('.localhost')) {
    const sub = host.slice(0, -'.localhost'.length);
    if (sub && !RESERVED_SUBDOMAINS.has(sub)) {
      subdomain = sub;
    }
  }

  // If request is from a tenant subdomain (e.g. devils-kitchen.oxomsoft.com)
  if (subdomain) {
    const pathname = url.pathname;

    // Static assets & internal next paths pass through
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api') ||
      pathname.includes('.') // static files like favicon.ico, images, etc.
    ) {
      return NextResponse.next();
    }

    const firstSegment = pathname.split('/')[1];

    // If visiting the root of tenant subdomain (e.g. devils-kitchen.oxomsoft.com/)
    if (pathname === '/' || pathname === '') {
      // Rewrite to /[slug] route which renders the restaurant's public landing & digital menu
      url.pathname = `/${subdomain}`;
      const response = NextResponse.rewrite(url);
      response.headers.set('x-tenant-slug', subdomain);
      return response;
    }

    // If path is a subpath of tenant menu (e.g., /track or /order)
    if (pathname.startsWith('/track') || pathname.startsWith('/order')) {
      url.pathname = `/${subdomain}${pathname}`;
      const response = NextResponse.rewrite(url);
      response.headers.set('x-tenant-slug', subdomain);
      return response;
    }

    // If accessing internal app shell pages on the subdomain (e.g. /dashboard, /login)
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-tenant-slug', subdomain);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
