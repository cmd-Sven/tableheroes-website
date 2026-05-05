import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { NPCForm } from "@/src/components/dashboard/campaigns/npcs/NPCForm";
import { getNPCById } from "../../../npc-actions";
import { getFactions } from "../../../factions-actions";
import { getLoreEntries } from "../../../lore-queries";
import { isLocationType } from "@/src/lib/lore-types";

type Props = {
  params: Promise<{ id: string; npcId: string }>;
};

export default async function EditNPCPage({ params }: Props) {
  const { id: campaignId, npcId } = await params;
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

  // 3. Load NPC
  let npc;
  try {
    npc = await getNPCById(npcId);
  } catch (error: any) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-500 mb-2">NPC nicht gefunden</h2>
          <p className="text-gray-400 mb-4">Dieser NPC existiert nicht oder wurde gelöscht.</p>
          <Link
            href={`/dashboard/campaigns/${campaignId}?tab=npcs`}
            className="text-hero-vibrant hover:underline"
          >
            &larr; Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  // 4. Verify NPC belongs to this campaign
  if ((npc as any).campaign_id !== campaignId) {
    redirect(`/dashboard/campaigns/${campaignId}`);
  }

  // 5. Load factions and locations
  const factions = await getFactions(campaignId);
  const loreEntries = await getLoreEntries(campaignId);
  const { data: shopsRaw } = await (supabase.from("campaign_shops") as any)
    .select("id, name, price_modifier_percent")
    .eq("campaign_id", campaignId)
    .order("name", { ascending: true });
  
  const locations = (loreEntries || [])
    .filter((entry: any) => isLocationType(entry.type))
    .map((entry: any) => ({
      id: entry.id,
      name: entry.name,
      type: entry.type,
    }));

  return (
    <div className="container mx-auto p-6">
      <div className="mb-4">
        <Link
          href={`/dashboard/campaigns/${campaignId}/npcs/${npcId}`}
          className="text-hero-vibrant hover:underline font-barlow font-bold uppercase text-sm"
        >
          &larr; Zurück zum NPC
        </Link>
      </div>
      <NPCForm
        campaignId={campaignId}
        initialData={npc as any}
        factions={(factions || []).map((f: any) => ({ id: f.id, name: f.name }))}
        locations={locations}
        shops={(shopsRaw || []).map((shop: any) => ({
          id: String(shop.id),
          name: String(shop.name),
          price_modifier_percent:
            typeof shop.price_modifier_percent === "number"
              ? shop.price_modifier_percent
              : null,
        }))}
      />
    </div>
  );
}



