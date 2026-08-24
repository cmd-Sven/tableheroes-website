/**
 * useLiveSessionLiveStateBootstrap — Initial live-state load, refresh, and background sync.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureSessionPrepLiveState } from "@/src/app/dashboard/campaigns/[id]/session-actions";
import type { LiveState } from "./live-session-types";
import { isViableLiveState, normalizeLiveRow } from "./live-session-normalize";

type Params = {
  sessionId: string;
  isGM: boolean;
  supabase: SupabaseClient;
  initialLiveState: LiveState | null | undefined;
};

export function useLiveSessionLiveStateBootstrap({
  sessionId,
  isGM,
  supabase,
  initialLiveState,
}: Params) {
  const viableInitial =
    initialLiveState != null && isViableLiveState(initialLiveState, sessionId);

  const [liveState, setLiveState] = useState<LiveState | null>(
    viableInitial ? normalizeLiveRow(initialLiveState as unknown) : null,
  );
  const liveStateRef = useRef<LiveState | null>(
    viableInitial ? normalizeLiveRow(initialLiveState as unknown) : null,
  );
  const [isLiveStateInitializing, setIsLiveStateInitializing] = useState(
    !viableInitial && isGM,
  );
  const [liveStateLoadError, setLiveStateLoadError] = useState<string | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(
    viableInitial ? initialLiveState?.background_url || null : null,
  );

  useEffect(() => {
    liveStateRef.current = liveState;
  }, [liveState]);

  useEffect(() => {
    setBackgroundUrl(initialLiveState?.background_url || null);
  }, [initialLiveState?.background_url]);

  const resolveLiveStateBase = useCallback(async (): Promise<LiveState | null> => {
    setLiveStateLoadError(null);
    if (
      liveStateRef.current &&
      isViableLiveState(liveStateRef.current, sessionId)
    ) {
      setIsLiveStateInitializing(false);
      return normalizeLiveRow(liveStateRef.current);
    }

    if (isGM) {
      setIsLiveStateInitializing(true);
    }

    const { data, error } = await supabase
      .from("session_live_states")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (error) {
      console.error("[LiveSessionBoard] session_live_states:", error.message);
      setLiveStateLoadError(error.message);
    }

    if (data) {
      const next = normalizeLiveRow(data);
      liveStateRef.current = next;
      setLiveState(next);
      setBackgroundUrl(next.background_url || null);
      setIsLiveStateInitializing(false);
      setLiveStateLoadError(null);
      return next;
    }

    if (isGM) {
      try {
        const row = await ensureSessionPrepLiveState(sessionId);
        if (row) {
          const next = normalizeLiveRow(row);
          liveStateRef.current = next;
          setLiveState(next);
          setBackgroundUrl(next.background_url || null);
          setIsLiveStateInitializing(false);
          setLiveStateLoadError(null);
          return next;
        }
        setLiveStateLoadError(
          "Live-State konnte nicht automatisch angelegt werden.",
        );
      } catch (e) {
        console.error("[resolveLiveStateBase] ensureSessionPrepLiveState", e);
        setLiveStateLoadError(
          e instanceof Error
            ? e.message
            : "Live-State konnte nicht automatisch angelegt werden.",
        );
      } finally {
        setIsLiveStateInitializing(false);
      }
    } else {
      setIsLiveStateInitializing(false);
      setLiveStateLoadError(
        "Der Session-Zustand ist noch nicht bereit. Bitte warte, bis der Spielleiter die Session vorbereitet hat.",
      );
    }

    return null;
  }, [sessionId, isGM, supabase]);

  const refreshLiveState = useCallback(async () => {
    const { data, error } = await supabase
      .from("session_live_states")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();
    if (!error && data) {
      const next = normalizeLiveRow(data);
      liveStateRef.current = next;
      setLiveState(next);
      setBackgroundUrl(next.background_url || null);
    }
  }, [sessionId, supabase]);

  useEffect(() => {
    if (viableInitial) return;
    void resolveLiveStateBase();
  }, [sessionId, viableInitial, resolveLiveStateBase]);

  return {
    viableInitial,
    liveState,
    setLiveState,
    liveStateRef,
    isLiveStateInitializing,
    liveStateLoadError,
    backgroundUrl,
    setBackgroundUrl,
    resolveLiveStateBase,
    refreshLiveState,
  };
}
