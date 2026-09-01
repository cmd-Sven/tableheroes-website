/** Radial menu actions: mood, GM conditions, token settings, and loadout runners. */
import { useCallback, useMemo, useTransition } from "react";
import { toast } from "sonner";
import {
  getLiveSessionAvatarStatus,
  type LiveAvatarStatus,
} from "@/src/lib/actions/live-session-avatar-actions";
import { updateBattlemapTokenSettings } from "@/src/lib/actions/battlemap-actions";
import {
  setCharacterExhaustionLevel,
  setCharacterMoodState,
  toggleCharacterActiveCondition,
} from "@/src/app/dashboard/campaigns/[id]/character-state-actions";
import { clampExhaustionLevel, EXHAUSTION_MAX } from "@/src/lib/characters/dnd5e/exhaustion";
import type { CharacterConditionKey } from "@/src/lib/characters/condition-tokens";
import {
  MOOD_STATE_DEFINITIONS,
  type MoodStateKey,
} from "@/src/lib/characters/mood-states";
import { NPC_SIZE_CELLS, type NpcTokenSizeCategory } from "@/src/lib/npcs/npc-sheet-types";
import type { SessionBattlemapToken, SessionBattlemapTrap } from "@/src/lib/session/battlemap-types";
import { dispatchCharacterDisplayChanged } from "@/src/lib/session/character-radial-bridge";
import {
  type RadialPanel,
  RADIAL_ITEMS,
  buildVisibleRadialItems,
  resolveAdjacentDisarmableTraps,
  sizeCategoryFromCells,
} from "./live-session-character-avatar.constants";

type Args = {
  sessionId: string;
  campaignId: string;
  characterId: string;
  className: string | null;
  isDummy: boolean;
  isGm: boolean;
  showDnd5eSheet: boolean;
  battlemapActive: boolean;
  onStartTokenPlacement?: () => void;
  battlemapToken: { id: string; showHpBar: boolean; sizeCells: number; gridX: number; gridY: number } | null;
  onBattlemapTokenSaved?: (token: SessionBattlemapToken) => void;
  battlemapTraps?: SessionBattlemapTrap[];
  onDisarmTrap?: (trap: SessionBattlemapTrap, characterId: string) => void;
  combatMode: boolean;
  canJoinCombat: boolean;
  onJoinCombat?: () => void;
  status: LiveAvatarStatus | null;
  setStatus: React.Dispatch<React.SetStateAction<LiveAvatarStatus | null>>;
  activeBattlemapTokenId: string | null;
  tokenShowHpBar: boolean;
  tokenSizeCategory: NpcTokenSizeCategory;
  setTokenShowHpBar: (v: boolean) => void;
  setTokenSizeCategory: (v: NpcTokenSizeCategory) => void;
  panel: RadialPanel;
  setPanel: React.Dispatch<React.SetStateAction<RadialPanel>>;
  setMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  canControlWebcam?: boolean;
  webcamActive?: boolean;
  onToggleWebcam?: () => void;
};

export function useLiveSessionCharacterAvatarHandlers({
  sessionId,
  campaignId,
  characterId,
  className,
  isDummy,
  isGm,
  showDnd5eSheet,
  battlemapActive,
  onStartTokenPlacement,
  battlemapToken,
  onBattlemapTokenSaved,
  battlemapTraps,
  onDisarmTrap,
  combatMode,
  canJoinCombat,
  onJoinCombat,
  status,
  setStatus,
  activeBattlemapTokenId,
  tokenShowHpBar,
  tokenSizeCategory,
  setTokenShowHpBar,
  setTokenSizeCategory,
  panel,
  setPanel,
  setMenuOpen,
  canControlWebcam = false,
  webcamActive = false,
  onToggleWebcam,
}: Args) {
  const [pending, startTransition] = useTransition();

  const reload = useCallback(async (): Promise<LiveAvatarStatus | null> => {
    if (isDummy) return null;
    try {
      const next = await getLiveSessionAvatarStatus(characterId);
      setStatus(next);
      return next;
    } catch {
      return null;
    }
  }, [characterId, isDummy, setStatus]);

  function broadcastDisplaySnapshot(next: LiveAvatarStatus | null) {
    if (!next) {
      dispatchCharacterDisplayChanged({ characterId });
      return;
    }
    const moodTokenUrls: Record<string, string> = {};
    for (const [k, v] of Object.entries(next.moodTokenUrls ?? {})) {
      if (v?.trim()) moodTokenUrls[k] = v.trim();
    }
    dispatchCharacterDisplayChanged({
      characterId,
      snapshot: {
        url: next.displayAvatarUrl,
        activeConditions: next.activeConditions ?? [],
        hpCurrent: next.hpCurrent,
        hpMax: next.hpMax,
        exhaustionLevel: next.exhaustionLevel ?? 0,
        moodTokenUrls,
      },
    });
  }

  const hasBattlemapToken = Boolean(activeBattlemapTokenId || battlemapToken?.id);

  const adjacentDisarmableTraps = useMemo(
    () => resolveAdjacentDisarmableTraps(battlemapTraps, battlemapToken),
    [battlemapTraps, battlemapToken],
  );

  const visibleRadial = useMemo(
    () =>
      buildVisibleRadialItems({
        status,
        className,
        showDnd5eSheet,
        isGm,
        battlemapActive,
        onStartTokenPlacement,
        hasBattlemapToken,
        combatMode,
      canJoinCombat,
      onJoinCombat,
      canControlWebcam,
      webcamActive,
      adjacentDisarmableTraps,
    }),
    [
      status,
      className,
      showDnd5eSheet,
      isGm,
      battlemapActive,
      onStartTokenPlacement,
      hasBattlemapToken,
      combatMode,
      canJoinCombat,
      onJoinCombat,
      canControlWebcam,
      webcamActive,
      adjacentDisarmableTraps,
    ],
  );

  function openSheetTab() {
    const sheetHash = "#character-dnd5e-sheet";
    const url = isGm
      ? `/dashboard/campaigns/${campaignId}/characters/${characterId}/player-view${sheetHash}`
      : `/dashboard/characters/${characterId}${sheetHash}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setMenuOpen(false);
    setPanel(null);
  }

  function handleRadialClick(id: (typeof RADIAL_ITEMS)[number]["id"]) {
    if (id === "sheet") {
      openSheetTab();
      return;
    }
    if (id === "webcam") {
      onToggleWebcam?.();
      setMenuOpen(false);
      setPanel(null);
      return;
    }
    if (id === "join_combat") {
      onJoinCombat?.();
      setMenuOpen(false);
      setPanel(null);
      return;
    }
    if (id === "token") {
      onStartTokenPlacement?.();
      setMenuOpen(false);
      setPanel(null);
      return;
    }
    if (id === "token_settings") {
      const tokenId = activeBattlemapTokenId ?? battlemapToken?.id ?? null;
      if (tokenId && battlemapToken && battlemapToken.id === tokenId) {
        setTokenShowHpBar(battlemapToken.showHpBar);
        setTokenSizeCategory(sizeCategoryFromCells(battlemapToken.sizeCells));
      }
      setPanel((prev) => (prev === id ? null : id));
      return;
    }
    if (id === "disarm_trap") {
      if (adjacentDisarmableTraps.length === 1) {
        onDisarmTrap?.(adjacentDisarmableTraps[0]!, characterId);
        setMenuOpen(false);
        setPanel(null);
        return;
      }
      setPanel((prev) => (prev === id ? null : id));
      return;
    }
    setPanel((prev) => (prev === id ? null : id));
  }

  function saveTokenSettings() {
    const tokenId = activeBattlemapTokenId ?? battlemapToken?.id ?? null;
    if (!tokenId) return;
    startTransition(async () => {
      try {
        const updated = await updateBattlemapTokenSettings({
          tokenId,
          sessionId,
          showHpBar: tokenShowHpBar,
          sizeCells: NPC_SIZE_CELLS[tokenSizeCategory],
        });
        onBattlemapTokenSaved?.(updated);
        toast.success("Token-Einstellungen gespeichert.");
        setPanel(null);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Token-Einstellungen fehlgeschlagen.",
        );
      }
    });
  }

  function runAction(fn: () => Promise<LiveAvatarStatus | void>) {
    startTransition(async () => {
      try {
        const next = await fn();
        if (next) setStatus(next);
        else await reload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Aktion fehlgeschlagen.");
      }
    });
  }

  function saveMood(moodKey: MoodStateKey | null) {
    startTransition(async () => {
      try {
        const result = await setCharacterMoodState({
          campaignId,
          characterId,
          moodKey,
        });
        if (!result.success) {
          toast.error(result.error ?? "Gemütszustand konnte nicht gespeichert werden.");
          return;
        }
        const next = await reload();
        broadcastDisplaySnapshot(next);
        toast.success(
          moodKey
            ? `Gemüt: ${MOOD_STATE_DEFINITIONS.find((d) => d.key === moodKey)?.labelDe ?? moodKey}`
            : "Gemütszustand zurückgesetzt.",
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gemütszustand fehlgeschlagen.");
      }
    });
  }

  function toggleGmCondition(conditionKey: CharacterConditionKey) {
    if (!isGm) return;
    startTransition(async () => {
      try {
        const result = await toggleCharacterActiveCondition({
          campaignId,
          characterId,
          conditionKey,
        });
        if (!result.success) {
          toast.error(result.error ?? "Zustand konnte nicht gesetzt werden.");
          return;
        }
        const next = await reload();
        broadcastDisplaySnapshot(next);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Zustand fehlgeschlagen.");
      }
    });
  }

  function setGmExhaustionLevel(level: number) {
    if (!isGm) return;
    const nextLevel = clampExhaustionLevel(level);
    startTransition(async () => {
      try {
        const result = await setCharacterExhaustionLevel({
          campaignId,
          characterId,
          level: nextLevel,
        });
        if (!result.success) {
          toast.error(result.error ?? "Erschöpfung konnte nicht gesetzt werden.");
          return;
        }
        const next = await reload();
        broadcastDisplaySnapshot(next);
        toast.success(
          nextLevel > 0
            ? `Erschöpfung Stufe ${nextLevel}/${EXHAUSTION_MAX}`
            : "Erschöpfung entfernt.",
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erschöpfung fehlgeschlagen.");
      }
    });
  }

  return {
    pending,
    reload,
    hasBattlemapToken,
    adjacentDisarmableTraps,
    visibleRadial,
    handleRadialClick,
    saveTokenSettings,
    runAction,
    saveMood,
    toggleGmCondition,
    setGmExhaustionLevel,
  };
}
