import { useEffect, useRef, useCallback } from "react";
import Phaser from "phaser";
import MainScene from "./MainScene";
import InteractionOverlay from "./components/InteractionOverlay";
import ScoreBoard from "./components/ScoreBoard";
import ChatBox from "./components/ChatBox";
import MobileControls from "./components/MobileControls";
import GoalCelebration from "./components/GoalCelebration";
import { networkService } from "../../core/network/NetworkService";

interface GameViewProps {
  avatarDataURL: string;
  avatarConfig: { body: string; outfit: string; hair: string; accessory: string };
  playerName: string;
  onBack?: () => void;
}

export default function GameView({ avatarDataURL, avatarConfig, playerName, onBack }: GameViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  const toggleFullscreen = useCallback(() => {
    const el = wrapperRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen();
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    // Connect to multiplayer server before starting game
    networkService.connect();

    const scene = new MainScene(avatarDataURL, avatarConfig, playerName);

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: containerRef.current,
      backgroundColor: "#1a1a2e",
      pixelArt: true,
      scene: scene,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    return () => {
      networkService.disconnect();
      game.destroy(true);
      gameRef.current = null;
    };
  }, [avatarDataURL]);

  return (
    <div ref={wrapperRef} className="relative w-screen h-screen overflow-hidden bg-gray-900">
      {/* Full-screen game canvas */}
      <div
        ref={containerRef}
        className="absolute inset-0"
      />

      {/* Floating top bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-3 z-50 bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg border border-gray-700/50">
        <button
          onClick={onBack}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
        >
          Back to Editor
        </button>
        <h2 className="text-sm font-semibold text-white">Pixel World</h2>
        <span className="text-xs text-gray-400 hidden md:inline">WASD/Arrows to move · X to interact</span>
        <button
          onClick={toggleFullscreen}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
        >
          Fullscreen
        </button>
      </div>

      {/* Overlays */}
      <InteractionOverlay />
      <ScoreBoard />
      <ChatBox playerName={playerName} />
      <MobileControls />
      <GoalCelebration />
    </div>
  );
}
