/**
 * Foundry VTT Inline-Enricher → lesbarer Plaintext.
 *
 * Beispiele:
 * - `@Compendium[dnd5e.classfeatures.xxx]{Kampfrausch}` → `Kampfrausch`
 * - `@UUID[Compendium.dnd5e.spells.Item.yyy]{Feuerball}` → `Feuerball`
 * - `@Damage[[1d8]]` / `[[/r 1d20]]{Wurf}` → innere Formel bzw. Label
 */

const FOUNDRY_INLINE_ROLL =
  /@([A-Za-z]+)?\[\[([^\]]*?)\]\](?:\{([^}]*)\})?/g;

const FOUNDRY_BRACKET_ROLL = /\[\[(?:\/[^\]]*|[^\]]*?)\]\](?:\{([^}]*)\})?/g;

/** `@Type[ref]` / `@Type[ref]{Label}` — inkl. mehrerer Bracket-Gruppen. */
const FOUNDRY_AT_ENRICHER = /@([A-Za-z]+)(?:\[[^\]]*?\])+(\{([^}]*)\})?/g;

/** `&Reference[prone]` / `&Reference[prone]{Liegend}` (dnd5e). */
const FOUNDRY_AMP_REFERENCE = /&Reference\[([^\]]*?)\](?:\{([^}]*)\})?/gi;

function collapseWhitespace(text: string): string {
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/**
 * Entfernt Foundry-Enricher-Markup und behält menschliche Labels.
 * Geeignet für Anzeige (und optional Speicherung nach Sync).
 */
export function stripFoundryEnrichers(
  input: string | null | undefined,
): string {
  if (input == null || typeof input !== "string") return "";
  if (!input.trim()) return "";

  let text = input;

  text = text.replace(FOUNDRY_INLINE_ROLL, (_m, _type, inner, label) => {
    const labeled = typeof label === "string" ? label.trim() : "";
    if (labeled) return labeled;
    const body = typeof inner === "string" ? inner.trim() : "";
    return body;
  });

  text = text.replace(FOUNDRY_BRACKET_ROLL, (_m, label) => {
    const labeled = typeof label === "string" ? label.trim() : "";
    return labeled;
  });

  text = text.replace(FOUNDRY_AT_ENRICHER, (_m, _type, _brace, label) => {
    const labeled = typeof label === "string" ? label.trim() : "";
    return labeled;
  });

  text = text.replace(FOUNDRY_AMP_REFERENCE, (_m, ref, label) => {
    const labeled = typeof label === "string" ? label.trim() : "";
    if (labeled) return labeled;
    return typeof ref === "string" ? ref.trim() : "";
  });

  return collapseWhitespace(text);
}
