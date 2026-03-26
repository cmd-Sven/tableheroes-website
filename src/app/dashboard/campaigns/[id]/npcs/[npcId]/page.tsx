import { createClient } from "@/src/lib/supabase/server";
import { getNPCById } from "../../npc-actions";
import { getNPCs } from "../../npc-queries";
import { redirect, notFound } from "next/navigation";
import { NPCDetailPage } from "@/src/components/dashboard/campaigns/NPCDetailPage";
import { getFactions } from "../../factions-actions";
import { getLoreEntries } from "../../lore-queries";
import { isLocationType } from "@/src/lib/lore-types";
import { getVisibilityForCampaign } from "../../campaign-visibility-queries";
import { getCampaignNote } from "../../campaign-notes-actions";

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

  // 7. Verify NPC belongs to campaign's world; für Spieler: nur bei campaign_visibility sichtbar
  const { data: camp } = await (supabase.from("campaigns") as any)
    .select("world_id")
    .eq("id", campaignId)
    .single();
  if (!camp?.world_id || (npc as any).world_id !== camp.world_id) {
    redirect(`/dashboard/campaigns/${campaignId}`);
  }
  if (!isGM && !isAdmin) {
    const visibility = await getVisibilityForCampaign(campaignId, "npc");
    if (!visibility[npcId] && (npc as any).user_id !== user.id) {
      redirect(`/dashboard/campaigns/${campaignId}?tab=npcs`);
    }
  }

  // 8. Spieler-Notiz für diese Kampagne laden (isolierte campaign_notes)
  const campaignNote = await getCampaignNote(campaignId, "npc", npcId);
  const initialCampaignPlayerNote = campaignNote?.content ?? "";

  // 9. Load factions and locations for dropdowns
  const factions = await getFactions(campaignId);
  const loreEntries = await getLoreEntries(campaignId);
  
  // Filter locations (geographical types)
  const locations = (loreEntries || [])
    .filter((entry: any) => isLocationType(entry.type))
    .map((entry: any) => ({
      id: entry.id,
      name: entry.name,
      type: entry.type,
    }));

  // 10. Für Quest-Modal von NPC-Seite: NPC-Liste und Mitglieder laden (nur wenn GM)
  let npcsForQuest: Array<{ id: string; name: string; title: string | null; role: string | null }> = [];
  let membersForQuest: Array<{ id: string; character_id: string | null; user?: { username: string } | null; character_data?: any; characters?: any }> = [];
  if (isGM) {
    const npcsRaw = await getNPCs(campaignId, user.id, true);
    npcsForQuest = (npcsRaw || []).map((n: any) => ({
      id: n.id,
      name: n.name,
      title: n.title || null,
      role: n.role || null,
    }));
    const { data: membersRaw } = await (supabase.from("campaign_members") as any)
      .select(`
        id,
        character_id,
        users:user_id (username),
        characters:character_id (id, name, class, race, level, status)
      `)
      .eq("campaign_id", campaignId)
      .eq("status", "Accepted");
    membersForQuest = (membersRaw || []).map((m: any) => ({
      id: m.id,
      character_id: m.character_id,
      user: m.users ? { username: m.users.username } : null,
      character_data: m.characters || null,
    }));
  }

  return (
    <NPCDetailPage
      npc={npc}
      campaignId={campaignId}
      worldId={(npc as { world_id?: string }).world_id}
      isGM={isGM}
      canEdit={canEdit}
      userId={user.id}
      initialCampaignPlayerNote={initialCampaignPlayerNote}
      factions={(factions || []).map((f: any) => ({ id: f.id, name: f.name }))}
      locations={locations}
      npcsForQuest={npcsForQuest}
      membersForQuest={membersForQuest}
    />
  );
}

