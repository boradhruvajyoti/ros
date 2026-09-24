// =============================================================================
// Staff & HR Controller — Employees, Attendance & Leaves
// =============================================================================

import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendSuccess } from '../middlewares/error.middleware';
import { z } from 'zod';

const createEmployeeSchema = z.object({
  name: z.string().min(1),
  department: z.string().min(1),
  designation: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  salary: z.number().nonnegative().optional(),
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
    sendSuccess(res, employees);
  }

  static async createEmployee(req: Request, res: Response) {
    const data = createEmployeeSchema.parse(req.body);
    const employee = await prisma.employee.create({
      data: {
        ...data,
        tenantId: req.user!.tid,
        branchId: req.user!.bid!,
      },
    });
    sendSuccess(res, employee, 201);
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
