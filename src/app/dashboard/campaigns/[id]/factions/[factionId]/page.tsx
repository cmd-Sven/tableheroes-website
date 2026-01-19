import { createClient } from "@/src/lib/supabase/server";
import { getFactionById } from "../../factions-actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FactionDetailPage } from "@/src/components/dashboard/campaigns/FactionDetailPage";
import { getNPCs } from "../../npc-actions";
import { getLoreEntries } from "../../lore-actions";

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
    .select("id, gm_id")
    .eq("id", campaignId)
    .single();

  // Expliziter Cast gegen 'never'
  const campaign = campaignRaw as { id: string; gm_id: string } | null;

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

  // 6. Verify Faction belongs to this campaign
  if ((faction as any).campaign_id !== campaignId) {
    redirect(`/dashboard/campaigns/${campaignId}`);
  }

  // 7. Filter NPCs based on access (for players, only show revealed NPCs or own NPCs)
  let visibleNPCs = (faction as any).npcs || [];
  if (!isGM) {
    visibleNPCs = visibleNPCs.filter(
      (npc: any) => npc.is_revealed === true || npc.user_id === user.id
    );
  }

  // 8. Load NPCs and Locations for dropdowns
  const allNPCs = await getNPCs(campaignId, user.id, isGM);
  const loreEntries = await getLoreEntries(campaignId);
  
  // Filter locations (geographical types)
  const locations = loreEntries
    .filter((entry: any) =>
      ["Stadt", "Region", "Ort", "Insel", "Gebäude", "Tempel", "Land", "Dungeon", "Akademie", "Markt", "Laden"].includes(
        entry.type
      )
    )
    .map((entry: any) => ({
      id: entry.id,
      name: entry.name,
      type: entry.type,
    }));

  return (
    <FactionDetailPage
      faction={{ ...faction, npcs: visibleNPCs } as any}
      campaignId={campaignId}
      isGM={isGM}
      userId={user.id}
      npcs={allNPCs.map((npc: any) => ({ id: npc.id, name: npc.name }))}
      locations={locations}
    />
  );
}

