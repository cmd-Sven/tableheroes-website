import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { FactionCreationWizard } from "@/src/components/dashboard/campaigns/factions/FactionCreationWizard";
import { getAllLocations } from "../../location-actions";
import { getFactions } from "../../factions-actions";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CreateFactionPage({ params }: Props) {
  const { id: campaignId } = await params;
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // 2. Check if user is GM
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id, world_id")
    .eq("id", campaignId)
    .single();

  const campaign = campaignRaw as { id: string; gm_id: string; world_id: string | null } | null;

  if (!campaign) redirect("/dashboard");
  if (campaign.gm_id !== user.id) redirect(`/dashboard/campaigns/${campaignId}`);

  // 3. Load locations and factions
  const locations: any[] = (await getAllLocations(campaignId)) || [];
  const factions: any[] = (await getFactions(campaignId)) || [];

  // Transform locations to ensure no null values
  const typedLocations = locations.map((loc) => ({
    id: loc.id,
    name: loc.name || "Unbenannter Ort",
    type: loc.type || "Ort",
  }));

  // Transform factions
  const typedFactions = factions.map((f) => ({
    id: f.id,
    name: f.name,
  }));

  return (
    <div className="container mx-auto p-6">
      <FactionCreationWizard
        campaignId={campaignId}
        worldId={campaign.world_id ?? undefined}
        initialData={null}
        locations={typedLocations}
        factions={typedFactions}
      />
    </div>
  );
}
