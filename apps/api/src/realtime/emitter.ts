import type { Server } from 'socket.io';

/**
 * Thin indirection so domain/services can push realtime events without
 * importing the socket server directly (avoids a require cycle and keeps the
 * transport swappable — e.g. a Redis adapter later).
 */
let io: Server | null = null;
const onlineUsers = new Set<string>();

export function bindSocketServer(server: Server): void {
  io = server;
}

export function userRoom(userId: string): string {
  return `user:${userId}`;
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  io?.to(userRoom(userId)).emit(event, payload);
}

export function broadcast(event: string, payload: unknown): void {
  io?.emit(event, payload);
}

export function markOnline(userId: string): void {
  onlineUsers.add(userId);
  broadcast('presence', { online: onlineUsers.size });
}

export function markOffline(userId: string): void {
  onlineUsers.delete(userId);
  broadcast('presence', { online: onlineUsers.size });
}

export function presenceCount(): number {
  return onlineUsers.size;
}
