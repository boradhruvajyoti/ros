// =============================================================================
// Staff & HR Controller — Employees, User Accounts, Permissions & Attendance
// =============================================================================

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { sendSuccess, AppError } from '../middlewares/error.middleware';
import { ErrorCodes } from '@ros/shared-types';
import { z } from 'zod';

export const FEATURE_MODULES = [
  {
    id: 'pos',
    name: 'Point of Sale (POS)',
    description: 'Touch order billing, table orders, cart modifiers, fast pay',
    permissions: ['orders:create', 'orders:view', 'payments:create', 'payments:view'],
  },
  {
    id: 'tables',
    name: 'Tables & Orders Command Center',
    description: 'Floor view, live table orders, KOT status advance, billing preview',
    permissions: ['tables:view', 'tables:edit', 'orders:view', 'orders:edit'],
  },
  {
    id: 'kitchen',
    name: 'Kitchen Display System (KDS)',
    description: 'Live KOT tickets, accept orders, food ready bump action',
    permissions: ['kitchen:view', 'kitchen:update'],
  },
  {
    id: 'history',
    name: 'Order History & Invoices',
    description: 'View previous orders, reprint receipts, audit customer bills',
    permissions: ['orders:view', 'payments:view'],
  },
  {
    id: 'reservations',
    name: 'Table Reservations',
    description: 'Book tables, manage calendar, guest arrivals',
    permissions: ['reservations:view', 'reservations:create', 'reservations:edit', 'reservations:cancel'],
  },
  {
    id: 'menu',
    name: 'Menu & Category Management',
    description: 'Create dishes, prices, half/full variants, modifier groups',
    permissions: ['menu:view', 'menu:create', 'menu:edit', 'menu:delete'],
  },
  {
    id: 'inventory',
    name: 'Inventory & Recipe Yields',
    description: 'Track ingredient stocks, production recipes, stock transfers',
    permissions: ['inventory:view', 'inventory:adjust', 'inventory:count', 'inventory:transfer'],
  },
  {
    id: 'procurement',
    name: 'Procurement & Vendors',
    description: 'Purchase orders, supplier goods receipt notes',
    permissions: ['procurement:view', 'procurement:create', 'procurement:receive'],
  },
  {
    id: 'customers',
    name: 'Customers CRM & Loyalty',
    description: 'Guest contacts, visit frequency, loyalty points',
    permissions: ['customers:view', 'customers:create', 'customers:edit', 'loyalty:view'],
  },
  {
    id: 'expenses',
    name: 'Expenses & Financials',
    description: 'Daily operational expenses, payouts, cash out logs',
    permissions: ['expenses:view', 'expenses:create', 'expenses:approve'],
  },
  {
    id: 'reports',
    name: 'Reports & P&L Analytics',
    description: 'Sales summaries, tax reports, item performance',
    permissions: ['reports:view', 'reports:export'],
  },
  {
    id: 'staff',
    name: 'Staff & Team HR',
    description: 'Employee roster, attendance check-ins, staff accounts',
    permissions: ['staff:view', 'staff:create', 'staff:edit', 'attendance:view', 'attendance:manage'],
  },
  {
    id: 'settings',
    name: 'Restaurant Settings & Hardware',
    description: 'Tax configurations, thermal printer settings, general preferences',
    permissions: ['settings:view', 'settings:edit'],
  },
];

const createEmployeeSchema = z.object({
  name: z.string().min(1),
  department: z.string().min(1),
  designation: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  salary: z.number().nonnegative().optional(),
  // User account creation options
  createUserAccount: z.boolean().optional(),
  password: z.string().min(4).optional(),
  roleName: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

const punchAttendanceSchema = z.object({
  employeeId: z.string(),
  status: z.enum(['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE']),
  notes: z.string().optional(),
});

export class StaffController {
  static async listEmployees(req: Request, res: Response) {
    const employees = await prisma.employee.findMany({
      where: { tenantId: req.user!.tid, branchId: req.user!.bid!, isActive: true },
      include: {
        attendance: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    const userIds = employees.map((e) => e.userId).filter(Boolean) as string[];
    const users =
      userIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: {
              id: true,
              email: true,
              name: true,
              phone: true,
              isActive: true,
              branchRoles: {
                include: {
                  role: {
                    include: {
                      permissions: { include: { permission: true } },
                    },
                  },
                },
              },
            },
          })
        : [];

    const userMap = new Map(users.map((u) => [u.id, u]));

    const enriched = employees.map((emp) => {
      const user = emp.userId ? userMap.get(emp.userId) : null;
      return {
        ...emp,
        user: user
          ? {
              id: user.id,
              email: user.email,
              roles: user.branchRoles.map((br) => br.role.name),
              permissions: Array.from(
                new Set(user.branchRoles.flatMap((br) => br.role.permissions.map((p) => p.permission.code)))
              ),
            }
          : null,
      };
    });

    sendSuccess(res, enriched);
  }

  static async createEmployee(req: Request, res: Response) {
    const data = createEmployeeSchema.parse(req.body);
    const tenantId = req.user!.tid;
    const branchId = req.user!.bid!;

    let createdUserId: string | null = null;

    // If user account creation is requested
    if (data.createUserAccount && data.email && data.password) {
      const normalizedEmail = data.email.toLowerCase().trim();

      // Check if user account already exists in this tenant
      const existingUser = await prisma.user.findUnique({
        where: {
          tenantId_email: {
            tenantId,
            email: normalizedEmail,
          },
        },
      });

      if (existingUser) {
        throw new AppError(
          ErrorCodes.ALREADY_EXISTS,
          `A user account with email "${normalizedEmail}" already exists for this restaurant.`,
          409
        );
      }

      const passwordHash = await bcrypt.hash(data.password, 10);

      // Determine or create Role
      const roleName = (data.roleName || data.designation || 'STAFF').toUpperCase().replace(/\s+/g, '_');
      let role = await prisma.role.findFirst({
        where: { tenantId, name: roleName },
      });

      if (!role) {
        role = await prisma.role.create({
          data: {
            tenantId,
            name: roleName,
            description: `${data.designation || roleName} User Role`,
          },
        });
      }

      // Assign selected permissions to this role
      if (data.permissions && data.permissions.length > 0) {
        for (const code of data.permissions) {
          // Ensure permission exists in DB
          let perm = await prisma.permission.findUnique({ where: { code } });
          if (!perm) {
            perm = await prisma.permission.create({
              data: {
                code,
                category: code.split(':')[0] || 'general',
                description: `${code} feature access`,
              },
            });
          }

          // Link to role
          await prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: role.id,
                permissionId: perm.id,
              },
            },
            create: {
              roleId: role.id,
              permissionId: perm.id,
            },
            update: {},
          });
        }
      }

      // Create User
      const newUser = await prisma.user.create({
        data: {
          tenantId,
          name: data.name,
          email: normalizedEmail,
          phone: data.phone || null,
          passwordHash,
          isActive: true,
          branchRoles: {
            create: {
              branchId,
              roleId: role.id,
            },
          },
        },
      });

      createdUserId = newUser.id;
    }

    const employee = await prisma.employee.create({
      data: {
        name: data.name,
        department: data.department,
        designation: data.designation,
        phone: data.phone || null,
        email: data.email || null,
        salary: data.salary || 0,
        userId: createdUserId,
        tenantId,
        branchId,
      },
    });

    sendSuccess(res, employee, 201);
  }

  static async deleteEmployee(req: Request, res: Response) {
    const { id } = req.params;
    const tenantId = req.user!.tid;

    const employee = await prisma.employee.findFirst({
      where: { id, tenantId },
    });

    if (!employee) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Staff member not found', 404);
    }

    // If staff member has a linked login account, deactivate and remove branch roles
    if (employee.userId) {
      await prisma.userBranchRole.deleteMany({
        where: { userId: employee.userId },
      });

      await prisma.user.updateMany({
        where: { id: employee.userId, tenantId },
        data: { isActive: false, deletedAt: new Date() },
      });
    }

    // Clean up dependent employee records
    await prisma.attendanceRecord.deleteMany({ where: { employeeId: id } });
    await prisma.employeeShift.deleteMany({ where: { employeeId: id } });
    await prisma.leaveRecord.deleteMany({ where: { employeeId: id } });
    await prisma.employee.delete({ where: { id } });

    sendSuccess(res, { message: 'Staff member removed successfully' });
  }

  static async listAvailablePermissions(req: Request, res: Response) {
    sendSuccess(res, FEATURE_MODULES);
  }

  static async punchAttendance(req: Request, res: Response) {
    const data = punchAttendanceSchema.parse(req.body);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await prisma.attendanceRecord.upsert({
      where: {
        employeeId_date: {
          employeeId: data.employeeId,
          date: today,
        },
      },
      create: {
        tenantId: req.user!.tid,
        branchId: req.user!.bid!,
        employeeId: data.employeeId,
        date: today,
        checkInAt: new Date(),
        status: data.status,
        notes: data.notes || null,
      },
      update: {
        checkOutAt: new Date(),
        status: data.status,
      },
    });

    sendSuccess(res, record);
  }

  static async listRoles(req: Request, res: Response) {
    const roles = await prisma.role.findMany({
      where: {
        tenantId: req.user!.tid,
      },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { userBranchRoles: true } },
      },
      orderBy: { name: 'asc' },
    });
    sendSuccess(res, roles);
  }

  static async listShifts(req: Request, res: Response) {
    const shifts = await prisma.shift.findMany({
      where: { tenantId: req.user!.tid, branchId: req.user!.bid! },
      include: { employeeShifts: { include: { employee: true } } },
      orderBy: { startTime: 'asc' },
    });
    sendSuccess(res, shifts);
  }

  static async listAttendance(req: Request, res: Response) {
    const records = await prisma.attendanceRecord.findMany({
      where: { tenantId: req.user!.tid, branchId: req.user!.bid! },
      include: { employee: true },
      orderBy: { date: 'desc' },
      take: 100,
    });
    sendSuccess(res, records);
  }
}
