import { createClient } from "@/src/lib/supabase/client";

export const PROFILE_MEDIA_BUCKET = "profile-media";
export const PROFILE_MEDIA_MAX_BYTES = 5 * 1024 * 1024;
export const PROFILE_MEDIA_ACCEPT_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export function validateProfileImageFile(file: File): string | null {
  if (file.size > PROFILE_MEDIA_MAX_BYTES) {
    return "Die Datei ist zu groß (max. 5 MB).";
  }
  if (!PROFILE_MEDIA_ACCEPT_MIME.includes(file.type as (typeof PROFILE_MEDIA_ACCEPT_MIME)[number])) {
    return "Nur JPEG-, PNG- oder WebP-Bilder sind erlaubt.";
  }
  return null;
}

function extensionFromMimeOrName(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && ["jpg", "jpeg", "png", "webp"].includes(fromName)) {
    return fromName === "jpg" ? "jpeg" : fromName;
  }
  if (file.type === "image/jpeg") return "jpeg";
  if (file.type === "image/png") return "png";
  return "webp";
}

export async function uploadProfileMediaAsset(
  userId: string,
  kind: "avatar" | "banner",
  file: File,
): Promise<{ path: string; publicUrl: string } | { error: string }> {
  const err = validateProfileImageFile(file);
  if (err) return { error: err };

  const ext = extensionFromMimeOrName(file);
  const path = `${userId}/${kind}-${Date.now()}.${ext}`;
  const supabase = createClient();

  const { error } = await supabase.storage
    .from(PROFILE_MEDIA_BUCKET)
    .upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: file.type || `image/${ext}`,
    });

  if (error) return { error: error.message };

  const { data } = supabase.storage.from(PROFILE_MEDIA_BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

export async function removeProfileMediaAsset(
  storagePath: string | null | undefined,
): Promise<void> {
  if (!storagePath?.trim()) return;
  const supabase = createClient();
  await supabase.storage.from(PROFILE_MEDIA_BUCKET).remove([storagePath]);
}

/** Charakterportrait: gleicher Bucket, Pfad `{userId}/characters/{characterId}/portrait-{ts}.ext` oder vor Erstellung `…/new-{uuid}-{ts}.ext`. */
export async function uploadCharacterPortrait(
  file: File,
  options: { characterId?: string | null },
): Promise<{ path: string; publicUrl: string } | { error: string }> {
  const err = validateProfileImageFile(file);
  if (err) return { error: err };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return { error: "Nicht angemeldet." };

  const ext = extensionFromMimeOrName(file);
  const uid = user.id;
  const path = options.characterId?.trim()
    ? `${uid}/characters/${options.characterId}/portrait-${Date.now()}.${ext}`
    : `${uid}/characters/new-${crypto.randomUUID()}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(PROFILE_MEDIA_BUCKET)
    .upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: file.type || `image/${ext}`,
    });

  if (error) return { error: error.message };

  const { data } = supabase.storage.from(PROFILE_MEDIA_BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}
