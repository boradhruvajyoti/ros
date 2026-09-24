// =============================================================================
// Super Admin SaaS Platform Controller (Multi-Tenant Management)
// =============================================================================

import { Request, Response } from 'express';
import { sendSuccess, AppError } from '../middlewares/error.middleware';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

export class SuperAdminController {
  static async getOverview(req: Request, res: Response): Promise<void> {
    const tenants = await prisma.tenant.findMany({
      include: {
        branches: true,
        _count: {
          select: { users: true, orders: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const metrics = {
      totalTenants: tenants.length,
      activeTenants: tenants.filter((t) => t.status === 'ACTIVE').length,
      monthlyRecurringRevenue: tenants.length * 4999, // INR
      totalOrdersProcessed: tenants.reduce((s, t) => s + t._count.orders, 0),
      systemUptime: '99.98%',
      databaseLatencyMs: 4.2,
      tenants: tenants.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        plan: t.plan,
        status: t.status,
        branchesCount: t.branches.length,
        usersCount: t._count.users,
        ordersCount: t._count.orders,
        createdAt: t.createdAt,
      })),
    };

    sendSuccess(res, metrics);
  }

  static async listTenants(req: Request, res: Response): Promise<void> {
    const tenants = await prisma.tenant.findMany({
      include: {
        branches: true,
        _count: {
          select: { users: true, orders: true, restaurantTables: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    sendSuccess(res, tenants);
  }

  static async provisionTenant(req: Request, res: Response): Promise<void> {
    const { name, slug, plan, adminEmail, adminName, adminPassword } = req.body;

    if (!name || !slug) {
      throw new AppError('VALIDATION_ERROR', 'name and slug are required', 400);
    }

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const existing = await prisma.tenant.findUnique({ where: { slug: cleanSlug } });
    if (existing) {
      throw new AppError('DUPLICATE_ENTRY', `Tenant with slug '${cleanSlug}' already exists`, 409);
    }

    const allPerms = await prisma.permission.findMany();

    const newTenant = await prisma.$transaction(async (tx) => {
      // 1. Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          name,
          slug: cleanSlug,
          plan: plan || 'professional',
          status: 'ACTIVE',
          settings: JSON.stringify({ currency: 'INR', theme: 'dark', kotAutoPrint: true }),
        },
      });

      // 2. Create Default Flagship Branch
      const branch = await tx.branch.create({
        data: {
          tenantId: tenant.id,
          name: `${name} - Main Branch`,
          timezone: 'Asia/Kolkata',
          currency: 'INR',
          settings: JSON.stringify({ openingHours: '11:00 - 23:00' }),
        },
      });

      // 3. Seed Standard Roles for this Tenant
      const allPermIds = allPerms.map((p) => p.id);
      const permMap = new Map(allPerms.map((p) => [p.code, p.id]));
      const getPermIds = (codes: string[]) => codes.map((c) => permMap.get(c)).filter(Boolean) as string[];

      const rolesToSeed = [
        { name: 'SUPER_ADMIN', perms: allPermIds },
        { name: 'OWNER', perms: allPerms.filter((p) => p.code !== 'tenants:manage').map((p) => p.id) },
        { name: 'ADMINISTRATOR', perms: allPerms.filter((p) => p.code !== 'tenants:manage').map((p) => p.id) },
        { name: 'GENERAL_MANAGER', perms: allPerms.filter((p) => !['tenants:manage', 'users:delete', 'roles:create', 'roles:edit'].includes(p.code)).map((p) => p.id) },
        { name: 'BRANCH_MANAGER', perms: getPermIds(['orders:view', 'orders:create', 'orders:edit', 'orders:cancel', 'payments:view', 'payments:create', 'menu:view', 'menu:edit', 'tables:view', 'tables:create', 'tables:edit', 'reservations:view', 'kitchen:view', 'inventory:view', 'inventory:adjust', 'reports:view']) },
        { name: 'ACCOUNTANT', perms: getPermIds(['orders:view', 'payments:view', 'payments:create', 'expenses:view', 'expenses:create', 'payroll:view', 'reports:view', 'reports:export']) },
        { name: 'CASHIER', perms: getPermIds(['orders:view', 'orders:create', 'orders:edit', 'payments:view', 'payments:create', 'menu:view', 'tables:view', 'tables:edit', 'cash:view', 'cash:open', 'cash:close', 'discount:apply', 'reports:view']) },
        { name: 'WAITER', perms: getPermIds(['orders:view', 'orders:create', 'orders:edit', 'menu:view', 'tables:view', 'tables:edit', 'reservations:view', 'kitchen:view']) },
        { name: 'CHEF', perms: getPermIds(['kitchen:view', 'kitchen:update', 'orders:view', 'menu:view', 'menu:edit', 'inventory:view', 'inventory:adjust']) },
        { name: 'KITCHEN_STAFF', perms: getPermIds(['kitchen:view', 'kitchen:update', 'orders:view', 'inventory:view']) },
        { name: 'INVENTORY_MANAGER', perms: getPermIds(['inventory:view', 'inventory:adjust', 'inventory:count', 'inventory:transfer', 'procurement:view', 'procurement:receive', 'menu:view']) },
        { name: 'PROCUREMENT_MANAGER', perms: getPermIds(['procurement:view', 'procurement:create', 'procurement:approve', 'procurement:receive', 'inventory:view', 'expenses:view']) },
        { name: 'DELIVERY_STAFF', perms: getPermIds(['orders:view', 'orders:edit', 'customers:view']) },
        { name: 'PLATFORM_SUPPORT', perms: getPermIds(['branches:view', 'orders:view', 'reports:view', 'settings:view']) },
      ];

      const createdRoles: Record<string, any> = {};
      for (const r of rolesToSeed) {
        const role = await tx.role.create({
          data: { tenantId: tenant.id, name: r.name, isSystemRole: true },
        });
        if (r.perms.length > 0) {
          await tx.rolePermission.createMany({
            data: [...new Set(r.perms)].map((permissionId) => ({ roleId: role.id, permissionId })),
          });
        }
        createdRoles[r.name] = role;
      }

      // 4. Create Owner User if email provided
      const targetEmail = (adminEmail || `admin@${cleanSlug}.com`).toLowerCase().trim();
      const targetPassword = adminPassword || 'Admin@1234';
      const passwordHash = await bcrypt.hash(targetPassword, 12);

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name: adminName || `${name} Owner`,
          email: targetEmail,
          passwordHash,
          isActive: true,
        },
      });

      const adminRole = createdRoles['OWNER'] || createdRoles['ADMINISTRATOR'];
      await tx.userBranchRole.create({
        data: {
          userId: user.id,
          branchId: branch.id,
          roleId: adminRole.id,
        },
      });

      // 5. Default Kitchen Stations
      await tx.kitchenStation.createMany({
        data: [
          { tenantId: tenant.id, branchId: branch.id, name: 'Main Kitchen', displayColor: '#EF4444', sortOrder: 1 },
          { tenantId: tenant.id, branchId: branch.id, name: 'Beverage Bar', displayColor: '#3B82F6', sortOrder: 2 },
        ],
      });

      // 6. Default Menu Category
      await tx.menuCategory.create({
        data: {
          tenantId: tenant.id,
          name: 'Signature Dishes',
          sortOrder: 1,
        },
      });

      return { tenant, branch, adminUser: { email: user.email, name: user.name } };
    });

    sendSuccess(
      res,
      {
        ...newTenant,
        message: `Tenant '${name}' provisioned with default branch, roles, admin user, and kitchen stations.`,
      },
      201
    );
  }

  static async updateTenantStatus(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { status, plan } = req.body;

    const updated = await prisma.tenant.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(plan ? { plan } : {}),
      },
    });

    sendSuccess(res, updated);
  }

  static async getCurrentTenant(req: Request, res: Response): Promise<void> {
    const tenantId = req.user?.tid;
    if (!tenantId) throw new AppError('UNAUTHORIZED', 'No tenant context', 401);

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        branches: { where: { isActive: true } },
        _count: { select: { users: true, orders: true, restaurantTables: true } },
      },
    });

    if (!tenant) throw new AppError('NOT_FOUND', 'Tenant not found', 404);
    sendSuccess(res, tenant);
  }

  static async updateCurrentTenant(req: Request, res: Response): Promise<void> {
    const tenantId = req.user?.tid;
    if (!tenantId) throw new AppError('UNAUTHORIZED', 'No tenant context', 401);

    const { name, logoUrl, settings } = req.body;

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(name ? { name } : {}),
        ...(logoUrl !== undefined ? { logoUrl } : {}),
        ...(settings ? { settings: typeof settings === 'string' ? settings : JSON.stringify(settings) } : {}),
      },
    });

    sendSuccess(res, updated);
  }
}

