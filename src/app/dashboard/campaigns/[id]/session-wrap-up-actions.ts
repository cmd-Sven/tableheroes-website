"use server";

import { createClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import { revalidatePath } from "next/cache";
import type { SessionWrapUpPreview } from "@/src/lib/session-wrap-up/types";
import { loadSessionWrapUpPreview } from "@/src/lib/session-wrap-up/load-session-wrap-up";
import { settleSessionParticipationRewards as settleParticipationRewardsImpl } from "@/src/lib/session-wrap-up/settle-participation-rewards";
import type { SettleSessionParticipationInput } from "@/src/lib/session-wrap-up/participation-types";
import { ensureSessionPrepLiveState } from "./session-actions";
import { resilientUpdateSessionLiveState } from "@/src/lib/session-live-state-resilient";
import { cloneSessionTableState } from "@/src/lib/session-wrap-up/carry-over-table-state";

function normalizeStringIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String).filter((id) => id.length > 0);
}

async function assertGmCarryOverSessions(
  sourceSessionId: string,
  targetSessionId: string,
): Promise<
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; campaignId: string }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Nicht authentifiziert." };

  const { data: sessionsRaw } = await (supabase.from("sessions") as any)
    .select("id, campaign_id, status")
    .in("id", [sourceSessionId, targetSessionId]);

  const sessions = (sessionsRaw ?? []) as Array<{
    id: string;
    campaign_id: string;
    status: string;
  }>;

  if (sessions.length !== 2) {
    return { ok: false, error: "Session nicht gefunden." };
  }

  const source = sessions.find((s) => s.id === sourceSessionId);
  const target = sessions.find((s) => s.id === targetSessionId);
  if (!source || !target) {
    return { ok: false, error: "Session nicht gefunden." };
  }
  if (source.campaign_id !== target.campaign_id) {
    return { ok: false, error: "Termine gehören nicht zur gleichen Kampagne." };
  }

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("gm_id, owner_id")
    .eq("id", source.campaign_id)
    .single();

  if (!isCampaignGm(campaignRaw as { gm_id?: string | null; owner_id?: string | null }, user.id)) {
    return { ok: false, error: "Nur der GM kann Einstellungen übernehmen." };
  }

  return { ok: true, supabase, campaignId: source.campaign_id };
}

export async function getSessionWrapUpPreview(
  sessionId: string,
): Promise<SessionWrapUpPreview | null> {
  return loadSessionWrapUpPreview(sessionId);
}

export async function settleSessionParticipationRewards(
  sessionId: string,
  input: SettleSessionParticipationInput,
) {
  return settleParticipationRewardsImpl(sessionId, input);
}

/** Bühne, Wetter & Szene von einer Session in den nächsten Termin übernehmen. */
export async function carryOverSessionBoardState(
  sourceSessionId: string,
  targetSessionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await assertGmCarryOverSessions(sourceSessionId, targetSessionId);
  if (!auth.ok) return auth;
  const { supabase, campaignId } = auth;

  const { data: sourceLiveRaw } = await (supabase.from("session_live_states") as any)
    .select("*")
    .eq("session_id", sourceSessionId)
    .maybeSingle();

  if (!sourceLiveRaw) {
    return { ok: false, error: "Kein Live-Zustand zum Übernehmen vorhanden." };
  }

  const sourceLive = sourceLiveRaw as Record<string, unknown>;

  await ensureSessionPrepLiveState(targetSessionId);

  const carryPatch: Record<string, unknown> = {
    visible_npc_ids: normalizeStringIds(sourceLive.visible_npc_ids),
    visible_faction_ids: normalizeStringIds(sourceLive.visible_faction_ids),
    weather: sourceLive.weather ?? "Klar",
    weather_preset: sourceLive.weather_preset ?? null,
    weather_intensity: sourceLive.weather_intensity ?? null,
    weather_temperature: sourceLive.weather_temperature ?? null,
    temperature: sourceLive.temperature ?? "normal",
    temperature_value: Number(sourceLive.temperature_value ?? 15),
    current_time: sourceLive.current_time ?? "Tag",
    current_location: sourceLive.current_location ?? null,
    current_location_lore_id: sourceLive.current_location_lore_id ?? null,
    current_location_id: sourceLive.current_location_id ?? null,
    in_game_date: sourceLive.in_game_date ?? null,
    in_game_time: sourceLive.in_game_time ?? null,
    background_url: sourceLive.background_url ?? null,
    is_background_manual_override: Boolean(sourceLive.is_background_manual_override ?? false),
    is_combat_mode: false,
    current_turn_index: 0,
    journal_text: null,
    system_logs: [],
    active_shop_id: null,
    active_merchant_npc_id: null,
    current_loot_id: null,
    loot_hide_npcs: false,
  };

  const { error } = await resilientUpdateSessionLiveState(
    supabase,
    targetSessionId,
    carryPatch,
  );

  if (error) {
    return { ok: false, error: error.message ?? "Live-State konnte nicht übernommen werden." };
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath(`/session/${targetSessionId}`);
  return { ok: true };
}

/** Tisch / Map-Zustand (Battlemaps, Token, FoW, Zeichnungen, Weltkarten-Overlays) übernehmen. */
export async function carryOverSessionTableState(
  sourceSessionId: string,
  targetSessionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await assertGmCarryOverSessions(sourceSessionId, targetSessionId);
  if (!auth.ok) return auth;
  const { supabase, campaignId } = auth;

  await ensureSessionPrepLiveState(targetSessionId);

  const result = await cloneSessionTableState({
    supabase,
    sourceSessionId,
    targetSessionId,
    campaignId,
  });

  if (!result.ok) return result;

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath(`/session/${targetSessionId}`);
  return { ok: true };
}
