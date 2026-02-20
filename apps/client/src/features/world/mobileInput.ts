/**
 * Shared mobile input state.
 * React touch‐control components write to this object;
 * Phaser's MainScene reads from it every frame.
 */
export const mobileInput = {
    // Analog joystick direction (-1 to 1 on each axis, 0 = centered)
    dirX: 0,
    dirY: 0,
    // Is joystick currently being touched
    active: false,
    // Action buttons
    sprint: false,
    shoot: false, // true while held → triggers charge kick
};
