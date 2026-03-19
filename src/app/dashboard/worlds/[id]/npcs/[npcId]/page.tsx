import { createClient } from "@/src/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getNPCById } from "@/src/app/dashboard/campaigns/[id]/npc-actions";
import { getSecrets } from "@/src/app/dashboard/campaigns/[id]/secrets-actions";
import { getRelationshipsForNPC } from "@/src/app/dashboard/worlds/relationship-actions";
import type { WorldBlueprint } from "@/src/types/world";
import { WorldNPCDetailClient } from "./WorldNPCDetailClient";

type Props = {
  params: Promise<{ id: string; npcId: string }>;
};

export default async function WorldNPCDetailPage({ params }: Props) {
  const { id: worldId, npcId } = await params;
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
  const isOwner = world && world.gm_id === user.id;
  if (!world || !isOwner) notFound();

  const npc = await getNPCById(npcId);
  if (!npc) notFound();

  if ((npc as any).world_id !== worldId) notFound();

  const [secrets, relationships] = await Promise.all([
    getSecrets(npcId, "npc"),
    getRelationshipsForNPC(worldId, npcId).catch(() => []),
  ]);
  const campaignIds = [...new Set((secrets as any[]).map((s: any) => s.campaign_id).filter(Boolean))];
  let campaignNames: Record<string, string> = {};
  if (campaignIds.length > 0) {
    const { data: campaigns } = await (supabase.from("campaigns") as any)
      .select("id, name")
      .in("id", campaignIds);
    (campaigns || []).forEach((c: any) => {
      campaignNames[c.id] = c.name || c.id;
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href={`/dashboard/worlds/${worldId}/npcs`}
        className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu NPCs
      </Link>

      <WorldNPCDetailClient
        npc={npc as any}
        worldId={worldId}
        worldName={world.name}
        userId={user.id}
        isGM={isOwner}
        secrets={secrets as any[]}
        campaignNames={campaignNames}
        worldBlueprint={(world.blueprint as WorldBlueprint) ?? null}
        relationships={relationships as any[]}
      />
    </div>
  );
}
