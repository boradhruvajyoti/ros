// =============================================================================
// Staff & HR Controller — Employees, User Accounts, Permissions & Attendance
// =============================================================================

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { sendSuccess, AppError } from '../middlewares/error.middleware';
import { ErrorCodes } from '@ros/shared-types';
import { TelegramService } from '../services/telegram.service';
import { cacheDel } from '../lib/redis';
import { z } from 'zod';

export const FEATURE_MODULES = [
  // Primary Operations
  {
    id: 'dashboard',
    name: 'Dashboard Overview',
    description: 'Executive dashboard, real-time live revenue counters and activity feed',
    keyPermission: 'reports:view',
    permissions: ['reports:view'],
  },
  {
    id: 'tables',
    name: 'Tables',
    description: 'Floor view, live table orders, KOT status advance, billing preview',
    keyPermission: 'tables:view',
    permissions: ['tables:view', 'tables:edit', 'orders:view', 'orders:edit', 'menu:view'],
  },
  {
    id: 'pos',
    name: 'Point of Sale (POS)',
    description: 'Touch order billing, table orders, cart modifiers, fast pay',
    keyPermission: 'orders:create',
    permissions: ['orders:create', 'orders:edit', 'payments:create', 'discount:apply', 'menu:view'],
  },
  {
    id: 'kitchen',
    name: 'Kitchen Display System (KDS)',
    description: 'Live KOT tickets, accept orders, cooking bump, partial/full cancel',
    keyPermission: 'kitchen:view',
    permissions: ['kitchen:view', 'kitchen:update', 'orders:view', 'menu:view'],
  },
  {
    id: 'history',
    name: 'Order History & Invoices',
    description: 'View previous orders, reprint receipts, audit customer bills',
    keyPermission: 'payments:view',
    permissions: ['orders:view', 'payments:view'],
  },
  {
    id: 'reservations',
    name: 'Table Reservations',
    description: 'Book tables, manage calendar, guest arrivals',
    keyPermission: 'reservations:view',
    permissions: ['reservations:view', 'reservations:create', 'reservations:edit', 'reservations:cancel'],
  },

  // Inventory & Kitchen
  {
    id: 'menu',
    name: 'Menu & Category Management',
    description: 'Create dishes, prices, half/full variants, modifier groups',
    keyPermission: 'menu:create',
    permissions: ['menu:view', 'menu:create', 'menu:edit', 'menu:delete'],
  },
  {
    id: 'inventory',
    name: 'Stock & Inventory',
    description: 'Track ingredient stocks, low stock alerts, stock physical counts',
    keyPermission: 'inventory:view',
    permissions: ['inventory:view', 'inventory:adjust', 'inventory:count'],
  },
  {
    id: 'production',
    name: 'Recipe Yields & Production',
    description: 'Batch production, sub-recipes, kitchen prep batch conversions',
    keyPermission: 'inventory:write-off',
    permissions: ['inventory:view', 'inventory:write-off'],
  },
  {
    id: 'procurement',
    name: 'Procurement & Vendors',
    description: 'Purchase orders, supplier bills, goods receipt notes (GRN)',
    keyPermission: 'procurement:view',
    permissions: ['procurement:view', 'procurement:create', 'procurement:receive', 'procurement:approve'],
  },
  {
    id: 'transfers',
    name: 'Stock Transfers',
    description: 'Inter-branch stock transfers and central warehouse dispatch',
    keyPermission: 'inventory:transfer',
    permissions: ['inventory:view', 'inventory:transfer'],
  },

  // Finance & Management
  {
    id: 'customers',
    name: 'Customers CRM & Loyalty',
    description: 'Guest contacts, visit frequency, loyalty reward points',
    keyPermission: 'customers:view',
    permissions: ['customers:view', 'customers:create', 'loyalty:view'],
  },
  {
    id: 'staff',
    name: 'Staff & Team HR',
    description: 'Employee roster, attendance check-ins, staff accounts & access control',
    keyPermission: 'staff:view',
    permissions: ['staff:view', 'staff:create', 'staff:edit', 'attendance:view', 'attendance:manage'],
  },
  {
    id: 'expenses',
    name: 'Expenses & Payouts',
    description: 'Daily operational expenses, petty cash, payout vouchers',
    keyPermission: 'expenses:view',
    permissions: ['expenses:view', 'expenses:create', 'expenses:approve'],
  },
  {
    id: 'reports',
    name: 'Reports & P&L Analytics',
    description: 'Sales summaries, tax reports, item performance, profit & loss',
    keyPermission: 'reports:export',
    permissions: ['reports:view', 'reports:export'],
  },

  // Growth & Engagement
  {
    id: 'ai-insights',
    name: 'AI Insights & Forecasts',
    description: 'AI revenue forecast, demand prediction, inventory wastage alerts',
    keyPermission: 'loyalty:adjust',
    permissions: ['reports:view', 'loyalty:adjust'],
  },
  {
    id: 'marketing',
    name: 'Marketing & Promotions',
    description: 'Coupon codes, happy hour discounts, customer campaigns',
    keyPermission: 'price:override',
    permissions: ['customers:view', 'price:override'],
  },
  {
    id: 'gift-cards',
    name: 'Gift Cards & Vouchers',
    description: 'Issue gift vouchers, redeem prepaid cards, customer balances',
    keyPermission: 'payments:refund',
    permissions: ['customers:view', 'payments:refund'],
  },
  {
    id: 'feedback',
    name: 'Guest Feedback & Ratings',
    description: 'Customer ratings, food quality reviews, dining experience surveys',
    keyPermission: 'customers:edit',
    permissions: ['customers:view', 'customers:edit'],
  },
  {
    id: 'integrations',
    name: 'Aggregators & Online Integrations',
    description: 'Zomato, Swiggy, UberEats, WhatsApp ordering channel integrations',
    keyPermission: 'branches:view',
    permissions: ['settings:view', 'branches:view'],
  },

  // Operations & Tech
  {
    id: 'kiosk',
    name: 'Touch Kiosk System',
    description: 'Self-ordering guest kiosk mode with touch menu interface',
    keyPermission: 'orders:void',
    permissions: ['orders:create', 'orders:void'],
  },
  {
    id: 'franchise',
    name: 'Franchise HQ & Multi-Outlet',
    description: 'Franchise royalty fee tracking and central brand controls',
    keyPermission: 'branches:create',
    permissions: ['branches:view', 'branches:create'],
  },

  // Administration
  {
    id: 'settings',
    name: 'Restaurant Settings',
    description: 'Restaurant taxes (GST/VAT), service charge, operating hours',
    keyPermission: 'settings:edit',
    permissions: ['settings:view', 'settings:edit'],
  },
  {
    id: 'hardware',
    name: 'Hardware & Printers Setup',
    description: 'Network thermal printers, cash drawer triggers, barcode scanners',
    keyPermission: 'cash:open',
    permissions: ['settings:view', 'cash:open'],
  },
  {
    id: 'audit-vault',
    name: 'Security Audit Vault',
    description: 'Immutable ledger of staff logins, bill voids, and sensitive actions',
    keyPermission: 'cash:close',
    permissions: ['settings:view', 'cash:close'],
  },
];

export const TELEGRAM_NOTIFICATION_CATALOG = [
  {
    id: 'ORDER_QR_NEW',
    category: 'Orders & Service',
    name: 'QR Menu New Orders',
    description: 'Alert when a customer places an order via QR menu with table & order type (Dine In / Parcel)',
  },
  {
    id: 'KOT_SENT',
    category: 'Orders & Service',
    name: 'KOT Sent to Kitchen',
    description: 'Alert when an order is fired and KOT is routed to kitchen displays/printers',
  },
  {
    id: 'KOT_ACCEPTED',
    category: 'Kitchen Display',
    name: 'KDS Order Accepted',
    description: 'Alert when chef acknowledges/accepts ticket in kitchen display',
  },
  {
    id: 'FOOD_READY',
    category: 'Kitchen Display',
    name: 'Food Ready to Serve',
    description: 'Alert waitstaff when dishes are marked ready for pickup at pass',
  },
  {
    id: 'FOOD_SERVED',
    category: 'Orders & Service',
    name: 'Food Served to Table',
    description: 'Alert when order items are marked served at the guest table',
  },
  {
    id: 'BILL_PAID',
    category: 'Billing & Cash',
    name: 'Bill Paid & Settled',
    description: 'Real-time billing alert with table info, ordered items, amount, and item count',
  },
  {
    id: 'ORDER_CANCELLED_TABLES',
    category: 'Cancellations & Voids',
    name: 'Order Cancelled (Floor / Tables)',
    description: 'Alert when items or full orders are cancelled on floor tables view',
  },
  {
    id: 'ORDER_CANCELLED_KITCHEN',
    category: 'Cancellations & Voids',
    name: 'Order Cancelled (Kitchen Display)',
    description: 'Alert when chef or kitchen supervisor voids/cancels items in KDS',
  },
  {
    id: 'DAILY_SALES_REPORT',
    category: 'Reports & Analytics',
    name: 'Daily Sales & Top Items Report',
    description: 'End-of-day summary with tablewise breakdown, total sales & top selling items',
  },
  {
    id: 'DAILY_EXPENSES_REPORT',
    category: 'Reports & Analytics',
    name: 'Daily Expenses Report',
    description: 'Daily operational expenses and petty cash payout summary',
  },
  {
    id: 'MONTHLY_REPORT',
    category: 'Reports & Analytics',
    name: 'Monthly P&L & Revenue Report',
    description: 'Month-end consolidated revenue, expenses, and net profit report',
  },
  {
    id: 'STAFF_MODIFIED',
    category: 'Administration',
    name: 'Staff Added / Modified',
    description: 'Alert when an employee profile, role, or access permission is modified',
  },
  {
    id: 'INVENTORY_MODIFIED',
    category: 'Inventory & Stock',
    name: 'Stock & Inventory Updates',
    description: 'Alert when ingredient stocks, batches, or purchase adjustments occur',
  },
  {
    id: 'MENU_MODIFIED',
    category: 'Menu Management',
    name: 'Menu Item Add / Edit / Delete',
    description: 'Alert when dishes, prices, modifier groups, or category items are changed',
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
  telegramChatId: z.string().optional().nullable(),
  telegramUsername: z.string().optional().nullable(),
  telegramNotifications: z.array(z.string()).optional(),
});

const updateEmployeeSchema = z.object({
  name: z.string().min(1).optional(),
  department: z.string().min(1).optional(),
  designation: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  salary: z.number().nonnegative().optional().nullable(),
  // User account modification options
  createUserAccount: z.boolean().optional(),
  password: z.string().min(4).optional().or(z.literal('')),
  roleName: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  isActiveUser: z.boolean().optional(),
  telegramChatId: z.string().optional().nullable(),
  telegramUsername: z.string().optional().nullable(),
  telegramNotifications: z.array(z.string()).optional(),
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
              telegramChatId: true,
              telegramUsername: true,
              telegramNotifications: true,
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
      let parsedTelegramNotifs: string[] = [];
      if (user?.telegramNotifications) {
        try {
          parsedTelegramNotifs = JSON.parse(user.telegramNotifications);
        } catch {
          parsedTelegramNotifs = [];
        }
      }
      return {
        ...emp,
        user: user
          ? {
              id: user.id,
              email: user.email,
              telegramChatId: user.telegramChatId,
              telegramUsername: user.telegramUsername,
              telegramNotifications: parsedTelegramNotifs,
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

      // Create a unique staff role for this user account so their permissions are exact and isolated
      const cleanBaseName = (data.roleName || data.designation || 'STAFF').toUpperCase().replace(/[^A-Z0-9]/g, '_');
      const role = await prisma.role.create({
        data: {
          tenantId,
          name: `${cleanBaseName}_${Date.now().toString(36).toUpperCase()}`,
          description: `${data.designation || cleanBaseName} User Role`,
        },
      });

      // Assign ONLY the selected permissions to this role
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
          await prisma.rolePermission.create({
            data: {
              roleId: role.id,
              permissionId: perm.id,
            },
          });
        }
      }

      // Create User with Telegram connection preferences
      const newUser = await prisma.user.create({
        data: {
          tenantId,
          name: data.name,
          email: normalizedEmail,
          phone: data.phone || null,
          passwordHash,
          isActive: true,
          telegramChatId: data.telegramChatId || null,
          telegramUsername: data.telegramUsername ? data.telegramUsername.replace(/^@/, '') : null,
          telegramNotifications: data.telegramNotifications ? JSON.stringify(data.telegramNotifications) : null,
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

    // Notify Superadmin / Staff on Telegram
    TelegramService.getUserName(req.user, 'Admin').then((userName) => {
      TelegramService.sendNotificationToTenant(
        tenantId,
        'STAFF_MODIFIED',
        `👤 <b>Staff Member Added</b>\n\n• <b>Name:</b> ${data.name}\n• <b>Designation:</b> ${data.designation}\n• <b>Department:</b> ${data.department}\n• <b>Email:</b> ${data.email || 'None'}\n• <b>Added By:</b> ${userName}`
      ).catch((e) => console.error('[Telegram Staff Alert Error]:', e));
    });

    sendSuccess(res, employee, 201);
  }

  static async updateEmployee(req: Request, res: Response) {
    const { id } = req.params;
    const data = updateEmployeeSchema.parse(req.body);
    const tenantId = req.user!.tid;
    const branchId = req.user!.bid!;

    const employee = await prisma.employee.findFirst({
      where: { id, tenantId },
    });

    if (!employee) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Staff member not found', 404);
    }

    let linkedUserId = employee.userId;

    // Handle user account updates or creation
    if (data.createUserAccount || linkedUserId) {
      const emailToUse = (data.email || employee.email)?.toLowerCase().trim();

      if (linkedUserId) {
        // User account exists — update credentials, status, and permissions
        const user = await prisma.user.findFirst({
          where: { id: linkedUserId, tenantId },
        });

        if (user) {
          const userUpdates: any = {
            name: data.name || user.name,
            phone: data.phone !== undefined ? data.phone : user.phone,
          };

          if (data.isActiveUser !== undefined) {
            userUpdates.isActive = data.isActiveUser;
          }

          if (data.telegramChatId !== undefined) {
            userUpdates.telegramChatId = data.telegramChatId || null;
          }

          if (data.telegramUsername !== undefined) {
            userUpdates.telegramUsername = data.telegramUsername ? data.telegramUsername.replace(/^@/, '') : null;
          }

          if (data.telegramNotifications !== undefined) {
            userUpdates.telegramNotifications = JSON.stringify(data.telegramNotifications || []);
          }

          if (emailToUse && emailToUse !== user.email) {
            // Check uniqueness
            const clash = await prisma.user.findFirst({
              where: { tenantId, email: emailToUse, id: { not: user.id } },
            });
            if (clash) {
              throw new AppError(
                ErrorCodes.ALREADY_EXISTS,
                `Email "${emailToUse}" is already in use by another account.`,
                409
              );
            }
            userUpdates.email = emailToUse;
          }

          if (data.password && data.password.trim().length >= 4) {
            userUpdates.passwordHash = await bcrypt.hash(data.password.trim(), 10);
          }

          await prisma.user.update({
            where: { id: user.id },
            data: userUpdates,
          });

          // Handle role & permissions update
          if (data.permissions !== undefined || data.roleName !== undefined) {
            const cleanBaseName = (data.roleName || data.designation || employee.designation || 'STAFF')
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, '_');
            const uniqueRoleName = `${cleanBaseName}_${employee.id.slice(-6).toUpperCase()}`;

            // Check if user currently has an existing branch role
            const existingUbr = await prisma.userBranchRole.findFirst({
              where: { userId: user.id, branchId },
              include: { role: true },
            });

            let role: any = existingUbr?.role;
            if (!role || role.name === 'OWNER' || role.name === 'SUPER_ADMIN' || role.name === 'ADMINISTRATOR') {
              const foundRole = await prisma.role.findFirst({
                where: { tenantId, name: uniqueRoleName },
              });
              if (!foundRole) {
                role = await prisma.role.create({
                  data: {
                    tenantId,
                    name: uniqueRoleName,
                    description: `${data.designation || cleanBaseName} Staff Role`,
                  },
                });
              } else {
                role = foundRole;
              }
            }

            // If permissions array is provided, sync permissions for this isolated role
            if (data.permissions && Array.isArray(data.permissions)) {
              await prisma.rolePermission.deleteMany({
                where: { roleId: role.id },
              });

              for (const code of data.permissions) {
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

                await prisma.rolePermission.create({
                  data: {
                    roleId: role.id,
                    permissionId: perm.id,
                  },
                });
              }
            }

            // Ensure UserBranchRole points to this isolated role
            await prisma.userBranchRole.deleteMany({
              where: { userId: user.id, branchId },
            });

            await prisma.userBranchRole.create({
              data: {
                userId: user.id,
                branchId,
                roleId: role.id,
              },
            });
          }
        }
      } else if (data.createUserAccount && emailToUse && data.password) {
        // Provisioning a new user login account for existing staff member
        const clash = await prisma.user.findFirst({
          where: { tenantId, email: emailToUse },
        });
        if (clash) {
          throw new AppError(
            ErrorCodes.ALREADY_EXISTS,
            `Email "${emailToUse}" is already in use by another account.`,
            409
          );
        }

        const passwordHash = await bcrypt.hash(data.password.trim(), 10);
        const cleanBaseName = (data.roleName || data.designation || employee.designation || 'STAFF')
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '_');
        const uniqueRoleName = `${cleanBaseName}_${employee.id.slice(-6).toUpperCase()}`;

        let role = await prisma.role.findFirst({
          where: { tenantId, name: uniqueRoleName },
        });

        if (!role) {
          role = await prisma.role.create({
            data: {
              tenantId,
              name: uniqueRoleName,
              description: `${data.designation || cleanBaseName} Staff Role`,
            },
          });
        }

        if (data.permissions && data.permissions.length > 0) {
          await prisma.rolePermission.deleteMany({
            where: { roleId: role.id },
          });

          for (const code of data.permissions) {
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

            await prisma.rolePermission.create({
              data: {
                roleId: role.id,
                permissionId: perm.id,
              },
            });
          }
        }

        const newUser = await prisma.user.create({
          data: {
            tenantId,
            name: data.name || employee.name,
            email: emailToUse,
            phone: data.phone || employee.phone || null,
            passwordHash,
            isActive: true,
            telegramChatId: data.telegramChatId || null,
            telegramUsername: data.telegramUsername ? data.telegramUsername.replace(/^@/, '') : null,
            telegramNotifications: data.telegramNotifications ? JSON.stringify(data.telegramNotifications) : null,
            branchRoles: {
              create: {
                branchId,
                roleId: role.id,
              },
            },
          },
        });

        linkedUserId = newUser.id;
      }
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name : employee.name,
        department: data.department !== undefined ? data.department : employee.department,
        designation: data.designation !== undefined ? data.designation : employee.designation,
        phone: data.phone !== undefined ? data.phone : employee.phone,
        email: data.email !== undefined ? data.email : employee.email,
        salary: data.salary !== undefined ? (data.salary ?? 0) : (employee.salary ?? 0),
        userId: linkedUserId,
      },
      include: {
        attendance: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // Notify Superadmin / Staff on Telegram
    TelegramService.getUserName(req.user, 'Admin').then((userName) => {
      TelegramService.sendNotificationToTenant(
        tenantId,
        'STAFF_MODIFIED',
        `👤 <b>Staff Member Updated</b>\n\n• <b>Name:</b> ${updatedEmployee.name}\n• <b>Designation:</b> ${updatedEmployee.designation}\n• <b>Department:</b> ${updatedEmployee.department}\n• <b>Updated By:</b> ${userName}`
      ).catch((e) => console.error('[Telegram Staff Alert Error]:', e));
    });

    sendSuccess(res, updatedEmployee);
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

    // Notify Superadmin on Telegram
    TelegramService.getUserName(req.user, 'Admin').then((userName) => {
      TelegramService.sendNotificationToTenant(
        tenantId,
        'STAFF_MODIFIED',
        `👤 <b>Staff Member Removed</b>\n\n• <b>Name:</b> ${employee.name}\n• <b>Designation:</b> ${employee.designation}\n• <b>Department:</b> ${employee.department}\n• <b>Removed By:</b> ${userName}`
      ).catch((e) => console.error('[Telegram Staff Alert Error]:', e));
    });

    sendSuccess(res, { message: 'Staff member removed successfully' });
  }

  static async listAvailablePermissions(req: Request, res: Response) {
    sendSuccess(res, {
      modules: FEATURE_MODULES,
      telegramNotifications: TELEGRAM_NOTIFICATION_CATALOG,
    });
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

  static async disconnectStaffTelegram(req: Request, res: Response) {
    const { id } = req.params;
    const tenantId = req.user!.tid;

    const employee = await prisma.employee.findFirst({
      where: { id, tenantId },
    });

    if (!employee) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Staff member not found', 404);
    }

    if (employee.userId) {
      const user = await prisma.user.findUnique({
        where: { id: employee.userId },
      });
      const previousChatId = user?.telegramChatId;
      const previousUsername = user?.telegramUsername?.toLowerCase();
      const previousPhone = user?.phone?.replace(/\D/g, '');

      await prisma.user.update({
        where: { id: employee.userId },
        data: {
          telegramChatId: null,
          telegramUsername: null,
          telegramNotifications: null,
        },
      });

      // Purge cache
      await cacheDel(`tg_otp:${employee.userId}`);
      await cacheDel(`tg_chat_user:${employee.userId}`);
      if (previousUsername) {
        await cacheDel(`tg_chat_username:${previousUsername}`);
        await cacheDel(`tg_username_to_user:${previousUsername}`);
      }
      if (previousPhone) {
        await cacheDel(`tg_chat_phone:${previousPhone}`);
        await cacheDel(`tg_phone_to_user:${previousPhone.slice(-10)}`);
      }

      if (previousChatId) {
        try {
          await TelegramService.sendMessage(
            previousChatId,
            `🔌 <b>ROS Restaurant OS — Telegram Disconnected</b>\n\nYour Telegram connection for <b>${employee.name}</b> has been disconnected by the Restaurant Admin.\nAll notification subscriptions and linked credentials have been cleared from the database.`
          );
        } catch {}
      }
    }

    sendSuccess(res, {
      message: 'Staff Telegram connection and all associated credentials completely deleted from database.',
    });
  }
}
