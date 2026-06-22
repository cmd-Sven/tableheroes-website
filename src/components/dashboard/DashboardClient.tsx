"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sword,
  Megaphone,
  Award,
  MapPin,
  Inbox,
  Star,
  BookOpen,
  Smile,
  Calendar,
  Heart,
  BarChart3,
} from "lucide-react";
import { markWidgetAsRead } from "@/src/lib/actions/user-actions";
import { PlayerHeader } from "@/src/components/dashboard/PlayerHeader";
import { PlayerCharacterQuickStrip } from "@/src/components/dashboard/PlayerCharacterQuickStrip";
import { DashboardCard } from "@/src/components/dashboard/DashboardCard";
import { DraggableCardGrid } from "@/src/components/dashboard/DraggableCardGrid";
import type { LayoutItem } from "@/src/lib/utils/layout-engine";
import { InboxCard } from "@/src/components/dashboard/InboxCard";
import {
  HeroSlider,
  type HeroSliderCharacter,
} from "@/src/components/dashboard/HeroSlider";
import { PointsCard } from "@/src/components/dashboard/PointsCard";
import { AchievementsCard } from "@/src/components/dashboard/AchievementsCard";
import { MyCampaignsCard } from "@/src/components/dashboard/MyCampaignsCard";
import { OpenCampaignsCard } from "@/src/components/dashboard/OpenCampaignsCard";
import { LoreSnippetCard } from "@/src/components/dashboard/LoreSnippetCard";
import { DailyComicCard } from "@/src/components/dashboard/DailyComicCard";
import { NewsInfoCard } from "@/src/components/dashboard/NewsInfoCard";
import { UpcomingSessionsCard } from "@/src/components/dashboard/UpcomingSessionsCard";
import { SupportCard } from "@/src/components/dashboard/SupportCard";
import { AchievementCongratulationsModal } from "@/src/components/dashboard/AchievementCongratulationsModal";
import { AcceptanceNotification } from "@/src/app/dashboard/AcceptanceNotification";
import { PlayerDashboardTutorial } from "@/src/components/dashboard/PlayerDashboardTutorial";
import type { PlayerMessage } from "@/src/lib/actions/message-actions";
import type { DashboardLoreEntry, UpcomingSession } from "@/src/lib/types/dashboard-widgets";
import type { NewsPost } from "@/src/lib/constants/news";
import type { PointLogEntry } from "@/src/lib/types/point-log";
import type { CampaignPoll } from "@/src/lib/queries/poll-queries";
import { CampaignPollsCard } from "@/src/components/dashboard/CampaignPollsCard";

export type ProfileHeaderData = {
  username: string | null;
  avatarUrl: string | null;
  avatarShape?: "circle" | "square";
  avatarPositionX?: number;
  avatarPositionY?: number;
  backgroundType: "color" | "image";
  backgroundColor: string | null;
  backgroundImageUrl: string | null;
  bannerPositionX?: number;
  bannerPositionY?: number;
  memberSince: string | null;
  rank: string;
  lifetimePoints: number;
  totalPoints: number;
  favoriteAchievements: { id: string; name: string; icon?: string | null }[];
  showRank?: boolean;
  showPoints?: boolean;
  slogan?: string | null;
  showSlogan?: boolean;
};

export type MembershipWithGm = {
  campaign: {
    id: string;
    name: string;
    system: string | null;
    gm_id: string | null;
  };
  character: {
    id: string;
    name: string;
    class: string;
    race: string;
    level: number;
    avatar_url: string | null;
  } | null;
  gmName: string;
};

export type DiscoverableCampaign = {
  id: string;
  name: string;
  system: string | null;
  banner_url: string | null;
  description: string | null;
  mode: string | null;
  frequency: string | null;
  schedule_day: number | null;
  schedule_time: string | null;
  schedule_interval: string | null;
};

type Props = {
  profileHeader: ProfileHeaderData;
  /** Altes Format: string[] (Reihenfolge) oder neues Format: LayoutItem[] (id, x_pos, y_pos, width) */
  dashboardLayout: LayoutItem[] | string[] | undefined;
  newAcceptances: { id: string; campaignId: string; campaignName: string }[];
  totalPoints: number;
  lifetimePoints: number;
  achievements: { id: string; name: string; icon?: string | null }[];
  membershipsWithGm: MembershipWithGm[];
  heroCharacters: HeroSliderCharacter[];
  playerMessages: PlayerMessage[];
  unreadInboxMessages: PlayerMessage[];
  discoverableCampaigns: DiscoverableCampaign[];
  randomLoreEntry: DashboardLoreEntry | null;
  dailyComic: { src: string | null };
  dashboardNews: NewsPost[];
  hasNewNews: boolean;
  hasNewAchievements: boolean;
  newestAchievement: {
    id: string;
    name: string;
    image_url?: string | null;
    points_awarded: number;
    description?: string | null;
  } | null;
  hasNewLore: boolean;
  upcomingSessions: UpcomingSession[];
  isBacker?: boolean;
  backerSince?: string | null;
  pointsHistory: PointLogEntry[];
  sessionConfirmationPending?: boolean;
  /** Link zur Kampagnen-Seite Tab „Termine“ (RSVP) */
  sessionRsvpHref?: string | null;
  /** Akzeptierte Bewerbung, noch kein Charakter – Links zum Charakterbogen */
  pendingCharacterCampaigns?: { campaignId: string; campaignName: string }[];
  /** Kampagne-IDs mit bestätigter Mitgliedschaft – Badge in „Offene Kampagnen“ */
  openCampaignsParticipantIds?: string[];
  /** true = Tutor-Hilfe ausgeblendet */
  playerDashboardTutorialDismissed?: boolean;
  /** Aktive Kampagnen-Umfragen */
  activePolls?: CampaignPoll[];
};

export function DashboardClient({
  profileHeader,
  dashboardLayout,
  newAcceptances,
  totalPoints,
  lifetimePoints,
  achievements,
  membershipsWithGm,
  heroCharacters,
  playerMessages,
  unreadInboxMessages = [],
  discoverableCampaigns,
  randomLoreEntry,
  dailyComic,
  dashboardNews,
  hasNewNews,
  hasNewAchievements,
  newestAchievement = null,
  hasNewLore,
  upcomingSessions,
  isBacker,
  backerSince,
  pointsHistory,
  sessionConfirmationPending = false,
  sessionRsvpHref = null,
  pendingCharacterCampaigns = [],
  openCampaignsParticipantIds = [],
  playerDashboardTutorialDismissed = false,
  activePolls = [],
}: Props) {
  const router = useRouter();
  const [showAchievementModal, setShowAchievementModal] = useState(false);

  useEffect(() => {
    if (hasNewAchievements && newestAchievement) {
      setShowAchievementModal(true);
    }
  }, [hasNewAchievements, newestAchievement]);

  const handleAchievementModalClose = async () => {
    setShowAchievementModal(false);
    await markWidgetAsRead("achievement");
    router.refresh();
  };

  const handleMarkNewsRead = async () => {
    await markWidgetAsRead("news");
    router.refresh();
  };
  const handleMarkAchievementRead = async () => {
    await markWidgetAsRead("achievement");
    router.refresh();
  };
  const handleMarkLoreRead = async () => {
    await markWidgetAsRead("lore");
    router.refresh();
  };

  const cards = [
    {
      id: "upcoming-sessions",
      title: "Nächste Termine",
      icon: <Calendar className="h-5 w-5" />,
      content: (
        <UpcomingSessionsCard
          sessions={upcomingSessions}
          rsvpBlockedCampaignIds={pendingCharacterCampaigns.map((c) => c.campaignId)}
        />
      ),
      colSpan: 1 as const,
    },
    {
      id: "points",
      title: "Punkte",
      icon: <Star className="h-5 w-5" />,
      content: (
        <PointsCard
          totalPoints={totalPoints}
          lifetimePoints={lifetimePoints}
          pointsHistory={pointsHistory}
        />
      ),
      colSpan: 1 as const,
    },
    {
      id: "achievements",
      title: "Achievements",
      icon: <Award className="h-5 w-5" />,
      content: (
        <AchievementsCard
          achievements={achievements}
          hasNewContent={hasNewAchievements}
          onMarkAsRead={handleMarkAchievementRead}
        />
      ),
      colSpan: 1 as const,
    },
    {
      id: "my-campaigns",
      title: "Meine Kampagnen",
      icon: <MapPin className="h-5 w-5" />,
      content: <MyCampaignsCard membershipsWithGm={membershipsWithGm} />,
      colSpan: 1 as const,
    },
    {
      id: "heroes",
      title: "Meine Helden",
      icon: <Sword className="h-5 w-5" />,
      content: (
        <div className="w-full p-4">
          <HeroSlider characters={heroCharacters} allowDelete />
        </div>
      ),
      colSpan: 1 as const,
    },
    {
      id: "inbox",
      title: "Nachrichten",
      icon: <Inbox className="h-5 w-5" />,
      content: (
        <InboxCard
          messages={unreadInboxMessages}
          sessionConfirmationPending={sessionConfirmationPending}
          sessionRsvpHref={sessionRsvpHref}
          pendingCharacterCampaigns={pendingCharacterCampaigns}
        />
      ),
      colSpan: 1 as const,
    },
    {
      id: "news",
      title: "Plattform-News",
      icon: <Megaphone className="h-5 w-5" />,
      content: (
        <NewsInfoCard
          posts={dashboardNews}
          hasNewContent={hasNewNews}
          onMarkAsRead={handleMarkNewsRead}
        />
      ),
      colSpan: 1 as const,
    },
    {
      id: "lore-snippet",
      title: "Wissen ist Macht",
      icon: <BookOpen className="h-5 w-5" />,
      content: (
        <LoreSnippetCard
          entry={randomLoreEntry}
          hasNewContent={hasNewLore}
          onMarkAsRead={handleMarkLoreRead}
        />
      ),
      colSpan: 1 as const,
    },
    {
      id: "daily-comic",
      title: "Daily Fun",
      icon: <Smile className="h-5 w-5" />,
      content: <DailyComicCard src={dailyComic.src} />,
      colSpan: 1 as const,
    },
    {
      id: "campaign-polls",
      title: "Umfragen",
      icon: <BarChart3 className="h-5 w-5" />,
      content: <CampaignPollsCard polls={activePolls} />,
      colSpan: 1 as const,
    },
    {
      id: "support",
      title: "Unterstützung",
      icon: <Heart className="h-5 w-5" />,
      content: <SupportCard isBacker={isBacker} backerSince={backerSince} />,
      colSpan: 1 as const,
    },
  ];

  return (
    <div className={`space-y-8 ${isBacker ? "backer-shimmer" : ""}`}>
      <PlayerDashboardTutorial
        initialDismissed={playerDashboardTutorialDismissed}
      />
      {showAchievementModal && newestAchievement && (
        <AchievementCongratulationsModal
          achievement={newestAchievement}
          onClose={handleAchievementModalClose}
        />
      )}
      <PlayerHeader {...profileHeader} />

      <PlayerCharacterQuickStrip characters={heroCharacters} />

      {newAcceptances.length > 0 && (
        <div className="space-y-4">
          {newAcceptances.map((a) => (
            <AcceptanceNotification
              key={a.id}
              memberId={a.id}
              campaignId={a.campaignId}
              campaignName={a.campaignName}
            />
          ))}
        </div>
      )}

      <DraggableCardGrid
        cards={cards}
        initialLayout={dashboardLayout}
        readOnly={false}
      />

      {/* Offene Kampagnen: immer unten, volle Breite (3 Spalten) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-3">
          <DashboardCard
            title="Offene Kampagnen"
            icon={<Sword className="h-5 w-5" />}
          >
            <OpenCampaignsCard
              discoverableCampaigns={discoverableCampaigns}
              participantCampaignIds={openCampaignsParticipantIds}
            />
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}
