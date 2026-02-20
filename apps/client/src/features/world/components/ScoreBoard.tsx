import { useState, useEffect, useRef } from "react";
import { networkService } from "../../../core/network/NetworkService";

export default function ScoreBoard() {
  const [leftScore, setLeftScore] = useState(0);
  const [rightScore, setRightScore] = useState(0);
  const [flash, setFlash] = useState<"left" | "right" | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    // Authoritative score from server (sent on join + after each goal)
    const handleScoreSync = (data: { left: number; right: number }) => {
      setLeftScore(data.left);
      setRightScore(data.right);
    };

    // Flash animation on goal
    const handleGoalScored = (data: { side: "left" | "right" }) => {
      setFlash(data.side);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setFlash(null), 800);
    };

    networkService.on("score:sync", handleScoreSync);
    networkService.on("goal:scored", handleGoalScored);

    return () => {
      networkService.off("score:sync", handleScoreSync);
      networkService.off("goal:scored", handleGoalScored);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none select-none">
      <div
        className="flex items-center gap-3 px-4 py-1.5 rounded-lg border border-gray-600"
        style={{
          background: "rgba(0,0,0,0.75)",
          fontFamily: '"Press Start 2P", "Courier New", monospace',
          fontSize: "14px",
          letterSpacing: "2px",
          transition: "background 0.2s",
        }}
      >
        <span
          className="text-blue-400 font-bold"
          style={{
            textShadow: flash === "left" ? "0 0 8px #4488ff, 0 0 16px #4488ff" : "none",
            transition: "text-shadow 0.3s",
          }}
        >
          LEFT
        </span>
        <span className="text-white tabular-nums">
          {leftScore}
        </span>
        <span className="text-gray-500">-</span>
        <span className="text-white tabular-nums">
          {rightScore}
        </span>
        <span
          className="text-red-400 font-bold"
          style={{
            textShadow: flash === "right" ? "0 0 8px #ff4444, 0 0 16px #ff4444" : "none",
            transition: "text-shadow 0.3s",
          }}
        >
          RIGHT
        </span>
      </div>
    </div>
  );
}

