import { createClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import { isSessionStatusScheduled } from "@/src/lib/session-status";
import { isMissedScheduledSession } from "@/src/lib/session-focus";
import { parseChronicleStateRow } from "@/src/lib/session-chronicle/parse-db";
import {
  countPendingInboxItems,
  inboxItemTitle,
  listChronicleInboxItems,
} from "@/src/lib/session-chronicle/inbox";
import {
  resolveSessionDayPhase,
  sessionDayPhaseLabel,
} from "@/src/lib/session-day-phase";
import type { SessionWrapUpPreview, SessionWrapUpTask } from "./types";
import { getAllAchievements } from "@/src/lib/actions/achievement-actions";
import {
  normalizeUserIdList,
  resolveSessionParticipationPlayers,
} from "@/src/lib/session-participation/resolve-participants";
import { SESSION_PARTICIPATION_BASE_POINTS } from "@/src/lib/session-participation/constants";

function normalizeStringIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String).filter((id) => id.length > 0);
}

function weatherLabelFromLiveState(live: Record<string, unknown>): string {
  const preset = live.weather_preset != null ? String(live.weather_preset) : "";
  const weather = live.weather != null ? String(live.weather) : "";
  const combined = preset || weather;
  if (!combined.trim()) return "Standard (Klar)";
  return combined.replace(/_/g, " ");
}

function temperatureLabelFromLiveState(live: Record<string, unknown>): string {
  const value = Number(live.temperature_value);
  if (Number.isFinite(value)) return `${Math.round(value)} °C`;
  const temp = live.temperature != null ? String(live.temperature) : "";
  return temp.trim() || "—";
}

export async function loadSessionWrapUpPreview(
  sessionId: string,
): Promise<SessionWrapUpPreview | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: sessionRaw } = await (supabase.from("sessions") as any)
    .select("id, campaign_id, title, status, start_time, participation_rewards_settled_at")
    .eq("id", sessionId)
    .single();

  const session = sessionRaw as {
    id: string;
    campaign_id: string;
    title: string | null;
    status: string;
    start_time: string | null;
    participation_rewards_settled_at: string | null;
  } | null;

  if (!session) return null;

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("gm_id, owner_id")
    .eq("id", session.campaign_id)
    .single();

  if (!isCampaignGm(campaignRaw as { gm_id?: string | null; owner_id?: string | null }, user.id)) {
    return null;
  }

  const { data: liveRaw } = await (supabase.from("session_live_states") as any)
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  const live = (liveRaw ?? {}) as Record<string, unknown>;
  const visibleNpcIds = normalizeStringIds(live.visible_npc_ids);

  let stageNpcNames: string[] = [];
  if (visibleNpcIds.length > 0) {
    const { data: npcRows } = await (supabase.from("npcs") as any)
      .select("id, name")
      .in("id", visibleNpcIds);
    const nameById = new Map<string, string>();
    for (const row of (npcRows as Array<{ id: string; name: string }> | null) ?? []) {
      nameById.set(String(row.id), String(row.name ?? "Unbekannt"));
    }
    stageNpcNames = visibleNpcIds.map((id) => nameById.get(id) ?? "Unbekannt");
  }

  let locationName: string | null = null;
  const locationLoreId =
    live.current_location_lore_id != null
      ? String(live.current_location_lore_id)
      : null;
  if (locationLoreId) {
    const { data: loreRow } = await (supabase.from("world_lore") as any)
      .select("name")
      .eq("id", locationLoreId)
      .maybeSingle();
    locationName = loreRow ? String((loreRow as { name: string }).name ?? "") : null;
  } else if (live.current_location) {
    locationName = String(live.current_location);
  }

  const dayPhase = resolveSessionDayPhase(
    live.current_time != null ? String(live.current_time) : null,
  );

  const { data: tsRaw } = await (supabase as any)
    .from("session_transcription_sessions")
    .select("id, status, started_at, stopped_at")
    .eq("session_id", sessionId)
    .maybeSingle();

  const ts = tsRaw as {
    id: string;
    status: string;
    started_at: string | null;
    stopped_at: string | null;
  } | null;

  let chunks: Array<{
    whisper_status: string;
    summarize_status: string;
    duration_ms: number | null;
  }> = [];

  if (ts?.id) {
    const { data: chunkRows } = await (supabase as any)
      .from("session_transcription_chunks")
      .select("whisper_status, summarize_status, duration_ms")
      .eq("transcription_session_id", ts.id);

    chunks = (chunkRows ?? []) as typeof chunks;
  }

  const totalAudioMs = chunks.reduce(
    (sum, c) => sum + Math.max(0, Number(c.duration_ms ?? 0)),
    0,
  );
  const pendingWhisper = chunks.filter(
    (c) => c.whisper_status === "pending" || c.whisper_status === "processing",
  ).length;
  const pendingSummarize = chunks.filter(
    (c) =>
      c.whisper_status === "done" &&
      (c.summarize_status === "pending" || c.summarize_status === "processing"),
  ).length;
  const failedChunks = chunks.filter(
    (c) => c.whisper_status === "failed" || c.summarize_status === "failed",
  ).length;
  const processedChunks = chunks.filter(
    (c) => c.whisper_status === "done" && c.summarize_status === "done",
  ).length;

  const { data: stateRaw } = await (supabase as any)
    .from("session_chronicle_state")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  const chronicleState = parseChronicleStateRow(stateRaw);
  const pendingInbox = countPendingInboxItems(chronicleState);
  const inboxPreview = listChronicleInboxItems(chronicleState)
    .slice(0, 6)
    .map((item) => ({ kind: item.kind, title: inboxItemTitle(item) }));

  const now = new Date();
  const { data: upcomingRaw } = await (supabase.from("sessions") as any)
    .select("id, title, start_time, status")
    .eq("campaign_id", session.campaign_id)
    .neq("id", sessionId);

  const nextSessionRow = ((upcomingRaw ?? []) as Array<{
    id: string;
    title: string | null;
    start_time: string;
    status: string;
  }>)
    .filter(
      (row) =>
        isSessionStatusScheduled(row.status) &&
        !isMissedScheduledSession(row, now),
    )
    .sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
    )[0];

  const weatherLabel = weatherLabelFromLiveState(live);
  const temperatureLabel = temperatureLabelFromLiveState(live);
  const hasCarryOverContent =
    stageNpcNames.length > 0 ||
    locationName != null ||
    weatherLabel !== "Standard (Klar)" ||
    temperatureLabel !== "15 °C";

  const recordingActive =
    ts?.status === "recording" || ts?.status === "paused";

  const followUpTasks: SessionWrapUpTask[] = [];

  if (recordingActive) {
    followUpTasks.push({
      id: "stop-recording",
      kind: "warning",
      title: "Aufnahme noch aktiv",
      description:
        "Die Chronist-Aufnahme wird beim Beenden automatisch gestoppt. Der letzte Audio-Chunk wird noch hochgeladen.",
    });
  }

  if (chunks.length > 0 && pendingWhisper + pendingSummarize > 0) {
    followUpTasks.push({
      id: "processing",
      kind: "info",
      title: "Audio-Verarbeitung läuft noch",
      description: `${pendingWhisper + pendingSummarize} Chunk(s) werden noch transkribiert oder zusammengefasst — das kann einige Minuten dauern.`,
      href: `/dashboard/campaigns/${session.campaign_id}/chronist`,
    });
  }

  if (failedChunks > 0) {
    followUpTasks.push({
      id: "failed-chunks",
      kind: "action",
      title: `${failedChunks} Audio-Chunk(s) fehlgeschlagen`,
      description: "Im Chronist-Dashboard kannst du die Verarbeitung erneut anstoßen.",
      href: `/dashboard/campaigns/${session.campaign_id}/chronist`,
    });
  }

  if (pendingInbox > 0) {
    followUpTasks.push({
      id: "inbox",
      kind: "action",
      title: `${pendingInbox} Chronist-Vorschlag${pendingInbox === 1 ? "" : "e"} offen`,
      description:
        "Erkannte NSCs, Orte oder Quests kannst du in die Maker übernehmen oder verwerfen.",
      href: `/dashboard/campaigns/${session.campaign_id}/chronist`,
    });
  }

  followUpTasks.push({
    id: "player-recap",
    kind: "action",
    title: "Spieler-Chronik prüfen",
    description:
      "Nach dem Archivieren entsteht ein Entwurf — bearbeite und gib ihn für deine Spieler frei.",
    href: `/dashboard/campaigns/${session.campaign_id}?tab=sessions`,
  });

  followUpTasks.push({
    id: "journal-archived",
    kind: "info",
    title: "Journal & Bühne werden archiviert",
    description:
      "System-Log und getroffene NSCs landen im Session-Archiv. Die Live-Bühne dieser Session wird zurückgesetzt.",
  });

  const { data: memberRowsRaw } = await (supabase.from("campaign_members") as any)
    .select("user_id, character_id, users:user_id ( username )")
    .eq("campaign_id", session.campaign_id)
    .in("status", ["Approved", "Active"]);

  const memberRowsBase = ((memberRowsRaw ?? []) as Array<Record<string, unknown>>).map(
    (row) => {
      const users = row.users as { username?: string } | null;
      return {
        user_id: String(row.user_id),
        username: String(users?.username ?? "Spieler"),
        character_id:
          row.character_id != null ? String(row.character_id) : null,
      };
    },
  );

  const characterIds = memberRowsBase
    .map((m) => m.character_id)
    .filter((id): id is string => Boolean(id));

  const characterNameById = new Map<string, string>();
  if (characterIds.length > 0) {
    const { data: charRows } = await (supabase.from("characters") as any)
      .select("id, name")
      .in("id", characterIds);
    for (const row of (charRows as Array<{ id: string; name: string }> | null) ?? []) {
      characterNameById.set(String(row.id), String(row.name ?? ""));
    }
  }

  const memberRows = memberRowsBase.map((row) => ({
    user_id: row.user_id,
    username: row.username,
    character_name: row.character_id
      ? characterNameById.get(row.character_id) ?? null
      : null,
  }));

  const campaignGm = campaignRaw as {
    gm_id?: string | null;
    owner_id?: string | null;
  };
  const participationPlayers = resolveSessionParticipationPlayers({
    memberRows,
    onlinePresentUserIds: normalizeUserIdList(live.online_present_user_ids),
    physicallyPresentUserIds: normalizeUserIdList(live.physically_present_user_ids),
    gmUserIds: [campaignGm.gm_id, campaignGm.owner_id].filter(Boolean).map(String),
  });

  const achievements = await getAllAchievements();

  return {
    sessionId,
    sessionTitle: session.title,
    chronist: {
      used: Boolean(ts),
      transcriptionStatus: ts?.status ?? null,
      recordingActive,
      chunkCount: chunks.length,
      totalAudioMs,
      pendingWhisper,
      pendingSummarize,
      failedChunks,
      processedChunks,
    },
    inbox: {
      pendingCount: pendingInbox,
      preview: inboxPreview,
    },
    board: {
      stageNpcNames,
      stageNpcCount: stageNpcNames.length,
      locationName,
      weatherLabel,
      temperatureLabel,
      dayPhaseLabel: sessionDayPhaseLabel(dayPhase),
      inGameDate:
        live.in_game_date != null ? String(live.in_game_date) : null,
      inGameTime:
        live.in_game_time != null ? String(live.in_game_time) : null,
      hasCarryOverContent,
    },
    nextSession: nextSessionRow
      ? {
          id: nextSessionRow.id,
          title: nextSessionRow.title,
          startTime: nextSessionRow.start_time,
        }
      : null,
    participation: {
      basePointsPerPlayer: SESSION_PARTICIPATION_BASE_POINTS,
      alreadySettled: Boolean(session.participation_rewards_settled_at),
      players: participationPlayers,
      achievements: achievements.map((a) => ({
        id: a.id,
        name: a.name,
        pointsAwarded: a.points_awarded,
      })),
    },
    followUpTasks,
  };
}
