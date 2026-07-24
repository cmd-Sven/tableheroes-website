import { createClient } from "@/src/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { LiveSessionBoard } from "./LiveSessionBoard";
import { ensureSessionPrepLiveState } from "@/src/app/dashboard/campaigns/[id]/session-actions";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import { getVisibilityForCampaign } from "@/src/app/dashboard/campaigns/[id]/campaign-visibility-queries";
import { serializeForClient } from "@/src/lib/serialize-for-flight";
import { fetchAvatarDisplayMapForCampaign } from "@/src/lib/characters/fetch-avatar-display-map";
import { readGuestSessionCookie } from "@/src/lib/session-guest-auth";
import {
  loadGuestSessionContext,
  serializeGuestSessionPayload,
} from "@/src/app/session/load-guest-session";
import { absoluteUrl } from "@/src/lib/site-url";
import { SESSION_LIVE_STATE_SELECT } from "@/src/lib/session/live-state-columns";
import { loadSessionStageCatalog } from "@/src/app/session/load-session-stage-catalog";

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

function asDeckIds(value: unknown): string[] | null {
  if (value == null) return null;
  if (!Array.isArray(value)) return null;
  return value.map(String);
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

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("gm_id, owner_id, world_id, system")
    .eq("id", session.campaign_id)
    .single();

  const campaign = campaignRaw as {
    gm_id?: string | null;
    owner_id?: string | null;
    world_id?: string | null;
    system?: string | null;
  } | null;

  if (!campaign) {
    notFound();
  }

  if (["Completed", "Cancelled"].includes(session.status)) {
    redirect(`/dashboard/campaigns/${session.campaign_id}?tab=sessions&ended=1`);
  }

  const isGM = isCampaignGm(campaign, user.id);
  const forcePlayerView = modeParam === "player" && isGM;
  const viewAsGM = isGM && !forcePlayerView;

  if (session.status === "Scheduled" && !isGM) {
    redirect(
      `/dashboard/campaigns/${session.campaign_id}?tab=sessions&scheduled=1`,
    );
  }

  let { data: liveState } = await (supabase.from("session_live_states") as any)
    .select(SESSION_LIVE_STATE_SELECT)
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

  const campaignId = session.campaign_id;

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
  } else {
    // Nur Fallback wenn Tray-RPC fehlt/fehlschlägt — kein doppelter Roundtrip.
    const rpcRes = await (supabase as any).rpc("get_session_party_members", {
      p_session_id: sessionId,
    });

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

    if (partyCharacters.length === 0) {
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

  const stageDeckNpcIds = asDeckIds(session.stage_deck_npc_ids);
  const stageDeckFactionIds = asDeckIds(session.stage_deck_faction_ids);
  const stageDeckSceneMediaIds = asDeckIds(session.stage_deck_scene_media_ids);
  const stageDeckCreatureIds = asDeckIds(session.stage_deck_creature_ids);

  const catalog = await loadSessionStageCatalog({
    campaignId,
    worldId: campaign.world_id ?? null,
    viewAsGM,
    liveState: (liveState as Record<string, unknown> | null) ?? null,
    stageDeckNpcIds,
    stageDeckFactionIds,
    stageDeckSceneMediaIds,
    stageDeckCreatureIds,
  });

  const locLoreRaw = (liveState as { current_location_lore_id?: string | null } | null)
    ?.current_location_lore_id;
  const locLoreId =
    locLoreRaw != null && String(locLoreRaw).length > 0 ? String(locLoreRaw) : null;

  let sessionLocationLoreReadable = false;
  if (locLoreId) {
    if (viewAsGM) {
      sessionLocationLoreReadable = true;
    } else {
      const loreVis = await getVisibilityForCampaign(campaignId, "lore");
      sessionLocationLoreReadable = loreVis[locLoreId] === true;
    }
  }

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
    .eq("campaign_id", campaignId)
    .eq("status", "Active")
    .eq("is_revealed", true);

  const normalizedQuests = normalizeActiveQuests(activeQuests ?? []);

  const guestJoinUrl =
    viewAsGM && session.status === "Live" && session.guest_join_token
      ? absoluteUrl(`/session/join/${session.guest_join_token}`)
      : null;

  return (
    <LiveSessionBoard
      sessionId={sessionId}
      campaignId={campaignId}
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
      allCampaignNpcs={serializeForClient(catalog.allCampaignNpcs)}
      allCampaignCreatures={serializeForClient(catalog.allCampaignCreatures)}
      allCampaignFactions={serializeForClient(catalog.allCampaignFactions)}
      stageDeckNpcIds={
        stageDeckNpcIds != null ? serializeForClient(stageDeckNpcIds) : null
      }
      stageDeckFactionIds={
        stageDeckFactionIds != null
          ? serializeForClient(stageDeckFactionIds)
          : null
      }
      allSceneMedia={serializeForClient(catalog.allSceneMedia)}
      stageDeckSceneMediaIds={
        stageDeckSceneMediaIds != null
          ? serializeForClient(stageDeckSceneMediaIds)
          : null
      }
      stageDeckCreatureIds={
        stageDeckCreatureIds != null ? serializeForClient(stageDeckCreatureIds) : null
      }
      initialCreatureStates={serializeForClient(catalog.initialCreatureStates)}
      activeQuests={serializeForClient(normalizedQuests)}
      loreLocationOptions={serializeForClient(catalog.loreLocationOptions)}
      sessionLocationLoreReadable={sessionLocationLoreReadable}
      campaignShops={serializeForClient(catalog.campaignShops)}
      transcriptionMode={
        session.transcription_mode === "jitsi"
          ? "jitsi"
          : session.transcription_mode === "table"
            ? "table"
            : null
      }
      guestJoinUrl={guestJoinUrl}
      campaignSystem={campaign.system ?? null}
    />
  );
}
