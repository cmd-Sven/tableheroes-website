import { createClient } from "@/src/lib/supabase/server";

export type FactionReputation = {
  id: string;
  faction_id: string;
  faction_name: string;
  reputation: number;
  rank: string | null;
  gm_notes: string | null;
  updated_at: string;
};

/**
 * Reine Datenqueries (kein "use server") – für Server Components.
 */

export async function getCharacterFactionReputations(
  characterId: string,
  campaignId: string,
): Promise<FactionReputation[]> {
  const supabase = await createClient();

  const { data: rows, error } = await (supabase.from("character_faction_reputation") as any)
    .select("id, faction_id, reputation, rank, gm_notes, updated_at")
    .eq("character_id", characterId);

  if (error) {
    console.warn("[getCharacterFactionReputations] error:", error);
    return [];
  }

  const items = (rows as any[]) ?? [];
  if (items.length === 0) return [];

  const factionIds = [...new Set(items.map((r: any) => r.faction_id))];
  const { data: factionRows } = await (supabase.from("factions") as any)
    .select("id, name")
    .in("id", factionIds);
  const factionMap = new Map(
    ((factionRows as { id: string; name: string }[]) ?? []).map((f) => [f.id, f.name]),
  );

  return items.map((r: any) => {
    const repNum = Number(r.reputation);
    const reputation = Number.isFinite(repNum)
      ? Math.max(-100, Math.min(100, Math.round(repNum)))
      : 0;
    const notes = r.gm_notes;
    const gm_notes =
      notes == null || typeof notes === "string"
        ? (notes as string | null)
        : typeof notes === "object"
          ? (() => {
              try {
                return JSON.stringify(notes);
              } catch {
                return null;
              }
            })()
          : String(notes);

    return {
      id: String(r.id ?? ""),
      faction_id: String(r.faction_id ?? ""),
      faction_name: String(factionMap.get(r.faction_id) ?? "Unbekannt"),
      reputation,
      rank: r.rank != null ? String(r.rank) : null,
      gm_notes,
      updated_at:
        r.updated_at != null ? String(r.updated_at) : new Date(0).toISOString(),
    };
  });
}
