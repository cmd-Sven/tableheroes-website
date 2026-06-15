import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCampaignAccess } from "../campaign-access";
import { getLoreEntries } from "../lore-queries";
import { LoreManagement } from "../LoreManagement";
import { WorldRequiredBlocker } from "@/src/components/dashboard/campaigns/world/WorldRequiredBlocker";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CampaignLorePage({ params }: Props) {
  const { id: campaignId } = await params;
  const { isGM, worldId, world, gmWorlds } = await getCampaignAccess(campaignId);

  const loreEntries = await getLoreEntries(campaignId);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href={`/dashboard/campaigns/${campaignId}`}
        className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Kampagne
      </Link>

      {!worldId ? (
        <WorldRequiredBlocker campaignId={campaignId} isGM={isGM} worlds={gmWorlds} />
      ) : (
        <LoreManagement
          campaignId={campaignId}
          worldId={worldId ?? undefined}
          loreEntries={loreEntries}
          isGM={isGM}
        />
      )}
    </div>
  );
}
