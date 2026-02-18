import Phaser from "phaser";
import type { PixelArtDef } from "./types";

const TILE_SIZE = 32;

type DrawFn = (gfx: Phaser.GameObjects.Graphics, colors: Record<string, number>) => void;

function hexToNum(hex: string): number {
  return parseInt(hex.replace("#", ""), 16);
}

function fill(gfx: Phaser.GameObjects.Graphics, color: number, x: number, y: number, w: number, h: number) {
  gfx.fillStyle(color);
  gfx.fillRect(x, y, w, h);
}

const drawFunctions: Record<string, DrawFn> = {
  desk(gfx, c) {
    fill(gfx, c.top, 2, 8, 28, 4);
    fill(gfx, c.surface, 4, 9, 24, 2);
    fill(gfx, c.legs, 4, 12, 3, 16);
    fill(gfx, c.legs, 25, 12, 3, 16);
    fill(gfx, c.legs, 7, 20, 18, 2);
  },

  chair(gfx, c) {
    fill(gfx, c.back, 10, 4, 12, 10);
    fill(gfx, c.back, 12, 2, 8, 2);
    fill(gfx, c.seat, 8, 14, 16, 6);
    fill(gfx, c.legs, 10, 20, 2, 8);
    fill(gfx, c.legs, 20, 20, 2, 8);
    fill(gfx, c.legs, 8, 26, 16, 2);
  },

  bookshelf(gfx, c) {
    fill(gfx, c.frame, 2, 2, 28, 28);
    fill(gfx, c.shelf, 4, 4, 24, 2);
    fill(gfx, c.shelf, 4, 12, 24, 2);
    fill(gfx, c.shelf, 4, 20, 24, 2);
    fill(gfx, c.shelf, 4, 28, 24, 2);
    fill(gfx, c.books1, 5, 6, 4, 6);
    fill(gfx, c.books2, 10, 6, 3, 6);
    fill(gfx, c.books3, 14, 7, 5, 5);
    fill(gfx, c.books1, 20, 6, 3, 6);
    fill(gfx, c.books2, 24, 6, 3, 6);
    fill(gfx, c.books3, 5, 14, 5, 6);
    fill(gfx, c.books1, 11, 15, 4, 5);
    fill(gfx, c.books2, 16, 14, 3, 6);
    fill(gfx, c.books3, 21, 14, 6, 6);
    fill(gfx, c.books2, 5, 22, 6, 6);
    fill(gfx, c.books1, 12, 23, 4, 5);
    fill(gfx, c.books3, 18, 22, 4, 6);
    fill(gfx, c.books1, 23, 22, 4, 6);
  },

  sign(gfx, c) {
    fill(gfx, c.post, 14, 16, 4, 14);
    fill(gfx, c.board, 4, 2, 24, 16);
    fill(gfx, c.post, 4, 2, 24, 2);
    fill(gfx, c.post, 4, 16, 24, 2);
    fill(gfx, c.post, 4, 2, 2, 16);
    fill(gfx, c.post, 26, 2, 2, 16);
    fill(gfx, c.text, 8, 6, 16, 2);
    fill(gfx, c.text, 10, 10, 12, 2);
    fill(gfx, c.text, 8, 14, 14, 1);
  },

  monitor(gfx, c) {
    fill(gfx, c.frame, 4, 2, 24, 18);
    fill(gfx, c.screen, 6, 4, 20, 14);
    fill(gfx, c.pixel, 8, 6, 8, 2);
    fill(gfx, c.pixel, 8, 10, 12, 2);
    fill(gfx, c.pixel, 8, 14, 6, 2);
    fill(gfx, c.stand, 13, 20, 6, 4);
    fill(gfx, c.stand, 10, 24, 12, 3);
  },

  tv(gfx, c) {
    fill(gfx, c.frame, 1, 4, 30, 22);
    fill(gfx, c.screen, 3, 6, 26, 18);
    fill(gfx, 0x37474f, 5, 8, 10, 6);
    fill(gfx, c.led, 15, 26, 2, 2);
  },

  plant(gfx, c) {
    fill(gfx, c.pot, 10, 18, 12, 10);
    fill(gfx, c.potRim, 8, 16, 16, 3);
    fill(gfx, c.soil, 11, 17, 10, 2);
    fill(gfx, c.leaf, 13, 4, 6, 4);
    fill(gfx, c.leaf, 10, 8, 12, 4);
    fill(gfx, c.leaf, 8, 10, 16, 4);
    fill(gfx, c.leaf, 12, 14, 8, 3);
    fill(gfx, c.leafDark, 11, 9, 3, 3);
    fill(gfx, c.leafDark, 18, 10, 4, 3);
    fill(gfx, c.leafDark, 14, 5, 2, 3);
  },

  lamp(gfx, c) {
    fill(gfx, c.shade, 8, 2, 16, 10);
    fill(gfx, c.glow, 12, 4, 8, 6);
    fill(gfx, c.pole, 15, 12, 2, 14);
    fill(gfx, c.base, 10, 26, 12, 3);
    fill(gfx, c.base, 12, 24, 8, 2);
  },
};

export function generateObjectTexture(
  scene: Phaser.Scene,
  textureKey: string,
  pixelArt: PixelArtDef,
  width: number,
  height: number
): void {
  const pxW = width * TILE_SIZE;
  const pxH = height * TILE_SIZE;

  // Convert string hex colors to numeric
  const numColors: Record<string, number> = {};
  for (const [k, v] of Object.entries(pixelArt.colors)) {
    numColors[k] = hexToNum(v);
  }

  const gfx = scene.add.graphics();
  const drawFn = drawFunctions[pixelArt.shape];
  if (drawFn) {
    drawFn(gfx, numColors);
  } else {
    gfx.fillStyle(0xff00ff);
    gfx.fillRect(2, 2, pxW - 4, pxH - 4);
  }

  gfx.generateTexture(textureKey, pxW, pxH);
  gfx.destroy();
}
