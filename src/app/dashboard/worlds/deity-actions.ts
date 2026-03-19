"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createWorldTask } from "@/src/app/dashboard/worlds/world-tasks-actions";

type DeityRow = {
  id: string;
  world_id: string;
  name: string;
  epithet: string | null;
  symbol_description: string | null;
  symbol_image_url: string | null;
  domain: string | null;
  dark_side: string | null;
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
  if (!w || w.gm_id !== user.id) {
    throw new Error("Keine Berechtigung für diese Welt.");
  }
  return user.id;
}

/**
 * Alle Gottheiten einer Welt (für Dropdowns etc.).
 */
export async function getDeitiesByWorld(
  worldId: string
): Promise<Array<Pick<DeityRow, "id" | "name" | "epithet">>> {
  const supabase = await createClient();
  await assertWorldGm(supabase, worldId);

  const { data, error } = await (supabase.from("deities") as any)
    .select("id, world_id, name, epithet")
    .eq("world_id", worldId)
    .order("name", { ascending: true });

  if (error) {
    console.error("getDeitiesByWorld:", error);
    throw new Error(error.message || "Fehler beim Laden der Gottheiten.");
  }

  return (data || []).map((d: any) => ({
    id: String(d.id),
    name: String(d.name ?? "Unbenannt"),
    epithet: d.epithet ?? null,
  }));
}

export type DeityRelationshipInput = {
  target_deity_id: string;
  relation_type: "child" | "father" | "mother" | "kin" | "rival" | "enemy";
};

/**
 * Wird vom Lore-Gottheitsformular aufgerufen.
 * Legt eine Gottheit an oder aktualisiert sie (weltweit eindeutig nach world_id + name)
 * und setzt ihre Beziehungen zu anderen Gottheiten.
 */
export async function saveDeityFromLore(params: {
  worldId: string;
  name: string;
  epithet?: string;
  symbol_description?: string;
  symbol_image_url?: string;
  domain?: string;
  dark_side?: string;
  relationships?: DeityRelationshipInput[];
}) {
  const supabase = await createClient();
  const worldId = params.worldId;

  await assertWorldGm(supabase, worldId);

  const trimmedName = params.name.trim();
  if (!trimmedName) {
    throw new Error("Name der Gottheit darf nicht leer sein.");
  }

  // 1. Bestehende Gottheit suchen (weltweit eindeutig nach world_id + name)
  const { data: existing } = await (supabase.from("deities") as any)
    .select("id")
    .eq("world_id", worldId)
    .eq("name", trimmedName)
    .maybeSingle();

  let deityId: string;

  const payload: Partial<DeityRow> = {
    world_id: worldId,
    name: trimmedName,
    epithet: params.epithet?.trim() || null,
    symbol_description: params.symbol_description?.trim() || null,
    symbol_image_url: params.symbol_image_url?.trim() || null,
    domain: params.domain?.trim() || null,
    dark_side: params.dark_side?.trim() || null,
  };

  if (existing && (existing as any).id) {
    const { data: updated, error } = await (supabase.from("deities") as any)
      .update(payload)
      .eq("id", (existing as any).id)
      .select("id")
      .single();

    if (error) {
      console.error("saveDeityFromLore.update:", error);
      throw new Error(error.message || "Fehler beim Aktualisieren der Gottheit.");
    }
    deityId = String((updated as any).id);
  } else {
    const { data: inserted, error } = await (supabase.from("deities") as any)
      .insert(payload)
      .select("id")
      .single();

    if (error || !inserted) {
      console.error("saveDeityFromLore.insert:", error);
      throw new Error(error?.message || "Fehler beim Anlegen der Gottheit.");
    }
    deityId = String((inserted as any).id);
  }

  // 2. Beziehungen aktualisieren (falls übergeben)
  if (params.relationships) {
    const cleanRelations = (params.relationships || [])
      .filter(
        (r) =>
          r &&
          typeof r.target_deity_id === "string" &&
          r.target_deity_id.trim() !== "" &&
          r.target_deity_id.trim() !== deityId
      )
      .map((r) => ({
        world_id: worldId,
        source_deity_id: deityId,
        target_deity_id: r.target_deity_id.trim(),
        relation_type: r.relation_type,
      }));

    // Bestehende Beziehungen dieses Gottes löschen und neu setzen
    const { error: delError } = await (supabase.from("deity_relationships") as any)
      .delete()
      .eq("world_id", worldId)
      .eq("source_deity_id", deityId);

    if (delError) {
      console.error("saveDeityFromLore.deleteRelations:", delError);
      throw new Error(delError.message || "Fehler beim Aktualisieren der Götter-Beziehungen.");
    }

    if (cleanRelations.length > 0) {
      const { error: insError } = await (supabase.from("deity_relationships") as any)
        .insert(cleanRelations);

      if (insError) {
        console.error("saveDeityFromLore.insertRelations:", insError);
        throw new Error(insError.message || "Fehler beim Speichern der Götter-Beziehungen.");
      }
    }
  }

  // 3. Nach Fertigstellung der Gottheit automatisch eine Weltenbau-Aufgabe anlegen:
  //    "Religion zu [Gottheit] erstellen" (für alle Gottheiten, auch bei Updates).
  try {
    await createWorldTask({
      world_id: worldId,
      type: "religion",
      proposed_name: trimmedName,
      description: `Religion zu ${trimmedName} erstellen`,
      status: "pending",
    });
  } catch (taskError) {
    // Fehler beim Anlegen der Aufgabe sollen die Gottheit nicht blockieren
    console.error("saveDeityFromLore.createWorldTask:", taskError);
  }

  // 4. Revalidate relevante Pfade
  revalidatePath(`/dashboard/worlds/${worldId}/lore`);
}

