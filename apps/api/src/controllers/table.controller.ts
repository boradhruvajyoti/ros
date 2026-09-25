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
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'ros_jwt_secret_dev_key_change_in_production';

export const generateGuestSessionToken = (table: { id: string; name: string; tenantId: string; branchId: string; qrCodeToken: string | null }) => {
  const issuedAt = Date.now();
  const sessionExpiresAt = issuedAt + 45 * 60 * 1000; // 45-minute strict expiration
  const sessionNonce = crypto.randomBytes(8).toString('hex');

  const guestSessionToken = jwt.sign(
    {
      type: 'QR_GUEST_SESSION',
      tableId: table.id,
      tableName: table.name,
      tenantId: table.tenantId,
      branchId: table.branchId,
      qrCodeToken: table.qrCodeToken,
      sessionNonce,
      issuedAt,
      sessionExpiresAt,
    },
    JWT_SECRET,
    { expiresIn: '45m' }
  );

  return { guestSessionToken, sessionExpiresAt, sessionDurationMinutes: 45 };
};

const tableSchema = z.object({
  floorId: z.string().uuid().optional().nullable(),
  sectionId: z.string().uuid().optional().nullable(),
  name: z.string().min(1).max(50),
  capacity: z.number().int().positive().max(99).default(4),
  shape: z.enum(['RECTANGLE', 'CIRCLE', 'SQUARE']).default('RECTANGLE'),
  status: z.enum(['AVAILABLE', 'RESERVED', 'OCCUPIED', 'CLEANING', 'BLOCKED']).optional(),
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

    const tablesWithSession = tables.map((t) => {
      const session = generateGuestSessionToken(t);
      return {
        ...t,
        guestSessionToken: session.guestSessionToken,
        qrUrlSuffix: `?session=${session.guestSessionToken}`,
      };
    });

    sendSuccess(res, tablesWithSession);
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
          where: { status: { notIn: ['COMPLETED', 'CANCELLED', 'VOIDED', 'PAID', 'REFUNDED'] } },
          orderBy: { createdAt: 'desc' },
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

    if (dto.status) {
      emitToRoom(req.user!.tid, req.user!.bid, {
        type: 'TABLE_STATUS_CHANGED',
        payload: { tableId: req.params.id, status: dto.status },
      });
    }

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
    const sessionInfo = generateGuestSessionToken(table);
    sendSuccess(res, {
      token,
      qrCodeToken: token,
      tableId: table.id,
      tableName: table.name,
      guestSessionToken: sessionInfo.guestSessionToken,
      qrUrlSuffix: `?session=${sessionInfo.guestSessionToken}`,
    });
  }

  // ── Public Guest QR Endpoints (No Auth Required) ─────────────────────────
  static async getPublicTableDetails(req: Request, res: Response): Promise<void> {
    const { token } = req.params;
    const table = await prisma.restaurantTable.findFirst({
      where: { qrCodeToken: token, isActive: true },
      include: {
        tenant: { select: { id: true, name: true, slug: true, logoUrl: true, settings: true } },
        branch: { select: { id: true, name: true, phone: true, address: true } },
      },
    });

    if (!table) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Table QR Code not found or expired', 404);
    }

    const categories = await prisma.menuCategory.findMany({
      where: {
        tenantId: table.tenantId,
        isActive: true,
        OR: [{ branchId: table.branchId }, { branchId: null }],
      },
      include: {
        items: {
          where: { isActive: true, isAvailable: true },
          include: { variants: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    const activeOrders = await prisma.order.findMany({
      where: {
        tenantId: table.tenantId,
        branchId: table.branchId,
        tableId: table.id,
        status: { in: ['DRAFT', 'CONFIRMED', 'SENT_TO_KITCHEN', 'PREPARING', 'READY', 'SERVED', 'BILLED', 'PARTIALLY_PAID'] },
      },
      include: {
        items: {
          where: { status: { notIn: ['VOIDED', 'CANCELLED'] } },
          include: {
            menuItem: { select: { id: true, name: true, foodType: true, imageUrl: true } },
            variant: { select: { id: true, name: true, price: true } },
            modifiers: true,
          },
        },
        kots: {
          include: {
            kitchenStation: { select: { id: true, name: true } },
            items: {
              include: {
                orderItem: {
                  include: {
                    menuItem: { select: { id: true, name: true, foodType: true, imageUrl: true } },
                    variant: { select: { id: true, name: true, price: true } },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rawSession = (req.query.session || req.query.token || req.query.diningToken || req.headers['x-guest-session-token']) as string | undefined;

    let canOrder = table.status !== 'BLOCKED';
    let validSessionToken: string | null = null;
    let sessionExpiresAt: number | null = null;

    if (rawSession && typeof rawSession === 'string') {
      try {
        const decoded = jwt.verify(rawSession, JWT_SECRET) as any;
        if (
          decoded.type === 'QR_GUEST_SESSION' &&
          decoded.tableId === table.id &&
          decoded.tenantId === table.tenantId
        ) {
          validSessionToken = rawSession;
          sessionExpiresAt = decoded.sessionExpiresAt || (decoded.exp ? decoded.exp * 1000 : null);
        }
      } catch {}
    }

    if (!validSessionToken && canOrder) {
      const session = generateGuestSessionToken(table);
      validSessionToken = session.guestSessionToken;
      sessionExpiresAt = session.sessionExpiresAt;
    }

    const recentSettledOrder = await prisma.order.findFirst({
      where: {
        tenantId: table.tenantId,
        branchId: table.branchId,
        tableId: table.id,
        status: { in: ['PAID', 'COMPLETED'] },
        updatedAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
      include: {
        items: {
          where: { status: { notIn: ['VOIDED', 'CANCELLED'] } },
          include: {
            menuItem: { select: { id: true, name: true, foodType: true, imageUrl: true } },
            variant: { select: { id: true, name: true, price: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    sendSuccess(res, {
      canOrder,
      guestSessionToken: validSessionToken,
      sessionExpiresAt,
      sessionDurationMinutes: 45,
      table: {
        id: table.id,
        name: table.name,
        capacity: table.capacity,
        status: table.status,
      },
      restaurant: {
        name: table.tenant.name,
        slug: table.tenant.slug,
        logoUrl: table.tenant.logoUrl,
        settings: table.tenant.settings,
        branchName: table.branch.name,
        address: table.branch.address,
        phone: table.branch.phone,
      },
      categories,
      activeOrders: canOrder ? activeOrders : [],
      recentSettledOrder: canOrder ? recentSettledOrder : null,
    });
  }

  static async submitPublicTableOrder(req: Request, res: Response): Promise<void> {
    const { token } = req.params;
    const { customerName, customerPhone, items, notes, guestSessionToken } = req.body;

    const table = await prisma.restaurantTable.findFirst({
      where: { qrCodeToken: token, isActive: true },
    });

    if (!table) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Invalid table QR token', 404);
    }

    if (table.status === 'BLOCKED') {
      throw new AppError(ErrorCodes.FORBIDDEN, 'This table is currently blocked. Please speak with the dining host.', 403);
    }

    // ── Enforce 45-min Unique Ephemeral Guest Session Token ─────────────────
    const sessionToken = guestSessionToken || req.headers['x-guest-session-token'];
    if (!sessionToken || typeof sessionToken !== 'string') {
      throw new AppError(
        ErrorCodes.UNAUTHORIZED,
        'Dining QR session token missing. Please scan the QR code at your dining table to place an order.',
        401
      );
    }

    let decoded: any;
    try {
      decoded = jwt.verify(sessionToken, JWT_SECRET);
    } catch (err: any) {
      if (err?.name === 'TokenExpiredError') {
        throw new AppError(
          ErrorCodes.UNAUTHORIZED,
          'Your 45-minute dining QR session has expired. To prevent unauthorized orders from outside, please re-scan the table QR code.',
          401
        );
      }
      throw new AppError(
        ErrorCodes.UNAUTHORIZED,
        'Invalid or corrupted dining QR session token. Please re-scan the table QR code.',
        401
      );
    }

    if (
      decoded.type !== 'QR_GUEST_SESSION' ||
      decoded.tableId !== table.id ||
      decoded.tenantId !== table.tenantId
    ) {
      throw new AppError(
        ErrorCodes.UNAUTHORIZED,
        'Dining QR session does not match this table. Please scan your designated table standee.',
        401
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Order must contain at least one item', 400);
    }

    // Find a valid user ID for this tenant to satisfy the created_by foreign key
    let tenantUser = await prisma.user.findFirst({
      where: { tenantId: table.tenantId, isActive: true },
      select: { id: true },
    });

    if (!tenantUser) {
      tenantUser = await prisma.user.findFirst({
        where: { tenantId: table.tenantId },
        select: { id: true },
      });
    }

    if (!tenantUser) {
      tenantUser = await prisma.user.findFirst({ select: { id: true } });
    }

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

    // Check if table already has an active order (e.g. from POS or previous QR round)
    const existingActiveOrder = await prisma.order.findFirst({
      where: {
        tenantId: table.tenantId,
        branchId: table.branchId,
        tableId: table.id,
        status: { notIn: ['COMPLETED', 'CANCELLED', 'VOIDED', 'PAID', 'REFUNDED'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    let order: any;
    if (existingActiveOrder) {
      order = await orderService.addRunningKot(
        existingActiveOrder.id,
        items.map((it: any) => ({
          menuItemId: it.menuItemId,
          variantId: it.variantId,
          quantity: it.quantity || 1,
          notes: it.notes,
        })),
        tenantUser.id
      );
    } else {
      order = await orderService.createOrder(
        {
          type: 'DINE_IN',
          status: 'CONFIRMED',
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
    }

    // Real-time broadcast to Waiters, Cashiers, and Managers
    emitToRoom(table.tenantId, table.branchId, {
      type: 'QR_ORDER_PENDING',
      payload: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        tableId: table.id,
        tableName: table.name,
        customerName: customerName || 'Dine-In Guest',
        customerPhone,
        total: order.total,
        itemCount: items.length,
      },
    });

    // Provide a fresh 45-min renewed session for subsequent rounds during this dining sitting
    const refreshedSession = generateGuestSessionToken(table);

    sendSuccess(res, {
      ...order,
      guestSessionToken: refreshedSession.guestSessionToken,
      sessionExpiresAt: refreshedSession.sessionExpiresAt,
      sessionDurationMinutes: 45,
    }, 201);
  }

  static async getPublicOrderStatus(req: Request, res: Response): Promise<void> {
    const { token, orderId } = req.params;
    const table = await prisma.restaurantTable.findFirst({
      where: { qrCodeToken: token, isActive: true },
    });

    if (!table) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Invalid table QR token', 404);
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, tableId: table.id },
      include: {
        items: {
          include: {
            menuItem: { select: { name: true, foodType: true, imageUrl: true } },
            variant: { select: { name: true, price: true } },
          },
        },
        kots: {
          include: {
            kitchenStation: { select: { name: true } },
          },
        },
        table: { select: { name: true } },
      },
    });

    if (!order) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Order not found', 404);
    }

    sendSuccess(res, order);
  }
}
