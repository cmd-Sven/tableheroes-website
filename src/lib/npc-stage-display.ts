/**
 * Bühnen-Reihenfolge: NPCs mit Bezug zum gewählten Lore-Ort (Session) zuerst.
 */
export function sortNpcsByLocationPriority<
  T extends {
    id: string;
    name: string;
    current_location_id?: string | null;
    home_location_id?: string | null;
  },
>(npcs: T[], locationLoreId: string | null | undefined): T[] {
  const lore =
    locationLoreId != null && String(locationLoreId).trim() !== ""
      ? String(locationLoreId)
      : null;
  const score = (n: T) => {
    if (!lore) return 0;
    let s = 0;
    if (String(n.current_location_id ?? "") === lore) s += 2;
    if (String(n.home_location_id ?? "") === lore) s += 1;
    return s;
  };
  return [...npcs].sort((a, b) => {
    const d = score(b) - score(a);
    if (d !== 0) return d;
    return a.name.localeCompare(b.name, "de");
  });
}
