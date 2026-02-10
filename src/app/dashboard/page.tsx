import { createClient } from "@/src/lib/supabase/server";
import {
  Plus,
  Map as MapIcon,
  Bell,
  UserPlus,
  AlertCircle,
  Users as UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { CampaignCard } from "@/src/components/dashboard/CampaignCard";
import { getRankFromPoints } from "@/src/lib/utils/rank-utils";
import { getUserAchievements } from "@/src/lib/actions/achievement-actions";
import {
  getRandomLoreSnippet,
  getDailyComic,
} from "@/src/lib/actions/dashboard-widgets";
import { getNewsForDashboard } from "@/src/lib/actions/news-actions";
import { DashboardClient } from "@/src/components/dashboard/DashboardClient";
import type { HeroSliderCharacter } from "@/src/components/dashboard/HeroSlider";
import type { InboxMessage } from "@/src/components/dashboard/MessageInbox";

type UserProfile = {
  username: string | null;
  primary_role: string;
  avatar_url?: string | null;
  avatar_shape?: "circle" | "square" | null;
  created_at?: string | null;
  total_points?: number | null;
  profile_background?: string | null;
  profile_background_url?: string | null;
  show_rank?: boolean | null;
  show_points?: boolean | null;
  profile_achievement_mode?: "newest" | "specific" | null;
  selected_achievement_id?: string | null;
  slogan?: string | null;
  show_slogan?: boolean | null;
  /** Altes Format: string[] (Reihenfolge), neues Format: { id, x_pos, y_pos, width }[] */
  dashboard_layout?: unknown;
  privacy_public_profile?: boolean | null;
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
  const rank = (profile as any)?.current_rank ?? getRankFromPoints(totalPoints);
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
      backgroundType: (profile?.profile_background_url ? "image" : "color") as
        | "color"
        | "image",
      backgroundColor: profile?.profile_background ?? null,
      backgroundImageUrl: profile?.profile_background_url ?? null,
      memberSince: profile?.created_at ?? null,
      rank,
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
          achievements={playerData.achievements}
          membershipsWithGm={playerData.membershipsWithGm}
          heroCharacters={playerData.heroCharacters}
          inboxMessages={playerData.inboxMessages}
          discoverableCampaigns={playerData.discoverableCampaigns}
          randomLoreSnippet={playerData.randomLoreSnippet}
          dailyComic={playerData.dailyComic}
          dashboardNews={playerData.dashboardNews}
          hasNewNews={playerData.hasNewNews}
          hasNewAchievements={playerData.hasNewAchievements}
          hasNewLore={playerData.hasNewLore}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-barlow font-extrabold text-4xl uppercase tracking-wide text-hero-vibrant">
          Willkommen zurück,{" "}
          {(profile as { display_name?: string | null })?.display_name ||
            profile?.username ||
            "Abenteurer"}
        </h1>
        <p className="mt-2 font-libre text-gray-400">
          Verwalte deine Welten und führe deine Spieler ins Abenteuer.
        </p>
      </div>
      <GameMasterView userId={user.id} />
    </div>
  );
}

async function loadPlayerDashboardData(userId: string) {
  const supabase = await createClient();
  let totalPoints = 0;
  try {
    const { data } = await (supabase.from("users") as any)
      .select("total_points")
      .eq("id", userId)
      .single();
    totalPoints = Number((data as any)?.total_points) || 0;
  } catch {
    totalPoints = 0;
  }
  const earnedAchievementsResult = await getUserAchievements(userId);
  const achievements = earnedAchievementsResult.achievements.map((a) => ({
    id: a.id,
    name: a.name,
    icon: a.image_url ?? null,
    image_url: a.image_url ?? null,
  }));
  const hasNewAchievements = earnedAchievementsResult.hasNewContent;

  const { data: membershipsRaw } = await (
    supabase.from("campaign_members") as any
  )
    .select(
      `
      campaign_id,
      status,
      character_id,
      campaigns ( id, name, system, banner_url, gm_id ),
      characters ( id, name, class, race, level, avatar_url, status )
    `
    )
    .eq("user_id", userId)
    .eq("status", "Accepted");

  const memberships = (membershipsRaw as any[]) || [];
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

  const membershipsWithGm = memberships.map((m: any) => ({
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

  const heroCharacters: HeroSliderCharacter[] = memberships
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
      status: (m.characters.status as string) ?? undefined,
    }));

  const inboxMessages: InboxMessage[] = [];

  const { data: newAcceptancesRaw } = await (
    supabase.from("campaign_members") as any
  )
    .select("id, campaign_id, campaigns!inner(id, name)")
    .eq("user_id", userId)
    .eq("status", "Accepted")
    .eq("has_seen_acceptance", false);
  const newAcceptances = ((newAcceptancesRaw as any[]) || []).map((a: any) => ({
    id: a.id,
    campaignId: a.campaigns.id,
    campaignName: a.campaigns.name,
  }));

  const discoverableCampaigns = await getDiscoverableCampaigns();
  const [loreResult, dailyComic, newsResult] = await Promise.all([
    getRandomLoreSnippet(userId),
    getDailyComic(),
    getNewsForDashboard(userId),
  ]);

  return {
    totalPoints,
    achievements,
    membershipsWithGm,
    heroCharacters,
    inboxMessages,
    newAcceptances,
    discoverableCampaigns,
    randomLoreSnippet: loreResult.snippet,
    dailyComic,
    dashboardNews: newsResult.posts,
    hasNewNews: newsResult.hasNewContent,
    hasNewAchievements,
    hasNewLore: loreResult.hasNewContent,
  };
}

// ----------------------------------------------------------------------------
// GM VIEW
// ----------------------------------------------------------------------------
async function GameMasterView({ userId }: { userId: string }) {
  const supabase = await createClient();
  // Fetch active GM campaigns
  const { data: campaignsRaw } = await (supabase.from("campaigns") as any)
    .select("id, name, system, max_players")
    .eq("gm_id", userId)
    .order("created_at", { ascending: false });

  // Expliziter Cast gegen 'never'
  const campaigns = (campaignsRaw as any[]) || [];

  const hasCampaigns = campaigns && campaigns.length > 0;

  // Fetch pending applications for GM's campaigns
  const { data: pendingApplications } = await (
    supabase.from("campaign_members") as any
  )
    .select(
      `
      id,
      campaign_id,
      campaigns!inner(id, name, gm_id)
    `
    )
    .eq("campaigns.gm_id", userId)
    .eq("status", "Applied");

  // Group applications by campaign
  const applicationsByCampaign = new Map<
    string,
    { id: string; name: string; count: number }
  >();
  if (pendingApplications) {
    pendingApplications.forEach((app: any) => {
      const campaign = app.campaigns;
      if (campaign) {
        const existing = applicationsByCampaign.get(campaign.id);
        if (existing) {
          existing.count += 1;
        } else {
          applicationsByCampaign.set(campaign.id, {
            id: campaign.id,
            name: campaign.name,
            count: 1,
          });
        }
      }
    });
  }

  const totalPendingCount = pendingApplications?.length || 0;

  return (
    <div className="space-y-8">
      {/* GM Action Center (Notification Widget) */}
      {totalPendingCount > 0 && (
        <div className="rounded-lg border-l-4 border-l-yellow-500 bg-yellow-950/20 border border-yellow-900/50 p-6">
          <div className="flex items-start gap-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-yellow-900/50 border border-yellow-700">
              <Bell className="h-5 w-5 text-yellow-400 animate-pulse" />
            </div>
            <div className="flex-1">
              <h3 className="font-barlow font-bold text-lg text-yellow-400 uppercase mb-2 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Offene Bewerbungen
              </h3>
              <div className="space-y-2 mb-4">
                {Array.from(applicationsByCampaign.values()).map(
                  (campaign: any) => (
                    <p
                      key={campaign.id}
                      className="font-libre text-sm text-gray-200"
                    >
                      Du hast{" "}
                      <strong className="text-yellow-400">
                        {campaign.count} neue{" "}
                        {campaign.count === 1 ? "Bewerbung" : "Bewerbungen"}
                      </strong>{" "}
                      für{" "}
                      <strong className="text-white">{campaign.name}</strong>.
                    </p>
                  )
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.from(applicationsByCampaign.values()).map(
                  (campaign: any) => (
                    <Link
                      key={campaign.id}
                      href={`/dashboard/campaigns/${campaign.id}#members`}
                      className="inline-flex items-center gap-2 rounded-md border border-yellow-700 bg-yellow-900/50 px-4 py-2 font-barlow font-bold uppercase text-xs text-yellow-400 hover:bg-yellow-900 transition-colors"
                    >
                      <UserPlus className="h-4 w-4" />
                      Zu {campaign.name}
                    </Link>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Row: Active Campaigns */}
      <div className="flex items-center justify-between">
        <h2 className="font-barlow font-bold text-2xl text-white uppercase border-b border-hero-dark pb-2">
          Aktive Kampagnen
        </h2>
        <Link
          href="/dashboard/campaigns/new"
          className="inline-flex items-center gap-2 rounded-md border border-hero-border bg-hero-dark px-4 py-2 font-barlow font-bold uppercase text-white text-sm shadow-lg transition-transform hover:scale-105 hover:bg-hero-vibrant"
        >
          <Plus className="h-4 w-4" />
          Neue Kampagne
        </Link>
      </div>

      {!hasCampaigns ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-hero-dark bg-background-card/50 py-16 text-center">
          <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-background-dark border border-hero-border">
            <MapIcon className="h-8 w-8 text-hero-vibrant" />
          </div>
          <h3 className="mb-2 font-cinzel font-bold text-xl text-white">
            Erschaffe deine Welt
          </h3>
          <p className="max-w-sm font-libre text-gray-400">
            Du hast noch keine Kampagne erstellt. Starte jetzt und lade deine
            Spieler ein.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c: any) => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </div>
      )}

      {/* Bottom Row: My Player Characters (Optional placeholder) */}
      <div className="mt-12">
        <h2 className="font-barlow font-bold text-2xl text-white uppercase border-b border-hero-dark pb-2 mb-4">
          Meine Spieler-Charaktere
        </h2>
        <p className="font-libre text-gray-400">
          Auch Spielleiter sind manchmal Helden. (Hier erscheinen deine
          Charaktere in anderen Runden).
        </p>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// HELPER: Fetch Public Campaigns for Discovery
// ----------------------------------------------------------------------------
async function getDiscoverableCampaigns() {
  const supabase = await createClient();
  const { data: campaignsRaw } = await (supabase.from("campaigns") as any)
    .select("id, name, system, banner_url, description, mode, frequency")
    .eq("status", "Active")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(3);

  // Expliziter Cast gegen 'never'
  const campaigns = (campaignsRaw as any[]) || [];
  return campaigns;
}
