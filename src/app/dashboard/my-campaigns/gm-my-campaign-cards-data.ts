import { partitionCampaignSessionsForTab } from "@/src/lib/session-focus";
import {
  isSessionStatusLive,
  isSessionStatusScheduled,
} from "@/src/lib/session-status";
import { isPlayerReadyForSessionStart } from "@/src/app/dashboard/campaigns/[id]/session-rsvp-readiness";
import { expirePastScheduledSessionsForCampaign } from "@/src/app/dashboard/campaigns/[id]/session-actions";

export type GmMyCampaignCardModel = {
  id: string;
  name: string;
  system: string | null;
  banner_url: string | null;
  campaignStatus: string | null;
  players: { id: string; name: string }[];
  liveSessionId: string | null;
  nextScheduled: {
    id: string;
    title: string | null;
    startTime: string;
    formattedDate: string;
    formattedTime: string;
    confirmedCount: number;
  } | null;
};

type SessionRow = {
  id: string;
  title: string | null;
  start_time: string;
  status: string;
};

function formatSessionDateTimeDe(startTime: string) {
  const startDate = new Date(startTime);
  const formattedDate = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(startDate);
  const formattedTime = new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(startDate);
  return { formattedDate, formattedTime };
}

function deriveSessionSummary(sessions: SessionRow[], now: Date) {
  const { focus, otherActive } = partitionCampaignSessionsForTab(sessions, now);
  const pool = [focus, ...otherActive].filter(Boolean) as SessionRow[];

  const liveRow =
    (focus && isSessionStatusLive(focus.status) ? focus : null) ??
    otherActive.find((s) => isSessionStatusLive(s.status)) ??
    null;

  const scheduledInPool = pool.filter((s) => isSessionStatusScheduled(s.status));
  scheduledInPool.sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
  );
  const nextScheduled = scheduledInPool[0] ?? null;

  return {
    liveSessionId: liveRow?.id ?? null,
    nextScheduledRow: nextScheduled,
  };
}

export async function loadGmMyCampaignCardModels(
  supabase: any,
  campaignRows: Array<{
    id: string;
    name: string;
    system: string | null;
    banner_url: string | null;
    status?: string | null;
  }>,
): Promise<GmMyCampaignCardModel[]> {
  if (campaignRows.length === 0) return [];

  const ids = campaignRows.map((c) => c.id);
  const now = new Date();

  await Promise.all(
    ids.map((campaignId) =>
      expirePastScheduledSessionsForCampaign(campaignId).catch(() => undefined),
    ),
  );

  const { data: sessionsRaw } = await supabase
    .from("sessions")
    .select("id, campaign_id, title, start_time, status")
    .in("campaign_id", ids)
    .order("start_time", { ascending: true });

  const allSessions = (sessionsRaw as SessionRow[] | null) ?? [];
  const sessionsByCampaign = new Map<string, SessionRow[]>();
  for (const sid of ids) sessionsByCampaign.set(sid, []);
  for (const s of allSessions) {
    const cid = String((s as any).campaign_id);
    if (!sessionsByCampaign.has(cid)) sessionsByCampaign.set(cid, []);
    sessionsByCampaign.get(cid)!.push(s as SessionRow);
  }

  const { data: membersRaw } = await supabase
    .from("campaign_members")
    .select("campaign_id, characters ( id, name, status )")
    .in("campaign_id", ids)
    .in("status", ["Approved", "Active"]);

  const playersByCampaign = new Map<string, { id: string; name: string }[]>();
  for (const cid of ids) playersByCampaign.set(cid, []);
  for (const row of (membersRaw as any[]) || []) {
    const cid = String(row.campaign_id);
    const ch = row.characters as { id: string; name: string; status?: string } | null;
    if (!ch?.id) continue;
    const st = String(ch.status ?? "");
    if (st !== "Active" && st !== "Approved") continue;
    const list = playersByCampaign.get(cid);
    if (!list) continue;
    if (list.some((p) => p.id === ch.id)) continue;
    list.push({ id: ch.id, name: ch.name || "Unbenannt" });
  }
  for (const list of playersByCampaign.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, "de"));
  }

  const nextScheduledIds = new Set<string>();
  for (const c of campaignRows) {
    const { nextScheduledRow } = deriveSessionSummary(sessionsByCampaign.get(c.id) ?? [], now);
    if (nextScheduledRow) nextScheduledIds.add(nextScheduledRow.id);
  }

  let rsvpBySession = new Map<string, { user_id: string; rsvp_status: string; gm_confirmed: boolean }[]>();
  if (nextScheduledIds.size > 0) {
    const { data: rsvpRows } = await supabase
      .from("session_rsvps")
      .select("session_id, user_id, rsvp_status, gm_confirmed")
      .in("session_id", [...nextScheduledIds]);
    for (const r of (rsvpRows as any[]) || []) {
      const sid = String(r.session_id);
      if (!rsvpBySession.has(sid)) rsvpBySession.set(sid, []);
      rsvpBySession.get(sid)!.push({
        user_id: String(r.user_id),
        rsvp_status: String(r.rsvp_status ?? ""),
        gm_confirmed: !!r.gm_confirmed,
      });
    }
  }

  function confirmedCountForSession(sessionId: string): number {
    const rows = rsvpBySession.get(sessionId) ?? [];
    const readyUsers = new Set<string>();
    for (const r of rows) {
      if (isPlayerReadyForSessionStart(r)) readyUsers.add(r.user_id);
    }
    return readyUsers.size;
  }

  return campaignRows.map((c) => {
    const sessions = sessionsByCampaign.get(c.id) ?? [];
    const { liveSessionId, nextScheduledRow } = deriveSessionSummary(sessions, now);
    const nextScheduled = nextScheduledRow
      ? {
          id: nextScheduledRow.id,
          title: nextScheduledRow.title,
          startTime: nextScheduledRow.start_time,
          ...formatSessionDateTimeDe(nextScheduledRow.start_time),
          confirmedCount: confirmedCountForSession(nextScheduledRow.id),
        }
      : null;

    return {
      id: c.id,
      name: c.name,
      system: c.system,
      banner_url: c.banner_url,
      campaignStatus: c.status ?? null,
      players: playersByCampaign.get(c.id) ?? [],
      liveSessionId,
      nextScheduled,
    };
  });
}
