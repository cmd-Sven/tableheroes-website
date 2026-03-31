import { createClient } from "@/src/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { LiveSessionBoard } from "./LiveSessionBoard";
import { getNPCs } from "@/src/app/dashboard/campaigns/[id]/npc-queries";
import { getFactionsWithMembers } from "@/src/app/dashboard/campaigns/[id]/factions-queries";
import { ensureSessionPrepLiveState } from "@/src/app/dashboard/campaigns/[id]/session-actions";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import { getLoreEntries } from "@/src/app/dashboard/campaigns/[id]/lore-queries";
import { getVisibilityForCampaign } from "@/src/app/dashboard/campaigns/[id]/campaign-visibility-queries";
import { isLocationType } from "@/src/lib/lore-types";

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
    .select("id, campaign_id, status, stage_deck_npc_ids, stage_deck_faction_ids")
    .eq("id", sessionId)
    .single();

  const session = sessionRaw as {
    id: string;
    campaign_id: string;
    status: string;
    stage_deck_npc_ids?: string[] | null;
    stage_deck_faction_ids?: string[] | null;
  } | null;

  if (sessionError || !session) {
    notFound();
  }

  // 2. Load Campaign to determine GM
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("gm_id, owner_id")
    .eq("id", (session as any).campaign_id)
    .single();

  const campaign = campaignRaw as {
    gm_id?: string | null;
    owner_id?: string | null;
  } | null;

  if (!campaign) {
    notFound();
  }

  // Beendete oder abgesagte Sessions können nicht mehr betreten werden
  if (["Completed", "Ended", "Cancelled"].includes(session.status)) {
    redirect(`/dashboard/campaigns/${(session as any).campaign_id}?tab=sessions&ended=1`);
  }

  const isGM = isCampaignGm(campaign, user.id);

  /** Geplant: nur GM darf die Session-Oberfläche öffnen (Vorbereitung ohne Spieler). */
  if (session.status === "Scheduled" && !isGM) {
    redirect(
      `/dashboard/campaigns/${(session as any).campaign_id}?tab=sessions&scheduled=1`,
    );
  }

  // 3. Live state; für GM bei Scheduled ggf. Entwurfszeile anlegen
  let { data: liveState } = await (supabase.from("session_live_states") as any)
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (
    isGM &&
    !liveState &&
    !["Completed", "Ended", "Cancelled"].includes(session.status)
  ) {
    const ensured = await ensureSessionPrepLiveState(sessionId);
    if (ensured) {
      liveState = ensured as typeof liveState;
    }
  }

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
    id: String(npc.id),
    name: npc.name,
    title: npc.title ?? null,
    description: npc.description ?? null,
    image_url: npc.image_url ?? null,
    is_revealed: npc.is_revealed ?? false,
  }));

  const factionsRaw = await getFactionsWithMembers((session as any).campaign_id);
  let allCampaignFactions = (factionsRaw || []).map((f: any) => ({
    id: String(f.id),
    name: String(f.name ?? "Fraktion"),
    image_url: f.image_url ?? null,
    type: f.type != null ? String(f.type) : null,
    description: f.description != null ? String(f.description) : null,
    is_revealed: f.is_revealed ?? false,
  }));
  if (!isGM) {
    allCampaignFactions = allCampaignFactions.filter((f) => f.is_revealed);
  }

  const stageDeckNpcIds =
    session?.stage_deck_npc_ids != null && Array.isArray(session.stage_deck_npc_ids)
      ? session.stage_deck_npc_ids.map(String)
      : null;
  const stageDeckFactionIds =
    session?.stage_deck_faction_ids != null && Array.isArray(session.stage_deck_faction_ids)
      ? session.stage_deck_faction_ids.map(String)
      : null;

  const loreLocationOptions = isGM
    ? (await getLoreEntries((session as any).campaign_id))
        .filter((e: { type?: string | null }) => isLocationType(String(e.type ?? "")))
        .map((e: { id: string; name?: string | null; type?: string | null }) => ({
          id: String(e.id),
          name: String(e.name ?? "Ort"),
          type: e.type != null ? String(e.type) : null,
        }))
        .sort((a: { name: string }, b: { name: string }) =>
          a.name.localeCompare(b.name, "de"),
        )
    : [];

  const locLoreRaw = (liveState as { current_location_lore_id?: string | null } | null)
    ?.current_location_lore_id;
  const locLoreId =
    locLoreRaw != null && String(locLoreRaw).length > 0 ? String(locLoreRaw) : null;

  let sessionLocationLoreReadable = false;
  if (locLoreId) {
    if (isGM) {
      sessionLocationLoreReadable = true;
    } else {
      const loreVis = await getVisibilityForCampaign(
        (session as any).campaign_id,
        "lore",
      );
      sessionLocationLoreReadable = loreVis[locLoreId] === true;
    }
  }

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
      sessionStatus={session.status}
      isGM={isGM}
      userId={user.id}
      initialLiveState={liveState || null}
      partyCharacters={partyCharacters}
      allCampaignNpcs={allCampaignNpcs || []}
      allCampaignFactions={allCampaignFactions}
      stageDeckNpcIds={stageDeckNpcIds}
      stageDeckFactionIds={stageDeckFactionIds}
      activeQuests={activeQuests || []}
      loreLocationOptions={loreLocationOptions}
      sessionLocationLoreReadable={sessionLocationLoreReadable}
    />
  );
}

