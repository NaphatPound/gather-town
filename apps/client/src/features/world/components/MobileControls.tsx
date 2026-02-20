import React, { useEffect, useState } from "react";
import { mobileInput } from "../mobileInput";

/**
 * On-screen touch controls for mobile:
 *  – D-pad (bottom-left)  → movement
 *  – Action buttons (bottom-right) → Sprint & Shoot
 *
 * Only rendered on touch-capable devices.
 */
export default function MobileControls() {
    const [isTouchDevice, setIsTouchDevice] = useState(false);

    useEffect(() => {
        const touch =
            "ontouchstart" in window ||
            navigator.maxTouchPoints > 0 ||
            window.matchMedia("(pointer: coarse)").matches;
        setIsTouchDevice(touch);
    }, []);

    if (!isTouchDevice) return null;

    // Helper: set a mobileInput key true on touch-start, false on touch-end
    const bind = (key: keyof typeof mobileInput) => ({
        onTouchStart: (e: React.TouchEvent) => {
            e.preventDefault();
            mobileInput[key] = true;
        },
        onTouchEnd: (e: React.TouchEvent) => {
            e.preventDefault();
            mobileInput[key] = false;
        },
        onTouchCancel: (e: React.TouchEvent) => {
            e.preventDefault();
            mobileInput[key] = false;
        },
    });

    const btnBase =
        "select-none touch-none flex items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 text-white active:bg-white/40 transition-colors";

    return (
        <>
            {/* ─── D-Pad (bottom-left) ─── */}
            <div
                className="fixed left-4 z-50 flex flex-col items-center gap-1"
                style={{ bottom: "clamp(16px, 4vh, 40px)" }}
            >
                {/* Up */}
                <button
                    {...bind("up")}
                    className={`${btnBase} w-14 h-14 text-2xl`}
                    aria-label="Move up"
                >
                    ▲
                </button>

                <div className="flex gap-1">
                    {/* Left */}
                    <button
                        {...bind("left")}
                        className={`${btnBase} w-14 h-14 text-2xl`}
                        aria-label="Move left"
                    >
                        ◀
                    </button>

                    {/* Spacer */}
                    <div className="w-14 h-14" />

                    {/* Right */}
                    <button
                        {...bind("right")}
                        className={`${btnBase} w-14 h-14 text-2xl`}
                        aria-label="Move right"
                    >
                        ▶
                    </button>
                </div>

                {/* Down */}
                <button
                    {...bind("down")}
                    className={`${btnBase} w-14 h-14 text-2xl`}
                    aria-label="Move down"
                >
                    ▼
                </button>
            </div>

            {/* ─── Action Buttons (bottom-right) ─── */}
            <div
                className="fixed right-4 z-50 flex flex-col items-center gap-3"
                style={{ bottom: "clamp(16px, 4vh, 40px)" }}
            >
                {/* Shoot / charge-kick (hold to charge) */}
                <button
                    {...bind("shoot")}
                    className={`${btnBase} w-16 h-16 text-xs font-bold bg-red-500/40 border-red-400/50 active:bg-red-500/60`}
                    aria-label="Shoot"
                >
                    ⚽<br />Shoot
                </button>

                {/* Sprint (hold) */}
                <button
                    {...bind("sprint")}
                    className={`${btnBase} w-16 h-16 text-xs font-bold bg-blue-500/40 border-blue-400/50 active:bg-blue-500/60`}
                    aria-label="Sprint"
                >
                    💨<br />Sprint
                </button>
            </div>
        </>
    );
}
