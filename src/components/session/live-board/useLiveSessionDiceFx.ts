/**
 * useLiveSessionDiceFx — Dice roll avatar FX, pending animation bridge, and initiative toasts.
 */
"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  dispatchAvatarRollFx,
  rollFxKindFromMeta,
} from "@/src/lib/session/avatar-roll-fx";
import { dispatchBattlemapTokenAttackFx } from "@/src/lib/session/battlemap-token-attack-fx";
import { playDiceNatSound, primeDiceNatSounds } from "@/src/lib/session/dice-nat-sounds";
import {
  dispatchAvatarSpeechBubble,
  speechBubbleFromActivityEntry,
} from "@/src/lib/session/avatar-speech-bubble";
import { shouldAnimateDiceEntry } from "@/src/lib/session/dice-animation";
import {
  useDiceRevealBridge,
  useOnDiceAnimComplete,
} from "@/src/lib/session/dice-reveal-store";
import type { SystemLogEntry } from "./live-session-types";

type Params = {
  systemLogs: SystemLogEntry[];
  isGM: boolean;
  forcePlayerView: boolean;
  setRollingInitiativeId: React.Dispatch<React.SetStateAction<string | null>>;
};

export function useLiveSessionDiceFx({
  systemLogs,
  isGM,
  forcePlayerView,
  setRollingInitiativeId,
}: Params) {
  const prevSystemLogCountRef = useRef(systemLogs.length);
  const prevRollFxLogCountRef = useRef(systemLogs.length);
  const pendingDiceFxRef = useRef<globalThis.Map<string, SystemLogEntry>>(
    new globalThis.Map(),
  );
  const pendingInitiativeToastRef = useRef<{
    participantId: string;
    display: string;
  } | null>(null);

  useEffect(() => {
    if (!isGM || forcePlayerView) {
      prevSystemLogCountRef.current = systemLogs.length;
      return;
    }
    if (systemLogs.length <= prevSystemLogCountRef.current) {
      prevSystemLogCountRef.current = systemLogs.length;
      return;
    }
    const fresh = systemLogs.slice(prevSystemLogCountRef.current);
    prevSystemLogCountRef.current = systemLogs.length;
    for (const entry of fresh) {
      const text = entry.text ?? "";
      if (
        entry.type === "player_action" &&
        (text.includes("Ausrüstung") ||
          text.includes("Loadout") ||
          text.includes("Waffenkombination") ||
          text.includes("wechselt Waffe auf"))
      ) {
        toast.info(text, { duration: 9000 });
      }
    }
  }, [systemLogs, isGM, forcePlayerView]);

  useDiceRevealBridge();

  useEffect(() => {
    const prime = () => {
      primeDiceNatSounds();
    };
    window.addEventListener("pointerdown", prime, { once: true, passive: true });
    window.addEventListener("keydown", prime, { once: true });
    return () => {
      window.removeEventListener("pointerdown", prime);
      window.removeEventListener("keydown", prime);
    };
  }, []);

  function applyDiceResolveFx(entry: SystemLogEntry) {
    const characterId = entry.character_id?.trim();
    if (characterId && entry.type === "attack_hit") {
      const meta =
        entry.meta && typeof entry.meta === "object"
          ? (entry.meta as Record<string, unknown>)
          : null;
      dispatchBattlemapTokenAttackFx({
        characterId,
        critical: meta?.critical === true,
        sourceId: entry.id,
      });
    }
    if (characterId) {
      if (
        entry.type === "dice" ||
        entry.type === "attack_pending" ||
        entry.type === "skill_check" ||
        entry.type === "saving_throw" ||
        entry.type === "damage_roll"
      ) {
        const kind = rollFxKindFromMeta(entry.meta);
        if (kind) {
          playDiceNatSound(kind, entry.id);
          dispatchAvatarRollFx({
            characterId,
            kind,
            sourceId: entry.id,
          });
        }
      }
    }
    const bubble = speechBubbleFromActivityEntry(entry);
    if (bubble) dispatchAvatarSpeechBubble(bubble);
  }

  /** Crit/Patzer-Avatar-FX + Sprechblasen: bei 3D-Würfeln erst nach Animation. */
  useEffect(() => {
    if (systemLogs.length < prevRollFxLogCountRef.current) {
      prevRollFxLogCountRef.current = systemLogs.length;
      pendingDiceFxRef.current.clear();
      return;
    }
    if (systemLogs.length === prevRollFxLogCountRef.current) return;
    const fresh = systemLogs.slice(prevRollFxLogCountRef.current);
    prevRollFxLogCountRef.current = systemLogs.length;
    for (const entry of fresh) {
      if (shouldAnimateDiceEntry(entry)) {
        pendingDiceFxRef.current.set(entry.id, entry);
        continue;
      }
      applyDiceResolveFx(entry);
    }
  }, [systemLogs]);

  useOnDiceAnimComplete((sourceId) => {
    const entry = pendingDiceFxRef.current.get(sourceId);
    if (entry) {
      pendingDiceFxRef.current.delete(sourceId);
      applyDiceResolveFx(entry);
    }
    const pendingInit = pendingInitiativeToastRef.current;
    if (!pendingInit || !entry) return;
    const meta =
      entry.meta && typeof entry.meta === "object"
        ? (entry.meta as Record<string, unknown>)
        : null;
    const isInitiative =
      meta?.kind === "initiative" ||
      (typeof meta?.label === "string" && meta.label.trim() === "Initiative");
    if (!isInitiative) return;
    pendingInitiativeToastRef.current = null;
    toast.success(`Initiative: ${pendingInit.display}`);
    setRollingInitiativeId((cur) =>
      cur === pendingInit.participantId ? null : cur,
    );
  });

  return { pendingInitiativeToastRef };
}
