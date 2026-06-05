"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient as createBrowserSupabase } from "@/src/lib/supabase/client";
import type { TranscriptionStatus } from "@/src/lib/session-chronicle/constants";

export function useSessionTranscriptionStatus(sessionId: string, enabled: boolean) {
  const [status, setStatus] = useState<TranscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!enabled || !sessionId) {
      setStatus(null);
      setLoading(false);
      return;
    }
    const supabase = createBrowserSupabase();
    const { data, error } = await (supabase as any)
      .from("session_transcription_sessions")
      .select("status")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (!error && data) {
      const s = (data as { status?: string }).status;
      if (
        s === "recording" ||
        s === "paused" ||
        s === "stopped" ||
        s === "idle"
      ) {
        setStatus(s);
      }
    } else if (!data) {
      setStatus(null);
    }
    setLoading(false);
  }, [enabled, sessionId]);

  useEffect(() => {
    if (!enabled || !sessionId) return;
    setLoading(true);
    void load();

    const supabase = createBrowserSupabase();
    const channel = supabase
      .channel(`transcription-status-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_transcription_sessions",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const row = payload.new as { status?: string } | null;
          const s = row?.status;
          if (
            s === "recording" ||
            s === "paused" ||
            s === "stopped" ||
            s === "idle"
          ) {
            setStatus(s);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, sessionId, load]);

  return { status, loading, reload: load };
}
