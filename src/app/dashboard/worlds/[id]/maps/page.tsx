import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/src/lib/supabase/server";
import { getWorldMaps } from "@/src/lib/actions/world-map-actions";
import { WorldMapsListClient } from "@/src/components/world-maps/WorldMapsListClient";
import { WorldTabs } from "../WorldTabs";

export default async function WorldMapsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: worldId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: world } = await (supabase.from("worlds") as any)
    .select("id, name, gm_id, blueprint")
    .eq("id", worldId)
    .single();

  if (!user || !world) {
    return (
      <div className="p-10 text-red-400 font-mono">Welt oder User nicht gefunden.</div>
    );
  }

  const worldTyped = world as { id: string; name: string; gm_id?: string };
  const isGm = String(worldTyped.gm_id ?? "") === String(user.id);
  const maps = await getWorldMaps(worldId).catch(() => []);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href={`/dashboard/worlds/${worldId}`}
        className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu {worldTyped.name}
      </Link>
      <WorldTabs worldId={worldId} />
      <WorldMapsListClient
        worldId={worldId}
        worldName={worldTyped.name}
        maps={maps}
        isGm={isGm}
        basePath={`/dashboard/worlds/${worldId}/maps`}
      />
    </div>
  );
}
