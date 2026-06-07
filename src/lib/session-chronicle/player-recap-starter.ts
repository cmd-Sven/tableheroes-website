type ArchiveRef = { id?: string | null; name?: string | null };

/** Platzhalter-Texte, die als „noch nicht geschrieben“ gelten. */
const PLACEHOLDER_MARKERS = [
  "In dieser Session gab es noch keine Chronist-Zusammenfassung",
  "*(Beschreibe hier den Abend",
  "*(Hier die Session in eigenen Worten",
];

export function isRecapSummaryPlaceholder(text: string | null | undefined): boolean {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return true;
  return PLACEHOLDER_MARKERS.some((m) => trimmed.includes(m));
}

export function buildRecapStarterMarkdown(input: {
  chronicleStoryRecap?: string | null;
  visitedLocations?: ArchiveRef[];
  encounteredNpcs?: ArchiveRef[];
}): string {
  if (input.chronicleStoryRecap?.trim()) {
    return input.chronicleStoryRecap.trim();
  }

  const locs = (input.visitedLocations ?? [])
    .map((l) => String(l.name ?? "").trim())
    .filter(Boolean);
  const npcs = (input.encounteredNpcs ?? [])
    .map((n) => String(n.name ?? "").trim())
    .filter(Boolean);

  const lines = [
    "## Was ist passiert?",
    "",
    "*(Schreibe hier den Recap für deine Spieler: Was ist passiert, welche Wendungen gab es, was bleibt offen?)*",
    "",
  ];

  if (locs.length > 0 || npcs.length > 0) {
    lines.push("### Stichworte aus dem Abend");
    if (locs.length > 0) lines.push(`- **Orte:** ${locs.join(", ")}`);
    if (npcs.length > 0) lines.push(`- **Begegnungen:** ${npcs.join(", ")}`);
    lines.push("");
  }

  return lines.join("\n");
}
