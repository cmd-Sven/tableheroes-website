/**
 * Überschriften in der Lore-Leseansicht.
 * Der Editor stylt dieselben Ebenen über `.lore-editor` in globals.css:
 * Tailwind-`prose-*` greift hier nicht, weil das Typography-Plugin fehlt.
 * H2 ist ein helles Blutrot, damit es auf dem dunklen Lore-Grund lesbar bleibt.
 */
export const WIKI_HEADING_CLASS = {
  h1: "font-barlow font-extrabold uppercase tracking-wide text-3xl text-hero-vibrant border-b-2 border-hero-border/80 pb-2 mt-8 mb-4 first:mt-0 scroll-mt-24",
  h2: "font-barlow font-bold text-2xl text-[#f0c2b8] border-b border-hero-border/70 pb-2 mt-7 mb-3 first:mt-0 scroll-mt-24",
  h3: "font-barlow font-semibold text-xl text-accent-gold mt-5 mb-2 first:mt-0 scroll-mt-24",
} as const;
