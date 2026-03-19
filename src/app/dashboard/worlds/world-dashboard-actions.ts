"use server";

import { createClient } from "@/src/lib/supabase/server";
import { getWorldTasks } from "./world-tasks-actions";

import { LOCATION_TYPES, LORE_TYPES } from "@/src/lib/lore-types";

export type WorldDashboardData = {
  pendingTasksByType: { npc: number; location: number; faction: number };
  lastNpc: { id: string; name: string } | null;
  lastLocation: { id: string; name: string } | null;
  lastLore: { id: string; name: string } | null;
  lastFaction: { id: string; name: string } | null;
};

export async function getWorldDashboardData(worldId: string): Promise<WorldDashboardData> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { pendingTasksByType: { npc: 0, location: 0, faction: 0 }, lastNpc: null, lastLocation: null, lastLore: null, lastFaction: null };

  const { data: world } = await (supabase.from("worlds") as any)
    .select("id, gm_id")
    .eq("id", worldId)
    .single();
  if (!world || (world as { gm_id?: string }).gm_id !== user.id) {
    return { pendingTasksByType: { npc: 0, location: 0, faction: 0 }, lastNpc: null, lastLocation: null, lastLore: null, lastFaction: null };
  }

  const [worldTasks, npcRes, locationRes, loreRes, factionRes] = await Promise.all([
    getWorldTasks(worldId),
    (supabase.from("npcs") as any).select("id, name").eq("world_id", worldId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    (supabase.from("world_lore") as any).select("id, name").eq("world_id", worldId).in("type", LOCATION_TYPES).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    (supabase.from("world_lore") as any).select("id, name").eq("world_id", worldId).in("type", LORE_TYPES).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    (supabase.from("factions") as any).select("id, name").eq("world_id", worldId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const pending = worldTasks.filter((t: { status: string; type: string }) => t.status === "pending");
  const pendingTasksByType = {
    npc: pending.filter((t: { type: string }) => t.type === "npc").length,
    location: pending.filter((t: { type: string }) => t.type === "location").length,
    faction: pending.filter((t: { type: string }) => t.type === "faction").length,
  };

  return {
    pendingTasksByType,
    lastNpc: npcRes?.data ? { id: npcRes.data.id, name: npcRes.data.name } : null,
    lastLocation: locationRes?.data ? { id: locationRes.data.id, name: locationRes.data.name } : null,
    lastLore: loreRes?.data ? { id: loreRes.data.id, name: loreRes.data.name } : null,
    lastFaction: factionRes?.data ? { id: factionRes.data.id, name: factionRes.data.name } : null,
  };
}
