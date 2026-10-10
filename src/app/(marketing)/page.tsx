import type { Metadata } from "next";
import { HeroSection } from "@/src/components/marketing/HeroSection";
import { SubNavbar } from "@/src/components/marketing/SubNavbar";
import { BattlemapSection } from "@/src/components/marketing/BattlemapSection";
import { FeatureTabsSection } from "@/src/components/marketing/FeatureTabsSection";
import { TermineUndRundenSection } from "@/src/components/marketing/TermineUndRundenSection";
import { CommunitySection } from "@/src/components/marketing/CommunitySection";
import { GamificationSection } from "@/src/components/marketing/GamificationSection";
import { ImageSliderSection } from "@/src/components/marketing/ImageSliderSection";
import { FaqSection } from "@/src/components/marketing/FaqSection";
import { NewsSection } from "@/src/components/landing/NewsSection";
import { LatestLoreSection } from "@/src/components/landing/LatestLoreSection";
import { getPublicCommunityEventsForLanding } from "@/src/lib/queries/community-events-queries";
import { getHomepagePublicLoreGroups } from "@/src/lib/queries/public-seo-queries";
import { getLandingPageNews } from "@/src/lib/actions/news-actions";
import { absoluteUrl } from "@/src/lib/site-url";

const LANDING_TITLE = "Table-Heroes | TTRPG Community Osnabrück & Lore-Datenbank";
const LANDING_DESCRIPTION =
  "Pen & Paper Community in Osnabrück mit exklusivem Kampagnen-Tool. Entdecke freigegebene Lore-Einträge, NSCs und Fraktionen aus unseren Welten — von den Spielleitern kuratiert.";

export const metadata: Metadata = {
  title: LANDING_TITLE,
  description: LANDING_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Table-Heroes | TTRPG Community & Lore-Datenbank",
    description:
      "Community, Gamification und eine wachsende Lore-Datenbank mit NSCs, Fraktionen und Weltwissen.",
    url: absoluteUrl("/"),
    siteName: "Table-Heroes",
    locale: "de_DE",
    type: "website",
    images: [
      {
        url: "/images/tableHeroes-logo.png",
        width: 520,
        height: 160,
        alt: "Table-Heroes — TTRPG Community Osnabrück",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: LANDING_TITLE,
    description: LANDING_DESCRIPTION,
    images: ["/images/tableHeroes-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function MarketingLandingPage() {
  const [communityEvents, loreGroups, newsPosts] = await Promise.all([
    getPublicCommunityEventsForLanding(8),
    getHomepagePublicLoreGroups(6).catch(() => []),
    getLandingPageNews().catch(() => []),
  ]);

  return (
    <main>
      <HeroSection />

      <SubNavbar />

      <TermineUndRundenSection events={communityEvents} />

      <NewsSection posts={newsPosts} />

      <LatestLoreSection groups={loreGroups} />

      <CommunitySection />

      <FeatureTabsSection />

      <GamificationSection />

      <BattlemapSection />

      <ImageSliderSection />

      <FaqSection />
    </main>
  );
}
