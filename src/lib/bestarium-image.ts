/** Öffentlicher Platzhalter unter /public */
export const BESTARIUM_PLACEHOLDER_IMAGE = "/images/dark-marmor.jpg";

/**
 * Liefert eine für <img> / Next/Image nutzbare URL.
 * Unterstützt volle URLs, Pfade ab /, Dateinamen unter public/images/news und typische Schreibvarianten.
 */
export function resolveBestariumImageUrl(url: string | null | undefined): string {
  if (url == null) return BESTARIUM_PLACEHOLDER_IMAGE;
  let t = String(url).trim();
  if (!t) return BESTARIUM_PLACEHOLDER_IMAGE;
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    t = t.slice(1, -1).trim();
  }
  if (!t) return BESTARIUM_PLACEHOLDER_IMAGE;
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  if (t.startsWith("//")) return `https:${t}`;
  if (t.startsWith("/")) return t;
  if (t.startsWith("images/news/")) return `/${t}`;
  return `/images/news/${t}`;
}

/** Liest Text aus RPC-/JSON-Zeilen (snake_case / camelCase). */
export function pickRpcString(row: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string") {
      const s = v.trim();
      if (s) return s;
    }
  }
  return null;
}
