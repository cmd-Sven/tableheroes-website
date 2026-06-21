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
import { getPublicCommunityEventsForLanding } from "@/src/lib/queries/community-events-queries";

export default async function MarketingLandingPage() {
  const communityEvents = await getPublicCommunityEventsForLanding(8);

  return (
    <main>
      <HeroSection />

      <SubNavbar />

      <TermineUndRundenSection events={communityEvents} />

      <NewsSection />

      <CommunitySection />

      <FeatureTabsSection />

      <GamificationSection />

      <SystemsSection />

      <ImageSliderSection />

      <FaqSection />
    </main>
  );
}
