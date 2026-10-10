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
import { dispatchSessionActivityPosted } from "@/src/lib/session/session-activity-bridge";
import {
  dispatchSessionLivePatch,
  forgetLivePatch,
  rememberLivePatch,
} from "@/src/lib/session/live-state-patch";
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
  resolveLiveStateBase,
  startTransition,
}: Params) {
  const writeSystemLog = useCallback(
    (type: string, text: string) => {
      if (!isGM || !text.trim()) return;
      void createSystemLog(sessionId, type, text)
        .then((entry) => {
          if (!entry?.id || !entry.text) return;
          dispatchSessionActivityPosted({
            entry: {
              id: String(entry.id),
              at: String(entry.at),
              text: String(entry.text),
              type: String(entry.type ?? type),
              author_name: entry.author_name != null ? String(entry.author_name) : "System",
            },
          });
        })
        .catch((error) => {
          console.error("[LiveSessionBoard] createSystemLog:", error);
        });
    },
    [isGM, sessionId],
  );

  /** `baseOverride`: z. B. direkt nach resolveLiveStateBase, wenn React-State noch nachzieht */
  const updateLiveState = useCallback(
    (patch: Partial<LiveState>, baseOverride?: LiveState) => {
      const known = baseOverride ?? liveStateRef.current;
      let snapshot: LiveState | null = null;
      if (known) {
        snapshot = liveStateRef.current ?? known;
        const next = { ...snapshot, ...patch };
        liveStateRef.current = next;
        setLiveState(next);
        if (Object.prototype.hasOwnProperty.call(patch, "background_url")) {
          setBackgroundUrl(next.background_url || null);
        }
        rememberLivePatch(patch);
        dispatchSessionLivePatch({ patch, sentAt: Date.now() });
      }

      startTransition(async () => {
        try {
          let base = known ?? liveStateRef.current;
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

          if (!known) {
            const next = { ...base, ...patch };
            liveStateRef.current = next;
            setLiveState(next);
            if (Object.prototype.hasOwnProperty.call(patch, "background_url")) {
              setBackgroundUrl(next.background_url || null);
            }
            rememberLivePatch(patch);
            dispatchSessionLivePatch({ patch, sentAt: Date.now() });
            snapshot = base;
          }

          const { error } = await (supabase.from("session_live_states") as any)
            .update(patch)
            .eq("session_id", sessionId);

          if (error) {
            console.error("Update Live State Error:", error);
            forgetLivePatch(Object.keys(patch));
            if (snapshot) {
              liveStateRef.current = snapshot;
              setLiveState(snapshot);
              if (Object.prototype.hasOwnProperty.call(patch, "background_url")) {
                setBackgroundUrl(snapshot.background_url || null);
              }
            }
            alert(error.message);
            return;
          }

        } catch (err: any) {
          console.error(err);
          alert(err.message || "Fehler beim Aktualisieren des Session-Zustands.");
        }
      });
    },
    [
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
