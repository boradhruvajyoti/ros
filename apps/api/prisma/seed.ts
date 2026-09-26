// =============================================================================
// Prisma Seed — Full Enterprise Database Seed (Phase 1 & Phase 2 Modules)
// =============================================================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Purging all existing database data to start completely fresh...');
  await prisma.orderKotItem.deleteMany().catch(() => {});
  await prisma.orderKot.deleteMany().catch(() => {});
  await prisma.orderItemModifier.deleteMany().catch(() => {});
  await prisma.orderItem.deleteMany().catch(() => {});
  await prisma.appliedDiscount.deleteMany().catch(() => {});
  await prisma.refund.deleteMany().catch(() => {});
  await prisma.payment.deleteMany().catch(() => {});
  await prisma.orderStatusHistory.deleteMany().catch(() => {});
  await prisma.order.deleteMany().catch(() => {});
  await prisma.reservation.deleteMany().catch(() => {});
  await prisma.customer.deleteMany().catch(() => {});
  await prisma.restaurantTable.deleteMany().catch(() => {});
  await prisma.tableSection.deleteMany().catch(() => {});
  await prisma.floor.deleteMany().catch(() => {});
  await prisma.menuItemModifierGroup.deleteMany().catch(() => {});
  await prisma.modifier.deleteMany().catch(() => {});
  await prisma.modifierGroup.deleteMany().catch(() => {});
  await prisma.menuItemVariant.deleteMany().catch(() => {});
  await prisma.recipeIngredient.deleteMany().catch(() => {});
  await prisma.recipe.deleteMany().catch(() => {});
  await prisma.menuItem.deleteMany().catch(() => {});
  await prisma.menuCategory.deleteMany().catch(() => {});
  await prisma.kitchenStation.deleteMany().catch(() => {});
  await prisma.cashMovement.deleteMany().catch(() => {});
  await prisma.cashSession.deleteMany().catch(() => {});
  await prisma.cashRegister.deleteMany().catch(() => {});
  await prisma.taxConfiguration.deleteMany().catch(() => {});
  await prisma.stockLedger.deleteMany().catch(() => {});
  await prisma.goodsReceiptNoteItem.deleteMany().catch(() => {});
  await prisma.goodsReceiptNote.deleteMany().catch(() => {});
  await prisma.purchaseOrderItem.deleteMany().catch(() => {});
  await prisma.purchaseOrder.deleteMany().catch(() => {});
  await prisma.ingredient.deleteMany().catch(() => {});
  await prisma.ingredientCategory.deleteMany().catch(() => {});
  await prisma.supplier.deleteMany().catch(() => {});
  await prisma.leaveRecord.deleteMany().catch(() => {});
  await prisma.attendanceRecord.deleteMany().catch(() => {});
  await prisma.employeeShift.deleteMany().catch(() => {});
  await prisma.shift.deleteMany().catch(() => {});
  await prisma.employee.deleteMany().catch(() => {});
  await prisma.expense.deleteMany().catch(() => {});
  await prisma.expenseCategory.deleteMany().catch(() => {});
  await prisma.coupon.deleteMany().catch(() => {});
  await prisma.notification.deleteMany().catch(() => {});
  await prisma.notificationTemplate.deleteMany().catch(() => {});
  await prisma.auditLog.deleteMany().catch(() => {});
  await prisma.dailySequence.deleteMany().catch(() => {});
  await prisma.refreshToken.deleteMany().catch(() => {});
  await prisma.userBranchRole.deleteMany().catch(() => {});
  await prisma.rolePermission.deleteMany().catch(() => {});
  await prisma.permission.deleteMany().catch(() => {});
  await prisma.role.deleteMany().catch(() => {});
  await prisma.user.deleteMany().catch(() => {});
  await prisma.branch.deleteMany().catch(() => {});
  await prisma.tenant.deleteMany().catch(() => {});
  console.log('✅ Clean state established');

  console.log('🌱 Seeding fresh ROS platform permissions, platform superadmin, and tenant roles...');

  // ── 1. Permissions ─────────────────────────────────────────────────────────
  const permCodes = [
    // Orders
    { code: 'orders:view', category: 'Orders', description: 'View orders' },
    { code: 'orders:create', category: 'Orders', description: 'Create orders' },
    { code: 'orders:edit', category: 'Orders', description: 'Edit orders' },
    { code: 'orders:cancel', category: 'Orders', description: 'Cancel orders' },
    { code: 'orders:void', category: 'Orders', description: 'Void order items' },
    { code: 'orders:refund', category: 'Orders', description: 'Process refunds' },
    // Payments
    { code: 'payments:view', category: 'Payments', description: 'View payments' },
    { code: 'payments:create', category: 'Payments', description: 'Accept payments' },
    { code: 'payments:refund', category: 'Payments', description: 'Refund payments' },
    // Menu
    { code: 'menu:view', category: 'Menu', description: 'View menu' },
    { code: 'menu:create', category: 'Menu', description: 'Create menu items' },
    { code: 'menu:edit', category: 'Menu', description: 'Edit menu items' },
    { code: 'menu:delete', category: 'Menu', description: 'Delete menu items' },
    // Tables
    { code: 'tables:view', category: 'Tables', description: 'View tables' },
    { code: 'tables:create', category: 'Tables', description: 'Create tables' },
    { code: 'tables:edit', category: 'Tables', description: 'Edit tables' },
    { code: 'tables:delete', category: 'Tables', description: 'Delete tables' },
    // Reservations
    { code: 'reservations:view', category: 'Reservations', description: 'View reservations' },
    { code: 'reservations:create', category: 'Reservations', description: 'Create reservations' },
    { code: 'reservations:edit', category: 'Reservations', description: 'Edit reservations' },
    { code: 'reservations:cancel', category: 'Reservations', description: 'Cancel reservations' },
    // Kitchen
    { code: 'kitchen:view', category: 'Kitchen', description: 'View kitchen display' },
    { code: 'kitchen:update', category: 'Kitchen', description: 'Update KOT status' },
    // Inventory
    { code: 'inventory:view', category: 'Inventory', description: 'View inventory' },
    { code: 'inventory:adjust', category: 'Inventory', description: 'Adjust stock' },
    { code: 'inventory:count', category: 'Inventory', description: 'Perform stock counts' },
    { code: 'inventory:transfer', category: 'Inventory', description: 'Transfer stock' },
    { code: 'inventory:write-off', category: 'Inventory', description: 'Write off stock' },
    // Procurement
    { code: 'procurement:view', category: 'Procurement', description: 'View purchase orders' },
    { code: 'procurement:create', category: 'Procurement', description: 'Create purchase orders' },
    { code: 'procurement:approve', category: 'Procurement', description: 'Approve purchase orders' },
    { code: 'procurement:receive', category: 'Procurement', description: 'Receive goods' },
    // Customers
    { code: 'customers:view', category: 'Customers', description: 'View customers' },
    { code: 'customers:create', category: 'Customers', description: 'Create customers' },
    { code: 'customers:edit', category: 'Customers', description: 'Edit customers' },
    // Loyalty
    { code: 'loyalty:view', category: 'Loyalty', description: 'View loyalty' },
    { code: 'loyalty:adjust', category: 'Loyalty', description: 'Adjust loyalty points' },
    // Staff
    { code: 'staff:view', category: 'Staff', description: 'View staff' },
    { code: 'staff:create', category: 'Staff', description: 'Create staff records' },
    { code: 'staff:edit', category: 'Staff', description: 'Edit staff records' },
    // Attendance
    { code: 'attendance:view', category: 'Attendance', description: 'View attendance' },
    { code: 'attendance:manage', category: 'Attendance', description: 'Manage attendance' },
    // Payroll
    { code: 'payroll:view', category: 'Payroll', description: 'View payroll' },
    { code: 'payroll:approve', category: 'Payroll', description: 'Approve payroll' },
    // Expenses
    { code: 'expenses:view', category: 'Expenses', description: 'View expenses' },
    { code: 'expenses:create', category: 'Expenses', description: 'Create expenses' },
    { code: 'expenses:approve', category: 'Expenses', description: 'Approve expenses' },
    // Cash
    { code: 'cash:open', category: 'Cash', description: 'Open cash session' },
    { code: 'cash:close', category: 'Cash', description: 'Close cash session' },
    { code: 'cash:adjust', category: 'Cash', description: 'Adjust cash' },
    { code: 'cash:view', category: 'Cash', description: 'View cash' },
    // Reports
    { code: 'reports:view', category: 'Reports', description: 'View reports' },
    { code: 'reports:export', category: 'Reports', description: 'Export reports' },
    // Settings
    { code: 'settings:view', category: 'Settings', description: 'View settings' },
    { code: 'settings:edit', category: 'Settings', description: 'Edit settings' },
    // Overrides
    { code: 'discount:apply', category: 'POS', description: 'Apply discounts' },
    { code: 'price:override', category: 'POS', description: 'Override prices' },
    // Users / Roles
    { code: 'users:view', category: 'Admin', description: 'View users' },
    { code: 'users:create', category: 'Admin', description: 'Create users' },
    { code: 'users:edit', category: 'Admin', description: 'Edit users' },
    { code: 'users:delete', category: 'Admin', description: 'Delete users' },
    { code: 'roles:view', category: 'Admin', description: 'View roles' },
    { code: 'roles:create', category: 'Admin', description: 'Create roles' },
    { code: 'roles:edit', category: 'Admin', description: 'Edit roles' },
    // Tenant / Branches
    { code: 'tenants:manage', category: 'Platform', description: 'Manage tenants (Super Admin)' },
    { code: 'branches:view', category: 'Admin', description: 'View branches' },
    { code: 'branches:create', category: 'Admin', description: 'Create branches' },
    { code: 'branches:edit', category: 'Admin', description: 'Edit branches' },
  ];

  for (const perm of permCodes) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {},
      create: perm,
    });
  }
  console.log(`✅ Seeded ${permCodes.length} permissions`);

  const allPerms = await prisma.permission.findMany();
  const permByCode = new Map(allPerms.map((p) => [p.code, p]));
  const allPermIds = allPerms.map((p) => p.id);
  const getPermIds = (codes: string[]) => codes.map((c) => permByCode.get(c)?.id).filter(Boolean) as string[];

  const password = await bcrypt.hash('Admin@1234', 12);

  // ── 2. PLATFORM SAAS CONTROL (Super Admin) ──────────────────────────────────
  const platformTenant = await prisma.tenant.create({
    data: {
      id: 'tenant-platform',
      name: 'Platform SaaS Cloud',
      slug: 'platform',
      plan: 'enterprise',
      status: 'ACTIVE',
      settings: JSON.stringify({ isPlatform: true }),
    },
  });

  const platformBranch = await prisma.branch.create({
    data: {
      id: 'branch-platform-global',
      tenantId: platformTenant.id,
      name: 'Global Platform Operations',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
    },
  });

  const superAdminRole = await prisma.role.create({
    data: {
      tenantId: platformTenant.id,
      name: 'SUPER_ADMIN',
      description: 'Platform Super Administrator with system-wide access and tenant management',
      isSystemRole: true,
    },
  });

  await prisma.rolePermission.createMany({
    data: allPermIds.map((permissionId) => ({ roleId: superAdminRole.id, permissionId })),
  });

  const superAdminUser = await prisma.user.create({
    data: {
      tenantId: platformTenant.id,
      name: 'Platform Super Admin',
      email: 'superadmin@ros.com',
      passwordHash: password,
      isActive: true,
    },
  });

  await prisma.userBranchRole.create({
    data: {
      userId: superAdminUser.id,
      branchId: platformBranch.id,
      roleId: superAdminRole.id,
    },
  });
  console.log(`👑 Platform Super Admin created: ${superAdminUser.email}`);

  // ── 3. RESTAURANT TENANT: Spice Garden Restaurant ───────────────────────────
  const tenant = await prisma.tenant.create({
    data: {
      id: 'tenant-sg-01',
      name: 'Spice Garden Restaurant',
      slug: 'spice-garden',
      plan: 'professional',
      status: 'ACTIVE',
      settings: JSON.stringify({ currency: 'INR', theme: 'dark', kotAutoPrint: true }),
    },
  });
  console.log(`🏢 Restaurant Tenant: ${tenant.name}`);

  const branch = await prisma.branch.create({
    data: {
      id: 'branch-sg-main',
      tenantId: tenant.id,
      name: 'Main Branch - Indiranagar',
      address: '100ft Road, Indiranagar, Bangalore, Karnataka 560038',
      phone: '+91 80 4123 4567',
      email: 'indiranagar@spicegarden.com',
      gstin: '29AABCU9603R1ZX',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      settings: JSON.stringify({ openingHours: '11:00 - 23:30', tableTurnoverTargetMin: 45 }),
    },
  });

  const branch2 = await prisma.branch.create({
    data: {
      id: 'branch-sg-whitefield',
      tenantId: tenant.id,
      name: 'Whitefield Outlet',
      address: 'ITPB Road, Whitefield, Bangalore',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
    },
  });
  console.log(`✅ Branches: ${branch.name}, ${branch2.name}`);

  // ── 4. Scoped Restaurant User Roles (under spice-garden) ────────────────────
  const restaurantRoleDefs = [
    {
      name: 'OWNER',
      getPerms: () => allPerms.filter((p) => p.code !== 'tenants:manage').map((p) => p.id),
      desc: 'Restaurant business owner with full brand and financial control',
    },
    {
      name: 'ADMINISTRATOR',
      getPerms: () => allPerms.filter((p) => p.code !== 'tenants:manage').map((p) => p.id),
      desc: 'Restaurant system administrator across all operational modules',
    },
    {
      name: 'GENERAL_MANAGER',
      getPerms: () => allPerms.filter((p) => !['tenants:manage', 'users:delete', 'roles:create', 'roles:edit'].includes(p.code)).map((p) => p.id),
      desc: 'Operations director with payroll/expense approvals and reports',
    },
    {
      name: 'BRANCH_MANAGER',
      getPerms: () => getPermIds([
        'orders:view', 'orders:create', 'orders:edit', 'orders:cancel', 'orders:void', 'orders:refund',
        'payments:view', 'payments:create',
        'menu:view', 'menu:edit',
        'tables:view', 'tables:create', 'tables:edit', 'tables:delete',
        'reservations:view', 'reservations:create', 'reservations:edit', 'reservations:cancel',
        'kitchen:view',
        'inventory:view', 'inventory:adjust', 'inventory:count', 'inventory:transfer',
        'procurement:view', 'procurement:receive',
        'customers:view', 'customers:create', 'customers:edit',
        'loyalty:view', 'loyalty:adjust',
        'staff:view', 'attendance:view', 'attendance:manage',
        'expenses:view', 'expenses:create',
        'cash:open', 'cash:close', 'cash:adjust', 'cash:view',
        'reports:view', 'reports:export',
        'settings:view',
        'discount:apply', 'price:override',
      ]),
      desc: 'Floor shift supervisor, voids, and staff scheduling',
    },
    {
      name: 'CHEF',
      getPerms: () => getPermIds([
        'kitchen:view', 'kitchen:update',
        'orders:view',
        'menu:view', 'menu:edit',
        'inventory:view', 'inventory:adjust', 'inventory:count',
      ]),
      desc: 'Executive Head Chef overseeing KDS tickets, recipes, and item 86ing',
    },
    {
      name: 'KITCHEN_STAFF',
      getPerms: () => getPermIds([
        'kitchen:view', 'kitchen:update',
        'orders:view',
        'inventory:view',
      ]),
      desc: 'Station line cook managing live KOT queue',
    },
    {
      name: 'WAITER',
      getPerms: () => getPermIds([
        'orders:view', 'orders:create', 'orders:edit',
        'menu:view', 'tables:view', 'tables:edit',
        'customers:view', 'customers:create',
        'reservations:view', 'reservations:create', 'reservations:edit',
        'kitchen:view',
      ]),
      desc: 'Table server managing reservations and dine-in orders',
    },
    {
      name: 'CASHIER',
      getPerms: () => getPermIds([
        'orders:view', 'orders:create', 'orders:edit', 'orders:cancel',
        'payments:view', 'payments:create',
        'menu:view', 'tables:view', 'tables:edit',
        'customers:view', 'customers:create',
        'reservations:view',
        'cash:view', 'cash:open', 'cash:close',
        'discount:apply',
        'reports:view',
      ]),
      desc: 'POS billing, cash registers, receipts, and payment settlements',
    },
    {
      name: 'ACCOUNTANT',
      getPerms: () => getPermIds([
        'orders:view', 'orders:refund',
        'payments:view', 'payments:create', 'payments:refund',
        'payroll:view', 'payroll:approve',
        'expenses:view', 'expenses:create', 'expenses:approve',
        'cash:view', 'cash:open', 'cash:close', 'cash:adjust',
        'reports:view', 'reports:export',
      ]),
      desc: 'Financial ledger, expense audit, payroll review, and GST exports',
    },
    {
      name: 'INVENTORY_MANAGER',
      getPerms: () => getPermIds([
        'inventory:view', 'inventory:adjust', 'inventory:count', 'inventory:transfer', 'inventory:write-off',
        'procurement:view', 'procurement:receive',
        'menu:view',
      ]),
      desc: 'Storeroom control, physical stock audits, and wastage write-offs',
    },
    {
      name: 'PROCUREMENT_MANAGER',
      getPerms: () => getPermIds([
        'procurement:view', 'procurement:create', 'procurement:approve', 'procurement:receive',
        'inventory:view', 'inventory:adjust',
        'expenses:view', 'expenses:create',
      ]),
      desc: 'Supplier purchase orders, pricing agreements, and goods receiving',
    },
    {
      name: 'DELIVERY_STAFF',
      getPerms: () => getPermIds([
        'orders:view', 'orders:edit',
        'customers:view',
      ]),
      desc: 'Delivery fulfillment driver and dispatch tracking',
    },
  ];

  const roleMap = new Map<string, any>();
  for (const def of restaurantRoleDefs) {
    const role = await prisma.role.create({
      data: {
        tenantId: tenant.id,
        name: def.name,
        description: def.desc,
        isSystemRole: true,
      },
    });
    const permIds = def.getPerms();
    if (permIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: [...new Set(permIds)].map((permissionId) => ({ roleId: role.id, permissionId })),
      });
    }
    roleMap.set(def.name, role);
  }
  console.log(`✅ Seeded ${restaurantRoleDefs.length} restaurant user roles under '${tenant.name}'`);

  // ── 5. Users for each Restaurant User Role ──────────────────────────────────
  const restaurantUsersToSeed = [
    { name: 'Restaurant Owner Rajesh', email: 'owner@spicegarden.com',        role: 'OWNER' },
    { name: 'Admin User Ananya',       email: 'admin@spicegarden.com',        role: 'ADMINISTRATOR' },
    { name: 'General Manager Sam',     email: 'manager@spicegarden.com',      role: 'GENERAL_MANAGER' },
    { name: 'Branch Manager Nina',     email: 'branchmanager@spicegarden.com', role: 'BRANCH_MANAGER' },
    { name: 'Head Chef Marco',         email: 'chef@spicegarden.com',         role: 'CHEF' },
    { name: 'Kitchen Staff Kumar',     email: 'kitchen@spicegarden.com',      role: 'KITCHEN_STAFF' },
    { name: 'Waiter Priya',            email: 'waiter@spicegarden.com',       role: 'WAITER' },
    { name: 'Cashier Raj',             email: 'cashier@spicegarden.com',      role: 'CASHIER' },
    { name: 'Accountant Alex',         email: 'accountant@spicegarden.com',   role: 'ACCOUNTANT' },
    { name: 'Inventory Lead Tara',     email: 'inventory@spicegarden.com',    role: 'INVENTORY_MANAGER' },
    { name: 'Procurement Lead David',  email: 'procurement@spicegarden.com',  role: 'PROCUREMENT_MANAGER' },
    { name: 'Delivery Courier Leo',    email: 'delivery@spicegarden.com',     role: 'DELIVERY_STAFF' },
  ];

  const createdUsers: Record<string, any> = {};
  for (const u of restaurantUsersToSeed) {
    const role = roleMap.get(u.role);
    if (role) {
      const user = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          name: u.name,
          email: u.email,
          passwordHash: password,
          isActive: true,
        },
      });

      await prisma.userBranchRole.create({
        data: { userId: user.id, branchId: branch.id, roleId: role.id },
      });
      createdUsers[u.email] = user;
    }
  }

  const userAdmin   = createdUsers['admin@spicegarden.com'];
  const userManager = createdUsers['manager@spicegarden.com'];
  const userCashier = createdUsers['cashier@spicegarden.com'];
  const userWaiter  = createdUsers['waiter@spicegarden.com'];
  const userChef    = createdUsers['chef@spicegarden.com'];

  console.log(`✅ Seeded ${restaurantUsersToSeed.length} user accounts for restaurant roles (Password: Admin@1234)`);

  // ── 6. Kitchen Stations ────────────────────────────────────────────────────
  const stationsData = [
    { name: 'Main Kitchen', displayColor: '#EF4444', sortOrder: 1 },
    { name: 'Starters', displayColor: '#F97316', sortOrder: 2 },
    { name: 'Tandoor', displayColor: '#EAB308', sortOrder: 3 },
    { name: 'Beverages', displayColor: '#3B82F6', sortOrder: 4 },
    { name: 'Desserts', displayColor: '#A855F7', sortOrder: 5 },
  ];

  const stations: any[] = [];
  for (const s of stationsData) {
    const station = await prisma.kitchenStation.upsert({
      where: { id: `station-${s.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `station-${s.name.toLowerCase().replace(/\s+/g, '-')}`,
        tenantId: tenant.id,
        branchId: branch.id,
        ...s,
      },
    });
    stations.push(station);
  }
  console.log('✅ Kitchen stations seeded');

  // ── 7. Floor & Tables ──────────────────────────────────────────────────────
  const floor = await prisma.floor.upsert({
    where: { id: 'floor-main' },
    update: {},
    create: {
      id: 'floor-main',
      tenantId: tenant.id,
      branchId: branch.id,
      name: 'Ground Floor Dining',
      sortOrder: 1,
    },
  });

  const tablesData = [
    { name: 'T1', capacity: 2, posX: 80, posY: 80, status: 'AVAILABLE' },
    { name: 'T2', capacity: 2, posX: 220, posY: 80, status: 'OCCUPIED' },
    { name: 'T3', capacity: 4, posX: 360, posY: 80, status: 'OCCUPIED' },
    { name: 'T4', capacity: 4, posX: 500, posY: 80, status: 'AVAILABLE' },
    { name: 'T5', capacity: 6, posX: 80, posY: 220, status: 'RESERVED' },
    { name: 'T6', capacity: 6, posX: 260, posY: 220, status: 'AVAILABLE' },
    { name: 'T7', capacity: 8, posX: 440, posY: 220, status: 'CLEANING' },
    { name: 'T8', capacity: 4, posX: 80, posY: 360, status: 'AVAILABLE' },
    { name: 'T9', capacity: 4, posX: 220, posY: 360, status: 'AVAILABLE' },
    { name: 'T10', capacity: 4, posX: 360, posY: 360, status: 'AVAILABLE' },
  ];

  const tables: any[] = [];
  for (const t of tablesData) {
    const tbl = await prisma.restaurantTable.upsert({
      where: { id: `table-${t.name.toLowerCase()}` },
      update: { status: t.status },
      create: {
        id: `table-${t.name.toLowerCase()}`,
        tenantId: tenant.id,
        branchId: branch.id,
        floorId: floor.id,
        name: t.name,
        capacity: t.capacity,
        posX: t.posX,
        posY: t.posY,
        width: 110,
        height: 70,
        status: t.status,
      },
    });
    tables.push(tbl);
  }
  console.log('✅ Tables seeded');

  // ── 8. Menu Categories & Items ─────────────────────────────────────────────
  const cats: any = {};
  const catData = [
    { id: 'cat-starters', name: 'Starters', sortOrder: 1 },
    { id: 'cat-main', name: 'Main Course', sortOrder: 2 },
    { id: 'cat-breads', name: 'Breads & Rice', sortOrder: 3 },
    { id: 'cat-beverages', name: 'Beverages', sortOrder: 4 },
    { id: 'cat-desserts', name: 'Desserts', sortOrder: 5 },
  ];

  for (const c of catData) {
    cats[c.id] = await prisma.menuCategory.upsert({
      where: { id: c.id },
      update: {},
      create: { id: c.id, tenantId: tenant.id, name: c.name, sortOrder: c.sortOrder },
    });
  }

  const mainKitchen = stations[0];
  const startersStation = stations[1];
  const beverageStation = stations[3];
  const dessertStation = stations[4];

  const menuItems = [
    { name: 'Paneer Tikka', categoryId: cats['cat-starters'].id, stationId: startersStation.id, foodType: 'VEG', variants: [{ name: 'Half', price: 249, cost: 80 }, { name: 'Full', price: 449, cost: 150 }] },
    { name: 'Chicken 65', categoryId: cats['cat-starters'].id, stationId: startersStation.id, foodType: 'NON_VEG', variants: [{ name: 'Half', price: 299, cost: 100 }, { name: 'Full', price: 549, cost: 185 }] },
    { name: 'Veg Spring Rolls', categoryId: cats['cat-starters'].id, stationId: startersStation.id, foodType: 'VEG', variants: [{ name: 'Regular', price: 199, cost: 60 }] },
    { name: 'Butter Chicken', categoryId: cats['cat-main'].id, stationId: mainKitchen.id, foodType: 'NON_VEG', variants: [{ name: 'Half', price: 349, cost: 120 }, { name: 'Full', price: 649, cost: 220 }] },
    { name: 'Dal Makhani', categoryId: cats['cat-main'].id, stationId: mainKitchen.id, foodType: 'VEG', variants: [{ name: 'Half', price: 249, cost: 70 }, { name: 'Full', price: 449, cost: 130 }] },
    { name: 'Palak Paneer', categoryId: cats['cat-main'].id, stationId: mainKitchen.id, foodType: 'VEG', variants: [{ name: 'Half', price: 279, cost: 90 }, { name: 'Full', price: 499, cost: 165 }] },
    { name: 'Chicken Biryani', categoryId: cats['cat-main'].id, stationId: mainKitchen.id, foodType: 'NON_VEG', variants: [{ name: 'Single', price: 349, cost: 130 }, { name: 'Double', price: 649, cost: 250 }] },
    { name: 'Butter Naan', categoryId: cats['cat-breads'].id, stationId: mainKitchen.id, foodType: 'VEG', variants: [{ name: 'Piece', price: 50, cost: 12 }] },
    { name: 'Garlic Naan', categoryId: cats['cat-breads'].id, stationId: mainKitchen.id, foodType: 'VEG', variants: [{ name: 'Piece', price: 65, cost: 15 }] },
    { name: 'Jeera Rice', categoryId: cats['cat-breads'].id, stationId: mainKitchen.id, foodType: 'VEG', variants: [{ name: 'Plate', price: 149, cost: 40 }] },
    { name: 'Mango Lassi', categoryId: cats['cat-beverages'].id, stationId: beverageStation.id, foodType: 'VEG', variants: [{ name: 'Glass', price: 129, cost: 35 }] },
    { name: 'Masala Chai', categoryId: cats['cat-beverages'].id, stationId: beverageStation.id, foodType: 'VEG', variants: [{ name: 'Cup', price: 60, cost: 15 }] },
    { name: 'Fresh Lime Soda', categoryId: cats['cat-beverages'].id, stationId: beverageStation.id, foodType: 'VEG', variants: [{ name: 'Glass', price: 89, cost: 20 }] },
    { name: 'Gulab Jamun', categoryId: cats['cat-desserts'].id, stationId: dessertStation.id, foodType: 'VEG', variants: [{ name: '2 Pieces', price: 99, cost: 30 }] },
    { name: 'Rasmalai', categoryId: cats['cat-desserts'].id, stationId: dessertStation.id, foodType: 'VEG', variants: [{ name: '2 Pieces', price: 129, cost: 40 }] },
  ];

  const createdMenuItems: any[] = [];
  for (const item of menuItems) {
    const { variants, stationId, ...itemData } = item;
    const mi = await prisma.menuItem.upsert({
      where: { id: `item-${item.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `item-${item.name.toLowerCase().replace(/\s+/g, '-')}`,
        tenantId: tenant.id,
        ...itemData,
        kitchenStationId: stationId,
        variants: {
          create: variants.map((v, i) => ({ ...v, sortOrder: i })),
        },
      },
      include: { variants: true },
    });
    createdMenuItems.push(mi);
  }
  console.log('✅ Menu items & variants seeded');

  // ── 9. Taxes & Cash Register ───────────────────────────────────────────────
  await prisma.taxConfiguration.upsert({
    where: { id: 'tax-cgst' },
    update: {},
    create: { id: 'tax-cgst', tenantId: tenant.id, name: 'CGST', rate: 2.5, isInclusive: false },
  });
  await prisma.taxConfiguration.upsert({
    where: { id: 'tax-sgst' },
    update: {},
    create: { id: 'tax-sgst', tenantId: tenant.id, name: 'SGST', rate: 2.5, isInclusive: false },
  });

  await prisma.cashRegister.upsert({
    where: { id: 'register-main' },
    update: {},
    create: {
      id: 'register-main',
      tenantId: tenant.id,
      branchId: branch.id,
      name: 'Main Counter',
      currentBalance: 5000,
    },
  });
  console.log('✅ Taxes and Cash Register seeded');

  // ── 10. Phase 2: Ingredients, Inventory & Stock Ledgers ────────────────────
  const ingCatDairy = await prisma.ingredientCategory.upsert({
    where: { id: 'ingcat-dairy' },
    update: {},
    create: { id: 'ingcat-dairy', tenantId: tenant.id, branchId: branch.id, name: 'Dairy & Cheese' },
  });
  const ingCatMeat = await prisma.ingredientCategory.upsert({
    where: { id: 'ingcat-meat' },
    update: {},
    create: { id: 'ingcat-meat', tenantId: tenant.id, branchId: branch.id, name: 'Poultry & Meat' },
  });
  const ingCatProduce = await prisma.ingredientCategory.upsert({
    where: { id: 'ingcat-produce' },
    update: {},
    create: { id: 'ingcat-produce', tenantId: tenant.id, branchId: branch.id, name: 'Fresh Produce' },
  });

  const ingredientsData = [
    { id: 'ing-paneer', name: 'Fresh Malai Paneer', categoryId: ingCatDairy.id, unit: 'KG', currentStock: 18.5, lowStockThreshold: 5.0, costPerUnit: 280 },
    { id: 'ing-butter', name: 'Amul Salted Butter', categoryId: ingCatDairy.id, unit: 'KG', currentStock: 25.0, lowStockThreshold: 8.0, costPerUnit: 420 },
    { id: 'ing-chicken', name: 'Farm Fresh Chicken (Boneless)', categoryId: ingCatMeat.id, unit: 'KG', currentStock: 32.0, lowStockThreshold: 10.0, costPerUnit: 220 },
    { id: 'ing-basmati', name: 'Royal Basmati Rice XXL', categoryId: ingCatProduce.id, unit: 'KG', currentStock: 75.0, lowStockThreshold: 20.0, costPerUnit: 110 },
    { id: 'ing-onions', name: 'Red Onions', categoryId: ingCatProduce.id, unit: 'KG', currentStock: 4.5, lowStockThreshold: 15.0, costPerUnit: 35 },
    { id: 'ing-tomatoes', name: 'Farm Tomatoes', categoryId: ingCatProduce.id, unit: 'KG', currentStock: 28.0, lowStockThreshold: 10.0, costPerUnit: 40 },
  ];

  for (const ing of ingredientsData) {
    await prisma.ingredient.upsert({
      where: { id: ing.id },
      update: { currentStock: ing.currentStock },
      create: {
        tenantId: tenant.id,
        branchId: branch.id,
        ...ing,
      },
    });

    await prisma.stockLedger.upsert({
      where: { id: `ledger-open-${ing.id}` },
      update: {},
      create: {
        id: `ledger-open-${ing.id}`,
        tenantId: tenant.id,
        branchId: branch.id,
        ingredientId: ing.id,
        movementType: 'OPENING',
        quantity: ing.currentStock,
        unitCost: ing.costPerUnit,
        createdBy: userAdmin.id,
        notes: 'Initial opening stock ledger entry',
      },
    });
  }
  console.log('✅ Ingredients & stock ledgers seeded');

  // ── 11. Phase 2: Suppliers & Procurement ───────────────────────────────────
  const supDairy = await prisma.supplier.upsert({
    where: { id: 'sup-dairy-delight' },
    update: {},
    create: {
      id: 'sup-dairy-delight',
      tenantId: tenant.id,
      name: 'Nandini Milk & Dairy Distributors',
      contactName: 'Suresh Gowda',
      email: 'sales@nandinidairy.in',
      phone: '+91 98450 11223',
      gstin: '29AABCD1234E1Z1',
      paymentTerms: 'NET30',
    },
  });

  const supProduce = await prisma.supplier.upsert({
    where: { id: 'sup-fresh-farms' },
    update: {},
    create: {
      id: 'sup-fresh-farms',
      tenantId: tenant.id,
      name: 'GreenField Agri & Vegetable Wholesalers',
      contactName: 'Manjunath Reddy',
      email: 'orders@greenfieldagri.com',
      phone: '+91 99801 44556',
      gstin: '29AAECG5678F2Z4',
      paymentTerms: 'NET30',
    },
  });

  const po = await prisma.purchaseOrder.upsert({
    where: { tenantId_branchId_poNumber: { tenantId: tenant.id, branchId: branch.id, poNumber: 'PO-2026-001' } },
    update: {},
    create: {
      id: 'po-2026-001',
      tenantId: tenant.id,
      branchId: branch.id,
      supplierId: supProduce.id,
      poNumber: 'PO-2026-001',
      status: 'SENT',
      totalAmount: 18500,
      createdBy: userAdmin.id,
      items: {
        create: [
          { ingredientId: 'ing-onions', quantity: 50, unitPrice: 35, lineTotal: 1750 },
          { ingredientId: 'ing-tomatoes', quantity: 40, unitPrice: 40, lineTotal: 1600 },
          { ingredientId: 'ing-basmati', quantity: 100, unitPrice: 110, lineTotal: 11000 },
        ],
      },
    },
  });
  console.log(`✅ Suppliers & PO (${po.poNumber}) seeded`);

  // ── 12. Phase 2: Staff, Shifts & Attendance ────────────────────────────────
  const shiftMorning = await prisma.shift.upsert({
    where: { id: 'shift-morning' },
    update: {},
    create: { id: 'shift-morning', tenantId: tenant.id, branchId: branch.id, name: 'Morning Shift', startTime: '09:00', endTime: '17:00' },
  });
  const shiftEvening = await prisma.shift.upsert({
    where: { id: 'shift-evening' },
    update: {},
    create: { id: 'shift-evening', tenantId: tenant.id, branchId: branch.id, name: 'Evening Shift', startTime: '16:00', endTime: '00:00' },
  });

  const staffData = [
    { code: 'EMP-001', user: userAdmin, name: 'Admin User', designation: 'Executive Director', dept: 'Management', salary: 85000 },
    { code: 'EMP-002', user: userManager, name: 'Sam Manager', designation: 'General Manager', dept: 'Management', salary: 55000 },
    { code: 'EMP-003', user: userCashier, name: 'Raj Cashier', designation: 'Head Cashier', dept: 'Service', salary: 28000 },
    { code: 'EMP-004', user: userWaiter, name: 'Priya Waiter', designation: 'F&B Captain', dept: 'Service', salary: 24000 },
    { code: 'EMP-005', user: userChef, name: 'Kumar Chef', designation: 'Executive Sous Chef', dept: 'Kitchen', salary: 48000 },
  ];

  for (const s of staffData) {
    const emp = await prisma.employee.upsert({
      where: { id: `emp-${s.code.toLowerCase()}` },
      update: {},
      create: {
        id: `emp-${s.code.toLowerCase()}`,
        tenantId: tenant.id,
        branchId: branch.id,
        userId: s.user.id,
        name: s.name,
        designation: s.designation,
        department: s.dept,
        salary: s.salary,
        isActive: true,
      },
    });

    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    await prisma.attendanceRecord.upsert({
      where: { employeeId_date: { employeeId: emp.id, date: todayDate } },
      update: {},
      create: {
        id: `att-${emp.id}-${todayDate.toISOString().slice(0, 10)}`,
        tenantId: tenant.id,
        branchId: branch.id,
        employeeId: emp.id,
        date: todayDate,
        checkInAt: new Date(Date.now() - 4 * 3600 * 1000),
        status: 'PRESENT',
        hoursWorked: 4,
      },
    });
  }
  console.log('✅ Staff, Shifts & Attendance records seeded');

  // ── 13. Phase 2: Expense Categories & Expenses ─────────────────────────────
  const expCatRent = await prisma.expenseCategory.upsert({
    where: { id: 'expcat-rent' },
    update: {},
    create: { id: 'expcat-rent', tenantId: tenant.id, name: 'Rent & Lease' },
  });
  const expCatUtil = await prisma.expenseCategory.upsert({
    where: { id: 'expcat-util' },
    update: {},
    create: { id: 'expcat-util', tenantId: tenant.id, name: 'Electricity & Gas' },
  });
  const expCatMaint = await prisma.expenseCategory.upsert({
    where: { id: 'expcat-maint' },
    update: {},
    create: { id: 'expcat-maint', tenantId: tenant.id, name: 'Repairs & Maintenance' },
  });

  await prisma.expense.upsert({
    where: { id: 'exp-2026-001' },
    update: {},
    create: {
      id: 'exp-2026-001',
      tenantId: tenant.id,
      branchId: branch.id,
      categoryId: expCatUtil.id,
      amount: 4200,
      date: new Date(),
      paymentMode: 'UPI',
      description: 'Commercial LPG Cylinder Refill (2x 19kg)',
      status: 'APPROVED',
      createdBy: userAdmin.id,
    },
  });
  await prisma.expense.upsert({
    where: { id: 'exp-2026-002' },
    update: {},
    create: {
      id: 'exp-2026-002',
      tenantId: tenant.id,
      branchId: branch.id,
      categoryId: expCatMaint.id,
      amount: 1850,
      date: new Date(),
      paymentMode: 'CASH',
      description: 'Kitchen exhaust hood deep steam service',
      status: 'APPROVED',
      createdBy: userManager.id,
    },
  });
  console.log('✅ Expenses & vouchers seeded');

  // ── 14. Phase 2: Customers & Reservations ──────────────────────────────────
  const cust1 = await prisma.customer.upsert({
    where: { tenantId_phone: { tenantId: tenant.id, phone: '+91 98765 43210' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Ananya Sharma',
      phone: '+91 98765 43210',
      email: 'ananya.sharma@example.com',
      loyaltyPoints: 420,
    },
  });

  const cust2 = await prisma.customer.upsert({
    where: { tenantId_phone: { tenantId: tenant.id, phone: '+91 91234 56789' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Rohan Mehra',
      phone: '+91 91234 56789',
      email: 'rohan.mehra@example.com',
      loyaltyPoints: 850,
    },
  });

  const resDate = new Date();
  resDate.setHours(19, 30, 0, 0);

  await prisma.reservation.upsert({
    where: { id: 'res-2026-001' },
    update: {},
    create: {
      id: 'res-2026-001',
      tenantId: tenant.id,
      branchId: branch.id,
      customerId: cust1.id,
      customerName: cust1.name,
      customerPhone: cust1.phone,
      tableId: tables[4].id,
      partySize: 6,
      date: resDate,
      timeSlot: '19:30',
      status: 'CONFIRMED',
      specialRequests: 'Window side preferred, celebration cake arrival',
    },
  });
  console.log('✅ Customers & Reservations seeded');

  // ── 15. Live Active Orders & KDS Workflow ──────────────────────────────────
  const butterChickenItem = createdMenuItems.find((m) => m.name === 'Butter Chicken')!;
  const naanItem = createdMenuItems.find((m) => m.name === 'Butter Naan')!;
  const lassiItem = createdMenuItems.find((m) => m.name === 'Mango Lassi')!;

  const existingOrder = await prisma.order.findFirst({
    where: { tenantId: tenant.id, branchId: branch.id, orderNumber: 'ORD-1001' },
  });

  if (!existingOrder) {
    const liveOrder = await prisma.order.create({
      data: {
        id: 'ord-live-1001',
        tenantId: tenant.id,
        branchId: branch.id,
        tableId: tables[1].id,
        orderNumber: 'ORD-1001',
        type: 'DINE_IN',
        status: 'PREPARING',
        createdBy: userWaiter.id,
        waiterId: userWaiter.id,
        subtotal: 578,
        taxAmount: 28.9,
        discountAmount: 0,
        total: 606.9,
        items: {
          create: [
            {
              menuItemId: butterChickenItem.id,
              variantId: butterChickenItem.variants[0]?.id,
              quantity: 1,
              unitPrice: 349,
              lineTotal: 349,
              status: 'PREPARING',
            },
            {
              menuItemId: naanItem.id,
              variantId: naanItem.variants[0]?.id,
              quantity: 2,
              unitPrice: 50,
              lineTotal: 100,
              status: 'PREPARING',
            },
            {
              menuItemId: lassiItem.id,
              variantId: lassiItem.variants[0]?.id,
              quantity: 1,
              unitPrice: 129,
              lineTotal: 129,
              status: 'READY',
            },
          ],
        },
      },
      include: { items: true },
    });

    await prisma.orderKot.create({
      data: {
        id: 'kot-live-001',
        orderId: liveOrder.id,
        branchId: branch.id,
        kitchenStationId: mainKitchen.id,
        kotNumber: 'KOT-001',
        status: 'PREPARING',
        items: {
          create: [
            { orderItemId: liveOrder.items[0].id, status: 'PREPARING' },
            { orderItemId: liveOrder.items[1].id, status: 'PREPARING' },
          ],
        },
      },
    });

    console.log(`✅ Live Order (${liveOrder.orderNumber}) and KOT seeded`);
  }

  // ── 15. Multi-Tenant Provisioning (Tenant 2: Urban Bistro & Tenant 3: Tokyo Ramen) ──
  console.log('\n🏢 Seeding additional isolated tenants for multi-tenancy verification...');

  // Tenant 2: Urban Bistro
  const tenant2 = await prisma.tenant.upsert({
    where: { slug: 'urban-bistro' },
    update: {},
    create: {
      name: 'Urban Bistro & Grill',
      slug: 'urban-bistro',
      plan: 'enterprise',
      status: 'ACTIVE',
      settings: JSON.stringify({ currency: 'INR', theme: 'dark' }),
    },
  });

  const bistroBranch = await prisma.branch.upsert({
    where: { id: 'branch-ub-main' },
    update: {},
    create: {
      id: 'branch-ub-main',
      tenantId: tenant2.id,
      name: 'Downtown Flagship',
      address: 'Lavelle Road, Bangalore',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
    },
  });

  const role2 = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant2.id, name: 'OWNER' } },
    update: {},
    create: { tenantId: tenant2.id, name: 'OWNER', isSystemRole: true },
  });

  const user2 = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant2.id, email: 'owner@urbanbistro.com' } },
    update: { isActive: true },
    create: { tenantId: tenant2.id, name: 'Urban Bistro Owner', email: 'owner@urbanbistro.com', passwordHash: password, isActive: true },
  });

  await prisma.userBranchRole.upsert({
    where: { userId_branchId_roleId: { userId: user2.id, branchId: bistroBranch.id, roleId: role2.id } },
    update: {},
    create: { userId: user2.id, branchId: bistroBranch.id, roleId: role2.id },
  });

  await prisma.restaurantTable.upsert({
    where: { id: 'table-ub-01' },
    update: {},
    create: { id: 'table-ub-01', tenantId: tenant2.id, branchId: bistroBranch.id, name: 'Bistro Table 1', capacity: 2, status: 'AVAILABLE' },
  });

  // Tenant 3: Tokyo Ramen (Suspended Demo)
  const tenant3 = await prisma.tenant.upsert({
    where: { slug: 'tokyo-ramen' },
    update: {},
    create: {
      name: 'Tokyo Ramen Bar',
      slug: 'tokyo-ramen',
      plan: 'starter',
      status: 'SUSPENDED',
      settings: JSON.stringify({ currency: 'INR', theme: 'dark' }),
    },
  });

  const ramenBranch = await prisma.branch.upsert({
    where: { id: 'branch-tr-main' },
    update: {},
    create: {
      id: 'branch-tr-main',
      tenantId: tenant3.id,
      name: 'Koramangala Express',
      address: '5th Block, Koramangala, Bangalore',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
    },
  });

  console.log(`✅ Multi-Tenant organizations seeded: '${platformTenant.name}', '${tenant.name}', '${tenant2.name}', '${tenant3.name}'`);

  console.log('\n=============================================================');
  console.log('🎉 ROS ENTERPRISE MULTI-TENANT SEED COMPLETE');
  console.log('=============================================================');
  console.log('Credentials (Password for all: Admin@1234):');
  console.log('  👑 Platform Super Admin: superadmin@ros.com (Global Platform Control)');
  console.log('  🏢 Tenant Admin        : admin@spicegarden.com (Spice Garden - Active)');
  console.log('  🏢 Tenant Owner        : owner@urbanbistro.com (Urban Bistro - Active)');
  console.log('  🏢 Tenant Suspended    : owner@tokyoramen.com (Tokyo Ramen - Suspended)');
  console.log('=============================================================');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
