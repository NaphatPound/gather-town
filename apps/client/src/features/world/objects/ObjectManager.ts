import Phaser from "phaser";
import { eventBus, Events } from "../../../core/events/EventBus";
import { resolveMapObjects } from "./objectManifest";
import { generateObjectTexture } from "./ObjectRenderer";
import { findNearestInteractable } from "./ProximityDetector";
import type { ResolvedMapObject } from "./types";

const TILE_SIZE = 32;

export default class ObjectManager {
  private scene: Phaser.Scene;
  private objects: ResolvedMapObject[] = [];
  private sprites: Map<string, Phaser.GameObjects.Image> = new Map();
  private nearObject: ResolvedMapObject | null = null;
  private xKey!: Phaser.Input.Keyboard.Key;
  private interacting = false;
  private ready = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  async init(): Promise<void> {
    try {
      this.objects = await resolveMapObjects();
    } catch (e) {
      console.error("Failed to load map objects:", e);
      return;
    }

    // Register X key
    this.xKey = this.scene.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.X
    );

    // Generate textures and place sprites
    for (const obj of this.objects) {
      const textureKey = `obj-${obj.def.id}`;
      if (!this.scene.textures.exists(textureKey)) {
        generateObjectTexture(
          this.scene,
          textureKey,
          obj.def.pixelArt,
          obj.def.width,
          obj.def.height
        );
      }

      const px = obj.tileX * TILE_SIZE + (obj.def.width * TILE_SIZE) / 2;
      const py = obj.tileY * TILE_SIZE + (obj.def.height * TILE_SIZE) / 2;
      const sprite = this.scene.add.image(px, py, textureKey);
      sprite.setDepth(5);
      this.sprites.set(obj.placementId, sprite);
    }

    // Listen for modal close
    eventBus.on(Events.OBJECT_INTERACTION_CLOSE, () => {
      this.interacting = false;
    });

    this.ready = true;
  }

  getSolidTiles(): Array<{ x: number; y: number }> {
    const tiles: Array<{ x: number; y: number }> = [];
    for (const obj of this.objects) {
      if (!obj.def.solid) continue;
      for (let dy = 0; dy < obj.def.height; dy++) {
        for (let dx = 0; dx < obj.def.width; dx++) {
          tiles.push({ x: obj.tileX + dx, y: obj.tileY + dy });
        }
      }
    }
    return tiles;
  }

  update(playerX: number, playerY: number): void {
    if (!this.ready || this.interacting) return;

    const playerTileX = playerX / TILE_SIZE;
    const playerTileY = playerY / TILE_SIZE;

    const result = findNearestInteractable(
      playerTileX,
      playerTileY,
      this.objects
    );

    const newNear = result?.object ?? null;

    // Proximity state changed
    if (newNear?.placementId !== this.nearObject?.placementId) {
      if (this.nearObject) {
        eventBus.emit(Events.OBJECT_PROXIMITY_EXIT);
      }
      if (newNear) {
        eventBus.emit(Events.OBJECT_PROXIMITY_ENTER, {
          name: newNear.def.name,
        });
      }
      this.nearObject = newNear;
    }

    // Handle X key press
    if (
      Phaser.Input.Keyboard.JustDown(this.xKey) &&
      this.nearObject &&
      this.nearObject.def.interactionType
    ) {
      this.interacting = true;
      eventBus.emit(Events.OBJECT_INTERACT, {
        type: this.nearObject.def.interactionType,
        name: this.nearObject.def.name,
        data: this.nearObject.interactionData ?? {},
      });
    }
  }
}
