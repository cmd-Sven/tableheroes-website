import { PROFILE_MEDIA_BUCKET } from "@/src/lib/profile-media";

/** Objektpfad im Bucket aus einer öffentlichen Supabase-URL. */
export function extractProfileMediaObjectPath(publicUrl: string): string | null {
  const trimmed = publicUrl.trim();
  if (!trimmed) return null;

  const marker = `/${PROFILE_MEDIA_BUCKET}/`;
  const idx = trimmed.indexOf(marker);
  if (idx === -1) return null;

  let path = trimmed.slice(idx + marker.length);
  const query = path.indexOf("?");
  if (query !== -1) path = path.slice(0, query);
  const hash = path.indexOf("#");
  if (hash !== -1) path = path.slice(0, hash);

  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

export type NpcPortraitStorageKind = "ai-generated" | "user-upload";

/**
 * NSC-Portraits im profile-media-Bucket:
 * - KI: `{userId}/npcs/{worldId}/portrait-{ts}.webp`
 * - Upload: `{userId}/npcs/{worldId}/{segment}/portrait-{ts}.webp`
 */
export function classifyProfileMediaNpcPortrait(
  publicUrl: string,
  userId: string,
): NpcPortraitStorageKind | null {
  const path = extractProfileMediaObjectPath(publicUrl);
  if (!path) return null;

  const parts = path.split("/").filter(Boolean);
  if (parts.length < 4) return null;
  if (parts[0] !== userId) return null;
  if (parts[1] !== "npcs") return null;

  const fileName = parts[parts.length - 1] ?? "";
  if (!fileName.startsWith("portrait-")) return null;

  if (parts.length === 4) return "ai-generated";
  if (parts.length >= 5) return "user-upload";
  return null;
}

/** Bestarium-Portraits: `{userId}/bestarium/{worldId}/{segment}/portrait-{ts}.webp` */
export function classifyProfileMediaBestariumPortrait(
  publicUrl: string,
  userId: string,
): NpcPortraitStorageKind | null {
  const path = extractProfileMediaObjectPath(publicUrl);
  if (!path) return null;

  const parts = path.split("/").filter(Boolean);
  if (parts.length < 4) return null;
  if (parts[0] !== userId) return null;
  if (parts[1] !== "bestarium") return null;

  const fileName = parts[parts.length - 1] ?? "";
  if (!fileName.startsWith("portrait-")) return null;

  if (parts.length === 4) return "ai-generated";
  if (parts.length >= 5) return "user-upload";
  return null;
}
