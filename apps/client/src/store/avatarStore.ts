import { create } from "zustand";
import { eventBus, Events } from "../core/events/EventBus";

interface AvatarStoreState {
  body: string;
  outfit: string;
  hair: string;
  accessory: string;
  setPart: (category: string, itemId: string) => void;
}

export const useAvatarStore = create<AvatarStoreState>((set, get) => ({
  body: "body_light",
  outfit: "outfit_tshirt_blue",
  hair: "hair_short_black",
  accessory: "acc_none",

  setPart: (category: string, itemId: string) => {
    set({ [category]: itemId } as any);
    eventBus.emit(Events.AVATAR_CHANGED, { ...get(), [category]: itemId });
  },
}));
