/** Geteilte Typen und Helfer der Holo-Overlay-Panels. */

/** Führender NPC des Orts (Portrait oben rechts am Bild). */
export type HoloLeadNpc = {
  id: string;
  name: string;
  imageUrl: string;
  role?: string | null;
};

export function shortIntro(text: string, max = 220) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const at = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(" "));
  return `${(at > 80 ? cut.slice(0, at + 1) : cut).trim()}…`;
}
