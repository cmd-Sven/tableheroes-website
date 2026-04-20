import { createClient } from "@/src/lib/supabase/client";

export const PROFILE_MEDIA_BUCKET = "profile-media";
export const PROFILE_MEDIA_MAX_BYTES = 5 * 1024 * 1024;
export const PROFILE_MEDIA_ACCEPT_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/** Einige Browser/OS liefern bei JPG andere oder leere Types – für Upload immer normalisieren. */
const JPEG_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/x-citrix-jpeg",
]);

function extensionLooksLikeImage(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "webp";
}

export function contentTypeForImageUpload(file: File): string {
  const t = (file.type || "").toLowerCase().trim();
  if (JPEG_TYPES.has(t)) return "image/jpeg";
  if (t === "image/png") return "image/png";
  if (t === "image/webp") return "image/webp";
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

export function validateProfileImageFile(file: File): string | null {
  if (file.size > PROFILE_MEDIA_MAX_BYTES) {
    return "Die Datei ist zu groß (max. 5 MB).";
  }
  if (extensionLooksLikeImage(file)) return null;
  const t = (file.type || "").toLowerCase().trim();
  if (
    JPEG_TYPES.has(t) ||
    t === "image/png" ||
    t === "image/webp" ||
    (PROFILE_MEDIA_ACCEPT_MIME as readonly string[]).includes(t)
  ) {
    return null;
  }
  return "Nur JPEG-, PNG- oder WebP-Bilder sind erlaubt.";
}

function extensionFromMimeOrName(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && ["jpg", "jpeg", "png", "webp"].includes(fromName)) {
    return fromName === "jpg" ? "jpeg" : fromName;
  }
  const t = (file.type || "").toLowerCase().trim();
  if (JPEG_TYPES.has(t)) return "jpeg";
  if (t === "image/png") return "png";
  if (t === "image/webp") return "webp";
  return "jpeg";
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
  const contentType = contentTypeForImageUpload(file);

  const { error } = await supabase.storage
    .from(PROFILE_MEDIA_BUCKET)
    .upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType,
    });

  if (error) {
    const hint =
      /mime|not supported|invalid/i.test(error.message)
        ? " Prüfe im Supabase-Dashboard beim Bucket „profile-media“, ob „image/jpeg“ unter den erlaubten MIME-Typen steht (oder die Liste leeren)."
        : "";
    return { error: `${error.message}${hint}` };
  }

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

  const contentType = contentTypeForImageUpload(file);

  const { error } = await supabase.storage
    .from(PROFILE_MEDIA_BUCKET)
    .upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType,
    });

  if (error) {
    const hint =
      /mime|not supported|invalid/i.test(error.message)
        ? " Prüfe im Supabase-Dashboard beim Bucket „profile-media“, ob „image/jpeg“ unter den erlaubten MIME-Typen steht (oder die Liste leeren)."
        : "";
    return { error: `${error.message}${hint}` };
  }

  const { data } = supabase.storage.from(PROFILE_MEDIA_BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}
