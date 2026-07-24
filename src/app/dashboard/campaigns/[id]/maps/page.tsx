import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCampaignAccess } from "../campaign-access";
import { getWorldMaps } from "@/src/lib/actions/world-map-actions";
import { WorldMapsListClient } from "@/src/components/world-maps/WorldMapsListClient";
import { WorldRequiredBlocker } from "@/src/components/dashboard/campaigns/world/WorldRequiredBlocker";

type Props = { params: Promise<{ id: string }> };

export default async function CampaignWorldMapsPage({ params }: Props) {
  const { id: campaignId } = await params;
  const { isGM, worldId, world, gmWorlds, hasAccess } =
    await getCampaignAccess(campaignId);

  if (!hasAccess) {
    return <div className="p-10 text-amber-400">Kein Zugriff.</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href={`/dashboard/campaigns/${campaignId}`}
        className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Kampagne
      </Link>

      {!worldId || !world ? (
        <WorldRequiredBlocker campaignId={campaignId} isGM={isGM} worlds={gmWorlds} />
      ) : (
        <WorldMapsListClient
          worldId={worldId}
          worldName={(world as { name: string }).name}
          maps={await getWorldMaps(worldId).catch(() => [])}
          isGm={isGM}
          basePath={`/dashboard/campaigns/${campaignId}/maps`}
        />
      )}
    </div>
  );
}
