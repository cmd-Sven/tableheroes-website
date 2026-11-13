"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { HISTORY_START } from "@/src/components/city/aurenfurt/aurenfurt-history";
import { addIsoDays } from "@/src/components/city/aurenfurt/aurenfurt-time";
import {
  CITY_ADVANCE_MAX,
  CITY_WEATHER_KINDS,
  isIsoDay,
  parseCityClock,
  type CityClock,
  type CityClockWeather,
} from "@/src/lib/world/city-clock";
import { CITY_METERS, type CityMeter } from "@/src/lib/npcs/city-simulation";

const DISTRICTS = new Set([
  "suedtor",
  "adelsviertel",
  "tempelbezirk",
  "akademieviertel",
  "unterstadt",
  "handwerkerviertel",
  "palast",
]);

export type CityAdvanceEvent = {
  title: string;
  body: string;
  districtId: string | null;
  durationDays: number;
  meter: CityMeter | null;
  delta: number;
};

export type CityAdvanceDay = {
  iso: string;
  weather: CityClockWeather;
  event: CityAdvanceEvent | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) };
  }
  return {};
}

function nearToday(iso: string) {
  const now = new Date();
  const server = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const candidate = Date.parse(`${iso}T00:00:00.000Z`);
  return Number.isFinite(candidate) && Math.abs(candidate - server) <= 2 * 86_400_000;
}

async function worldRow(worldId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");
  const { data: world, error } = await (supabase.from("worlds") as any)
    .select("id, gm_id, blueprint")
    .eq("id", worldId)
    .maybeSingle();
  if (error || !world) throw new Error("Welt nicht gefunden.");
  return { supabase, userId: user.id, world, isGm: String(world.gm_id) === user.id };
}

export async function loadCityClock(worldId: string, wallTodayIso: string): Promise<CityClock & { frozen: boolean }> {
  const { supabase, world, isGm } = await worldRow(worldId);
  const stored = parseCityClock(world.blueprint);
  if (stored) return { ...stored, frozen: true };
  const presentIso = isIsoDay(wallTodayIso) && wallTodayIso >= HISTORY_START && nearToday(wallTodayIso)
    ? wallTodayIso
    : HISTORY_START;
  if (!isGm) return { presentIso, weather: [], frozen: false };
  const clock: CityClock = { presentIso, weather: [] };
  const blueprint = { ...asRecord(world.blueprint), cityClock: clock };
  const { error } = await (supabase.from("worlds") as any).update({ blueprint }).eq("id", worldId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/worlds/${worldId}`);
  return { ...clock, frozen: true };
}

function cleanEvent(event: CityAdvanceEvent | null): CityAdvanceEvent | null {
  if (!event) return null;
  const title = event.title.trim();
  if (!title) return null;
  const districtId = event.districtId && DISTRICTS.has(event.districtId) ? event.districtId : null;
  const durationDays = Math.max(1, Math.min(30, Math.round(event.durationDays) || 1));
  const meter = event.meter && (CITY_METERS as readonly string[]).includes(event.meter) ? event.meter : null;
  const delta = meter ? Math.max(-20, Math.min(20, Math.round(event.delta) || 0)) : 0;
  if (meter && delta === 0) return { title, body: event.body.trim(), districtId, durationDays, meter: null, delta: 0 };
  return { title, body: event.body.trim(), districtId, durationDays, meter, delta };
}

export async function advanceCityClock(worldId: string, days: CityAdvanceDay[]): Promise<CityClock> {
  if (days.length < 1 || days.length > CITY_ADVANCE_MAX) {
    throw new Error(`Es können 1 bis ${CITY_ADVANCE_MAX} Tage vergehen.`);
  }
  const { supabase, world, isGm } = await worldRow(worldId);
  if (!isGm) throw new Error("Nur der Spielleiter kann die Stadttage weiterzählen.");
  const stored = parseCityClock(world.blueprint);
  if (!stored) throw new Error("Die Stadtuhr ist noch nicht angehalten.");

  let cursor = stored.presentIso;
  const accepted: CityAdvanceDay[] = [];
  for (const day of days) {
    const next = addIsoDays(cursor, 1);
    if (day.iso !== next) throw new Error("Die Tage müssen lückenlos auf den Stadttag folgen.");
    if (!(CITY_WEATHER_KINDS as readonly string[]).includes(day.weather.kind)) {
      throw new Error("Unbekanntes Wetter.");
    }
    if (day.weather.origin !== "hand" && day.weather.origin !== "forecast" && day.weather.origin !== "model") {
      throw new Error("Unbekannte Wetterquelle.");
    }
    accepted.push({
      iso: next,
      weather: {
        day: next,
        kind: day.weather.kind,
        tempC: Math.max(-40, Math.min(50, Math.round(day.weather.tempC) || 0)),
        origin: day.weather.origin,
      },
      event: cleanEvent(day.event),
    });
    cursor = next;
  }

  const inserted: string[] = [];
  for (const day of accepted) {
    if (!day.event) continue;
    const effects = day.event.meter ? [{ meter: day.event.meter, delta: day.event.delta }] : [];
    const { data, error } = await (supabase as any)
      .from("city_sim_events")
      .insert({
        world_id: worldId,
        title: day.event.title,
        body: day.event.body,
        image_url: null,
        scope: day.event.districtId ? "district" : "city",
        district_id: day.event.districtId,
        sector_label: null,
        effects,
        duration_days: day.event.durationDays,
        end_when: null,
        start_on: day.iso,
        active: true,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error || !data?.id) {
      if (inserted.length > 0) {
        await (supabase as any).from("city_sim_events").delete().in("id", inserted);
      }
      throw new Error(error?.message || "Das Ereignis konnte nicht gespeichert werden.");
    }
    inserted.push(String(data.id));
  }

  const byDay = new Map(stored.weather.map((entry) => [entry.day, entry]));
  for (const day of accepted) byDay.set(day.iso, day.weather);
  const clock: CityClock = { presentIso: cursor, weather: [...byDay.values()] };
  const blueprint = { ...asRecord(world.blueprint), cityClock: clock };
  const { error } = await (supabase.from("worlds") as any).update({ blueprint }).eq("id", worldId);
  if (error) {
    if (inserted.length > 0) {
      await (supabase as any).from("city_sim_events").delete().in("id", inserted);
    }
    throw new Error(error.message);
  }
  revalidatePath(`/dashboard/worlds/${worldId}`);
  return clock;
}
