"use server";

import { createClient } from "@/src/lib/supabase/server";
import { AURENFURT_LORE_ID } from "./aurenfurt-districts";
import type { AurenfurtPlaceLore } from "./aurenfurt-lore";

export async function loadAurenfurtPlaceLore(): Promise<AurenfurtPlaceLore[]> {
  const supabase = await createClient();
  const { data: districts, error } = await (supabase.from("world_lore") as any)
    .select("id, name, description, image_url")
    .eq("parent_id", AURENFURT_LORE_ID);

  if (error || !districts?.length) return [];

  const ids = districts.map((district: { id: string }) => district.id);
  const { data: places } = await (supabase.from("world_lore") as any)
    .select("name, description, image_url")
    .in("parent_id", ids);

  return [...districts, ...(places ?? [])].map((row: { name: string; description: string | null; image_url: string | null }) => ({
    name: row.name,
    description: row.description,
    imageUrl: row.image_url,
  }));
}
