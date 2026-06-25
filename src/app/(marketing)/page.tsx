import type { Metadata } from "next";
import { HeroSection } from "@/src/components/marketing/HeroSection";
import { SubNavbar } from "@/src/components/marketing/SubNavbar";
import { FeatureTabsSection } from "@/src/components/marketing/FeatureTabsSection";
import { TermineUndRundenSection } from "@/src/components/marketing/TermineUndRundenSection";
import { CommunitySection } from "@/src/components/marketing/CommunitySection";
import { GamificationSection } from "@/src/components/marketing/GamificationSection";
import { SystemsSection } from "@/src/components/marketing/SystemsSection";
import { ImageSliderSection } from "@/src/components/marketing/ImageSliderSection";
import { FaqSection } from "@/src/components/marketing/FaqSection";
import { NewsSection } from "@/src/components/landing/NewsSection";
import { LatestLoreSection } from "@/src/components/landing/LatestLoreSection";
import { getPublicCommunityEventsForLanding } from "@/src/lib/queries/community-events-queries";
import { absoluteUrl } from "@/src/lib/site-url";

const LANDING_TITLE = "Table Heroes | TTRPG Community Osnabrück & Lore-Datenbank";
const LANDING_DESCRIPTION =
  "Pen & Paper Community in Osnabrück mit exklusivem Kampagnen-Tool. Entdecke freigegebene Lore-Einträge, NSCs und Fraktionen aus unseren Welten — von den Spielleitern kuratiert.";

export const metadata: Metadata = {
  title: LANDING_TITLE,
  description: LANDING_DESCRIPTION,
  keywords: [
    "Pen and Paper Osnabrück",
    "TTRPG Lore",
    "Rollenspiel Weltbuilding",
    "NSC Datenbank",
    "Table Heroes",
    "D&D Osnabrück",
    "Fantasy Lore",
    "Kampagne Kassadras",
    "TTRPG Community",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Table Heroes | TTRPG Community & Lore-Datenbank",
    description:
      "Community, Gamification und eine wachsende Lore-Datenbank mit NSCs, Fraktionen und Weltwissen.",
    url: absoluteUrl("/"),
    siteName: "Table Heroes",
    locale: "de_DE",
    type: "website",
    images: [
      {
        url: "/images/tableHeroes-logo.png",
        width: 520,
        height: 160,
        alt: "Table Heroes — TTRPG Community Osnabrück",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
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
  const communityEvents = await getPublicCommunityEventsForLanding(8);

  return (
    <main>
      <HeroSection />

      <SubNavbar />

      <TermineUndRundenSection events={communityEvents} />

      <NewsSection />

      <LatestLoreSection />

      <CommunitySection />

      <FeatureTabsSection />

      <GamificationSection />

      <SystemsSection />

      <ImageSliderSection />

      <FaqSection />
    </main>
  );
}
