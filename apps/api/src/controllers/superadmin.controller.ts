// =============================================================================
// Super Admin SaaS Platform Controller (Multi-Tenant Management)
// =============================================================================

import { Request, Response } from 'express';
import { sendSuccess, AppError } from '../middlewares/error.middleware';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

export interface SaasPlanItem {
  id: string;
  name: string;
  code: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  description: string;
  features: string[];
  maxBranches: number;
  maxUsers: number;
  maxOrdersPerMonth: number;
  badge?: string;
  isPopular?: boolean;
  isActive: boolean;
}

export interface PlatformConfigData {
  platformName: string;
  tagline: string;
  supportEmail: string;
  supportPhone: string;
  defaultCurrency: string;
  maintenanceMode: boolean;
  announcementBanner: string;
  allowSelfRegistration: boolean;
  maxFreeTrialDays: number;
  edgeApiGatewayUrl: string;
  systemVersion: string;
  environment: string;
  dbEngine: string;
  cacheDriver: string;
}

const DEFAULT_PLANS: SaasPlanItem[] = [
  {
    id: 'plan-starter',
    name: 'Starter Tier',
    code: 'starter',
    price: 2999,
    currency: 'INR',
    interval: 'month',
    description: 'Designed for standalone boutique cafes & quick-service outlets',
    features: [
      '1 Operating Branch Location',
      'Point of Sale (POS) & KOT Engine',
      'Table Management & Billing',
      'Up to 5 Staff User Accounts',
      'Basic Reports & Analytics',
    ],
    maxBranches: 1,
    maxUsers: 5,
    maxOrdersPerMonth: 2000,
    badge: 'STARTER TIER',
    isPopular: false,
    isActive: true,
  },
  {
    id: 'plan-professional',
    name: 'Professional Tier',
    code: 'professional',
    price: 7999,
    currency: 'INR',
    interval: 'month',
    description: 'Comprehensive suite for multi-station dine-in restaurants',
    features: [
      'Up to 5 Multi-Outlet Branches',
      'Multi-Station KDS & Kitchen Routing',
      'Inventory, GRN & Recipe Yields',
      'QR Contactless Guest Ordering',
      'AI Menu OCR Card Parser',
      'Staff Payroll & Shift Attendance',
    ],
    maxBranches: 5,
    maxUsers: 30,
    maxOrdersPerMonth: 15000,
    badge: 'MOST POPULAR',
    isPopular: true,
    isActive: true,
  },
  {
    id: 'plan-enterprise',
    name: 'Enterprise Cloud',
    code: 'enterprise',
    price: 14999,
    currency: 'INR',
    interval: 'month',
    description: 'Full enterprise power for restaurant chains & franchise HQ',
    features: [
      'Unlimited Outlets & Franchises',
      'Autonomous Delivery Robotics',
      'VIP Face Biometrics & Sommelier Cellar',
      'Dedicated SLA & Priority Cloud Scaling',
      'Custom Domain White-Labeling',
      'Unlimited Staff & Multi-Tenant RBAC',
    ],
    maxBranches: 999,
    maxUsers: 9999,
    maxOrdersPerMonth: 999999,
    badge: 'ENTERPRISE CLOUD',
    isPopular: false,
    isActive: true,
  },
];

const DEFAULT_PLATFORM_CONFIG: PlatformConfigData = {
  platformName: 'Restaurant OS (ROS)',
  tagline: 'Enterprise Multi-Tenant Restaurant Cloud & Point of Sale',
  supportEmail: 'support@rosplatform.io',
  supportPhone: '+91 98765 43210',
  defaultCurrency: 'INR',
  maintenanceMode: false,
  announcementBanner: 'Platform Operational — All Cloud Microservices & Edge POS Nodes Synchronized.',
  allowSelfRegistration: true,
  maxFreeTrialDays: 14,
  edgeApiGatewayUrl: 'https://api.roscloud.net/v1',
  systemVersion: 'v2.6.4-prod',
  environment: 'production',
  dbEngine: 'SQLite 3 / Prisma Engine 5.22',
  cacheDriver: 'In-Memory High-Speed Cache (Redis Compatible)',
};

async function getPlatformSettingsHelper(): Promise<{
  settings: Record<string, any>;
  plans: SaasPlanItem[];
  config: PlatformConfigData;
}> {
  const platform = await prisma.tenant.findUnique({
    where: { id: 'tenant-platform' },
  });

  let parsed: Record<string, any> = {};
  try {
    if (platform?.settings) {
      parsed = JSON.parse(platform.settings);
    }
  } catch {
    parsed = {};
  }

  const plans: SaasPlanItem[] = Array.isArray(parsed.saasPlans) && parsed.saasPlans.length > 0
    ? parsed.saasPlans
    : DEFAULT_PLANS;

  const config: PlatformConfigData = {
    ...DEFAULT_PLATFORM_CONFIG,
    ...(parsed.platformConfig || {}),
  };

  return { settings: parsed, plans, config };
}

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

    const { plans, config } = await getPlatformSettingsHelper();

    // Calculate MRR accurately based on active plan pricing
    const planPriceMap = new Map<string, number>(plans.map((p) => [p.code.toLowerCase(), p.price]));
    const totalMrr = tenants.reduce((acc, t) => {
      if (t.status === 'SUSPENDED') return acc;
      const price = planPriceMap.get(t.plan?.toLowerCase()) ?? 4999;
      return acc + price;
    }, 0);

    const metrics = {
      totalTenants: tenants.length,
      activeTenants: tenants.filter((t) => t.status === 'ACTIVE').length,
      monthlyRecurringRevenue: totalMrr,
      totalOrdersProcessed: tenants.reduce((s, t) => s + t._count.orders, 0),
      systemUptime: '99.98%',
      databaseLatencyMs: 3.8,
      platformConfig: config,
      tenants: tenants.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        plan: t.plan,
        status: t.status,
        logoUrl: t.logoUrl,
        branchesCount: t.branches.length,
        usersCount: t._count.users,
        ordersCount: t._count.orders,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
    };

    sendSuccess(res, metrics);
  }

  static async listTenants(req: Request, res: Response): Promise<void> {
    const tenants = await prisma.tenant.findMany({
      include: {
        branches: {
          select: { id: true, name: true, isActive: true, timezone: true, currency: true },
        },
        _count: {
          select: { users: true, orders: true, restaurantTables: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const sanitized = tenants.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      plan: t.plan,
      status: t.status,
      logoUrl: t.logoUrl,
      branchesCount: t.branches.length,
      branches: t.branches,
      usersCount: t._count.users,
      ordersCount: t._count.orders,
      tablesCount: t._count.restaurantTables,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    sendSuccess(res, sanitized);
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

  static async updateTenant(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { name, slug, plan, status, logoUrl, settings } = req.body;

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new AppError('NOT_FOUND', 'Tenant not found', 404);

    if (slug) {
      const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      const existing = await prisma.tenant.findFirst({
        where: { slug: cleanSlug, NOT: { id } },
      });
      if (existing) {
        throw new AppError('DUPLICATE_ENTRY', `Tenant slug '${cleanSlug}' is already taken`, 409);
      }
    }

    const updated = await prisma.tenant.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(slug ? { slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-') } : {}),
        ...(plan ? { plan } : {}),
        ...(status ? { status } : {}),
        ...(logoUrl !== undefined ? { logoUrl } : {}),
        ...(settings ? { settings: typeof settings === 'string' ? settings : JSON.stringify(settings) } : {}),
      },
    });

    sendSuccess(res, updated);
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

  static async deleteTenant(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    if (id === 'tenant-platform') {
      throw new AppError('BAD_REQUEST', 'Cannot delete platform root tenant', 400);
    }

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new AppError('NOT_FOUND', 'Tenant not found', 404);
    if (tenant.slug === 'platform') {
      throw new AppError('BAD_REQUEST', 'Cannot delete platform root tenant', 400);
    }

    await prisma.$transaction(async (tx) => {
      // 1. Remove user relations & tokens
      await tx.userBranchRole.deleteMany({ where: { user: { tenantId: id } } });
      await tx.refreshToken.deleteMany({ where: { user: { tenantId: id } } });
      await tx.auditLog.deleteMany({ where: { tenantId: id } });

      // 2. Remove role permissions and roles
      await tx.rolePermission.deleteMany({ where: { role: { tenantId: id } } });
      await tx.role.deleteMany({ where: { tenantId: id } });

      // 3. Remove orders, items, and payments
      await tx.orderItemModifier.deleteMany({ where: { orderItem: { order: { tenantId: id } } } });
      await tx.orderItem.deleteMany({ where: { order: { tenantId: id } } });
      await tx.payment.deleteMany({ where: { tenantId: id } });
      await tx.order.deleteMany({ where: { tenantId: id } });

      // 4. Remove menu items, modifiers, categories
      await tx.menuItemModifierGroup.deleteMany({ where: { menuItem: { tenantId: id } } });
      await tx.modifier.deleteMany({ where: { group: { tenantId: id } } });
      await tx.modifierGroup.deleteMany({ where: { tenantId: id } });
      await tx.menuItem.deleteMany({ where: { tenantId: id } });
      await tx.menuCategory.deleteMany({ where: { tenantId: id } });

      // 5. Remove operations resources
      await tx.cashRegister.deleteMany({ where: { branch: { tenantId: id } } });
      await tx.kitchenStation.deleteMany({ where: { tenantId: id } });
      await tx.restaurantTable.deleteMany({ where: { tenantId: id } });
      await tx.floor.deleteMany({ where: { tenantId: id } });
      await tx.taxConfiguration.deleteMany({ where: { tenantId: id } });
      await tx.notificationTemplate.deleteMany({ where: { tenantId: id } });

      // 6. Remove users & branches
      await tx.user.deleteMany({ where: { tenantId: id } });
      await tx.branch.deleteMany({ where: { tenantId: id } });

      // 7. Delete tenant
      await tx.tenant.delete({ where: { id } });
    });

    sendSuccess(res, {
      id,
      message: `Tenant '${tenant.name}' and all associated restaurant data have been permanently deleted.`,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SAAS PRICING PLANS CRUD
  // ─────────────────────────────────────────────────────────────────────────────

  static async getPlans(req: Request, res: Response): Promise<void> {
    const { plans } = await getPlatformSettingsHelper();
    sendSuccess(res, plans);
  }

  static async createPlan(req: Request, res: Response): Promise<void> {
    const { name, code, price, currency, interval, description, features, maxBranches, maxUsers, maxOrdersPerMonth, badge, isPopular } = req.body;

    if (!name || !price) {
      throw new AppError('VALIDATION_ERROR', 'Plan name and price are required', 400);
    }

    const { settings, plans } = await getPlatformSettingsHelper();
    const newCode = (code || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).toLowerCase();

    if (plans.some((p) => p.code === newCode)) {
      throw new AppError('DUPLICATE_ENTRY', `Plan code '${newCode}' already exists`, 409);
    }

    const newPlan: SaasPlanItem = {
      id: `plan-${Date.now()}`,
      name,
      code: newCode,
      price: Number(price),
      currency: currency || 'INR',
      interval: interval || 'month',
      description: description || '',
      features: Array.isArray(features) ? features : (typeof features === 'string' ? features.split('\n').filter(Boolean) : []),
      maxBranches: Number(maxBranches) || 1,
      maxUsers: Number(maxUsers) || 5,
      maxOrdersPerMonth: Number(maxOrdersPerMonth) || 1000,
      badge: badge || undefined,
      isPopular: Boolean(isPopular),
      isActive: true,
    };

    const updatedPlans = [...plans, newPlan];
    settings.saasPlans = updatedPlans;

    await prisma.tenant.upsert({
      where: { id: 'tenant-platform' },
      update: { settings: JSON.stringify(settings) },
      create: {
        id: 'tenant-platform',
        name: 'Platform SaaS Cloud',
        slug: 'platform',
        plan: 'enterprise',
        status: 'ACTIVE',
        settings: JSON.stringify(settings),
      },
    });

    sendSuccess(res, newPlan, 201);
  }

  static async updatePlan(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { name, price, currency, interval, description, features, maxBranches, maxUsers, maxOrdersPerMonth, badge, isPopular, isActive } = req.body;

    const { settings, plans } = await getPlatformSettingsHelper();
    const planIndex = plans.findIndex((p) => p.id === id || p.code === id);

    if (planIndex === -1) {
      throw new AppError('NOT_FOUND', 'Pricing plan not found', 404);
    }

    const existing = plans[planIndex];
    const updatedPlan: SaasPlanItem = {
      ...existing,
      ...(name ? { name } : {}),
      ...(price !== undefined ? { price: Number(price) } : {}),
      ...(currency ? { currency } : {}),
      ...(interval ? { interval } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(features !== undefined ? { features: Array.isArray(features) ? features : (typeof features === 'string' ? features.split('\n').filter(Boolean) : existing.features) } : {}),
      ...(maxBranches !== undefined ? { maxBranches: Number(maxBranches) } : {}),
      ...(maxUsers !== undefined ? { maxUsers: Number(maxUsers) } : {}),
      ...(maxOrdersPerMonth !== undefined ? { maxOrdersPerMonth: Number(maxOrdersPerMonth) } : {}),
      ...(badge !== undefined ? { badge } : {}),
      ...(isPopular !== undefined ? { isPopular: Boolean(isPopular) } : {}),
      ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
    };

    plans[planIndex] = updatedPlan;
    settings.saasPlans = plans;

    await prisma.tenant.upsert({
      where: { id: 'tenant-platform' },
      update: { settings: JSON.stringify(settings) },
      create: {
        id: 'tenant-platform',
        name: 'Platform SaaS Cloud',
        slug: 'platform',
        plan: 'enterprise',
        status: 'ACTIVE',
        settings: JSON.stringify(settings),
      },
    });

    sendSuccess(res, updatedPlan);
  }

  static async deletePlan(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { settings, plans } = await getPlatformSettingsHelper();

    const planToDelete = plans.find((p) => p.id === id || p.code === id);
    if (!planToDelete) throw new AppError('NOT_FOUND', 'Pricing plan not found', 404);

    const updatedPlans = plans.filter((p) => p.id !== id && p.code !== id);
    settings.saasPlans = updatedPlans;

    await prisma.tenant.upsert({
      where: { id: 'tenant-platform' },
      update: { settings: JSON.stringify(settings) },
      create: {
        id: 'tenant-platform',
        name: 'Platform SaaS Cloud',
        slug: 'platform',
        plan: 'enterprise',
        status: 'ACTIVE',
        settings: JSON.stringify(settings),
      },
    });

    sendSuccess(res, { message: `Plan '${planToDelete.name}' deleted successfully.` });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PLATFORM CONFIGURATION & INFRASTRUCTURE DETAILS
  // ─────────────────────────────────────────────────────────────────────────────

  static async getPlatformDetails(req: Request, res: Response): Promise<void> {
    const { config } = await getPlatformSettingsHelper();
    sendSuccess(res, config);
  }

  static async updatePlatformDetails(req: Request, res: Response): Promise<void> {
    const { settings, config } = await getPlatformSettingsHelper();
    const updates = req.body;

    const newConfig: PlatformConfigData = {
      ...config,
      ...updates,
    };

    settings.platformConfig = newConfig;

    await prisma.tenant.upsert({
      where: { id: 'tenant-platform' },
      update: { settings: JSON.stringify(settings) },
      create: {
        id: 'tenant-platform',
        name: 'Platform SaaS Cloud',
        slug: 'platform',
        plan: 'enterprise',
        status: 'ACTIVE',
        settings: JSON.stringify(settings),
      },
    });

    sendSuccess(res, newConfig);
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


