import fs from "fs";
import path from "path";
import { getAchievementImageForName } from "@/src/lib/constants/achievements";

/** Lokale Achievement-Bilder. In der DB steht oft nur ein Dateiname, teils mit führender Zahl. */
export const ACHIEVEMENT_IMAGE_DIR = path.join(
  process.cwd(),
  "public",
  "images",
  "achievement",
);

const IMAGE_EXTENSIONS = [".png", ".webp", ".jpg", ".jpeg", ".gif"];
const EXT_PREFERENCE = [".webp", ".png", ".jpg", ".jpeg", ".gif"];

type IndexedFile = {
  name: string;
  lower: string;
  loose: string;
  ext: string;
};

let fileCache: { at: number; files: IndexedFile[] } | null = null;

function looseKey(value: string): string {
  const withoutExt = value.replace(/\.[^.]+$/i, "");
  const withoutLeadingId = withoutExt.replace(/^\d+/, "");
  return withoutLeadingId
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function listAchievementImages(): IndexedFile[] {
  const now = Date.now();
  if (fileCache && now - fileCache.at < 30_000) return fileCache.files;

  let names: string[] = [];
  try {
    if (fs.existsSync(ACHIEVEMENT_IMAGE_DIR)) {
      names = fs
        .readdirSync(ACHIEVEMENT_IMAGE_DIR, { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
        .filter((name) =>
          IMAGE_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext)),
        );
    }
  } catch {
    names = [];
  }

  const files = names.map((name) => {
    const ext = path.extname(name).toLowerCase();
    return {
      name,
      lower: name.toLowerCase(),
      loose: looseKey(name),
      ext,
    };
  });
  fileCache = { at: now, files };
  return files;
}

function pickBest(matches: IndexedFile[], preferredExt: string): string | null {
  if (matches.length === 0) return null;
  const preferred = matches.find((file) => file.ext === preferredExt);
  if (preferred) return preferred.name;
  for (const ext of EXT_PREFERENCE) {
    const hit = matches.find((file) => file.ext === ext);
    if (hit) return hit.name;
  }
  return matches[0]?.name ?? null;
}

/**
 * Sucht eine echte Datei in public/images/achievement/.
 * Ignoriert führende Ziffern, Großschreibung, Bindestriche und Leerzeichen.
 * Gibt den Dateinamen von der Platte zurück, nie einen erfundenen Pfad.
 */
export function findAchievementImageFile(
  raw: string | null | undefined,
): string | null {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed || /^https?:\/\//i.test(trimmed) || trimmed.startsWith("/")) {
    return null;
  }

  const basename = path.basename(trimmed.replace(/\\/g, "/"));
  if (!basename || basename === "." || basename === "..") return null;

  const files = listAchievementImages();
  const requestedExt = path.extname(basename).toLowerCase();
  const variants = [basename];
  const stripped = basename.replace(/^\d+/, "").trim();
  if (stripped && stripped !== basename) variants.push(stripped);

  for (const variant of variants) {
    const lower = variant.toLowerCase();
    const exact = files.filter((file) => file.lower === lower);
    const picked = pickBest(exact, requestedExt);
    if (picked) return picked;
  }

  for (const variant of variants) {
    const key = looseKey(variant);
    if (!key) continue;
    const loose = files.filter((file) => file.loose === key);
    const picked = pickBest(loose, requestedExt);
    if (picked) return picked;
  }

  return null;
}

/**
 * Dateiname für die Anzeige.
 * Reihenfolge: vom SL gewähltes icon, dann image_url, dann Namenszuordnung,
 * danach der Achievement-Name selbst – aber nur, wenn die Datei existiert.
 */
export function resolveAchievementImageFilename(input: {
  name?: string | null;
  icon?: string | null;
  imageUrl?: string | null;
}): string | null {
  const direct = [input.icon, input.imageUrl];
  for (const value of direct) {
    const trimmed = value?.trim() ?? "";
    if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/")) {
      return trimmed;
    }
  }

  const candidates: string[] = [];
  const push = (value?: string | null) => {
    const trimmed = value?.trim() ?? "";
    if (!trimmed || candidates.includes(trimmed)) return;
    if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/")) return;
    candidates.push(trimmed);
  };

  push(input.icon);
  push(input.imageUrl);
  push(getAchievementImageForName(input.name ?? ""));
  const name = input.name?.trim();
  if (name) {
    push(`${name}.png`);
    push(`${name}.webp`);
  }

  for (const candidate of candidates) {
    const found = findAchievementImageFile(candidate);
    if (found) return found;
  }

  return null;
}
