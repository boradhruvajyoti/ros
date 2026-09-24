"use strict";
// =============================================================================
// Prisma Seed — creates demo tenant, branch, users, roles, menu, tables
// =============================================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Seeding ROS database...');
    // ── Permissions ─────────────────────────────────────────────────────────
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
    // ── Tenant ──────────────────────────────────────────────────────────────
    const tenant = await prisma.tenant.upsert({
        where: { slug: 'spice-garden' },
        update: {},
        create: {
            name: 'Spice Garden Restaurant',
            slug: 'spice-garden',
            plan: 'professional',
            status: 'ACTIVE',
        },
    });
    console.log(`✅ Tenant: ${tenant.name}`);
    // ── Branch ──────────────────────────────────────────────────────────────
    const branch = await prisma.branch.upsert({
        where: { id: 'branch-sg-main' },
        update: {},
        create: {
            id: 'branch-sg-main',
            tenantId: tenant.id,
            name: 'Main Branch',
            address: '12 MG Road, Bangalore, Karnataka 560001',
            phone: '+91 80 1234 5678',
            email: 'main@spicegarden.com',
            gstin: '29AABCU9603R1ZX',
            timezone: 'Asia/Kolkata',
            currency: 'INR',
        },
    });
    console.log(`✅ Branch: ${branch.name}`);
    // ── Roles ────────────────────────────────────────────────────────────────
    const allPermIds = allPerms.map((p) => p.id);
    const adminPerms = allPermIds; // Admin gets all
    const managerPerms = allPerms
        .filter((p) => !['tenants:manage', 'users:delete', 'roles:create', 'roles:edit'].includes(p.code))
        .map((p) => p.id);
    const cashierPerms = [
        'orders:view', 'orders:create', 'orders:edit', 'orders:cancel',
        'payments:view', 'payments:create',
        'menu:view', 'tables:view', 'tables:edit',
        'customers:view', 'customers:create',
        'reservations:view',
        'cash:view', 'cash:open', 'cash:close',
        'discount:apply',
        'reports:view',
    ].map((c) => permByCode.get(c).id);
    const waiterPerms = [
        'orders:view', 'orders:create', 'orders:edit',
        'menu:view', 'tables:view', 'tables:edit',
        'customers:view', 'customers:create',
        'reservations:view', 'reservations:create', 'reservations:edit',
        'kitchen:view',
    ].map((c) => permByCode.get(c).id);
    const kitchenPerms = [
        'kitchen:view', 'kitchen:update',
        'orders:view',
        'inventory:view',
    ].map((c) => permByCode.get(c).id);
    const createRole = async (name, permIds, isSystem = true) => {
        const role = await prisma.role.upsert({
            where: { tenantId_name: { tenantId: tenant.id, name } },
            update: {},
            create: { tenantId: tenant.id, name, isSystemRole: isSystem },
        });
        // Upsert permissions for role
        await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
        await prisma.rolePermission.createMany({
            data: [...new Set(permIds)].map((permId) => ({ roleId: role.id, permissionId: permId })),
            skipDuplicates: true,
        });
        return role;
    };
    const adminRole = await createRole('ADMINISTRATOR', adminPerms);
    const managerRole = await createRole('GENERAL_MANAGER', managerPerms);
    const cashierRole = await createRole('CASHIER', cashierPerms);
    const waiterRole = await createRole('WAITER', waiterPerms);
    const kitchenRole = await createRole('KITCHEN_STAFF', kitchenPerms);
    console.log('✅ Roles seeded');
    // ── Users ────────────────────────────────────────────────────────────────
    const password = await bcryptjs_1.default.hash('Admin@1234', 12);
    const createUser = async (name, email, roleId) => {
        const user = await prisma.user.upsert({
            where: { tenantId_email: { tenantId: tenant.id, email } },
            update: {},
            create: { tenantId: tenant.id, name, email, passwordHash: password },
        });
        await prisma.userBranchRole.upsert({
            where: { userId_branchId_roleId: { userId: user.id, branchId: branch.id, roleId } },
            update: {},
            create: { userId: user.id, branchId: branch.id, roleId },
        });
        return user;
    };
    await createUser('Admin User', 'admin@spicegarden.com', adminRole.id);
    await createUser('Manager Sam', 'manager@spicegarden.com', managerRole.id);
    await createUser('Cashier Raj', 'cashier@spicegarden.com', cashierRole.id);
    await createUser('Waiter Priya', 'waiter@spicegarden.com', waiterRole.id);
    await createUser('Chef Kumar', 'chef@spicegarden.com', kitchenRole.id);
    console.log('✅ Users seeded (password: Admin@1234)');
    // ── Kitchen Stations ────────────────────────────────────────────────────
    const stationsData = [
        { name: 'Main Kitchen', displayColor: '#EF4444', sortOrder: 1 },
        { name: 'Starters', displayColor: '#F97316', sortOrder: 2 },
        { name: 'Tandoor', displayColor: '#EAB308', sortOrder: 3 },
        { name: 'Beverages', displayColor: '#3B82F6', sortOrder: 4 },
        { name: 'Desserts', displayColor: '#A855F7', sortOrder: 5 },
    ];
    const stations = [];
    for (const s of stationsData) {
        const station = await prisma.kitchenStation.upsert({
            where: {
                id: `station-${s.name.toLowerCase().replace(/\s+/g, '-')}`,
            },
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
    // ── Floor & Tables ──────────────────────────────────────────────────────
    const floor = await prisma.floor.upsert({
        where: { id: 'floor-main' },
        update: {},
        create: {
            id: 'floor-main',
            tenantId: tenant.id,
            branchId: branch.id,
            name: 'Ground Floor',
            sortOrder: 1,
        },
    });
    const tablesData = [
        { name: 'T1', capacity: 2, posX: 80, posY: 80 },
        { name: 'T2', capacity: 2, posX: 220, posY: 80 },
        { name: 'T3', capacity: 4, posX: 360, posY: 80 },
        { name: 'T4', capacity: 4, posX: 500, posY: 80 },
        { name: 'T5', capacity: 6, posX: 80, posY: 220 },
        { name: 'T6', capacity: 6, posX: 260, posY: 220 },
        { name: 'T7', capacity: 8, posX: 440, posY: 220 },
        { name: 'T8', capacity: 4, posX: 80, posY: 360 },
        { name: 'T9', capacity: 4, posX: 220, posY: 360 },
        { name: 'T10', capacity: 4, posX: 360, posY: 360 },
    ];
    for (const t of tablesData) {
        await prisma.restaurantTable.upsert({
            where: { id: `table-${t.name.toLowerCase()}` },
            update: {},
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
                status: 'AVAILABLE',
            },
        });
    }
    console.log('✅ Tables seeded');
    // ── Menu Categories ──────────────────────────────────────────────────────
    const cats = {};
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
    console.log('✅ Menu categories seeded');
    // ── Menu Items ────────────────────────────────────────────────────────────
    const mainKitchen = stations[0];
    const startersStation = stations[1];
    const beverageStation = stations[3];
    const dessertStation = stations[4];
    const menuItems = [
        // Starters
        { name: 'Paneer Tikka', categoryId: cats['cat-starters'].id, stationId: startersStation.id, foodType: 'VEG', variants: [{ name: 'Half', price: 249, cost: 80 }, { name: 'Full', price: 449, cost: 150 }] },
        { name: 'Chicken 65', categoryId: cats['cat-starters'].id, stationId: startersStation.id, foodType: 'NON_VEG', variants: [{ name: 'Half', price: 299, cost: 100 }, { name: 'Full', price: 549, cost: 185 }] },
        { name: 'Veg Spring Rolls', categoryId: cats['cat-starters'].id, stationId: startersStation.id, foodType: 'VEG', variants: [{ name: 'Regular', price: 199, cost: 60 }] },
        // Main Course
        { name: 'Butter Chicken', categoryId: cats['cat-main'].id, stationId: mainKitchen.id, foodType: 'NON_VEG', variants: [{ name: 'Half', price: 349, cost: 120 }, { name: 'Full', price: 649, cost: 220 }] },
        { name: 'Dal Makhani', categoryId: cats['cat-main'].id, stationId: mainKitchen.id, foodType: 'VEG', variants: [{ name: 'Half', price: 249, cost: 70 }, { name: 'Full', price: 449, cost: 130 }] },
        { name: 'Palak Paneer', categoryId: cats['cat-main'].id, stationId: mainKitchen.id, foodType: 'VEG', variants: [{ name: 'Half', price: 279, cost: 90 }, { name: 'Full', price: 499, cost: 165 }] },
        { name: 'Chicken Biryani', categoryId: cats['cat-main'].id, stationId: mainKitchen.id, foodType: 'NON_VEG', variants: [{ name: 'Single', price: 349, cost: 130 }, { name: 'Double', price: 649, cost: 250 }] },
        // Breads
        { name: 'Butter Naan', categoryId: cats['cat-breads'].id, stationId: mainKitchen.id, foodType: 'VEG', variants: [{ name: 'Piece', price: 50, cost: 12 }] },
        { name: 'Garlic Naan', categoryId: cats['cat-breads'].id, stationId: mainKitchen.id, foodType: 'VEG', variants: [{ name: 'Piece', price: 65, cost: 15 }] },
        { name: 'Jeera Rice', categoryId: cats['cat-breads'].id, stationId: mainKitchen.id, foodType: 'VEG', variants: [{ name: 'Plate', price: 149, cost: 40 }] },
        // Beverages
        { name: 'Mango Lassi', categoryId: cats['cat-beverages'].id, stationId: beverageStation.id, foodType: 'VEG', variants: [{ name: 'Glass', price: 129, cost: 35 }] },
        { name: 'Masala Chai', categoryId: cats['cat-beverages'].id, stationId: beverageStation.id, foodType: 'VEG', variants: [{ name: 'Cup', price: 60, cost: 15 }] },
        { name: 'Fresh Lime Soda', categoryId: cats['cat-beverages'].id, stationId: beverageStation.id, foodType: 'VEG', variants: [{ name: 'Glass', price: 89, cost: 20 }] },
        // Desserts
        { name: 'Gulab Jamun', categoryId: cats['cat-desserts'].id, stationId: dessertStation.id, foodType: 'VEG', variants: [{ name: '2 Pieces', price: 99, cost: 30 }] },
        { name: 'Rasmalai', categoryId: cats['cat-desserts'].id, stationId: dessertStation.id, foodType: 'VEG', variants: [{ name: '2 Pieces', price: 129, cost: 40 }] },
    ];
    for (const item of menuItems) {
        const { variants, stationId, ...itemData } = item;
        await prisma.menuItem.upsert({
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
        });
    }
    console.log('✅ Menu items seeded');
    // ── Tax Configuration ─────────────────────────────────────────────────────
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
    // ── Cash Register ──────────────────────────────────────────────────────────
    await prisma.cashRegister.upsert({
        where: { id: 'register-main' },
        update: {},
        create: {
            id: 'register-main',
            tenantId: tenant.id,
            branchId: branch.id,
            name: 'Main Counter',
            currentBalance: 0,
        },
    });
    console.log('\n🎉 Seed complete!');
    console.log('─────────────────────────────────────');
    console.log('Login credentials (all same password: Admin@1234)');
    console.log('  Admin:   admin@spicegarden.com');
    console.log('  Manager: manager@spicegarden.com');
    console.log('  Cashier: cashier@spicegarden.com');
    console.log('  Waiter:  waiter@spicegarden.com');
    console.log('  Chef:    chef@spicegarden.com');
    console.log(`  Branch ID: ${branch.id}`);
    console.log('─────────────────────────────────────');
}
main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map