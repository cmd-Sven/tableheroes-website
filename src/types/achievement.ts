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

/** API-Route für Achievement-Bilder (behebt Umlaute/Leerzeichen in Dateinamen) */
const ACHIEVEMENT_IMAGE_API = "/api/achievement-image";

/** Fallback: direkter Pfad für einfache Dateinamen */
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
 * Liefert die URL zum Achievement-Bild.
 * Nutzt API-Route (/api/achievement-image?file=...) für korrekte Handhabung von
 * Umlauten (ä, ö, ü, ß) und Leerzeichen in Dateinamen.
 */
export function getAchievementImageSrc(
  imageUrl: string | null | undefined
): string | null {
  if (!imageUrl || !imageUrl.trim()) return null;
  const trimmed = imageUrl.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (trimmed.startsWith("/")) {
    return trimmed;
  }
  const filename = toFilenameOnly(imageUrl);
  if (!filename) return null;
  const withExt = hasImageExtension(filename) ? filename : `${filename}.png`;
  return `${ACHIEVEMENT_IMAGE_API}?file=${encodeURIComponent(withExt)}`;
}

/**
 * Liefert alternative URLs zum Ausprobieren.
 * Statischer Pfad zuerst (Next.js serviert Umlaute zuverlässig), dann API-Route.
 */
export function getAchievementImageSrcVariants(
  imageUrl: string | null | undefined
): string[] {
  const filename = toFilenameOnly(imageUrl ?? "");
  if (!filename) return [];
  const withExt = hasImageExtension(filename) ? filename : `${filename}.png`;
  const staticPath = `${ACHIEVEMENT_IMAGE_BASE}/${encodeURIComponent(withExt)}`;
  const apiUrl = getAchievementImageSrc(imageUrl);
  const fallbackExt = getAchievementImageFallbackSrc(imageUrl);
  const variants = [staticPath];
  if (apiUrl && !variants.includes(apiUrl)) variants.push(apiUrl);
  if (fallbackExt && !variants.includes(fallbackExt)) variants.push(fallbackExt);
  return variants;
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
 * Nutzt API-Route für Umlaute/Leerzeichen.
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
  return `${ACHIEVEMENT_IMAGE_API}?file=${encodeURIComponent(withOther)}`;
}
