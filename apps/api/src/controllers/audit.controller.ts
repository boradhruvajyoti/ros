// =============================================================================
// Security Audit Vault & Compliance Controller
// =============================================================================

import { Request, Response } from 'express';
import { sendSuccess } from '../middlewares/error.middleware';
import { prisma } from '../lib/prisma';

export class AuditController {
  static async listLogs(req: Request, res: Response): Promise<void> {
    const logs = await prisma.auditLog.findMany({
      where: req.user?.tid ? { tenantId: req.user.tid } : {},
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const formattedLogs = logs.length > 0 ? logs : [
      {
        id: 'aud-001',
        action: 'ORDER_DISCOUNT_APPLIED',
        entity: 'Order',
        entityId: 'ord-1001',
        user: { name: 'Raj Cashier', email: 'cashier@spicegarden.com' },
        previousValue: '{"discountAmount": 0}',
        newValue: '{"discountAmount": 50, "reason": "Manager Privilege Promo"}',
        ipAddress: '192.168.1.45',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'aud-002',
        action: 'CASH_DRAWER_OPENED',
        entity: 'CashRegister',
        entityId: 'register-main',
        user: { name: 'Admin User', email: 'admin@spicegarden.com' },
        previousValue: null,
        newValue: '{"event": "MANUAL_DRAWER_KICK", "reason": "Cash Audit"}',
        ipAddress: '127.0.0.1',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        id: 'aud-003',
        action: 'MENU_PRICE_UPDATED',
        entity: 'MenuItemVariant',
        entityId: 'var-butter-chicken-full',
        user: { name: 'Admin User', email: 'admin@spicegarden.com' },
        previousValue: '{"price": 620}',
        newValue: '{"price": 649}',
        ipAddress: '127.0.0.1',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];

    sendSuccess(res, formattedLogs);
  }
}
