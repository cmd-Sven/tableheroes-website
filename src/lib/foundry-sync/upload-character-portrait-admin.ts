import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PROFILE_MEDIA_BUCKET,
  PROFILE_MEDIA_MAX_BYTES,
  contentTypeForImageUpload,
  validateProfileImageFile,
} from "@/src/lib/profile-media";

function extensionFromMime(mime: string): string {
  const t = mime.toLowerCase();
  if (t.includes("png")) return "png";
  if (t.includes("webp")) return "webp";
  return "jpeg";
}

export async function uploadCharacterPortraitAdmin(
  supabase: SupabaseClient,
  args: {
    userId: string;
    characterId: string;
    file: File | Blob;
    fileName?: string;
  },
): Promise<{ path: string; publicUrl: string } | { error: string }> {
  const file =
    args.file instanceof File
      ? args.file
      : new File([args.file], args.fileName ?? "portrait.webp", {
          type: args.file.type || "image/webp",
        });

  if (file.size > PROFILE_MEDIA_MAX_BYTES) {
    return { error: "Die Datei ist zu groß (max. 5 MB)." };
  }

  const validationError = validateProfileImageFile(file);
  if (validationError) return { error: validationError };

  const contentType = contentTypeForImageUpload(file);
  const ext = extensionFromMime(contentType);
  const path = `${args.userId}/characters/${args.characterId}/foundry-sync-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(PROFILE_MEDIA_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType,
  });

  if (error) {
    return { error: error.message ?? "Portrait-Upload fehlgeschlagen." };
  }

  const { data } = supabase.storage.from(PROFILE_MEDIA_BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

export async function removeCharacterPortraitAdmin(
  supabase: SupabaseClient,
  storagePath: string | null | undefined,
): Promise<void> {
  if (!storagePath?.trim()) return;
  await supabase.storage.from(PROFILE_MEDIA_BUCKET).remove([storagePath]);
}
