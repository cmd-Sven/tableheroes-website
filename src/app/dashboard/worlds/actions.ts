"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { WorldBlueprint } from "@/src/types/world";

/**
 * Welt erstellen (GM only). Welten haben gm_id, keine campaign_id.
 * Kampagnen werden später einer Welt zugeordnet (campaign.world_id).
 */
export async function createWorldAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: profileRaw } = await (supabase.from("users") as any)
    .select("primary_role")
    .eq("id", user.id)
    .single();
  const profile = profileRaw as { primary_role?: string } | null;
  if (profile?.primary_role !== "GameMaster" && profile?.primary_role !== "Admin") {
    throw new Error("Nur Spielleiter können Welten anlegen.");
  }

  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("Name der Welt ist Pflicht.");

  const description = (formData.get("description") as string)?.trim() || null;

  const { data: world, error } = await (supabase.from("worlds") as any)
    .insert({
      gm_id: user.id,
      name,
      description,
    })
    .select("id, name")
    .single();

  if (error) {
    console.error("Create World Error:", error);
    throw new Error(error.message || "Welt konnte nicht erstellt werden.");
  }

  const redirectTarget = `/dashboard/worlds/${world.id}`;
  console.log("🔁 [createWorldAction] Redirect target:", redirectTarget);

  revalidatePath("/dashboard/worlds");
  revalidatePath("/dashboard/campaigns/new");
  return { id: world.id, name: world.name };
}

/**
 * Welt in einem Rutsch erstellen (Name + Blueprint + gm_id).
 * Wird am Ende des Creation-Wizards aufgerufen. Redirect auf /dashboard/worlds/[newId].
 */
export async function createWorldComplete(name: string, blueprint: WorldBlueprint) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: profileRaw } = await (supabase.from("users") as any)
    .select("primary_role")
    .eq("id", user.id)
    .single();
  const profile = profileRaw as { primary_role?: string } | null;
  if (profile?.primary_role !== "GameMaster" && profile?.primary_role !== "Admin") {
    throw new Error("Nur Spielleiter können Welten anlegen.");
  }

  const trimmedName = (name || "").trim();
  if (!trimmedName) throw new Error("Name der Welt ist Pflicht.");

  const { data: world, error } = await (supabase.from("worlds") as any)
    .insert({
      gm_id: user.id,
      name: trimmedName,
      description: null,
      blueprint,
    })
    .select("id, name")
    .single();

  if (error) {
    console.error("createWorldComplete Error:", error);
    throw new Error(error.message || "Welt konnte nicht erstellt werden.");
  }

  revalidatePath("/dashboard/worlds");
  revalidatePath("/dashboard/campaigns/new");
  return { id: world.id, name: world.name };
}

/**
 * Blueprint einer Welt aktualisieren (JSONB-Feld worlds.blueprint).
 * Nur der GM (gm_id) darf dieses Feld ändern.
 */
export async function updateWorldBlueprint(worldId: string, blueprint: WorldBlueprint) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: worldRaw, error: worldError } = await (supabase.from("worlds") as any)
    .select("id, gm_id")
    .eq("id", worldId)
    .single();

  if (worldError || !worldRaw) {
    console.error("updateWorldBlueprint: Welt nicht gefunden oder Fehler:", worldError);
    throw new Error("Welt nicht gefunden.");
  }

  const world = worldRaw as { id: string; gm_id?: string };
  const isOwner = world.gm_id === user.id;
  if (!isOwner) {
    throw new Error("Keine Berechtigung, diesen Welt-Blueprint zu ändern.");
  }

  const { error } = await (supabase.from("worlds") as any)
    .update({ blueprint })
    .eq("id", worldId);

  if (error) {
    console.error("updateWorldBlueprint Error:", error);
    throw new Error(error.message || "Blueprint konnte nicht gespeichert werden.");
  }

  revalidatePath(`/dashboard/worlds/${worldId}`);
}

