import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/src/lib/supabase/server";
import { getCampaignAccess } from "../campaign-access";
import { getFactionsWithMembers } from "../factions-queries";
import { getNPCs } from "../npc-queries";
import { getCharacterFactionReputations } from "../reputation-queries";
import { FactionsManagement } from "../FactionsManagement";
import { WorldRequiredBlocker } from "@/src/components/dashboard/campaigns/world/WorldRequiredBlocker";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CampaignFactionsPage({ params }: Props) {
  const { id: campaignId } = await params;
  const { isGM, worldId, world, gmWorlds, userId } = await getCampaignAccess(campaignId);

  const factions = await getFactionsWithMembers(campaignId);
  const npcs = await getNPCs(campaignId, userId, isGM);

  let playerFactionReputations: Array<{ faction_id: string; faction_name: string; reputation: number; rank: string | null }> = [];
  if (!isGM && userId) {
    const supabase = await createClient();
    const { data: membership } = await (supabase.from("campaign_members") as any)
      .select("character_id")
      .eq("campaign_id", campaignId)
      .eq("user_id", userId)
      .maybeSingle();
    const charId = (membership as { character_id?: string } | null)?.character_id;
    if (charId) {
      const reps = await getCharacterFactionReputations(charId, campaignId);
      playerFactionReputations = reps.map((r) => ({
        faction_id: r.faction_id,
        faction_name: r.faction_name,
        reputation: r.reputation,
        rank: r.rank ?? null,
      }));
    }
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

      {!worldId ? (
        <WorldRequiredBlocker campaignId={campaignId} isGM={isGM} worlds={gmWorlds} />
      ) : (
        <FactionsManagement
          campaignId={campaignId}
          worldId={worldId ?? undefined}
          factions={factions}
          npcs={npcs}
          isGM={isGM}
          playerFactionReputations={playerFactionReputations}
        />
      )}
    </div>
  );
}
