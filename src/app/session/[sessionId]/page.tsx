import { createClient } from "@/src/lib/supabase/server";
import { notFound } from "next/navigation";
import { LiveSessionBoard } from "./LiveSessionBoard";
import { getNPCs } from "@/src/app/dashboard/campaigns/[id]/npc-actions";

type Props = {
  params: Promise<{ sessionId: string }>;
};

export default async function SessionPage({ params }: Props) {
  const { sessionId } = await params;

  // Basic UUID validation (if you use UUIDs for sessions)
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(sessionId)) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  // 1. Load Session
  const { data: sessionRaw, error: sessionError } = await (supabase.from("sessions") as any)
    .select("id, campaign_id, status")
    .eq("id", sessionId)
    .single();

  // Expliziter Cast gegen 'never'
  const session = sessionRaw as { id: string; campaign_id: string; status: string } | null;

  if (sessionError || !session) {
    notFound();
  }

  // 2. Load Campaign to determine GM
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("gm_id")
    .eq("id", (session as any).campaign_id)
    .single();

  // Expliziter Cast gegen 'never'
  const campaign = campaignRaw as { gm_id: string } | null;

  if (!campaign) {
    notFound();
  }

  const isGM = campaign.gm_id === user.id;

  // 3. Load live state (if exists)
  const { data: liveState } = await (supabase.from("session_live_states") as any)
    .select("*")
    .eq("session_id", sessionId)
    .single()
    .throwOnError(false);

  // 4. Load Party Characters (accepted members with characters)
  const { data: partyRows } = await (supabase.from("campaign_members") as any)
    .select(
      `
        id,
        status,
        character_id,
        characters (
          id,
          name,
          class,
          race,
          level,
          avatar_url
        )
      `,
    )
    .eq("campaign_id", (session as any).campaign_id)
    .eq("status", "Accepted")
    .not("character_id", "is", null);

  const partyCharacters =
    partyRows
      ?.map((row: any) => row.characters)
      .filter((c: any) => !!c) || [];

  // 5. Load campaign NPCs (Sichtbarkeit aus campaign_visibility)
  const npcsFromCampaign = await getNPCs(
    (session as any).campaign_id,
    user.id,
    isGM
  );
  const allCampaignNpcs = npcsFromCampaign.map((npc: any) => ({
    id: npc.id,
    name: npc.name,
    title: npc.title ?? null,
    description: npc.description ?? null,
    image_url: npc.image_url ?? null,
    is_revealed: npc.is_revealed ?? false,
  }));

  // 6. Load Active, Revealed Quests for this campaign
  const { data: activeQuests } = await (supabase.from("quests") as any)
    .select(
      `
        id,
        title,
        description,
        rewards,
        type,
        quest_giver:npcs (
          id,
          name
        ),
        location:world_lore (
          id,
          name
        )
      `,
    )
    .eq("campaign_id", (session as any).campaign_id)
    .eq("status", "Active")
    .eq("is_revealed", true);

  return (
    <LiveSessionBoard
      sessionId={sessionId}
      campaignId={(session as any).campaign_id as string}
      isGM={isGM}
      userId={user.id}
      initialLiveState={liveState || null}
      partyCharacters={partyCharacters}
      allCampaignNpcs={allCampaignNpcs || []}
      activeQuests={activeQuests || []}
    />
  );
}

