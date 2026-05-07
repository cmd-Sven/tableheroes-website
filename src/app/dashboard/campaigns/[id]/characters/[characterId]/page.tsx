import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getCampaignAccess } from "../../campaign-access";
import { getCharacterFromMembersForGM } from "../../character-actions";
import { getCharacterEditorLoreOptionsForGm } from "../../character-queries";
import { getFactionsWithMembers } from "../../factions-queries";
import { getNPCs } from "../../npc-queries";
import { getCharacterFactionReputations } from "../../reputation-queries";
import { GMCharacterEditorPage } from "@/src/components/dashboard/campaigns/GMCharacterEditorPage";
import { serializeCharacterForEditorClient } from "@/src/lib/characters/serialize-character-for-editor-client";
import { serializeForClient } from "@/src/lib/serialize-for-flight";

type Props = {
  params: Promise<{ id: string; characterId: string }>;
};

export default async function GMCharacterEditPage({ params }: Props) {
  const { id: campaignId, characterId } = await params;
  const { isGM, userId } = await getCampaignAccess(campaignId);

  if (!isGM) notFound();

  const [character, editorOpts, factions, npcs] = await Promise.all([
    getCharacterFromMembersForGM(campaignId, characterId),
    getCharacterEditorLoreOptionsForGm(campaignId),
    getFactionsWithMembers(campaignId),
    getNPCs(campaignId, userId, true),
  ]);

  const factionChoices =
    editorOpts.factions.length > 0
      ? editorOpts.factions
      : (factions as { id: string; name: string }[]).map((f) => ({
          id: f.id,
          name: f.name,
        }));

  if (!character) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Link
          href={`/dashboard/campaigns/${campaignId}?tab=members`}
          className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-hero-vibrant hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Zurück zur Kampagne
        </Link>
        <div className="rounded-lg border border-red-900/50 bg-red-900/20 p-6">
          <h2 className="font-barlow font-bold text-xl text-red-400 mb-2">
            Charakter nicht gefunden
          </h2>
          <p className="font-libre text-gray-300">
            Der Charakter konnte nicht geladen werden. Möglicherweise ist er nicht mit dieser Kampagne verknüpft.
          </p>
        </div>
      </div>
    );
  }

  const factionReputations = await getCharacterFactionReputations(
    characterId,
    campaignId,
  );

  const characterForEditor = serializeCharacterForEditorClient(
    character as Record<string, unknown>,
  );

  const npcsForEditor = (npcs as any[]).map((n) => ({
    id: String(n.id),
    name: String(n.name ?? ""),
    role: n.role != null ? String(n.role) : null,
    title: n.title != null ? String(n.title) : null,
  }));

  const factionsSlim = (factions as any[]).map((f: any) => ({
    id: String(f.id),
    name: String(f.name ?? ""),
  }));

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
        character={characterForEditor as any}
        campaignId={campaignId}
        currentUserId={userId}
        npcs={serializeForClient(npcsForEditor)}
        factions={serializeForClient(factionsSlim)}
        cultures={serializeForClient(editorOpts.cultures)}
        languages={serializeForClient(editorOpts.languages)}
        locations={serializeForClient(editorOpts.locations)}
        factionChoices={serializeForClient(factionChoices)}
        initialFactionReputations={serializeForClient(factionReputations)}
      />
    </div>
  );
}
