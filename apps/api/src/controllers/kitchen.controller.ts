// =============================================================================
// Kitchen Controller — KDS queue management
// =============================================================================

import { Request, Response } from 'express';
import { sendSuccess } from '../middlewares/error.middleware';
import { prisma } from '../lib/prisma';
import { emitToRoom, emitToStation } from '../socket';
import { z } from 'zod';

export class KitchenController {
  static async listStations(req: Request, res: Response): Promise<void> {
    const stations = await prisma.kitchenStation.findMany({
      where: { tenantId: req.user!.tid, branchId: req.user!.bid, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    sendSuccess(res, stations);
  }

  static async createStation(req: Request, res: Response): Promise<void> {
    const dto = z.object({
      name: z.string().min(1).max(100),
      displayColor: z.string().default('#3B82F6'),
      sortOrder: z.number().int().default(0),
    }).parse(req.body);

    const station = await prisma.kitchenStation.create({
      data: { ...dto, tenantId: req.user!.tid, branchId: req.user!.bid },
    });
    sendSuccess(res, station, 201);
  }

  static async updateStation(req: Request, res: Response): Promise<void> {
    const dto = z.object({
      name: z.string().optional(),
      displayColor: z.string().optional(),
      sortOrder: z.number().int().optional(),
      isActive: z.boolean().optional(),
    }).parse(req.body);

    const station = await prisma.kitchenStation.update({
      where: { id: req.params.id },
      data: dto,
    });
    sendSuccess(res, station);
  }

  static async getQueue(req: Request, res: Response): Promise<void> {
    const { stationId } = req.query;
    const now = new Date();

    const kots = await prisma.orderKot.findMany({
      where: {
        branchId: req.user!.bid,
        status: { in: ['NEW', 'ACCEPTED', 'PREPARING', 'READY'] },
        ...(stationId ? { kitchenStationId: stationId as string } : {}),
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            type: true,
            table: { select: { name: true } },
            notes: true,
          },
        },
        kitchenStation: { select: { id: true, name: true, displayColor: true } },
        items: {
          include: {
            orderItem: {
              include: {
                menuItem: { select: { name: true } },
                variant: { select: { name: true } },
                modifiers: { select: { name: true, price: true } },
              },
            },
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    // Add age in minutes
    const kotsWithAge = kots.map((kot) => ({
      ...kot,
      ageMinutes: Math.floor((now.getTime() - kot.createdAt.getTime()) / 60000),
    }));

    sendSuccess(res, kotsWithAge);
  }

  static async updateKotStatus(req: Request, res: Response): Promise<void> {
    const { status } = z.object({
      status: z.enum(['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED']),
    }).parse(req.body);

    const kot = await prisma.orderKot.update({
      where: { id: req.params.kotId },
      data: {
        status,
        ...(status === 'ACCEPTED'  ? { acceptedAt: new Date() }  : {}),
        ...(status === 'PREPARING' ? { preparedAt: new Date() }  : {}),
        ...(status === 'READY'     ? { readyAt: new Date() }     : {}),
        ...(status === 'SERVED'    ? { servedAt: new Date() }    : {}),
      },
      include: { kitchenStation: true, order: true },
    });

    // Synchronize all items under this KOT
    await prisma.orderKotItem.updateMany({
      where: { kotId: kot.id },
      data: {
        status,
        ...(status === 'ACCEPTED'  ? { acceptedAt: new Date() }  : {}),
        ...(status === 'PREPARING' ? { preparedAt: new Date() }  : {}),
        ...(status === 'READY'     ? { readyAt: new Date() }     : {}),
        ...(status === 'SERVED'    ? { servedAt: new Date() }    : {}),
      },
    });

    // Determine parent Order status across all KOTs for this order
    const allKots = await prisma.orderKot.findMany({
      where: { orderId: kot.orderId },
      select: { id: true, status: true },
    });

    const allServed = allKots.length > 0 && allKots.every((k) => k.status === 'SERVED');
    const allReadyOrServed = allKots.length > 0 && allKots.every((k) => k.status === 'READY' || k.status === 'SERVED');
    const anyPreparingOrReady = allKots.some((k) => k.status === 'PREPARING' || k.status === 'READY');

    let newOrderStatus: string | null = null;
    if (allServed) {
      newOrderStatus = 'SERVED';
    } else if (allReadyOrServed) {
      newOrderStatus = 'READY';
    } else if (anyPreparingOrReady && ['DRAFT', 'CONFIRMED', 'SENT_TO_KITCHEN'].includes(kot.order.status)) {
      newOrderStatus = 'PREPARING';
    }

    if (newOrderStatus && newOrderStatus !== kot.order.status) {
      await prisma.order.update({
        where: { id: kot.orderId },
        data: { status: newOrderStatus as any },
      });

      emitToRoom(req.user!.tid, req.user!.bid, {
        type: 'ORDER_STATUS_CHANGED',
        payload: {
          orderId: kot.orderId,
          orderNumber: kot.order.orderNumber,
          status: newOrderStatus as any,
        },
      });
    }

    emitToRoom(req.user!.tid, req.user!.bid, {
      type: 'KOT_STATUS_CHANGED',
      payload: {
        kotId: kot.id,
        status: status as any,
        stationId: kot.kitchenStationId || 'default',
      },
    });

    if (kot.kitchenStationId) {
      emitToStation(req.user!.tid, req.user!.bid, kot.kitchenStationId, {
        type: 'KOT_STATUS_CHANGED',
        payload: { kotId: kot.id, status: status as any, stationId: kot.kitchenStationId },
      });
    }

    sendSuccess(res, kot);
  }

  static async updateKotItemStatus(req: Request, res: Response): Promise<void> {
    const { status } = z.object({
      status: z.enum(['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED']),
    }).parse(req.body);

    const item = await prisma.orderKotItem.update({
      where: { id: req.params.itemId },
      data: {
        status,
        ...(status === 'ACCEPTED'  ? { acceptedAt: new Date() }  : {}),
        ...(status === 'PREPARING' ? { preparedAt: new Date() }  : {}),
        ...(status === 'READY'     ? { readyAt: new Date() }     : {}),
        ...(status === 'SERVED'    ? { servedAt: new Date() }    : {}),
      },
      include: {
        kot: {
          include: { order: true },
        },
      },
    });

    // Check sibling items in the same KOT
    const siblingItems = await prisma.orderKotItem.findMany({
      where: { kotId: item.kotId },
      select: { id: true, status: true },
    });

    const allSiblingReady = siblingItems.every((si) => si.status === 'READY' || si.status === 'SERVED');
    const allSiblingServed = siblingItems.every((si) => si.status === 'SERVED');
    const anySiblingPrep = siblingItems.some((si) => si.status === 'PREPARING' || si.status === 'READY');

    let kotNewStatus = item.kot.status;
    if (allSiblingServed) {
      kotNewStatus = 'SERVED';
    } else if (allSiblingReady) {
      kotNewStatus = 'READY';
    } else if (anySiblingPrep && ['NEW', 'ACCEPTED'].includes(item.kot.status)) {
      kotNewStatus = 'PREPARING';
    }

    if (kotNewStatus !== item.kot.status) {
      await prisma.orderKot.update({
        where: { id: item.kotId },
        data: { status: kotNewStatus },
      });
      emitToRoom(req.user!.tid, req.user!.bid, {
        type: 'KOT_STATUS_CHANGED',
        payload: { kotId: item.kotId, status: kotNewStatus as any, stationId: item.kot.kitchenStationId || 'default' },
      });
    }

    // Check all KOTs for the order
    const allKots = await prisma.orderKot.findMany({
      where: { orderId: item.kot.orderId },
      select: { id: true, status: true },
    });

    const allKotsReady = allKots.every((k) => (k.id === item.kotId ? kotNewStatus : k.status) === 'READY' || (k.id === item.kotId ? kotNewStatus : k.status) === 'SERVED');
    const allKotsServed = allKots.every((k) => (k.id === item.kotId ? kotNewStatus : k.status) === 'SERVED');

    let newOrderStatus: string | null = null;
    if (allKotsServed) {
      newOrderStatus = 'SERVED';
    } else if (allKotsReady) {
      newOrderStatus = 'READY';
    } else if (kotNewStatus === 'PREPARING' && ['DRAFT', 'CONFIRMED', 'SENT_TO_KITCHEN'].includes(item.kot.order.status)) {
      newOrderStatus = 'PREPARING';
    }

    if (newOrderStatus && newOrderStatus !== item.kot.order.status) {
      await prisma.order.update({
        where: { id: item.kot.orderId },
        data: { status: newOrderStatus as any },
      });
      emitToRoom(req.user!.tid, req.user!.bid, {
        type: 'ORDER_STATUS_CHANGED',
        payload: {
          orderId: item.kot.orderId,
          orderNumber: item.kot.order.orderNumber,
          status: newOrderStatus as any,
        },
      });
    }

    emitToRoom(req.user!.tid, req.user!.bid, {
      type: 'KOT_ITEM_STATUS_CHANGED',
      payload: { kotItemId: item.id, kotId: req.params.kotId, status },
    });

    sendSuccess(res, item);
  }
}
