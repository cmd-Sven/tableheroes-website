import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getCampaignAccess } from "../../campaign-access";
import {
  getWorldMap,
  getWorldMapLinkOptions,
  getWorldMapMarkers,
} from "@/src/lib/actions/world-map-actions";
import { WorldMapEditor } from "@/src/components/world-maps/WorldMapEditor";

type Props = {
  params: Promise<{ id: string; mapId: string }>;
};

export default async function CampaignWorldMapDetailPage({ params }: Props) {
  const { id: campaignId, mapId } = await params;
  const { isGM, worldId, hasAccess } = await getCampaignAccess(campaignId);
  if (!hasAccess || !worldId) notFound();

  const map = await getWorldMap(mapId);
  if (!map || map.world_id !== worldId) notFound();

  const [markers, linkOptions] = await Promise.all([
    getWorldMapMarkers(mapId),
    getWorldMapLinkOptions(worldId, campaignId),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href={`/dashboard/campaigns/${campaignId}/maps`}
        className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Alle Weltkarten
      </Link>
      <h1 className="font-barlow text-2xl font-extrabold uppercase tracking-wide text-hero-vibrant">
        {map.title}
      </h1>
      <WorldMapEditor
        map={map}
        markers={markers}
        worldId={worldId}
        campaignId={campaignId}
        isGm={isGM}
        linkOptions={linkOptions}
      />
    </div>
  );
}
