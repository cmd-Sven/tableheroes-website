"use server";

import { createClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import {
  FAP_DAILY_TOTAL,
  fapAllocationsToJson,
  maxNonSleepFapBudget,
  parseFapAllocations,
  requiredSleepFap,
  sleepFapSum,
  nonSleepFapSum,
  type FapAllocationLine,
  type FapAllocationsMap,
} from "@/src/lib/downtime-fap-types";

type SessionCtx = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  campaignId: string;
  isGM: boolean;
};

async function loadSessionContext(sessionId: string): Promise<SessionCtx> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: sessionRaw, error: sessionError } = await supabase
    .from("sessions")
    .select("id, campaign_id")
    .eq("id", sessionId)
    .single();

  if (sessionError || !sessionRaw) {
    throw new Error("Session nicht gefunden.");
  }

  const session = sessionRaw as { id: string; campaign_id: string };
  const { data: campaignRaw } = await supabase
    .from("campaigns")
    .select("id, gm_id, owner_id")
    .eq("id", session.campaign_id)
    .single();

  const campaign = campaignRaw as {
    id: string;
    gm_id?: string | null;
    owner_id?: string | null;
  } | null;
  const isGM = isCampaignGm(campaign, user.id);

  if (!isGM) {
    const { data: memberRaw } = await supabase
      .from("campaign_members")
      .select("id")
      .eq("campaign_id", session.campaign_id)
      .eq("user_id", user.id)
      .in("status", ["Approved", "Active"])
      .maybeSingle();

    if (!memberRaw) {
      throw new Error("Kein Zugriff auf diese Session.");
    }
  }

  return { supabase, userId: user.id, campaignId: session.campaign_id, isGM };
}

async function fetchPlayerCharacterIds(
  supabase: SessionCtx["supabase"],
  campaignId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("characters")
    .select("id")
    .eq("campaign_id", campaignId)
    .not("user_id", "is", null);

  if (error) {
    console.error("fetchPlayerCharacterIds", error);
    return [];
  }

  return ((data ?? []) as { id: string }[]).map((r) => String(r.id));
}

function normalizeAllocationsInput(raw: FapAllocationLine[]): FapAllocationLine[] {
  return raw.map((line) => ({
    activity: String(line.activity ?? "").trim() || "Aktion",
    fap: Math.max(0, Math.round(Number(line.fap) || 0)),
    targetItemId:
      line.targetItemId && String(line.targetItemId).trim().length >= 20
        ? String(line.targetItemId).trim()
        : undefined,
  }));
}

export async function startDowntime(
  sessionId: string,
  totalDays: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const ctx = await loadSessionContext(sessionId);
    if (!ctx.isGM) {
      return { ok: false, error: "Nur der Spielleiter kann eine Reise starten." };
    }

    const days = Math.max(1, Math.min(60, Math.round(Number(totalDays) || 1)));
    const characterIds = await fetchPlayerCharacterIds(ctx.supabase, ctx.campaignId);
    const initial: FapAllocationsMap = {};
    for (const id of characterIds) {
      initial[id] = { status: "planning", allocations: [] };
    }

    const { error } = await (ctx.supabase as any).from("session_live_states").update({
      downtime_active: true,
      downtime_type: "travel",
      downtime_current_day: 1,
      downtime_total_days: days,
      fap_allocations: fapAllocationsToJson(initial),
    }).eq("session_id", sessionId);

    if (error) {
      return { ok: false, error: error.message ?? "Live-State konnte nicht aktualisiert werden." };
    }
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler.";
    return { ok: false, error: msg };
  }
}

export async function endDowntime(
  sessionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const ctx = await loadSessionContext(sessionId);
    if (!ctx.isGM) {
      return { ok: false, error: "Nur der Spielleiter kann die Reise beenden." };
    }

    const { error } = await (ctx.supabase as any).from("session_live_states").update({
      downtime_active: false,
      fap_allocations: fapAllocationsToJson({}),
    }).eq("session_id", sessionId);

    if (error) {
      return { ok: false, error: error.message ?? "Live-State konnte nicht aktualisiert werden." };
    }
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler.";
    return { ok: false, error: msg };
  }
}

export async function submitFapAllocation(
  sessionId: string,
  characterId: string,
  allocations: FapAllocationLine[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const ctx = await loadSessionContext(sessionId);
    const charId = String(characterId).trim();
    if (!charId) {
      return { ok: false, error: "Charakter fehlt." };
    }

    const { data: liveRaw, error: liveError } = await (ctx.supabase as any)
      .from("session_live_states")
      .select("downtime_active, fap_allocations")
      .eq("session_id", sessionId)
      .single();

    if (liveError || !liveRaw || !(liveRaw as { downtime_active?: boolean }).downtime_active) {
      return { ok: false, error: "Aktuell keine aktive Reise / Downtime." };
    }

    const { data: chRaw, error: chError } = await ctx.supabase
      .from("characters")
      .select("id, user_id, campaign_id, sleep_debt_fap, starvation_days")
      .eq("id", charId)
      .single();

    if (chError || !chRaw) {
      return { ok: false, error: "Charakter nicht gefunden." };
    }

    const ch = chRaw as {
      id: string;
      user_id: string | null;
      campaign_id: string;
      sleep_debt_fap: number | null;
      starvation_days: number | null;
    };

    if (ch.campaign_id !== ctx.campaignId) {
      return { ok: false, error: "Charakter gehört nicht zu dieser Kampagne." };
    }

    if (!ctx.isGM && ch.user_id !== ctx.userId) {
      return { ok: false, error: "Du kannst nur deinen eigenen Charakter planen." };
    }

    const normalized = normalizeAllocationsInput(allocations);
    const total = normalized.reduce((s, a) => s + a.fap, 0);
    if (total !== FAP_DAILY_TOTAL) {
      return { ok: false, error: `Genau ${FAP_DAILY_TOTAL} FAP pro Tag erforderlich (aktuell: ${total}).` };
    }

    const debt = Number(ch.sleep_debt_fap ?? 0);
    const needSleep = requiredSleepFap(debt);
    const sleepSum = sleepFapSum(normalized);
    if (sleepSum < needSleep) {
      return { ok: false, error: `Mindestens ${needSleep} FAP müssen auf „Schlaf“ entfallen.` };
    }

    const starvationDays = Math.max(0, Math.round(Number(ch.starvation_days ?? 0)));
    const maxNonSleep = maxNonSleepFapBudget(needSleep, starvationDays);
    const nonSleepSum = nonSleepFapSum(normalized);
    if (nonSleepSum > maxNonSleep) {
      return {
        ok: false,
        error: `Hunger-Malus: höchstens ${maxNonSleep} FAP außerhalb von „Schlaf“ (aktuell ${nonSleepSum}).`,
      };
    }

    for (const line of normalized) {
      if (line.activity === "Item studieren" && !line.targetItemId) {
        return { ok: false, error: "Bei „Item studieren“ bitte ein Ziel-Item wählen." };
      }
    }

    for (const line of normalized) {
      if (!line.targetItemId) continue;
      const { data: itemRaw, error: itemErr } = await (ctx.supabase as any)
        .from("character_items")
        .select("id, character_id, target_fap, current_fap")
        .eq("id", line.targetItemId)
        .eq("character_id", charId)
        .eq("is_deleted", false)
        .maybeSingle();

      if (itemErr || !itemRaw) {
        return { ok: false, error: "Ungültiges Studien-Item." };
      }
      const item = itemRaw as { target_fap: number; current_fap: number };
      if (Number(item.target_fap ?? 0) <= 0) {
        return { ok: false, error: "Studien-Item hat kein FAP-Ziel." };
      }
    }

    const currentMap = parseFapAllocations(
      (liveRaw as { fap_allocations?: import("@/src/lib/database.types").Json }).fap_allocations,
    );
    const nextMap: FapAllocationsMap = { ...currentMap, [charId]: { status: "ready", allocations: normalized } };

    const { error: upErr } = await (ctx.supabase as any).from("session_live_states").update({
      fap_allocations: fapAllocationsToJson(nextMap),
    }).eq("session_id", sessionId);

    if (upErr) {
      return { ok: false, error: upErr.message ?? "Speichern fehlgeschlagen." };
    }
    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler.";
    return { ok: false, error: msg };
  }
}

export async function nextDowntimeDay(
  sessionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const ctx = await loadSessionContext(sessionId);
    if (!ctx.isGM) {
      return { ok: false, error: "Nur der Spielleiter kann den nächsten Tag starten." };
    }

    const { data: liveRaw, error: liveError } = await (ctx.supabase as any)
      .from("session_live_states")
      .select(
        "downtime_active, downtime_current_day, downtime_total_days, fap_allocations",
      )
      .eq("session_id", sessionId)
      .single();

    if (liveError || !liveRaw) {
      return { ok: false, error: "Live-State nicht gefunden." };
    }

    const live = liveRaw as {
      downtime_active: boolean;
      downtime_current_day: number;
      downtime_total_days: number;
      fap_allocations: unknown;
    };

    if (!live.downtime_active) {
      return { ok: false, error: "Keine aktive Reise." };
    }

    const map = parseFapAllocations(live.fap_allocations as any);

    for (const [charId, state] of Object.entries(map)) {
      if (state.status !== "ready") continue;

      const { data: chRaw } = await ctx.supabase
        .from("characters")
        .select("sleep_debt_fap")
        .eq("id", charId)
        .single();

      const debt = Number((chRaw as { sleep_debt_fap?: number } | null)?.sleep_debt_fap ?? 0);
      const sleepSum = sleepFapSum(state.allocations);
      const need = requiredSleepFap(debt);
      const nextDebt = sleepSum < need ? debt + 3 : 0;

      await (ctx.supabase as any)
        .from("characters")
        .update({ sleep_debt_fap: nextDebt })
        .eq("id", charId);

      const itemDeltas = new Map<string, number>();
      for (const line of state.allocations) {
        if (!line.targetItemId || line.fap <= 0) continue;
        const prev = itemDeltas.get(line.targetItemId) ?? 0;
        itemDeltas.set(line.targetItemId, prev + line.fap);
      }

      for (const [itemId, addRaw] of itemDeltas) {
        const { data: itemRow } = await (ctx.supabase as any)
          .from("character_items")
          .select("id, character_id, target_fap, current_fap")
          .eq("id", itemId)
          .eq("character_id", charId)
          .eq("is_deleted", false)
          .maybeSingle();

        if (!itemRow) continue;
        const row = itemRow as { target_fap: number; current_fap: number };
        const cap = Math.max(0, Number(row.target_fap ?? 0));
        const cur = Math.max(0, Number(row.current_fap ?? 0));
        const add = Math.max(0, Math.round(addRaw));
        const next = Math.min(cap, cur + add);
        if (next !== cur) {
          await (ctx.supabase as any)
            .from("character_items")
            .update({ current_fap: next })
            .eq("id", itemId)
            .eq("character_id", charId);
        }
      }
    }

    const characterIds = await fetchPlayerCharacterIds(ctx.supabase, ctx.campaignId);
    for (const rid of characterIds) {
      const { data: survRow } = await ctx.supabase
        .from("characters")
        .select("rations_count, starvation_days")
        .eq("id", rid)
        .single();

      const row = survRow as {
        rations_count?: number | null;
        starvation_days?: number | null;
      } | null;

      const r = Math.min(10, Math.max(0, Math.round(Number(row?.rations_count ?? 0))));
      const s = Math.max(0, Math.round(Number(row?.starvation_days ?? 0)));

      if (r > 0) {
        await (ctx.supabase as any)
          .from("characters")
          .update({ rations_count: r - 1, starvation_days: 0 })
          .eq("id", rid);
      } else {
        await (ctx.supabase as any)
          .from("characters")
          .update({ starvation_days: s + 1 })
          .eq("id", rid);
      }
    }

    const nextDay = Math.max(1, Number(live.downtime_current_day ?? 1) + 1);
    const total = Math.max(1, Number(live.downtime_total_days ?? 1));
    const stillActive = nextDay <= total;
    const downtimeDayToStore = stillActive ? nextDay : Math.min(nextDay, total);

    const fresh: FapAllocationsMap = {};
    for (const id of characterIds) {
      fresh[id] = { status: "planning", allocations: [] };
    }

    const { error: upErr } = await (ctx.supabase as any).from("session_live_states").update({
      downtime_current_day: downtimeDayToStore,
      downtime_active: stillActive,
      fap_allocations: fapAllocationsToJson(fresh),
    }).eq("session_id", sessionId);

    if (upErr) {
      return { ok: false, error: upErr.message ?? "Konnte nächsten Tag nicht speichern." };
    }

    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler.";
    return { ok: false, error: msg };
  }
}

export async function distributeRations(
  sessionId: string,
  distributionMap: Record<string, number>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const ctx = await loadSessionContext(sessionId);
    if (!ctx.isGM) {
      return { ok: false, error: "Nur der Spielleiter kann Rationen verteilen." };
    }

    for (const [charId, raw] of Object.entries(distributionMap)) {
      const add = Math.max(0, Math.round(Number(raw) || 0));
      if (add <= 0) continue;

      const id = String(charId).trim();
      if (id.length < 20) continue;

      const { data: row, error } = await ctx.supabase
        .from("characters")
        .select("id, campaign_id, rations_count")
        .eq("id", id)
        .maybeSingle();

      if (error || !row) continue;

      const ch = row as { campaign_id: string; rations_count: number | null };
      if (ch.campaign_id !== ctx.campaignId) continue;

      const cur = Math.min(10, Math.max(0, Math.round(Number(ch.rations_count ?? 0))));
      const next = Math.min(10, cur + add);
      if (next === cur) continue;

      const { error: upErr } = await (ctx.supabase as any)
        .from("characters")
        .update({ rations_count: next })
        .eq("id", id);

      if (upErr) {
        return { ok: false, error: upErr.message ?? "Rationen konnten nicht gespeichert werden." };
      }
    }

    return { ok: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unbekannter Fehler.";
    return { ok: false, error: msg };
  }
}
