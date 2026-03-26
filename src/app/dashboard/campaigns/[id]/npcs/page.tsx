import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCampaignAccess } from "../campaign-access";
import { getNPCs } from "../npc-queries";
import { getFactionsWithMembers } from "../factions-queries";
import { NPCsManagement } from "../NPCsManagement";
import { WorldRequiredBlocker } from "@/src/components/dashboard/campaigns/world/WorldRequiredBlocker";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CampaignNPCsPage({ params }: Props) {
  const { id: campaignId } = await params;
  const { isGM, worldId, world, gmWorlds, userId } = await getCampaignAccess(campaignId);

  const npcs = await getNPCs(campaignId, userId, isGM);
  const factions = await getFactionsWithMembers(campaignId);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
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
        <NPCsManagement
          campaignId={campaignId}
          worldId={worldId ?? undefined}
          npcs={npcs}
          factions={factions}
          isGM={isGM}
        />
      )}
    </div>
  );
}
