import "server-only";

import { IMAGE_COMPRESS_MAX_EDGE, IMAGE_COMPRESS_WEBP_QUALITY } from "@/src/lib/image-compress-client";

export type CompressedImage = {
  buffer: Buffer;
  contentType: "image/webp";
  extension: "webp";
};

/** PNG/JPEG/WebP-Puffer zu optimiertem WebP (Server, z. B. KI-Portraits). */
export async function compressImageBufferToWebp(
  input: Buffer,
  options?: { maxEdge?: number; quality?: number },
): Promise<CompressedImage> {
  const sharp = (await import("sharp")).default;
  const maxEdge = options?.maxEdge ?? IMAGE_COMPRESS_MAX_EDGE;
  const quality = Math.round((options?.quality ?? IMAGE_COMPRESS_WEBP_QUALITY) * 100);

  try {
    const inputMeta = await sharp(input).metadata();
    if (!inputMeta.width || !inputMeta.height) {
      throw new Error("KI-Bild hat keine gültigen Abmessungen.");
    }
  } catch {
    throw new Error("KI-Bild konnte nicht gelesen werden (ungültiges Format).");
  }

  const buffer = await sharp(input)
    .rotate()
    .resize(maxEdge, maxEdge, { fit: "inside", withoutEnlargement: true })
    .webp({ quality, effort: 4 })
    .toBuffer();

  try {
    const outputMeta = await sharp(buffer).metadata();
    if (!outputMeta.width || !outputMeta.height) {
      throw new Error("WebP-Ausgabe ungültig.");
    }
  } catch {
    throw new Error("WebP-Komprimierung fehlgeschlagen (beschädigte Ausgabe).");
  }

  return {
    buffer,
    contentType: "image/webp",
    extension: "webp",
  };
}

/** Stabiler Upload-Body für Supabase Storage (vermeidet UTF-8-Korruption bei Raw-Buffer). */
export function toStorageUploadBody(buffer: Buffer, contentType: string): Blob {
  return new Blob([new Uint8Array(buffer)], { type: contentType });
}
