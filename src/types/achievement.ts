/**
 * Achievement-Darstellung (Frontend).
 * Alle Bilder liegen einheitlich unter /images/achievement/ (Singular).
 */
export type Achievement = {
  id: string;
  name: string;
  /** Dateiname mit oder ohne Endung (z. B. "Quest erledigt.png"). In der DB nur Dateiname, kein Pfad. */
  image_url?: string | null;
  points_awarded?: number;
  description?: string | null;
};

/** Einheitlicher Basispfad für alle Achievement-Bilder (public/images/achievement/). */
export const ACHIEVEMENT_IMAGE_BASE = "/images/achievement";

const IMAGE_EXTENSIONS = [".png", ".webp", ".jpg", ".jpeg", ".gif"];

function hasImageExtension(value: string): boolean {
  const lower = value.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Entfernt eine vorangestellte Achievement-ID (Ziffern) aus dem Dateinamen.
 * Die DB speichert teils "45zuviel Gepäck.png" – wir brauchen nur "zuviel Gepäck.png".
 */
function stripLeadingId(filename: string): string {
  return filename.replace(/^\d+/, "").trim();
}

/**
 * Extrahiert aus einem DB-Wert nur den Dateinamen (kein Pfad).
 * Falls in der DB fälschlich "images/achievements/medal.png" gespeichert wurde, wird "medal.png" daraus.
 */
function toFilenameOnly(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http") || trimmed.startsWith("/")) return "";
  const withoutPath = trimmed.replace(/^.*[\\/]/, "").trim();
  return stripLeadingId(withoutPath);
}

/**
 * Liefert die URL zum Achievement-Bild. Alle Bilder unter /images/achievement/[dateiname].
 * Beim Auslesen wird nur der Dateiname verwendet; gespeicherte Pfade (z. B. images/achievements/…) werden bereinigt.
 * Vollständige URLs (http/https) und absolute Pfade (/) werden unverändert zurückgegeben.
 */
export function getAchievementImageSrc(
  imageUrl: string | null | undefined
): string | null {
  if (!imageUrl || !imageUrl.trim()) return null;
  const trimmed = imageUrl.trim();
  // Vollständige URLs (Supabase Storage etc.) direkt verwenden
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  // Bereits absoluter Pfad (z. B. /images/achievement/medal.png)
  if (trimmed.startsWith("/")) {
    return trimmed;
  }
  const filename = toFilenameOnly(imageUrl);
  if (!filename) return null;
  const withExt = hasImageExtension(filename) ? filename : `${filename}.png`;
  return `${ACHIEVEMENT_IMAGE_BASE}/${encodeURIComponent(withExt)}`;
}

/**
 * Wie getAchievementImageSrc – für Abwärtskompatibilität. Beide nutzen /images/achievement/.
 */
export function getAchievementImageSrcForCustom(
  filename: string | null | undefined
): string | null {
  return getAchievementImageSrc(filename);
}

/**
 * Fallback-URL mit anderer Extension (.webp ↔ .png).
 * Für onError: anderes Format versuchen.
 * Bei externen URLs (http/https) oder absoluten Pfaden wird null zurückgegeben (kein Fallback).
 */
export function getAchievementImageFallbackSrc(
  imageUrl: string | null | undefined
): string | null {
  if (!imageUrl || !imageUrl.trim()) return null;
  const trimmed = imageUrl.trim();
  if (trimmed.startsWith("http") || trimmed.startsWith("/")) return null;
  const filename = toFilenameOnly(imageUrl);
  if (!filename) return null;
  const lower = filename.toLowerCase();
  const otherExt = lower.endsWith(".webp") ? ".png" : ".webp";
  const base = hasImageExtension(filename)
    ? filename.replace(/\.[^.]+$/i, "").trim()
    : filename;
  const withOther = `${base}${otherExt}`;
  return `${ACHIEVEMENT_IMAGE_BASE}/${encodeURIComponent(withOther)}`;
}
