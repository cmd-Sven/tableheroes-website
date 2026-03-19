import { createClient } from "@/src/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getFactionsByWorld } from "@/src/app/dashboard/campaigns/[id]/factions-actions";
import { getAllLocationsByWorld } from "@/src/app/dashboard/campaigns/[id]/location-actions";
import { NarrativeNPCWizard } from "@/src/components/worlds/NarrativeNPCWizard";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ locationId?: string; prefillName?: string; factionId?: string }>;
};

export default async function WorldNPCCreatePage({ params, searchParams }: Props) {
  const { id: worldId } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: worldRaw } = await (supabase.from("worlds") as any)
    .select("id, name, gm_id, blueprint")
    .eq("id", worldId)
    .single();

  const world = worldRaw as { id: string; name: string; gm_id?: string; blueprint?: unknown } | null;
  if (!world || world.gm_id !== user.id) notFound();

  const [factions, locations, lore] = await Promise.all([
    getFactionsByWorld(worldId),
    getAllLocationsByWorld(worldId),
    (supabase.from("world_lore") as any)
      .select("id, name, type")
      .eq("world_id", worldId),
  ]);

  const factionList = (factions ?? []).map((f: any) => ({ id: String(f.id), name: String(f.name ?? "") }));
  const locationList = (locations ?? []).map((l: any) => ({
    id: String(l.id),
    name: String(l.name),
    type: String(l.type ?? "Ort"),
  }));

  const loreRows = (lore?.data ?? []) as Array<{ id: string; name: string; type: string }>;
  const races = loreRows
    .filter((l) => l.type === "Rasse")
    .map((l) => ({ id: String(l.id), name: String(l.name) }));
  const religions = loreRows
    .filter((l) => l.type === "Religion")
    .map((l) => ({ id: String(l.id), name: String(l.name) }));
  const deities = loreRows
    .filter((l) => l.type === "Gottheit")
    .map((l) => ({ id: String(l.id), name: String(l.name) }));
  const languages = loreRows
    .filter((l) => l.type === "Sprache")
    .map((l) => ({ id: String(l.id), name: String(l.name) }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href={`/dashboard/worlds/${worldId}/npcs`}
        className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu NPCs
      </Link>

      <NarrativeNPCWizard
        worldId={worldId}
        worldName={world.name}
        factions={factionList}
        locations={locationList}
        initialLocationId={sp.locationId ?? undefined}
        initialPrefillName={sp.prefillName ?? undefined}
        linkFactionId={sp.factionId ?? undefined}
        races={races}
        religions={religions}
        deities={deities}
        languages={languages}
      />
    </div>
  );
}
