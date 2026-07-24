"use client";

/**
 * Schwere Dashboard-Widgets als eigene Chunks — Initialpaint bleibt leichter.
 */
import dynamic from "next/dynamic";

const widgetFallback = () => (
  <div className="min-h-[4rem] animate-pulse rounded bg-hero-dark/40" aria-hidden />
);

export const HeroSlider = dynamic(
  () =>
    import("@/src/components/dashboard/HeroSlider").then((m) => ({
      default: m.HeroSlider,
    })),
  { ssr: false, loading: widgetFallback },
);

export const PointsCard = dynamic(
  () =>
    import("@/src/components/dashboard/PointsCard").then((m) => ({
      default: m.PointsCard,
    })),
  { ssr: false, loading: widgetFallback },
);

export const AchievementCongratulationsModal = dynamic(
  () =>
    import("@/src/components/dashboard/AchievementCongratulationsModal").then(
      (m) => ({ default: m.AchievementCongratulationsModal }),
    ),
  { ssr: false, loading: () => null },
);

export const PlayerDashboardTutorial = dynamic(
  () =>
    import("@/src/components/dashboard/PlayerDashboardTutorial").then((m) => ({
      default: m.PlayerDashboardTutorial,
    })),
  { ssr: false, loading: () => null },
);

export const OpenCampaignsCard = dynamic(
  () =>
    import("@/src/components/dashboard/OpenCampaignsCard").then((m) => ({
      default: m.OpenCampaignsCard,
    })),
  { ssr: false, loading: widgetFallback },
);

export const GMCommunicationHub = dynamic(
  () =>
    import("@/src/components/dashboard/GMCommunicationHub").then((m) => ({
      default: m.GMCommunicationHub,
    })),
  { ssr: false, loading: widgetFallback },
);
