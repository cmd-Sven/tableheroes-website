import type { SupabaseClient } from "@supabase/supabase-js";
import {
  hasEmailNotificationBeenSent,
  markEmailNotificationSent,
} from "@/src/lib/email/dedup";
import { emailLayout, sendTransactionalEmail } from "@/src/lib/email/send-email";
import {
  isEmailNotificationEnabled,
  type EmailNotificationKind,
} from "@/src/lib/email/notification-preferences";

const SITE_URL = () =>
  (process.env.NEXT_PUBLIC_SITE_URL ?? "https://table-heroes.de").replace(/\/$/, "");

type UserEmailRow = {
  id: string;
  email: string | null;
  username: string | null;
  preferences: unknown;
};

async function loadUserForEmail(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserEmailRow | null> {
  const { data } = await (supabase as any)
    .from("users")
    .select("id, email, username, preferences")
    .eq("id", userId)
    .maybeSingle();

  if (!data) return null;
  return data as UserEmailRow;
}

async function sendIfAllowed(args: {
  supabase: SupabaseClient;
  userId: string;
  kind: EmailNotificationKind;
  referenceKey: string;
  subject: string;
  title: string;
  intro: string;
  ctaLabel: string;
  ctaUrl: string;
}): Promise<{ sent: boolean; skipped?: string; error?: string }> {
  const user = await loadUserForEmail(args.supabase, args.userId);
  if (!user?.email?.trim()) {
    return { sent: false, skipped: "no_email" };
  }

  if (!isEmailNotificationEnabled(user.preferences, args.kind)) {
    return { sent: false, skipped: "disabled" };
  }

  const already = await hasEmailNotificationBeenSent(
    args.supabase,
    args.userId,
    args.kind,
    args.referenceKey,
  );
  if (already) {
    return { sent: false, skipped: "duplicate" };
  }

  const greetingName = user.username?.trim() || "Abenteurer";
  const result = await sendTransactionalEmail({
    to: user.email.trim(),
    subject: args.subject,
    html: emailLayout({
      title: args.title,
      intro: `Hallo ${greetingName},<br><br>${args.intro}`,
      ctaLabel: args.ctaLabel,
      ctaUrl: args.ctaUrl,
    }),
  });

  if (!result.ok) {
    return { sent: false, error: result.error };
  }
  if (result.skipped) {
    return { sent: false, skipped: result.reason };
  }

  await markEmailNotificationSent(
    args.supabase,
    args.userId,
    args.kind,
    args.referenceKey,
  );

  return { sent: true };
}

export async function notifyProfileMessageEmail(args: {
  supabase: SupabaseClient;
  recipientUserId: string;
  messageId: string;
  subject: string;
}): Promise<void> {
  const result = await sendIfAllowed({
    supabase: args.supabase,
    userId: args.recipientUserId,
    kind: "profile_messages",
    referenceKey: `message:${args.messageId}`,
    subject: `Neue Nachricht: ${args.subject}`,
    title: "Neue Nachricht in deinem Profil",
    intro:
      "Dein Spielleiter hat dir eine neue Nachricht hinterlassen. Schau in deinem Posteingang nach, was es Neues gibt.",
    ctaLabel: "Nachrichten öffnen",
    ctaUrl: `${SITE_URL()}/dashboard/messages`,
  });

  if (result.error) {
    console.error("[email] profile message failed", result.error);
  }
}

export async function notifyNewsPublishedEmails(args: {
  supabase: SupabaseClient;
  newsPostId: string;
  title: string;
}): Promise<{ attempted: number; sent: number }> {
  const { data: users } = await (args.supabase as any)
    .from("users")
    .select("id, email, username, preferences, last_news_view")
    .not("email", "is", null);

  let attempted = 0;
  let sent = 0;

  for (const row of (users ?? []) as UserEmailRow[]) {
    if (!row.email?.trim()) continue;
    if (!isEmailNotificationEnabled(row.preferences, "news_updates")) continue;

    attempted += 1;
    const result = await sendIfAllowed({
      supabase: args.supabase,
      userId: row.id,
      kind: "news_updates",
      referenceKey: `news:${args.newsPostId}`,
      subject: `Neu auf Table Heroes: ${args.title}`,
      title: "News & Updates",
      intro:
        "Es gibt neue veröffentlichte Inhalte auf Table Heroes. Schau dir die aktuellen News und Updates jetzt an.",
      ctaLabel: "News ansehen",
      ctaUrl: `${SITE_URL()}/dashboard/news`,
    });
    if (result.sent) sent += 1;
  }

  return { attempted, sent };
}

function computeRsvpDeadline(startTimeIso: string, deadlineDays: number): Date {
  const start = new Date(startTimeIso);
  const deadline = new Date(start);
  deadline.setDate(deadline.getDate() - deadlineDays);
  deadline.setHours(23, 59, 59, 999);
  return deadline;
}

export async function runRsvpReminderEmails(
  supabase: SupabaseClient,
): Promise<{ checked: number; sent: number }> {
  const now = Date.now();
  const horizonMs = 24 * 60 * 60 * 1000;

  const { data: sessions } = await (supabase as any)
    .from("sessions")
    .select("id, title, start_time, campaign_id, rsvp_deadline_days, status")
    .not("rsvp_deadline_days", "is", null)
    .gte("start_time", new Date(now).toISOString())
    .in("status", ["Scheduled", "Live"]);

  let checked = 0;
  let sent = 0;

  for (const session of (sessions ?? []) as Array<{
    id: string;
    title: string | null;
    start_time: string;
    campaign_id: string;
    rsvp_deadline_days: number;
  }>) {
    const deadlineDays = Number(session.rsvp_deadline_days);
    if (!Number.isFinite(deadlineDays) || deadlineDays <= 0) continue;

    const deadline = computeRsvpDeadline(session.start_time, deadlineDays);
    const msUntilDeadline = deadline.getTime() - now;
    if (msUntilDeadline < 0 || msUntilDeadline > horizonMs) continue;

    const { data: members } = await (supabase as any)
      .from("campaign_members")
      .select("user_id")
      .eq("campaign_id", session.campaign_id)
      .in("status", ["Approved", "Active", "Accepted"]);

    const memberIds = ((members ?? []) as Array<{ user_id: string }>).map((m) => m.user_id);
    if (memberIds.length === 0) continue;

    const { data: rsvps } = await (supabase as any)
      .from("session_rsvps")
      .select("user_id, rsvp_status")
      .eq("session_id", session.id)
      .in("user_id", memberIds);

    const responded = new Set(
      ((rsvps ?? []) as Array<{ user_id: string; rsvp_status: string | null }>)
        .filter((r) => r.rsvp_status && r.rsvp_status !== "Pending")
        .map((r) => r.user_id),
    );

    const { data: campaign } = await (supabase as any)
      .from("campaigns")
      .select("name")
      .eq("id", session.campaign_id)
      .maybeSingle();

    const campaignName = String((campaign as { name?: string } | null)?.name ?? "Kampagne");
    const sessionTitle = session.title?.trim() || "Session";
    const deadlineLabel = deadline.toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    for (const userId of memberIds) {
      if (responded.has(userId)) continue;
      checked += 1;

      const result = await sendIfAllowed({
        supabase,
        userId,
        kind: "rsvp_reminder",
        referenceKey: `rsvp:${session.id}`,
        subject: `Anmeldefrist naht: ${sessionTitle}`,
        title: "Teilnahme bestätigen",
        intro: `Für <strong>${sessionTitle}</strong> in <strong>${campaignName}</strong> läuft die Anmeldefrist am <strong>${deadlineLabel}</strong> ab. Bitte bestätige jetzt deine Teilnahme oder sag ab.`,
        ctaLabel: "Zur Kampagne",
        ctaUrl: `${SITE_URL()}/dashboard/campaigns/${session.campaign_id}`,
      });

      if (result.sent) sent += 1;
    }
  }

  return { checked, sent };
}

async function getCampaignMemberUserIds(
  supabase: SupabaseClient,
  campaignId: string,
): Promise<string[]> {
  const { data: members } = await (supabase as any)
    .from("campaign_members")
    .select("user_id")
    .eq("campaign_id", campaignId)
    .in("status", ["Approved", "Active"]);

  return ((members ?? []) as Array<{ user_id: string }>).map((m) => m.user_id);
}

function revealKindForEntity(
  entityType: string,
): EmailNotificationKind | null {
  if (entityType === "npc") return "npc_revealed";
  if (entityType === "faction") return "faction_revealed";
  if (entityType === "lore" || entityType === "bestarium") return "lore_revealed";
  return null;
}

async function loadRevealEntityName(
  supabase: SupabaseClient,
  entityType: string,
  entityId: string,
): Promise<string> {
  if (entityType === "npc") {
    const { data } = await (supabase.from("npcs") as any)
      .select("name")
      .eq("id", entityId)
      .maybeSingle();
    return (data as { name?: string } | null)?.name?.trim() || "NPC";
  }
  if (entityType === "faction") {
    const { data } = await (supabase.from("factions") as any)
      .select("name")
      .eq("id", entityId)
      .maybeSingle();
    return (data as { name?: string } | null)?.name?.trim() || "Fraktion";
  }
  if (entityType === "lore") {
    const { data } = await (supabase.from("world_lore") as any)
      .select("name")
      .eq("id", entityId)
      .maybeSingle();
    return (data as { name?: string } | null)?.name?.trim() || "Lore-Eintrag";
  }
  if (entityType === "bestarium") {
    const { data } = await (supabase.from("bestarium_creatures") as any)
      .select("name")
      .eq("id", entityId)
      .maybeSingle();
    return (data as { name?: string } | null)?.name?.trim() || "Kreatur";
  }
  return "Neuer Inhalt";
}

export async function notifyCampaignEntityRevealedEmails(args: {
  supabase: SupabaseClient;
  campaignId: string;
  entityType: string;
  entityId: string;
}): Promise<void> {
  const kind = revealKindForEntity(args.entityType);
  if (!kind) return;

  const [memberIds, entityName, campaignRes] = await Promise.all([
    getCampaignMemberUserIds(args.supabase, args.campaignId),
    loadRevealEntityName(args.supabase, args.entityType, args.entityId),
    (args.supabase.from("campaigns") as any)
      .select("name")
      .eq("id", args.campaignId)
      .maybeSingle(),
  ]);

  const campaignName = String((campaignRes.data as { name?: string } | null)?.name ?? "Kampagne");
  const typeLabel =
    args.entityType === "npc"
      ? "NPC"
      : args.entityType === "faction"
        ? "Fraktion"
        : args.entityType === "bestarium"
          ? "Bestarium-Eintrag"
          : "Lore-Eintrag";

  const tab =
    args.entityType === "npc"
      ? "npcs"
      : args.entityType === "faction"
        ? "npcs"
        : "lore";

  for (const userId of memberIds) {
    const result = await sendIfAllowed({
      supabase: args.supabase,
      userId,
      kind,
      referenceKey: `reveal:${args.entityType}:${args.entityId}`,
      subject: `Neu in ${campaignName}: ${entityName}`,
      title: `Neuer ${typeLabel}`,
      intro: `In <strong>${campaignName}</strong> wurde <strong>${entityName}</strong> für die Spielergruppe freigeschaltet.`,
      ctaLabel: "In der Kampagne ansehen",
      ctaUrl: `${SITE_URL()}/dashboard/campaigns/${args.campaignId}?tab=${tab}`,
    });
    if (result.error) {
      console.error("[email] reveal notify failed", result.error);
    }
  }
}

export async function notifyPollPublishedEmails(args: {
  supabase: SupabaseClient;
  campaignId: string;
  pollId: string;
  question: string;
}): Promise<void> {
  const memberIds = await getCampaignMemberUserIds(args.supabase, args.campaignId);
  const { data: campaign } = await (args.supabase.from("campaigns") as any)
    .select("name")
    .eq("id", args.campaignId)
    .maybeSingle();
  const campaignName = String((campaign as { name?: string } | null)?.name ?? "Kampagne");

  for (const userId of memberIds) {
    const result = await sendIfAllowed({
      supabase: args.supabase,
      userId,
      kind: "poll_published",
      referenceKey: `poll:${args.pollId}`,
      subject: `Neue Umfrage in ${campaignName}`,
      title: "Umfrage in deiner Kampagne",
      intro: `In <strong>${campaignName}</strong> gibt es eine neue Umfrage: <strong>${args.question}</strong>. Stimme ab und sammle TableHeroes-Punkte.`,
      ctaLabel: "Zur Umfrage",
      ctaUrl: `${SITE_URL()}/dashboard/campaigns/${args.campaignId}?tab=polls`,
    });
    if (result.error) {
      console.error("[email] poll published failed", result.error);
    }
  }
}

export async function notifyAchievementEmail(args: {
  supabase: SupabaseClient;
  userId: string;
  achievementId: string;
  achievementName: string;
  pointsAwarded: number;
}): Promise<void> {
  const result = await sendIfAllowed({
    supabase: args.supabase,
    userId: args.userId,
    kind: "achievements",
    referenceKey: `achievement:${args.achievementId}`,
    subject: `Achievement freigeschaltet: ${args.achievementName}`,
    title: "Neues Achievement!",
    intro: `Du hast das Achievement <strong>${args.achievementName}</strong> erhalten${
      args.pointsAwarded > 0
        ? ` und <strong>+${args.pointsAwarded} TableHeroes-Punkte</strong> verdient`
        : ""
    }.`,
    ctaLabel: "Zum Dashboard",
    ctaUrl: `${SITE_URL()}/dashboard`,
  });
  if (result.error) {
    console.error("[email] achievement notify failed", result.error);
  }
}

export async function notifyPointsReceivedEmail(args: {
  supabase: SupabaseClient;
  userId: string;
  campaignId: string | null;
  amount: number;
  reason: string;
  referenceKey: string;
}): Promise<void> {
  const sign = args.amount > 0 ? "+" : "";
  let campaignLabel = "Table Heroes";
  if (args.campaignId) {
    const { data: campaign } = await (args.supabase.from("campaigns") as any)
      .select("name")
      .eq("id", args.campaignId)
      .maybeSingle();
    campaignLabel = String((campaign as { name?: string } | null)?.name ?? "Kampagne");
  }

  const result = await sendIfAllowed({
    supabase: args.supabase,
    userId: args.userId,
    kind: "points_received",
    referenceKey: args.referenceKey,
    subject: `${sign}${args.amount} TableHeroes-Punkte`,
    title: "Punkte erhalten",
    intro: `Dir wurden <strong>${sign}${args.amount} Punkte</strong> gutgeschrieben (${args.reason}) — Kontext: <strong>${campaignLabel}</strong>.`,
    ctaLabel: "Punktestand ansehen",
    ctaUrl: `${SITE_URL()}/dashboard`,
  });
  if (result.error) {
    console.error("[email] points notify failed", result.error);
  }
}

export async function notifySessionLiveEmails(args: {
  supabase: SupabaseClient;
  sessionId: string;
  campaignId: string;
  sessionTitle: string;
}): Promise<void> {
  const memberIds = await getCampaignMemberUserIds(args.supabase, args.campaignId);
  const { data: campaign } = await (args.supabase.from("campaigns") as any)
    .select("name")
    .eq("id", args.campaignId)
    .maybeSingle();
  const campaignName = String((campaign as { name?: string } | null)?.name ?? "Kampagne");
  const title = args.sessionTitle.trim() || "Live-Session";

  for (const userId of memberIds) {
    const result = await sendIfAllowed({
      supabase: args.supabase,
      userId,
      kind: "session_live",
      referenceKey: `session-live:${args.sessionId}`,
      subject: `Session live: ${title}`,
      title: "Die Session hat begonnen",
      intro: `Dein Spielleiter hat <strong>${title}</strong> in <strong>${campaignName}</strong> gestartet. Du kannst jetzt an der Live-Session teilnehmen.`,
      ctaLabel: "Zur Live-Session",
      ctaUrl: `${SITE_URL()}/session/${args.sessionId}`,
    });
    if (result.error) {
      console.error("[email] session live failed", result.error);
    }
  }
}
