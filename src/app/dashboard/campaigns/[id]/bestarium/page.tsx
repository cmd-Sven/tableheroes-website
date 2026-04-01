import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCampaignAccess } from "../campaign-access";
import { getBestariumCreaturesForCampaign } from "../bestarium-queries";
import { CampaignBestariumManagement } from "../CampaignBestariumManagement";
import { WorldRequiredBlocker } from "@/src/components/dashboard/campaigns/world/WorldRequiredBlocker";

type Props = { params: Promise<{ id: string }> };

export default async function CampaignBestariumPage({ params }: Props) {
  const { id: campaignId } = await params;
  const { isGM, worldId, world, gmWorlds } = await getCampaignAccess(campaignId);

  const { gm, player } = await getBestariumCreaturesForCampaign(campaignId, isGM);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href={`/dashboard/campaigns/${campaignId}`}
        className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Kampagne
      </Link>

      {!world ? (
        <WorldRequiredBlocker campaignId={campaignId} isGM={isGM} worlds={gmWorlds} />
      ) : (
        <CampaignBestariumManagement
          campaignId={campaignId}
          worldId={worldId ?? undefined}
          isGM={isGM}
          gmCreatures={gm}
          playerList={player}
        />
      )}
    </div>
  );
}
