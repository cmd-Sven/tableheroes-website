import { createClient } from "@/src/lib/supabase/server";

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
 * Lädt zukünftige/live Sessions inkl. RSVP-Zusammenfassung für den GM (SessionsTab).
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
  const now = new Date();
  const upcomingSessions = sessions.filter(
    (s) =>
      s.status !== "Cancelled" &&
      (s.status === "Live" ||
        (s.start_time && new Date(String(s.start_time)).getTime() > now.getTime())),
  );

  let upcomingSessionsWithRsvp: SessionTabRow[] = upcomingSessions;
  const scheduledIds = upcomingSessions
    .filter((s) => s.status === "Scheduled")
    .map((s) => s.id);
  if (scheduledIds.length > 0) {
    const [membersRes, rsvpsRes] = await Promise.all([
      (supabase.from("campaign_members") as any)
        .select("user_id")
        .eq("campaign_id", campaignId)
        .in("status", ["Accepted", "Approved"]),
      (supabase.from("session_rsvps") as any)
        .select("session_id, user_id, rsvp_status")
        .in("session_id", scheduledIds),
    ]);
    const memberIds = new Set(
      ((membersRes.data as any[]) || []).map((m: any) => m.user_id),
    );
    const rsvpsBySession = new Map<string, Set<string>>();
    const acceptedRsvpsBySession = new Map<string, boolean>();
    for (const r of (rsvpsRes.data as any[]) || []) {
      if (!rsvpsBySession.has(r.session_id))
        rsvpsBySession.set(r.session_id, new Set());
      rsvpsBySession.get(r.session_id)!.add(r.user_id);
      if (r.rsvp_status === "Zusage" || r.rsvp_status === "Via Online") {
        acceptedRsvpsBySession.set(r.session_id, true);
      }
    }
    upcomingSessionsWithRsvp = upcomingSessions.map((s) => {
      if (s.status !== "Scheduled") {
        return { ...s, canStart: false, pendingCount: 0, hasAcceptedRsvps: false };
      }
      const rsvpUserIds = rsvpsBySession.get(s.id) ?? new Set();
      const pendingCount = [...memberIds].filter((uid) => !rsvpUserIds.has(uid)).length;
      return {
        ...s,
        canStart: pendingCount === 0,
        pendingCount,
        hasAcceptedRsvps: acceptedRsvpsBySession.get(s.id) ?? false,
      };
    });
  }

  return upcomingSessionsWithRsvp;
}
