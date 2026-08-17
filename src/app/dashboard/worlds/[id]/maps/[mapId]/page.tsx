import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import {
  getWorldMap,
  getWorldMapLinkOptions,
  getWorldMapMarkers,
} from "@/src/lib/actions/world-map-actions";
import { WorldMapEditor } from "@/src/components/world-maps/WorldMapEditor";
import { WorldTabs } from "../../WorldTabs";

export default async function WorldMapDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; mapId: string }>;
  searchParams: Promise<{ campaignId?: string }>;
}) {
  const { id: worldId, mapId } = await params;
  const { campaignId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: world } = await (supabase.from("worlds") as any)
    .select("id, name, gm_id")
    .eq("id", worldId)
    .single();
  if (!world) notFound();

  const worldTyped = world as { id: string; name: string; gm_id?: string };
  const isGm = String(worldTyped.gm_id ?? "") === String(user.id);

  const map = await getWorldMap(mapId);
  if (!map || map.world_id !== worldId) notFound();

  const [markers, linkOptions] = await Promise.all([
    getWorldMapMarkers(mapId),
    getWorldMapLinkOptions(worldId, campaignId ?? null),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href={`/dashboard/worlds/${worldId}/maps`}
        className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Alle Weltkarten
      </Link>
      <WorldTabs worldId={worldId} />
      <h1 className="font-barlow text-2xl font-extrabold uppercase tracking-wide text-hero-vibrant">
        {map.title}
      </h1>
      <WorldMapEditor
        map={map}
        markers={markers}
        worldId={worldId}
        campaignId={campaignId ?? null}
        isGm={isGm}
        linkOptions={linkOptions}
      />
    </div>
  );
}
