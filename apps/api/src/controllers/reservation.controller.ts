// =============================================================================
// Reservation Controller — Table Bookings & Guest Status
// =============================================================================

import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { sendSuccess } from '../middlewares/error.middleware';
import { TelegramService } from '../services/telegram.service';
import { z } from 'zod';

const createReservationSchema = z.object({
  customerName: z.string().min(1),
  customerPhone: z.string().min(5),
  partySize: z.number().int().positive(),
  date: z.string(),
  timeSlot: z.string().min(1),
  occasion: z.string().optional(),
  specialRequests: z.string().optional(),
  tableId: z.string().optional(),
});

const updateReservationStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'ARRIVED', 'SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
});

export class ReservationController {
  static async listReservations(req: Request, res: Response) {
    const reservations = await prisma.reservation.findMany({
      where: {
        tenantId: req.user!.tid,
        branchId: req.user!.bid!,
      },
      include: {
        table: true,
        customer: true,
      },
      orderBy: { date: 'desc' },
      take: 100,
    });
    sendSuccess(res, reservations);
  }

  static async createReservation(req: Request, res: Response) {
    const data = createReservationSchema.parse(req.body);
    const reservation = await prisma.reservation.create({
      data: {
        tenantId: req.user!.tid,
        branchId: req.user!.bid!,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        partySize: data.partySize,
        date: new Date(data.date),
        timeSlot: data.timeSlot,
        occasion: data.occasion || null,
        specialRequests: data.specialRequests || null,
        tableId: data.tableId || null,
        status: 'CONFIRMED',
      },
      include: { table: true },
    });

    // Dispatch Telegram Bot Notification (TABLE_RESERVATION_NEW)
    TelegramService.getUserName(req.user, 'Staff').then((userName) => {
      TelegramService.sendNotificationToTenant(
        req.user!.tid,
        'TABLE_RESERVATION_NEW',
        `📅 <b>New Table Reservation Confirmed!</b>\n\n• <b>Guest:</b> ${reservation.customerName} (${reservation.customerPhone})\n• <b>Party Size:</b> ${reservation.partySize} Guests\n• <b>Date & Time:</b> ${new Date(reservation.date).toLocaleDateString()} at ${reservation.timeSlot}\n• <b>Table:</b> ${reservation.table?.name || 'Unassigned'}\n• <b>Occasion:</b> ${reservation.occasion || 'General Dining'}\n• <b>Booked By:</b> ${userName}`
      ).catch((e) => console.error('[Telegram Reservation Alert Error]:', e));
    });

    sendSuccess(res, reservation, 201);
  }

  static async updateStatus(req: Request, res: Response) {
    const { id } = req.params;
    const data = updateReservationStatusSchema.parse(req.body);
    const updated = await prisma.reservation.update({
      where: { id },
      data: { status: data.status },
      include: { table: true },
    });
    sendSuccess(res, updated);
  }
}
