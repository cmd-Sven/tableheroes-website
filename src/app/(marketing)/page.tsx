import { HeroSection } from "@/src/components/marketing/HeroSection";
import { FeatureTabsSection } from "@/src/components/marketing/FeatureTabsSection";
import { ActiveCampaignsSection } from "@/src/components/marketing/ActiveCampaignsSection";
import { CommunitySection } from "@/src/components/marketing/CommunitySection";
import { GamificationSection } from "@/src/components/marketing/GamificationSection";
import { SystemsSection } from "@/src/components/marketing/SystemsSection";
import { ImageSliderSection } from "@/src/components/marketing/ImageSliderSection";
import { FaqSection } from "@/src/components/marketing/FaqSection";

export default function MarketingLandingPage() {
  return (
    <>
      <HeroSection />

      {/* Active Campaigns - direkt nach Hero für maximale Visibility */}
      <ActiveCampaignsSection />

      {/* Community - das Herz von TableHeroes */}
      <CommunitySection />

      {/* Vereins-Plattform - Wie wir uns organisieren */}
      <FeatureTabsSection />

      {/* Gamification - Belohnungssystem */}
      <GamificationSection />

      {/* Systeme - Was und wie wir spielen */}
      <SystemsSection />

      {/* Bild-Impressionen */}
      <ImageSliderSection />

      {/* FAQ */}
      <FaqSection />
    </>
  );
}
