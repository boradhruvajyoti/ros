// =============================================================================
// Pre-Order Controller — Public Restaurant Page, Pre-Orders & Token Tracking
// =============================================================================

import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendSuccess, AppError } from '../middlewares/error.middleware';
import { ErrorCodes } from '@ros/shared-types';
import { emitToRoom } from '../socket';
import { generateULID, generateKotNumber } from '@ros/utils';
import { MarketingController } from './marketing.controller';
import crypto from 'crypto';

export class PreOrderController {
  // ── 1. Fetch Restaurant Details, Layout & Menu for Pre-Order by Slug ────────
  static async getRestaurantBySlug(req: Request, res: Response): Promise<void> {
    const rawSlug = req.params.slug?.toLowerCase().trim();
    if (!rawSlug) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Restaurant slug is required', 400);
    }

    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { slug: rawSlug },
          { id: rawSlug },
        ],
        status: { not: 'SUSPENDED' },
      },
      include: {
        branches: {
          where: { isActive: true },
          take: 1,
        },
      },
    });

    if (!tenant) {
      throw new AppError(ErrorCodes.NOT_FOUND, `Restaurant "${rawSlug}" not found`, 404);
    }

    const primaryBranch = tenant.branches[0] || null;
    const branchId = primaryBranch?.id;

    // Parse tenant settings for pre-order policies, taxes, etc.
    let parsedSettings: any = {};
    try {
      parsedSettings = typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : (tenant.settings || {});
    } catch {}

    // Menu Categories & Available Items
    const categories = await prisma.menuCategory.findMany({
      where: {
        tenantId: tenant.id,
        isActive: true,
        OR: branchId ? [{ branchId }, { branchId: null }] : undefined,
      },
      include: {
        items: {
          where: { isActive: true, isAvailable: true },
          include: {
            variants: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
            modifierGroups: {
              include: {
                modifierGroup: {
                  include: {
                    modifiers: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
                  },
                },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Floors & Tables for interactive visual layout
    const floors = await prisma.floor.findMany({
      where: {
        tenantId: tenant.id,
        isActive: true,
        OR: branchId ? [{ branchId }] : undefined,
      },
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
        },
        tables: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Also get all standalone tables
    const allTables = await prisma.restaurantTable.findMany({
      where: {
        tenantId: tenant.id,
        isActive: true,
        OR: branchId ? [{ branchId }] : undefined,
      },
      include: {
        floor: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });

    // Active promotions / coupons
    const allPromos = MarketingController.getTenantPromotions(tenant.id);
    const todayStr = new Date().toISOString().split('T')[0];
    const promotions = allPromos.filter(p => {
      if (p.status !== 'ACTIVE') return false;
      if (p.validFrom && p.validFrom > todayStr) return false;
      if (p.validTo && p.validTo < todayStr) return false;
      return true;
    });

    sendSuccess(res, {
      restaurant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        logoUrl: tenant.logoUrl,
        tagline: parsedSettings.tagline || 'Fine Dining & Hospitality',
        description: parsedSettings.description || 'Welcome to our restaurant. Experience exceptional culinary delight.',
        address: primaryBranch?.address || parsedSettings.address || 'Main Road, City Center',
        phone: primaryBranch?.phone || parsedSettings.phone || '+1 (555) 019-2834',
        email: primaryBranch?.email || parsedSettings.email || 'contact@restaurant.com',
        branchId: primaryBranch?.id || null,
        branchName: primaryBranch?.name || 'Main Branch',
        preOrderPolicy: {
          enabled: parsedSettings.preOrderEnabled !== false,
          noShowGraceMinutes: Number(parsedSettings.noShowGraceMinutes || 30),
          noShowAction: parsedSettings.noShowAction || 'REALLOCATE_TABLE', // REALLOCATE_TABLE | CHARGEABLE_HOLDING | FREE_HOLDING
          hourlyHoldingCharge: Number(parsedSettings.hourlyHoldingCharge || 0),
        },
        taxRates: {
          cgst: Number(parsedSettings.cgst || (parsedSettings.taxRate ? Number(parsedSettings.taxRate) / 2 : 2.5)),
          sgst: Number(parsedSettings.sgst || (parsedSettings.taxRate ? Number(parsedSettings.taxRate) / 2 : 2.5)),
          serviceChargeRate: Number(parsedSettings.serviceChargeRate || 5.0),
          packagingFee: Number(parsedSettings.packagingFee || 0),
        },
      },
      categories,
      floors,
      tables: allTables,
      promotions,
    });
  }

  // ── 2. Submit Public Pre-Order ───────────────────────────────────────────────
  static async submitPreOrder(req: Request, res: Response): Promise<void> {
    const rawSlug = req.params.slug?.toLowerCase().trim();
    const {
      customerName,
      customerPhone,
      customerAddress,
      guestCount,
      tableId,
      expectedArrivalTime,
      items,
      notes,
    } = req.body;

    if (!customerName || !customerPhone) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Guest name and phone number are required', 400);
    }

    if (!expectedArrivalTime) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Expected arrival time is required for Pre-Orders', 400);
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Pre-order must contain at least one food item', 400);
    }

    // Resolve Tenant
    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [{ slug: rawSlug }, { id: rawSlug }],
        status: { not: 'SUSPENDED' },
      },
      include: {
        branches: { where: { isActive: true }, take: 1 },
      },
    });

    if (!tenant) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Restaurant not found', 404);
    }

    const branch = tenant.branches[0];
    if (!branch) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Restaurant branch not available', 404);
    }

    // Find a system user for createdBy foreign key
    let systemUser = await prisma.user.findFirst({
      where: { tenantId: tenant.id },
      select: { id: true },
    });
    if (!systemUser) {
      systemUser = await prisma.user.findFirst({ select: { id: true } });
    }
    if (!systemUser) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'No system operator found', 404);
    }

    // Validate table if provided
    let tableName: string | undefined;
    if (tableId) {
      const table = await prisma.restaurantTable.findUnique({
        where: { id: tableId },
        select: { id: true, name: true, tenantId: true },
      });
      if (table && table.tenantId === tenant.id) {
        tableName = table.name;
      }
    }

    // Upsert Customer in CRM
    const cleanPhone = customerPhone.trim();
    const customer = await prisma.customer.upsert({
      where: { tenantId_phone: { tenantId: tenant.id, phone: cleanPhone } },
      update: {
        name: customerName.trim(),
        address: customerAddress?.trim() || undefined,
        visitCount: { increment: 1 },
      },
      create: {
        tenantId: tenant.id,
        name: customerName.trim(),
        phone: cleanPhone,
        address: customerAddress?.trim() || null,
        visitCount: 1,
      },
    });

    // Calculate item pricing
    let subtotal = 0;
    const orderItemsData: any[] = [];

    for (const it of items) {
      const menuItem = await prisma.menuItem.findUnique({
        where: { id: it.menuItemId },
        include: { variants: true },
      });

      if (!menuItem || menuItem.tenantId !== tenant.id) continue;

      let price = Number(menuItem.variants[0]?.price || 0);
      if (it.variantId) {
        const v = menuItem.variants.find(va => va.id === it.variantId);
        if (v) price = Number(v.price);
      }

      const qty = Math.max(1, parseInt(it.quantity, 10) || 1);
      const lineTotal = price * qty;
      subtotal += lineTotal;

      orderItemsData.push({
        id: generateULID(),
        menuItemId: menuItem.id,
        variantId: it.variantId || null,
        quantity: qty,
        unitPrice: price,
        discountAmount: 0,
        taxAmount: 0,
        status: 'PENDING',
        notes: it.notes || null,
      });
    }

    if (orderItemsData.length === 0) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'No valid menu items in pre-order', 400);
    }

    // Taxes & Charges
    let parsedSettings: any = {};
    try {
      parsedSettings = typeof tenant.settings === 'string' ? JSON.parse(tenant.settings) : (tenant.settings || {});
    } catch {}

    const cgstRate = Number(parsedSettings.cgst || (parsedSettings.taxRate ? Number(parsedSettings.taxRate) / 2 : 2.5));
    const sgstRate = Number(parsedSettings.sgst || (parsedSettings.taxRate ? Number(parsedSettings.taxRate) / 2 : 2.5));
    const serviceRate = Number(parsedSettings.serviceChargeRate || 0);

    const taxAmount = (subtotal * (cgstRate + sgstRate)) / 100;
    const serviceCharge = (subtotal * serviceRate) / 100;
    const total = Math.round(subtotal + taxAmount + serviceCharge);

    // Generate unique tracking token & expiry
    const trackingToken = `trk_${crypto.randomBytes(8).toString('hex')}`;
    const arrivalDate = new Date(expectedArrivalTime);
    const graceMinutes = Number(parsedSettings.noShowGraceMinutes || 30);
    const tokenExpiresAt = new Date(arrivalDate.getTime() + (graceMinutes + 120) * 60 * 1000).toISOString();

    const orderNumber = `PRE-${Math.floor(1000 + Math.random() * 9000)}`;

    const metadata = {
      preOrder: true,
      guestCount: Math.max(1, parseInt(guestCount, 10) || 1),
      expectedArrivalTime: arrivalDate.toISOString(),
      customerName: customerName.trim(),
      customerPhone: cleanPhone,
      customerAddress: customerAddress?.trim() || '',
      tableId: tableId || null,
      tableName: tableName || null,
      trackingToken,
      tokenExpiresAt,
      paymentStatus: 'UNPAID', // UNPAID | PAID
      staffStatus: 'PENDING_ACCEPTANCE', // PENDING_ACCEPTANCE | ACCEPTED | REJECTED
      customerNotes: notes?.trim() || '',
    };

    const orderId = generateULID();

    const order = await prisma.order.create({
      data: {
        id: orderId,
        tenantId: tenant.id,
        branchId: branch.id,
        orderNumber,
        type: 'PRE_ORDER',
        status: 'DRAFT', // Staff accepts -> ACCEPTED -> Paid -> CONFIRMED -> Kitchen
        tableId: tableId || null,
        customerId: customer.id,
        createdBy: systemUser.id,
        subtotal,
        taxAmount,
        serviceCharge,
        total,
        paidAmount: 0,
        notes: JSON.stringify(metadata),
        items: {
          create: orderItemsData,
        },
        statusHistory: {
          create: {
            fromStatus: null,
            toStatus: 'DRAFT',
            changedBy: systemUser.id,
            reason: `Pre-Order placed by guest online for expected arrival at ${arrivalDate.toLocaleTimeString()}`,
          },
        },
      },
      include: {
        items: {
          include: {
            menuItem: { select: { id: true, name: true, foodType: true, imageUrl: true } },
            variant: { select: { id: true, name: true, price: true } },
          },
        },
        table: true,
        customer: true,
      },
    });

    // Real-time broadcast to Branch POS / Staff
    emitToRoom(`branch:${branch.id}`, 'ros:event', {
      type: 'ORDER_CREATED',
      payload: {
        id: order.id,
        orderNumber: order.orderNumber,
        type: 'PRE_ORDER' as any,
        status: 'DRAFT',
        tableName: tableName || 'Pre-Order',
        customerName: customer.name,
        itemCount: order.items.length,
        total,
        createdAt: order.createdAt.toISOString(),
      },
    } as any);

    sendSuccess(res, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      trackingToken,
      trackingUrl: `/${tenant.slug}/track/${trackingToken}`,
      status: 'PENDING_ACCEPTANCE',
      subtotal,
      taxAmount,
      serviceCharge,
      total,
      expectedArrivalTime: metadata.expectedArrivalTime,
      tokenExpiresAt,
      guestCount: metadata.guestCount,
      tableName: tableName || 'Unassigned / Open',
    }, 201);
  }

  // ── 3. Get Order Tracking Details by Token ──────────────────────────────────
  static async getOrderByTrackingToken(req: Request, res: Response): Promise<void> {
    const { token } = req.params;
    if (!token) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Tracking token is required', 400);
    }

    const order = await prisma.order.findFirst({
      where: {
        notes: { contains: token },
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true, logoUrl: true, settings: true } },
        branch: { select: { id: true, name: true, phone: true, address: true } },
        table: { select: { id: true, name: true, capacity: true, floor: { select: { name: true } } } },
        items: {
          include: {
            menuItem: { select: { id: true, name: true, foodType: true, imageUrl: true } },
            variant: { select: { id: true, name: true, price: true } },
          },
        },
        kots: {
          include: {
            kitchenStation: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!order) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Pre-order not found or invalid tracking link', 404);
    }

    let meta: any = {};
    try {
      meta = typeof order.notes === 'string' ? JSON.parse(order.notes) : (order.notes || {});
    } catch {}

    // Check token expiry
    const isExpired = meta.tokenExpiresAt ? new Date().toISOString() > meta.tokenExpiresAt : false;

    // Determine normalized tracking stage
    let trackingStage: 'PENDING_ACCEPTANCE' | 'ACCEPTED' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED' = 'PENDING_ACCEPTANCE';
    if (order.status === 'CANCELLED' || meta.staffStatus === 'REJECTED') {
      trackingStage = 'CANCELLED';
    } else if (order.status === 'COMPLETED' || order.status === 'SERVED') {
      trackingStage = 'COMPLETED';
    } else if (order.status === 'READY') {
      trackingStage = 'READY';
    } else if (order.status === 'SENT_TO_KITCHEN' || order.status === 'PREPARING') {
      trackingStage = 'PREPARING';
    } else if (order.status === 'CONFIRMED' || meta.paymentStatus === 'PAID') {
      trackingStage = 'CONFIRMED';
    } else if (meta.staffStatus === 'ACCEPTED' || order.status === 'ACCEPTED') {
      trackingStage = 'ACCEPTED';
    }

    sendSuccess(res, {
      isExpired,
      orderId: order.id,
      orderNumber: order.orderNumber,
      trackingToken: token,
      orderStatus: order.status,
      trackingStage,
      paymentStatus: meta.paymentStatus || (Number(order.paidAmount) >= Number(order.total) ? 'PAID' : 'UNPAID'),
      canPay: (trackingStage === 'ACCEPTED' || order.status === 'ACCEPTED' || order.status === 'CONFIRMED') && meta.paymentStatus !== 'PAID',
      subtotal: Number(order.subtotal),
      taxAmount: Number(order.taxAmount),
      serviceCharge: Number(order.serviceCharge),
      total: Number(order.total),
      paidAmount: Number(order.paidAmount),
      expectedArrivalTime: meta.expectedArrivalTime,
      guestCount: meta.guestCount || 1,
      customerName: meta.customerName,
      customerPhone: meta.customerPhone,
      customerAddress: meta.customerAddress,
      tableName: order.table?.name || meta.tableName || null,
      floorName: order.table?.floor?.name || null,
      restaurant: {
        name: order.tenant.name,
        slug: order.tenant.slug,
        logoUrl: order.tenant.logoUrl,
        address: order.branch.address,
        phone: order.branch.phone,
      },
      items: order.items.map(it => ({
        id: it.id,
        name: it.menuItem?.name || 'Item',
        foodType: it.menuItem?.foodType || 'VEG',
        imageUrl: it.menuItem?.imageUrl,
        variantName: it.variant?.name || null,
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice),
        total: Number(it.unitPrice) * it.quantity,
        status: it.status,
      })),
      kots: order.kots.map(k => ({
        kotNumber: k.kotNumber,
        status: k.status,
        kitchenStationName: k.kitchenStation?.name || 'Kitchen',
        createdAt: k.createdAt,
      })),
      createdAt: order.createdAt,
    });
  }

  // ── 4. Process Pre-Order Payment Online ──────────────────────────────────────
  static async processPreOrderPayment(req: Request, res: Response): Promise<void> {
    const { token } = req.params;
    const { paymentMethod = 'UPI', referenceNumber } = req.body;

    const order = await prisma.order.findFirst({
      where: { notes: { contains: token } },
      include: {
        tenant: true,
        branch: true,
        items: {
          include: {
            menuItem: { select: { id: true, name: true, kitchenStationId: true } },
          },
        },
      },
    });

    if (!order) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Order not found', 404);
    }

    let meta: any = {};
    try {
      meta = typeof order.notes === 'string' ? JSON.parse(order.notes) : (order.notes || {});
    } catch {}

    const totalAmount = Number(order.total);
    const refNum = referenceNumber || `PAY-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Update metadata
    meta.paymentStatus = 'PAID';
    meta.paidAt = new Date().toISOString();
    meta.paymentMethod = paymentMethod;
    meta.paymentRef = refNum;
    meta.staffStatus = 'CONFIRMED';

    // Create Payment Record
    await prisma.payment.create({
      data: {
        id: generateULID(),
        tenantId: order.tenantId,
        branchId: order.branchId,
        orderId: order.id,
        amount: totalAmount,
        method: paymentMethod as any,
        status: 'COMPLETED',
        referenceNumber: refNum,
        createdBy: order.createdBy,
      },
    });

    // Update Order Status to CONFIRMED / PAID
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'CONFIRMED',
        paidAmount: totalAmount,
        notes: JSON.stringify(meta),
      },
    });

    // Generate KOTs for kitchen stations automatically so kitchen can prepare food
    try {
      const stationMap = new Map<string, any[]>();
      for (const it of order.items) {
        const stationId = it.menuItem?.kitchenStationId || 'main';
        if (!stationMap.has(stationId)) stationMap.set(stationId, []);
        stationMap.get(stationId)!.push(it);
      }

      let seq = 100;
      for (const [stationId, stItems] of stationMap.entries()) {
        const kotNumber = generateKotNumber(seq++);
        const kot = await prisma.orderKot.create({
          data: {
            id: generateULID(),
            branchId: order.branchId,
            orderId: order.id,
            kitchenStationId: stationId !== 'main' ? stationId : undefined,
            kotNumber,
            status: 'SENT',
            items: {
              create: stItems.map(it => ({
                id: generateULID(),
                orderItemId: it.id,
                quantity: it.quantity,
                status: 'SENT',
              })),
            },
          },
        });

        emitToRoom(`kitchen:${order.branchId}`, 'ros:event', {
          type: 'KOT_CREATED',
          payload: {
            id: kot.id,
            kotNumber: kot.kotNumber,
            orderId: order.id,
            orderNumber: order.orderNumber,
            type: 'PRE_ORDER' as any,
            tableName: meta.tableName || 'Pre-Order',
            stationName: stationId,
            status: 'SENT',
            itemCount: stItems.length,
            createdAt: kot.createdAt.toISOString(),
          } as any,
        });
      }
    } catch (err) {
      console.error('KOT auto-generation error on pre-order pay:', err);
    }

    // Broadcast update to Branch Staff & live tracking
    emitToRoom(`branch:${order.branchId}`, 'ros:event', {
      type: 'PAYMENT_COMPLETED',
      payload: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: totalAmount,
        method: paymentMethod,
      } as any,
    });

    sendSuccess(res, {
      success: true,
      orderNumber: order.orderNumber,
      paidAmount: totalAmount,
      paymentMethod,
      referenceNumber: refNum,
      status: 'CONFIRMED',
      message: 'Payment received! Your pre-order is confirmed and the kitchen is preparing your meal.',
    });
  }
}
