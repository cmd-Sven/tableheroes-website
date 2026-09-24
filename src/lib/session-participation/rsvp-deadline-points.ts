import { tryCreateAdminClient } from "@/src/lib/supabase/server";

export const RSVP_ON_TIME_POINTS = 10;
export const RSVP_LATE_POINTS = 5;
export const RSVP_MISSING_POINTS = -2;

const RESPONDED = new Set(["Zusage", "Absage", "Via Online"]);

/** Ende der Anmeldefrist: Kalendertag (Start minus N Tage), 23:59:59 Lokalzeit. */
export function rsvpDeadlineEndMs(
  startIso: string,
  deadlineDays: number | null | undefined,
): number | null {
  if (deadlineDays == null || !Number.isFinite(Number(deadlineDays))) return null;
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return null;
  const deadline = new Date(start);
  deadline.setDate(deadline.getDate() - Number(deadlineDays));
  deadline.setHours(23, 59, 59, 999);
  return deadline.getTime();
}

export function hasPlayerRsvpResponse(
  row: { rsvp_status?: string | null } | null | undefined,
): boolean {
  if (!row?.rsvp_status) return false;
  return RESPONDED.has(String(row.rsvp_status));
}

export function pointsForRsvpTiming(
  respondedAtIso: string | null | undefined,
  deadlineEndMs: number | null,
): number {
  if (!respondedAtIso) return RSVP_MISSING_POINTS;
  const respondedAt = new Date(respondedAtIso).getTime();
  if (Number.isNaN(respondedAt)) return RSVP_MISSING_POINTS;
  if (deadlineEndMs == null || respondedAt <= deadlineEndMs) return RSVP_ON_TIME_POINTS;
  return RSVP_LATE_POINTS;
}

function reasonFor(sessionId: string, userId: string): string {
  return `Anmeldefrist ${sessionId} ${userId}`;
}

/**
 * Beim Session-Start: +10 rechtzeitig, +5 verspätet, −2 ohne Rückmeldung.
 * Zu- und Absage zählen gleich. Bereits verbuchte Spieler werden übersprungen.
 */
export async function settleRsvpDeadlinePoints(input: {
  sessionId: string;
  campaignId: string;
  sessionTitle: string | null;
  startTime: string;
  deadlineDays: number | null;
  awardedBy: string;
}): Promise<void> {
  const admin = tryCreateAdminClient();
  if (!admin) {
    console.warn("[settleRsvpDeadlinePoints] Kein Service-Role-Client — Punkte übersprungen.");
    return;
  }

  const { data: campaignRaw } = await (admin.from("campaigns") as any)
    .select("gm_id, owner_id")
    .eq("id", input.campaignId)
    .maybeSingle();
  const skipIds = new Set(
    [campaignRaw?.gm_id, campaignRaw?.owner_id].filter(Boolean).map(String),
  );

  const { data: membersRaw } = await (admin.from("campaign_members") as any)
    .select("user_id")
    .eq("campaign_id", input.campaignId)
    .in("status", ["Approved", "Active"]);

  const playerIds = [
    ...new Set(
      ((membersRaw as { user_id?: string }[] | null) ?? [])
        .map((m) => String(m.user_id ?? ""))
        .filter((id) => id && !skipIds.has(id)),
    ),
  ];
  if (playerIds.length === 0) return;

  const { data: rsvpsRaw } = await (admin.from("session_rsvps") as any)
    .select("user_id, rsvp_status, created_at, updated_at")
    .eq("session_id", input.sessionId);

  const rsvpByUser = new Map<string, { status: string; at: string | null }>();
  for (const row of (rsvpsRaw as any[]) || []) {
    const userId = String(row.user_id ?? "");
    if (!userId) continue;
    rsvpByUser.set(userId, {
      status: String(row.rsvp_status ?? ""),
      at: (row.created_at as string | null) ?? (row.updated_at as string | null) ?? null,
    });
  }

  const marker = `Anmeldefrist ${input.sessionId}`;
  const { data: existingRaw } = await (admin.from("points_log") as any)
    .select("user_id, reason")
    .in("user_id", playerIds)
    .ilike("reason", `${marker}%`);

  const already = new Set(
    ((existingRaw as { user_id?: string; reason?: string }[] | null) ?? [])
      .filter((row) => String(row.reason ?? "").startsWith(marker))
      .map((row) => String(row.user_id)),
  );

  const deadlineEnd = rsvpDeadlineEndMs(input.startTime, input.deadlineDays);
  const label = input.sessionTitle?.trim() || "Spieleabend";

  for (const userId of playerIds) {
    if (already.has(userId)) continue;
    const rsvp = rsvpByUser.get(userId);
    const responded = rsvp && RESPONDED.has(rsvp.status);
    const amount = pointsForRsvpTiming(responded ? rsvp.at : null, deadlineEnd);
    const timing =
      amount === RSVP_ON_TIME_POINTS
        ? "innerhalb der Frist"
        : amount === RSVP_LATE_POINTS
          ? "nach der Frist"
          : "ohne Rückmeldung";
    const { error } = await (admin as any).rpc("award_points_safe", {
      target_user_id: userId,
      points_amount: amount,
      award_reason: `${reasonFor(input.sessionId, userId)} (${timing}, ${label})`,
      awarded_by: input.awardedBy,
      related_campaign_id: input.campaignId,
      catalog_id: null,
    });
    if (error) {
      console.error("[settleRsvpDeadlinePoints]", userId, error.message);
    }
  }
}
