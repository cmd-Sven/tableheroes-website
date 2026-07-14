/** Foundry-Item-IDs (z. B. HWIVzf23B9WnGqbA) — keine Anzeigenamen. */
export function isProbablyFoundryId(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes(" ")) return false;
  return /^[A-Za-z0-9]{12,24}$/.test(trimmed);
}

/** Gibt einen lesbaren Label-Text zurück oder null, wenn es eine Foundry-ID ist. */
export function sanitizeActorDisplayLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || isProbablyFoundryId(trimmed)) return null;
  return trimmed;
}

/** Für UI: Foundry-IDs als leeren Platzhalter behandeln. */
export function formatCharacterDisplayLabel(
  value: string | null | undefined,
  fallback = "—",
): string {
  return sanitizeActorDisplayLabel(value) ?? fallback;
}
