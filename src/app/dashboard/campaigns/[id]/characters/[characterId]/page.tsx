import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getCampaignAccess } from "../../campaign-access";
import { getCharacterByIdForGM } from "../../character-actions";
import { getFactionsWithMembers } from "../../factions-actions";
import { getNPCs } from "../../npc-actions";
import { GMCharacterEditorPage } from "@/src/components/dashboard/campaigns/GMCharacterEditorPage";

type Props = {
  params: Promise<{ id: string; characterId: string }>;
};

export default async function GMCharacterEditPage({ params }: Props) {
  const { id: campaignId, characterId } = await params;
  const { isGM, userId } = await getCampaignAccess(campaignId);

  if (!isGM) notFound();

  const [character, factions, npcs] = await Promise.all([
    getCharacterByIdForGM(campaignId, characterId),
    getFactionsWithMembers(campaignId),
    getNPCs(campaignId, userId, true),
  ]);

  if (!character) notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href={`/dashboard/campaigns/${campaignId}?tab=members`}
        className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors"
      >
        <ArrowLeft className="h-5 w-5" />
        Zurück zur Kampagne
      </Link>

      <GMCharacterEditorPage
        character={character as any}
        campaignId={campaignId}
        npcs={npcs}
        factions={factions}
      />
    </div>
  );
}
