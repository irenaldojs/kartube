export interface TransportHandlers {
  readonly open: () => void;
  readonly message: (data: unknown) => void;
  readonly close: () => void;
  readonly error: () => void;
}
/** One session owns this transport, its subscription, and its closure. */
export interface RaceTransport {
  readonly isOpen: boolean;
  // Register future callbacks only; do not emit synchronously during subscription.
  subscribe(handlers: TransportHandlers): () => void;
  send(data: string): void;
  close(): void;
}
/** Browser and Node 24 use the same WebSocket API. The session handles text validation. */
export function createWebSocketTransport(url: string): RaceTransport {
  const socket = new WebSocket(url);
  return {
    get isOpen() { return socket.readyState === WebSocket.OPEN; },
    subscribe(handlers) {
      const message = (event: MessageEvent<unknown>) => handlers.message(event.data);
      socket.addEventListener('open', handlers.open);
      socket.addEventListener('message', message);
      socket.addEventListener('close', handlers.close);
      socket.addEventListener('error', handlers.error);
      return () => {
        socket.removeEventListener('open', handlers.open);
        socket.removeEventListener('message', message);
        socket.removeEventListener('close', handlers.close);
        socket.removeEventListener('error', handlers.error);
      };
    },
    send: data => socket.send(data),
    close: () => socket.close(),
  };
}
