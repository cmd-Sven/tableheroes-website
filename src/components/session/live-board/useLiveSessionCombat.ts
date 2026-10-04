/**
 * useLiveSessionCombat — Initiative tracking, turn advance, and battlemap seed for combat mode.
 */
"use client";

import {
  type DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  compareCombatHudOrder,
  hasRolledCombatInitiative,
  parseInitiativeLabel,
  resolveActiveCombatTurnHighlight,
} from "@/src/lib/combat-initiative";
import {
  advanceCombatTurn,
  rollCombatInitiative,
} from "@/src/lib/actions/combat-initiative-actions";
import type { SessionBattlemapToken } from "@/src/lib/session/battlemap-types";
import { normalizePhysicallyPresentUserIds } from "./live-session-normalize";
import {
  normalizeCombatParticipants,
  buildNpcCombatToken,
  explicitInitiativeDisplay,
  formatMonsterMarkerName,
  isCombatTokenUsed,
  presentStagePlayerTokens,
} from "./live-session-combat-utils";
import type {
  CampaignNpc,
  CombatParticipant,
  CombatTokenPayload,
  LiveState,
  PartyCharacter,
} from "./live-session-types";

type Params = {
  sessionId: string;
  isGuest: boolean;
  isGM: boolean;
  supabase: SupabaseClient;
  liveState: LiveState | null;
  liveStateRef: React.MutableRefObject<LiveState | null>;
  setLiveState: React.Dispatch<React.SetStateAction<LiveState | null>>;
  partyCharacters: PartyCharacter[];
  campaignNpcs: CampaignNpc[];
  sortedActiveNpcs: CampaignNpc[];
  battlemapTokens: SessionBattlemapToken[];
  /** false = Hauptbühne (physischer Tisch), Initiative ohne Karten-Tokens. */
  battlemapActive: boolean;
  presentUserIds: Set<string>;
  /** Party inkl. Platzhalter-Sitze, wie in der Heldenleiste. */
  stageParty: PartyCharacter[];
  updateLiveState: (patch: Partial<LiveState>, baseOverride?: LiveState) => void;
  writeSystemLog: (type: string, text: string) => void;
  pendingInitiativeToastRef: React.MutableRefObject<{
    participantId: string;
    display: string;
  } | null>;
  setRollingInitiativeId: React.Dispatch<React.SetStateAction<string | null>>;
};

export function useLiveSessionCombat({
  sessionId,
  isGuest,
  isGM,
  supabase,
  liveState,
  liveStateRef,
  setLiveState,
  partyCharacters,
  campaignNpcs,
  sortedActiveNpcs,
  battlemapTokens,
  battlemapActive,
  presentUserIds,
  stageParty,
  updateLiveState,
  writeSystemLog,
  pendingInitiativeToastRef,
  setRollingInitiativeId,
}: Params) {
  const [combatParticipants, setCombatParticipants] = useState<CombatParticipant[]>([]);
  const combatParticipantsLoadGenRef = useRef(0);
  const stageOpChainRef = useRef<Promise<void>>(Promise.resolve());
  const stagePresenceGenRef = useRef(0);
  const stagePresenceAppliedRef = useRef<string | null>(null);
  const stagePartyRef = useRef(stageParty);
  const presentUserIdsRef = useRef(presentUserIds);
  const battlemapActiveRef = useRef(battlemapActive);
  stagePartyRef.current = stageParty;
  presentUserIdsRef.current = presentUserIds;
  battlemapActiveRef.current = battlemapActive;

  const presentKey = useMemo(() => {
    const online = Array.from(presentUserIds).sort().join(",");
    const physical = [...(liveState?.physically_present_user_ids ?? [])]
      .map(String)
      .sort()
      .join(",");
    const party = stageParty
      .map(
        (pc) =>
          `${pc.id}\t${pc.name}\t${pc.playerUserId ?? ""}\t${pc.isSessionDummy ? "1" : "0"}`,
      )
      .join("\n");
    return `${online}|${physical}|${party}`;
  }, [presentUserIds, liveState?.physically_present_user_ids, stageParty]);

  function enqueueStageOp(op: () => Promise<void>): Promise<void> {
    const run = stageOpChainRef.current.then(op, op);
    stageOpChainRef.current = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  function stagePresentPayloads(): CombatTokenPayload[] {
    const physical = new Set(
      normalizePhysicallyPresentUserIds(
        liveStateRef.current?.physically_present_user_ids,
      ),
    );
    return presentStagePlayerTokens(
      stagePartyRef.current,
      presentUserIdsRef.current,
      physical,
    );
  }

  useEffect(() => {
    if (isGuest) return;
    let cancelled = false;

    async function loadCombatParticipants() {
      const gen = ++combatParticipantsLoadGenRef.current;
      const { data, error } = await ((supabase as any).from("combat_participants") as any)
        .select("*")
        .eq("session_id", sessionId)
        .eq("is_active", true);

      if (cancelled || gen !== combatParticipantsLoadGenRef.current) return;
      if (!error) {
        setCombatParticipants(normalizeCombatParticipants(data ?? []));
      }
    }

    void loadCombatParticipants();

    const channel = supabase
      .channel(`session_combat_${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "combat_participants",
          filter: `session_id=eq.${sessionId}`,
        },
        () => void loadCombatParticipants(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      combatParticipantsLoadGenRef.current += 1;
      supabase.removeChannel(channel);
    };
  }, [sessionId, supabase]);

  useEffect(() => {
    if (isGuest || !isGM || battlemapActive) return;
    if (!liveState?.is_combat_mode || liveState.combat_started) {
      stagePresenceAppliedRef.current = null;
      return;
    }
    const desiredKey = stagePresentPayloads()
      .map((token) => token.name)
      .join("\n");
    if (stagePresenceAppliedRef.current === desiredKey) return;
    const gen = ++stagePresenceGenRef.current;
    void enqueueStageOp(async () => {
      if (gen !== stagePresenceGenRef.current) return;
      if (battlemapActiveRef.current) return;
      const live = liveStateRef.current;
      if (!live?.is_combat_mode || live.combat_started) return;
      await addMissingStagePlayers();
      stagePresenceAppliedRef.current = desiredKey;
    });
  }, [isGuest, isGM, battlemapActive, liveState?.is_combat_mode, liveState?.combat_started, presentKey]);

  const sortedCombatParticipants = useMemo(
    () =>
      [...combatParticipants]
        .filter((participant) => participant.is_active)
        .sort(compareCombatHudOrder),
    [combatParticipants],
  );
  const combatStarted = Boolean(liveState?.is_combat_mode && liveState?.combat_started);
  const activeCombatParticipant =
    combatStarted && sortedCombatParticipants.length > 0
      ? sortedCombatParticipants[
          Math.min(
            Math.max(0, Number(liveState?.current_turn_index ?? 0) || 0),
            sortedCombatParticipants.length - 1,
          )
        ]
      : null;
  const activeTurnHighlight = useMemo(
    () =>
      combatStarted
        ? resolveActiveCombatTurnHighlight(
            activeCombatParticipant,
            partyCharacters,
            battlemapTokens,
          )
        : null,
    [
      combatStarted,
      activeCombatParticipant,
      partyCharacters,
      battlemapTokens,
    ],
  );
  const combatParticipantNames = useMemo(
    () => new Set(combatParticipants.filter((p) => p.is_active).map((p) => p.name)),
    [combatParticipants],
  );
  const combatParticipantNpcIds = useMemo(
    () =>
      new Set(
        combatParticipants
          .filter((p) => p.is_active && p.npc_id)
          .map((p) => String(p.npc_id)),
      ),
    [combatParticipants],
  );
  const combatPlayerTokens = useMemo<CombatTokenPayload[]>(
    () =>
      partyCharacters
        .filter((pc) => !pc.isSessionDummy)
        .map((pc) => ({
          type: "player",
          name: pc.name,
          image_url: pc.avatar_url,
        })),
    [partyCharacters],
  );
  const combatMonsterTokens = useMemo<CombatTokenPayload[]>(
    () =>
      Array.from({ length: 10 }).map((_, index) => ({
        type: "monster",
        name: `Monster ${index + 1}`,
        image_url: null,
      })),
    [],
  );
  const combatNpcTokens = useMemo<CombatTokenPayload[]>(
    () => sortedActiveNpcs.map((npc) => buildNpcCombatToken(npc)),
    [sortedActiveNpcs],
  );

  async function addCombatToken(token: CombatTokenPayload) {
    if (!isGM) return;
    if (isCombatTokenUsed(token, combatParticipantNames, combatParticipantNpcIds)) return;
    const { error } = await ((supabase as any).from("combat_participants") as any).insert({
      session_id: sessionId,
      name: token.name,
      type: token.type,
      npc_id: token.npc_id ?? null,
      side: token.side ?? null,
      initiative_value: 0,
      initiative_label: null,
      sort_order: combatParticipants.length,
      image_url: token.image_url,
      is_active: true,
      conditions: [],
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${token.name} nimmt am Kampf teil.`);
  }

  function battlemapTokenToCombatPayload(
    token: SessionBattlemapToken,
  ): CombatTokenPayload | null {
    // Party-/PC-Tokens: character_id zählt — auch wenn der Tray-Eintrag fehlt (Label-Fallback).
    if (token.character_id) {
      const pc = partyCharacters.find((c) => c.id === token.character_id);
      if (pc?.isSessionDummy) return null;
      const name = (pc?.name || token.label || "").trim();
      if (!name) return null;
      return {
        type: "player",
        name,
        image_url: token.image_url || pc?.avatar_url || null,
      };
    }
    if (token.npc_id) {
      const npc =
        campaignNpcs.find((n) => String(n.id) === String(token.npc_id)) ?? null;
      return {
        type: "npc",
        name: token.label || npc?.name || "NPC",
        image_url: token.image_url || npc?.image_url || null,
        npc_id: String(token.npc_id),
        side: token.token_side === "hostile" ? "nemesis" : token.token_side === "friendly" || token.token_side === "party" ? "friend" : null,
      };
    }
    const label = (token.label || "Kreatur").trim();
    if (!label) return null;
    return {
      type: "monster",
      name: label,
      image_url: token.image_url,
      side: token.token_side === "hostile" ? "nemesis" : null,
    };
  }

  async function insertCombatRows(
    rows: ReturnType<typeof participantInsertRow>[],
  ): Promise<CombatParticipant[] | null> {
    const { data, error } = await ((supabase as any).from("combat_participants") as any)
      .insert(rows)
      .select("*");
    if (error) {
      toast.error(error.message);
      return null;
    }
    return normalizeCombatParticipants(data ?? []);
  }

  function participantInsertRow(
    token: CombatTokenPayload,
    sortOrder: number,
    initiativeLabel: string | null,
  ) {
    const parsed = initiativeLabel ? parseInitiativeLabel(initiativeLabel) : null;
    return {
      session_id: sessionId,
      name: token.name,
      type: token.type,
      npc_id: token.npc_id ?? null,
      side: token.side ?? null,
      initiative_value: parsed?.base ?? 0,
      initiative_label: parsed?.display ?? null,
      sort_order: sortOrder,
      image_url: token.image_url,
      is_active: true,
      conditions: [] as string[],
    };
  }

  async function addMissingStagePlayers() {
    const desired = stagePresentPayloads();
    if (desired.length === 0) return;
    const { data, error } = await ((supabase as any).from("combat_participants") as any)
      .select("id, name, type, is_active")
      .eq("session_id", sessionId)
      .eq("is_active", true);
    if (error) return;
    const active = Array.isArray(data) ? data : [];
    const taken = new Set(
      active
        .filter((row: { type?: string }) => row.type === "player")
        .map((row: { name?: string }) => String(row.name ?? "")),
    );
    const missing = desired.filter((token) => !taken.has(token.name));
    if (missing.length === 0) return;
    const created = await insertCombatRows(
      missing.map((token, index) =>
        participantInsertRow(token, active.length + index, null),
      ),
    );
    if (!created) return;
    combatParticipantsLoadGenRef.current += 1;
    setCombatParticipants((prev) => {
      const ids = new Set(prev.map((p) => p.id));
      return [...prev, ...created.filter((row) => !ids.has(row.id))];
    });
  }

  async function seedStageCombatParticipants() {
    if (!isGM) return;
    await enqueueStageOp(async () => {
      stagePresenceGenRef.current += 1;
      await ((supabase as any).from("combat_participants") as any)
        .update({ is_active: false })
        .eq("session_id", sessionId);
      combatParticipantsLoadGenRef.current += 1;

      const desired = stagePresentPayloads();
      stagePresenceAppliedRef.current = desired.map((token) => token.name).join("\n");
      if (desired.length === 0) {
        setCombatParticipants([]);
        toast.message(
          "Keine anwesenden Spieler. NPCs und Monster-Marker kannst du in der Initiative hinzufügen.",
        );
        return;
      }

      const created = await insertCombatRows(
        desired.map((token, index) => participantInsertRow(token, index, null)),
      );
      if (!created) {
        stagePresenceAppliedRef.current = null;
        return;
      }
      combatParticipantsLoadGenRef.current += 1;
      setCombatParticipants(created);
    });
  }

  async function seedCombatParticipantsFromBattlemap() {
    if (!isGM) return;
    if (!battlemapActive) {
      await seedStageCombatParticipants();
      return;
    }

    const payloads: CombatTokenPayload[] = [];
    const seenNames = new Set<string>();
    const seenNpcIds = new Set<string>();

    // Immer voller Token-State (nicht visibleBattlemapTokens / Pointer-Filter).
    for (const token of battlemapTokens) {
      const payload = battlemapTokenToCombatPayload(token);
      if (!payload) continue;
      if (isCombatTokenUsed(payload, seenNames, seenNpcIds)) continue;
      payloads.push(payload);
      if (payload.type === "npc" && payload.npc_id) seenNpcIds.add(payload.npc_id);
      else seenNames.add(payload.name);
    }

    // Vorherige Runde zurücksetzen — frische Initiative
    await ((supabase as any).from("combat_participants") as any)
      .update({ is_active: false })
      .eq("session_id", sessionId);

    // Realtime-Reload vom Deactivate darf die neue Liste nicht wieder leeren.
    combatParticipantsLoadGenRef.current += 1;

    if (payloads.length === 0) {
      setCombatParticipants([]);
      toast.error(
        "Keine aktiven Spieler-/NSC-Tokens auf der Battlemap. Platziere zuerst Tokens, dann Combat starten.",
      );
      return;
    }

    const rows = payloads.map((token, index) => ({
      session_id: sessionId,
      name: token.name,
      type: token.type,
      npc_id: token.npc_id ?? null,
      side: token.side ?? null,
      initiative_value: 0,
      initiative_label: null,
      sort_order: index,
      image_url: token.image_url,
      is_active: true,
      conditions: [],
    }));

    const { data, error } = await ((supabase as any).from("combat_participants") as any)
      .insert(rows)
      .select("*");

    if (error) {
      toast.error(error.message);
      return;
    }

    combatParticipantsLoadGenRef.current += 1;
    setCombatParticipants(normalizeCombatParticipants(data ?? []));
  }

  function dragCombatToken(e: DragEvent<HTMLElement>, token: CombatTokenPayload) {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("application/x-combat-token", JSON.stringify(token));
  }

  function dropCombatToken(e: DragEvent<HTMLElement>) {
    if (!isGM) return;
    e.preventDefault();
    e.stopPropagation();
    const raw = e.dataTransfer.getData("application/x-combat-token");
    if (!raw) return;
    try {
      const token = JSON.parse(raw) as CombatTokenPayload;
      if (token.type !== "player" && token.type !== "monster" && token.type !== "npc") return;
      void addCombatToken({
        type: token.type,
        name: String(token.name ?? "").trim(),
        image_url: token.image_url != null ? String(token.image_url) : null,
        npc_id: token.npc_id != null ? String(token.npc_id) : null,
        side: token.side ?? null,
      });
    } catch {
      /* ignore invalid token payload */
    }
  }

  async function updateCombatParticipant(
    participantId: string,
    patch: Partial<
      Pick<
        CombatParticipant,
        "initiative_value" | "initiative_label" | "is_active" | "conditions" | "side"
      >
    >,
  ) {
    if (!isGM) return;
    const { error } = await ((supabase as any).from("combat_participants") as any)
      .update(patch)
      .eq("id", participantId);
    if (error) toast.error(error.message);
  }

  async function handleRollInitiative(participantId: string) {
    setRollingInitiativeId(participantId);
    try {
      const result = await rollCombatInitiative({ sessionId, participantId });
      setCombatParticipants((prev) =>
        prev.map((p) =>
          p.id === participantId
            ? {
                ...p,
                initiative_value: result.total,
                initiative_label: result.display,
              }
            : p,
        ),
      );
      // Toast + HUD-Freigabe erst wenn der Würfel liegt.
      pendingInitiativeToastRef.current = {
        participantId,
        display: result.display,
      };
      // Fallback falls keine Animation (z. B. ohne Faces)
      window.setTimeout(() => {
        const pending = pendingInitiativeToastRef.current;
        if (!pending || pending.participantId !== participantId) return;
        pendingInitiativeToastRef.current = null;
        toast.success(`Initiative: ${pending.display}`);
        setRollingInitiativeId((cur) => (cur === participantId ? null : cur));
      }, 7000);
    } catch (e) {
      setRollingInitiativeId((cur) => (cur === participantId ? null : cur));
      toast.error(e instanceof Error ? e.message : "Initiative-Wurf fehlgeschlagen.");
    }
  }

  function beginCombatEncounter() {
    if (!isGM) return;
    const allRolled =
      sortedCombatParticipants.length > 0 &&
      sortedCombatParticipants.every((p) => hasRolledCombatInitiative(p));
    if (!allRolled) {
      toast.error(
        battlemapActive
          ? "Alle Teilnehmer müssen zuerst Initiative würfeln."
          : "Alle Teilnehmer brauchen eine Initiative-Zahl.",
      );
      return;
    }
    updateLiveState({
      combat_started: true,
      current_turn_index: 0,
      combat_round: 1,
    });
    writeSystemLog("combat_start", "Der Kampf beginnt — Initiative steht.");
  }

  function endCombatEncounter() {
    if (!isGM) return;
    updateLiveState({
      is_combat_mode: false,
      combat_started: false,
      current_turn_index: 0,
    });
    writeSystemLog("combat_end", "Der Kampfmodus wird beendet.");
  }

  function nextCombatTurn() {
    if (!isGM || sortedCombatParticipants.length === 0) return;
    const current = Math.max(0, Number(liveStateRef.current?.current_turn_index ?? 0) || 0);
    const length = sortedCombatParticipants.length;
    const nextIndex = (current + 1) % length;
    const patch: Partial<LiveState> = { current_turn_index: nextIndex };
    if (nextIndex === 0) {
      patch.combat_round =
        Math.max(1, Number(liveStateRef.current?.combat_round ?? 1) || 1) + 1;
    }
    updateLiveState(patch);
  }

  function prevCombatTurn() {
    if (!isGM || sortedCombatParticipants.length === 0) return;
    const current = Math.max(0, Number(liveStateRef.current?.current_turn_index ?? 0) || 0);
    const length = sortedCombatParticipants.length;
    const prevIndex = (current - 1 + length) % length;
    const patch: Partial<LiveState> = { current_turn_index: prevIndex };
    if (current === 0 && prevIndex === length - 1) {
      patch.combat_round = Math.max(
        1,
        Math.max(1, Number(liveStateRef.current?.combat_round ?? 1) || 1) - 1,
      );
    }
    updateLiveState(patch);
  }

  async function handlePlayerEndTurn() {
    try {
      const result = await advanceCombatTurn({
        sessionId,
        expectedParticipantId: activeCombatParticipant?.id,
      });
      setLiveState((prev) => {
        if (!prev) return prev;
        const next = {
          ...prev,
          current_turn_index: result.current_turn_index,
          combat_round: result.combat_round,
        };
        liveStateRef.current = next;
        return next;
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Zug konnte nicht beendet werden.");
    }
  }

  async function addStageNpcParticipant(
    npcId: string,
    initiativeLabel: string,
  ): Promise<boolean> {
    if (!isGM || battlemapActiveRef.current) return false;
    const display = explicitInitiativeDisplay(initiativeLabel);
    if (!display) {
      toast.error("Bitte eine Initiative-Zahl eintragen, zum Beispiel 17 oder 17-1.");
      return false;
    }
    const npc = campaignNpcs.find((row) => String(row.id) === npcId);
    if (!npc) {
      toast.error("NPC nicht gefunden.");
      return false;
    }
    if (combatParticipantNpcIds.has(String(npc.id))) {
      toast.error(`${npc.name} ist schon in der Initiative.`);
      return false;
    }
    const created = await insertCombatRows([
      participantInsertRow(
        buildNpcCombatToken(npc),
        combatParticipants.length,
        display,
      ),
    ]);
    if (!created) return false;
    combatParticipantsLoadGenRef.current += 1;
    setCombatParticipants((prev) => [...prev, ...created]);
    toast.success(`${npc.name} ist in der Initiative.`);
    return true;
  }

  async function addStageMonsterMarker(
    name: string,
    markerNumber: number,
    initiativeLabel: string,
  ): Promise<boolean> {
    if (!isGM || battlemapActiveRef.current) return false;
    const markerName = formatMonsterMarkerName(name, markerNumber);
    if (!markerName) {
      toast.error("Für den Marker brauchst du einen Namen und eine Nummer ab 1.");
      return false;
    }
    const display = explicitInitiativeDisplay(initiativeLabel);
    if (!display) {
      toast.error("Bitte eine Initiative-Zahl eintragen, zum Beispiel 17 oder 17-1.");
      return false;
    }
    if (combatParticipantNames.has(markerName)) {
      toast.error(`${markerName} ist schon in der Initiative.`);
      return false;
    }
    const created = await insertCombatRows([
      participantInsertRow(
        { type: "monster", name: markerName, image_url: null, side: null },
        combatParticipants.length,
        display,
      ),
    ]);
    if (!created) return false;
    combatParticipantsLoadGenRef.current += 1;
    setCombatParticipants((prev) => [...prev, ...created]);
    toast.success(`${markerName} ist in der Initiative.`);
    return true;
  }

  async function removeCombatParticipant(participantId: string) {
    if (!isGM) return;
    const target = combatParticipants.find((p) => p.id === participantId);
    const { error } = await ((supabase as any).from("combat_participants") as any)
      .update({ is_active: false })
      .eq("id", participantId)
      .eq("session_id", sessionId);
    if (error) {
      toast.error(error.message);
      return;
    }
    combatParticipantsLoadGenRef.current += 1;
    setCombatParticipants((prev) => prev.filter((p) => p.id !== participantId));
    if (target) toast.success(`${target.name} ist aus der Initiative.`);
  }

  return {
    combatParticipants,
    setCombatParticipants,
    sortedCombatParticipants,
    combatStarted,
    activeCombatParticipant,
    activeTurnHighlight,
    combatParticipantNames,
    combatParticipantNpcIds,
    combatPlayerTokens,
    combatMonsterTokens,
    combatNpcTokens,
    addCombatToken,
    battlemapTokenToCombatPayload,
    seedCombatParticipantsFromBattlemap,
    dragCombatToken,
    dropCombatToken,
    updateCombatParticipant,
    handleRollInitiative,
    beginCombatEncounter,
    endCombatEncounter,
    nextCombatTurn,
    prevCombatTurn,
    handlePlayerEndTurn,
    addStageNpcParticipant,
    addStageMonsterMarker,
    removeCombatParticipant,
  };
}
