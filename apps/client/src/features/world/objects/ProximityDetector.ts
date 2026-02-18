import type { ResolvedMapObject } from "./types";

const INTERACTION_RANGE = 1.5; // tiles

export interface ProximityResult {
  object: ResolvedMapObject;
  distance: number;
}

export function findNearestInteractable(
  playerTileX: number,
  playerTileY: number,
  objects: ResolvedMapObject[]
): ProximityResult | null {
  let nearest: ProximityResult | null = null;

  for (const obj of objects) {
    if (!obj.def.interactionType) continue;

    // Distance from player to object center
    const dx = playerTileX - (obj.tileX + obj.def.width / 2);
    const dy = playerTileY - (obj.tileY + obj.def.height / 2);
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= INTERACTION_RANGE) {
      if (!nearest || distance < nearest.distance) {
        nearest = { object: obj, distance };
      }
    }
  }

  return nearest;
}
