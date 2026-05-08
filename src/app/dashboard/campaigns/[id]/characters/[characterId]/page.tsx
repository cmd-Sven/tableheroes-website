import Link from "next/link";
import nextDynamic from "next/dynamic";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getCampaignAccess } from "../../campaign-access";
import { getCharacterFromMembersForGM } from "../../character-actions";
import { getCharacterEditorLoreOptionsForGm } from "../../character-queries";
import { getFactionsWithMembers } from "../../factions-queries";
import { getNPCs } from "../../npc-queries";
import { getCharacterFactionReputations } from "../../reputation-queries";
import { serializeCharacterForEditorClient } from "@/src/lib/characters/serialize-character-for-editor-client";
import { serializeForClient } from "@/src/lib/serialize-for-flight";

/** Client-only: vermeidet Hydration-Mismatches (#418) mit komplexem Formular / Slidern / File-Inputs. */
const GMCharacterEditorPage = nextDynamic(
  () =>
    import("@/src/components/dashboard/campaigns/GMCharacterEditorPage").then(
      (m) => m.GMCharacterEditorPage,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg border border-hero-dark bg-background-card p-10 text-center font-libre text-gray-300">
        Charakter-Editor wird geladen…
      </div>
    ),
  },
);

export const dynamic = "force-dynamic";

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

  let characterForEditor: Record<string, unknown>;
  try {
    characterForEditor = serializeCharacterForEditorClient(
      character as Record<string, unknown>,
    );
  } catch (err) {
    console.error("[GMCharacterEditPage] serializeCharacterForEditorClient:", err);
    const c = character as Record<string, unknown>;
    characterForEditor = serializeForClient({
      id: String(c.id ?? characterId),
      name: String(c.name ?? ""),
      class: String(c.class ?? ""),
      race: String(c.race ?? ""),
      level: 1,
      status: String(c.status ?? "Active"),
      biography: c.biography != null ? String(c.biography) : "",
      avatar_url: c.avatar_url != null ? String(c.avatar_url) : "",
      avatar_storage_path: c.avatar_storage_path ?? null,
      avatar_display: null,
      culture_lore_id: c.culture_lore_id != null ? String(c.culture_lore_id) : "",
      languages: [],
      faction_membership: c.faction_membership != null ? String(c.faction_membership) : "",
      current_location_id: c.current_location_id != null ? String(c.current_location_id) : "",
      character_relationships: [],
    }) as Record<string, unknown>;
  }

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
