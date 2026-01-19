import { createClient } from "@/src/lib/supabase/server";
import { getFactionById } from "../../../factions-actions";
import { redirect } from "next/navigation";
import { FactionForm } from "@/src/components/dashboard/campaigns/factions/FactionForm";

type Props = {
  params: Promise<{ id: string; factionId: string }>;
};

export default async function FactionEditPage({ params }: Props) {
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

  // 3. Only GM can edit
  if (!isGM) {
    redirect(`/dashboard/campaigns/${campaignId}/factions/${factionId}`);
  }

  // 4. Fetch Faction with all related data
  const faction = await getFactionById(factionId);

  // 5. Check if faction exists and belongs to this campaign
  if (!faction) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-red-500 mb-2">Fraktion nicht gefunden</h2>
        <p className="text-gray-400 mb-4">Diese Fraktion existiert nicht oder wurde gelöscht.</p>
        <a
          href={`/dashboard/campaigns/${campaignId}?tab=factions`}
          className="text-hero-vibrant hover:underline mt-4 inline-block"
        >
          &larr; Zurück zur Übersicht
        </a>
      </div>
    );
  }

  if ((faction as any).campaign_id !== campaignId) {
    redirect(`/dashboard/campaigns/${campaignId}`);
  }

  // 6. Load locations for dropdown
  const { data: locationsRaw } = await (supabase.from("world_lore") as any)
    .select("id, name, type")
    .eq("campaign_id", campaignId)
    .in("type", ["Stadt", "Region", "Ort", "Insel", "Gebäude", "Tempel", "Land", "Dungeon", "Akademie", "Markt", "Laden"])
    .order("name", { ascending: true });

  const locations = locationsRaw as { id: string; name: string | null; type: string | null }[] | null;

  // Transform locations to ensure no null values
  const typedLocations = (locations || []).map(loc => ({
    ...loc,
    name: loc.name || "Unbenannter Ort",
    type: loc.type || "Location"
  }));

  return (
    <FactionForm
      campaignId={campaignId}
      initialData={faction as any}
      locations={typedLocations as any}
    />
  );
}



