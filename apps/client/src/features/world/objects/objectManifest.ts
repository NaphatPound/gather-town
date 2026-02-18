import type {
  ObjectManifest,
  MapObjectsFile,
  ResolvedMapObject,
} from "./types";

let manifestCache: ObjectManifest | null = null;
let placementsCache: MapObjectsFile | null = null;

export async function fetchObjectManifest(): Promise<ObjectManifest> {
  if (manifestCache) return manifestCache;
  const res = await fetch("/data/object_manifest.json");
  manifestCache = await res.json();
  return manifestCache!;
}

export async function fetchMapObjects(): Promise<MapObjectsFile> {
  if (placementsCache) return placementsCache;
  const res = await fetch("/data/map_objects.json");
  placementsCache = await res.json();
  return placementsCache!;
}

export async function resolveMapObjects(): Promise<ResolvedMapObject[]> {
  const [manifest, mapObjects] = await Promise.all([
    fetchObjectManifest(),
    fetchMapObjects(),
  ]);

  const objectMap = new Map(manifest.objects.map((o) => [o.id, o]));
  const resolved: ResolvedMapObject[] = [];

  for (const placement of mapObjects.placements) {
    const def = objectMap.get(placement.objectId);
    if (!def) {
      console.warn(`Unknown objectId: ${placement.objectId}`);
      continue;
    }
    resolved.push({
      placementId: placement.id,
      def,
      tileX: placement.tileX,
      tileY: placement.tileY,
      interactionData: placement.interactionData,
    });
  }

  return resolved;
}
