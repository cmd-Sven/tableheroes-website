import { redirect } from "next/navigation";
import { getCampaignAccess } from "../campaign-access";
import { ChronicleInboxPlaceholder } from "@/src/components/dashboard/campaigns/ChronicleInboxPlaceholder";

type Props = { params: Promise<{ id: string }> };

export default async function CampaignChronistPage({ params }: Props) {
  const { id: campaignId } = await params;
  const { isGM } = await getCampaignAccess(campaignId);
  if (!isGM) redirect(`/dashboard/campaigns/${campaignId}`);

  return (
    <div className="container mx-auto p-6">
      <ChronicleInboxPlaceholder campaignId={campaignId} />
    </div>
  );
}
