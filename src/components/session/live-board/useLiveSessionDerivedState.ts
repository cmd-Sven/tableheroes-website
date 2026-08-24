/**
 * useLiveSessionDerivedState — Computed stage pools, party display, weather, and journal flags.
 */
"use client";

import { useEffect, useMemo } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useCombatStartFx } from "@/src/hooks/useCombatStartFx";
import { normalizeGuestSlots } from "@/src/lib/session-guest-slots";
import { getPlayerColorForClass } from "@/src/lib/session/class-player-color";
import { resolveSessionDayPhase } from "@/src/lib/session-day-phase";
import { sortNpcsByLocationPriority } from "@/src/lib/npc-stage-display";
import type { StageSceneMediaItem } from "@/src/components/session/StageSceneCard";
import { normalizePhysicallyPresentUserIds } from "./live-session-normalize";
import { getWeatherVisual } from "./live-session-weather";
import type {
  CampaignCreature,
  CampaignFaction,
  CampaignNpc,
  LiveState,
  PartyCharacter,
} from "./live-session-types";

type Params = {
  liveState: LiveState | null;
  partyCharacters: PartyCharacter[];
  userId: string;
  isGM: boolean;
  forcePlayerView: boolean;
  isPrepMode: boolean;
  prepTestCharacterId: string | null;
  campaignId: string;
  supabase: SupabaseClient;
  campaignNpcs: CampaignNpc[];
  campaignCreatures: CampaignCreature[];
  allCampaignFactions: CampaignFaction[];
  allSceneMedia: StageSceneMediaItem[];
  stageDeckNpcIds: string[] | null | undefined;
  stageDeckCreatureIds: string[] | null;
  stageDeckFactionIds: string[] | null | undefined;
  stageDeckSceneMediaIds: string[] | null;
  stageSearch: string;
  stageFactionSearch: string;
  setNpcReputationScores: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  sessionId: string;
};

export function useLiveSessionDerivedState({
  liveState,
  partyCharacters,
  userId,
  isGM,
  forcePlayerView,
  isPrepMode,
  prepTestCharacterId,
  campaignId,
  supabase,
  campaignNpcs,
  campaignCreatures,
  allCampaignFactions,
  allSceneMedia,
  stageDeckNpcIds,
  stageDeckCreatureIds,
  stageDeckFactionIds,
  stageDeckSceneMediaIds,
  stageSearch,
  stageFactionSearch,
  setNpcReputationScores,
  sessionId,
}: Params) {
  const dayPhase = resolveSessionDayPhase(liveState?.current_time);

  const canEditJournal =
    !forcePlayerView &&
    (isGM || (liveState?.scribe_id != null && liveState.scribe_id === userId));

  const systemLogs = liveState?.system_logs ?? [];

  const {
    active: combatStartFxActive,
    fxKey: combatStartFxKey,
    dismiss: dismissCombatStartFx,
  } = useCombatStartFx(liveState?.is_combat_mode && liveState?.combat_started);

  const handRaises = liveState?.hand_raises ?? [];
  const urgentHandRaise =
    isGM && !forcePlayerView ? handRaises.find((r) => r.urgent) ?? null : null;

  const physicallyPresentIdSet = new Set(
    normalizePhysicallyPresentUserIds(liveState?.physically_present_user_ids),
  );

  const dummyPlayerCountLive = Math.min(
    3,
    Math.max(0, Math.round(Number(liveState?.dummy_player_count ?? 0)) || 0),
  );

  const displayPartyCharacters = useMemo((): PartyCharacter[] => {
    const guestSlots = normalizeGuestSlots(liveState?.guest_slots);
    const dummies: PartyCharacter[] = [];
    for (let i = 1; i <= dummyPlayerCountLive; i += 1) {
      const guestSlot = guestSlots.find((slot) => slot.slot === i);
      dummies.push({
        id: `session-dummy-${i}`,
        name: guestSlot?.name ?? `Spieler ${i}`,
        class: "Gast",
        race: null,
        level: null,
        avatar_url: "/images/icon-empty.svg",
        playerUserId: null,
        rations_count: 0,
        starvation_days: 0,
        isSessionDummy: true,
        guestId: guestSlot?.guest_id ?? null,
      });
    }
    return [...partyCharacters, ...dummies];
  }, [partyCharacters, dummyPlayerCountLive, liveState?.guest_slots]);

  const playerColorByCharacterId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const pc of displayPartyCharacters) {
      map[pc.id] = getPlayerColorForClass(pc.class);
    }
    return map;
  }, [displayPartyCharacters]);

  const playerColorByUserId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const pc of displayPartyCharacters) {
      if (pc.playerUserId) {
        map[pc.playerUserId] = getPlayerColorForClass(pc.class);
      }
    }
    return map;
  }, [displayPartyCharacters]);

  const weatherVisual = getWeatherVisual(liveState);

  const currentPlayerCharacter = useMemo(() => {
    return partyCharacters.find((pc) => pc.playerUserId === userId) ?? null;
  }, [partyCharacters, userId]);

  const activityCharacter = useMemo(() => {
    if (currentPlayerCharacter) {
      return { id: currentPlayerCharacter.id, name: currentPlayerCharacter.name };
    }
    if (isPrepMode && isGM && !forcePlayerView) {
      const testId =
        prepTestCharacterId ??
        partyCharacters.find((pc) => !pc.isSessionDummy)?.id ??
        null;
      const pc = partyCharacters.find((p) => p.id === testId);
      if (pc) return { id: pc.id, name: pc.name };
    }
    return null;
  }, [
    currentPlayerCharacter,
    isPrepMode,
    isGM,
    forcePlayerView,
    prepTestCharacterId,
    partyCharacters,
  ]);

  const activeNpcIds = useMemo(() => {
    return new Set((liveState?.visible_npc_ids || []).map(String));
  }, [liveState?.visible_npc_ids]);

  const activeNpcs = useMemo(
    () => campaignNpcs.filter((npc) => activeNpcIds.has(String(npc.id))),
    [campaignNpcs, activeNpcIds],
  );

  const sortedActiveNpcs = useMemo(
    () =>
      sortNpcsByLocationPriority(
        activeNpcs,
        liveState?.current_location_lore_id ?? null,
      ),
    [activeNpcs, liveState?.current_location_lore_id],
  );

  const activeCreatureIds = useMemo(() => {
    return new Set((liveState?.visible_creature_ids || []).map(String));
  }, [liveState?.visible_creature_ids]);

  const activeCreatures = useMemo(
    () => campaignCreatures.filter((c) => activeCreatureIds.has(String(c.id))),
    [campaignCreatures, activeCreatureIds],
  );

  const creatureStagePool = useMemo(() => {
    if (stageDeckCreatureIds == null) return campaignCreatures;
    const deck = new Set(stageDeckCreatureIds.map(String));
    if (deck.size === 0) return campaignCreatures;
    return campaignCreatures.filter((c) => deck.has(String(c.id)));
  }, [campaignCreatures, stageDeckCreatureIds]);

  const gmBeastSearchRows = useMemo(
    () =>
      creatureStagePool.map((c) => ({
        id: String(c.id),
        name: c.name,
        creature_type: c.creature_type,
        image_url: c.image_url,
        is_revealed: c.is_revealed,
      })),
    [creatureStagePool],
  );

  const gmNpcSearchRows = useMemo(
    () =>
      campaignNpcs.map((n) => ({
        id: String(n.id),
        name: n.name,
        title: n.title ?? null,
        image_url: n.image_url ?? null,
        is_revealed: n.is_revealed,
        current_location_id: n.current_location_id ?? null,
        home_location_id: n.home_location_id ?? null,
      })),
    [campaignNpcs],
  );

  useEffect(() => {
    if (activeNpcs.length === 0) {
      setNpcReputationScores({});
      return;
    }

    const npcIds = activeNpcs.map((npc) => String(npc.id));
    void (async () => {
      const { data, error } = await ((supabase as any).from(
        "campaign_npc_reputation",
      ) as any)
        .select("npc_id, reputation_score")
        .eq("campaign_id", campaignId)
        .in("npc_id", npcIds);

      if (error) {
        console.error("[LiveSessionBoard] load npc reputation:", error);
        return;
      }

      const next: Record<string, number> = {};
      for (const row of (data ?? []) as Array<Record<string, unknown>>) {
        next[String(row.npc_id)] = Number(row.reputation_score ?? 0);
      }
      setNpcReputationScores(next);
    })();
  }, [activeNpcs, campaignId, supabase, setNpcReputationScores]);

  const npcStagePool = useMemo(() => {
    if (stageDeckNpcIds == null) {
      return campaignNpcs.map((n) => ({ ...n, id: String(n.id) }));
    }
    const deck = stageDeckNpcIds.map((id) => String(id)).filter(Boolean);
    if (deck.length === 0) {
      return campaignNpcs.map((n) => ({ ...n, id: String(n.id) }));
    }
    const allowed = new Set(deck);
    return campaignNpcs.filter((n) => allowed.has(String(n.id)));
  }, [campaignNpcs, stageDeckNpcIds]);

  const factionStagePool = useMemo(() => {
    if (stageDeckFactionIds == null) {
      return allCampaignFactions.map((f) => ({ ...f, id: String(f.id) }));
    }
    const deck = stageDeckFactionIds.map((id) => String(id)).filter(Boolean);
    if (deck.length === 0) {
      return allCampaignFactions.map((f) => ({ ...f, id: String(f.id) }));
    }
    const allowed = new Set(deck);
    return allCampaignFactions.filter((f) => allowed.has(String(f.id)));
  }, [allCampaignFactions, stageDeckFactionIds]);

  const sceneStagePool = useMemo(() => {
    if (stageDeckSceneMediaIds == null) return allSceneMedia;
    const deck = stageDeckSceneMediaIds.map((id) => String(id)).filter(Boolean);
    if (deck.length === 0) return allSceneMedia;
    const allowed = new Set(deck);
    return allSceneMedia.filter((s) => allowed.has(String(s.id)));
  }, [allSceneMedia, stageDeckSceneMediaIds]);

  const activeSceneMedia = useMemo(() => {
    const id = liveState?.active_scene_media_id;
    if (!id) return null;
    return allSceneMedia.find((s) => String(s.id) === String(id)) ?? null;
  }, [liveState?.active_scene_media_id, allSceneMedia]);

  const inHandScenes = useMemo(
    () =>
      sceneStagePool.filter(
        (s) => String(s.id) !== String(liveState?.active_scene_media_id ?? ""),
      ),
    [sceneStagePool, liveState?.active_scene_media_id],
  );

  const activeFactionIds = useMemo(() => {
    return new Set((liveState?.visible_faction_ids || []).map(String));
  }, [liveState?.visible_faction_ids]);

  const activeFactions = useMemo(
    () => allCampaignFactions.filter((f) => activeFactionIds.has(String(f.id))),
    [allCampaignFactions, activeFactionIds],
  );

  const stageRosterPreview = useMemo(() => {
    const npcs = liveState?.loot_hide_npcs
      ? []
      : sortedActiveNpcs.map((n) => ({
          id: `npc-${n.id}`,
          name: n.name,
          imageUrl: n.image_url,
        }));
    const creatures = activeCreatures.map((c) => ({
      id: `creature-${c.id}`,
      name: c.name,
      imageUrl: c.image_url,
    }));
    const factions = activeFactions.map((f) => ({
      id: `faction-${f.id}`,
      name: f.name,
      imageUrl: f.image_url ?? f.banner_url ?? null,
    }));
    return [...npcs, ...creatures, ...factions];
  }, [
    liveState?.loot_hide_npcs,
    sortedActiveNpcs,
    activeCreatures,
    activeFactions,
  ]);

  const stageHasDeckContent =
    sortedActiveNpcs.length > 0 ||
    activeFactions.length > 0 ||
    Boolean(liveState?.current_loot_id);

  const filteredNpcsForStageManager = useMemo(() => {
    const term = stageSearch.trim().toLowerCase();
    const base = !term
      ? npcStagePool
      : npcStagePool.filter((npc) =>
          `${npc.name} ${npc.title || ""}`.toLowerCase().includes(term),
        );
    return sortNpcsByLocationPriority(
      base,
      liveState?.current_location_lore_id ?? null,
    );
  }, [npcStagePool, stageSearch, liveState?.current_location_lore_id]);

  const filteredFactionsForStageManager = useMemo(() => {
    const term = stageFactionSearch.trim().toLowerCase();
    if (!term) return factionStagePool;
    return factionStagePool.filter((f) =>
      `${f.name} ${f.type || ""}`.toLowerCase().includes(term),
    );
  }, [factionStagePool, stageFactionSearch]);

  const inHandNpcs = useMemo(
    () =>
      sortNpcsByLocationPriority(
        npcStagePool.filter((n) => !activeNpcIds.has(String(n.id))),
        liveState?.current_location_lore_id ?? null,
      ),
    [npcStagePool, activeNpcIds, liveState?.current_location_lore_id],
  );

  const inHandFactions = useMemo(
    () => factionStagePool.filter((f) => !activeFactionIds.has(String(f.id))),
    [factionStagePool, activeFactionIds],
  );

  const showGmDeckHand =
    isGM &&
    (inHandNpcs.length > 0 || inHandFactions.length > 0 || inHandScenes.length > 0);

  const battlemapTrayNpcs = useMemo(() => npcStagePool, [npcStagePool]);
  const battlemapTrayCreatures = useMemo(() => creatureStagePool, [creatureStagePool]);
  const battlemapTrayScenes = useMemo(() => inHandScenes, [inHandScenes]);

  const stagePrepHref = `/dashboard/campaigns/${campaignId}/sessions/${sessionId}/stage-prep`;

  return {
    dayPhase,
    canEditJournal,
    systemLogs,
    combatStartFxActive,
    combatStartFxKey,
    dismissCombatStartFx,
    handRaises,
    urgentHandRaise,
    physicallyPresentIdSet,
    dummyPlayerCountLive,
    displayPartyCharacters,
    playerColorByCharacterId,
    playerColorByUserId,
    weatherVisual,
    currentPlayerCharacter,
    activityCharacter,
    activeNpcIds,
    activeNpcs,
    sortedActiveNpcs,
    activeCreatureIds,
    activeCreatures,
    creatureStagePool,
    gmBeastSearchRows,
    gmNpcSearchRows,
    npcStagePool,
    factionStagePool,
    sceneStagePool,
    activeSceneMedia,
    inHandScenes,
    activeFactionIds,
    activeFactions,
    stageRosterPreview,
    stageHasDeckContent,
    filteredNpcsForStageManager,
    filteredFactionsForStageManager,
    inHandNpcs,
    inHandFactions,
    showGmDeckHand,
    battlemapTrayNpcs,
    battlemapTrayCreatures,
    battlemapTrayScenes,
    stagePrepHref,
  };
}
