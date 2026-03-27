import { CampaignScopeBanner } from "@/src/components/dashboard/campaigns/CampaignScopeBanner";
import { getCampaignScopeForLayout } from "./campaign-layout-queries";

type Props = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export default async function CampaignScopedLayout({ children, params }: Props) {
  const { id } = await params;
  const scope = await getCampaignScopeForLayout(id);

  return (
    <div className="min-h-0">
      {scope ? (
        <CampaignScopeBanner
          campaignId={id}
          name={scope.name}
          bannerUrl={scope.bannerUrl}
          isGm={scope.isGm}
        />
      ) : null}
      {children}
    </div>
  );
}
