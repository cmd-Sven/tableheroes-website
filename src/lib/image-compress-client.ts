import {
  PROFILE_MEDIA_MAX_BYTES,
  validateProfileImageFile,
} from "@/src/lib/profile-media";

export const IMAGE_COMPRESS_MAX_EDGE = 1024;
export const IMAGE_COMPRESS_WEBP_QUALITY = 0.82;

/** Größere Eingaben zulassen — nach Komprimierung gilt das normale Upload-Limit. */
export const PROFILE_MEDIA_MAX_INPUT_BYTES = 20 * 1024 * 1024;

function validateInputFile(file: File): string | null {
  if (file.size > PROFILE_MEDIA_MAX_INPUT_BYTES) {
    return `Die Datei ist zu groß (max. ${Math.round(PROFILE_MEDIA_MAX_INPUT_BYTES / 1024 / 1024)} MB vor Komprimierung).`;
  }
  return validateProfileImageFile(file);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Bild konnte nicht geladen werden."));
    };
    img.src = url;
  });
}

function canvasToWebpBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/webp", quality);
  });
}

/** Skaliert und speichert als WebP — nur im Browser (vor Storage-Upload). */
export async function compressImageFileForUpload(
  file: File,
): Promise<{ file: File } | { error: string }> {
  if (typeof window === "undefined") {
    return { file };
  }

  const validationError = validateInputFile(file);
  if (validationError) return { error: validationError };

  try {
    const img = await loadImage(file);
    const maxEdge = IMAGE_COMPRESS_MAX_EDGE;
    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;

    if (!width || !height) {
      return { error: "Bildabmessungen konnten nicht gelesen werden." };
    }

    if (width > maxEdge || height > maxEdge) {
      const ratio = Math.min(maxEdge / width, maxEdge / height);
      width = Math.max(1, Math.round(width * ratio));
      height = Math.max(1, Math.round(height * ratio));
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { error: "Grafik-Kontext nicht verfügbar." };

    ctx.drawImage(img, 0, 0, width, height);

    let quality = IMAGE_COMPRESS_WEBP_QUALITY;
    let blob = await canvasToWebpBlob(canvas, quality);

    if (!blob) {
      return { error: "WebP-Komprimierung wird von diesem Browser nicht unterstützt." };
    }

    while (blob.size > PROFILE_MEDIA_MAX_BYTES && quality > 0.45) {
      quality -= 0.08;
      blob = await canvasToWebpBlob(canvas, quality);
      if (!blob) break;
    }

    if (!blob || blob.size > PROFILE_MEDIA_MAX_BYTES) {
      return {
        error: `Das Bild ist auch nach Komprimierung zu groß (max. ${Math.round(
          PROFILE_MEDIA_MAX_BYTES / 1024 / 1024,
        )} MB). Bitte wähle ein kleineres Bild.`,
      };
    }

    const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
    const outFile = new File([blob], `${baseName}.webp`, { type: "image/webp" });
    return { file: outFile };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Komprimierung fehlgeschlagen.";
    return { error: message };
  }
}
