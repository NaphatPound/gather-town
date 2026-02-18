import { useEffect, useRef, useCallback } from "react";
import Phaser from "phaser";
import MainScene from "./MainScene";
import InteractionOverlay from "./components/InteractionOverlay";
import { networkService } from "../../core/network/NetworkService";

interface GameViewProps {
  avatarDataURL: string;
  playerName: string;
  onBack?: () => void;
}

export default function GameView({ avatarDataURL, playerName, onBack }: GameViewProps) {
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

    const scene = new MainScene(avatarDataURL, playerName);

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 640,
      height: 480,
      parent: containerRef.current,
      backgroundColor: "#1a1a2e",
      pixelArt: true,
      scene: scene,
      scale: {
        mode: Phaser.Scale.FIT,
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
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 gap-4">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
        >
          Back to Editor
        </button>
        <h2 className="text-lg font-semibold text-white">Pixel World</h2>
        <span className="text-sm text-gray-400">WASD/Arrows to move · X to interact</span>
        <button
          onClick={toggleFullscreen}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
        >
          Fullscreen
        </button>
      </div>
      <div ref={wrapperRef} className="relative bg-gray-900">
        <div
          ref={containerRef}
          className="border-2 border-gray-700 rounded-lg overflow-hidden"
        />
        <InteractionOverlay />
      </div>
    </div>
  );
}
