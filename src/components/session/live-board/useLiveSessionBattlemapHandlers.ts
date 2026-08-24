/**
 * useLiveSessionBattlemapHandlers — Battlemap cell/token/prop/fog/trap interaction handlers.
 */
"use client";

import { useCallback, type TransitionStartFunction } from "react";
import { toast } from "sonner";
import {
  getCharacterMovementRange,
  placeBattlemapCharacterToken,
  placeBattlemapGmToken,
} from "@/src/lib/actions/battlemap-actions";
import {
  checkBattlemapTrapsOnEnter,
} from "@/src/lib/actions/battlemap-trap-actions";
import {
  isWithinMovementRange,
  movementCellsForBurst,
} from "@/src/lib/session/battlemap-movement";
import { isCellBlockedByTokens } from "@/src/lib/session/battlemap-grid";
import {
  applyBattlemapTokenUpdate,
  clearPendingBattlemapTokenMove,
  registerPendingBattlemapTokenMove,
  upsertBattlemapToken,
  upsertBattlemapTrap,
} from "@/src/lib/session/battlemap-realtime-map";
import type { SessionBattlemapToken } from "@/src/lib/session/battlemap-types";
import type { CampaignNpc, LiveState } from "./live-session-types";
import type { LiveSessionBattlemapState } from "./useLiveSessionBattlemapState";
import { normalizeLiveRow } from "./live-session-normalize";

type NotifyFns = {
  notifyBattlemapTokensChanged: (detail?: {
    op?: "upsert" | "delete" | "refresh";
    token?: SessionBattlemapToken | null;
    tokenId?: string | null;
  }) => void;
  notifyBattlemapFogChanged: (detail?: {
    op?: "upsert" | "delete" | "refresh";
    shape?: import("@/src/lib/session/battlemap-types").SessionBattlemapFogShape | null;
    shapeId?: string | null;
  }) => void;
  notifyBattlemapEffectChanged: (detail?: {
    op?: "upsert" | "delete" | "refresh";
    template?: import("@/src/lib/session/battlemap-types").SessionBattlemapEffectTemplate | null;
    templateId?: string | null;
  }) => void;
};

type Params = {
  sessionId: string;
  campaignId: string;
  isGM: boolean;
  ownCharacterId?: string | null;
  liveState: LiveState | null;
  liveStateRef: React.MutableRefObject<LiveState | null>;
  setLiveState: React.Dispatch<React.SetStateAction<LiveState | null>>;
  campaignNpcs: CampaignNpc[];
  bm: LiveSessionBattlemapState;
  notify: NotifyFns;
  startTransition: TransitionStartFunction;
};

export function useLiveSessionBattlemapHandlers({
  sessionId,
  campaignId,
  isGM,
  ownCharacterId,
  liveState,
  liveStateRef,
  setLiveState,
  campaignNpcs,
  bm,
  notify,
  startTransition,
}: Params) {
  const { notifyBattlemapTokensChanged, notifyBattlemapFogChanged, notifyBattlemapEffectChanged } =
    notify;
  const {
    activeBattlemapId,
    battlemapActive,
    battlemapTokens,
    setBattlemapTokens,
    battlemapProps,
    setBattlemapFogShapes,
    setSelectedFogShapeId,
    setBattlemapEffectTemplates,
    setSelectedEffectTemplateId,
    setBattlemapMarkers,
    setSelectedMarkerId,
    setBattlemapTraps,
    setSelectedTrapId,
    setTrapTriggerEvent,
    setTokenPlacement,
    setGmTokenPlacement,
    setGmMoveTokenId,
    setSelectedBattlemapTokenId,
    setSelectedBattlemapPropId,
    tokenPlacement,
    gmTokenPlacement,
    gmMoveTokenId,
    battlemapFogShapes,
    battlemapEffectTemplates,
    battlemapMarkers,
    battlemapTraps,
  } = bm;

  const startCharacterTokenPlacement = useCallback(
    (characterId: string, characterName: string) => {
      if (!activeBattlemapId) return;
      const existing = battlemapTokens.find((t) => t.character_id === characterId);
      startTransition(async () => {
        try {
          const range = await getCharacterMovementRange(characterId);
          setTokenPlacement({
            characterId,
            characterName,
            speedFt: range.speedFt,
            baseCells: range.baseCells,
            useDash: false,
            isFirstPlacement: !existing,
            originGridX: existing?.grid_x,
            originGridY: existing?.grid_y,
          });
          setGmTokenPlacement(null);
          setGmMoveTokenId(null);
          setSelectedBattlemapTokenId(null);
          setSelectedBattlemapPropId(null);
        } catch (e) {
          toast.error(
            e instanceof Error ? e.message : "Bewegungsreichweite konnte nicht geladen werden.",
          );
        }
      });
    },
    [activeBattlemapId, battlemapTokens, startTransition],
  );

  const handleBattlemapCellClick = useCallback(
    (gridX: number, gridY: number) => {
      if (!activeBattlemapId) return;

      if (gmMoveTokenId || gmTokenPlacement) {
        if (!isGM) return;
        const movingToken = gmMoveTokenId
          ? battlemapTokens.find((t) => t.id === gmMoveTokenId)
          : null;
        startTransition(async () => {
          try {
            const placed = await placeBattlemapGmToken({
              sessionId,
              battlemapId: activeBattlemapId,
              gridX,
              gridY,
              tokenId: gmMoveTokenId ?? undefined,
              npcId: gmTokenPlacement?.kind === "npc" ? gmTokenPlacement.refId : undefined,
              creatureId:
                gmTokenPlacement?.kind === "creature" ? gmTokenPlacement.refId : undefined,
              tokenSide: gmTokenPlacement?.tokenSide ?? movingToken?.token_side ?? "hostile",
              sizeCells: gmTokenPlacement?.sizeCells ?? movingToken?.size_cells ?? 1,
              isVisibleToPlayers:
                gmTokenPlacement?.isVisibleToPlayers ??
                movingToken?.is_visible_to_players ??
                true,
              label: gmTokenPlacement?.name ?? movingToken?.label ?? null,
              imageUrl: gmTokenPlacement?.imageUrl ?? movingToken?.image_url ?? null,
            });
            setBattlemapTokens((prev) => upsertBattlemapToken(prev, placed));
            notifyBattlemapTokensChanged({ op: "upsert", token: placed });
            toast.success(
              gmMoveTokenId ? "SL-Token verschoben." : `${gmTokenPlacement?.name ?? "Token"} platziert.`,
            );
            setGmTokenPlacement(null);
            setGmMoveTokenId(null);
            setSelectedBattlemapTokenId(null);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "SL-Token konnte nicht gesetzt werden.");
          }
        });
        return;
      }

      if (!tokenPlacement) return;
      if (!isGM && liveState?.battlemap_movement_paused) {
        toast.error("Bewegung ist pausiert — warte auf den Spielleiter.");
        return;
      }

      const existingToken = battlemapTokens.find(
        (t) => t.character_id === tokenPlacement.characterId,
      );
      if (
        !tokenPlacement.isFirstPlacement &&
        !isGM &&
        tokenPlacement.originGridX != null &&
        tokenPlacement.originGridY != null
      ) {
        const maxCells = movementCellsForBurst(
          tokenPlacement.baseCells,
          tokenPlacement.useDash,
        );
        if (
          !isWithinMovementRange(
            tokenPlacement.originGridX,
            tokenPlacement.originGridY,
            gridX,
            gridY,
            maxCells,
          )
        ) {
          toast.error(
            `Zu weit (${maxCells} Zellen erlaubt${tokenPlacement.useDash ? ", inkl. Dash" : ""}).`,
          );
          return;
        }
      }
      if (
        isCellBlockedByTokens(
          battlemapTokens,
          gridX,
          gridY,
          existingToken?.id,
        )
      ) {
        toast.error("Zelle ist blockiert.");
        return;
      }

      startTransition(async () => {
        try {
          const placed = await placeBattlemapCharacterToken({
            sessionId,
            battlemapId: activeBattlemapId,
            characterId: tokenPlacement.characterId,
            gridX,
            gridY,
            useDash: tokenPlacement.useDash,
          });
          setBattlemapTokens((prev) => upsertBattlemapToken(prev, placed));
          notifyBattlemapTokensChanged({ op: "upsert", token: placed });
          toast.success(
            tokenPlacement.isFirstPlacement
              ? `Token für ${tokenPlacement.characterName} gesetzt.`
              : `Token für ${tokenPlacement.characterName} bewegt.`,
          );
          setTokenPlacement(null);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Token konnte nicht gesetzt werden.");
        }
      });
    },
    [
      activeBattlemapId,
      battlemapTokens,
      gmMoveTokenId,
      gmTokenPlacement,
      isGM,
      liveState?.battlemap_movement_paused,
      notifyBattlemapTokensChanged,
      sessionId,
      startTransition,
      tokenPlacement,
    ],
  );

  const runTrapEnterCheck = useCallback(
    async (characterId: string, gridX: number, gridY: number) => {
      if (!activeBattlemapId) return;
      try {
        const result = await checkBattlemapTrapsOnEnter({
          sessionId,
          battlemapId: activeBattlemapId,
          characterId,
          gridX,
          gridY,
        });
        if (result.kind === "detected") {
          setBattlemapTraps((prev) => upsertBattlemapTrap(prev, result.trap));
          toast.message(
            `${result.characterName} bemerkt „${result.trap.name}“ (PP ${result.passivePerception} ≥ DC ${result.trap.detection_dc}).`,
          );
        } else if (result.kind === "triggered") {
          setBattlemapTraps((prev) => upsertBattlemapTrap(prev, result.trap));
          setLiveState((prev) => {
            if (!prev) return prev;
            const updated = normalizeLiveRow({
              ...prev,
              battlemap_movement_paused: true,
            });
            liveStateRef.current = updated;
            return updated;
          });
          setTrapTriggerEvent({
            trap: result.trap,
            characterName: result.characterName,
            characterId: result.characterId,
            passivePerception: result.passivePerception,
          });
          toast.error(`Falle „${result.trap.name}“ ausgelöst!`);
        }
      } catch {
        /* Trap-Check optional — Bewegung bleibt gültig */
      }
    },
    [activeBattlemapId, sessionId],
  );

  const handleBattlemapTokenMove = useCallback(
    (token: SessionBattlemapToken, gridX: number, gridY: number) => {
      if (!activeBattlemapId) return;
      if (token.grid_x === gridX && token.grid_y === gridY) return;

      const originGrid = { grid_x: token.grid_x, grid_y: token.grid_y };
      registerPendingBattlemapTokenMove(token.id, gridX, gridY);
      const applyLocalMove = (gx: number, gy: number) => {
        setBattlemapTokens((prev) =>
          prev.map((t) => (t.id === token.id ? { ...t, grid_x: gx, grid_y: gy } : t)),
        );
      };

      if (token.character_id) {
        if (!isGM) {
          if (liveState?.battlemap_movement_paused) {
            toast.error("Bewegung ist pausiert — warte auf den Spielleiter.");
            return;
          }
          if (!ownCharacterId || token.character_id !== ownCharacterId) {
            toast.error("Du darfst nur deinen eigenen Token bewegen.");
            return;
          }
        }
        const characterId = token.character_id;
        const characterName = token.label ?? "Charakter";
        applyLocalMove(gridX, gridY);
        void (async () => {
          try {
            const placed = await placeBattlemapCharacterToken({
              sessionId,
              battlemapId: activeBattlemapId,
              characterId,
              gridX,
              gridY,
              useDash: tokenPlacement?.characterId === characterId
                ? tokenPlacement.useDash
                : false,
            });
            setBattlemapTokens((prev) => applyBattlemapTokenUpdate(prev, placed));
            notifyBattlemapTokensChanged({ op: "upsert", token: placed });
            if (!tokenPlacement || tokenPlacement.characterId !== characterId) {
              toast.success(`Token für ${characterName} bewegt.`);
            }
            void runTrapEnterCheck(characterId, gridX, gridY);
          } catch (e) {
            clearPendingBattlemapTokenMove(token.id);
            applyLocalMove(originGrid.grid_x, originGrid.grid_y);
            toast.error(e instanceof Error ? e.message : "Token konnte nicht gesetzt werden.");
          }
        })();
        return;
      }

      if (!isGM) return;
      applyLocalMove(gridX, gridY);
      void (async () => {
        try {
          const placed = await placeBattlemapGmToken({
            sessionId,
            battlemapId: activeBattlemapId,
            gridX,
            gridY,
            tokenId: token.id,
            npcId: token.npc_id ?? undefined,
            creatureId: token.creature_id ?? undefined,
            tokenSide: token.token_side,
            sizeCells: token.size_cells,
            isVisibleToPlayers: token.is_visible_to_players,
            label: token.label,
            imageUrl: token.image_url,
          });
          setBattlemapTokens((prev) => applyBattlemapTokenUpdate(prev, placed));
          notifyBattlemapTokensChanged({ op: "upsert", token: placed });
          toast.success("Token verschoben.");
        } catch (e) {
          clearPendingBattlemapTokenMove(token.id);
          applyLocalMove(originGrid.grid_x, originGrid.grid_y);
          toast.error(e instanceof Error ? e.message : "Token konnte nicht gesetzt werden.");
        }
      })();
    },
    [
      activeBattlemapId,
      isGM,
      ownCharacterId,
      liveState?.battlemap_movement_paused,
      notifyBattlemapTokensChanged,
      runTrapEnterCheck,
      sessionId,
      tokenPlacement,
    ],
  );

  return {
    startCharacterTokenPlacement,
    handleBattlemapCellClick,
    runTrapEnterCheck,
    handleBattlemapTokenMove,
  };
}
