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

  const buffer = await sharp(input)
    .rotate()
    .resize(maxEdge, maxEdge, { fit: "inside", withoutEnlargement: true })
    .webp({ quality, effort: 4 })
    .toBuffer();

  return {
    buffer,
    contentType: "image/webp",
    extension: "webp",
  };
}
