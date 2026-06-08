import { PROFILE_MEDIA_BUCKET } from "@/src/lib/profile-media";

export type SupabaseStorageRef = {
  bucket: string;
  path: string;
};

const STORAGE_PATH_IN_URL =
  /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)/;

/** Erkennt Supabase-Storage-Pfade aus URL oder Rohpfad (z. B. NPC-Portraits). */
export function parseSupabaseStorageRef(raw: string | null | undefined): SupabaseStorageRef | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const pathname = new URL(trimmed).pathname;
      const match = pathname.match(STORAGE_PATH_IN_URL);
      if (!match) return null;
      return {
        bucket: match[1],
        path: decodeURIComponent(match[2]),
      };
    } catch {
      return null;
    }
  }

  if (trimmed.startsWith("/storage/")) {
    const match = trimmed.match(STORAGE_PATH_IN_URL);
    if (!match) return null;
    return {
      bucket: match[1],
      path: decodeURIComponent(match[2]),
    };
  }

  // Rohpfad im profile-media-Bucket (DALL·E-Uploads, Charakterportraits)
  if (!trimmed.startsWith("/") && trimmed.includes("/") && !trimmed.includes("://")) {
    return { bucket: PROFILE_MEDIA_BUCKET, path: trimmed };
  }

  return null;
}

export function isSafeStorageRef(ref: SupabaseStorageRef): boolean {
  if (!ref.bucket || !ref.path) return false;
  if (ref.path.includes("..") || ref.path.startsWith("/")) return false;
  if (ref.bucket !== PROFILE_MEDIA_BUCKET) return false;
  return true;
}
