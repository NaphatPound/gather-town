import {
  drawPixelBody,
  drawPixelOutfit,
  drawPixelHair,
  drawPixelAccessory,
  type LimbOffsets,
  NO_OFFSETS,
} from "../avatar/drawAvatar";
import { fetchManifest, getItemById } from "../avatar/logic";

const FRAME_SIZE = 32;
const TOTAL_FRAMES = 12; // 1 idle + 4 walk + 4 run + 3 kick

// Frame offset definitions for each animation
const FRAME_OFFSETS: LimbOffsets[] = [
  // 0: idle
  NO_OFFSETS,

  // 1-4: walk (legs ±1px Y, arms ±1px Y alternating)
  { leftArmY: -1, rightArmY: 1, leftLegY: 1, rightLegY: -1, leftLegX: 0, rightLegX: 0 },
  { leftArmY: 0, rightArmY: 0, leftLegY: 0, rightLegY: 0, leftLegX: 0, rightLegX: 0 },
  { leftArmY: 1, rightArmY: -1, leftLegY: -1, rightLegY: 1, leftLegX: 0, rightLegX: 0 },
  { leftArmY: 0, rightArmY: 0, leftLegY: 0, rightLegY: 0, leftLegX: 0, rightLegX: 0 },

  // 5-8: run (legs ±2px Y, arms ±2px Y, more exaggerated)
  { leftArmY: -2, rightArmY: 2, leftLegY: 2, rightLegY: -2, leftLegX: 0, rightLegX: 0 },
  { leftArmY: 0, rightArmY: 0, leftLegY: 0, rightLegY: 0, leftLegX: 0, rightLegX: 0 },
  { leftArmY: 2, rightArmY: -2, leftLegY: -2, rightLegY: 2, leftLegX: 0, rightLegX: 0 },
  { leftArmY: 0, rightArmY: 0, leftLegY: 0, rightLegY: 0, leftLegX: 0, rightLegX: 0 },

  // 9-11: kick (wind-up → leg extended → return)
  { leftArmY: 0, rightArmY: -1, leftLegY: 0, rightLegY: 1, leftLegX: 0, rightLegX: 0 },   // wind-up
  { leftArmY: 1, rightArmY: -2, leftLegY: 0, rightLegY: -2, leftLegX: 0, rightLegX: 3 },  // leg extended
  { leftArmY: 0, rightArmY: 0, leftLegY: 0, rightLegY: 0, leftLegX: 0, rightLegX: 0 },    // return
];

export async function generateSpriteSheet(avatarConfig: { body: string; outfit: string; hair: string; accessory: string }): Promise<HTMLCanvasElement> {
  const manifest = await fetchManifest();
  const { body, outfit, hair, accessory } = avatarConfig;

  const canvas = document.createElement("canvas");
  canvas.width = FRAME_SIZE * TOTAL_FRAMES;
  canvas.height = FRAME_SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  const s = 1; // 1:1 scale for 32×32 sprite

  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const offsets = FRAME_OFFSETS[i];
    ctx.save();
    ctx.translate(i * FRAME_SIZE, 0);

    // Layer 0: Body
    const bodyItem = getItemById(manifest, "body", body);
    if (bodyItem) drawPixelBody(ctx, bodyItem.color, s, offsets);

    // Layer 1: Outfit
    const outfitItem = getItemById(manifest, "outfit", outfit);
    if (outfitItem) drawPixelOutfit(ctx, outfitItem.color, outfitItem.type ?? "tshirt", s, offsets);

    // Layer 2: Hair
    const hairItem = getItemById(manifest, "hair", hair);
    if (hairItem) drawPixelHair(ctx, hairItem.color, hairItem.type ?? "short", s);

    // Layer 3: Accessories
    const accItem = getItemById(manifest, "accessory", accessory);
    if (accItem) drawPixelAccessory(ctx, accItem.color, accItem.type ?? "none", s);

    ctx.restore();
  }

  return canvas;
}

// Animation config for Phaser
export const ANIM_CONFIG = {
  idle: { start: 0, end: 0, frameRate: 1, repeat: -1 },
  walk: { start: 1, end: 4, frameRate: 8, repeat: -1 },
  run: { start: 5, end: 8, frameRate: 12, repeat: -1 },
  kick: { start: 9, end: 11, frameRate: 10, repeat: 0 },
} as const;
