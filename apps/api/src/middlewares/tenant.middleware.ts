// =============================================================================
// Tenant Middleware — Multi-Tenant Resolution, Isolation & Status Enforcement
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from './error.middleware';
import { ErrorCodes } from '@ros/shared-types';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      tenant?: {
        id: string;
        name: string;
        slug: string;
        plan: string;
        status: string;
        settings: any;
      };
    }
  }
}

/**
 * Resolves the tenant from JWT context, X-Tenant-ID / X-Tenant-Slug header,
 * verifies tenant exists, checks active lifecycle status, and attaches to req.
 */
export function resolveTenant(options: { required?: boolean } = { required: true }) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1. Identify tenantId candidate
      let tenantId = req.user?.tid;

      if (!tenantId) {
        tenantId = (req.headers['x-tenant-id'] as string) || undefined;
      }

      // If slug passed instead of UUID
      const tenantSlug = req.headers['x-tenant-slug'] as string;

      if (!tenantId && !tenantSlug) {
        if (options.required) {
          return next(new AppError(ErrorCodes.UNAUTHORIZED, 'Tenant context missing', 400));
        }
        return next();
      }

      // 2. Fetch tenant record
      const tenant = await prisma.tenant.findFirst({
        where: {
          ...(tenantId ? { id: tenantId } : { slug: tenantSlug }),
        },
      });

      if (!tenant) {
        return next(new AppError(ErrorCodes.NOT_FOUND, 'Tenant organization not found', 404));
      }

      // 3. Status Enforcement (ACTIVE, TRIAL, SUSPENDED)
      const isSuperAdmin = req.user?.roles?.includes('SUPER_ADMIN');

      if (tenant.status === 'SUSPENDED' && !isSuperAdmin) {
        return next(
          new AppError(
            ErrorCodes.FORBIDDEN,
            'Tenant organization account is suspended. Please contact platform support.',
            403
          )
        );
      }

      // 4. Attach resolved tenant to request context
      req.tenantId = tenant.id;
      req.tenant = {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        status: tenant.status,
        settings: tenant.settings ? JSON.parse(tenant.settings) : {},
      };

      next();
    } catch (err) {
      next(err);
    }
  };
}
