import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LoreForm } from "@/src/components/dashboard/campaigns/lore/LoreForm";
import { getLoreById, getLoreEntries } from "../../../lore-actions";
import { getWorldByCampaign } from "../../../world-actions";

type Props = {
  params: Promise<{ id: string; loreId: string }>;
};

export default async function EditLorePage({ params }: Props) {
  const { id: campaignId, loreId } = await params;
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

  // 3. Load lore entry
  const lore = await getLoreById(loreId);
  if (!lore) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-500 mb-2">Lore-Eintrag nicht gefunden</h2>
          <p className="text-gray-400 mb-4">Dieser Eintrag existiert nicht oder wurde gelöscht.</p>
          <Link
            href={`/dashboard/campaigns/${campaignId}?tab=lore`}
            className="text-hero-vibrant hover:underline"
          >
            &larr; Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  // 4. Verify lore belongs to this campaign
  if ((lore as any).campaign_id !== campaignId) {
    redirect(`/dashboard/campaigns/${campaignId}`);
  }

  // 5. Load world for this campaign
  let world = null;
  try {
    world = await getWorldByCampaign(campaignId);
  } catch (error) {
    console.error("Error fetching world:", error);
  }

  // 6. Load all lore entries for parent dropdown
  const loreEntries = await getLoreEntries(campaignId);
  const parentOptions = (loreEntries || []).map((entry: any) => ({
    id: entry.id,
    name: entry.name,
    type: entry.type,
  }));

  // 7. Gottheits-/Religionsdaten laden
  let initialDeityFields: {
    epithet?: string | null;
    symbol_description?: string | null;
    symbol_image_url?: string | null;
    domain?: string | null;
    dark_side?: string | null;
  } | null = null;
  let initialReligionDeityId: string | null = null;

  if ((lore as any).type === "Gottheit" && (lore as any).world_id) {
    try {
      const worldId = (lore as any).world_id as string;
      const { data: deity } = await (supabase.from("deities") as any)
        .select("epithet, symbol_description, symbol_image_url, domain, dark_side")
        .eq("world_id", worldId)
        .eq("name", (lore as any).name)
        .maybeSingle();
      if (deity) {
        initialDeityFields = deity as any;
      }
    } catch (error) {
      console.error("Error loading deity fields for campaign edit:", error);
    }
  } else if ((lore as any).type === "Religion" && (lore as any).world_id) {
    try {
      const worldId = (lore as any).world_id as string;
      const { data: religion } = await (supabase.from("religions") as any)
        .select("deity_id")
        .eq("world_id", worldId)
        .eq("name", (lore as any).name)
        .maybeSingle();
      if (religion && (religion as any).deity_id) {
        initialReligionDeityId = String((religion as any).deity_id);
      }
    } catch (error) {
      console.error("Error loading religion deity for campaign edit:", error);
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-4">
        <Link
          href={`/dashboard/campaigns/${campaignId}/lore/${loreId}`}
          className="text-hero-vibrant hover:underline font-barlow font-bold uppercase text-sm"
        >
          &larr; Zurück zum Eintrag
        </Link>
      </div>
      <LoreForm 
        campaignId={campaignId} 
        initialData={lore as any} 
        parentOptions={parentOptions}
        world={world ? { id: (world as any).id, name: (world as any).name } : null}
        initialDeityFields={initialDeityFields}
        initialReligionDeityId={initialReligionDeityId}
      />
    </div>
  );
}



