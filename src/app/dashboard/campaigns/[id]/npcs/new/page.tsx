import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { AIGenerationWizardEmbedded } from "@/src/components/dashboard/campaigns/npcs/AIGenerationWizardEmbedded";
import { getFactions } from "../../factions-actions";
import { getAllLocations } from "../../location-actions";
import { getWorldByCampaign } from "../../world-actions";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CreateNPCPage({ params }: Props) {
  const { id: campaignId } = await params;
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // 2. Check if user is GM
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id")
    .eq("id", campaignId)
    .single();

  // Expliziter Cast gegen 'never'
  const campaign = campaignRaw as { id: string; gm_id: string } | null;

  if (!campaign) redirect("/dashboard");
  if (campaign.gm_id !== user.id) redirect(`/dashboard/campaigns/${campaignId}`);

  // 3. Load world data
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
    />
  );
}


