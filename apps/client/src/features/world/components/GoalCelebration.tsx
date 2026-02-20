import { useState, useEffect, useRef, useCallback } from "react";
import { networkService } from "../../../core/network/NetworkService";

/**
 * Full-screen "GOAL!" celebration overlay with animated text and sound.
 * Triggered by the `goal:scored` network event.
 */
export default function GoalCelebration() {
    const [visible, setVisible] = useState(false);
    const [side, setSide] = useState<"left" | "right">("left");
    const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const audioCtxRef = useRef<AudioContext | null>(null);

    // Generate a celebratory "GOAL!" sound using Web Audio API
    const playGoalSound = useCallback(() => {
        try {
            if (!audioCtxRef.current) {
                audioCtxRef.current = new AudioContext();
            }
            const ctx = audioCtxRef.current;

            // Three-note ascending fanfare
            const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
            const startTime = ctx.currentTime;

            for (let i = 0; i < notes.length; i++) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "square";
                osc.frequency.value = notes[i];
                osc.connect(gain);
                gain.connect(ctx.destination);

                const noteStart = startTime + i * 0.15;
                gain.gain.setValueAtTime(0.18, noteStart);
                gain.gain.exponentialRampToValueAtTime(0.01, noteStart + 0.4);

                osc.start(noteStart);
                osc.stop(noteStart + 0.4);
            }

            // Long triumphant chord
            const chordFreqs = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
            const chordStart = startTime + 0.45;
            for (const freq of chordFreqs) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "triangle";
                osc.frequency.value = freq;
                osc.connect(gain);
                gain.connect(ctx.destination);
                gain.gain.setValueAtTime(0.12, chordStart);
                gain.gain.exponentialRampToValueAtTime(0.001, chordStart + 1.2);
                osc.start(chordStart);
                osc.stop(chordStart + 1.2);
            }
        } catch {
            // Audio may fail silently — that's fine
        }
    }, []);

    useEffect(() => {
        const handleGoal = (data: { side: "left" | "right" }) => {
            setSide(data.side);
            setVisible(true);
            playGoalSound();

            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => setVisible(false), 2000);
        };

        networkService.on("goal:scored", handleGoal);
        return () => {
            networkService.off("goal:scored", handleGoal);
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [playGoalSound]);

    if (!visible) return null;

    const color = side === "left" ? "#4488ff" : "#ff4444";
    const teamLabel = side === "left" ? "← LEFT SCORES!" : "RIGHT SCORES! →";

    return (
        <div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center pointer-events-none select-none"
            style={{ animation: "goalFadeIn 0.3s ease-out" }}
        >
            {/* Background flash */}
            <div
                className="absolute inset-0"
                style={{
                    background: `radial-gradient(circle, ${color}33 0%, transparent 70%)`,
                    animation: "goalPulse 0.5s ease-in-out 3",
                }}
            />

            {/* GOAL text */}
            <div
                style={{
                    fontSize: "clamp(48px, 12vw, 120px)",
                    fontFamily: '"Press Start 2P", "Courier New", monospace',
                    fontWeight: "bold",
                    color: "#ffffff",
                    textShadow: `0 0 20px ${color}, 0 0 40px ${color}, 0 0 80px ${color}, 0 4px 0 #000`,
                    letterSpacing: "8px",
                    animation: "goalBounce 0.6s ease-out",
                }}
            >
                GOAL!
            </div>

            {/* Team label */}
            <div
                style={{
                    fontSize: "clamp(14px, 3vw, 24px)",
                    fontFamily: '"Press Start 2P", "Courier New", monospace',
                    color: color,
                    marginTop: "12px",
                    textShadow: `0 0 10px ${color}, 0 2px 0 #000`,
                    animation: "goalSlideUp 0.4s ease-out 0.2s both",
                }}
            >
                {teamLabel}
            </div>

            {/* CSS keyframes */}
            <style>{`
        @keyframes goalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes goalBounce {
          0% { transform: scale(0.3) translateY(40px); opacity: 0; }
          50% { transform: scale(1.15) translateY(-10px); opacity: 1; }
          70% { transform: scale(0.95) translateY(0); }
          100% { transform: scale(1) translateY(0); }
        }
        @keyframes goalPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
        @keyframes goalSlideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
        </div>
    );
}
