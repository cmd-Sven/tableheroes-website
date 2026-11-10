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
  /** Optionales Kartenmotiv (öffentliche URL). */
  imageUrl?: string | null;
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
  const imageUrl = (input.imageUrl ?? "").trim() || null;
  const row = {
    world_id: input.worldId,
    title,
    body: input.body.trim(),
    image_url: imageUrl,
    scope: input.scope,
    district_id: input.scope === "city" ? null : input.districtId,
    sector_label: input.scope === "sector" ? input.sectorLabel?.trim() ?? null : null,
    effects,
    duration_days: input.durationDays,
    end_when: endWhen,
    // Neu: inaktiv in der Hand. Updates behalten active + start_on (Wirkzeit läuft weiter).
    updated_at: new Date().toISOString(),
  };
  const query = input.id
    ? (supabase as any).from("city_sim_events").update(row).eq("id", input.id).eq("world_id", input.worldId)
    : (supabase as any)
        .from("city_sim_events")
        .insert({ ...row, start_on: input.startOn, active: false });
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

/** Ausspielen: aktiv + Starttag setzen (für Wirkzeit). */
export async function activateCitySimEvent(
  worldId: string,
  eventId: string,
  startOn: string,
) {
  const supabase = await assertGm(worldId);
  const { error } = await (supabase as any).from("city_sim_events")
    .update({
      active: true,
      start_on: startOn,
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId)
    .eq("world_id", worldId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/worlds/${worldId}`);
}

const DAY_MS = 86_400_000;

/**
 * Abgelaufene Stadtereignisse (Wirkzeit vorbei am Betrachtungsdatum) wieder
 * inaktiv setzen — sie stehen dann erneut in der Hand zur Verfügung.
 */
export async function deactivateExpiredCitySimEvents(worldId: string, dayIso: string) {
  const supabase = await assertGm(worldId);
  const dayMs = Date.parse(`${dayIso}T12:00:00.000Z`);
  if (!Number.isFinite(dayMs)) return 0;

  const { data, error } = await (supabase as any)
    .from("city_sim_events")
    .select("id, start_on, duration_days")
    .eq("world_id", worldId)
    .eq("active", true);
  if (error || !data?.length) return 0;

  const expiredIds: string[] = [];
  for (const row of data as Array<{ id: string; start_on: string; duration_days: number | null }>) {
    const days = typeof row.duration_days === "number" ? row.duration_days : null;
    if (days == null || days <= 0) continue;
    const startMs = Date.parse(`${String(row.start_on).slice(0, 10)}T12:00:00.000Z`);
    if (!Number.isFinite(startMs)) continue;
    if (dayMs >= startMs + days * DAY_MS) expiredIds.push(String(row.id));
  }
  if (expiredIds.length === 0) return 0;

  const { error: updateError } = await (supabase as any)
    .from("city_sim_events")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("world_id", worldId)
    .in("id", expiredIds);
  if (updateError) throw new Error(updateError.message);
  revalidatePath(`/dashboard/worlds/${worldId}`);
  return expiredIds.length;
}

export async function listCitySimEvents(worldId: string) {
  const supabase = await assertGm(worldId);
  const { data, error } = await (supabase as any)
    .from("city_sim_events")
    .select(
      "id, title, body, image_url, scope, district_id, sector_label, effects, duration_days, start_on, end_when, active",
    )
    .eq("world_id", worldId)
    .order("start_on", { ascending: false });
  if (error) return [];
  return (data ?? []) as Array<{
    id: string;
    title: string;
    body: string;
    image_url: string | null;
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

const KAISER_CATALOG_ID = "npc-kaiser-artheus";

/**
 * Kartenmotiv einer Kaiser-Ereigniskarte im NPC-Deck speichern
 * (aurenfurt_catalog_id = Kaiser). Legt die Karte an, falls sie noch fehlt.
 */
export async function setKaiserEventCardImage(
  worldId: string,
  cardId: string,
  imageUrl: string | null,
) {
  const trimmedCardId = cardId.trim();
  if (!trimmedCardId) throw new Error("Karten-ID fehlt.");
  const supabase = await assertGm(worldId);
  const { data: npc, error: loadError } = await (supabase.from("npcs") as any)
    .select("id, city_event_deck")
    .eq("world_id", worldId)
    .eq("aurenfurt_catalog_id", KAISER_CATALOG_ID)
    .maybeSingle();
  if (loadError) throw new Error(loadError.message);
  if (!npc) throw new Error("Kaiser-NPC nicht in der Welt gefunden.");

  const { KAISER_EVENT_CARDS } = await import(
    "@/src/components/city/aurenfurt/aurenfurt-kaiser-cards"
  );
  const template = KAISER_EVENT_CARDS.find((card) => card.id === trimmedCardId);
  if (!template) throw new Error("Unbekannte Kaiser-Karte.");

  const deck = Array.isArray(npc.city_event_deck)
    ? (npc.city_event_deck as Array<Record<string, unknown>>)
    : [];
  const nextUrl = (imageUrl ?? "").trim() || null;
  let found = false;
  const nextDeck = deck.map((card) => {
    if (String(card.id ?? "") !== trimmedCardId) return card;
    found = true;
    return { ...card, imageUrl: nextUrl };
  });
  if (!found) {
    nextDeck.push({
      id: template.id,
      title: template.title,
      text: template.description,
      sortOrder: nextDeck.length,
      durationDays: template.durationDays,
      range: template.scope === "district" ? "district" : "city",
      extraDistrictIds: template.scope === "palace" ? ["palast"] : [],
      effects: template.effects,
      imageUrl: nextUrl,
    });
  }

  const { error } = await (supabase.from("npcs") as any)
    .update({ city_event_deck: nextDeck })
    .eq("id", npc.id);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/worlds/${worldId}`);
}
