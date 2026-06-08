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
