export function normalizeEscapedMarkdown(markdown: string): string {
  return markdown
    .replace(/(^|\n)[ \t]*\\-\\-\\-[ \t]*(?=\n|$)/g, "$1---")
    .replace(/(^|\n)[ \t]*\\_\\_\\_[ \t]*(?=\n|$)/g, "$1___")
    .replace(/(^|\n)[ \t]*\\\*\\\*\\\*[ \t]*(?=\n|$)/g, "$1***")
    .replace(/\\\*\\\*([^\n*]+?)\\\*\\\*/g, "**$1**")
    .replace(/\\_\\_([^\n_]+?)\\_\\_/g, "__$1__")
    .replace(/(^|[\s([{])\\\*([^\n*\s](?:[^\n]*?[^\n*\s])?)\\\*(?=$|[\s)\]}.,;:!?])/g, "$1*$2*")
    .replace(/(^|[\s([{])\\_([^\n_\s](?:[^\n]*?[^\n_\s])?)\\_(?=$|[\s)\]}.,;:!?])/g, "$1_$2_");
}

/** Leerzeichen direkt neben ** oder * entfernen – sonst zeigt CommonMark die Sternchen wörtlich. */
export function normalizeLooseMarkdownEmphasis(markdown: string): string {
  return markdown
    .replace(/\*\*\s+([^\n*]+?)\s+\*\*/g, "**$1**")
    .replace(/\*\*\s+([^\n*]+?)\*\*/g, "**$1**")
    .replace(/\*\*([^\n*]+?)\s+\*\*/g, "**$1**")
    .replace(/(^|[^\w*])\*\s+([^\n*]+?)\s+\*(?!\*)(?=[^\w*]|$)/gm, "$1*$2*")
    .replace(/(^|[^\w*])\*\s+([^\n*]+?)\*(?!\*)(?=[^\w*]|$)/gm, "$1*$2*")
    .replace(/(^|[^\w*])\*([^\n*]+?)\s+\*(?!\*)(?=[^\w*]|$)/gm, "$1*$2*");
}

export function prepareNewsMarkdown(markdown: string): string {
  return normalizeLooseMarkdownEmphasis(normalizeEscapedMarkdown(markdown)).trim();
}

/**
 * Joins accidental single line breaks inside prose blocks (paste from PDF/Word)
 * while keeping paragraphs, lists, headings and code fences intact.
 */
export function normalizeMarkdownFlow(markdown: string): string {
  const normalized = markdown.replace(/\r\n/g, "\n").trim();
  if (!normalized) return "";

  return normalized
    .split(/\n{2,}/)
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";

      const isStructuredBlock =
        /^(#{1,6}\s)/m.test(trimmed) ||
        /^(\s*[-*+]\s)/m.test(trimmed) ||
        /^(\s*\d+\.\s)/m.test(trimmed) ||
        /^(\s*>)/m.test(trimmed) ||
        /^```/m.test(trimmed);

      if (isStructuredBlock) return trimmed;
      return trimmed.replace(/\n+/g, " ").replace(/[ \t]{2,}/g, " ");
    })
    .filter(Boolean)
    .join("\n\n");
}
