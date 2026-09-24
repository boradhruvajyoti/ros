// =============================================================================
// Audit middleware — Log sensitive operations automatically
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

export interface AuditContext {
  action: string;
  entity: string;
  entityId?: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
}

declare global {
  namespace Express {
    interface Request {
      auditContext?: AuditContext;
    }
  }
}

/**
 * Write an audit log entry.
 * Called explicitly from controllers for sensitive operations.
 * Fire-and-forget (does not block response).
 */
export async function writeAuditLog(
  req?: Request,
  context?: AuditContext
): Promise<void> {
  if (!req?.user || !context) return;

  try {
    await prisma.auditLog.create({
      data: {
        tenantId: req.user.tid,
        branchId: req.user.bid || null,
        userId: req.user.sub,
        action: context.action,
        entity: context.entity,
        entityId: context.entityId || null,
        previousValue: context.previousValue ? JSON.stringify(context.previousValue) : undefined,
        newValue: context.newValue ? JSON.stringify(context.newValue) : undefined,
        ipAddress: getClientIp(req),
        userAgent: req.headers?.['user-agent']?.slice(0, 500) || null,
      },
    });
  } catch (err) {
    // Audit failures must never break the main operation
    logger.error(`Audit log write failed: ${err}`);
  }
}

function getClientIp(req?: Request): string {
  if (!req?.headers) return 'unknown';
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

// Audit action constants
export const AuditActions = {
  // Auth
  LOGIN: 'AUTH_LOGIN',
  LOGOUT: 'AUTH_LOGOUT',
  LOGIN_FAILED: 'AUTH_LOGIN_FAILED',
  PASSWORD_RESET: 'AUTH_PASSWORD_RESET',
  // Orders
  ORDER_CREATE: 'ORDER_CREATE',
  ORDER_UPDATE: 'ORDER_UPDATE',
  ORDER_CANCEL: 'ORDER_CANCEL',
  ORDER_VOID: 'ORDER_VOID',
  ORDER_ITEM_VOID: 'ORDER_ITEM_VOID',
  ORDER_STATUS_CHANGE: 'ORDER_STATUS_CHANGE',
  ORDER_DISCOUNT: 'ORDER_DISCOUNT',
  // Payments
  PAYMENT_CREATE: 'PAYMENT_CREATE',
  PAYMENT_REFUND: 'PAYMENT_REFUND',
  // Inventory
  INVENTORY_ADJUST: 'INVENTORY_ADJUST',
  STOCK_COUNT_APPROVE: 'STOCK_COUNT_APPROVE',
  // Users / Permissions
  USER_CREATE: 'USER_CREATE',
  USER_ROLE_CHANGE: 'USER_ROLE_CHANGE',
  USER_DEACTIVATE: 'USER_DEACTIVATE',
  // Settings
  TAX_CONFIG_CHANGE: 'TAX_CONFIG_CHANGE',
  // Cash
  CASH_OPEN: 'CASH_OPEN',
  CASH_CLOSE: 'CASH_CLOSE',
  CASH_ADJUST: 'CASH_ADJUST',
  // Expenses
  EXPENSE_APPROVE: 'EXPENSE_APPROVE',
} as const;
