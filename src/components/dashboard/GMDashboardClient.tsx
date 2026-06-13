"use client";

import {
  Bell,
  Calendar,
  MapPin,
  Megaphone,
  Plus,
  Smile,
  Sword,
} from "lucide-react";
import Link from "next/link";
import { DashboardCard } from "@/src/components/dashboard/DashboardCard";
import { CampaignCard } from "@/src/components/dashboard/CampaignCard";
import { GMCommunicationHub } from "@/src/components/dashboard/GMCommunicationHub";
import { UpcomingSessionsCard } from "@/src/components/dashboard/UpcomingSessionsCard";
import { NewsInfoCard } from "@/src/components/dashboard/NewsInfoCard";
import { DailyComicCard } from "@/src/components/dashboard/DailyComicCard";
import type { UpcomingSession } from "@/src/lib/types/dashboard-widgets";
import type { NewsPost } from "@/src/lib/constants/news";
import type {
  GMNotification,
  GMRecipientCampaign,
} from "@/src/lib/actions/message-actions";

type Campaign = {
  id: string;
  name: string | null;
  system: string | null;
  max_players: number | null;
};

type Props = {
  displayName: string;
  campaigns: Campaign[];
  upcomingSessions: UpcomingSession[];
  dashboardNews: NewsPost[];
  dailyComic: { src: string | null };
  gmNotifications: GMNotification[];
  gmRecipientCampaigns: GMRecipientCampaign[];
};

export function GMDashboardClient({
  displayName,
  campaigns,
  upcomingSessions,
  dashboardNews,
  dailyComic,
  gmNotifications,
  gmRecipientCampaigns,
}: Props) {
  const hasCampaigns = campaigns.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-barlow font-extrabold text-4xl uppercase tracking-wide text-hero-vibrant">
          Willkommen zurück, {displayName}
        </h1>
        <p className="mt-2 font-libre text-gray-400">
          Verwalte deine Welten und führe deine Spieler ins Abenteuer.
        </p>
      </div>

      <DashboardCard title="Meldungs-Zentrale" icon={<Bell className="h-5 w-5" />}>
        <GMCommunicationHub
          notifications={gmNotifications}
          recipientCampaigns={gmRecipientCampaigns}
        />
      </DashboardCard>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="md:col-span-2 lg:col-span-2">
          <DashboardCard
            title="Nächste Termine"
            icon={<Calendar className="h-5 w-5" />}
          >
            <UpcomingSessionsCard sessions={upcomingSessions} isGM />
          </DashboardCard>
        </div>

        <div className="md:col-span-1">
          <DashboardCard title="Daily Fun" icon={<Smile className="h-5 w-5" />}>
            <DailyComicCard src={dailyComic.src} />
          </DashboardCard>
        </div>

        <div className="md:col-span-2 lg:col-span-3">
          <DashboardCard title="Plattform-News" icon={<Megaphone className="h-5 w-5" />}>
            <NewsInfoCard posts={dashboardNews} />
          </DashboardCard>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-barlow font-bold text-2xl text-white uppercase border-b border-hero-dark pb-2">
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-5 w-5 text-accent-gold" />
              Aktive Kampagnen (max. 3)
            </span>
          </h2>
          {campaigns.length < 3 && (
            <Link
              href="/dashboard/campaigns/new"
              className="inline-flex items-center gap-2 rounded-md border border-hero-border bg-hero-dark px-4 py-2 font-barlow font-bold uppercase text-white text-sm shadow-lg transition-transform hover:scale-105 hover:bg-hero-vibrant"
            >
              <Plus className="h-4 w-4" />
              Neue Kampagne
            </Link>
          )}
        </div>

        {!hasCampaigns ? (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-hero-dark bg-background-card py-16 text-center">
            <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-background-dark border border-hero-border">
              <Sword className="h-8 w-8 text-hero-vibrant" />
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
            {campaigns.map((c) => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-4">
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
