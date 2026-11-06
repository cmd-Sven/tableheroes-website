"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/src/lib/supabase/client";

export type EntityType = "npc" | "location" | "faction";

export type WorldEntity = {
  id: string;
  name: string;
  type: EntityType;
  /** Zusätzliche Treffer für Auto-Links (Schreibvarianten). */
  aliases?: string[];
};

/**
 * Bekannte Schreibvarianten → kanonischer Lore-/NPC-Name.
 * Nur echte Matches; keine erfundenen Ziele.
 */
const ENTITY_ALIASES: Record<string, string[]> = {
  "Malanthir Erz": ["Malantir-Erz", "Malantir Erz", "Malanthir-Erz", "Malantirerz"],
  "Das Kaiserreich Aurelis": ["Kaiserreich Aurelis", "Aurelis"],
  "Das verdorbene Land Xarvar": ["Xarvar", "Land Xarvar"],
  "Xarvathar, das Eiserne Herz des Imperiums": ["Xarvathar", "Imperium von Xarvathar"],
};

/**
 * Fetches all entity names, IDs, and types from the current world.
 * - NPCs from npcs (world_id)
 * - Alle world_lore-Einträge (Orte, Rassen, Gottheiten, …) → type "location" (URL /lore/[id])
 * - Factions from factions (world_id)
 */
export function useWorldEntities(worldId: string | null | undefined) {
  const [entities, setEntities] = useState<WorldEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!worldId) {
      setEntities([]);
      setLoading(false);
      return;
    }

    const supabase = createClient();

    async function fetchEntities() {
      setLoading(true);
      setError(null);

      try {
        const [npcsRes, loreRes, factionsRes] = await Promise.all([
          (supabase.from("npcs") as any)
            .select("id, name")
            .eq("world_id", worldId),
          (supabase.from("world_lore") as any)
            .select("id, name")
            .eq("world_id", worldId),
          (supabase.from("factions") as any)
            .select("id, name")
            .eq("world_id", worldId),
        ]);

        const result: WorldEntity[] = [];

        (npcsRes.data || []).forEach((r: { id: string; name: string }) => {
          if (r.name?.trim()) {
            const name = r.name.trim();
            result.push({
              id: r.id,
              name,
              type: "npc",
              aliases: ENTITY_ALIASES[name],
            });
          }
        });

        (loreRes.data || []).forEach((r: { id: string; name: string }) => {
          if (r.name?.trim()) {
            const name = r.name.trim();
            result.push({
              id: r.id,
              name,
              type: "location",
              aliases: ENTITY_ALIASES[name],
            });
          }
        });

        (factionsRes.data || []).forEach((r: { id: string; name: string }) => {
          if (r.name?.trim()) {
            const name = r.name.trim();
            result.push({
              id: r.id,
              name,
              type: "faction",
              aliases: ENTITY_ALIASES[name],
            });
          }
        });

        setEntities(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch entities");
        setEntities([]);
      } finally {
        setLoading(false);
      }
    }

    fetchEntities();
  }, [worldId]);

  return { entities, loading, error };
}
