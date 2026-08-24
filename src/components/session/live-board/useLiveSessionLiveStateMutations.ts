/**
 * useLiveSessionLiveStateMutations — Persist live-state patches and GM system-log writes.
 */
"use client";

import {
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
  type TransitionStartFunction,
  useCallback,
} from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSystemLog } from "@/src/lib/actions/session-system-log-actions";
import { normalizeStageVisibilityPatch } from "./live-session-normalize";
import type { LiveState } from "./live-session-types";

type Params = {
  sessionId: string;
  isGM: boolean;
  supabase: SupabaseClient;
  liveStateRef: MutableRefObject<LiveState | null>;
  setLiveState: Dispatch<SetStateAction<LiveState | null>>;
  setBackgroundUrl: (url: string | null) => void;
  liveChannelRef: MutableRefObject<RealtimeChannel | null>;
  resolveLiveStateBase: () => Promise<LiveState | null>;
  startTransition: TransitionStartFunction;
};

export function useLiveSessionLiveStateMutations({
  sessionId,
  isGM,
  supabase,
  liveStateRef,
  setLiveState,
  setBackgroundUrl,
  liveChannelRef,
  resolveLiveStateBase,
  startTransition,
}: Params) {
  const writeSystemLog = useCallback(
    (type: string, text: string) => {
      if (!isGM || !text.trim()) return;
      void createSystemLog(sessionId, type, text).catch((error) => {
        console.error("[LiveSessionBoard] createSystemLog:", error);
      });
    },
    [isGM, sessionId],
  );

  /** `baseOverride`: z. B. direkt nach resolveLiveStateBase, wenn React-State noch nachzieht */
  const updateLiveState = useCallback(
    (patch: Partial<LiveState>, baseOverride?: LiveState) => {
      startTransition(async () => {
        try {
          let base = baseOverride ?? liveStateRef.current;
          if (!base) {
            base = await resolveLiveStateBase();
          }
          if (!base) {
            alert(
              "Session-Zustand konnte nicht geladen werden. Bitte Seite neu laden. " +
                "In der Browser-Konsole nach „ensureSessionPrepLiveState“ oder „session_live_states“ suchen. " +
                "In Supabase: Migrationen für session_live_states (inkl. ensure_session_prep_live_state) ausführen.",
            );
            return;
          }

          const { error } = await (supabase.from("session_live_states") as any)
            .update(patch)
            .eq("session_id", sessionId);

          if (error) {
            console.error("Update Live State Error:", error);
            alert(error.message);
            return;
          }

          const stageVisibilityPatch = normalizeStageVisibilityPatch(patch);

          setLiveState((prev) => {
            const mergeFrom = prev ?? base!;
            const next = { ...mergeFrom, ...patch };
            liveStateRef.current = next;
            if (Object.prototype.hasOwnProperty.call(patch, "background_url")) {
              setBackgroundUrl(next.background_url || null);
            }
            return next;
          });

          if (
            Object.prototype.hasOwnProperty.call(stageVisibilityPatch, "visible_npc_ids") ||
            Object.prototype.hasOwnProperty.call(stageVisibilityPatch, "visible_faction_ids")
          ) {
            void liveChannelRef.current?.send({
              type: "broadcast",
              event: "stage_visibility_changed",
              payload: stageVisibilityPatch,
            });
          }
        } catch (err: any) {
          console.error(err);
          alert(err.message || "Fehler beim Aktualisieren des Session-Zustands.");
        }
      });
    },
    [
      liveChannelRef,
      liveStateRef,
      resolveLiveStateBase,
      sessionId,
      setBackgroundUrl,
      setLiveState,
      startTransition,
      supabase,
    ],
  );

  return { updateLiveState, writeSystemLog };
}
