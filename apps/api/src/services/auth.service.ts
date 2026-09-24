// =============================================================================
// Auth Service — login, logout, refresh token, password reset
// =============================================================================

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { AppError } from '../middlewares/error.middleware';
import { ErrorCodes, type Permission } from '@ros/shared-types';
import { generateUUID } from '@ros/utils';
import { logger } from '../lib/logger';

const ACCESS_EXPIRY  = process.env.JWT_ACCESS_EXPIRY  || '7d';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '30d';
const REFRESH_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

export class AuthService {
  /** Authenticate user credentials, return tokens */
  static async login(
    email: string,
    password: string,
    requestedBranchId?: string,
    deviceInfo?: string,
    ipAddress?: string
  ) {
    const normalizedEmail = email.toLowerCase().trim();

    // Find all active users with this email
    const users = await prisma.user.findMany({
      where: { email: normalizedEmail, isActive: true, deletedAt: null },
      include: {
        tenant: { select: { id: true, name: true, slug: true, status: true } },
        branchRoles: {
          include: {
            branch: { select: { id: true, name: true } },
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!users || users.length === 0) {
      throw new AppError(ErrorCodes.INVALID_CREDENTIALS, 'Invalid email or password', 401);
    }

    // Match password against candidate accounts
    let authenticatedUser: (typeof users)[0] | null = null;
    for (const u of users) {
      const isMatch = await bcrypt.compare(password, u.passwordHash);
      if (isMatch) {
        authenticatedUser = u;
        break;
      }
    }

    if (!authenticatedUser) {
      throw new AppError(ErrorCodes.INVALID_CREDENTIALS, 'Invalid email or password', 401);
    }

    const user = authenticatedUser;

    // Determine target branch
    let activeBranchId = requestedBranchId;
    if (!activeBranchId && user.branchRoles.length > 0) {
      activeBranchId = user.branchRoles[0].branchId;
    }
    if (!activeBranchId) {
      const fallbackBranch = await prisma.branch.findFirst({
        where: { tenantId: user.tenantId, isActive: true },
      });
      activeBranchId = fallbackBranch ? fallbackBranch.id : 'default-branch';
    }

    // Filter or aggregate roles
    const matchingRoles = requestedBranchId
      ? user.branchRoles.filter((ubr) => ubr.branchId === requestedBranchId)
      : user.branchRoles;

    const roles = Array.from(new Set(matchingRoles.map((ubr) => ubr.role.name)));
    const permissionSet = new Set<string>();
    matchingRoles.forEach((ubr) => {
      ubr.role.permissions.forEach((rp) => permissionSet.add(rp.permission.code));
    });

    // Check if user is the true platform super administrator
    const isPlatformSuperAdmin =
      user.email?.toLowerCase() === 'superadmin@ros.com' || user.tenantId === 'tenant-platform';

    // If user is superadmin or has OWNER/ADMIN role, ensure active restaurant permissions
    if (roles.includes('SUPER_ADMIN') || roles.includes('OWNER') || roles.includes('ADMINISTRATOR')) {
      const allPerms = await prisma.permission.findMany();
      allPerms.forEach((p) => {
        // Strip platform-level tenant management from restaurant owners/admins
        if (p.code === 'tenants:manage' && !isPlatformSuperAdmin) {
          return;
        }
        permissionSet.add(p.code);
      });
    }

    const permissions = Array.from(permissionSet) as Permission[];

    // Issue access token
    const jti = generateUUID();
    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        tid: user.tenantId,
        bid: activeBranchId,
        roles,
        permissions,
        jti,
      },
      process.env.JWT_SECRET!,
      { expiresIn: ACCESS_EXPIRY as any }
    );

    // Issue refresh token (opaque, stored as SHA-256 hash)
    const refreshToken = generateUUID() + '-' + generateUUID();
    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshHash,
        deviceInfo: deviceInfo?.slice(0, 500),
        ipAddress: ipAddress?.slice(0, 50),
        expiresAt: new Date(Date.now() + REFRESH_EXPIRY_MS),
      },
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        tenantId: user.tenantId,
        tenantName: user.tenant.name,
        activeBranchId,
        branchId: activeBranchId,
        roles,
        permissions,
      },
    };
  }

  /** Rotate refresh token — revoke old, issue new pair */
  static async refresh(refreshToken: string, deviceInfo?: string, ipAddress?: string) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new AppError(ErrorCodes.TOKEN_INVALID, 'Refresh token is invalid or expired', 401);
    }

    if (!stored.user.isActive || stored.user.deletedAt) {
      throw new AppError(ErrorCodes.UNAUTHORIZED, 'User account is deactivated', 401);
    }

    // Revoke the used token (rotation)
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    // Re-load permissions (they may have changed since last login)
    const branchRoles = await prisma.userBranchRole.findMany({
      where: { userId: stored.userId },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });

    const roles = branchRoles.map((ubr) => ubr.role.name);
    const permissionSet = new Set<string>();
    branchRoles.forEach((ubr) =>
      ubr.role.permissions.forEach((rp) => permissionSet.add(rp.permission.code))
    );
    const permissions = Array.from(permissionSet) as Permission[];

    // Determine active branch from existing token context
    // (we use first branch role — in prod the client should send branchId)
    const branchId = branchRoles[0]?.branchId || stored.user.tenantId;

    const jti = generateUUID();
    const accessToken = jwt.sign(
      { sub: stored.userId, tid: stored.user.tenantId, bid: branchId, roles, permissions, jti },
      process.env.JWT_SECRET!,
      { expiresIn: ACCESS_EXPIRY as any }
    );

    const newRefreshToken = generateUUID() + '-' + generateUUID();
    const newRefreshHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

    await prisma.refreshToken.create({
      data: {
        userId: stored.userId,
        tokenHash: newRefreshHash,
        deviceInfo: deviceInfo?.slice(0, 500),
        ipAddress: ipAddress?.slice(0, 50),
        expiresAt: new Date(Date.now() + REFRESH_EXPIRY_MS),
      },
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  /** Revoke a refresh token (logout) */
  static async logout(refreshToken: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Initiate password reset — returns reset token (send via email in prod) */
  static async forgotPassword(email: string) {
    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase().trim(), deletedAt: null },
    });

    // Always return success to prevent email enumeration
    if (!user) return { message: 'If that email exists, a reset link was sent.' };

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Store in Redis with 1-hour expiry
    await redis.set(`pwd_reset:${resetHash}`, user.id, 'EX', 3600);

    // In production, send via email adapter. For now, return token in dev mode.
    if (process.env.NODE_ENV === 'development') {
      logger.info(`Password reset token for ${email}: ${resetToken}`);
      return { message: 'Reset link sent.', _devToken: resetToken };
    }

    // TODO: EmailAdapter.sendPasswordReset(user, resetToken);
    return { message: 'If that email exists, a reset link was sent.' };
  }

  /** Complete password reset */
  static async resetPassword(token: string, newPassword: string): Promise<void> {
    const resetHash = crypto.createHash('sha256').update(token).digest('hex');
    const userId = await redis.get(`pwd_reset:${resetHash}`);

    if (!userId) {
      throw new AppError('TOKEN_INVALID', 'Password reset token is invalid or expired', 400);
    }

    const hash = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS || '12'));

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hash },
    });

    // Revoke all refresh tokens for this user
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await redis.del(`pwd_reset:${resetHash}`);
  }

  /** Change password (authenticated) */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!valid) {
      throw new AppError(ErrorCodes.INVALID_CREDENTIALS, 'Current password is incorrect', 400);
    }

    const hash = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS || '12'));
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });

    // Revoke all sessions after password change
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Switch active branch within tenant */
  static async switchBranch(userId: string, newBranchId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId, isActive: true },
      include: {
        branchRoles: {
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'User not found', 404);
    }

    const isSuperAdmin = user.branchRoles.some((ubr) => ubr.role.name === 'SUPER_ADMIN');

    // Verify branch belongs to tenant (or user is super admin)
    const branch = await prisma.branch.findFirst({
      where: { id: newBranchId, ...(isSuperAdmin ? {} : { tenantId: user.tenantId }), isActive: true },
    });

    if (!branch) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Branch not found or inactive', 404);
    }

    // Filter roles for the target branch
    const branchSpecificRoles = user.branchRoles.filter((ubr) => ubr.branchId === newBranchId);
    const effectiveBranchRoles = branchSpecificRoles.length > 0 ? branchSpecificRoles : user.branchRoles;

    const roles = isSuperAdmin ? ['SUPER_ADMIN'] : effectiveBranchRoles.map((ubr) => ubr.role.name);
    const permissionSet = new Set<string>();
    effectiveBranchRoles.forEach((ubr) => {
      ubr.role.permissions.forEach((rp) => permissionSet.add(rp.permission.code));
    });

    const permissions = Array.from(permissionSet) as Permission[];

    const jti = generateUUID();
    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        tid: branch.tenantId,
        bid: branch.id,
        roles,
        permissions,
        jti,
      },
      process.env.JWT_SECRET!,
      { expiresIn: ACCESS_EXPIRY as any }
    );

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        tenantId: branch.tenantId,
        branchId: branch.id,
        branchName: branch.name,
        roles,
        permissions,
      },
    };
  }

  /** Switch active tenant context (for Platform Super Admin / Multi-Tenant Owner) */
  static async switchTenant(userId: string, targetTenantId: string, requestedBranchId?: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId, isActive: true },
      include: {
        branchRoles: {
          include: { role: { include: { permissions: { include: { permission: true } } } } },
        },
      },
    });

    if (!user) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'User not found', 404);
    }

    const isPlatformSuperAdmin =
      user.email?.toLowerCase() === 'superadmin@ros.com' || user.tenantId === 'tenant-platform';

    if (!isPlatformSuperAdmin && user.tenantId !== targetTenantId) {
      throw new AppError(ErrorCodes.FORBIDDEN, 'Unauthorized cross-tenant switch: only platform owner can switch workspaces', 403);
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: targetTenantId },
      include: { branches: { where: { isActive: true }, take: 1 } },
    });

    if (!tenant) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Target tenant not found', 404);
    }

    const branch = requestedBranchId
      ? await prisma.branch.findFirst({ where: { id: requestedBranchId, tenantId: targetTenantId, isActive: true } })
      : tenant.branches[0];

    if (!branch) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'No active branch available in target tenant', 404);
    }

    const roles = isPlatformSuperAdmin ? ['SUPER_ADMIN'] : ['OWNER'];
    const allPerms = await prisma.permission.findMany();
    const permissions = allPerms
      .filter((p) => isPlatformSuperAdmin || p.code !== 'tenants:manage')
      .map((p) => p.code) as Permission[];

    const jti = generateUUID();
    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        tid: tenant.id,
        bid: branch.id,
        roles,
        permissions,
        jti,
      },
      process.env.JWT_SECRET!,
      { expiresIn: ACCESS_EXPIRY as any }
    );

    if (isPlatformSuperAdmin && user.tenantId !== targetTenantId) {
      try {
        await prisma.auditLog.create({
          data: {
            tenantId: targetTenantId,
            branchId: branch.id,
            userId: user.id,
            action: 'PLATFORM_SUPERADMIN_ACCESS',
            entity: 'TenantWorkspace',
            entityId: targetTenantId,
            newValue: JSON.stringify({
              operatorEmail: user.email,
              operatorName: user.name,
              reason: 'SuperAdmin workspace impersonation',
              timestamp: new Date().toISOString(),
            }),
          },
        });
      } catch (auditErr) {
        console.warn('Audit logging error:', auditErr);
      }
    }

    return {
      accessToken,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        status: tenant.status,
      },
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        tenantId: tenant.id,
        branchId: branch.id,
        branchName: branch.name,
        roles,
        permissions,
      },
    };
  }

  /** Hash a password for new user creation */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '12'));
  }
}
