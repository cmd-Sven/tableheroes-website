import { createClient } from "@/src/lib/supabase/server";
import { getRankFromPoints } from "@/src/lib/utils/rank-utils";
import { getUserAchievements } from "@/src/lib/queries/achievement-queries";
import {
  getRandomLoreEntry,
  getDailyComic,
  getUpcomingSessionsForUser,
  getPendingCharacterCampaignsForUser,
} from "@/src/lib/queries/dashboard-widgets-queries";
import { getNewsForDashboard } from "@/src/lib/queries/news-queries";
import {
  getGMNotifications,
  getGMRecipients,
  getPlayerMessages,
  getUnreadInboxMessages,
} from "@/src/lib/queries/message-queries";
import { getPointsLog } from "@/src/lib/queries/point-queries";
import { DashboardClient } from "@/src/components/dashboard/DashboardClient";
import { GMDashboardClient } from "@/src/components/dashboard/GMDashboardClient";
import type { PendingApplication } from "@/src/components/dashboard/GMNotificationsWidget";
import type { HeroSliderCharacter } from "@/src/components/dashboard/HeroSlider";

type UserProfile = {
  username: string | null;
  primary_role: string;
  avatar_url?: string | null;
  avatar_shape?: "circle" | "square" | null;
  created_at?: string | null;
  total_points?: number | null;
  lifetime_points?: number | null;
  profile_background?: string | null;
  profile_background_url?: string | null;
  show_rank?: boolean | null;
  show_points?: boolean | null;
  profile_achievement_mode?: "newest" | "specific" | null;
  selected_achievement_id?: string | null;
  slogan?: string | null;
  show_slogan?: boolean | null;
  avatar_position_x?: number | null;
  avatar_position_y?: number | null;
  banner_position_x?: number | null;
  banner_position_y?: number | null;
  /** Altes Format: string[] (Reihenfolge), neues Format: { id, x_pos, y_pos, width }[] */
  dashboard_layout?: unknown;
  privacy_public_profile?: boolean | null;
  is_backer?: boolean | null;
  backer_since?: string | null;
  player_dashboard_tutorial_dismissed?: boolean | null;
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profileRaw } = await (supabase.from("users") as any)
    .select("*")
    .eq("id", user.id)
    .single();

  const profile = profileRaw as unknown as UserProfile | null;
  const isGM =
    profile?.primary_role === "GameMaster" || profile?.primary_role === "Admin";

  const totalPoints = Number(profile?.total_points) || 0;
  const lifetimePoints = Number(profile?.lifetime_points) || 0;
  const rank = getRankFromPoints(lifetimePoints);
  const favoriteAchievements: {
    id: string;
    name: string;
    icon?: string | null;
  }[] = [];

  if (!isGM) {
    const playerData = await loadPlayerDashboardData(user.id);
    const achievementMode = profile?.profile_achievement_mode ?? "newest";
    const favAchievementId = profile?.selected_achievement_id ?? null;
    const favoriteAchievementsResolved =
      achievementMode === "specific" && favAchievementId
        ? playerData.achievements.filter((a) => a.id === favAchievementId)
        : playerData.achievements.slice(0, 3);
    const profileHeader = {
      username:
        (profile as { display_name?: string | null })?.display_name ??
        profile?.username ??
        null,
      avatarUrl: profile?.avatar_url ?? null,
      avatarShape: (profile?.avatar_shape as "circle" | "square") ?? "circle",
      avatarPositionX: profile?.avatar_position_x ?? 50,
      avatarPositionY: profile?.avatar_position_y ?? 50,
      backgroundType: (profile?.profile_background_url ? "image" : "color") as
        | "color"
        | "image",
      backgroundColor: profile?.profile_background ?? null,
      backgroundImageUrl: profile?.profile_background_url ?? null,
      bannerPositionX: profile?.banner_position_x ?? 50,
      bannerPositionY: profile?.banner_position_y ?? 50,
      memberSince: profile?.created_at ?? null,
      rank,
      lifetimePoints,
      totalPoints,
      favoriteAchievements: favoriteAchievementsResolved,
      showRank: profile?.show_rank ?? true,
      showPoints: profile?.show_points ?? true,
      slogan: profile?.slogan ?? null,
      showSlogan: !!profile?.show_slogan,
    };
    return (
      <div className="space-y-8">
        <DashboardClient
          profileHeader={profileHeader}
          dashboardLayout={
            Array.isArray(profile?.dashboard_layout)
              ? (profile.dashboard_layout as
                  | import("@/src/lib/utils/layout-engine").LayoutItem[]
                  | string[])
              : undefined
          }
          newAcceptances={playerData.newAcceptances}
          totalPoints={playerData.totalPoints}
          lifetimePoints={playerData.lifetimePoints}
          achievements={playerData.achievements}
          membershipsWithGm={playerData.membershipsWithGm}
          heroCharacters={playerData.heroCharacters}
          playerMessages={playerData.playerMessages}
          discoverableCampaigns={playerData.discoverableCampaigns}
          randomLoreEntry={playerData.randomLoreEntry}
          dailyComic={playerData.dailyComic}
          dashboardNews={playerData.dashboardNews}
          hasNewNews={playerData.hasNewNews}
          hasNewAchievements={playerData.hasNewAchievements}
          newestAchievement={playerData.newestAchievement}
          hasNewLore={playerData.hasNewLore}
          upcomingSessions={playerData.upcomingSessions}
          isBacker={!!profile?.is_backer}
          backerSince={profile?.backer_since ?? null}
          pointsHistory={playerData.pointsHistory}
          unreadInboxMessages={playerData.unreadInboxMessages}
          sessionConfirmationPending={playerData.sessionConfirmationPending}
          sessionRsvpHref={playerData.sessionRsvpHref}
          pendingCharacterCampaigns={playerData.pendingCharacterCampaigns}
          openCampaignsParticipantIds={playerData.openCampaignsParticipantIds}
          playerDashboardTutorialDismissed={
            !!profile?.player_dashboard_tutorial_dismissed
          }
        />
      </div>
    );
  }

  const gmData = await loadGMDashboardData(user.id);
  const gmDisplayName =
    (profile as { display_name?: string | null })?.display_name ||
    profile?.username ||
    "Abenteurer";

  return (
    <GMDashboardClient
      displayName={gmDisplayName}
      campaigns={gmData.campaigns}
      pendingApplications={gmData.pendingApplications}
      upcomingSessions={gmData.upcomingSessions}
      dashboardNews={gmData.dashboardNews}
      dailyComic={gmData.dailyComic}
      gmNotifications={gmData.gmNotifications}
      gmRecipientCampaigns={gmData.gmRecipientCampaigns}
    />
  );
}

async function loadPlayerDashboardData(userId: string) {
  const supabase = await createClient();
  let totalPoints = 0;
  let lifetimePoints = 0;
  try {
    const { data } = await (supabase.from("users") as any)
      .select("total_points, lifetime_points")
      .eq("id", userId)
      .single();
    totalPoints = Number((data as any)?.total_points) || 0;
    lifetimePoints = Number((data as any)?.lifetime_points) || 0;
  } catch {
    totalPoints = 0;
    lifetimePoints = 0;
  }
  const earnedAchievementsResult = await getUserAchievements(userId);
  const achievements = earnedAchievementsResult.achievements.map((a) => ({
    id: a.id,
    name: a.name,
    icon: a.image_url ?? null,
    image_url: a.image_url ?? null,
    points_awarded: a.points_awarded ?? 0,
    description: a.description ?? null,
  }));
  const hasNewAchievements = earnedAchievementsResult.hasNewContent;

  console.log("[Dashboard] Achievements geladen für User:", userId, "Anzahl:", achievements.length);

  const { data: membershipsRaw } = await (
    supabase.from("campaign_members") as any
  )
    .select("campaign_id, status, character_id, campaigns ( id, name, system, banner_url, gm_id )")
    .eq("user_id", userId)
    .in("status", [
      "Drafting",
      "In_Review",
      "Changes_Proposed",
      "Approved",
      "Active",
    ]);

  const memberships = (membershipsRaw as any[]) || [];
  let characterIds = [...new Set(memberships.map((m: any) => m.character_id).filter(Boolean))];

  // Fallback: Wenn character_id fehlt, Charakter aus characters (user_id + campaign_id) laden
  const membershipsWithoutChar = memberships.filter((m: any) => !m.character_id && (m.campaign_id ?? m.campaigns?.id));
  if (membershipsWithoutChar.length > 0) {
    const campaignIds = [...new Set(membershipsWithoutChar.map((m: any) => m.campaign_id ?? m.campaigns?.id))];
    const { data: fallbackChars } = await (supabase.from("characters") as any)
      .select("id, name, class, race, level, avatar_url, status, campaign_id")
      .eq("user_id", userId)
      .in("campaign_id", campaignIds)
      .in("status", ["Active"]);
    for (const m of membershipsWithoutChar) {
      const campId = m.campaign_id ?? m.campaigns?.id;
      const char = (fallbackChars as any[])?.find((c: any) => c.campaign_id === campId);
      if (char) {
        (m as any).character_id = char.id;
        characterIds.push(char.id);
      }
    }
    characterIds = [...new Set(characterIds)];
  }

  let characterMap = new Map<string, { id: string; name: string; class: string; race: string; level: number; avatar_url: string | null; status: string }>();
  if (characterIds.length > 0) {
    const { data: charRows } = await (supabase.from("characters") as any)
      .select("id, name, class, race, level, avatar_url, status")
      .in("id", characterIds);
    characterMap = new Map(
      ((charRows as any[]) || []).map((c: any) => [
        c.id,
        {
          id: c.id,
          name: c.name ?? "",
          class: c.class ?? "",
          race: c.race ?? "",
          level: c.level ?? 1,
          avatar_url: c.avatar_url ?? null,
          status: c.status ?? "Active",
        },
      ])
    );
  }
  const membershipsWithChars = memberships.map((m: any) => ({
    ...m,
    characters: m.character_id ? characterMap.get(m.character_id) ?? null : null,
  }));

  const gmIds = [
    ...new Set(memberships.map((m: any) => m.campaigns?.gm_id).filter(Boolean)),
  ];
  let gmById: Record<string, string> = {};
  if (gmIds.length > 0) {
    const { data: gmUsers } = await (supabase.from("users") as any)
      .select("id, username")
      .in("id", gmIds);
    gmById = Object.fromEntries(
      ((gmUsers as any[]) || []).map((u: any) => [
        u.id,
        u.username || "Spielleiter",
      ])
    );
  }

  const membershipsWithGm = membershipsWithChars.map((m: any) => ({
    campaign: m.campaigns,
    character: m.characters
      ? {
          id: m.characters.id,
          name: m.characters.name,
          class: m.characters.class ?? "",
          race: m.characters.race ?? "",
          level: m.characters.level ?? 1,
          avatar_url: m.characters.avatar_url ?? null,
        }
      : null,
    gmName: m.campaigns?.gm_id
      ? gmById[m.campaigns.gm_id] ?? "Spielleiter"
      : "Spielleiter",
  }));

  const heroCharacters: HeroSliderCharacter[] = membershipsWithChars
    .filter((m: any) => m.characters?.name)
    .map((m: any) => ({
      id: m.characters.id,
      name: m.characters.name,
      class: m.characters.class ?? "",
      race: m.characters.race ?? "",
      level: m.characters.level ?? 1,
      avatar_url: m.characters.avatar_url ?? null,
      campaignId: m.campaigns.id,
      campaignName: m.campaigns.name ?? "Kampagne",
      status: m.characters.status ?? undefined,
    }));

  const { data: newAcceptancesRaw } = await (
    supabase.from("campaign_members") as any
  )
    .select("id, campaign_id, campaigns!inner(id, name)")
    .eq("user_id", userId)
    .eq("status", "Approved")
    .eq("has_seen_acceptance", false);
  const newAcceptances = ((newAcceptancesRaw as any[]) || []).map((a: any) => ({
    id: a.id,
    campaignId: a.campaigns.id,
    campaignName: a.campaigns.name,
  }));

  const discoverableCampaigns = await getDiscoverableCampaigns();
  const [
    loreResult,
    dailyComic,
    newsResult,
    upcomingSessions,
    playerMessages,
    pointsHistory,
    unreadInboxMessages,
    pendingCharacterCampaigns,
  ] = await Promise.all([
    getRandomLoreEntry(userId),
    getDailyComic(),
    getNewsForDashboard(userId),
    getUpcomingSessionsForUser(userId),
    getPlayerMessages(userId),
    getPointsLog(userId, 5),
    getUnreadInboxMessages(userId),
    getPendingCharacterCampaignsForUser(userId),
  ]);

  const noRsvpCampaignIds = new Set(
    pendingCharacterCampaigns.map((p) => p.campaignId)
  );
  const firstPendingRsvpSession = upcomingSessions.find(
    (s) =>
      s.status === "Scheduled" &&
      !s.userRsvp &&
      s.deadlineReached &&
      !noRsvpCampaignIds.has(s.campaignId)
  );
  const sessionRsvpHref = firstPendingRsvpSession
    ? `/dashboard/campaigns/${firstPendingRsvpSession.campaignId}?tab=sessions`
    : null;

  console.log("[Dashboard] Points History geladen für User:", userId, "Anzahl:", pointsHistory.length);

  /** Kampagne-IDs, in denen der Spieler nach SL-Bestätigung Mitglied ist (wie „Meine Kampagnen“). */
  const openCampaignsParticipantIds = [
    ...new Set(
      memberships
        .map((m: any) => (m.campaign_id as string) ?? m.campaigns?.id)
        .filter(Boolean),
    ),
  ];

  return {
    totalPoints,
    lifetimePoints,
    achievements,
    membershipsWithGm,
    heroCharacters,
    playerMessages,
    newAcceptances,
    discoverableCampaigns,
    openCampaignsParticipantIds,
    randomLoreEntry: loreResult.entry,
    dailyComic,
    dashboardNews: newsResult.posts,
    hasNewNews: newsResult.hasNewContent,
    hasNewAchievements,
    newestAchievement: earnedAchievementsResult.newestAchievement,
    hasNewLore: loreResult.hasNewContent,
    upcomingSessions,
    pointsHistory,
    unreadInboxMessages,
    sessionConfirmationPending: upcomingSessions.some(
      (s) =>
        s.status === "Scheduled" &&
        !s.userRsvp &&
        s.deadlineReached &&
        !noRsvpCampaignIds.has(s.campaignId)
    ),
    sessionRsvpHref,
    pendingCharacterCampaigns,
  };
}

// ----------------------------------------------------------------------------
// GM DATA LOADER
// ----------------------------------------------------------------------------
async function loadGMDashboardData(userId: string) {
  const supabase = await createClient();

  // Alle Daten parallel laden für maximale Performance
  const [
    campaignsRes,
    applicationsRes,
    newsResult,
    dailyComic,
    upcomingSessions,
    gmNotifications,
    gmRecipientCampaigns,
  ] = await Promise.all([
    // 1. GM-Kampagnen
    (supabase.from("campaigns") as any)
      .select("id, name, system, max_players")
      .eq("gm_id", userId)
      .order("created_at", { ascending: false }),

    // 2. Offene Bewerbungen MIT User-Daten
    (supabase.from("campaign_members") as any)
      .select(
        `
        id,
        campaign_id,
        user_id,
        created_at,
        campaigns!inner ( id, name, gm_id ),
        users ( id, username, avatar_url )
      `
      )
      .eq("campaigns.gm_id", userId)
      .eq("status", "Applied")
      .order("created_at", { ascending: false }),

    // 3. News
    getNewsForDashboard(userId),

    // 4. Daily Comic
    getDailyComic(),

    // 5. Upcoming Sessions
    getUpcomingSessionsForUser(userId),

    // 6. GM Notifications (System-Meldungen)
    getGMNotifications(userId),

    // 7. GM Recipients (für Messenger)
    getGMRecipients(userId),
  ]);

  const campaigns = ((campaignsRes.data as any[]) || []).map((c: any) => ({
    id: c.id as string,
    name: (c.name as string | null) ?? null,
    system: (c.system as string | null) ?? null,
    max_players: (c.max_players as number | null) ?? null,
  }));

  // Bewerbungen in das Format für GMNotificationsWidget mappen
  const pendingApplications: PendingApplication[] = (
    (applicationsRes.data as any[]) || []
  ).map((app: any) => ({
    id: app.id as string,
    userId: (app.user_id as string) ?? "",
    username: (app.users as any)?.username ?? "Unbekannt",
    avatarUrl: (app.users as any)?.avatar_url ?? null,
    campaignId: (app.campaigns as any)?.id ?? app.campaign_id,
    campaignName: (app.campaigns as any)?.name ?? "Kampagne",
    appliedAt: (app.created_at as string | null) ?? null,
  }));

  return {
    campaigns,
    pendingApplications,
    dashboardNews: newsResult.posts,
    dailyComic,
    upcomingSessions,
    gmNotifications,
    gmRecipientCampaigns,
  };
}

// ----------------------------------------------------------------------------
// HELPER: Fetch Public Campaigns for Discovery
// ----------------------------------------------------------------------------
async function getDiscoverableCampaigns() {
  const supabase = await createClient();
  const { data: campaignsRaw } = await (supabase.from("campaigns") as any)
    .select("id, name, system, banner_url, description, mode, frequency, schedule_day, schedule_time, schedule_interval")
    // Nur veröffentlichte Kampagnen anzeigen; Detail-Status (active/planned/etc.) wird auf UI-Ebene interpretiert
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(3);

  // Expliziter Cast gegen 'never'
  const campaigns = (campaignsRaw as any[]) || [];
  return campaigns;
}
