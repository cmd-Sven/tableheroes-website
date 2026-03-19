import { createClient } from "@/src/lib/supabase/server";
import { getFactionById, getFactionRelations } from "../../factions-actions";
import { getVisibilityForCampaign } from "../../campaign-visibility-actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FactionDetailPage } from "@/src/components/dashboard/campaigns/FactionDetailPage";
import { getNPCs } from "../../npc-actions";
import { getLoreEntries } from "../../lore-actions";
import { isLocationType } from "@/src/lib/lore-types";
import { getCampaignNote } from "../../campaign-notes-actions";

type Props = {
  params: Promise<{ id: string; factionId: string }>;
};

export default async function FactionDetailPageRoute({ params }: Props) {
  const { id: campaignId, factionId } = await params;
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // 2. Check if user has access to campaign
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id, world_id")
    .eq("id", campaignId)
    .single();

  const campaign = campaignRaw as { id: string; gm_id: string; world_id: string | null } | null;

  if (!campaign) redirect("/dashboard");

  const isGM = campaign.gm_id === user.id;

  // 3. Check membership (if not GM)
  if (!isGM) {
    const { data: membershipRaw } = await (supabase.from("campaign_members") as any)
      .select("status")
      .eq("campaign_id", campaignId)
      .eq("user_id", user.id)
      .single();

    // Expliziter Cast gegen 'never'
    const membership = membershipRaw as { status: string } | null;

    if (!membership || !["Accepted", "Drafting", "In_Review"].includes(membership.status)) {
      redirect("/dashboard");
    }
  }

  // 4. Fetch Faction with all related data
  const faction = await getFactionById(factionId);

  // 5. Check if faction exists
  if (!faction) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-red-500 mb-2">Fraktion nicht gefunden</h2>
        <p className="text-gray-400 mb-4">Diese Fraktion existiert nicht oder wurde gelöscht.</p>
        <Link
          href={`/dashboard/campaigns/${campaignId}?tab=factions`}
          className="text-hero-vibrant hover:underline mt-4 inline-block"
        >
          &larr; Zurück zur Übersicht
        </Link>
      </div>
    );
  }

  // 6. Verify Faction belongs to this campaign's world
  if (!campaign.world_id || (faction as any).world_id !== campaign.world_id) {
    redirect(`/dashboard/campaigns/${campaignId}`);
  }

  // 7. Filter NPCs by campaign_visibility (for players, only show revealed or own)
  let visibleNPCs = (faction as any).npcs || [];
  if (!isGM) {
    const npcVisibility = await getVisibilityForCampaign(campaignId, "npc");
    visibleNPCs = visibleNPCs.filter(
      (npc: any) => npcVisibility[npc.id] === true || npc.user_id === user.id
    );
  }

  // 8. Spieler-Notiz für diese Kampagne laden (campaign_notes)
  const campaignNote = await getCampaignNote(campaignId, "faction", factionId);
  const initialCampaignPlayerNote = campaignNote?.content ?? "";

  // 9. Load NPCs, Locations and Faction Relations
  const allNPCs = await getNPCs(campaignId, user.id, isGM);
  const loreEntries = await getLoreEntries(campaignId);
  const initialRelations = await getFactionRelations(campaignId, factionId);

  // Filter locations (geographical types)
  const locations = loreEntries
    .filter((entry: any) => isLocationType(entry.type))
    .map((entry: any) => ({
      id: entry.id,
      name: entry.name,
      type: entry.type,
    }));

  return (
    <FactionDetailPage
      faction={{ ...faction, npcs: visibleNPCs } as any}
      campaignId={campaignId}
      worldId={(faction as { world_id?: string }).world_id}
      isGM={isGM}
      userId={user.id}
      initialCampaignPlayerNote={initialCampaignPlayerNote}
      initialRelations={initialRelations}
      npcs={allNPCs.map((npc: any) => ({ id: npc.id, name: npc.name }))}
      locations={locations}
    />
  );
}

