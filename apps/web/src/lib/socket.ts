import { type Socket, io } from 'socket.io-client';

let socket: Socket | null = null;

/** Connect (or reuse) the realtime socket. Auth rides on the session cookie. */
export function connectSocket(): Socket {
  if (socket) return socket;
  socket = io({
    path: '/socket.io',
    withCredentials: true,
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
