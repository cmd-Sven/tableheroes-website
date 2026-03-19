"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

type ReligionRow = {
  id: string;
  world_id: string;
  deity_id: string | null;
  name: string;
  interpretation: string | null;
  priest_title: string | null;
  cleric_title: string | null;
  paladin_title: string | null;
  order_notes: string | null;
  magic_relation: string | null;
  relics: string | null;
  holidays: any;
  important_figures: any;
};

export type ReligionHolidayInput = {
  date: string;
  name: string;
  description: string;
};

export type ReligionImportantFigureInput = {
  name: string;
  title: string;
  description: string;
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
 * Legt eine Religion an oder aktualisiert sie (weltweit eindeutig nach world_id + name).
 * Wird vom Lore-Religions-Wizard aufgerufen.
 */
export async function saveReligionFromLore(params: {
  worldId: string;
  deityId?: string | null;
  name: string;
  interpretation?: string;
  priest_title?: string;
  cleric_title?: string;
  paladin_title?: string;
  order_notes?: string;
  magic_relation?: string;
  relics?: string;
  holidays?: ReligionHolidayInput[];
  important_figures?: ReligionImportantFigureInput[];
}) {
  const supabase = await createClient();
  const worldId = params.worldId;

  await assertWorldGm(supabase, worldId);

  const trimmedName = params.name.trim();
  if (!trimmedName) {
    throw new Error("Name der Religion darf nicht leer sein.");
  }

  const holidays = (params.holidays || [])
    .filter((h) => h && h.name.trim())
    .map((h) => ({
      date: h.date.trim(),
      name: h.name.trim(),
      description: h.description.trim(),
    }));

  const importantFigures = (params.important_figures || [])
    .filter((p) => p && p.name.trim())
    .map((p) => ({
      name: p.name.trim(),
      title: p.title.trim(),
      description: p.description.trim(),
    }));

  const { data: existing } = await (supabase.from("religions") as any)
    .select("id")
    .eq("world_id", worldId)
    .eq("name", trimmedName)
    .maybeSingle();

  const payload: Partial<ReligionRow> = {
    world_id: worldId,
    deity_id: params.deityId ?? null,
    name: trimmedName,
    interpretation: params.interpretation?.trim() || null,
    priest_title: params.priest_title?.trim() || null,
    cleric_title: params.cleric_title?.trim() || null,
    paladin_title: params.paladin_title?.trim() || null,
    order_notes: params.order_notes?.trim() || null,
    magic_relation: params.magic_relation?.trim() || null,
    relics: params.relics?.trim() || null,
    holidays: holidays.length > 0 ? holidays : [],
    important_figures: importantFigures.length > 0 ? importantFigures : [],
  };

  if (existing && (existing as any).id) {
    const { error } = await (supabase.from("religions") as any)
      .update(payload)
      .eq("id", (existing as any).id);

    if (error) {
      console.error("saveReligionFromLore.update:", error);
      throw new Error(error.message || "Fehler beim Aktualisieren der Religion.");
    }
  } else {
    const { error } = await (supabase.from("religions") as any)
      .insert(payload);

    if (error) {
      console.error("saveReligionFromLore.insert:", error);
      throw new Error(error.message || "Fehler beim Anlegen der Religion.");
    }
  }

  revalidatePath(`/dashboard/worlds/${worldId}/lore`);
}

