"use server";

import { createClient } from "@/src/lib/supabase/server";
import { AURENFURT_WORLD_ID } from "./aurenfurt-district-lore-ids";

export async function loadAurenfurtNpcRecordIds(): Promise<Record<string, string>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const [{ data: world }, { data: profile }] = await Promise.all([
    (supabase.from("worlds") as any).select("gm_id").eq("id", AURENFURT_WORLD_ID).maybeSingle(),
    (supabase.from("users") as any).select("primary_role").eq("id", user.id).maybeSingle(),
  ]);

  const isAdmin = profile?.primary_role === "Admin";
  const isWorldGm = world?.gm_id != null && String(world.gm_id) === String(user.id);
  if (!isAdmin && !isWorldGm) return {};

  const { data, error } = await (supabase.from("npcs") as any)
    .select("id, aurenfurt_catalog_id")
    .eq("world_id", AURENFURT_WORLD_ID)
    .not("aurenfurt_catalog_id", "is", null);

  if (error || !Array.isArray(data)) return {};

  const records: Record<string, string> = {};
  for (const row of data as { id: string; aurenfurt_catalog_id: string | null }[]) {
    if (row.aurenfurt_catalog_id && row.id) records[row.aurenfurt_catalog_id] = row.id;
  }
  return records;
}

/** Katalog-ID der Stadtfraktion → Fraktions-UUID in Welt & Lore. */
export async function loadAurenfurtFactionRecordIds(): Promise<Record<string, string>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const [{ data: world }, { data: profile }] = await Promise.all([
    (supabase.from("worlds") as any).select("gm_id").eq("id", AURENFURT_WORLD_ID).maybeSingle(),
    (supabase.from("users") as any).select("primary_role").eq("id", user.id).maybeSingle(),
  ]);

  const isAdmin = profile?.primary_role === "Admin";
  const isWorldGm = world?.gm_id != null && String(world.gm_id) === String(user.id);
  if (!isAdmin && !isWorldGm) return {};

  const { data, error } = await (supabase.from("factions") as any)
    .select("id, aurenfurt_catalog_id")
    .eq("world_id", AURENFURT_WORLD_ID)
    .not("aurenfurt_catalog_id", "is", null);

  if (error || !Array.isArray(data)) return {};

  const records: Record<string, string> = {};
  for (const row of data as { id: string; aurenfurt_catalog_id: string | null }[]) {
    if (row.aurenfurt_catalog_id && row.id) records[row.aurenfurt_catalog_id] = row.id;
  }
  return records;
}
