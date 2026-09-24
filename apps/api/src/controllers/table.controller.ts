// =============================================================================
// Table Controller — Dining Table Management & Public QR Ordering
// =============================================================================

import { Request, Response } from 'express';
import { sendSuccess, AppError } from '../middlewares/error.middleware';
import { ErrorCodes } from '@ros/shared-types';
import { prisma } from '../lib/prisma';
import { emitToRoom } from '../socket';
import { generateShortCode } from '@ros/utils';
import { OrderService } from '../services/order.service';
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

    // Auto-populate missing QR code tokens for backward compatibility
    for (const t of tables) {
      if (!t.qrCodeToken) {
        const token = `qr-t${t.id.slice(0, 4)}-${generateShortCode(6).toLowerCase()}`;
        await prisma.restaurantTable.update({
          where: { id: t.id },
          data: { qrCodeToken: token },
        });
        t.qrCodeToken = token;
      }
    }

    sendSuccess(res, tables);
  }

  static async create(req: Request, res: Response): Promise<void> {
    const dto = tableSchema.parse(req.body);
    const qrCodeToken = `qr-${generateShortCode(8).toLowerCase()}`;
    const table = await prisma.restaurantTable.create({
      data: {
        ...dto,
        tenantId: req.user!.tid,
        branchId: req.user!.bid,
        qrCodeToken,
      },
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
    const token = `qr-${generateShortCode(10).toLowerCase()}`;
    const table = await prisma.restaurantTable.update({
      where: { id: req.params.id },
      data: { qrCodeToken: token },
    });
    sendSuccess(res, { token, qrCodeToken: token, tableId: table.id, tableName: table.name });
  }

  // ── Public Guest QR Endpoints (No Auth Required) ─────────────────────────
  static async getPublicTableDetails(req: Request, res: Response): Promise<void> {
    const { token } = req.params;
    const table = await prisma.restaurantTable.findFirst({
      where: { qrCodeToken: token, isActive: true },
      include: {
        tenant: { select: { id: true, name: true, slug: true, settings: true } },
        branch: { select: { id: true, name: true, phone: true, address: true } },
      },
    });

    if (!table) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Table QR Code not found or expired', 404);
    }

    const categories = await prisma.menuCategory.findMany({
      where: { tenantId: table.tenantId, branchId: table.branchId, isActive: true },
      include: {
        items: {
          where: { isActive: true, isAvailable: true },
          include: { variants: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    sendSuccess(res, {
      table: {
        id: table.id,
        name: table.name,
        capacity: table.capacity,
        status: table.status,
      },
      restaurant: {
        name: table.tenant.name,
        slug: table.tenant.slug,
        branchName: table.branch.name,
        address: table.branch.address,
        phone: table.branch.phone,
      },
      categories,
    });
  }

  static async submitPublicTableOrder(req: Request, res: Response): Promise<void> {
    const { token } = req.params;
    const { customerName, customerPhone, items, notes } = req.body;

    const table = await prisma.restaurantTable.findFirst({
      where: { qrCodeToken: token, isActive: true },
    });

    if (!table) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Invalid table QR token', 404);
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Order must contain at least one item', 400);
    }

    // Find a valid active user ID for this tenant to satisfy the created_by foreign key
    const tenantUser = await prisma.user.findFirst({
      where: { tenantId: table.tenantId, isActive: true },
      select: { id: true },
    });

    if (!tenantUser) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'No active system operator found for this restaurant branch', 404);
    }

    // Auto-register or link Guest in CRM if phone provided
    let customerId: string | undefined;
    if (customerPhone && customerPhone.trim()) {
      const cleanPhone = customerPhone.trim();
      const customer = await prisma.customer.upsert({
        where: { tenantId_phone: { tenantId: table.tenantId, phone: cleanPhone } },
        update: {
          name: customerName?.trim() || undefined,
          visitCount: { increment: 1 },
        },
        create: {
          tenantId: table.tenantId,
          name: customerName?.trim() || 'QR Guest',
          phone: cleanPhone,
          visitCount: 1,
        },
      });
      customerId = customer.id;
    }

    // Order Service manages pricing, items, stock validation, KOT generation & realtime socket alerts
    const orderService = new OrderService(table.tenantId, table.branchId);

    const formattedNotes = [
      `Guest QR Order (${table.name})`,
      customerName ? `Guest: ${customerName}` : null,
      customerPhone ? `Ph: ${customerPhone}` : null,
      notes ? `Note: ${notes}` : null,
    ].filter(Boolean).join(' | ');

    const order = await orderService.createOrder(
      {
        type: 'DINE_IN',
        tableId: table.id,
        customerId,
        notes: formattedNotes,
        items: items.map((it: any) => ({
          menuItemId: it.menuItemId,
          variantId: it.variantId,
          quantity: it.quantity || 1,
          notes: it.notes,
        })),
      },
      tenantUser.id
    );

    // Auto-advance to SENT_TO_KITCHEN for instant kitchen preparation & KOT routing
    const kitchenOrder = await orderService.updateStatus(order.id, {
      status: 'SENT_TO_KITCHEN',
      userId: tenantUser.id,
      reason: `Contactless QR order submitted by guest at ${table.name}`,
    });

    sendSuccess(res, kitchenOrder, 201);
  }
}
