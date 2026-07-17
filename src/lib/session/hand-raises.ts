export type SessionHandRaise = {
  id: string;
  userId: string;
  characterId?: string;
  displayName: string;
  urgent: boolean;
  at: string;
};

export function normalizeHandRaises(value: unknown): SessionHandRaise[] {
  if (!Array.isArray(value)) return [];
  const rows: SessionHandRaise[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const id = String(row.id ?? "").trim();
    const userId = String(row.userId ?? "").trim();
    const displayName = String(row.displayName ?? "").trim() || "Spieler";
    const at = String(row.at ?? "").trim();
    if (!id || !userId || !at) continue;
    rows.push({
      id,
      userId,
      characterId:
        row.characterId != null && String(row.characterId).trim()
          ? String(row.characterId).trim()
          : undefined,
      displayName,
      urgent: row.urgent === true,
      at,
    });
  }
  return rows.sort((a, b) => a.at.localeCompare(b.at));
}
