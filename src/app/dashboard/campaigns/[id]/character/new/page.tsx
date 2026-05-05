import { createClient } from "@/src/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CharacterCreatorPageClient } from "./CharacterCreatorPageClient";
import { getNPCs } from "../../npc-queries";
import { getVisibilityForCampaign } from "../../campaign-visibility-queries";

const GEOGRAPHIC_TYPES = ["Stadt", "Region", "Ort", "Akademie", "Tempel", "Gilde"];
const typeMatchesGeographic = (type: string | null | undefined) =>
  GEOGRAPHIC_TYPES.some((t) => String(t).toLowerCase() === String(type ?? "").toLowerCase());

/** Nur primitive Felder – vermeidet RSC/Flight-Serialisierungsfehler durch DB-Typen. */
function wizardFactionsForClient(rows: any[]) {
  return rows.map((f: any) => ({
    id: String(f.id),
    name: f.name != null ? String(f.name) : "",
    type: f.type != null ? String(f.type) : "",
    allow_pc_join_on_creation: !!f.allow_pc_join_on_creation,
  }));
}

function wizardLocationsForClient(rows: any[]) {
  return rows.map((e: any) => ({
    id: String(e.id),
    name: e.name != null ? String(e.name) : "",
    type: e.type != null ? String(e.type) : "",
    allow_pc_origin: !!e.allow_pc_origin,
  }));
}

function wizardNpcsForClient(rows: any[]) {
  return rows.map((n: any) => ({
    id: String(n.id),
    name: n.name != null ? String(n.name) : "",
    title: n.title != null ? String(n.title) : null,
    role: n.role != null ? String(n.role) : null,
  }));
}

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CharacterNewPage({ params }: Props) {
  const { id: campaignId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: campaign } = await (supabase.from("campaigns") as any)
    .select("id, world_id, gm_id")
    .eq("id", campaignId)
    .single();

  if (!campaign) notFound();

  const isGM = campaign.gm_id === user.id;
  const campaignWorldId = campaign.world_id as string | null;

  if (!isGM) {
    const { data: member } = await (supabase.from("campaign_members") as any)
      .select("status")
      .eq("campaign_id", campaignId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!member || !["Approved", "Active", "Drafting", "In_Review", "Changes_Proposed"].includes(member.status)) {
      redirect(`/dashboard/campaigns/${campaignId}`);
    }
  }

  let wizardFactions: any[] = [];
  let wizardLocations: any[] = [];
  let npcs: any[] = [];

  if (campaignWorldId) {
    if (isGM) {
      const { data: factions } = await (supabase.from("factions") as any)
        .select("*")
        .eq("world_id", campaignWorldId);
      wizardFactions = (factions || []) as any[];

      const { data: lore } = await (supabase.from("world_lore") as any)
        .select("*")
        .eq("world_id", campaignWorldId);
      wizardLocations = ((lore || []) as any[]).filter((e: any) => typeMatchesGeographic(e.type));
    } else {
      const { data: allFactions } = await (supabase.from("factions") as any)
        .select("*")
        .eq("world_id", campaignWorldId);
      wizardFactions = ((allFactions || []) as any[]).filter(
        (f: any) => f.allow_pc_join_on_creation === true
      );

      const { data: allLore } = await (supabase.from("world_lore") as any)
        .select("*")
        .eq("world_id", campaignWorldId);
      wizardLocations = ((allLore || []) as any[]).filter(
        (e: any) => typeMatchesGeographic(e.type) && e.allow_pc_origin === true
      );
      const [loreVis, facVis] = await Promise.all([
        getVisibilityForCampaign(campaignId, "lore"),
        getVisibilityForCampaign(campaignId, "faction"),
      ]);
      wizardLocations = wizardLocations.filter((e: any) => loreVis[e.id] === true);
      wizardFactions = wizardFactions.filter((f: any) => facVis[f.id] === true);
    }
    npcs = await getNPCs(campaignId, user.id, isGM);
  }

  return (
    <div className="min-h-screen bg-background-dark">
      <div className="container mx-auto max-w-4xl px-4 py-6">
        <Link
          href={`/dashboard/campaigns/${campaignId}`}
          className="inline-flex items-center gap-2 font-barlow font-bold uppercase text-gray-400 hover:text-hero-vibrant transition-colors mb-6"
        >
          <ArrowLeft className="h-5 w-5" />
          Zurück zur Kampagne
        </Link>
        <CharacterCreatorPageClient
          campaignId={campaignId}
          factions={wizardFactionsForClient(wizardFactions)}
          locations={wizardLocationsForClient(wizardLocations)}
          npcs={wizardNpcsForClient(npcs)}
        />
      </div>
    </div>
  );
}
