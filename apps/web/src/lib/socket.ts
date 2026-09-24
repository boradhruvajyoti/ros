// =============================================================================
// Socket.IO client — typed real-time connection
// =============================================================================

import { io, Socket } from 'socket.io-client';
import type { RosEvent } from '@ros/shared-types';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000', {
      autoConnect: false,
      transports: ['websocket'],
    });
  }
  return socket;
}

export function connectSocket(token: string): Socket {
  const s = getSocket();
  s.auth = { token };
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}

export function joinStation(stationId: string): void {
  getSocket().emit('join:station', stationId);
}

export function leaveStation(stationId: string): void {
  getSocket().emit('leave:station', stationId);
}

type RosEventHandler = (event: RosEvent) => void;

export function onRosEvent(handler: RosEventHandler): () => void {
  const s = getSocket();
  s.on('ros:event', handler);
  return () => s.off('ros:event', handler);
}
