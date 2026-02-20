import React, { useEffect, useState, useRef, useCallback } from "react";
import { mobileInput } from "../mobileInput";

const JOYSTICK_SIZE = 130;    // outer base diameter
const KNOB_SIZE = 52;         // inner thumb diameter
const MAX_OFFSET = (JOYSTICK_SIZE - KNOB_SIZE) / 2; // max knob displacement from center

/**
 * On-screen touch controls for mobile:
 *  – Analog joystick (bottom-left) → movement
 *  – Action buttons (bottom-right) → Sprint & Shoot
 *
 * Only rendered on touch-capable devices.
 */
export default function MobileControls() {
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const [knobX, setKnobX] = useState(0);
    const [knobY, setKnobY] = useState(0);

    const joystickRef = useRef<HTMLDivElement>(null);
    const touchIdRef = useRef<number | null>(null);
    const centerRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const touch =
            "ontouchstart" in window ||
            navigator.maxTouchPoints > 0 ||
            window.matchMedia("(pointer: coarse)").matches;
        setIsTouchDevice(touch);
    }, []);

    // ── Joystick touch handlers ──

    const handleJoystickStart = useCallback((e: React.TouchEvent) => {
        e.preventDefault();
        if (touchIdRef.current !== null) return; // already tracking a touch

        const touch = e.changedTouches[0];
        touchIdRef.current = touch.identifier;

        // Get the center of the joystick base
        const rect = joystickRef.current!.getBoundingClientRect();
        centerRef.current = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
        };

        updateKnob(touch.clientX, touch.clientY);
    }, []);

    const updateKnob = useCallback((clientX: number, clientY: number) => {
        let dx = clientX - centerRef.current.x;
        let dy = clientY - centerRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Clamp to max offset
        if (dist > MAX_OFFSET) {
            dx = (dx / dist) * MAX_OFFSET;
            dy = (dy / dist) * MAX_OFFSET;
        }

        setKnobX(dx);
        setKnobY(dy);

        // Normalize to -1..1
        const normX = dx / MAX_OFFSET;
        const normY = dy / MAX_OFFSET;

        // Apply small dead zone (15%)
        const magnitude = Math.sqrt(normX * normX + normY * normY);
        if (magnitude < 0.15) {
            mobileInput.dirX = 0;
            mobileInput.dirY = 0;
            mobileInput.active = false;
        } else {
            mobileInput.dirX = normX;
            mobileInput.dirY = normY;
            mobileInput.active = true;
        }
    }, []);

    const handleJoystickMove = useCallback((e: React.TouchEvent) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (touch.identifier === touchIdRef.current) {
                updateKnob(touch.clientX, touch.clientY);
                break;
            }
        }
    }, [updateKnob]);

    const handleJoystickEnd = useCallback((e: React.TouchEvent) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === touchIdRef.current) {
                touchIdRef.current = null;
                setKnobX(0);
                setKnobY(0);
                mobileInput.dirX = 0;
                mobileInput.dirY = 0;
                mobileInput.active = false;
                break;
            }
        }
    }, []);

    // ── Action button helper ──
    const bindAction = (key: "sprint" | "shoot") => ({
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

    if (!isTouchDevice) return null;

    const btnBase =
        "select-none touch-none flex items-center justify-center rounded-full text-white transition-colors";

    return (
        <>
            {/* ─── Analog Joystick (bottom-left) ─── */}
            <div
                ref={joystickRef}
                className="fixed z-50 select-none touch-none"
                style={{
                    left: 20,
                    bottom: "clamp(20px, 5vh, 50px)",
                    width: JOYSTICK_SIZE,
                    height: JOYSTICK_SIZE,
                }}
                onTouchStart={handleJoystickStart}
                onTouchMove={handleJoystickMove}
                onTouchEnd={handleJoystickEnd}
                onTouchCancel={handleJoystickEnd}
            >
                {/* Base circle */}
                <div
                    className="absolute inset-0 rounded-full border-2 border-white/30"
                    style={{
                        background: "radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)",
                        backdropFilter: "blur(4px)",
                    }}
                />

                {/* Knob / thumb */}
                <div
                    className="absolute rounded-full border-2 border-white/50 shadow-lg"
                    style={{
                        width: KNOB_SIZE,
                        height: KNOB_SIZE,
                        left: JOYSTICK_SIZE / 2 - KNOB_SIZE / 2 + knobX,
                        top: JOYSTICK_SIZE / 2 - KNOB_SIZE / 2 + knobY,
                        background: "radial-gradient(circle at 40% 35%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.15) 100%)",
                        transition: touchIdRef.current !== null ? "none" : "left 0.15s, top 0.15s",
                    }}
                />
            </div>

            {/* ─── Action Buttons (bottom-right) ─── */}
            <div
                className="fixed right-4 z-50 flex flex-col items-center gap-3"
                style={{ bottom: "clamp(20px, 5vh, 50px)" }}
            >
                {/* Shoot / charge-kick (hold to charge) */}
                <button
                    {...bindAction("shoot")}
                    className={`${btnBase} w-16 h-16 text-xs font-bold bg-red-500/40 border-2 border-red-400/50 active:bg-red-500/60`}
                    aria-label="Shoot"
                >
                    ⚽
                </button>

                {/* Sprint (hold) */}
                <button
                    {...bindAction("sprint")}
                    className={`${btnBase} w-16 h-16 text-xs font-bold bg-blue-500/40 border-2 border-blue-400/50 active:bg-blue-500/60`}
                    aria-label="Sprint"
                >
                    💨
                </button>
            </div>
        </>
    );
}
