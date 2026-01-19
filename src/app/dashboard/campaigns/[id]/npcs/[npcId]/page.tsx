import { createClient } from "@/src/lib/supabase/server";
import { getNPCById } from "../../npc-actions";
import { redirect, notFound } from "next/navigation";
import { NPCDetailPage } from "@/src/components/dashboard/campaigns/NPCDetailPage";
import { getFactions } from "../../factions-actions";
import { getLoreEntries } from "../../lore-actions";

type Props = {
  params: Promise<{ id: string; npcId: string }>;
};

export default async function NPCDetailPageRoute({ params }: Props) {
  const { id: campaignId, npcId } = await params;
  const supabase = await createClient();

  // 1. Auth Check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // 2. Check user role
  const { data: profileRaw } = await (supabase.from("users") as any)
    .select("primary_role")
    .eq("id", user.id)
    .single();

  const profile = profileRaw as { primary_role: string } | null;
  const isAdmin = profile?.primary_role === "Admin";

  // 3. Check if user has access to campaign
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("id, gm_id")
    .eq("id", campaignId)
    .single();

  // Expliziter Cast gegen 'never'
  const campaign = campaignRaw as { id: string; gm_id: string } | null;

  if (!campaign) redirect("/dashboard");

  const isGM = campaign.gm_id === user.id;
  const canEdit = isGM || isAdmin;

  // 4. Check membership (if not GM and not Admin)
  if (!isGM && !isAdmin) {
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

  // 5. Fetch NPC with all related data
  const npc = await getNPCById(npcId);

  // 6. Check if NPC was found
  if (!npc) {
    notFound();
  }

  // 7. Verify NPC belongs to this campaign
  if ((npc as any).campaign_id !== campaignId) {
    redirect(`/dashboard/campaigns/${campaignId}`);
  }

  // 8. Load factions and locations for dropdowns
  const factions = await getFactions(campaignId);
  const loreEntries = await getLoreEntries(campaignId);
  
  // Filter locations (geographical types)
  const locations = (loreEntries || [])
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
    <NPCDetailPage
      npc={npc}
      campaignId={campaignId}
      isGM={isGM}
      canEdit={canEdit}
      userId={user.id}
      factions={(factions || []).map((f: any) => ({ id: f.id, name: f.name }))}
      locations={locations}
    />
  );
}

