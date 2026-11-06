/**
 * Überschriften in der Lore-Leseansicht.
 * Der Editor stylt dieselben Ebenen über `.lore-editor` in globals.css:
 * Tailwind-`prose-*` greift hier nicht, weil das Typography-Plugin fehlt.
 * H2 ist ein helles Blutrot, damit es auf dem dunklen Lore-Grund lesbar bleibt.
 */
export const WIKI_HEADING_CLASS = {
  h1: "font-barlow font-extrabold uppercase tracking-wide text-3xl text-hero-vibrant border-b-2 border-hero-border/80 pb-2 mt-8 mb-4 first:mt-0 scroll-mt-24",
  h2: "font-barlow font-bold text-2xl text-[#f0c2b8] border-b border-hero-border/70 pb-2 mt-7 mb-3 first:mt-0 scroll-mt-24",
  h3: "font-cinzel font-bold text-xl text-accent-gold mt-5 mb-2 first:mt-0 scroll-mt-24",
} as const;

/**
 * Sektions-H2 außerhalb von Markdown (z. B. „Beschreibung“, „Rassenprofil“)
 * auf dunklem Lore-/NPC-Hintergrund. Nicht `accent-blood` (#58180D) verwenden —
 * das verschwindet auf bg-background-dark.
 */
export const LORE_SECTION_H2_CLASS =
  "font-barlow font-semibold text-2xl text-[#f0c2b8] border-b border-hero-border pb-2 mb-4";

export const LORE_SECTION_H2_CLASS_COMPACT =
  "font-barlow font-semibold text-lg text-[#f0c2b8] border-b border-hero-border pb-2 mb-3";

export const LORE_SECTION_H2_CLASS_TIGHT =
  "font-barlow font-semibold text-2xl text-[#f0c2b8] border-b border-hero-border pb-2 mb-1";
