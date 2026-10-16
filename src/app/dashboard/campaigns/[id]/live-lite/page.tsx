import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCampaignAccess } from "../campaign-access";
import { LiveLiteGmConsole } from "@/src/components/live-lite/LiveLiteGmConsole";
import { loadLiveLiteCatalog } from "@/src/lib/live-lite/load-catalog";

export const metadata: Metadata = {
  title: "Live-Session Lite",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function LiveLiteGmPage({ params }: Props) {
  const { id } = await params;
  const access = await getCampaignAccess(id);
  if (!access.isGM) redirect(`/dashboard/campaigns/${id}`);

  const catalog = await loadLiveLiteCatalog(id, access.worldId);
  const campaignName =
    typeof access.campaign.name === "string" && access.campaign.name.trim()
      ? access.campaign.name
      : "Kampagne";

  return (
    <LiveLiteGmConsole
      campaignId={id}
      campaignName={campaignName}
      userId={access.userId}
      catalog={catalog}
    />
  );
}
