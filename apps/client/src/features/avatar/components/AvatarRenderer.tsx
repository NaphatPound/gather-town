import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { useAvatarStore } from "../../../store/avatarStore";
import { fetchManifest, getItemById } from "../logic";
import type { AvatarManifest } from "../logic";

const SPRITE_SIZE = 32;
const DISPLAY_SCALE = 6;
const CANVAS_SIZE = SPRITE_SIZE * DISPLAY_SCALE;

export interface AvatarRendererHandle {
  getCanvas: () => HTMLCanvasElement | null;
  getDataURL: () => string;
}

function drawPixelBody(
  ctx: CanvasRenderingContext2D,
  color: string,
  s: number
) {
  ctx.fillStyle = color;
  // Head (10x10 centered)
  ctx.fillRect(11 * s, 4 * s, 10 * s, 10 * s);
  // Neck
  ctx.fillRect(14 * s, 14 * s, 4 * s, 2 * s);
  // Torso
  ctx.fillRect(10 * s, 16 * s, 12 * s, 10 * s);
  // Left arm
  ctx.fillRect(7 * s, 16 * s, 3 * s, 8 * s);
  // Right arm
  ctx.fillRect(22 * s, 16 * s, 3 * s, 8 * s);
  // Left leg
  ctx.fillRect(11 * s, 26 * s, 4 * s, 6 * s);
  // Right leg
  ctx.fillRect(17 * s, 26 * s, 4 * s, 6 * s);

  // Eyes
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(13 * s, 8 * s, 2 * s, 2 * s);
  ctx.fillRect(17 * s, 8 * s, 2 * s, 2 * s);
  // Mouth
  ctx.fillRect(14 * s, 11 * s, 4 * s, 1 * s);
}

function drawPixelOutfit(
  ctx: CanvasRenderingContext2D,
  color: string,
  type: string,
  s: number
) {
  if (color === "transparent") return;
  ctx.fillStyle = color;

  // Torso covering
  ctx.fillRect(10 * s, 16 * s, 12 * s, 10 * s);
  // Sleeves
  ctx.fillRect(7 * s, 16 * s, 3 * s, 6 * s);
  ctx.fillRect(22 * s, 16 * s, 3 * s, 6 * s);

  if (type === "hoodie") {
    // Hood outline on neck
    ctx.fillRect(12 * s, 14 * s, 8 * s, 2 * s);
    // Pocket
    ctx.fillStyle = shadeColor(color, -20);
    ctx.fillRect(13 * s, 22 * s, 6 * s, 3 * s);
  } else if (type === "suit") {
    // Collar
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(14 * s, 16 * s, 4 * s, 2 * s);
    // Tie
    ctx.fillStyle = "#C0392B";
    ctx.fillRect(15 * s, 18 * s, 2 * s, 4 * s);
  }
}

function drawPixelHair(
  ctx: CanvasRenderingContext2D,
  color: string,
  type: string,
  s: number
) {
  if (color === "transparent" || type === "none") return;
  ctx.fillStyle = color;

  // Top hair
  ctx.fillRect(10 * s, 2 * s, 12 * s, 4 * s);

  if (type === "short") {
    ctx.fillRect(10 * s, 4 * s, 2 * s, 4 * s);
    ctx.fillRect(20 * s, 4 * s, 2 * s, 4 * s);
  } else if (type === "long") {
    ctx.fillRect(9 * s, 4 * s, 2 * s, 12 * s);
    ctx.fillRect(21 * s, 4 * s, 2 * s, 12 * s);
    ctx.fillRect(10 * s, 2 * s, 12 * s, 3 * s);
  } else if (type === "spiky") {
    ctx.fillRect(10 * s, 1 * s, 3 * s, 3 * s);
    ctx.fillRect(14 * s, 0 * s, 3 * s, 4 * s);
    ctx.fillRect(19 * s, 1 * s, 3 * s, 3 * s);
  }
}

function drawPixelAccessory(
  ctx: CanvasRenderingContext2D,
  color: string,
  type: string,
  s: number
) {
  if (color === "transparent" || type === "none") return;
  ctx.fillStyle = color;

  if (type === "glasses") {
    ctx.fillRect(12 * s, 7 * s, 3 * s, 3 * s);
    ctx.fillRect(17 * s, 7 * s, 3 * s, 3 * s);
    ctx.fillRect(15 * s, 8 * s, 2 * s, 1 * s);
    // Clear inner lens
    ctx.fillStyle = "#E8F4FD";
    ctx.fillRect(13 * s, 8 * s, 1 * s, 1 * s);
    ctx.fillRect(18 * s, 8 * s, 1 * s, 1 * s);
  } else if (type === "sunglasses") {
    ctx.fillRect(11 * s, 7 * s, 4 * s, 3 * s);
    ctx.fillRect(17 * s, 7 * s, 4 * s, 3 * s);
    ctx.fillRect(15 * s, 8 * s, 2 * s, 1 * s);
  } else if (type === "hat") {
    ctx.fillRect(9 * s, 2 * s, 14 * s, 3 * s);
    ctx.fillRect(11 * s, 0 * s, 10 * s, 2 * s);
  }
}

function shadeColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + percent));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + percent));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

const AvatarRenderer = forwardRef<AvatarRendererHandle>((_, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const manifestRef = useRef<AvatarManifest | null>(null);
  const { body, outfit, hair, accessory } = useAvatarStore();

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    getDataURL: () => canvasRef.current?.toDataURL("image/png") ?? "",
  }));

  useEffect(() => {
    let cancelled = false;

    async function render() {
      if (!manifestRef.current) {
        manifestRef.current = await fetchManifest();
      }
      if (cancelled) return;

      const manifest = manifestRef.current;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      const s = DISPLAY_SCALE;

      // Layer 0: Body
      const bodyItem = getItemById(manifest, "body", body);
      if (bodyItem) drawPixelBody(ctx, bodyItem.color, s);

      // Layer 1: Outfit
      const outfitItem = getItemById(manifest, "outfit", outfit);
      if (outfitItem) drawPixelOutfit(ctx, outfitItem.color, outfitItem.type ?? "tshirt", s);

      // Layer 2: Hair
      const hairItem = getItemById(manifest, "hair", hair);
      if (hairItem) drawPixelHair(ctx, hairItem.color, hairItem.type ?? "short", s);

      // Layer 3: Accessories
      const accItem = getItemById(manifest, "accessory", accessory);
      if (accItem) drawPixelAccessory(ctx, accItem.color, accItem.type ?? "none", s);
    }

    render();
    return () => { cancelled = true; };
  }, [body, outfit, hair, accessory]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      className="border-2 border-gray-600 rounded-lg bg-gray-800"
      style={{ imageRendering: "pixelated" }}
    />
  );
});

AvatarRenderer.displayName = "AvatarRenderer";
export default AvatarRenderer;
