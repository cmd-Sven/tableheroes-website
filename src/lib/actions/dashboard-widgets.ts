"use server";

import { createClient } from "@/src/lib/supabase/server";
import fs from "fs";
import path from "path";
import type {
  LoreSnippet,
  UpcomingSession,
  SessionParticipant,
} from "@/src/lib/types/dashboard-widgets";

const LORE_TEASER_LENGTH = 150;
const COMIC_IMAGE_DIR = path.join(process.cwd(), "public", "images", "comic");
const IMAGE_EXTENSIONS = [".png", ".webp", ".jpg", ".jpeg", ".gif"];

/**
 * Lädt einen zufälligen Lore-Eintrag aus world_lore, der is_revealed === true ist
 * und zu einer Kampagne gehört, in der der Spieler Mitglied ist.
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
    .eq("status", "Accepted");

  const campaignIds = [
    ...new Set(
      ((memberships as any[]) || [])
        .map((m: any) => m.campaign_id)
        .filter(Boolean)
    ),
  ];
  if (campaignIds.length === 0) return { snippet: null, hasNewContent: false };

  const { data: loreRows } = await (supabase.from("world_lore") as any)
    .select("id, name, description, campaign_id, updated_at, created_at")
    .in("campaign_id", campaignIds)
    .eq("is_revealed", true)
    .limit(50);

  const list = (loreRows as any[]) || [];
  if (list.length === 0) return { snippet: null, hasNewContent: false };

  const picked = list[Math.floor(Math.random() * list.length)];
  const campaignId = picked.campaign_id;
  const contentAt = picked.updated_at ?? picked.created_at ?? null;
  const hasNewContent =
    !!contentAt && (!lastView || new Date(contentAt) > new Date(lastView));

  const { data: campaign } = await (supabase.from("campaigns") as any)
    .select("name")
    .eq("id", campaignId)
    .single();

  const rawDescription = picked.description ?? "";
  const teaser =
    rawDescription.length <= LORE_TEASER_LENGTH
      ? rawDescription
      : rawDescription.slice(0, LORE_TEASER_LENGTH).trim() + "…";

  const snippet: LoreSnippet = {
    id: picked.id,
    name: picked.name ?? "Lore",
    teaser: teaser || "Keine Beschreibung.",
    campaignId,
    campaignName: (campaign as any)?.name ?? "Kampagne",
  };
  return { snippet, hasNewContent };
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
 */
export async function getUpcomingSessionsForUser(
  userId: string
): Promise<UpcomingSession[]> {
  const supabase = await createClient();

  // 1. Alle Kampagnen des Users (als Spieler oder GM)
  const { data: memberRows } = await (
    supabase.from("campaign_members") as any
  )
    .select("campaign_id")
    .eq("user_id", userId)
    .eq("status", "Accepted");

  const memberCampaignIds = (
    (memberRows as any[]) || []
  ).map((m: any) => m.campaign_id as string);

  // Auch GM-Kampagnen einbeziehen
  const { data: gmCampaignRows } = await (supabase.from("campaigns") as any)
    .select("id")
    .eq("gm_id", userId);

  const gmCampaignIds = (
    (gmCampaignRows as any[]) || []
  ).map((c: any) => c.id as string);

  const allCampaignIds = [...new Set([...memberCampaignIds, ...gmCampaignIds])];
  if (allCampaignIds.length === 0) return [];

  // 2. Upcoming Sessions laden (Scheduled oder Live)
  const { data: sessionsRaw } = await (supabase.from("sessions") as any)
    .select("id, title, start_time, status, campaign_id")
    .in("campaign_id", allCampaignIds)
    .in("status", ["Scheduled", "Live"])
    .order("start_time", { ascending: true })
    .limit(6);

  const sessions = (sessionsRaw as any[]) || [];
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

  // 4. Teilnehmer je Kampagne laden (Accepted Members + deren Charaktere)
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
    .eq("status", "Accepted");

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

  // 5. Sessions zusammenbauen
  const result: UpcomingSession[] = sessions.map((s: any) => {
    const campaign = campaignsById.get(s.campaign_id);
    return {
      id: s.id,
      title: s.title,
      startTime: s.start_time,
      status: s.status,
      campaignId: s.campaign_id,
      campaignName: campaign?.name ?? "Kampagne",
      campaignBannerUrl: campaign?.banner_url ?? null,
      participants: participantsByCampaign.get(s.campaign_id) ?? [],
    };
  });

  return result;
}
