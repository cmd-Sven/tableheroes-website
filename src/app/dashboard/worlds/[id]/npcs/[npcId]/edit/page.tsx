import { createClient } from "@/src/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NPCForm } from "@/src/components/dashboard/campaigns/npcs/NPCForm";
import { getNPCById } from "@/src/app/dashboard/campaigns/[id]/npc-actions";
import { getAllLocationsByWorld } from "@/src/app/dashboard/campaigns/[id]/location-actions";
import { getFactionsByWorld } from "@/src/app/dashboard/campaigns/[id]/factions-actions";

type Props = {
  params: Promise<{ id: string; npcId: string }>;
};

export default async function WorldEditNPCPage({ params }: Props) {
  const { id: worldId, npcId } = await params;
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

  const npc = await getNPCById(npcId);
  if (!npc) notFound();

  const npcWorldId = (npc as any).world_id;
  if (npcWorldId !== worldId) notFound();

  const [locations, factions] = await Promise.all([
    getAllLocationsByWorld(worldId),
    getFactionsByWorld(worldId),
  ]);

  const factionList = (factions ?? []).map((f: any) => ({
    id: String(f.id),
    name: String(f.name ?? ""),
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href={`/dashboard/worlds/${worldId}/npcs`}
        className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu NPCs
      </Link>

      <NPCForm
        worldId={worldId}
        initialData={npc as any}
        factions={factionList}
        locations={locations.map((loc: any) => ({
          id: String(loc.id),
          name: String(loc.name),
          type: String(loc.type || "Ort"),
        }))}
      />
    </div>
  );
}
