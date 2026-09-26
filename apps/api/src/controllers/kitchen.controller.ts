// =============================================================================
// Kitchen Controller — KDS queue management
// =============================================================================

import { Request, Response } from 'express';
import { sendSuccess, AppError } from '../middlewares/error.middleware';
import { prisma } from '../lib/prisma';
import { emitToRoom, emitToStation } from '../socket';
import { z } from 'zod';
import { ErrorCodes } from '@ros/shared-types';
import { OrderService } from '../services/order.service';
import { TelegramService } from '../services/telegram.service';

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
    const { status, reason } = z.object({
      status: z.enum(['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'CANCELLED']),
      reason: z.string().optional(),
    }).parse(req.body);

    const existingKot = await prisma.orderKot.findUnique({
      where: { id: req.params.kotId },
      include: { items: true, order: true },
    });

    if (!existingKot) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'KOT not found', 404);
    }

    if (status === 'CANCELLED') {
      if (['READY', 'SERVED'].includes(existingKot.status)) {
        throw new AppError(
          ErrorCodes.VALIDATION_ERROR,
          'Cannot cancel KOT once it has reached Ready to serve or Served status.',
          400
        );
      }
      if (existingKot.status === 'CANCELLED') {
        throw new AppError(
          ErrorCodes.VALIDATION_ERROR,
          'KOT is already cancelled.',
          400
        );
      }

      // Mark KOT and its items as CANCELLED
      const kot = await prisma.orderKot.update({
        where: { id: req.params.kotId },
        data: { status: 'CANCELLED' },
        include: { kitchenStation: true, order: { include: { table: true } } },
      });

      await prisma.orderKotItem.updateMany({
        where: { kotId: kot.id },
        data: { status: 'CANCELLED' },
      });

      const orderItemIds = existingKot.items.map((i) => i.orderItemId).filter(Boolean);
      if (orderItemIds.length > 0) {
        await prisma.orderItem.updateMany({
          where: { id: { in: orderItemIds } },
          data: {
            status: 'CANCELLED',
            notes: reason ? `[Cancelled on KOT #${kot.kotNumber}: ${reason}]` : `[Cancelled on KOT #${kot.kotNumber}]`,
          },
        });
      }

      const orderService = new OrderService(req.user!.tid, req.user!.bid);
      const updatedOrder = await orderService.recalculateTotals(kot.orderId);

      // Check all remaining active KOTs for the order
      const remainingActiveKots = await prisma.orderKot.findMany({
        where: { orderId: kot.orderId, status: { not: 'CANCELLED' } },
      });

      let newOrderStatus: string | null = null;
      if (remainingActiveKots.length === 0) {
        // If ALL KOTs are cancelled, the parent order is CANCELLED automatically!
        newOrderStatus = 'CANCELLED';
        await prisma.order.update({
          where: { id: kot.orderId },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancellationReason: reason ? `KOT #${kot.kotNumber} Cancelled in Kitchen: ${reason}` : `KOT #${kot.kotNumber} Cancelled in Kitchen`,
          },
        });

        // Release table if occupied
        if (kot.order.tableId) {
          await prisma.restaurantTable.update({
            where: { id: kot.order.tableId },
            data: { status: 'AVAILABLE' },
          });
          emitToRoom(req.user!.tid, req.user!.bid, {
            type: 'TABLE_STATUS_CHANGED',
            payload: { tableId: kot.order.tableId, status: 'AVAILABLE' },
          });
        }
      } else {
        const allKotsServed = remainingActiveKots.every((k) => k.status === 'SERVED');
        const allKotsReady = remainingActiveKots.every((k) => k.status === 'READY' || k.status === 'SERVED');
        if (allKotsServed) {
          newOrderStatus = 'SERVED';
        } else if (allKotsReady) {
          newOrderStatus = 'READY';
        }

        if (newOrderStatus && newOrderStatus !== kot.order.status) {
          await prisma.order.update({
            where: { id: kot.orderId },
            data: { status: newOrderStatus as any },
          });
        }
      }

      if (newOrderStatus && newOrderStatus !== kot.order.status) {
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
        payload: { kotId: kot.id, status: 'CANCELLED', stationId: kot.kitchenStationId || 'default' },
      });

      emitToRoom(req.user!.tid, req.user!.bid, {
        type: 'ORDER_UPDATED',
        payload: {
          orderId: kot.orderId,
          orderNumber: kot.order.orderNumber,
          total: Number(updatedOrder?.total || kot.order.total),
          itemCount: existingKot.items.length,
        },
      });

      // Dispatch Telegram Notification (ORDER_CANCELLED_KITCHEN)
      TelegramService.sendNotificationToTenant(
        req.user!.tid,
        'ORDER_CANCELLED_KITCHEN',
        `🚫 <b>KOT Cancelled in Kitchen Display</b>\n\n• <b>KOT #:</b> #${kot.kotNumber}\n• <b>Order #:</b> #${kot.order.orderNumber}\n• <b>Table:</b> ${kot.order.table?.name || 'Takeaway'}\n• <b>Station:</b> ${kot.kitchenStation?.name || 'Kitchen'}\n• <b>Reason:</b> ${reason || 'Cancelled by kitchen staff'}\n• <b>By:</b> ${req.user!.email || 'Chef'}`
      ).catch((e) => console.error('[Telegram Cancel KOT Trigger Error]:', e));

      sendSuccess(res, kot);
      return;
    }

    const kot = await prisma.orderKot.update({
      where: { id: req.params.kotId },
      data: {
        status,
        ...(status === 'ACCEPTED'  ? { acceptedAt: new Date() }  : {}),
        ...(status === 'PREPARING' ? { preparedAt: new Date() }  : {}),
        ...(status === 'READY'     ? { readyAt: new Date() }     : {}),
        ...(status === 'SERVED'    ? { servedAt: new Date() }    : {}),
      },
      include: { kitchenStation: true, order: { include: { table: true } } },
    });

    // Synchronize all non-cancelled items under this KOT
    await prisma.orderKotItem.updateMany({
      where: { kotId: kot.id, status: { not: 'CANCELLED' } },
      data: {
        status,
        ...(status === 'ACCEPTED'  ? { acceptedAt: new Date() }  : {}),
        ...(status === 'PREPARING' ? { preparedAt: new Date() }  : {}),
        ...(status === 'READY'     ? { readyAt: new Date() }     : {}),
        ...(status === 'SERVED'    ? { servedAt: new Date() }    : {}),
      },
    });

    // Determine parent Order status across all active KOTs for this order
    const allKots = await prisma.orderKot.findMany({
      where: { orderId: kot.orderId, status: { not: 'CANCELLED' } },
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

    // Dispatch Telegram Notifications based on status
    if (status === 'ACCEPTED') {
      TelegramService.sendNotificationToTenant(
        req.user!.tid,
        'KOT_ACCEPTED',
        `👨‍🍳 <b>KDS Order Accepted!</b>\n\n• <b>KOT #:</b> #${kot.kotNumber}\n• <b>Order #:</b> #${kot.order.orderNumber}\n• <b>Table:</b> ${kot.order.table?.name || 'Counter / Takeaway'}\n• <b>Station:</b> ${kot.kitchenStation?.name || 'Main Kitchen'}\n• <b>Accepted By:</b> ${req.user!.email || 'Chef'}`
      ).catch((e) => console.error('[Telegram KOT Accepted Trigger Error]:', e));
    } else if (status === 'READY') {
      TelegramService.sendNotificationToTenant(
        req.user!.tid,
        'FOOD_READY',
        `🔔 <b>Food is Ready to Serve!</b>\n\n• <b>KOT #:</b> #${kot.kotNumber}\n• <b>Order #:</b> #${kot.order.orderNumber}\n• <b>Table:</b> ${kot.order.table?.name || 'Counter / Takeaway'}\n• <b>Station:</b> ${kot.kitchenStation?.name || 'Pass Counter'}`
      ).catch((e) => console.error('[Telegram Food Ready Trigger Error]:', e));
    } else if (status === 'SERVED') {
      TelegramService.sendNotificationToTenant(
        req.user!.tid,
        'FOOD_SERVED',
        `🥗 <b>Food Served to Table!</b>\n\n• <b>KOT #:</b> #${kot.kotNumber}\n• <b>Order #:</b> #${kot.order.orderNumber}\n• <b>Table:</b> ${kot.order.table?.name || 'Counter'}`
      ).catch((e) => console.error('[Telegram Food Served Trigger Error]:', e));
    }

    sendSuccess(res, kot);
    return;
  }

  static async updateKotItemStatus(req: Request, res: Response): Promise<void> {
    const { status, reason } = z.object({
      status: z.enum(['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'CANCELLED']),
      reason: z.string().optional(),
    }).parse(req.body);

    const existingItem = await prisma.orderKotItem.findUnique({
      where: { id: req.params.itemId },
      include: {
        kot: {
          include: { order: true },
        },
        orderItem: true,
      },
    });

    if (!existingItem) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'KOT Item not found', 404);
    }

    if (status === 'CANCELLED') {
      if (['READY', 'SERVED'].includes(existingItem.kot.status) || existingItem.status === 'READY' || existingItem.status === 'SERVED') {
        throw new AppError(
          ErrorCodes.VALIDATION_ERROR,
          'Cannot cancel an item once it has reached Ready to serve or Served status.',
          400
        );
      }
      if (existingItem.status === 'CANCELLED') {
        throw new AppError(
          ErrorCodes.VALIDATION_ERROR,
          'Item is already cancelled.',
          400
        );
      }

      // Mark the OrderKotItem as CANCELLED
      const updatedKotItem = await prisma.orderKotItem.update({
        where: { id: req.params.itemId },
        data: { status: 'CANCELLED' },
        include: {
          kot: {
            include: { order: true },
          },
          orderItem: true,
        },
      });

      // Mark the associated OrderItem as CANCELLED
      if (existingItem.orderItemId) {
        await prisma.orderItem.update({
          where: { id: existingItem.orderItemId },
          data: {
            status: 'CANCELLED',
            notes: reason ? `[Cancelled in Kitchen: ${reason}]` : '[Cancelled in Kitchen]',
          },
        });
      }

      // Recalculate order subtotal and totals
      const orderService = new OrderService(req.user!.tid, req.user!.bid);
      const updatedOrder = await orderService.recalculateTotals(existingItem.kot.orderId);

      // Check remaining active sibling items in the same KOT
      const activeSiblingItems = await prisma.orderKotItem.findMany({
        where: { kotId: existingItem.kotId, status: { not: 'CANCELLED' } },
      });

      let kotNewStatus = existingItem.kot.status;
      if (activeSiblingItems.length === 0) {
        // All items in this KOT are cancelled
        kotNewStatus = 'CANCELLED';
      } else {
        const allSiblingServed = activeSiblingItems.every((si) => si.status === 'SERVED');
        const allSiblingReady = activeSiblingItems.every((si) => si.status === 'READY' || si.status === 'SERVED');
        if (allSiblingServed) {
          kotNewStatus = 'SERVED';
        } else if (allSiblingReady) {
          kotNewStatus = 'READY';
        }
      }

      if (kotNewStatus !== existingItem.kot.status) {
        await prisma.orderKot.update({
          where: { id: existingItem.kotId },
          data: { status: kotNewStatus },
        });

        emitToRoom(req.user!.tid, req.user!.bid, {
          type: 'KOT_STATUS_CHANGED',
          payload: { kotId: existingItem.kotId, status: kotNewStatus as any, stationId: existingItem.kot.kitchenStationId || 'default' },
        });
      }

      // Check all remaining active KOTs for the order
      const allActiveKots = await prisma.orderKot.findMany({
        where: { orderId: existingItem.kot.orderId, status: { not: 'CANCELLED' } },
      });

      let newOrderStatus: string | null = null;
      if (allActiveKots.length === 0) {
        newOrderStatus = 'CANCELLED';
      } else {
        const allKotsServed = allActiveKots.every((k) => (k.id === existingItem.kotId ? kotNewStatus : k.status) === 'SERVED');
        const allKotsReady = allActiveKots.every((k) => (k.id === existingItem.kotId ? kotNewStatus : k.status) === 'READY' || (k.id === existingItem.kotId ? kotNewStatus : k.status) === 'SERVED');
        if (allKotsServed) {
          newOrderStatus = 'SERVED';
        } else if (allKotsReady) {
          newOrderStatus = 'READY';
        }
      }

      if (newOrderStatus && newOrderStatus !== existingItem.kot.order.status) {
        await prisma.order.update({
          where: { id: existingItem.kot.orderId },
          data: {
            status: newOrderStatus as any,
            ...(newOrderStatus === 'CANCELLED' ? {
              cancelledAt: new Date(),
              cancellationReason: reason ? `Items Cancelled in Kitchen: ${reason}` : 'All items cancelled in kitchen',
            } : {}),
          },
        });

        if (newOrderStatus === 'CANCELLED' && existingItem.kot.order.tableId) {
          await prisma.restaurantTable.update({
            where: { id: existingItem.kot.order.tableId },
            data: { status: 'AVAILABLE' },
          });
          emitToRoom(req.user!.tid, req.user!.bid, {
            type: 'TABLE_STATUS_CHANGED',
            payload: { tableId: existingItem.kot.order.tableId, status: 'AVAILABLE' },
          });
        }

        emitToRoom(req.user!.tid, req.user!.bid, {
          type: 'ORDER_STATUS_CHANGED',
          payload: {
            orderId: existingItem.kot.orderId,
            orderNumber: existingItem.kot.order.orderNumber,
            status: newOrderStatus as any,
          },
        });
      }

      emitToRoom(req.user!.tid, req.user!.bid, {
        type: 'KOT_ITEM_STATUS_CHANGED',
        payload: { kotItemId: existingItem.id, kotId: req.params.kotId, status: 'CANCELLED' },
      });

      emitToRoom(req.user!.tid, req.user!.bid, {
        type: 'ORDER_UPDATED',
        payload: {
          orderId: existingItem.kot.orderId,
          orderNumber: existingItem.kot.order.orderNumber,
          total: Number(updatedOrder?.total || existingItem.kot.order.total),
          itemCount: activeSiblingItems.length,
        },
      });

      // Dispatch Telegram Notification (ORDER_CANCELLED_KITCHEN)
      TelegramService.sendNotificationToTenant(
        req.user!.tid,
        'ORDER_CANCELLED_KITCHEN',
        `🚫 <b>Item Cancelled on Kitchen Display</b>\n\n• <b>Order #:</b> #${existingItem.kot.order.orderNumber}\n• <b>KOT #:</b> #${existingItem.kot.kotNumber}\n• <b>Reason:</b> ${reason || 'Cancelled in kitchen'}\n• <b>By:</b> ${req.user!.email || 'Chef'}`
      ).catch((e) => console.error('[Telegram Cancel KOT Item Trigger Error]:', e));

      sendSuccess(res, updatedKotItem);
      return;
    }

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
      where: { kotId: item.kotId, status: { not: 'CANCELLED' } },
      select: { id: true, status: true },
    });

    const allSiblingReady = siblingItems.length > 0 && siblingItems.every((si) => si.status === 'READY' || si.status === 'SERVED');
    const allSiblingServed = siblingItems.length > 0 && siblingItems.every((si) => si.status === 'SERVED');
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
      where: { orderId: item.kot.orderId, status: { not: 'CANCELLED' } },
      select: { id: true, status: true },
    });

    const allKotsReady = allKots.length > 0 && allKots.every((k) => (k.id === item.kotId ? kotNewStatus : k.status) === 'READY' || (k.id === item.kotId ? kotNewStatus : k.status) === 'SERVED');
    const allKotsServed = allKots.length > 0 && allKots.every((k) => (k.id === item.kotId ? kotNewStatus : k.status) === 'SERVED');

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

  static async cancelKot(req: Request, res: Response): Promise<void> {
    req.body = { ...req.body, status: 'CANCELLED' };
    return KitchenController.updateKotStatus(req, res);
  }

  static async cancelKotItem(req: Request, res: Response): Promise<void> {
    req.body = { ...req.body, status: 'CANCELLED' };
    return KitchenController.updateKotItemStatus(req, res);
  }
}
