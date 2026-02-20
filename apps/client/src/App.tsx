import { useState, useEffect, useRef } from "react";
import CharacterCreator from "./features/avatar/components/CharacterCreator";
import GameView from "./features/world/GameView";
import { eventBus, Events } from "./core/events/EventBus";

type AppView = "creator" | "world";

export default function App() {
  const [view, setView] = useState<AppView>("creator");
  const [avatarDataURL, setAvatarDataURL] = useState("");
  const [avatarConfig, setAvatarConfig] = useState<{ body: string; outfit: string; hair: string; accessory: string } | null>(null);
  const [playerName, setPlayerName] = useState("Guest");

  useEffect(() => {
    const unsub = eventBus.on(Events.ENTER_WORLD, (data: { avatarDataURL: string; avatarConfig: { body: string; outfit: string; hair: string; accessory: string }; playerName: string }) => {
      setAvatarDataURL(data.avatarDataURL);
      setAvatarConfig(data.avatarConfig);
      setPlayerName(data.playerName);
      setView("world");
    });
    return unsub;
  }, []);

  if (view === "world" && avatarDataURL && avatarConfig) {
    return (
      <GameView
        avatarDataURL={avatarDataURL}
        avatarConfig={avatarConfig}
        playerName={playerName}
        onBack={() => setView("creator")}
      />
    );
  }

  return <CharacterCreator />;
}
