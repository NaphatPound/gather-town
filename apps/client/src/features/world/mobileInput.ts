/**
 * Shared mobile input state.
 * React touch‐control components write to this object;
 * Phaser's MainScene reads from it every frame.
 */
export const mobileInput = {
    up: false,
    down: false,
    left: false,
    right: false,
    sprint: false,
    shoot: false, // true while held → triggers charge kick
};
