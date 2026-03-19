"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/src/lib/supabase/client";

/** Location types in world_lore that represent locations */
const LOCATION_TYPES_FOR_ENTITIES = [
  "Stadt",
  "Region",
  "Insel",
  "Gebäude",
  "Tempel",
  "Dorf",
  "Ort",
] as const;

export type EntityType = "npc" | "location" | "faction";

export type WorldEntity = {
  id: string;
  name: string;
  type: EntityType;
};

/**
 * Fetches all entity names, IDs, and types from the current world.
 * - NPCs from npcs (world_id)
 * - Locations from world_lore (type in Stadt, Region, Insel, Gebäude, Tempel, Dorf, Ort)
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
            .eq("world_id", worldId)
            .in("type", LOCATION_TYPES_FOR_ENTITIES),
          (supabase.from("factions") as any)
            .select("id, name")
            .eq("world_id", worldId),
        ]);

        const result: WorldEntity[] = [];

        (npcsRes.data || []).forEach((r: { id: string; name: string }) => {
          if (r.name?.trim()) {
            result.push({ id: r.id, name: r.name.trim(), type: "npc" });
          }
        });

        (loreRes.data || []).forEach((r: { id: string; name: string }) => {
          if (r.name?.trim()) {
            result.push({ id: r.id, name: r.name.trim(), type: "location" });
          }
        });

        (factionsRes.data || []).forEach((r: { id: string; name: string }) => {
          if (r.name?.trim()) {
            result.push({ id: r.id, name: r.name.trim(), type: "faction" });
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
