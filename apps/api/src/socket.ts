// =============================================================================
// Socket.IO Server — Real-time event hub
// =============================================================================

import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '@ros/shared-types';
import { getRoomKey, getKitchenRoomKey, type RosEvent } from '@ros/shared-types';
import { logger } from './lib/logger';

let io: SocketServer;

export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:3000',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // ── Authentication middleware ────────────────────────────────────────────
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) return next(new Error('Authentication required'));

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
      socket.data.user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as JwtPayload;
    logger.debug(`Socket connected: ${user.sub} (tenant: ${user.tid})`);

    // Join tenant room so all staff and tenant admins receive tenant-wide synchronization
    if (user.tid) {
      socket.join(`tenant:${user.tid}`);
    }

    // Join tenant:branch room automatically
    if (user.tid && user.bid) {
      const branchRoom = getRoomKey(user.tid, user.bid);
      socket.join(branchRoom);
    }

    // Dynamic branch switching
    socket.on('join:branch', (branchId: string) => {
      if (user.tid && branchId) {
        const branchRoom = getRoomKey(user.tid, branchId);
        socket.join(branchRoom);
        logger.debug(`User ${user.sub} joined branch room: ${branchRoom}`);
      }
    });

    socket.on('leave:branch', (branchId: string) => {
      if (user.tid && branchId) {
        const branchRoom = getRoomKey(user.tid, branchId);
        socket.leave(branchRoom);
      }
    });

    // Kitchen staff join their station room
    socket.on('join:station', (stationId: string) => {
      const stationRoom = getKitchenRoomKey(user.tid, user.bid, stationId);
      socket.join(stationRoom);
      logger.debug(`User ${user.sub} joined station room: ${stationRoom}`);
    });

    socket.on('leave:station', (stationId: string) => {
      const stationRoom = getKitchenRoomKey(user.tid, user.bid, stationId);
      socket.leave(stationRoom);
    });

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${user.sub}`);
    });
  });

  logger.info('⚡ Socket.IO initialized');
  return io;
}

/** Emit a typed event to a specific branch room and tenant room */
export function emitToRoom(
  tenantId: string,
  branchId: string,
  event: RosEvent
): void {
  if (!io) return;
  const tenantRoom = `tenant:${tenantId}`;
  if (branchId) {
    const branchRoom = getRoomKey(tenantId, branchId);
    io.to(branchRoom).to(tenantRoom).emit('ros:event', event);
  } else {
    io.to(tenantRoom).emit('ros:event', event);
  }
}

/** Emit a typed event to a specific kitchen station room and branch/tenant rooms */
export function emitToStation(
  tenantId: string,
  branchId: string,
  stationId: string,
  event: RosEvent
): void {
  if (!io) return;
  const stationRoom = getKitchenRoomKey(tenantId, branchId, stationId);
  const branchRoom = branchId ? getRoomKey(tenantId, branchId) : null;
  const tenantRoom = `tenant:${tenantId}`;

  let target = io.to(stationRoom);
  if (branchRoom) target = target.to(branchRoom);
  if (tenantId) target = target.to(tenantRoom);
  target.emit('ros:event', event);
}

export function getIO(): SocketServer {
  return io;
}
