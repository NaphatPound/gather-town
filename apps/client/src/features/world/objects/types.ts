// --- Object Manifest (catalog) ---

export interface PixelArtDef {
  shape: string; // "desk" | "chair" | "bookshelf" | "sign" | "board" | "monitor" | "tv" | "plant" | "lamp"
  colors: Record<string, string>;
}

export interface ObjectDef {
  id: string;
  name: string;
  category: "furniture" | "sign" | "screen" | "decoration";
  width: number;  // tiles
  height: number; // tiles
  solid: boolean;
  interactionType?: "note" | "link" | "image";
  pixelArt: PixelArtDef;
}

export interface ObjectManifest {
  objects: ObjectDef[];
}

// --- Map Placements ---

export interface InteractionData {
  title?: string;
  content?: string;
  url?: string;
  imageUrl?: string;
}

export interface ObjectPlacement {
  id: string;
  objectId: string;
  tileX: number;
  tileY: number;
  interactionData?: InteractionData;
}

export interface MapObjectsFile {
  placements: ObjectPlacement[];
}

// --- Resolved (catalog + placement merged) ---

export interface ResolvedMapObject {
  placementId: string;
  def: ObjectDef;
  tileX: number;
  tileY: number;
  interactionData?: InteractionData;
}
