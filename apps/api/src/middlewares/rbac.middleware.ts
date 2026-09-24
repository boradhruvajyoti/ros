// =============================================================================
// RBAC middleware — Permission enforcement (server-side, always)
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import type { Permission } from '@ros/shared-types';
import { ErrorCodes } from '@ros/shared-types';
import { AppError } from './error.middleware';

/**
 * Helper to check if request is authenticated as the true Platform Owner (superadmin@ros.com)
 */
export function isPlatformSuperAdminUser(user?: { email?: string; tid: string; roles: string[] }): boolean {
  if (!user) return false;
  return user.email?.toLowerCase() === 'superadmin@ros.com' || user.tid === 'tenant-platform';
}

/**
 * Require platform-level super administrator authority (strictly superadmin@ros.com or tenant-platform)
 */
export function requirePlatformSuperAdmin() {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError(ErrorCodes.UNAUTHORIZED, 'Not authenticated', 401));
    }

    if (isPlatformSuperAdminUser(req.user)) {
      return next();
    }

    return next(
      new AppError(
        ErrorCodes.FORBIDDEN,
        'Access denied: Only the platform super administrator (superadmin@ros.com) can access this resource.',
        403
      )
    );
  };
}

/**
 * Require one or more permissions (ANY — user must have at least one).
 * Use requireAllPermissions() to require ALL.
 */
export function requirePermission(...permissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError(ErrorCodes.UNAUTHORIZED, 'Not authenticated', 401));
    }

    // Platform Super Admin bypasses all checks
    if (isPlatformSuperAdminUser(req.user)) {
      return next();
    }

    const userPerms = new Set(req.user.permissions);
    const hasPermission = permissions.some((p) => userPerms.has(p));

    if (hasPermission) {
      return next();
    }

    next(
      new AppError(
        ErrorCodes.FORBIDDEN,
        `Missing required permission: ${permissions.join(' or ')}`,
        403
      )
    );
  };
}

/** Require ALL listed permissions */
export function requireAllPermissions(...permissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError(ErrorCodes.UNAUTHORIZED, 'Not authenticated', 401));
    }

    if (isPlatformSuperAdminUser(req.user)) return next();

    const userPerms = new Set(req.user.permissions);
    const missing = permissions.filter((p) => !userPerms.has(p));

    if (missing.length > 0) {
      return next(
        new AppError(
          ErrorCodes.FORBIDDEN,
          `Missing permissions: ${missing.join(', ')}`,
          403
        )
      );
    }

    next();
  };
}

/** Verify the request tenant matches the authenticated user's tenant */
export function requireTenantMatch() {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const requestedTenantId = req.params.tenantId || req.body?.tenantId;
    if (requestedTenantId && req.user?.tid !== requestedTenantId) {
      return next(
        new AppError(ErrorCodes.TENANT_MISMATCH, 'Cross-tenant access denied', 403)
      );
    }
    next();
  };
}
