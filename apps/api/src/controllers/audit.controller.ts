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
      take: 100,
    });

    sendSuccess(res, logs);
  }
}
