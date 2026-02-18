export interface AvatarCategory {
  id: string;
  name: string;
  zIndex: number;
}

export interface AvatarItem {
  id: string;
  name: string;
  color: string;
  type?: string;
}

export interface AvatarManifest {
  categories: AvatarCategory[];
  items: Record<string, AvatarItem[]>;
}

export interface AvatarState {
  body: string;
  outfit: string;
  hair: string;
  accessory: string;
}

let manifestCache: AvatarManifest | null = null;

export async function fetchManifest(): Promise<AvatarManifest> {
  if (manifestCache) return manifestCache;
  const res = await fetch("/data/avatar_manifest.json");
  manifestCache = await res.json();
  return manifestCache!;
}

export function getItemById(
  manifest: AvatarManifest,
  category: string,
  id: string
): AvatarItem | undefined {
  return manifest.items[category]?.find((item) => item.id === id);
}
