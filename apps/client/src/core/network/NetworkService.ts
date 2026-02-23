import { io, Socket } from "socket.io-client";

interface PlayerData {
  id: string;
  name: string;
  avatar: { body: string; outfit: string; hair: string; accessory: string };
  x: number;
  y: number;
}

type NetworkEvents = {
  "players:existing": (players: PlayerData[]) => void;
  "player:joined": (player: PlayerData) => void;
  "player:moved": (data: { id: string; x: number; y: number }) => void;
  "player:left": (data: { id: string }) => void;
  "chat:message": (data: { id: string; text: string; sender: string }) => void;
  "goal:scored": (data: { side: "left" | "right" }) => void;
  "score:sync": (data: { left: number; right: number }) => void;
  "ball:sync": (data: { x: number; y: number; vx: number; vy: number }) => void;
  "webrtc-offer": (data: { caller: string; sdp: any }) => void;
  "webrtc-answer": (data: { answerer: string; sdp: any }) => void;
  "webrtc-ice-candidate": (data: { sender: string; candidate: any }) => void;
};

const SEND_INTERVAL_MS = 100; // 10 updates/sec

class NetworkService {
  private socket: Socket | null = null;
  private lastSentX = -1;
  private lastSentY = -1;
  private lastSendTime = 0;
  private listeners: { [key: string]: Function[] } = {};
  private queuedEmits: { event: string; args: any[] }[] = [];

  connect() {
    if (this.socket) return;
    this.socket = io(import.meta.env.VITE_SERVER_URL || "");

    this.socket.on("connect", () => {
      console.log("NetworkService connected. Flushing queued emits.");
      while (this.queuedEmits.length > 0) {
        const item = this.queuedEmits.shift();
        if (item) {
          this.socket?.emit(item.event, ...item.args);
        }
      }
    });

    // Attach queued listeners
    for (const [evt, callbacks] of Object.entries(this.listeners)) {
      callbacks.forEach((cb) => {
        this.socket?.on(evt, cb as (...args: unknown[]) => void);
      });
    }
  }

  disconnect() {
    if (!this.socket) return;
    this.socket.disconnect();
    this.socket = null;
    this.lastSentX = -1;
    this.lastSentY = -1;
    this.queuedEmits = [];
  }

  safeEmit(event: string, ...args: any[]) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, ...args);
    } else {
      this.queuedEmits.push({ event, args });
    }
  }

  joinGame(avatar: { body: string; outfit: string; hair: string; accessory: string }, name: string, x: number, y: number) {
    this.safeEmit("player:join", { avatar, name, x, y });
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
    this.safeEmit("player:move", { x: rx, y: ry });
  }

  sendMessage(text: string, sender: string) {
    this.safeEmit("chat:message", { text, sender });
  }

  sendGoal(side: "left" | "right") {
    this.safeEmit("goal:scored", { side });
  }

  sendBallUpdate(x: number, y: number, vx: number, vy: number) {
    this.safeEmit("ball:update", { x, y, vx, vy });
  }

  on<E extends keyof NetworkEvents>(event: E, callback: NetworkEvents[E]) {
    const evtStr = event as string;
    if (!this.listeners[evtStr]) {
      this.listeners[evtStr] = [];
    }
    // Avoid double registering identical callbacks
    if (!this.listeners[evtStr].includes(callback)) {
      this.listeners[evtStr].push(callback);
      if (this.socket) {
        this.socket.on(evtStr, callback as (...args: unknown[]) => void);
      }
    }
  }

  off<E extends keyof NetworkEvents>(event: E, callback: NetworkEvents[E]) {
    const evtStr = event as string;
    if (this.listeners[evtStr]) {
      this.listeners[evtStr] = this.listeners[evtStr].filter((cb) => cb !== callback);
    }
    if (this.socket) {
      this.socket.off(evtStr, callback as (...args: unknown[]) => void);
    }
  }

  get id(): string | undefined {
    return this.socket?.id;
  }
}

export const networkService = new NetworkService();
export type { PlayerData };
