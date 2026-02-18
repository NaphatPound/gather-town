import { io, Socket } from "socket.io-client";

interface PlayerData {
  id: string;
  name: string;
  avatar: string;
  x: number;
  y: number;
}

type NetworkEvents = {
  "players:existing": (players: PlayerData[]) => void;
  "player:joined": (player: PlayerData) => void;
  "player:moved": (data: { id: string; x: number; y: number }) => void;
  "player:left": (data: { id: string }) => void;
};

const SEND_INTERVAL_MS = 100; // 10 updates/sec

class NetworkService {
  private socket: Socket | null = null;
  private lastSentX = -1;
  private lastSentY = -1;
  private lastSendTime = 0;

  connect() {
    if (this.socket) return;
    this.socket = io("http://localhost:3001");
  }

  disconnect() {
    if (!this.socket) return;
    this.socket.disconnect();
    this.socket = null;
    this.lastSentX = -1;
    this.lastSentY = -1;
  }

  joinGame(avatar: string, name: string, x: number, y: number) {
    this.socket?.emit("player:join", { avatar, name, x, y });
  }

  sendMove(x: number, y: number) {
    if (!this.socket) return;

    const now = Date.now();
    // Throttle + skip if position unchanged
    const rx = Math.round(x);
    const ry = Math.round(y);
    if (
      rx === this.lastSentX &&
      ry === this.lastSentY
    ) {
      return;
    }
    if (now - this.lastSendTime < SEND_INTERVAL_MS) return;

    this.lastSentX = rx;
    this.lastSentY = ry;
    this.lastSendTime = now;
    this.socket.emit("player:move", { x: rx, y: ry });
  }

  on<E extends keyof NetworkEvents>(event: E, callback: NetworkEvents[E]) {
    this.socket?.on(event as string, callback as (...args: unknown[]) => void);
  }

  off<E extends keyof NetworkEvents>(event: E, callback: NetworkEvents[E]) {
    this.socket?.off(event as string, callback as (...args: unknown[]) => void);
  }

  get id(): string | undefined {
    return this.socket?.id;
  }
}

export const networkService = new NetworkService();
export type { PlayerData };
