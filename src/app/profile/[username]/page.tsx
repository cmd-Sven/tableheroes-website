import { createClient } from "@/src/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Sword,
  Megaphone,
  Award,
  MapPin,
  Inbox,
  Star,
} from "lucide-react";
import { getRankFromPoints } from "@/src/lib/utils/rank-utils";
import { getUserAchievements } from "@/src/lib/actions/achievement-actions";
import { PlayerHeader } from "@/src/components/dashboard/PlayerHeader";
import { DraggableCardGrid } from "@/src/components/dashboard/DraggableCardGrid";
import { PointsCard } from "@/src/components/dashboard/PointsCard";
import { AchievementsCard } from "@/src/components/dashboard/AchievementsCard";
import { MyCampaignsCard } from "@/src/components/dashboard/MyCampaignsCard";
import { OpenCampaignsCard } from "@/src/components/dashboard/OpenCampaignsCard";
import { MessageInbox } from "@/src/components/dashboard/MessageInbox";
import {
  HeroSlider,
  type HeroSliderCharacter,
} from "@/src/components/dashboard/HeroSlider";

type Props = { params: Promise<{ username: string }> };

export default async function ProfilePage({ params }: Props) {
  const { username: usernameSlug } = await params;
  const supabase = await createClient();

  const { data: profileUser, error: userError } = await (
    supabase.from("users") as any
  )
    .select("*")
    .eq("username", usernameSlug)
    .maybeSingle();

  if (userError || !profileUser) notFound();
  if (!profileUser.privacy_public_profile) notFound();

  const totalPoints = Number(profileUser.total_points) || 0;
  const rank =
    (profileUser as any).current_rank ?? getRankFromPoints(totalPoints);
  const earnedAchievementsResult = await getUserAchievements(profileUser.id);
  const achievements = (earnedAchievementsResult?.achievements ?? []).map(
    (a) => ({
      id: a.id,
      name: a.name,
      icon: a.image_url ?? null,
      image_url: a.image_url ?? null,
    })
  );
  const achievementMode = profileUser.profile_achievement_mode ?? "newest";
  const favAchievementId = profileUser.selected_achievement_id ?? null;
  const favoriteAchievements =
    achievementMode === "specific" && favAchievementId
      ? achievements.filter((a) => a.id === favAchievementId)
      : achievements.slice(0, 3);
  const dashboardLayout = Array.isArray(profileUser.dashboard_layout)
    ? profileUser.dashboard_layout
    : undefined;

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
    `,
    )
    .eq("user_id", profileUser.id)
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
      ]),
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
    }));

  const { data: discoverableRaw } = await (supabase.from("campaigns") as any)
    .select("id, name, system, banner_url, description, mode, frequency, schedule_day, schedule_time, schedule_interval")
    .eq("status", "Active")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(6);
  const discoverableCampaigns = (discoverableRaw as any[]) || [];

  const cards = [
    {
      id: "points",
      title: "Punkte",
      icon: <Star className="h-5 w-5" />,
      content: <PointsCard totalPoints={totalPoints} />,
      colSpan: 1 as const,
    },
    {
      id: "achievements",
      title: "Achievements",
      icon: <Award className="h-5 w-5" />,
      content: <AchievementsCard achievements={achievements} />,
      colSpan: 1 as const,
    },
    {
      id: "my-campaigns",
      title: "Meine Kampagnen",
      icon: <MapPin className="h-5 w-5" />,
      content: <MyCampaignsCard membershipsWithGm={membershipsWithGm} />,
      colSpan: 2 as const,
    },
    {
      id: "open-campaigns",
      title: "Offene Kampagnen",
      icon: <Sword className="h-5 w-5" />,
      content: (
        <OpenCampaignsCard discoverableCampaigns={discoverableCampaigns} />
      ),
      colSpan: 2 as const,
    },
    {
      id: "heroes",
      title: "Meine Helden",
      icon: <Sword className="h-5 w-5" />,
      content: (
        <div className="w-full p-4">
          <HeroSlider characters={heroCharacters} />
        </div>
      ),
      colSpan: 1 as const,
    },
    {
      id: "inbox",
      title: "Nachrichten",
      icon: <Inbox className="h-5 w-5" />,
      content: (
        <div className="w-full p-4">
          <MessageInbox messages={[]} maxItems={3} />
        </div>
      ),
      colSpan: 1 as const,
    },
    {
      id: "news",
      title: "Plattform-News",
      icon: <Megaphone className="h-5 w-5" />,
      content: (
        <div className="w-full p-4 font-libre text-sm text-gray-400">
          Aktuell keine neuen Meldungen.
        </div>
      ),
      colSpan: 1 as const,
    },
  ];

  return (
    <div className="min-h-screen bg-background-dark text-white">
      <div className="container mx-auto max-w-4xl px-4 py-8 space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Zur Startseite
        </Link>

        <PlayerHeader
          username={profileUser.username ?? null}
          avatarUrl={profileUser.avatar_url ?? null}
          avatarShape={
            (profileUser.avatar_shape as "circle" | "square") ?? "circle"
          }
          backgroundType={
            profileUser.profile_background_url ? "image" : "color"
          }
          backgroundColor={profileUser.profile_background ?? null}
          backgroundImageUrl={profileUser.profile_background_url ?? null}
          memberSince={profileUser.created_at ?? null}
          rank={rank}
          totalPoints={totalPoints}
          favoriteAchievements={favoriteAchievements}
          isPublicView
          showRank={profileUser.show_rank ?? true}
          showPoints={profileUser.show_points ?? true}
          slogan={profileUser.slogan ?? null}
          showSlogan={!!profileUser.show_slogan}
        />

        <DraggableCardGrid
          cards={cards}
          initialLayout={dashboardLayout}
          readOnly
        />
      </div>
    </div>
  );
}
