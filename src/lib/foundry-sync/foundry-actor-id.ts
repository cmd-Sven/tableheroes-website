/** Canonical form used in the GM UI: `Actor.<id>`. */
export function normalizeFoundryActorId(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("Actor.") ? trimmed : `Actor.${trimmed}`;
}

export function actorIdBase(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("Actor.") ? trimmed.slice(6) : trimmed;
}

export function actorIdVariants(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const withPrefix = normalizeFoundryActorId(trimmed);
  const withoutPrefix = actorIdBase(trimmed);
  return [...new Set([trimmed, withPrefix, withoutPrefix])];
}

type MappingRow = {
  foundry_actor_id: string;
  character_id: string | null;
};

/** Prefer mapped row when Foundry sends `id` and GM saved `Actor.id`. */
export function dedupeFoundryMappings<T extends MappingRow>(rows: T[]): T[] {
  const byBase = new Map<string, T>();

  for (const row of rows) {
    const base = actorIdBase(String(row.foundry_actor_id));
    if (!base) continue;

    const existing = byBase.get(base);
    if (!existing) {
      byBase.set(base, row);
      continue;
    }

    const existingMapped = Boolean(existing.character_id);
    const rowMapped = Boolean(row.character_id);
    if (!existingMapped && rowMapped) {
      byBase.set(base, row);
    }
  }

  return [...byBase.values()];
}

export function pickBestFoundryMapping<T extends MappingRow>(
  rows: T[],
  actorId: string,
): T | null {
  const variants = new Set(actorIdVariants(actorId));
  const matches = rows.filter((row) => variants.has(String(row.foundry_actor_id)));
  if (matches.length === 0) return null;
  return dedupeFoundryMappings(matches)[0] ?? null;
}
