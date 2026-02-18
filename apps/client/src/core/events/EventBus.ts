type EventCallback = (...args: any[]) => void;

class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => this.off(event, callback);
  }

  off(event: string, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event: string, ...args: any[]): void {
    this.listeners.get(event)?.forEach((cb) => cb(...args));
  }
}

export const eventBus = new EventBus();

export const Events = {
  AVATAR_CHANGED: "AVATAR_CHANGED",
  ENTER_WORLD: "ENTER_WORLD",
  OBJECT_PROXIMITY_ENTER: "OBJECT_PROXIMITY_ENTER",
  OBJECT_PROXIMITY_EXIT: "OBJECT_PROXIMITY_EXIT",
  OBJECT_INTERACT: "OBJECT_INTERACT",
  OBJECT_INTERACTION_CLOSE: "OBJECT_INTERACTION_CLOSE",
} as const;
