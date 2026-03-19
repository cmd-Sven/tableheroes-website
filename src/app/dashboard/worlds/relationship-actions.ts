"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type Relationship = {
  id: string;
  world_id: string;
  source_id: string;
  target_id: string;
  target_type: "npc" | "pc" | "group";
  source_role: string;
  target_role: string;
  intensity: number;
  monologue_source: string;
  monologue_target: string;
  is_public: boolean;
  public_description: string;
  history: Array<{
    date: string;
    source_role: string;
    target_role: string;
    intensity: number;
    monologue_source: string;
    monologue_target: string;
  }>;
  created_at: string;
  updated_at: string;
};

export type RelationshipWithNames = Relationship & {
  source_name: string;
  target_name: string;
  source_image_url: string | null;
  target_image_url: string | null;
};

async function assertWorldGm(
  supabase: Awaited<ReturnType<typeof createClient>>,
  worldId: string
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: world } = await (supabase.from("worlds") as any)
    .select("id, gm_id")
    .eq("id", worldId)
    .single();
  const w = world as { gm_id?: string } | null;
  if (!w || w.gm_id !== user.id)
    throw new Error("Keine Berechtigung für diese Welt.");
  return user.id;
}

export async function getRelationshipsForNPC(
  worldId: string,
  npcId: string
): Promise<RelationshipWithNames[]> {
  const supabase = await createClient();
  await assertWorldGm(supabase, worldId);

  const { data, error } = await (supabase.from("relationships") as any)
    .select("*")
    .eq("world_id", worldId)
    .or(`source_id.eq.${npcId},target_id.eq.${npcId}`)
    .order("updated_at", { ascending: false });

  if (error) {
    const code = (error as any)?.code;
    const msg = (error as any)?.message ?? "";
    if (
      code === "42P01" ||
      msg.includes("does not exist") ||
      msg.includes("schema cache")
    )
      return [];
    console.error("getRelationshipsForNPC:", error);
    throw new Error(msg || "Fehler beim Laden der Beziehungen.");
  }

  const rows = (data ?? []) as Relationship[];
  const npcIds = new Set<string>();
  rows.forEach((r) => {
    npcIds.add(r.source_id);
    npcIds.add(r.target_id);
  });

  let npcNameMap: Record<string, { name: string; image_url: string | null }> =
    {};
  if (npcIds.size > 0) {
    const { data: npcs } = await (supabase.from("npcs") as any)
      .select("id, name, image_url")
      .in("id", [...npcIds]);
    (npcs || []).forEach((n: any) => {
      npcNameMap[n.id] = { name: n.name ?? "Unbenannt", image_url: n.image_url ?? null };
    });
  }

  return rows.map((r) => ({
    ...r,
    source_name: npcNameMap[r.source_id]?.name ?? "Unbekannt",
    target_name: npcNameMap[r.target_id]?.name ?? "Unbekannt",
    source_image_url: npcNameMap[r.source_id]?.image_url ?? null,
    target_image_url: npcNameMap[r.target_id]?.image_url ?? null,
  }));
}

export async function createRelationship(params: {
  world_id: string;
  source_id: string;
  target_id: string;
  target_type?: "npc" | "pc" | "group";
  source_role: string;
  target_role: string;
  intensity: number;
  monologue_source: string;
  monologue_target: string;
  is_public: boolean;
  public_description?: string;
}): Promise<Relationship> {
  const supabase = await createClient();
  await assertWorldGm(supabase, params.world_id);

  const intensity = Math.max(-100, Math.min(100, params.intensity));

  const { data: existing } = await (supabase.from("relationships") as any)
    .select("id")
    .eq("world_id", params.world_id)
    .or(
      `and(source_id.eq.${params.source_id},target_id.eq.${params.target_id}),and(source_id.eq.${params.target_id},target_id.eq.${params.source_id})`
    )
    .maybeSingle();

  if (existing) {
    throw new Error(
      "Zwischen diesen beiden Charakteren existiert bereits eine Beziehung. Bearbeite die bestehende Beziehung stattdessen."
    );
  }

  const { data, error } = await (supabase.from("relationships") as any)
    .insert({
      world_id: params.world_id,
      source_id: params.source_id,
      target_id: params.target_id,
      target_type: params.target_type ?? "npc",
      source_role: params.source_role,
      target_role: params.target_role,
      intensity,
      monologue_source: params.monologue_source,
      monologue_target: params.monologue_target,
      is_public: params.is_public,
      public_description: params.public_description ?? "",
      history: [],
    })
    .select()
    .single();

  if (error) {
    console.error("createRelationship:", error);
    throw new Error((error as any).message);
  }

  revalidatePath(`/dashboard/worlds/${params.world_id}`);
  return data as Relationship;
}

export async function updateRelationship(
  relationshipId: string,
  updates: {
    source_role?: string;
    target_role?: string;
    intensity?: number;
    monologue_source?: string;
    monologue_target?: string;
    is_public?: boolean;
    public_description?: string;
  }
): Promise<void> {
  const supabase = await createClient();

  const { data: rel } = await (supabase.from("relationships") as any)
    .select("*")
    .eq("id", relationshipId)
    .single();
  if (!rel) throw new Error("Beziehung nicht gefunden.");
  await assertWorldGm(supabase, (rel as Relationship).world_id);

  const old = rel as Relationship;
  const historyEntry = {
    date: new Date().toISOString(),
    source_role: old.source_role,
    target_role: old.target_role,
    intensity: old.intensity,
    monologue_source: old.monologue_source,
    monologue_target: old.monologue_target,
  };
  const newHistory = [...(Array.isArray(old.history) ? old.history : []), historyEntry];

  const normalizedUpdates: any = { ...updates, history: newHistory, updated_at: new Date().toISOString() };
  if (updates.intensity !== undefined) {
    normalizedUpdates.intensity = Math.max(-100, Math.min(100, updates.intensity));
  }

  const { error } = await (supabase.from("relationships") as any)
    .update(normalizedUpdates)
    .eq("id", relationshipId);

  if (error) {
    console.error("updateRelationship:", error);
    throw new Error((error as any).message);
  }

  revalidatePath(`/dashboard/worlds/${old.world_id}`);
}

export async function deleteRelationship(relationshipId: string): Promise<void> {
  const supabase = await createClient();

  const { data: rel } = await (supabase.from("relationships") as any)
    .select("id, world_id")
    .eq("id", relationshipId)
    .single();
  if (!rel) throw new Error("Beziehung nicht gefunden.");
  await assertWorldGm(supabase, (rel as { world_id: string }).world_id);

  const { error } = await (supabase.from("relationships") as any)
    .delete()
    .eq("id", relationshipId);

  if (error) {
    console.error("deleteRelationship:", error);
    throw new Error((error as any).message);
  }

  revalidatePath(`/dashboard/worlds/${(rel as { world_id: string }).world_id}`);
}
