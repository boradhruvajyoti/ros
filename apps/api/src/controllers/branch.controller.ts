// =============================================================================
// Branch / Outlet Controller — Multi-Outlet Management & Branch Isolation
// =============================================================================

import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendSuccess, AppError } from '../middlewares/error.middleware';
import { writeAuditLog, AuditActions } from '../middlewares/audit.middleware';
import { AuthService } from '../services/auth.service';
import { z } from 'zod';

const createBranchSchema = z.object({
  name: z.string().min(1, 'Branch name is required').max(100),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  gstin: z.string().max(50).optional().nullable(),
  timezone: z.string().default('Asia/Kolkata'),
  currency: z.string().default('INR'),
  isActive: z.boolean().default(true),
  settings: z.record(z.any()).optional().nullable(),
});

const updateBranchSchema = createBranchSchema.partial();

export class BranchController {
  /**
   * List all branches/outlets for the authenticated user's tenant
   */
  static async listBranches(req: Request, res: Response): Promise<void> {
    const isPlatformSuperAdmin =
      req.user?.email?.toLowerCase() === 'superadmin@ros.com' ||
      req.user?.tid === 'tenant-platform';

    const tenantId = req.query.tenantId && isPlatformSuperAdmin
      ? String(req.query.tenantId)
      : req.user!.tid;

    const activeBranchId = (req.headers['x-branch-id'] as string) || req.user?.bid;

    const branches = await prisma.branch.findMany({
      where: {
        ...(tenantId ? { tenantId } : {}),
        ...(isPlatformSuperAdmin && !req.query.includeInactive ? {} : { isActive: true }),
      },
      include: {
        _count: {
          select: {
            restaurantTables: true,
            floors: true,
            kitchenStations: true,
            orders: true,
            userBranchRoles: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const enriched = branches.map((b) => ({
      ...b,
      isActiveBranch: b.id === activeBranchId,
      settings: b.settings ? (typeof b.settings === 'string' ? JSON.parse(b.settings) : b.settings) : {},
    }));

    sendSuccess(res, enriched);
  }

  /**
   * Get single branch details
   */
  static async getBranch(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const isPlatformSuperAdmin =
      req.user?.email?.toLowerCase() === 'superadmin@ros.com' ||
      req.user?.tid === 'tenant-platform';

    const branch = await prisma.branch.findFirst({
      where: {
        id,
        ...(isPlatformSuperAdmin ? {} : { tenantId: req.user!.tid }),
      },
      include: {
        floors: {
          where: { isActive: true },
          include: {
            tables: { where: { isActive: true } },
          },
        },
        kitchenStations: {
          where: { isActive: true },
        },
        taxConfigurations: {
          where: { isActive: true },
        },
        _count: {
          select: {
            orders: true,
            restaurantTables: true,
            userBranchRoles: true,
          },
        },
      },
    });

    if (!branch) {
      throw new AppError('NOT_FOUND', 'Branch outlet not found', 404);
    }

    sendSuccess(res, {
      ...branch,
      settings: branch.settings ? (typeof branch.settings === 'string' ? JSON.parse(branch.settings) : branch.settings) : {},
    });
  }

  /**
   * Create a new branch / outlet for current tenant
   */
  static async createBranch(req: Request, res: Response): Promise<void> {
    const isPlatformSuperAdmin =
      req.user?.email?.toLowerCase() === 'superadmin@ros.com' ||
      req.user?.tid === 'tenant-platform';

    const tenantId = req.body.tenantId && isPlatformSuperAdmin
      ? String(req.body.tenantId)
      : req.user!.tid;

    const dto = createBranchSchema.parse(req.body);

    // 1. Check Tenant Subscription Plan max branches limit
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        branches: { where: { isActive: true } },
      },
    });

    if (!tenant) {
      throw new AppError('NOT_FOUND', 'Tenant organization not found', 404);
    }

    let maxBranches = 1; // starter default
    if (tenant.plan === 'growth') maxBranches = 5;
    else if (tenant.plan === 'enterprise' || tenant.plan === 'franchise' || tenant.plan === 'custom') maxBranches = 999;
    else if (tenant.plan === 'starter') maxBranches = 1;

    // Check custom settings override if configured
    if (tenant.settings) {
      try {
        const parsed = typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : tenant.settings;
        if (parsed.maxBranches !== undefined) {
          maxBranches = Number(parsed.maxBranches);
        }
      } catch {}
    }

    if (!isPlatformSuperAdmin && tenant.branches.length >= maxBranches) {
      throw new AppError(
        'PLAN_LIMIT_EXCEEDED',
        `Your current '${tenant.plan.toUpperCase()}' subscription plan allows up to ${maxBranches} outlet(s). Please upgrade to Growth or Enterprise for additional multi-outlet branches.`,
        403
      );
    }

    // 2. Create branch & default resources in transaction
    const createdBranch = await prisma.$transaction(async (tx) => {
      const branch = await tx.branch.create({
        data: {
          tenantId,
          name: dto.name,
          address: dto.address || null,
          phone: dto.phone || null,
          email: dto.email || null,
          gstin: dto.gstin || null,
          timezone: dto.timezone || 'Asia/Kolkata',
          currency: dto.currency || 'INR',
          isActive: dto.isActive ?? true,
          settings: dto.settings ? JSON.stringify(dto.settings) : null,
        },
      });

      // Seed standard Floor for this branch
      const floor = await tx.floor.create({
        data: {
          tenantId,
          branchId: branch.id,
          name: 'Ground Floor',
          sortOrder: 1,
          isActive: true,
        },
      });

      // Seed initial tables for this floor
      await tx.restaurantTable.createMany({
        data: [
          { tenantId, branchId: branch.id, floorId: floor.id, name: 'Table T-01', capacity: 4, shape: 'RECTANGLE', posX: 80, posY: 80, status: 'AVAILABLE', qrCodeToken: `qr-${branch.id.slice(0, 4)}-t01` },
          { tenantId, branchId: branch.id, floorId: floor.id, name: 'Table T-02', capacity: 4, shape: 'RECTANGLE', posX: 240, posY: 80, status: 'AVAILABLE', qrCodeToken: `qr-${branch.id.slice(0, 4)}-t02` },
          { tenantId, branchId: branch.id, floorId: floor.id, name: 'Table T-03', capacity: 2, shape: 'CIRCLE', posX: 80, posY: 220, status: 'AVAILABLE', qrCodeToken: `qr-${branch.id.slice(0, 4)}-t03` },
          { tenantId, branchId: branch.id, floorId: floor.id, name: 'Table T-04', capacity: 6, shape: 'RECTANGLE', posX: 240, posY: 220, status: 'AVAILABLE', qrCodeToken: `qr-${branch.id.slice(0, 4)}-t04` },
        ],
      });

      // Seed standard kitchen stations for this branch
      await tx.kitchenStation.createMany({
        data: [
          { tenantId, branchId: branch.id, name: 'Main Kitchen', displayColor: '#EF4444', sortOrder: 1, isActive: true },
          { tenantId, branchId: branch.id, name: 'Beverage Bar', displayColor: '#3B82F6', sortOrder: 2, isActive: true },
        ],
      });

      // Seed tax configurations if none exist
      const existingTaxes = await tx.taxConfiguration.findFirst({
        where: { tenantId, branchId: branch.id },
      });
      if (!existingTaxes) {
        await tx.taxConfiguration.createMany({
          data: [
            { tenantId, branchId: branch.id, name: 'CGST (2.5%)', rate: 2.5, isInclusive: false, isActive: true },
            { tenantId, branchId: branch.id, name: 'SGST (2.5%)', rate: 2.5, isInclusive: false, isActive: true },
          ],
        });
      }

      // Assign current user & any tenant owners/admins to this branch
      const adminUsers = await tx.user.findMany({
        where: {
          tenantId,
          isActive: true,
        },
        include: {
          branchRoles: {
            include: { role: true },
          },
        },
      });

      for (const usr of adminUsers) {
        const ownerOrAdminRole = usr.branchRoles.find(
          (br) => br.role.name === 'OWNER' || br.role.name === 'ADMINISTRATOR' || br.role.name === 'SUPER_ADMIN'
        )?.role;

        if (ownerOrAdminRole) {
          await tx.userBranchRole.upsert({
            where: {
              userId_branchId_roleId: {
                userId: usr.id,
                branchId: branch.id,
                roleId: ownerOrAdminRole.id,
              },
            },
            update: {},
            create: {
              userId: usr.id,
              branchId: branch.id,
              roleId: ownerOrAdminRole.id,
            },
          });
        }
      }

      return branch;
    });

    await writeAuditLog(req, {
      action: AuditActions.BRANCH_CREATE,
      entity: 'Branch',
      entityId: createdBranch.id,
      newValue: { name: createdBranch.name },
    });

    sendSuccess(res, createdBranch, 201);
  }

  /**
   * Update branch / outlet details
   */
  static async updateBranch(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const isPlatformSuperAdmin =
      req.user?.email?.toLowerCase() === 'superadmin@ros.com' ||
      req.user?.tid === 'tenant-platform';

    const existing = await prisma.branch.findFirst({
      where: {
        id,
        ...(isPlatformSuperAdmin ? {} : { tenantId: req.user!.tid }),
      },
    });

    if (!existing) {
      throw new AppError('NOT_FOUND', 'Branch outlet not found', 404);
    }

    const dto = updateBranchSchema.parse(req.body);

    const updated = await prisma.branch.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.email !== undefined ? { email: dto.email || null } : {}),
        ...(dto.gstin !== undefined ? { gstin: dto.gstin } : {}),
        ...(dto.timezone !== undefined ? { timezone: dto.timezone } : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.settings !== undefined ? { settings: dto.settings ? JSON.stringify(dto.settings) : null } : {}),
      },
    });

    await writeAuditLog(req, {
      action: AuditActions.BRANCH_UPDATE,
      entity: 'Branch',
      entityId: id,
      previousValue: { name: existing.name, isActive: existing.isActive },
      newValue: { name: updated.name, isActive: updated.isActive },
    });

    sendSuccess(res, updated);
  }

  /**
   * Delete or deactivate branch outlet
   */
  static async deleteBranch(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const isPlatformSuperAdmin =
      req.user?.email?.toLowerCase() === 'superadmin@ros.com' ||
      req.user?.tid === 'tenant-platform';

    const existing = await prisma.branch.findFirst({
      where: {
        id,
        ...(isPlatformSuperAdmin ? {} : { tenantId: req.user!.tid }),
      },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });

    if (!existing) {
      throw new AppError('NOT_FOUND', 'Branch outlet not found', 404);
    }

    // Ensure tenant has at least one other active branch
    const otherBranches = await prisma.branch.count({
      where: {
        tenantId: existing.tenantId,
        id: { not: id },
        isActive: true,
      },
    });

    if (otherBranches === 0) {
      throw new AppError('VALIDATION_ERROR', 'Cannot delete or disable the only active outlet of your restaurant.', 400);
    }

    // Check for active unsettled orders
    const activeOrders = await prisma.order.count({
      where: {
        branchId: id,
        status: { in: ['DRAFT', 'CONFIRMED', 'SENT_TO_KITCHEN', 'PREPARING', 'READY', 'SERVED', 'BILLED', 'PARTIALLY_PAID'] },
      },
    });

    if (activeOrders > 0) {
      throw new AppError(
        'VALIDATION_ERROR',
        `Cannot remove outlet while ${activeOrders} order(s) are active or unbilled. Please settle or cancel active orders first.`,
        400
      );
    }

    // Soft delete
    const deactivated = await prisma.branch.update({
      where: { id },
      data: { isActive: false },
    });

    await writeAuditLog(req, {
      action: AuditActions.BRANCH_DEACTIVATE,
      entity: 'Branch',
      entityId: id,
      previousValue: { isActive: true },
      newValue: { isActive: false },
    });

    sendSuccess(res, { message: `Outlet '${deactivated.name}' has been archived.` });
  }

  /**
   * Switch active branch session
   */
  static async switchBranch(req: Request, res: Response): Promise<void> {
    const { branchId } = req.body;
    if (!branchId) throw new AppError('VALIDATION_ERROR', 'branchId is required', 400);

    const result = await AuthService.switchBranch(req.user!.sub, branchId);
    sendSuccess(res, result);
  }

  /**
   * Get operational KPI stats for a branch
   */
  static async getBranchStats(req: Request, res: Response): Promise<void> {
    const branchId = req.params.id || req.user?.bid;
    if (!branchId) throw new AppError('VALIDATION_ERROR', 'Branch ID required', 400);

    const tenantId = req.user!.tid;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayOrders, activeTablesCount, totalTablesCount, activeKotsCount, employeesCount] = await Promise.all([
      prisma.order.findMany({
        where: {
          tenantId,
          branchId,
          createdAt: { gte: today },
          status: { notIn: ['CANCELLED', 'VOIDED'] },
        },
        select: { total: true, status: true },
      }),
      prisma.restaurantTable.count({
        where: { tenantId, branchId, status: 'OCCUPIED', isActive: true },
      }),
      prisma.restaurantTable.count({
        where: { tenantId, branchId, isActive: true },
      }),
      prisma.orderKot.count({
        where: { branchId, status: { in: ['NEW', 'ACCEPTED', 'PREPARING', 'READY'] } },
      }),
      prisma.employee.count({
        where: { tenantId, branchId, isActive: true },
      }),
    ]);

    const todayRevenue = todayOrders
      .filter((o) => o.status === 'PAID' || o.status === 'COMPLETED')
      .reduce((sum, o) => sum + Number(o.total || 0), 0);

    sendSuccess(res, {
      branchId,
      todayRevenue,
      todayOrdersCount: todayOrders.length,
      occupiedTables: activeTablesCount,
      totalTables: totalTablesCount,
      tableOccupancyRate: totalTablesCount > 0 ? Math.round((activeTablesCount / totalTablesCount) * 100) : 0,
      activeKitchenTickets: activeKotsCount,
      staffCount: employeesCount,
    });
  }
}
