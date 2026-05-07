import { createClient } from "@/src/lib/supabase/server";
import { partitionCampaignSessionsForTab } from "@/src/lib/session-focus";
import { isSessionStatusScheduled } from "@/src/lib/session-status";
import { isPlayerReadyForSessionStart } from "./session-rsvp-readiness";

export type SessionTabRow = Record<string, unknown> & {
  id: string;
  title: string | null;
  start_time: string;
  type: string;
  status: string;
  canStart?: boolean;
  pendingCount?: number;
  hasAcceptedRsvps?: boolean;
};

export type GmSessionsTabPayload = {
  upcomingSessionsWithRsvp: SessionTabRow[];
  focusSession: SessionTabRow | null;
  otherUpcomingSessions: SessionTabRow[];
  pastSessionsForCampaignTab: SessionTabRow[];
};

/**
 * Geplante / laufende Sessions inkl. RSVP (GM) — Fokus-Session zuerst, Archiv getrennt.
 */
export async function loadUpcomingSessionsWithRsvpForGm(
  campaignId: string,
  gmUserId: string,
): Promise<GmSessionsTabPayload> {
  const supabase = await createClient();
  try {
    const { expirePastScheduledSessionsForCampaign } = await import("./session-actions");
    await expirePastScheduledSessionsForCampaign(campaignId);
  } catch (e) {
    console.warn("[loadUpcomingSessionsWithRsvpForGm] expirePastScheduledSessionsForCampaign:", e);
  }
  const { data: sessionsRaw } = await (supabase.from("sessions") as any)
    .select("*")
    .eq("campaign_id", campaignId)
    .order("start_time", { ascending: true });

  const sessions = (sessionsRaw || []) as SessionTabRow[];
  const now = new Date();
  const { focus, otherActive, pastArchiveRows } = partitionCampaignSessionsForTab(
    sessions,
    now,
  );

  const upcomingSessions = [...(focus ? [focus] : []), ...otherActive];

  let upcomingSessionsWithRsvp: SessionTabRow[] = upcomingSessions;
  const scheduledIds = upcomingSessions
    .filter((s) => isSessionStatusScheduled(s.status))
    .map((s) => s.id);
  if (scheduledIds.length > 0) {
    const [membersRes, rsvpsRes] = await Promise.all([
      (supabase.from("campaign_members") as any)
        .select("user_id")
        .eq("campaign_id", campaignId)
        .in("status", ["Approved", "Active"]),
      (supabase.from("session_rsvps") as any)
        .select("session_id, user_id, rsvp_status, gm_confirmed")
        .in("session_id", scheduledIds),
    ]);
    const memberIds = new Set(
      ((membersRes.data as any[]) || []).map((m: any) => m.user_id),
    );
    const acceptedRsvpsBySession = new Map<string, boolean>();
    type RsvpRow = {
      session_id: string;
      user_id: string;
      rsvp_status: string;
      gm_confirmed: boolean;
    };
    const normalized: RsvpRow[] = ((rsvpsRes.data as any[]) || []).map((r: any) => ({
      session_id: String(r.session_id),
      user_id: String(r.user_id),
      rsvp_status: String(r.rsvp_status ?? ""),
      gm_confirmed: !!r.gm_confirmed,
    }));
    const rowsBySession = new Map<string, RsvpRow[]>();
    for (const r of normalized) {
      if (!rowsBySession.has(r.session_id)) rowsBySession.set(r.session_id, []);
      rowsBySession.get(r.session_id)!.push(r);
      if (r.rsvp_status === "Zusage" || r.rsvp_status === "Via Online") {
        acceptedRsvpsBySession.set(r.session_id, true);
      }
    }
    upcomingSessionsWithRsvp = upcomingSessions.map((s) => {
      if (!isSessionStatusScheduled(s.status)) {
        return { ...s, canStart: false, pendingCount: 0, hasAcceptedRsvps: false };
      }
      const sessionRows = rowsBySession.get(s.id) ?? [];
      const byUser = new Map(sessionRows.map((r) => [r.user_id, r]));
      const playerIds = [...memberIds].filter((uid) => uid !== gmUserId);
      const pendingCount = playerIds.filter(
        (uid) => !isPlayerReadyForSessionStart(byUser.get(uid)),
      ).length;
      const prepOk = (s as { gm_prep_complete?: boolean }).gm_prep_complete !== false;
      return {
        ...s,
        canStart: pendingCount === 0 && prepOk,
        pendingCount,
        hasAcceptedRsvps: acceptedRsvpsBySession.get(s.id) ?? false,
      };
    });
  }

  const focusSession = focus
    ? upcomingSessionsWithRsvp.find((x) => x.id === focus.id) ?? null
    : null;
  const otherUpcomingSessions = upcomingSessionsWithRsvp.filter(
    (x) => x.id !== focusSession?.id,
  );

  return {
    upcomingSessionsWithRsvp,
    focusSession,
    otherUpcomingSessions,
    pastSessionsForCampaignTab: pastArchiveRows,
  };
}
