import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { AIGenerationWizardEmbedded } from "@/src/components/dashboard/campaigns/npcs/AIGenerationWizardEmbedded";
import { getFactions } from "../../factions-actions";
import { getAllLocations } from "../../location-actions";
import { getWorldByCampaign } from "../../world-actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ prefill_name?: string; prefill_relationship?: string; prefill_description?: string }>;
};

export default async function CreateNPCPage({ params, searchParams }: Props) {
  const { id: campaignId } = await params;
  const search = await searchParams;
  const prefillName = search.prefill_name ?? undefined;
  const prefillRelationship = search.prefill_relationship ?? undefined;
  const prefillDescription = search.prefill_description ?? undefined;
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // 2. Check if user is GM und ob Kampagne eine Welt hat
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id, world_id")
    .eq("id", campaignId)
    .single();

  const campaign = campaignRaw as { id: string; gm_id: string; world_id: string | null } | null;

  if (!campaign) redirect("/dashboard");
  if (campaign.gm_id !== user.id) redirect(`/dashboard/campaigns/${campaignId}`);

  // GM: NPCs werden in der Welt angelegt – Redirect zur Welt-NPC-Wizard-Seite (NarrativeNPCWizard)
  if (campaign.world_id) {
    const q = new URLSearchParams();
    if (prefillName) q.set("prefill_name", prefillName);
    if (prefillRelationship) q.set("prefill_relationship", prefillRelationship);
    if (prefillDescription) q.set("prefill_description", prefillDescription);
    const query = q.toString();
    redirect(`/dashboard/worlds/${campaign.world_id}/npcs/create${query ? `?${query}` : ""}`);
  }

  // 3. Load world data (Fallback ohne world_id)
  const world = await getWorldByCampaign(campaignId);

  // 4. Load factions and locations
  const factions: any[] = (await getFactions(campaignId)) || [];
  const locations: any[] = (await getAllLocations(campaignId)) || [];

  return (
    <AIGenerationWizardEmbedded
      campaignId={campaignId}
      factions={factions.map((f: any) => ({ 
        id: String(f.id), 
        name: String(f.name) 
      }))}
      locations={locations.map((loc: any) => ({
        id: String(loc.id),
        name: String(loc.name),
        type: String((loc as any).type || "Ort")
      }))}
      world={world}
      prefillName={prefillName}
      prefillRole={prefillRelationship}
      prefillDescription={prefillDescription}
    />
  );
}


