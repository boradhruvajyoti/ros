// =============================================================================
// RBAC middleware — Permission enforcement (server-side, always)
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import type { Permission } from '@ros/shared-types';
import { ErrorCodes } from '@ros/shared-types';
import { AppError } from './error.middleware';

/**
 * Require one or more permissions (ANY — user must have at least one).
 * Use requireAllPermissions() to require ALL.
 */
export function requirePermission(...permissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError(ErrorCodes.UNAUTHORIZED, 'Not authenticated', 401));
    }

    const userPerms = new Set(req.user.permissions);
    const hasPermission = permissions.some((p) => userPerms.has(p));

    // Super admins bypass all permission checks
    if (req.user.roles.includes('SUPER_ADMIN') || hasPermission) {
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

    if (req.user.roles.includes('SUPER_ADMIN')) return next();

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
