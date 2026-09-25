// =============================================================================
// Order Service — state machine, KOT engine, calculations
// =============================================================================

import { prisma } from '../lib/prisma';
import { AppError } from '../middlewares/error.middleware';
import { ErrorCodes, ORDER_STATE_TRANSITIONS, type OrderStatus } from '@ros/shared-types';
import { emitToRoom, emitToStation } from '../socket';
import { addAmounts, multiplyAmount, percentageOf, toAmount } from '@ros/utils';
import { generateULID, generateOrderNumber, generateKotNumber } from '@ros/utils';
import type { Prisma } from '@prisma/client';

export interface CreateOrderDto {
  type: 'DINE_IN' | 'TAKEAWAY' | 'PICKUP' | 'DELIVERY' | 'ONLINE';
  status?: OrderStatus;
  tableId?: string;
  customerId?: string;
  waiterId?: string;
  notes?: string;
  clientId?: string; // idempotency key
  items: CreateOrderItemDto[];
}

export interface CreateOrderItemDto {
  menuItemId: string;
  variantId?: string;
  quantity: number;
  unitPrice?: number;
  notes?: string;
  modifierIds?: string[];
}

export interface UpdateOrderStatusDto {
  status: OrderStatus;
  reason?: string;
  userId: string;
}

export class OrderService {
  private tenantId: string;
  private branchId: string;

  constructor(tenantId: string, branchId: string) {
    this.tenantId = tenantId;
    this.branchId = branchId;
  }

  // ── Create Order ───────────────────────────────────────────────────────────
  async createOrder(dto: CreateOrderDto, createdBy: string): Promise<any> {
    // Idempotency check
    if (dto.clientId) {
      const existing = await prisma.order.findUnique({ where: { clientId: dto.clientId } });
      if (existing) return existing;
    }

    // Resolve a strictly valid branch ID
    let effectiveBranchId = this.branchId;
    if (!effectiveBranchId || effectiveBranchId === 'default-branch') {
      if (dto.tableId) {
        const table = await prisma.restaurantTable.findUnique({
          where: { id: dto.tableId },
          select: { branchId: true },
        });
        if (table?.branchId) effectiveBranchId = table.branchId;
      }
      if (!effectiveBranchId || effectiveBranchId === 'default-branch') {
        const fallbackBranch = await prisma.branch.findFirst({
          where: { tenantId: this.tenantId },
          select: { id: true },
        });
        if (fallbackBranch) {
          effectiveBranchId = fallbackBranch.id;
        } else {
          const newBranch = await prisma.branch.create({
            data: {
              tenantId: this.tenantId,
              name: 'Main Branch',
              isActive: true,
            },
          });
          effectiveBranchId = newBranch.id;
        }
      }
    }

    // Load menu items with variants and modifier prices
    const menuItemIds = dto.items.map((i) => i.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, tenantId: this.tenantId },
      include: { variants: true },
    });

    const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

    // Load modifiers
    const allModifierIds = dto.items.flatMap((i) => i.modifierIds || []);
    const modifiers = allModifierIds.length > 0
      ? await prisma.modifier.findMany({ where: { id: { in: allModifierIds } } })
      : [];
    const modifierMap = new Map(modifiers.map((m) => [m.id, m]));

    // Build order items with price snapshots
    let subtotal = 0;
    const orderItemsData = dto.items.map((item) => {
      const menuItem = menuItemMap.get(item.menuItemId);
      if (!menuItem) throw new AppError(ErrorCodes.NOT_FOUND, `Menu item ${item.menuItemId} not found`);

      let variant = null;
      if (item.variantId && !item.variantId.startsWith('v-')) {
        variant = menuItem.variants.find((v) => v.id === item.variantId) || null;
      }
      if (!variant && menuItem.variants.length > 0) {
        variant = menuItem.variants[0];
      }

      const itemModifiers = (item.modifierIds || []).map((mid) => {
        const mod = modifierMap.get(mid);
        if (!mod) throw new AppError(ErrorCodes.NOT_FOUND, `Modifier ${mid} not found`);
        return { modifierId: mod.id, name: mod.name, price: toAmount(mod.price) };
      });

      const modifierTotal = itemModifiers.reduce((s, m) => addAmounts(s, m.price), 0);
      const fallbackPrice = Number(item.unitPrice !== undefined && item.unitPrice !== null ? item.unitPrice : (menuItem as any).basePrice || (menuItem as any).price || 0);
      const unitPrice = variant ? toAmount(addAmounts(variant.price, modifierTotal)) : toAmount(fallbackPrice + modifierTotal);
      const lineTotal = multiplyAmount(unitPrice, item.quantity);
      subtotal = addAmounts(subtotal, lineTotal);

      return {
        menuItemId: item.menuItemId,
        variantId: variant?.id || null,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
        notes: item.notes,
        modifiers: itemModifiers,
        kitchenStationId: menuItem.kitchenStationId,
      };
    });

    const initialStatus = dto.status || 'DRAFT';

    // Dynamic tax rate from tenant settings
    const tenant = await prisma.tenant.findUnique({
      where: { id: this.tenantId },
      select: { settings: true },
    });
    let taxRate = 0;
    if (tenant?.settings) {
      try {
        const parsed = typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : tenant.settings;
        if (parsed?.taxRate !== undefined) taxRate = Number(parsed.taxRate) || 0;
      } catch {}
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Check if table already has an active order (unpaid/uncompleted)
    // ─────────────────────────────────────────────────────────────────────────
    const activeOrderStatuses: OrderStatus[] = [
      'DRAFT',
      'CONFIRMED',
      'SENT_TO_KITCHEN',
      'PREPARING',
      'READY',
      'SERVED',
      'BILLED',
      'PARTIALLY_PAID',
    ];

    const existingActiveOrder = dto.tableId
      ? await prisma.order.findFirst({
          where: {
            tenantId: this.tenantId,
            tableId: dto.tableId,
            status: { in: activeOrderStatuses },
          },
          include: {
            items: true,
            table: true,
            customer: true,
          },
          orderBy: { createdAt: 'desc' },
        })
      : null;

    if (existingActiveOrder) {
      const combinedSubtotal = addAmounts(toAmount(existingActiveOrder.subtotal), subtotal);
      const combinedTaxAmount = taxRate > 0 ? Math.round((combinedSubtotal * (taxRate / 100)) * 100) / 100 : 0;
      const combinedTotal = toAmount(addAmounts(combinedSubtotal, combinedTaxAmount));

      let combinedNotes = existingActiveOrder.notes || '';
      if (dto.notes) {
        combinedNotes = combinedNotes ? `${combinedNotes} | ${dto.notes}` : dto.notes;
      }

      return prisma.$transaction(async (tx) => {
        // Insert new items linked to the existing order ID with status PENDING
        for (const { modifiers, kitchenStationId, ...itemData } of orderItemsData) {
          await tx.orderItem.create({
            data: {
              orderId: existingActiveOrder.id,
              ...itemData,
              status: 'PENDING',
              modifiers: {
                create: modifiers.map((m) => ({
                  modifierId: m.modifierId,
                  name: m.name,
                  price: m.price,
                })),
              },
            },
          });
        }

        // Determine if status should change (e.g. if previous was DRAFT/CONFIRMED and sent to kitchen)
        let newStatus = existingActiveOrder.status;
        if (initialStatus === 'SENT_TO_KITCHEN' && ['DRAFT', 'CONFIRMED'].includes(existingActiveOrder.status as any)) {
          newStatus = 'SENT_TO_KITCHEN';
        }

        const updatedOrder = await tx.order.update({
          where: { id: existingActiveOrder.id },
          data: {
            status: newStatus,
            subtotal: combinedSubtotal,
            taxAmount: combinedTaxAmount,
            total: combinedTotal,
            notes: combinedNotes || null,
            customerId: existingActiveOrder.customerId || dto.customerId || undefined,
            updatedBy: createdBy,
            statusHistory: {
              create: {
                fromStatus: existingActiveOrder.status,
                toStatus: newStatus,
                changedBy: createdBy,
                reason: `Appended ${orderItemsData.length} item(s) to order #${existingActiveOrder.orderNumber}`,
              },
            },
          },
          include: this.orderInclude(),
        });

        // Ensure table status remains OCCUPIED
        await tx.restaurantTable.update({
          where: { id: dto.tableId },
          data: { status: 'OCCUPIED' },
        });

        // If sent to kitchen, generate KOT for the new items
        if (initialStatus === 'SENT_TO_KITCHEN') {
          await this.generateKots(existingActiveOrder.id, tx as any, effectiveBranchId);
        }

        // Real-time broadcast
        emitToRoom(this.tenantId, effectiveBranchId, {
          type: 'ORDER_UPDATED',
          payload: {
            orderId: updatedOrder.id,
            orderNumber: updatedOrder.orderNumber,
            total: toAmount(updatedOrder.total),
            itemCount: updatedOrder.items.length,
          },
        });

        emitToRoom(this.tenantId, effectiveBranchId, {
          type: 'TABLE_STATUS_CHANGED',
          payload: { tableId: dto.tableId!, status: 'OCCUPIED', orderId: updatedOrder.id },
        });

        return updatedOrder;
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Brand new order creation
    // ─────────────────────────────────────────────────────────────────────────
    const orderNumber = await this.getNextSequence('ORDER', effectiveBranchId);
    const taxAmount = taxRate > 0 ? Math.round((subtotal * (taxRate / 100)) * 100) / 100 : 0;
    const total = toAmount(addAmounts(subtotal, taxAmount));

    return prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          id: generateULID(),
          tenantId: this.tenantId,
          branchId: effectiveBranchId,
          orderNumber,
          type: dto.type,
          status: initialStatus,
          tableId: dto.tableId || null,
          customerId: dto.customerId || null,
          waiterId: dto.waiterId || null,
          notes: dto.notes,
          clientId: dto.clientId || null,
          subtotal,
          taxAmount,
          total,
          createdBy,
          items: {
            create: orderItemsData.map(({ modifiers, kitchenStationId, ...itemData }) => ({
              ...itemData,
              modifiers: {
                create: modifiers.map((m) => ({
                  modifierId: m.modifierId,
                  name: m.name,
                  price: m.price,
                })),
              },
            })),
          },
          statusHistory: {
            create: { fromStatus: null, toStatus: initialStatus, changedBy: createdBy },
          },
        },
        include: this.orderInclude(),
      });

      // Update table status if dine-in
      if (dto.tableId && dto.type === 'DINE_IN') {
        await tx.restaurantTable.update({
          where: { id: dto.tableId },
          data: { status: 'OCCUPIED' },
        });
      }

      // If initial status is SENT_TO_KITCHEN, auto-generate KOTs immediately
      if (initialStatus === 'SENT_TO_KITCHEN') {
        await this.generateKots(order.id, tx as any, effectiveBranchId);
      }

      // Emit real-time event
      emitToRoom(this.tenantId, effectiveBranchId, {
        type: 'ORDER_CREATED',
        payload: {
          id: order.id,
          orderNumber: order.orderNumber,
          type: order.type as any,
          status: order.status as any,
          tableId: order.tableId || undefined,
          tableName: (order as any).table?.name,
          customerName: (order as any).customer?.name,
          itemCount: order.items.length,
          total: toAmount(order.total),
          createdAt: order.createdAt.toISOString(),
        },
      });

      return order;
    });
  }

  // ── Update Order Items (Before Sending to Kitchen) ─────────────────────────
  async updateOrderItems(
    orderId: string,
    dto: {
      items: Array<{ menuItemId: string; variantId?: string; quantity: number; unitPrice?: number; notes?: string; modifierIds?: string[] }>;
      sendToKitchen?: boolean;
      notes?: string;
    },
    userId: string
  ): Promise<any> {
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId: this.tenantId },
      include: { items: true },
    });

    if (!order) throw new AppError(ErrorCodes.NOT_FOUND, 'Order not found', 404);

    if (!['DRAFT', 'CONFIRMED'].includes(order.status)) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        `Cannot modify items for an order in status ${order.status}. Only un-dispatched orders (Draft / Pending) can be modified.`,
        400
      );
    }

    const menuItemIds = dto.items.map((i) => i.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, tenantId: this.tenantId },
      include: { variants: true },
    });

    const itemMap = new Map(menuItems.map((m) => [m.id, m]));

    const allModifierIds = dto.items.flatMap((i) => i.modifierIds || []);
    const modifiers = allModifierIds.length > 0
      ? await prisma.modifier.findMany({ where: { id: { in: allModifierIds } } })
      : [];
    const modifierMap = new Map(modifiers.map((m) => [m.id, m]));

    let subtotal = 0;
    const orderItemsData = dto.items.map((item) => {
      const menuItem = itemMap.get(item.menuItemId);
      if (!menuItem) throw new AppError(ErrorCodes.NOT_FOUND, `Menu item ${item.menuItemId} not found`);

      let variant = null;
      if (item.variantId && !item.variantId.startsWith('v-')) {
        variant = menuItem.variants.find((v) => v.id === item.variantId) || null;
      }
      if (!variant && menuItem.variants.length > 0) {
        variant = menuItem.variants[0];
      }

      const itemModifiers = (item.modifierIds || []).map((mid) => {
        const mod = modifierMap.get(mid);
        if (!mod) throw new AppError(ErrorCodes.NOT_FOUND, `Modifier ${mid} not found`);
        return { modifierId: mod.id, name: mod.name, price: toAmount(mod.price) };
      });

      const modifierTotal = itemModifiers.reduce((s, m) => addAmounts(s, m.price), 0);
      const fallbackPrice = Number(item.unitPrice !== undefined && item.unitPrice !== null ? item.unitPrice : (menuItem as any).basePrice || (menuItem as any).price || 0);
      const unitPrice = variant ? toAmount(addAmounts(variant.price, modifierTotal)) : toAmount(fallbackPrice + modifierTotal);
      const lineTotal = multiplyAmount(unitPrice, item.quantity);
      subtotal = addAmounts(subtotal, lineTotal);

      return {
        menuItemId: item.menuItemId,
        variantId: variant?.id || null,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
        notes: item.notes,
        modifiers: itemModifiers,
        kitchenStationId: menuItem.kitchenStationId,
      };
    });

    const tenant = await prisma.tenant.findUnique({
      where: { id: this.tenantId },
      select: { settings: true },
    });
    let taxRate = 0;
    if (tenant?.settings) {
      try {
        const parsed = typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : tenant.settings;
        if (parsed?.taxRate !== undefined) taxRate = Number(parsed.taxRate) || 0;
      } catch {}
    }
    const taxAmount = taxRate > 0 ? Math.round((subtotal * (taxRate / 100)) * 100) / 100 : 0;
    const total = toAmount(addAmounts(subtotal, taxAmount));

    const effectiveBranchId = order.branchId || this.branchId;

    return prisma.$transaction(async (tx) => {
      await tx.orderItemModifier.deleteMany({
        where: { orderItem: { orderId } },
      });
      await tx.orderItem.deleteMany({
        where: { orderId },
      });

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          subtotal,
          taxAmount,
          total,
          notes: dto.notes !== undefined ? dto.notes : order.notes,
          status: dto.sendToKitchen ? 'SENT_TO_KITCHEN' : order.status,
          updatedBy: userId,
          items: {
            create: orderItemsData.map(({ modifiers, kitchenStationId, ...itemData }) => ({
              ...itemData,
              modifiers: {
                create: modifiers.map((m) => ({
                  modifierId: m.modifierId,
                  name: m.name,
                  price: m.price,
                })),
              },
            })),
          },
        },
        include: this.orderInclude(),
      });

      if (dto.sendToKitchen) {
        await this.generateKots(orderId, tx as any, effectiveBranchId);
        emitToRoom(this.tenantId, effectiveBranchId, {
          type: 'ORDER_STATUS_CHANGED',
          payload: { orderId, orderNumber: order.orderNumber, status: 'SENT_TO_KITCHEN' },
        });
      }

      emitToRoom(this.tenantId, effectiveBranchId, {
        type: 'ORDER_UPDATED',
        payload: { orderId, orderNumber: order.orderNumber, total, itemCount: orderItemsData.length },
      });

      return updatedOrder;
    });
  }

  // ── State Transition ───────────────────────────────────────────────────────
  async updateStatus(orderId: string, dto: UpdateOrderStatusDto): Promise<any> {
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId: this.tenantId },
      include: { payments: { where: { status: 'COMPLETED' } } },
    });

    if (!order) throw new AppError(ErrorCodes.NOT_FOUND, 'Order not found', 404);

    const currentStatus = order.status as OrderStatus;
    const allowedNext = ORDER_STATE_TRANSITIONS[currentStatus];

    if (!allowedNext || !allowedNext.includes(dto.status)) {
      throw new AppError(
        ErrorCodes.INVALID_STATE_TRANSITION,
        `Cannot transition from ${currentStatus} to ${dto.status}`,
        422
      );
    }

    const updateData: Prisma.OrderUpdateInput = {
      status: dto.status,
      updatedBy: dto.userId,
      statusHistory: {
        create: {
          fromStatus: currentStatus,
          toStatus: dto.status,
          changedBy: dto.userId,
          reason: dto.reason,
        },
      },
    };

    // Attach timestamps for key states
    if (dto.status === 'COMPLETED') updateData.completedAt = new Date();
    if (dto.status === 'CANCELLED') { updateData.cancelledAt = new Date(); updateData.cancellationReason = dto.reason; }
    if (dto.status === 'BILLED')    updateData.billedAt = new Date();
    if (dto.status === 'PAID') {
      if (!order.billedAt) updateData.billedAt = new Date();
      updateData.paidAmount = order.total;
    }

    const targetBranchId = order.branchId || this.branchId;

    const updated = await prisma.$transaction(async (tx) => {
      // If marked as PAID and balance is due, record a CASH payment entry
      if (dto.status === 'PAID') {
        const alreadyPaid = (order.payments || []).reduce((s, p) => Number(s) + Number(p.amount), 0);
        const total = Number(order.total);
        const remaining = total - alreadyPaid;
        if (remaining > 0) {
          await tx.payment.create({
            data: {
              id: generateULID(),
              orderId,
              tenantId: this.tenantId,
              branchId: targetBranchId,
              method: 'CASH',
              amount: remaining,
              status: 'COMPLETED',
              createdBy: dto.userId,
            },
          });
        }
      }

      const u = await tx.order.update({
        where: { id: orderId },
        data: updateData,
        include: this.orderInclude(),
      });

      // Release table when order is paid/completed/voided/cancelled -> make AVAILABLE directly
      if (['PAID', 'COMPLETED', 'VOIDED', 'CANCELLED'].includes(dto.status) && order.tableId) {
        await tx.restaurantTable.update({
          where: { id: order.tableId },
          data: { status: 'AVAILABLE' },
        });
        emitToRoom(this.tenantId, targetBranchId, {
          type: 'TABLE_STATUS_CHANGED',
          payload: { tableId: order.tableId, status: 'AVAILABLE' },
        });
      }

      // When SENT_TO_KITCHEN — auto-generate KOTs
      if (dto.status === 'SENT_TO_KITCHEN') {
        await this.generateKots(orderId, tx as any, targetBranchId);
      }

      return u;
    });

    emitToRoom(this.tenantId, targetBranchId, {
      type: 'ORDER_STATUS_CHANGED',
      payload: { orderId, orderNumber: order.orderNumber, status: dto.status },
    });

    return updated;
  }

  // ── KOT Engine ─────────────────────────────────────────────────────────────
  private async generateKots(orderId: string, tx: typeof prisma, branchIdOverride?: string): Promise<void> {
    const orderItems = await tx.orderItem.findMany({
      where: { orderId, status: 'PENDING' },
      include: {
        menuItem: { select: { kitchenStationId: true, name: true } },
        variant: { select: { name: true } },
        modifiers: true,
      },
    });

    if (orderItems.length === 0) return;

    let targetBranchId = branchIdOverride || this.branchId;
    if (!targetBranchId || targetBranchId === 'default-branch') {
      const fallback = await prisma.branch.findFirst({
        where: { tenantId: this.tenantId, isActive: true },
        select: { id: true },
      });
      if (fallback) targetBranchId = fallback.id;
    }

    // Group items by kitchen station
    const stationGroups = new Map<string | null, typeof orderItems>();
    orderItems.forEach((item) => {
      const stationId = item.menuItem.kitchenStationId || null;
      if (!stationGroups.has(stationId)) stationGroups.set(stationId, []);
      stationGroups.get(stationId)!.push(item);
    });

    for (const [stationId, items] of stationGroups) {
      const kotNumber = await this.getNextSequence('KOT', targetBranchId);

      const kot = await tx.orderKot.create({
        data: {
          orderId,
          branchId: targetBranchId,
          kotNumber,
          kitchenStationId: stationId,
          status: 'NEW',
          items: {
            create: items.map((i) => ({
              orderItemId: i.id,
              status: 'NEW',
            })),
          },
        },
        include: { items: { include: { orderItem: { include: { menuItem: true, variant: true, modifiers: true } } } } },
      });

      // Update order item statuses
      await tx.orderItem.updateMany({
        where: { id: { in: items.map((i) => i.id) } },
        data: { status: 'SENT' },
      });

      // Emit KOT created event to station room
      const kotSummary = {
        id: kot.id,
        kotNumber: kot.kotNumber,
        orderId,
        orderNumber: '', // will be populated by room context
        orderType: 'DINE_IN',
        stationId: stationId || 'default',
        stationName: stationId || 'Kitchen',
        status: 'NEW' as any,
        priority: 0,
        itemCount: items.length,
        createdAt: kot.createdAt.toISOString(),
        ageMinutes: 0,
      };

      if (stationId) {
        emitToStation(this.tenantId, targetBranchId, stationId, { type: 'KOT_CREATED', payload: kotSummary });
      }
      emitToRoom(this.tenantId, targetBranchId, { type: 'KOT_CREATED', payload: kotSummary });
    }
  }

  // ── Order Totals ───────────────────────────────────────────────────────────
  async recalculateTotals(orderId: string): Promise<void> {
    const items = await prisma.orderItem.findMany({
      where: { orderId, status: { notIn: ['VOIDED', 'CANCELLED'] } },
    });

    const subtotal = items.reduce((s, i) => addAmounts(s, i.lineTotal), 0);

    // Load applied discounts
    const discounts = await prisma.appliedDiscount.findMany({ where: { orderId } });
    const discountAmount = discounts.reduce((s, d) => addAmounts(s, d.amount), 0);

    // Load tax configs and calculate taxes dynamically
    const tenant = await prisma.tenant.findUnique({
      where: { id: this.tenantId },
      select: { settings: true },
    });
    let taxRate = 0;
    if (tenant?.settings) {
      try {
        const parsed = typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : tenant.settings;
        if (parsed?.taxRate !== undefined) taxRate = Number(parsed.taxRate) || 0;
      } catch {}
    }
    const taxAmount = taxRate > 0 ? Math.round((subtotal * (taxRate / 100)) * 100) / 100 : 0;
    const total = toAmount(addAmounts(subtotal, taxAmount) - discountAmount);

    await prisma.order.update({
      where: { id: orderId },
      data: { subtotal, discountAmount, taxAmount, total },
    });
  }

  // ── Sequence Generation (DB-agnostic atomic increment) ───────────────────────
  private async getNextSequence(type: string, branchIdOverride?: string): Promise<string> {
    const today = new Date().toISOString().slice(0, 10);
    let targetBranchId = branchIdOverride || this.branchId;
    if (!targetBranchId || targetBranchId === 'default-branch') {
      const fallback = await prisma.branch.findFirst({
        where: { tenantId: this.tenantId },
        select: { id: true },
      });
      if (fallback) {
        targetBranchId = fallback.id;
      } else {
        const newBranch = await prisma.branch.create({
          data: {
            tenantId: this.tenantId,
            name: 'Main Branch',
            isActive: true,
          },
        });
        targetBranchId = newBranch.id;
      }
    }

    const row = await prisma.dailySequence.upsert({
      where: {
        tenantId_branchId_date_type: {
          tenantId: this.tenantId,
          branchId: targetBranchId,
          date: today,
          type,
        },
      },
      create: {
        tenantId: this.tenantId,
        branchId: targetBranchId,
        date: today,
        type,
        sequence: 1,
      },
      update: {
        sequence: { increment: 1 },
      },
    });

    const seq = row?.sequence || 1;

    if (type === 'ORDER') return generateOrderNumber(new Date(), seq);
    if (type === 'KOT')   return generateKotNumber(seq);
    return `${type}-${String(seq).padStart(4, '0')}`;
  }

  private orderInclude() {
    return {
      table: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true, phone: true } },
      items: {
        include: {
          menuItem: { select: { id: true, name: true, foodType: true } },
          variant: { select: { id: true, name: true } },
          modifiers: true,
        },
      },
      kots: { include: { items: true, kitchenStation: { select: { id: true, name: true } } } },
      payments: true,
      appliedDiscounts: true,
      statusHistory: { orderBy: { createdAt: 'asc' as const } },
    };
  }

  // ── Getters ────────────────────────────────────────────────────────────────
  async getOrder(orderId: string): Promise<any> {
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId: this.tenantId },
      include: this.orderInclude(),
    });
    if (!order) throw new AppError(ErrorCodes.NOT_FOUND, 'Order not found', 404);
    return order;
  }

  async listOrders(filters: {
    status?: string;
    type?: string;
    tableId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 50, ...rest } = filters;
    const where: Prisma.OrderWhereInput = {
      tenantId: this.tenantId,
      branchId: this.branchId,
      ...(rest.status ? { status: rest.status } : {}),
      ...(rest.type ? { type: rest.type } : {}),
      ...(rest.tableId ? { tableId: rest.tableId } : {}),
      ...(rest.dateFrom || rest.dateTo
        ? { createdAt: { gte: rest.dateFrom, lte: rest.dateTo } }
        : {}),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          table: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true } },
          items: {
            include: {
              menuItem: { select: { id: true, name: true, foodType: true } },
              variant: { select: { id: true, name: true, price: true } },
            },
          },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return { orders, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
