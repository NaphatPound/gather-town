import { useRef, useState } from "react";
import AvatarRenderer from "./AvatarRenderer";
import CategoryPanel from "./CategoryPanel";
import { eventBus, Events } from "../../../core/events/EventBus";
import { useAvatarStore } from "../../../store/avatarStore";
import type { AvatarRendererHandle } from "./AvatarRenderer";

interface CharacterCreatorProps {
  onEnterWorld?: () => void;
}

export default function CharacterCreator({ onEnterWorld }: CharacterCreatorProps) {
  const rendererRef = useRef<AvatarRendererHandle>(null);
  const [randomizing, setRandomizing] = useState(false);
  const [playerName, setPlayerName] = useState("");

  const handleEnterWorld = () => {
    if (rendererRef.current) {
      const dataURL = rendererRef.current.getDataURL();
      const name = playerName.trim() || "Guest";

      const { body, outfit, hair, accessory } = useAvatarStore.getState();

      eventBus.emit(Events.ENTER_WORLD, {
        avatarDataURL: dataURL,
        avatarConfig: { body, outfit, hair, accessory },
        playerName: name
      });
    }
    onEnterWorld?.();
  };

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Left: Avatar Preview */}
      <div className="flex flex-col items-center justify-center flex-1 gap-6 p-8">
        <h1 className="text-2xl font-bold text-white">Create Your Character</h1>
        <AvatarRenderer ref={rendererRef} />
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Enter your name"
          maxLength={16}
          className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-center text-sm focus:outline-none focus:border-indigo-500 w-48"
        />
        <button
          onClick={handleEnterWorld}
          className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-indigo-500/25"
        >
          Enter World
        </button>
      </div>

      {/* Right: Category Panel */}
      <div className="w-80 bg-gray-850 border-l border-gray-700 bg-gray-900/80">
        <CategoryPanel />
      </div>
    </div>
  );
}
