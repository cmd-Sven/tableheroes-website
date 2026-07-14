import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCampaignAccess } from "../campaign-access";
import { loadCampaignRulesSystem } from "../rules-system-queries";
import { CampaignRulesSystemManagement } from "@/src/components/dashboard/campaigns/rules/CampaignRulesSystemManagement";

type Props = { params: Promise<{ id: string }> };

export default async function CampaignRulesSystemPage({ params }: Props) {
  const { id: campaignId } = await params;
  await getCampaignAccess(campaignId);

  const payload = await loadCampaignRulesSystem(campaignId);
  if (!payload) {
    return (
      <div className="mx-auto max-w-4xl">
        <p className="font-libre text-gray-400">Regelsystem konnte nicht geladen werden.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href={`/dashboard/campaigns/${campaignId}`}
        className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Kampagne
      </Link>

      <CampaignRulesSystemManagement {...payload} />
    </div>
  );
}
