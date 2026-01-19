import { HeroSection } from "@/src/components/marketing/HeroSection";
import { FeatureTabsSection } from "@/src/components/marketing/FeatureTabsSection";
import { ActiveCampaignsSection } from "@/src/components/marketing/ActiveCampaignsSection";
import { CommunitySection } from "@/src/components/marketing/CommunitySection";
import { SystemsSection } from "@/src/components/marketing/SystemsSection";
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

      {/* Systeme - Was wir spielen */}
      <SystemsSection />

      {/* FAQ */}
      <FaqSection />
    </>
  );
}
