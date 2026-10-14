import { io } from 'socket.io-client';

export function connectSocket(url) {
  return io(url.trim().replace(/\/+$/, ''), {
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionAttempts: 8,
    timeout: 20000,
  });
}