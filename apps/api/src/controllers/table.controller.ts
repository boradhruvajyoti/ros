// =============================================================================
// Table Controller
// =============================================================================

import { Request, Response } from 'express';
import { sendSuccess } from '../middlewares/error.middleware';
import { prisma } from '../lib/prisma';
import { emitToRoom } from '../socket';
import { generateShortCode } from '@ros/utils';
import { z } from 'zod';

const tableSchema = z.object({
  floorId: z.string().uuid().optional().nullable(),
  sectionId: z.string().uuid().optional().nullable(),
  name: z.string().min(1).max(50),
  capacity: z.number().int().positive().max(99).default(4),
  shape: z.enum(['RECTANGLE', 'CIRCLE', 'SQUARE']).default('RECTANGLE'),
  posX: z.number().default(0),
  posY: z.number().default(0),
  width: z.number().default(120),
  height: z.number().default(80),
});

const floorSchema = z.object({
  name: z.string().min(1).max(100),
  sortOrder: z.number().int().default(0),
});

export class TableController {
  static async listFloors(req: Request, res: Response): Promise<void> {
    const floors = await prisma.floor.findMany({
      where: { tenantId: req.user!.tid, branchId: req.user!.bid, isActive: true },
      include: {
        sections: true,
        tables: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
    sendSuccess(res, floors);
  }

  static async createFloor(req: Request, res: Response): Promise<void> {
    const dto = floorSchema.parse(req.body);
    const floor = await prisma.floor.create({
      data: { ...dto, tenantId: req.user!.tid, branchId: req.user!.bid },
    });
    sendSuccess(res, floor, 201);
  }

  static async updateFloor(req: Request, res: Response): Promise<void> {
    const dto = floorSchema.partial().parse(req.body);
    const floor = await prisma.floor.update({ where: { id: req.params.id }, data: dto });
    sendSuccess(res, floor);
  }

  static async list(req: Request, res: Response): Promise<void> {
    const { status, floorId } = req.query;
    const tables = await prisma.restaurantTable.findMany({
      where: {
        tenantId: req.user!.tid,
        branchId: req.user!.bid,
        isActive: true,
        ...(status ? { status: status as string } : {}),
        ...(floorId ? { floorId: floorId as string } : {}),
      },
      include: {
        floor: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
      },
      orderBy: [{ floorId: 'asc' }, { name: 'asc' }],
    });
    sendSuccess(res, tables);
  }

  static async create(req: Request, res: Response): Promise<void> {
    const dto = tableSchema.parse(req.body);
    const table = await prisma.restaurantTable.create({
      data: { ...dto, tenantId: req.user!.tid, branchId: req.user!.bid },
    });
    sendSuccess(res, table, 201);
  }

  static async getOne(req: Request, res: Response): Promise<void> {
    const table = await prisma.restaurantTable.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tid },
      include: {
        floor: true,
        section: true,
        orders: {
          where: { status: { notIn: ['COMPLETED', 'CANCELLED', 'VOIDED'] } },
          take: 1,
          include: { _count: { select: { items: true } } },
        },
      },
    });
    sendSuccess(res, table);
  }

  static async update(req: Request, res: Response): Promise<void> {
    const dto = tableSchema.partial().parse(req.body);
    const table = await prisma.restaurantTable.update({ where: { id: req.params.id }, data: dto });
    sendSuccess(res, table);
  }

  static async updateStatus(req: Request, res: Response): Promise<void> {
    const { status } = z.object({
      status: z.enum(['AVAILABLE', 'RESERVED', 'OCCUPIED', 'CLEANING', 'BLOCKED']),
    }).parse(req.body);

    const table = await prisma.restaurantTable.update({
      where: { id: req.params.id },
      data: { status },
    });

    emitToRoom(req.user!.tid, req.user!.bid, {
      type: 'TABLE_STATUS_CHANGED',
      payload: { tableId: req.params.id, status },
    });

    sendSuccess(res, table);
  }

  static async delete(req: Request, res: Response): Promise<void> {
    await prisma.restaurantTable.update({ where: { id: req.params.id }, data: { isActive: false } });
    sendSuccess(res, { message: 'Table deactivated' });
  }

  static async generateQr(req: Request, res: Response): Promise<void> {
    const token = generateShortCode(12);
    await prisma.restaurantTable.update({
      where: { id: req.params.id },
      data: { qrCodeToken: token },
    });
    sendSuccess(res, { token, qrUrl: `${process.env.API_URL}/order/${token}` });
  }
}
