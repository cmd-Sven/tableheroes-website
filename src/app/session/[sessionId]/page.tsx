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
import { serializeForClient } from "@/src/lib/serialize-for-flight";
import { fetchAvatarDisplayMapForCampaign } from "@/src/lib/characters/fetch-avatar-display-map";
import { getCampaignShops } from "@/src/app/dashboard/campaigns/[id]/shop-queries";
import type { LiveCampaignShopOption } from "./StageNpcShopControls";
import { readGuestSessionCookie } from "@/src/lib/session-guest-auth";
import {
  loadGuestSessionContext,
  serializeGuestSessionPayload,
} from "@/src/app/session/load-guest-session";
import { absoluteUrl } from "@/src/lib/site-url";
import { getCampaignSceneMedia } from "@/src/app/dashboard/campaigns/[id]/scene-media-actions";
import { getBestariumCreaturesForCampaign } from "@/src/app/dashboard/campaigns/[id]/bestarium-queries";
import { getCampaignCreatureStates } from "@/src/app/dashboard/campaigns/[id]/creature-state-actions";
import { resolveBestariumImageUrl } from "@/src/lib/bestarium-image";

function normalizeQuestRelation(
  v: unknown,
): { id: string; name: string | null } | null {
  if (v == null) return null;
  if (Array.isArray(v)) {
    return normalizeQuestRelation(v[0]);
  }
  if (typeof v === "object" && v !== null && "id" in v) {
    const o = v as Record<string, unknown>;
    return {
      id: String(o.id),
      name: o.name != null ? String(o.name) : null,
    };
  }
  return null;
}

function normalizeActiveQuests(rows: unknown[]) {
  return (rows || []).map((raw) => {
    const q = raw as Record<string, unknown>;
    return {
      id: String(q.id),
      title: String(q.title ?? ""),
      description: q.description != null ? String(q.description) : null,
      rewards:
        typeof q.rewards === "string"
          ? q.rewards
          : q.rewards != null
            ? JSON.stringify(q.rewards)
            : null,
      type: q.type != null ? String(q.type) : null,
      quest_giver: normalizeQuestRelation(q.quest_giver),
      location: normalizeQuestRelation(q.location),
    };
  });
}

type Props = {
  params: Promise<{ sessionId: string }>;
  searchParams?: Promise<{ mode?: string | string[] }>;
};

export default async function SessionPage({ params, searchParams }: Props) {
  const { sessionId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const modeParam = Array.isArray(resolvedSearchParams.mode)
    ? resolvedSearchParams.mode[0]
    : resolvedSearchParams.mode;

  // Basic UUID validation (if you use UUIDs for sessions)
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(sessionId)) {
    notFound();
  }

  const guestCookie = await readGuestSessionCookie();
  if (guestCookie?.sessionId === sessionId) {
    const guestCtx = await loadGuestSessionContext(sessionId, guestCookie);
    if (!guestCtx) notFound();
    const payload = serializeGuestSessionPayload(guestCtx);
    return (
      <LiveSessionBoard
        {...(payload as any)}
        isGM={false}
        isGuest
        forcePlayerView
        loreLocationOptions={[]}
        campaignShops={[]}
      />
    );
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
    .select("id, campaign_id, status, stage_deck_npc_ids, stage_deck_faction_ids, stage_deck_scene_media_ids, stage_deck_creature_ids, transcription_mode, guest_join_token")
    .eq("id", sessionId)
    .single();

  const session = sessionRaw as {
    id: string;
    campaign_id: string;
    status: string;
    stage_deck_npc_ids?: string[] | null;
    stage_deck_faction_ids?: string[] | null;
    stage_deck_scene_media_ids?: string[] | null;
    stage_deck_creature_ids?: string[] | null;
    transcription_mode?: string | null;
    guest_join_token?: string | null;
  } | null;

  if (sessionError || !session) {
    notFound();
  }

  // 2. Load Campaign to determine GM
  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("gm_id, owner_id, world_id")
    .eq("id", (session as any).campaign_id)
    .single();

  const campaign = campaignRaw as {
    gm_id?: string | null;
    owner_id?: string | null;
    world_id?: string | null;
  } | null;

  if (!campaign) {
    notFound();
  }

  // Beendete oder abgesagte Sessions können nicht mehr betreten werden
  if (["Completed", "Cancelled"].includes(session.status)) {
    redirect(`/dashboard/campaigns/${(session as any).campaign_id}?tab=sessions&ended=1`);
  }

  const isGM = isCampaignGm(campaign, user.id);
  const forcePlayerView = modeParam === "player" && isGM;
  const viewAsGM = isGM && !forcePlayerView;

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
    !["Completed", "Cancelled"].includes(session.status)
  ) {
    try {
      const ensured = await ensureSessionPrepLiveState(sessionId);
      if (ensured) {
        liveState = ensured as typeof liveState;
      }
    } catch (e) {
      console.error("[session page] ensureSessionPrepLiveState:", e);
    }
  }

  // 4. Party: Tray-RPC → Members-RPC → Fallback (Survival-Felder in RPCs / einer Query)
  const campaignId = (session as { campaign_id: string }).campaign_id;

  function survivalFromPartyRow(c: Record<string, unknown>): {
    rations_count: number;
    starvation_days: number;
  } {
    const rRaw = (c as { rations_count?: unknown }).rations_count;
    const sRaw = (c as { starvation_days?: unknown }).starvation_days;
    const rations_count =
      rRaw === undefined || rRaw === null
        ? 0
        : Math.min(10, Math.max(0, Math.round(Number(rRaw))));
    const starvation_days =
      sRaw === undefined || sRaw === null
        ? 0
        : Math.max(0, Math.round(Number(sRaw)));
    return { rations_count, starvation_days };
  }

  type PartyChar = {
    id: string;
    name: string;
    class: string | null;
    race: string | null;
    level: number | null;
    avatar_url: string | null;
    avatar_display?: unknown | null;
    playerUserId?: string | null;
    rations_count: number;
    starvation_days: number;
  };

  let partyCharacters: PartyChar[] = [];

  const trayRes = await (supabase as any).rpc("get_session_party_tray", {
    p_session_id: sessionId,
  });

  const trayOk = !trayRes.error && Array.isArray(trayRes.data);

  if (trayOk) {
    partyCharacters = (trayRes.data as Record<string, unknown>[]).map((c) => ({
      id: String(c.id),
      name: String(c.char_name ?? ""),
      class: c.char_class != null ? String(c.char_class) : null,
      race: c.race != null ? String(c.race) : null,
      level:
        typeof c.level === "number" && Number.isFinite(c.level)
          ? c.level
          : null,
      avatar_url: c.avatar_url != null ? String(c.avatar_url) : null,
      avatar_display: null,
      playerUserId:
        c.member_user_id != null ? String(c.member_user_id) : null,
      ...survivalFromPartyRow(c as Record<string, unknown>),
    }));
  }

  const rpcRes = await (supabase as any).rpc("get_session_party_members", {
    p_session_id: sessionId,
  });

  if (!trayOk) {
    if (!rpcRes.error && Array.isArray(rpcRes.data)) {
      partyCharacters = (rpcRes.data as Record<string, unknown>[]).map(
        (c) => ({
          id: String(c.id),
          name: String(c.char_name ?? ""),
          class: c.char_class != null ? String(c.char_class) : null,
          race: c.race != null ? String(c.race) : null,
          level:
            typeof c.level === "number" && Number.isFinite(c.level)
              ? c.level
              : null,
          avatar_url: c.avatar_url != null ? String(c.avatar_url) : null,
          avatar_display: null,
          ...survivalFromPartyRow(c as Record<string, unknown>),
        }),
      );
    }
  }

  if (!trayOk && partyCharacters.length === 0) {
    const { data: memberPartyRows } = await (supabase.from("campaign_members") as any)
      .select("character_id, user_id")
      .eq("campaign_id", campaignId)
      .in("status", ["Approved", "Active"])
      .not("character_id", "is", null);

    const characterIds = [
      ...new Set(
        ((memberPartyRows as { character_id?: string | null }[] | null) || [])
          .map((r) => r.character_id)
          .filter((id): id is string => !!id),
      ),
    ];

    if (characterIds.length > 0) {
      const { data: charRows } = await (supabase.from("characters") as any)
        .select("id, name, class, race, level, avatar_url, rations_count, starvation_days")
        .in("id", characterIds)
        .eq("campaign_id", campaignId);

      const byId = new Map(
        ((charRows as Record<string, unknown>[] | null) || []).map((c) => [
          String(c.id),
          c,
        ]),
      );

      const charToPlayer = new Map<string, string>();
      for (const r of (memberPartyRows as { character_id?: string | null; user_id?: string | null }[] | null) || []) {
        if (r.character_id && r.user_id) {
          charToPlayer.set(String(r.character_id), String(r.user_id));
        }
      }

      partyCharacters = characterIds
        .map((cid) => byId.get(cid))
        .filter(
          (c): c is Record<string, unknown> =>
            c != null && typeof c === "object",
        )
        .map((c) => ({
          id: String(c.id),
          name: String(c.name ?? ""),
          class: c.class != null ? String(c.class) : null,
          race: c.race != null ? String(c.race) : null,
          level:
            typeof c.level === "number" && Number.isFinite(c.level)
              ? c.level
              : null,
          avatar_url: c.avatar_url != null ? String(c.avatar_url) : null,
          avatar_display: null,
          playerUserId: charToPlayer.get(String(c.id)) ?? null,
          ...survivalFromPartyRow(c as Record<string, unknown>),
        }));
    }
  }

  if (partyCharacters.length > 0) {
    const dispMap = await fetchAvatarDisplayMapForCampaign(
      supabase,
      campaignId,
      partyCharacters.map((p) => p.id),
    );
    partyCharacters = partyCharacters.map((pc) => ({
      ...pc,
      avatar_display: dispMap.get(pc.id) ?? pc.avatar_display ?? null,
    }));
  }

  // 5. Load campaign NPCs (Sichtbarkeit aus campaign_visibility)
  const npcsFromCampaign = await getNPCs(
    (session as any).campaign_id,
    user.id,
    viewAsGM
  );
  const allCampaignNpcs = npcsFromCampaign.map((npc: any) => ({
    id: String(npc.id),
    name: String(npc.name ?? ""),
    title: npc.title != null ? String(npc.title) : null,
    description: npc.description != null ? String(npc.description) : null,
    image_url: npc.image_url != null ? String(npc.image_url) : null,
    is_revealed: !!npc.is_revealed,
    is_merchant: !!npc.is_merchant,
    shop_id: npc.shop_id != null ? String(npc.shop_id) : null,
    current_location_id:
      npc.current_location_id != null ? String(npc.current_location_id) : null,
    home_location_id:
      npc.home_location_id != null ? String(npc.home_location_id) : null,
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
  if (!viewAsGM) {
    allCampaignFactions = allCampaignFactions.filter((f: { is_revealed: boolean }) => f.is_revealed);
  }

  const stageDeckNpcIds =
    session?.stage_deck_npc_ids != null && Array.isArray(session.stage_deck_npc_ids)
      ? session.stage_deck_npc_ids.map(String)
      : null;
  const stageDeckFactionIds =
    session?.stage_deck_faction_ids != null && Array.isArray(session.stage_deck_faction_ids)
      ? session.stage_deck_faction_ids.map(String)
      : null;
  const stageDeckSceneMediaIds =
    session?.stage_deck_scene_media_ids != null &&
    Array.isArray(session.stage_deck_scene_media_ids)
      ? session.stage_deck_scene_media_ids.map(String)
      : null;
  const stageDeckCreatureIds =
    session?.stage_deck_creature_ids != null &&
    Array.isArray(session.stage_deck_creature_ids)
      ? session.stage_deck_creature_ids.map(String)
      : null;

  const bestariumPayload = viewAsGM
    ? await getBestariumCreaturesForCampaign((session as any).campaign_id, true)
    : { gm: [], player: [] };
  const creatureStates = await getCampaignCreatureStates((session as any).campaign_id);

  let allCampaignCreatures = (bestariumPayload.gm || []).map((c: any) => ({
    id: String(c.id),
    name: String(c.name ?? ""),
    creature_type: c.creature_type != null ? String(c.creature_type) : null,
    image_url: c.image_url != null ? resolveBestariumImageUrl(String(c.image_url)) : null,
    physical_description:
      c.physical_description != null ? String(c.physical_description) : null,
    challenge_rating:
      typeof c.challenge_rating === "number" ? c.challenge_rating : null,
    known_loot: c.known_loot != null ? String(c.known_loot) : null,
    is_revealed: !!c.is_revealed,
  }));
  if (!viewAsGM) {
    allCampaignCreatures = allCampaignCreatures.filter((c) => c.is_revealed);
  }

  const sceneMediaRows = await getCampaignSceneMedia((session as any).campaign_id).catch(
    () => [],
  );
  const allSceneMedia = sceneMediaRows.map((s) => ({
    id: String(s.id),
    title: String(s.title),
    image_url: String(s.image_url),
    category: String(s.category),
    player_notes: s.player_notes,
    image_is_ai_generated: s.image_is_ai_generated === true,
  }));

  const loreLocationOptions = viewAsGM
    ? (await getLoreEntries((session as any).campaign_id))
        .filter((e: { type?: string | null }) => isLocationType(String(e.type ?? "")))
        .map((e: {
          id: string;
          name?: string | null;
          type?: string | null;
          image_url?: string | null;
          default_image_url?: string | null;
        }) => ({
          id: String(e.id),
          name: String(e.name ?? "Ort"),
          type: e.type != null ? String(e.type) : null,
          image_url: e.image_url != null ? String(e.image_url) : null,
          default_image_url:
            e.default_image_url != null ? String(e.default_image_url) : null,
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
    if (viewAsGM) {
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

  const normalizedQuests = normalizeActiveQuests(activeQuests ?? []);

  let campaignShopsForLive: LiveCampaignShopOption[] = [];
  if (viewAsGM) {
    const { shops } = await getCampaignShops((session as any).campaign_id);
    campaignShopsForLive = shops.map((shop) => ({
      id: shop.id,
      name: shop.name,
      shop_mode: shop.shop_mode,
      archetype_key: shop.archetype_key,
    }));
  }

  const guestJoinUrl =
    viewAsGM && session.status === "Live" && session.guest_join_token
      ? absoluteUrl(`/session/join/${session.guest_join_token}`)
      : null;

  return (
    <LiveSessionBoard
      sessionId={sessionId}
      campaignId={(session as any).campaign_id as string}
      worldId={campaign.world_id ?? null}
      sessionStatus={session.status}
      isGM={isGM}
      forcePlayerView={forcePlayerView}
      userId={user.id}
      initialLiveState={
        liveState
          ? ({
              ...(serializeForClient(liveState) as Record<string, unknown>),
              session_id: sessionId,
            } as any)
          : null
      }
      partyCharacters={serializeForClient(partyCharacters)}
      allCampaignNpcs={serializeForClient(allCampaignNpcs || [])}
      allCampaignCreatures={serializeForClient(allCampaignCreatures)}
      allCampaignFactions={serializeForClient(allCampaignFactions)}
      stageDeckNpcIds={
        stageDeckNpcIds != null ? serializeForClient(stageDeckNpcIds) : null
      }
      stageDeckFactionIds={
        stageDeckFactionIds != null
          ? serializeForClient(stageDeckFactionIds)
          : null
      }
      allSceneMedia={serializeForClient(allSceneMedia)}
      stageDeckSceneMediaIds={
        stageDeckSceneMediaIds != null
          ? serializeForClient(stageDeckSceneMediaIds)
          : null
      }
      stageDeckCreatureIds={
        stageDeckCreatureIds != null ? serializeForClient(stageDeckCreatureIds) : null
      }
      initialCreatureStates={serializeForClient(creatureStates)}
      activeQuests={serializeForClient(normalizedQuests)}
      loreLocationOptions={serializeForClient(loreLocationOptions)}
      sessionLocationLoreReadable={sessionLocationLoreReadable}
      campaignShops={serializeForClient(campaignShopsForLive)}
      transcriptionMode={
        session.transcription_mode === "jitsi"
          ? "jitsi"
          : session.transcription_mode === "table"
            ? "table"
            : null
      }
      guestJoinUrl={guestJoinUrl}
    />
  );
}

