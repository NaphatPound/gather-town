import { useState, useEffect, useRef } from "react";
import CharacterCreator from "./features/avatar/components/CharacterCreator";
import GameView from "./features/world/GameView";
import { eventBus, Events } from "./core/events/EventBus";

type AppView = "creator" | "world";

export default function App() {
  const [view, setView] = useState<AppView>("creator");
  const [avatarDataURL, setAvatarDataURL] = useState("");
  const [playerName, setPlayerName] = useState("Guest");

  useEffect(() => {
    const unsub = eventBus.on(Events.ENTER_WORLD, (data: { avatarDataURL: string; playerName: string }) => {
      setAvatarDataURL(data.avatarDataURL);
      setPlayerName(data.playerName);
      setView("world");
    });
    return unsub;
  }, []);

  if (view === "world" && avatarDataURL) {
    return (
      <GameView
        avatarDataURL={avatarDataURL}
        playerName={playerName}
        onBack={() => setView("creator")}
      />
    );
  }

  return <CharacterCreator />;
}
