// =============================================================================
// Socket.IO client — typed real-time connection
// =============================================================================

import { io, Socket } from 'socket.io-client';
import type { RosEvent } from '@ros/shared-types';

let socket: Socket | null = null;

function getSocketUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  if (typeof window !== 'undefined') {
    if (window.location.port === '3000') {
      return 'http://localhost:4000';
    }
    return window.location.origin;
  }
  return 'http://localhost:4000';
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(getSocketUrl(), {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }
  return socket;
}

export function connectSocket(token: string): Socket {
  const s = getSocket();
  s.auth = { token };
  if (!s.connected) {
    s.connect();
  }
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
  return () => {
    s.off('ros:event', handler);
  };
}
