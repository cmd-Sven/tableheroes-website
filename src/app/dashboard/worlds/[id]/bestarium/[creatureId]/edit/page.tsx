import { createClient } from "@/src/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAllLocationsByWorld } from "@/src/app/dashboard/campaigns/[id]/location-actions";
import { getBestariumCreatureById } from "@/src/app/dashboard/worlds/world-bestarium-actions";
import { WorldBestariumForm } from "@/src/components/worlds/WorldBestariumForm";

type Props = {
  params: Promise<{ id: string; creatureId: string }>;
};

export default async function WorldBestariumEditPage({ params }: Props) {
  const { id: worldId, creatureId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: worldRaw } = await (supabase.from("worlds") as any)
    .select("id, gm_id, blueprint")
    .eq("id", worldId)
    .single();

  if (!worldRaw || (worldRaw as { gm_id: string }).gm_id !== user.id) notFound();
  if (!(worldRaw as { blueprint?: unknown }).blueprint) notFound();

  const creature = await getBestariumCreatureById(creatureId);
  if (!creature || creature.world_id !== worldId) notFound();

  const [locations, loreRes] = await Promise.all([
    getAllLocationsByWorld(worldId),
    (supabase.from("world_lore") as any)
      .select("id, name, type")
      .eq("world_id", worldId)
      .order("name", { ascending: true }),
  ]);

  const locationList = (locations ?? []).map((l: any) => ({
    id: String(l.id),
    name: String(l.name ?? "Ort"),
    type: String(l.type ?? "Ort"),
  }));

  const loreEntries = ((loreRes.data ?? []) as any[]).map((l) => ({
    id: String(l.id),
    name: String(l.name ?? "Lore"),
    type: l.type != null ? String(l.type) : null,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href={`/dashboard/worlds/${worldId}/bestarium/${creatureId}`}
        className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zum Statblock
      </Link>

      <WorldBestariumForm worldId={worldId} locations={locationList} loreEntries={loreEntries} creature={creature} />
    </div>
  );
}
