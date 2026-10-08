"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { MeterEffectSchema, type MeterEffect } from "@/src/lib/npcs/city-simulation";
import { z } from "zod";

const EndWhenSchema = z.object({
  meter: MeterEffectSchema.shape.meter,
  op: z.enum(["gt", "lt"]),
  value: z.number().min(0).max(100),
});

export type CitySimEventInput = {
  id?: string;
  worldId: string;
  title: string;
  body: string;
  scope: "city" | "district" | "sector";
  districtId: string | null;
  sectorLabel: string | null;
  effects: MeterEffect[];
  durationDays: number | null;
  startOn: string;
  endWhen: { meter: MeterEffect["meter"]; op: "gt" | "lt"; value: number } | null;
};

async function assertGm(worldId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  const { data: world } = await (supabase.from("worlds") as any).select("gm_id").eq("id", worldId).maybeSingle();
  if (!world || String(world.gm_id) !== user.id) throw new Error("Nur der Spielleiter dieser Welt kann das ändern.");
  return supabase;
}

export async function layNpcCityCard(worldId: string, npcId: string, cardId: string) {
  const supabase = await assertGm(worldId);
  const { data: npc } = await (supabase.from("npcs") as any)
    .select("id, world_id, city_card_plays, city_event_deck")
    .eq("id", npcId)
    .maybeSingle();
  if (!npc || String(npc.world_id) !== worldId) throw new Error("NPC nicht gefunden.");
  const deck = Array.isArray(npc.city_event_deck) ? npc.city_event_deck : [];
  if (!deck.some((card: { id?: string }) => card?.id === cardId)) throw new Error("Diese Karte gehört nicht zum NPC.");
  const plays = Array.isArray(npc.city_card_plays) ? npc.city_card_plays : [];
  const startedOn = new Date().toISOString().slice(0, 10);
  const next = [...plays, { cardId, startedOn }];
  const { error } = await (supabase.from("npcs") as any).update({ city_card_plays: next }).eq("id", npcId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/worlds/${worldId}`);
}

export async function saveCitySimEvent(input: CitySimEventInput) {
  const title = input.title.trim();
  if (!title) throw new Error("Das Stadtereignis braucht einen Titel.");
  if (!input.durationDays && !input.endWhen) {
    throw new Error("Bitte eine Wirkzeit oder einen Schwellenwert festlegen.");
  }
  if (input.scope !== "city" && !input.districtId) throw new Error("Bitte ein Viertel wählen.");
  if (input.scope === "sector" && !input.sectorLabel?.trim()) throw new Error("Bitte den Sektor benennen.");
  const effects = z.array(MeterEffectSchema).max(4).parse(input.effects);
  const endWhen = input.endWhen ? EndWhenSchema.parse(input.endWhen) : null;
  const supabase = await assertGm(input.worldId);
  const row = {
    world_id: input.worldId,
    title,
    body: input.body.trim(),
    scope: input.scope,
    district_id: input.scope === "city" ? null : input.districtId,
    sector_label: input.scope === "sector" ? input.sectorLabel?.trim() ?? null : null,
    effects,
    duration_days: input.durationDays,
    start_on: input.startOn,
    end_when: endWhen,
    active: true,
    updated_at: new Date().toISOString(),
  };
  const query = input.id
    ? (supabase as any).from("city_sim_events").update(row).eq("id", input.id).eq("world_id", input.worldId)
    : (supabase as any).from("city_sim_events").insert(row);
  const { error } = await query;
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/worlds/${input.worldId}`);
}

export async function setCitySimEventActive(worldId: string, eventId: string, active: boolean) {
  const supabase = await assertGm(worldId);
  const { error } = await (supabase as any).from("city_sim_events")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", eventId)
    .eq("world_id", worldId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/worlds/${worldId}`);
}

export async function listCitySimEvents(worldId: string) {
  const supabase = await assertGm(worldId);
  const { data, error } = await (supabase as any).from("city_sim_events")
    .select("id, title, body, scope, district_id, sector_label, effects, duration_days, start_on, end_when, active")
    .eq("world_id", worldId)
    .order("start_on", { ascending: false });
  if (error) return [];
  return (data ?? []) as Array<{
    id: string;
    title: string;
    body: string;
    scope: "city" | "district" | "sector";
    district_id: string | null;
    sector_label: string | null;
    effects: MeterEffect[];
    duration_days: number | null;
    start_on: string;
    end_when: CitySimEventInput["endWhen"];
    active: boolean;
  }>;
}
