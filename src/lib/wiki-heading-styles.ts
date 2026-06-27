/** Gemeinsame Überschriften-Stile für WikiEditor (prose) und SmartText (direkt). */

export const WIKI_HEADING_CLASS = {
  h1: "font-barlow font-extrabold uppercase tracking-wide text-3xl text-hero-vibrant border-b-2 border-hero-border/80 pb-2 mt-8 mb-4 first:mt-0 scroll-mt-24",
  h2: "font-barlow font-bold text-2xl text-white border-b border-hero-border/70 pb-2 mt-7 mb-3 first:mt-0 scroll-mt-24",
  h3: "font-barlow font-semibold text-xl text-accent-gold mt-5 mb-2 first:mt-0 scroll-mt-24",
} as const;

/** Tailwind-prose-Modifier für TipTap/WikiEditor */
export const WIKI_HEADING_PROSE_CLASSES = [
  "prose-headings:scroll-mt-24",
  "prose-h1:font-barlow prose-h1:font-extrabold prose-h1:uppercase prose-h1:tracking-wide prose-h1:text-3xl prose-h1:text-hero-vibrant",
  "prose-h1:border-b-2 prose-h1:border-hero-border/80 prose-h1:pb-2 prose-h1:mt-8 prose-h1:mb-4 prose-h1:first:mt-0",
  "prose-h2:font-barlow prose-h2:font-bold prose-h2:text-2xl prose-h2:text-white",
  "prose-h2:border-b prose-h2:border-hero-border/70 prose-h2:pb-2 prose-h2:mt-7 prose-h2:mb-3 prose-h2:first:mt-0",
  "prose-h3:font-barlow prose-h3:font-semibold prose-h3:text-xl prose-h3:text-accent-gold prose-h3:mt-5 prose-h3:mb-2 prose-h3:first:mt-0",
].join(" ");
