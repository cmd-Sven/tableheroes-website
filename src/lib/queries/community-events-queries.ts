import { createClient } from "@/src/lib/supabase/server";
import type { RsvpStatus, UpcomingSession } from "@/src/lib/types/dashboard-widgets";
import { isSessionStatusScheduled } from "@/src/lib/session-status";
import type { CommunityEvent } from "@/src/lib/community-events/types";
import { COMMUNITY_EVENT_KIND_LABELS } from "@/src/lib/community-events/types";

function communityEventToUpcoming(
  event: CommunityEvent,
  userRsvp: RsvpStatus | null,
  viaOnlineTaken: boolean,
  deadlineReached: boolean,
): UpcomingSession {
  const kindLabel = COMMUNITY_EVENT_KIND_LABELS[event.event_kind] ?? event.event_kind;
  return {
    id: event.id,
    title: event.title,
    startTime: event.start_time,
    status: event.status === "Scheduled" ? "Scheduled" : event.status,
    campaignId: "",
    campaignName: "TableHeroes Community",
    campaignBannerUrl: null,
    participants: [],
    rsvpDeadlineDays: event.rsvp_deadline_days,
    isLive: event.is_live !== false,
    userRsvp,
    rsvps: [],
    deadlineReached,
    viaOnlineTaken,
    sessionType: "CommunityEvent",
    requiresCharacter: false,
    isCommunityEvent: true,
    communityEventKind: kindLabel,
    location: event.location,
  };
}

export async function getUpcomingCommunityEventsForUser(
  userId: string,
  limit = 10,
): Promise<UpcomingSession[]> {
  const supabase = await createClient();

  const { data: eventsRaw, error } = await (supabase as any).from("community_events")
    .select("*")
    .eq("status", "Scheduled")
    .gte("start_time", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order("start_time", { ascending: true })
    .limit(limit * 2);

  if (error) {
    console.error("[getUpcomingCommunityEventsForUser]", error);
    return [];
  }

  const events = ((eventsRaw as CommunityEvent[]) ?? []).filter((e) =>
    isSessionStatusScheduled(e.status),
  );
  if (events.length === 0) return [];

  const eventIds = events.map((e) => e.id);
  const { data: rsvpsRaw } = await (supabase as any).from("community_event_rsvps")
    .select("event_id, user_id, rsvp_status")
    .in("event_id", eventIds);

  const rsvpsByEvent = new Map<string, Array<{ user_id: string; rsvp_status: string }>>();
  for (const r of (rsvpsRaw as { event_id: string; user_id: string; rsvp_status: string }[]) ??
    []) {
    if (!rsvpsByEvent.has(r.event_id)) rsvpsByEvent.set(r.event_id, []);
    rsvpsByEvent.get(r.event_id)!.push(r);
  }

  const now = new Date();
  return events.slice(0, limit).map((event) => {
    const rows = rsvpsByEvent.get(event.id) ?? [];
    const mine = rows.find((r) => r.user_id === userId);
    const userRsvp =
      mine?.rsvp_status === "Zusage" ||
      mine?.rsvp_status === "Absage" ||
      mine?.rsvp_status === "Via Online"
        ? (mine.rsvp_status as RsvpStatus)
        : null;

    let deadline: Date | null = null;
    if (event.rsvp_deadline_days) {
      deadline = new Date(event.start_time);
      deadline.setDate(deadline.getDate() - event.rsvp_deadline_days);
      deadline.setHours(23, 59, 59, 999);
    }
    const deadlineReached = !!deadline && now >= deadline;
    const viaOnlineCount = rows.filter((r) => r.rsvp_status === "Via Online").length;
    const viaOnlineTaken = event.is_live !== false && viaOnlineCount >= 1;

    return communityEventToUpcoming(event, userRsvp, viaOnlineTaken, deadlineReached);
  });
}

export async function mergeUpcomingAppointments(
  userId: string,
  sessionLimit = 6,
): Promise<UpcomingSession[]> {
  const { getUpcomingSessionsForUser } = await import(
    "@/src/lib/queries/dashboard-widgets-queries"
  );
  const [sessions, community] = await Promise.all([
    getUpcomingSessionsForUser(userId, sessionLimit),
    getUpcomingCommunityEventsForUser(userId, sessionLimit),
  ]);

  return [...sessions, ...community]
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, sessionLimit);
}

export async function getPastCommunityEventsForUser(
  userId: string,
  limit = 20,
): Promise<UpcomingSession[]> {
  const supabase = await createClient();

  const { data: eventsRaw } = await (supabase as any).from("community_events")
    .select("*")
    .in("status", ["Completed", "Cancelled"])
    .order("start_time", { ascending: false })
    .limit(limit);

  const events = (eventsRaw as CommunityEvent[]) ?? [];
  if (events.length === 0) return [];

  const eventIds = events.map((e) => e.id);
  const { data: rsvpsRaw } = await (supabase as any).from("community_event_rsvps")
    .select("event_id, user_id, rsvp_status")
    .in("event_id", eventIds)
    .eq("user_id", userId);

  const rsvpByEvent = new Map<string, RsvpStatus>();
  for (const r of (rsvpsRaw as { event_id: string; rsvp_status: string }[]) ?? []) {
    if (r.rsvp_status === "Zusage" || r.rsvp_status === "Absage" || r.rsvp_status === "Via Online") {
      rsvpByEvent.set(r.event_id, r.rsvp_status as RsvpStatus);
    }
  }

  return events.map((event) =>
    communityEventToUpcoming(event, rsvpByEvent.get(event.id) ?? null, false, false),
  );
}

export async function mergePastAppointments(
  userId: string,
  limit = 20,
): Promise<UpcomingSession[]> {
  const { getPastSessionsForUser } = await import("@/src/lib/queries/dashboard-widgets-queries");
  const [sessions, community] = await Promise.all([
    getPastSessionsForUser(userId, limit),
    getPastCommunityEventsForUser(userId, limit),
  ]);

  return [...sessions, ...community]
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, limit);
}
