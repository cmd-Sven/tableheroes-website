import { createClient } from "@/src/lib/supabase/server";
import fs from "fs";
import path from "path";
import type {
  LoreSnippet,
  DashboardLoreEntry,
  UpcomingSession,
  SessionParticipant,
  SessionRsvp,
  RsvpStatus,
} from "@/src/lib/types/dashboard-widgets";
import { getVisibilityForCampaign } from "@/src/app/dashboard/campaigns/[id]/campaign-visibility-queries";
import {
  isSessionStatusLive,
  isSessionStatusScheduled,
  isSessionStatusTerminal,
} from "@/src/lib/session-status";
import { isStaleLiveSession, sortSessionsForDashboardFocus } from "@/src/lib/session-focus";
import { sessionRequiresCharacter, parseSessionType } from "@/src/lib/session-type";

const MEMBER_CAMPAIGN_STATUSES = [
  "Accepted",
  "Approved",
  "Active",
  "Drafting",
  "In_Review",
  "Changes_Proposed",
] as const;

/** Live-Sessions bis 48h nach Start; gleiches Fenster für DB-Vorfilter bei kommenden Terminen. */
const UPCOMING_SESSION_FETCH_CUTOFF_MS = 48 * 60 * 60 * 1000;

async function resolveUserCampaignIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string[]> {
  const { data: memberRows } = await (supabase.from("campaign_members") as any)
    .select("campaign_id")
    .eq("user_id", userId)
    .in("status", [...MEMBER_CAMPAIGN_STATUSES]);

  const memberCampaignIds = ((memberRows as any[]) || []).map(
    (m: any) => m.campaign_id as string,
  );

  const { data: gmCampaignRows } = await (supabase.from("campaigns") as any)
    .select("id")
    .or(`gm_id.eq.${userId},owner_id.eq.${userId}`);

  const gmCampaignIds = ((gmCampaignRows as any[]) || []).map((c: any) => c.id as string);

  return [...new Set([...memberCampaignIds, ...gmCampaignIds])];
}

async function fetchSessionsForCampaignIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  campaignIds: string[],
  orderAscending: boolean,
  rowLimit: number,
  options?: { focusUpcoming?: boolean },
): Promise<any[]> {
  if (campaignIds.length === 0) return [];

  const effectiveLimit = options?.focusUpcoming ? Math.max(rowLimit, 80) : rowLimit;
  const startTimeCutoff = options?.focusUpcoming
    ? new Date(Date.now() - UPCOMING_SESSION_FETCH_CUTOFF_MS).toISOString()
    : null;

  const applyFilters = (query: any) => {
    let q = query.in("campaign_id", campaignIds);
    if (startTimeCutoff) {
      q = q.gte("start_time", startTimeCutoff);
    }
    return q.order("start_time", { ascending: orderAscending }).limit(effectiveLimit);
  };

  const { data: d1, error: e1 } = await applyFilters(
    (supabase.from("sessions") as any).select(
      "id, title, start_time, end_time, status, campaign_id, type, rsvp_deadline_days, is_live",
    ),
  );

  if (!e1) return (d1 as any[]) || [];

  console.error("[fetchSessionsForCampaignIds] Fallback nach Spaltenfehler:", {
    message: (e1 as { message?: string }).message,
    code: (e1 as { code?: string }).code,
  });

  const { data: d2, error: e2 } = await applyFilters(
    (supabase.from("sessions") as any).select(
      "id, title, start_time, status, campaign_id, type",
    ),
  );

  if (e2) {
    console.error("[fetchSessionsForCampaignIds] Minimal-Select fehlgeschlagen:", e2);
    return [];
  }

  return ((d2 as any[]) || []).map((s) => ({
    ...s,
    end_time: null,
    rsvp_deadline_days: null,
    is_live: true,
  }));
}

const LORE_TEASER_LENGTH = 150;
const COMIC_IMAGE_DIR = path.join(process.cwd(), "public", "images", "comic");
const IMAGE_EXTENSIONS = [".png", ".webp", ".jpg", ".jpeg", ".gif"];

/**
 * Lädt einen zufälligen Lore-Eintrag, der für den Spieler in einer seiner Kampagnen
 * sichtbar ist (campaign_visibility.is_revealed).
 * hasNewContent: true, wenn der Eintrag jünger ist als last_lore_view.
 */
export async function getRandomLoreSnippet(userId: string): Promise<{
  snippet: LoreSnippet | null;
  hasNewContent: boolean;
}> {
  const supabase = await createClient();

  const { data: userRow } = await (supabase.from("users") as any)
    .select("last_lore_view")
    .eq("id", userId)
    .maybeSingle();
  const lastView = (userRow as any)?.last_lore_view ?? null;

  const { data: memberships } = await (supabase.from("campaign_members") as any)
    .select("campaign_id")
    .eq("user_id", userId)
    .in("status", ["Approved", "Active"]);

  const campaignIds = [
    ...new Set(
      ((memberships as any[]) || [])
        .map((m: any) => m.campaign_id)
        .filter(Boolean)
    ),
  ];
  if (campaignIds.length === 0) return { snippet: null, hasNewContent: false };

  const { data: campaigns } = await (supabase.from("campaigns") as any)
    .select("id, name, world_id")
    .in("id", campaignIds)
    .not("world_id", "is", null);

  const allRevealed: Array<{ id: string; name: string; description: string | null; updated_at: string | null; created_at: string | null; campaign_id: string; campaign_name: string }> = [];

  for (const camp of campaigns || []) {
    const visibility = await getVisibilityForCampaign(camp.id, "lore");
    const revealedIds = Object.entries(visibility)
      .filter(([, v]) => v)
      .map(([entityId]) => entityId);
    if (revealedIds.length === 0) continue;
    const { data: loreRows } = await (supabase.from("world_lore") as any)
      .select("id, name, description, updated_at, created_at")
      .in("id", revealedIds)
      .limit(50);
    (loreRows || []).forEach((row: any) => {
      allRevealed.push({
        ...row,
        campaign_id: camp.id,
        campaign_name: camp.name,
      });
    });
  }

  if (allRevealed.length === 0) return { snippet: null, hasNewContent: false };

  const picked = allRevealed[Math.floor(Math.random() * allRevealed.length)];
  const contentAt = picked.updated_at ?? picked.created_at ?? null;
  const hasNewContent =
    !!contentAt && (!lastView || new Date(contentAt) > new Date(lastView));

  const rawDescription = picked.description ?? "";
  const teaser =
    rawDescription.length <= LORE_TEASER_LENGTH
      ? rawDescription
      : rawDescription.slice(0, LORE_TEASER_LENGTH).trim() + "…";

  const snippet: LoreSnippet = {
    id: picked.id,
    name: picked.name ?? "Lore",
    teaser: teaser || "Keine Beschreibung.",
    campaignId: picked.campaign_id,
    campaignName: picked.campaign_name ?? "Kampagne",
  };
  return { snippet, hasNewContent };
}

type RevealedEntry = {
  id: string;
  name: string;
  imageUrl: string | null;
  type: "lore" | "npc" | "faction";
  campaignId: string;
  campaignName: string;
};

/**
 * Lädt einen zufälligen sichtbaren Eintrag (Lore, NPC, Fraktion, Ort, Rasse, etc.)
 * aus Kampagnen, denen der Spieler beigetreten ist.
 * Nur Einträge, die für Spieler freigegeben sind (campaign_visibility.is_revealed).
 */
export async function getRandomLoreEntry(userId: string): Promise<{
  entry: DashboardLoreEntry | null;
  hasNewContent: boolean;
}> {
  const supabase = await createClient();

  const { data: userRow } = await (supabase.from("users") as any)
    .select("last_lore_view")
    .eq("id", userId)
    .maybeSingle();
  const lastView = (userRow as any)?.last_lore_view ?? null;

  const { data: memberships } = await (supabase.from("campaign_members") as any)
    .select("campaign_id")
    .eq("user_id", userId)
    .in("status", ["Approved", "Active"]);

  const campaignIds = [
    ...new Set(
      ((memberships as any[]) || [])
        .map((m: any) => m.campaign_id)
        .filter(Boolean)
    ),
  ];
  if (campaignIds.length === 0) return { entry: null, hasNewContent: false };

  const { data: campaigns } = await (supabase.from("campaigns") as any)
    .select("id, name, world_id")
    .in("id", campaignIds);

  const allRevealed: RevealedEntry[] = [];

  await Promise.all(
    (campaigns || []).map(async (camp: { id: string; name?: string | null; world_id?: string | null }) => {
      const worldId = (camp as any).world_id;
      const campaignId = (camp as any).id;
      const campaignName = (camp as any).name ?? "Kampagne";

      const [loreVisibility, npcVisibility, factionVisibility] = await Promise.all([
        getVisibilityForCampaign(campaignId, "lore"),
        worldId ? getVisibilityForCampaign(campaignId, "npc") : Promise.resolve({}),
        getVisibilityForCampaign(campaignId, "faction"),
      ]);

      const batch: RevealedEntry[] = [];

      if (worldId) {
        const loreRevealedIds = Object.entries(loreVisibility)
          .filter(([, v]) => v)
          .map(([entityId]) => entityId);
        if (loreRevealedIds.length > 0) {
          const { data: loreRows } = await (supabase.from("world_lore") as any)
            .select("id, name, image_url")
            .in("id", loreRevealedIds);
          (loreRows || []).forEach((row: any) => {
            batch.push({
              id: row.id,
              name: row.name ?? "Lore",
              imageUrl: row.image_url ?? null,
              type: "lore",
              campaignId,
              campaignName,
            });
          });
        }

        const npcRevealedIds = Object.entries(npcVisibility)
          .filter(([, v]) => v)
          .map(([entityId]) => entityId);
        if (npcRevealedIds.length > 0) {
          const { data: npcRows } = await (supabase.from("npcs") as any)
            .select("id, name, image_url")
            .in("id", npcRevealedIds)
            .eq("world_id", worldId);
          (npcRows || []).forEach((row: any) => {
            batch.push({
              id: row.id,
              name: row.name ?? "NPC",
              imageUrl: row.image_url ?? null,
              type: "npc",
              campaignId,
              campaignName,
            });
          });
        }
      }

      const factionRevealedIds = Object.entries(factionVisibility)
        .filter(([, v]) => v)
        .map(([entityId]) => entityId);
      if (factionRevealedIds.length > 0) {
        const { data: factionRows } = await (supabase.from("factions") as any)
          .select("id, name, image_url")
          .in("id", factionRevealedIds)
          .eq("campaign_id", campaignId);
        (factionRows || []).forEach((row: any) => {
          batch.push({
            id: row.id,
            name: row.name ?? "Fraktion",
            imageUrl: row.image_url ?? null,
            type: "faction",
            campaignId,
            campaignName,
          });
        });
      }

      allRevealed.push(...batch);
    }),
  );

  if (allRevealed.length === 0) return { entry: null, hasNewContent: false };

  const picked = allRevealed[Math.floor(Math.random() * allRevealed.length)];

  const entry: DashboardLoreEntry = {
    id: picked.id,
    name: picked.name,
    imageUrl: picked.imageUrl,
    type: picked.type,
    campaignId: picked.campaignId,
    campaignName: picked.campaignName,
  };

  return { entry, hasNewContent: false };
}

/**
 * Scannt public/images/comic/ und gibt alle Bild-Dateinamen zurück (sortiert).
 */
function getComicFilenames(): string[] {
  try {
    if (!fs.existsSync(COMIC_IMAGE_DIR)) return [];
    const entries = fs.readdirSync(COMIC_IMAGE_DIR, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .filter((name) => {
        const lower = name.toLowerCase();
        return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
      })
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

/**
 * Wählt basierend auf dem aktuellen Datum (Tag als Seed) ein Bild aus dem Comic-Ordner.
 * Alle Spieler sehen am selben Tag denselben Comic.
 */
export async function getDailyComic(): Promise<{
  filename: string | null;
  src: string | null;
}> {
  const filenames = getComicFilenames();
  if (filenames.length === 0) return { filename: null, src: null };

  const today = new Date();
  const dateSeed =
    today.getFullYear() * 10000 +
    (today.getMonth() + 1) * 100 +
    today.getDate();
  const index = dateSeed % filenames.length;
  const filename = filenames[index];
  return {
    filename,
    src: `/images/comic/${encodeURIComponent(filename)}`,
  };
}

// ============================================================================
// Upcoming Sessions for Dashboard
// ============================================================================

/**
 * Lädt die nächsten geplanten & live Sessions über alle Kampagnen des Users.
 * Enthält Teilnehmer mit Charakter-Daten (Avatar, Klasse, Level).
 * @param limit Maximale Anzahl Sessions (Standard: 6). Für Übersichtsseite z.B. 50.
 */
export async function getUpcomingSessionsForUser(
  userId: string,
  limit = 6
): Promise<UpcomingSession[]> {
  const supabase = await createClient();

  const allCampaignIds = await resolveUserCampaignIds(supabase, userId);
  if (allCampaignIds.length === 0) {
    if (process.env.NODE_ENV === "development") {
      console.log("[getUpcomingSessionsForUser] Keine Kampagnen-IDs:", { userId });
    }
    return [];
  }

  const allSessions = await fetchSessionsForCampaignIds(
    supabase,
    allCampaignIds,
    true,
    limit * 3,
    { focusUpcoming: true },
  );

  const now = new Date();
  const staleLiveThresholdMs = 48 * 60 * 60 * 1000; // 48 Stunden
  // Nächste Termine: Scheduled (auch nach Startzeit) oder Live (max. 48h seit Start, sonst verwaist).
  const sessionsFiltered = allSessions
    .filter((s: any) => !isSessionStatusTerminal(s.status))
    .filter((s: any) => {
      if (isSessionStatusLive(s.status)) {
        if (s.start_time) {
          const startMs = new Date(s.start_time).getTime();
          if (now.getTime() - startMs > staleLiveThresholdMs) return false;
        }
        return true;
      }
      return isSessionStatusScheduled(s.status);
    });
  const sessions = sortSessionsForDashboardFocus(sessionsFiltered as any, now).slice(0, limit);

  if (sessions.length === 0) return [];

  // 3. Kampagnen-Details laden
  const sessionCampaignIds = [
    ...new Set(sessions.map((s: any) => s.campaign_id)),
  ];
  const { data: campaignsRaw } = await (supabase.from("campaigns") as any)
    .select("id, name, banner_url")
    .in("id", sessionCampaignIds);

  const campaignsById = new Map<
    string,
    { name: string; banner_url: string | null }
  >();
  for (const c of (campaignsRaw as any[]) || []) {
    campaignsById.set(c.id, { name: c.name, banner_url: c.banner_url });
  }

  // 4. Teilnehmer je Kampagne laden (gleiche Member-Status wie Schritt 1, sonst leere Liste trotz sichtbarer Termine)
  const { data: allMembersRaw } = await (
    supabase.from("campaign_members") as any
  )
    .select(
      `
      campaign_id,
      user_id,
      users ( id, username, avatar_url ),
      characters ( id, name, class, level, avatar_url )
    `
    )
    .in("campaign_id", sessionCampaignIds)
    .in("status", [...MEMBER_CAMPAIGN_STATUSES]);

  // Gruppiere Teilnehmer nach campaign_id
  const participantsByCampaign = new Map<string, SessionParticipant[]>();
  for (const row of (allMembersRaw as any[]) || []) {
    const cId = row.campaign_id as string;
    if (!participantsByCampaign.has(cId)) {
      participantsByCampaign.set(cId, []);
    }
    const user = row.users as any;
    const char = row.characters as any;

    participantsByCampaign.get(cId)!.push({
      userId: row.user_id,
      username: user?.username ?? "Unbekannt",
      avatarUrl: user?.avatar_url ?? null,
      characterName: char?.name ?? null,
      characterClass: char?.class ?? null,
      characterLevel: char?.level ?? null,
      characterAvatarUrl: char?.avatar_url ?? null,
    });
  }

  // 5. Session-RSVPs laden (session_rsvps)
  const sessionIds = sessions.map((s: any) => s.id);
  const { data: rsvpsRaw } = await (supabase.from("session_rsvps") as any)
    .select("session_id, user_id, rsvp_status, gm_confirmed")
    .in("session_id", sessionIds);

  const rsvpsBySession = new Map<string, Array<{ user_id: string; rsvp_status: string; gm_confirmed?: boolean }>>();
  for (const r of (rsvpsRaw as any[]) || []) {
    const sid = r.session_id as string;
    if (!rsvpsBySession.has(sid)) rsvpsBySession.set(sid, []);
    rsvpsBySession.get(sid)!.push({
      user_id: r.user_id,
      rsvp_status: r.rsvp_status,
      gm_confirmed: r.gm_confirmed,
    });
  }

  // 6. Sessions zusammenbauen
  const result: UpcomingSession[] = sessions.map((s: any) => {
    const campaign = campaignsById.get(s.campaign_id);
    const participants = participantsByCampaign.get(s.campaign_id) ?? [];
    const sessionRsvps = rsvpsBySession.get(s.id) ?? [];

    const userRsvpRow = sessionRsvps.find((r) => r.user_id === userId);
    const userRsvp = (userRsvpRow?.rsvp_status as RsvpStatus) ?? null;

    const rsvps: SessionRsvp[] = participants.map((p) => {
      const r = sessionRsvps.find((x) => x.user_id === p.userId);
      return {
        userId: p.userId,
        username: p.username,
        characterName: p.characterName,
        rsvpStatus: (r?.rsvp_status as RsvpStatus) ?? null,
        gmConfirmed: !!r?.gm_confirmed,
      };
    });

    const deadlineDays = s.rsvp_deadline_days ?? null;
    const startDate = new Date(s.start_time);
    let deadline: Date | null = null;
    if (deadlineDays) {
      deadline = new Date(startDate);
      deadline.setDate(deadline.getDate() - deadlineDays);
      deadline.setHours(23, 59, 59, 999);
    }
    const now = new Date();
    const deadlineReached = !!deadline && now >= deadline;
    const viaOnlineCount = sessionRsvps.filter((r) => r.rsvp_status === "Via Online").length;
    const viaOnlineTaken = s.is_live !== false && viaOnlineCount >= 1;

    return {
      id: s.id,
      title: s.title,
      startTime: s.start_time,
      endTime: s.end_time ?? null,
      status: s.status,
      campaignId: s.campaign_id,
      campaignName: campaign?.name ?? "Kampagne",
      campaignBannerUrl: campaign?.banner_url ?? null,
      participants,
      rsvpDeadlineDays: deadlineDays,
      isLive: s.is_live !== false,
      userRsvp,
      rsvps,
      deadlineReached,
      viaOnlineTaken,
      sessionType: parseSessionType(s.type),
      requiresCharacter: sessionRequiresCharacter(s.type),
    };
  });

  return result;
}

/** Nächster relevanter Termin (Live oder geplant) für Dashboard-Widgets — maximal einer. */
export async function getNextUpcomingAppointmentForUser(
  userId: string,
): Promise<UpcomingSession[]> {
  const upcoming = await getUpcomingSessionsForUser(userId, 12);
  if (upcoming.length === 0) return [];
  return [upcoming[0]];
}

/**
 * Lädt vergangene/beendete Sessions (Termine) des Users.
 * Beendet = GM hat als abgeschlossen gekennzeichnet (status Completed/Ended)
 * oder start_time liegt in der Vergangenheit.
 * Sortiert nach start_time absteigend (neueste zuerst).
 */
export async function getPastSessionsForUser(
  userId: string,
  limit = 20
): Promise<UpcomingSession[]> {
  const supabase = await createClient();

  const allCampaignIds = await resolveUserCampaignIds(supabase, userId);

  if (allCampaignIds.length === 0) return [];

  const allSessions = await fetchSessionsForCampaignIds(
    supabase,
    allCampaignIds,
    false,
    limit * 3,
  );

  const now = new Date();
  const sessions = allSessions
    .filter((s: any) => {
      if (isSessionStatusTerminal(s.status)) return true;
      if (isSessionStatusLive(s.status) && isStaleLiveSession(s, now)) return true;
      if (
        isSessionStatusScheduled(s.status) &&
        s.start_time &&
        new Date(s.start_time).getTime() <= now.getTime()
      ) {
        return true;
      }
      return false;
    })
    .slice(0, limit);

  if (sessions.length === 0) return [];

  const sessionCampaignIds = [...new Set(sessions.map((s: any) => s.campaign_id))];
  const { data: campaignsRaw } = await (supabase.from("campaigns") as any)
    .select("id, name, banner_url")
    .in("id", sessionCampaignIds);

  const campaignsById = new Map<string, { name: string; banner_url: string | null }>();
  for (const c of (campaignsRaw as any[]) || []) {
    campaignsById.set(c.id, { name: c.name, banner_url: c.banner_url });
  }

  const { data: allMembersRaw } = await (supabase.from("campaign_members") as any)
    .select("campaign_id, user_id, users(id, username, avatar_url), characters(id, name, class, level, avatar_url)")
    .in("campaign_id", sessionCampaignIds)
    .in("status", [...MEMBER_CAMPAIGN_STATUSES]);

  const participantsByCampaign = new Map<string, SessionParticipant[]>();
  for (const row of (allMembersRaw as any[]) || []) {
    const cId = row.campaign_id as string;
    if (!participantsByCampaign.has(cId)) participantsByCampaign.set(cId, []);
    const user = row.users as any;
    const char = row.characters as any;
    participantsByCampaign.get(cId)!.push({
      userId: row.user_id,
      username: user?.username ?? "Unbekannt",
      avatarUrl: user?.avatar_url ?? null,
      characterName: char?.name ?? null,
      characterClass: char?.class ?? null,
      characterLevel: char?.level ?? null,
      characterAvatarUrl: char?.avatar_url ?? null,
    });
  }

  const sessionIds = sessions.map((s: any) => s.id);
  const { data: rsvpsRaw } = await (supabase.from("session_rsvps") as any)
    .select("session_id, user_id, rsvp_status, gm_confirmed")
    .in("session_id", sessionIds);

  const rsvpsBySession = new Map<string, Array<{ user_id: string; rsvp_status: string; gm_confirmed?: boolean }>>();
  for (const r of (rsvpsRaw as any[]) || []) {
    const sid = r.session_id as string;
    if (!rsvpsBySession.has(sid)) rsvpsBySession.set(sid, []);
    rsvpsBySession.get(sid)!.push({ user_id: r.user_id, rsvp_status: r.rsvp_status, gm_confirmed: r.gm_confirmed });
  }

  return sessions.map((s: any) => {
    const campaign = campaignsById.get(s.campaign_id);
    const participants = participantsByCampaign.get(s.campaign_id) ?? [];
    const sessionRsvps = rsvpsBySession.get(s.id) ?? [];
    const userRsvpRow = sessionRsvps.find((r) => r.user_id === userId);
    const rsvps: SessionRsvp[] = participants.map((p) => {
      const r = sessionRsvps.find((x) => x.user_id === p.userId);
      return {
        userId: p.userId,
        username: p.username,
        characterName: p.characterName,
        rsvpStatus: (r?.rsvp_status as RsvpStatus) ?? null,
        gmConfirmed: !!r?.gm_confirmed,
      };
    });
    const deadlineDays = s.rsvp_deadline_days ?? null;
    const startDate = new Date(s.start_time);
    let deadline: Date | null = null;
    if (deadlineDays) {
      deadline = new Date(startDate);
      deadline.setDate(deadline.getDate() - deadlineDays);
      deadline.setHours(23, 59, 59, 999);
    }
    const deadlineReached = !!deadline && now >= deadline;
    const viaOnlineCount = sessionRsvps.filter((r) => r.rsvp_status === "Via Online").length;

    return {
      id: s.id,
      title: s.title,
      startTime: s.start_time,
      endTime: s.end_time ?? null,
      status: s.status,
      campaignId: s.campaign_id,
      campaignName: campaign?.name ?? "Kampagne",
      campaignBannerUrl: campaign?.banner_url ?? null,
      participants,
      rsvpDeadlineDays: deadlineDays,
      isLive: false,
      userRsvp: (userRsvpRow?.rsvp_status as RsvpStatus) ?? null,
      rsvps,
      deadlineReached,
      viaOnlineTaken: s.is_live !== false && viaOnlineCount >= 1,
      sessionType: parseSessionType(s.type),
      requiresCharacter: sessionRequiresCharacter(s.type),
    };
  });
}

/**
 * Kampagnen, in denen der Nutzer Mitglied ist, aber noch keinen Charakter hat
 * (weder über campaign_members.character_id noch characters pro Kampagne).
 */
export async function getPendingCharacterCampaignsForUser(
  userId: string
): Promise<{ campaignId: string; campaignName: string }[]> {
  const supabase = await createClient();
  try {
    const { data: cmNeedChar } = await (supabase.from("campaign_members") as any)
      .select("id, status, character_id, campaign_id, campaigns!inner(id, name)")
      .eq("user_id", userId)
      .in("status", ["Drafting", "In_Review", "Changes_Proposed", "Approved", "Active"]);
    const rows = (cmNeedChar as any[]) || [];
    const campIds = [...new Set(rows.map((r: any) => r.campaign_id).filter(Boolean))];
    const charByCampaign = new Map<string, string>();
    if (campIds.length > 0) {
      const { data: charRows } = await (supabase.from("characters") as any)
        .select("id, campaign_id")
        .eq("user_id", userId)
        .in("campaign_id", campIds);
      for (const c of (charRows as any[]) || []) {
        if (c.campaign_id) charByCampaign.set(c.campaign_id, c.id);
      }
    }
    const seen = new Set<string>();
    const out: { campaignId: string; campaignName: string }[] = [];
    for (const m of rows) {
      const cid = m.campaign_id as string | undefined;
      if (!cid || !m.campaigns?.id) continue;
      const hasChar = !!(m.character_id || charByCampaign.has(cid));
      if (hasChar) continue;
      if (seen.has(m.campaigns.id)) continue;
      seen.add(m.campaigns.id);
      out.push({
        campaignId: m.campaigns.id,
        campaignName: (m.campaigns.name as string) || "Kampagne",
      });
    }
    return out;
  } catch (e) {
    console.warn("[getPendingCharacterCampaignsForUser]", e);
    return [];
  }
}
