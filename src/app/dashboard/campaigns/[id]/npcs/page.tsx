import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft } from "lucide-react";
import { getCampaignAccess } from "../campaign-access";
import { getNPCs } from "../npc-queries";
import { getFactionsWithMembers } from "../factions-queries";
import { WorldRequiredBlocker } from "@/src/components/dashboard/campaigns/world/WorldRequiredBlocker";

const NPCsManagement = dynamic(
  () =>
    import("../NPCsManagement").then((mod) => ({ default: mod.NPCsManagement })),
  {
    loading: () => (
      <div className="rounded-lg border border-hero-border/40 bg-background-card px-6 py-12 text-center font-libre text-gray-400">
        NPC-Liste wird geladen…
      </div>
    ),
  },
);

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

      {!worldId ? (
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
