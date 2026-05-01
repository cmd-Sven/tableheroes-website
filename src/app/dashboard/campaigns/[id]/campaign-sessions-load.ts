import { createClient } from "@/src/lib/supabase/server";
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

/**
 * Lädt geplante (Scheduled) und laufende (Live) Sessions inkl. RSVP für den GM (SessionsTab).
 * Scheduled bleibt sichtbar auch nach Startzeit — verspäteter Live-Start / Beitreten möglich.
 */
export async function loadUpcomingSessionsWithRsvpForGm(
  campaignId: string,
): Promise<SessionTabRow[]> {
  const supabase = await createClient();
  const { data: sessionsRaw } = await (supabase.from("sessions") as any)
    .select("*")
    .eq("campaign_id", campaignId)
    .order("start_time", { ascending: true });

  const sessions = (sessionsRaw || []) as SessionTabRow[];
  const upcomingSessions = sessions.filter(
    (s) =>
      !["Completed", "Cancelled"].includes(s.status) &&
      (s.status === "Live" || s.status === "Scheduled"),
  );

  let upcomingSessionsWithRsvp: SessionTabRow[] = upcomingSessions;
  const scheduledIds = upcomingSessions
    .filter((s) => s.status === "Scheduled")
    .map((s) => s.id);
  if (scheduledIds.length > 0) {
    const { data: campRow } = await (supabase.from("campaigns") as any)
      .select("gm_id")
      .eq("id", campaignId)
      .maybeSingle();
    const gmId = String((campRow as { gm_id?: string } | null)?.gm_id ?? "");

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
      if (s.status !== "Scheduled") {
        return { ...s, canStart: false, pendingCount: 0, hasAcceptedRsvps: false };
      }
      const sessionRows = rowsBySession.get(s.id) ?? [];
      const byUser = new Map(sessionRows.map((row) => [row.user_id, row]));
      const playerIds = [...memberIds].filter((uid) => uid !== gmId);
      const pendingCount = playerIds.filter(
        (uid) => !isPlayerReadyForSessionStart(byUser.get(uid)),
      ).length;
      const prepOk = (s as { gm_prep_complete?: boolean }).gm_prep_complete !== false;
      return {
        ...s,
        canStart: prepOk,
        pendingCount,
        hasAcceptedRsvps: acceptedRsvpsBySession.get(s.id) ?? false,
      };
    });
  }

  return upcomingSessionsWithRsvp;
}
