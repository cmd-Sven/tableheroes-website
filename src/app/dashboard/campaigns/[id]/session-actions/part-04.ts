/**
 * session-actions — part 4: archiveSession, endSession, expirePastScheduledSessionsForCampaign.
 */
"use server";

import {
  normalizeStringIds,
  normalizeChronicleSnapshot,
} from "./_shared";

import { randomBytes } from "crypto";
import { createAdminClient, createClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { serializeForClient } from "@/src/lib/serialize-for-flight";
import { canEditSessionSchedule, isSessionStatusLive, isSessionStatusScheduled, isSessionStatusTerminal } from "@/src/lib/session-status";
import { isStaleLiveSession } from "@/src/lib/session-focus";
import { findLatestPublishedPlayerRecap } from "@/src/lib/session-chronicle/latest-published-recap";
import { sendMessage } from "@/src/lib/actions/message-actions";
import { stopTranscriptionRecording } from "@/src/lib/session-chronicle/transcription-server";
import { schedulePendingTranscriptionChunksProcessing } from "@/src/lib/session-chronicle/process-chunk";

export async function archiveSession(
  sessionId: string,
  campaignId: string,
  sessionName?: string | null,
  /** true z. B. bei expirePastScheduledSessionsForCampaign während RSC-Render — kein revalidatePath. */
  skipRevalidate = false,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const { data: sessionRaw, error: sessionError } = await (supabase.from(
    "sessions",
  ) as any)
    .select("id, campaign_id, title, start_time")
    .eq("id", sessionId)
    .single();

  const session = sessionRaw as {
    id: string;
    campaign_id: string;
    title: string | null;
    start_time: string | null;
  } | null;

  if (sessionError || !session) {
    throw new Error("Session nicht gefunden.");
  }

  if (String(session.campaign_id) !== String(campaignId)) {
    throw new Error("Session gehört nicht zu dieser Kampagne.");
  }

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id, owner_id")
    .eq("id", campaignId)
    .single();

  const campaign = campaignRaw as {
    id: string;
    gm_id?: string | null;
    owner_id?: string | null;
  } | null;

  if (!isCampaignGm(campaign, user.id)) {
    throw new Error("Nur der GM kann eine Session archivieren.");
  }

  const { data: liveStateRaw } = await (supabase.from(
    "session_live_states",
  ) as any)
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  const liveState = (liveStateRaw ?? {}) as Record<string, unknown>;
  const visibleNpcIds = normalizeStringIds(liveState.visible_npc_ids);
  const locationId =
    liveState.current_location_lore_id != null
      ? String(liveState.current_location_lore_id)
      : null;

  const reputationTouchedNpcIds = new Set<string>();
  if (session.start_time) {
    const { data: touchedRepRows } = await (supabase.from(
      "campaign_npc_reputation",
    ) as any)
      .select("npc_id")
      .eq("campaign_id", campaignId)
      .gte("updated_at", session.start_time);

    for (const row of (touchedRepRows as Array<{ npc_id: string }> | null) ?? []) {
      reputationTouchedNpcIds.add(String(row.npc_id));
    }
  }

  const archiveNpcIds = Array.from(
    new Set([...visibleNpcIds, ...reputationTouchedNpcIds]),
  );

  const reputationScoreByNpc = new Map<string, number>();
  if (archiveNpcIds.length > 0) {
    const { data: repScoreRows } = await (supabase.from(
      "campaign_npc_reputation",
    ) as any)
      .select("npc_id, reputation_score")
      .eq("campaign_id", campaignId)
      .in("npc_id", archiveNpcIds);

    for (const row of (repScoreRows as Array<{
      npc_id: string;
      reputation_score: number;
    }> | null) ?? []) {
      reputationScoreByNpc.set(
        String(row.npc_id),
        Number(row.reputation_score ?? 0),
      );
    }
  }

  let encounteredNpcs: Array<{
    id: string;
    name: string;
    reputation_score: number;
  }> = [];
  if (visibleNpcIds.length > 0) {
    const { data: npcRows } = await (supabase.from("npcs") as any)
      .select("id, name")
      .in("id", visibleNpcIds);
    encounteredNpcs = ((npcRows as Array<{ id: string; name: string }> | null) ?? [])
      .map((npc) => ({
        id: String(npc.id),
        name: String(npc.name ?? "Unbekannt"),
        reputation_score: reputationScoreByNpc.get(String(npc.id)) ?? 0,
      }));
  }

  let visitedLocations: Array<{ id: string | null; name: string }> = [];
  if (locationId) {
    const { data: locationRow } = await (supabase.from("world_lore") as any)
      .select("id, name")
      .eq("id", locationId)
      .maybeSingle();
    if (locationRow) {
      visitedLocations = [{
        id: String((locationRow as any).id),
        name: String((locationRow as any).name ?? "Unbekannter Ort"),
      }];
    }
  } else if (liveState.current_location) {
    visitedLocations = [{
      id: null,
      name: String(liveState.current_location),
    }];
  }

  const chronicleSnapshot = normalizeChronicleSnapshot(
    liveState.system_logs,
    liveState.journal_text,
  );
  const { buildSceneGalleryForSession, linkSceneAppearancesToArchive } = await import(
    "../scene-media-actions"
  );
  const sceneGallery = await buildSceneGalleryForSession(sessionId);
  const archivedAt = new Date().toISOString();
  const fallbackSessionName =
    session.title ||
    sessionName ||
    (session.start_time
      ? `Session vom ${new Intl.DateTimeFormat("de-DE").format(new Date(session.start_time))}`
      : "Unbenannte Session");

  const { data: archiveRaw, error: archiveError } = await (supabase.from(
    "session_archives",
  ) as any)
    .upsert(
      {
        campaign_id: campaignId,
        session_id: sessionId,
        session_name: sessionName?.trim() || fallbackSessionName,
        archived_at: archivedAt,
        chronicle_snapshot: chronicleSnapshot,
        encountered_npcs: encounteredNpcs,
        visited_locations: visitedLocations,
        scene_gallery: sceneGallery,
      },
      { onConflict: "session_id" },
    )
    .select("*")
    .single();

  if (archiveError || !archiveRaw) {
    throw new Error(archiveError?.message || "Session konnte nicht archiviert werden.");
  }

  const archive = archiveRaw as { id: string };

  await linkSceneAppearancesToArchive(sessionId, archive.id);

  try {
    const { seedPlayerRecapDraftForArchive } = await import("../player-recap-actions");
    await seedPlayerRecapDraftForArchive(supabase, {
      id: archive.id,
      campaign_id: campaignId,
      session_id: sessionId,
      encountered_npcs: encounteredNpcs,
      visited_locations: visitedLocations,
    });
  } catch (recapErr) {
    console.warn("[archiveSession] Spieler-Chronik-Entwurf:", recapErr);
  }

  if (archiveNpcIds.length > 0) {
    const reputationRows = archiveNpcIds.map((npcId) => ({
      campaign_id: campaignId,
      npc_id: npcId,
      reputation_score: reputationScoreByNpc.get(npcId) ?? 0,
      last_seen_session_id: archive.id,
      last_seen_location_id: locationId,
      last_seen_at: archivedAt,
    }));

    const admin = createAdminClient();
    const { error: reputationError } = await (admin.from(
      "campaign_npc_reputation",
    ) as any).upsert(reputationRows, {
      onConflict: "campaign_id,npc_id",
    });

    if (reputationError) {
      throw new Error(reputationError.message);
    }
  }

  const { error: liveResetError } = await (supabase.from(
    "session_live_states",
  ) as any)
    .update({
      visible_npc_ids: [],
      visible_faction_ids: [],
      is_combat_mode: false,
      current_turn_index: 0,
      system_logs: [],
      journal_text: null,
    })
    .eq("session_id", sessionId);

  if (liveResetError) {
    throw new Error(liveResetError.message);
  }

  const { error: combatCleanupError } = await ((supabase as any).from(
    "combat_participants",
  ) as any)
    .delete()
    .eq("session_id", sessionId);

  if (combatCleanupError) {
    throw new Error(combatCleanupError.message);
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  return serializeForClient(archiveRaw) as any;
}

// ============================================================================
// End Session (Archive Journal & Mark as Completed)
// ============================================================================
export async function endSession(sessionId: string, skipRevalidate = false) {
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  // 2. Load Session (with campaign)
  const { data: sessionRaw, error: sessionError } = await (supabase.from("sessions") as any)
    .select("id, campaign_id, title, status")
    .eq("id", sessionId)
    .single();

  // Expliziter Cast gegen 'never'
  const session = sessionRaw as { id: string; campaign_id: string; title: string | null; status: string } | null;

  if (sessionError || !session) {
    console.error("End Session Error (Session Load):", sessionError);
    throw new Error("Session nicht gefunden.");
  }

  // 3. GM Check
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id, owner_id")
    .eq("id", (session as any).campaign_id)
    .single();

  // Typ-Sicherung gegen 'never'
  const campaign = campaignRaw as {
    id: string;
    gm_id?: string | null;
    owner_id?: string | null;
  } | null;

  if (!isCampaignGm(campaign, user.id)) {
    throw new Error("Nur der GM kann eine Session beenden.");
  }

  if (isSessionStatusLive(session.status)) {
    await stopTranscriptionRecording(supabase, sessionId);
    schedulePendingTranscriptionChunksProcessing(sessionId);
  }

  // 4. Archive live state before cleanup/close.
  await archiveSession(
    sessionId,
    (session as any).campaign_id,
    (session as any).title || "Unbenannte Session",
  );

  // 5. Close Session (status + end_time)
  const { error: closeError } = await (supabase.from("sessions") as any)
    .update({ status: "Completed", end_time: new Date().toISOString() })
    .eq("id", sessionId);

  if (closeError) {
    console.error("End Session Error (Close Session):", closeError);
    throw new Error(closeError.message);
  }

  // Revalidate nur Kampagne; /session/ nicht invalidieren (Digest bei offener Oberfläche).
  if (!skipRevalidate && (session as any).campaign_id) {
    revalidatePath(`/dashboard/campaigns/${(session as any).campaign_id}`);
  }

  return { success: true, campaignId: (session as any).campaign_id };
}

/**
 * GM: Verwaiste Live-Sessions (48h+) werden still beendet.
 * Geplante, nie gestartete Termine werden NICHT automatisch archiviert —
 * sie bleiben bis zu {@link SCHEDULED_NOT_STARTED_GRACE_HOURS}h startbar, danach im Archiv-Bereich der UI.
 */
export async function expirePastScheduledSessionsForCampaign(
  campaignId: string,
): Promise<{ closedCount: number; staleLiveCount: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { closedCount: 0, staleLiveCount: 0 };

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id, owner_id")
    .eq("id", campaignId)
    .single();

  const campaign = campaignRaw as {
    id: string;
    gm_id?: string | null;
    owner_id?: string | null;
  } | null;

  if (!isCampaignGm(campaign, user.id)) return { closedCount: 0, staleLiveCount: 0 };

  const { data: rows } = await (supabase.from("sessions") as any)
    .select("id, status, start_time")
    .eq("campaign_id", campaignId);

  const now = new Date();
  const allRows = (rows as { id: string; status: string; start_time: string }[]) || [];

  const staleLive = allRows.filter((r) =>
    isSessionStatusLive(r.status) &&
    isStaleLiveSession(
      {
        status: String(r.status ?? ""),
        start_time: String(r.start_time ?? ""),
      },
      now,
    ),
  );

  let closedCount = 0;

  let staleLiveCount = 0;
  for (const r of staleLive) {
    try {
      await endSession(String(r.id), true);
      staleLiveCount += 1;
    } catch (e) {
      console.warn("[expirePastScheduledSessionsForCampaign] endSession (stale live):", r.id, e);
    }
  }

  // Kein revalidatePath hier: läuft oft während loadCampaignDetailPageData (RSC) — würde Next.js verbieten.
  return { closedCount, staleLiveCount };
}

// ============================================================================
// Update Session (GM only)
// ============================================================================