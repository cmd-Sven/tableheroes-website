import { createClient } from "@/src/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FactionCreationWizard } from "@/src/components/dashboard/campaigns/factions/FactionCreationWizard";
import { getAllLocationsByWorld } from "@/src/app/dashboard/campaigns/[id]/location-actions";
import { getFactionsByWorld } from "@/src/app/dashboard/campaigns/[id]/factions-actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ name?: string; hqLocationId?: string }>;
};

export default async function WorldNewFactionPage({ params, searchParams }: Props) {
  const { id: worldId } = await params;
  const { name: nameParam, hqLocationId } = await searchParams;
  const defaultName = nameParam ? decodeURIComponent(nameParam) : undefined;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: worldRaw } = await (supabase.from("worlds") as any)
    .select("id, name, gm_id")
    .eq("id", worldId)
    .single();

  if (!worldRaw || (worldRaw as { gm_id: string }).gm_id !== user.id) notFound();

  const [locations, factionsRaw] = await Promise.all([
    getAllLocationsByWorld(worldId),
    getFactionsByWorld(worldId),
  ]);

  const typedLocations = locations.map((loc: any) => ({
    id: loc.id,
    name: loc.name || "Unbenannter Ort",
    type: loc.type || "Ort",
  }));

  const typedFactions = (factionsRaw || []).map((f: any) => ({
    id: f.id,
    name: f.name,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href={`/dashboard/worlds/${worldId}/factions`}
        className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu Fraktionen
      </Link>

      <FactionCreationWizard
        worldId={worldId}
        initialData={null}
        defaultName={defaultName}
        defaultHqLocationId={hqLocationId}
        locations={typedLocations}
        factions={typedFactions}
      />
    </div>
  );
}
