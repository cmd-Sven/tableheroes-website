import { createClient } from "@/src/lib/supabase/client";
import { compressImageFileForUpload } from "@/src/lib/image-compress-client";

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

async function prepareImageForProfileUpload(
  file: File,
): Promise<{ file: File } | { error: string }> {
  return compressImageFileForUpload(file);
}

async function uploadPreparedImage(
  path: string,
  file: File,
): Promise<{ error: string } | null> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(PROFILE_MEDIA_BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: "image/webp",
  });

  if (error) {
    const hint =
      /mime|not supported|invalid/i.test(error.message)
        ? " Prüfe im Supabase-Dashboard beim Bucket „profile-media“, ob „image/webp“ unter den erlaubten MIME-Typen steht (oder die Liste leeren)."
        : "";
    return { error: `${error.message}${hint}` };
  }
  return null;
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
  const prepared = await prepareImageForProfileUpload(file);
  if ("error" in prepared) return { error: prepared.error };

  const uploadFile = prepared.file;
  const path = `${userId}/${kind}-${Date.now()}.webp`;
  const uploadError = await uploadPreparedImage(path, uploadFile);
  if (uploadError) return uploadError;

  const supabase = createClient();
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
  const prepared = await prepareImageForProfileUpload(file);
  if ("error" in prepared) return { error: prepared.error };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return { error: "Nicht angemeldet." };

  const uid = user.id;
  const path = options.characterId?.trim()
    ? `${uid}/characters/${options.characterId}/portrait-${Date.now()}.webp`
    : `${uid}/characters/new-${crypto.randomUUID()}-${Date.now()}.webp`;

  const uploadError = await uploadPreparedImage(path, prepared.file);
  if (uploadError) return uploadError;

  const { data } = supabase.storage.from(PROFILE_MEDIA_BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

/** NSC-Porträt: `{userId}/npcs/{worldId}/{npcId|new-…}/portrait-{ts}.ext` */
export async function uploadNpcPortrait(
  file: File,
  options: { worldId: string; npcId?: string | null },
): Promise<{ path: string; publicUrl: string } | { error: string }> {
  const prepared = await prepareImageForProfileUpload(file);
  if ("error" in prepared) return { error: prepared.error };

  const worldId = options.worldId?.trim();
  if (!worldId) return { error: "Welt-ID fehlt für den Portrait-Upload." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return { error: "Nicht angemeldet." };

  const uid = user.id;
  const npcSegment = options.npcId?.trim()
    ? options.npcId.trim()
    : `new-${crypto.randomUUID()}`;
  const path = `${uid}/npcs/${worldId}/${npcSegment}/portrait-${Date.now()}.webp`;

  const uploadError = await uploadPreparedImage(path, prepared.file);
  if (uploadError) return uploadError;

  const { data } = supabase.storage.from(PROFILE_MEDIA_BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

/** Bestarium-Portrait: `{userId}/bestarium/{worldId}/{creatureId|new-…}/portrait-{ts}.ext` */
export async function uploadBestariumPortrait(
  file: File,
  options: { worldId: string; creatureId?: string | null },
): Promise<{ path: string; publicUrl: string } | { error: string }> {
  const prepared = await prepareImageForProfileUpload(file);
  if ("error" in prepared) return { error: prepared.error };

  const worldId = options.worldId?.trim();
  if (!worldId) return { error: "Welt-ID fehlt für den Portrait-Upload." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return { error: "Nicht angemeldet." };

  const uid = user.id;
  const creatureSegment = options.creatureId?.trim()
    ? options.creatureId.trim()
    : `new-${crypto.randomUUID()}`;
  const path = `${uid}/bestarium/${worldId}/${creatureSegment}/portrait-${Date.now()}.webp`;

  const uploadError = await uploadPreparedImage(path, prepared.file);
  if (uploadError) return uploadError;

  const { data } = supabase.storage.from(PROFILE_MEDIA_BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

/** Fraktions-Wappen: `{userId}/factions/{worldId}/{factionId|new-…}/emblem-{ts}.ext` */
export async function uploadFactionEmblem(
  file: File,
  options: { worldId: string; factionId?: string | null },
): Promise<{ path: string; publicUrl: string } | { error: string }> {
  const prepared = await prepareImageForProfileUpload(file);
  if ("error" in prepared) return { error: prepared.error };

  const worldId = options.worldId?.trim();
  if (!worldId) return { error: "Welt-ID fehlt für den Wappen-Upload." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return { error: "Nicht angemeldet." };

  const uid = user.id;
  const factionSegment = options.factionId?.trim()
    ? options.factionId.trim()
    : `new-${crypto.randomUUID()}`;
  const path = `${uid}/factions/${worldId}/${factionSegment}/emblem-${Date.now()}.webp`;

  const uploadError = await uploadPreparedImage(path, prepared.file);
  if (uploadError) return uploadError;

  const { data } = supabase.storage.from(PROFILE_MEDIA_BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

/** Lore-Hauptbild: `{userId}/lore/{worldId}/{loreId|new-…}/image-{ts}.ext` */
export async function uploadLoreImage(
  file: File,
  options: { worldId: string; loreId?: string | null },
): Promise<{ path: string; publicUrl: string } | { error: string }> {
  const prepared = await prepareImageForProfileUpload(file);
  if ("error" in prepared) return { error: prepared.error };

  const worldId = options.worldId?.trim();
  if (!worldId) return { error: "Welt-ID fehlt für den Bild-Upload." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return { error: "Nicht angemeldet." };

  const uid = user.id;
  const loreSegment = options.loreId?.trim()
    ? options.loreId.trim()
    : `new-${crypto.randomUUID()}`;
  const path = `${uid}/lore/${worldId}/${loreSegment}/image-${Date.now()}.webp`;

  const uploadError = await uploadPreparedImage(path, prepared.file);
  if (uploadError) return uploadError;

  const { data } = supabase.storage.from(PROFILE_MEDIA_BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

/** Szenenbild Mediathek: `{userId}/scene-media/{campaignId}/{id|new-…}/image-{ts}.ext` */
export async function uploadSceneMediaImage(
  file: File,
  options: { campaignId: string; sceneMediaId?: string | null },
): Promise<{ path: string; publicUrl: string } | { error: string }> {
  const prepared = await prepareImageForProfileUpload(file);
  if ("error" in prepared) return { error: prepared.error };

  const campaignId = options.campaignId?.trim();
  if (!campaignId) return { error: "Kampagnen-ID fehlt für den Upload." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return { error: "Nicht angemeldet." };

  const segment = options.sceneMediaId?.trim()
    ? options.sceneMediaId.trim()
    : `new-${crypto.randomUUID()}`;
  const path = `${user.id}/scene-media/${campaignId}/${segment}/image-${Date.now()}.webp`;

  const uploadError = await uploadPreparedImage(path, prepared.file);
  if (uploadError) return uploadError;

  const { data } = supabase.storage.from(PROFILE_MEDIA_BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}
