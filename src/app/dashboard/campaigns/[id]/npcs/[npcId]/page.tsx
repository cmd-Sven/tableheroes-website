import { createClient } from "@/src/lib/supabase/server";
import { getNPCById } from "../../npc-actions";
import { getNPCs } from "../../npc-queries";
import { redirect, notFound } from "next/navigation";
import { getNpcSceneAppearances } from "@/src/app/dashboard/campaigns/[id]/scene-media-actions";
import { NPCDetailPage } from "@/src/components/dashboard/campaigns/NPCDetailPage";
import { getFactions } from "../../factions-actions";
import { getLoreLocationOptions } from "../../lore-queries";
import { getVisibilityForCampaign } from "../../campaign-visibility-queries";
import { getCampaignNote } from "../../campaign-notes-actions";

type Props = {
  params: Promise<{ id: string; npcId: string }>;
};

export default async function NPCDetailPageRoute({ params }: Props) {
  const { id: campaignId, npcId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [{ data: profileRaw }, { data: campaignRaw }] = await Promise.all([
    (supabase.from("users") as any).select("primary_role").eq("id", user.id).single(),
    (supabase.from("campaigns") as any)
      .select("id, gm_id, world_id")
      .eq("id", campaignId)
      .single(),
  ]);

  const profile = profileRaw as { primary_role: string } | null;
  const isAdmin = profile?.primary_role === "Admin";
  const campaign = campaignRaw as { id: string; gm_id: string; world_id: string | null } | null;

  if (!campaign) redirect("/dashboard");

  const isGM = campaign.gm_id === user.id;
  const canEdit = isGM || isAdmin;

  if (!isGM && !isAdmin) {
    const { data: membershipRaw } = await (supabase.from("campaign_members") as any)
      .select("status")
      .eq("campaign_id", campaignId)
      .eq("user_id", user.id)
      .single();

    const membership = membershipRaw as { status: string } | null;

    if (
      !membership ||
      !["Approved", "Active", "Drafting", "In_Review", "Changes_Proposed"].includes(
        membership.status,
      )
    ) {
      redirect("/dashboard");
    }
  }

  const npc = await getNPCById(npcId);
  if (!npc) notFound();

  if (!campaign.world_id || (npc as any).world_id !== campaign.world_id) {
    redirect(`/dashboard/campaigns/${campaignId}`);
  }

  const npcVisibility = await getVisibilityForCampaign(campaignId, "npc");
  const isRevealed = npcVisibility[npcId] ?? false;

  if (!isGM && !isAdmin && !isRevealed && (npc as any).user_id !== user.id) {
    redirect(`/dashboard/campaigns/${campaignId}?tab=npcs`);
  }

  const npcWithVisibility = {
    ...npc,
    is_revealed: isRevealed,
  };

  const [
    campaignNote,
    lastSeenRaw,
    factions,
    locations,
    sceneAppearances,
    gmNpcList,
    membersRaw,
  ] = await Promise.all([
    getCampaignNote(campaignId, "npc", npcId),
    (supabase.from("campaign_npc_reputation") as any)
      .select("last_seen_session_id, last_seen_location_id, last_seen_at")
      .eq("campaign_id", campaignId)
      .eq("npc_id", npcId)
      .maybeSingle(),
    getFactions(campaignId),
    getLoreLocationOptions(campaignId),
    getNpcSceneAppearances(campaignId, npcId).catch(() => []),
    isGM ? getNPCs(campaignId, user.id, true) : Promise.resolve([]),
    isGM
      ? (supabase.from("campaign_members") as any)
          .select(`
        id,
        character_id,
        users:user_id (username),
        characters:character_id (id, name, class, race, level, status)
      `)
          .eq("campaign_id", campaignId)
          .eq("status", "Approved")
      : Promise.resolve({ data: [] }),
  ]);

  const initialCampaignPlayerNote = campaignNote?.content ?? "";

  const lastSeenRow = lastSeenRaw.data as {
    last_seen_session_id?: string | null;
    last_seen_location_id?: string | null;
    last_seen_at?: string | null;
  } | null;

  let lastSeen: {
    archiveId: string | null;
    sessionName: string | null;
    locationId: string | null;
    locationName: string | null;
    seenAt: string | null;
  } | null = null;

  if (lastSeenRow?.last_seen_session_id || lastSeenRow?.last_seen_location_id) {
    const [archiveResult, locationResult] = await Promise.all([
      lastSeenRow.last_seen_session_id
        ? (supabase.from("session_archives") as any)
            .select("id, session_name")
            .eq("id", lastSeenRow.last_seen_session_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      lastSeenRow.last_seen_location_id
        ? (supabase.from("world_lore") as any)
            .select("id, name")
            .eq("id", lastSeenRow.last_seen_location_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    lastSeen = {
      archiveId: lastSeenRow.last_seen_session_id ?? null,
      sessionName: archiveResult.data?.session_name ?? null,
      locationId: lastSeenRow.last_seen_location_id ?? null,
      locationName: locationResult.data?.name ?? null,
      seenAt: lastSeenRow.last_seen_at ?? null,
    };
  }

  const npcsForQuest = isGM
    ? (gmNpcList || []).map((n: any) => ({
        id: n.id,
        name: n.name,
        title: n.title || null,
        role: n.role || null,
      }))
    : [];

  const membersForQuest = isGM
    ? ((membersRaw.data as any[]) || []).map((m: any) => ({
        id: m.id,
        character_id: m.character_id,
        user: m.users ? { username: m.users.username } : null,
        character_data: m.characters || null,
      }))
    : [];

  return (
    <NPCDetailPage
      npc={npcWithVisibility}
      campaignId={campaignId}
      worldId={(npc as { world_id?: string }).world_id}
      isGM={isGM}
      canEdit={canEdit}
      userId={user.id}
      initialCampaignPlayerNote={initialCampaignPlayerNote}
      factions={(factions || []).map((f: any) => ({ id: f.id, name: f.name }))}
      locations={locations}
      lastSeen={lastSeen}
      sceneAppearances={sceneAppearances}
      npcsForQuest={npcsForQuest}
      membersForQuest={membersForQuest}
    />
  );
}
