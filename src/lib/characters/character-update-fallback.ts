/** Spalten, die in älteren DB-Schemas fehlen können — werden bei Schema-Cache-Fehlern weggelassen. */
const OPTIONAL_CHARACTER_UPDATE_COLUMNS = [
  "avatar_display",
  "experience_points",
  "pocket_gold",
] as const;

function findColumnToStrip(
  errMsg: string,
  payload: Record<string, unknown>,
): string | null {
  const m = errMsg.toLowerCase();
  for (const col of OPTIONAL_CHARACTER_UPDATE_COLUMNS) {
    if (col in payload && m.includes(col)) return col;
  }
  if (
    m.includes("schema cache") ||
    (m.includes("column") && m.includes("characters"))
  ) {
    for (const col of OPTIONAL_CHARACTER_UPDATE_COLUMNS) {
      if (col in payload) return col;
    }
  }
  return null;
}

/**
 * Charakter-Update mit Retry: fehlende optionale Spalten werden schrittweise entfernt,
 * damit Spieler- und GM-Bearbeitung auch ohne ausstehende Migration funktioniert.
 */
export async function updateCharacterRowWithSchemaFallback(
  supabase: { from: (table: string) => unknown },
  characterId: string,
  updates: Record<string, unknown>,
): Promise<{ error: { message: string } | null }> {
  let payload = { ...updates };
  let lastError: { message: string } | null = null;

  while (Object.keys(payload).length > 0) {
    const { error } = await (supabase.from("characters") as any)
      .update(payload)
      .eq("id", characterId);

    if (!error) return { error: null };

    lastError = error;
    const stripColumn = findColumnToStrip(String(error.message ?? ""), payload);
    if (!stripColumn) return { error };

    const { [stripColumn]: _removed, ...rest } = payload;
    payload = rest;
  }

  return { error: lastError };
}
