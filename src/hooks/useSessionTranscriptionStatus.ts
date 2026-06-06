"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient as createBrowserSupabase } from "@/src/lib/supabase/client";
import type { TranscriptionStatus } from "@/src/lib/session-chronicle/constants";

export function useSessionTranscriptionStatus(sessionId: string, enabled: boolean) {
  const [status, setStatus] = useState<TranscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const applyStatus = useCallback((value: unknown) => {
    if (
      value === "recording" ||
      value === "paused" ||
      value === "stopped" ||
      value === "idle"
    ) {
      setStatus(value);
      return;
    }
    setStatus(null);
  }, []);

  const loadFromApi = useCallback(async () => {
    if (!enabled || !sessionId) return;
    try {
      const res = await fetch(
        `/api/sessions/${encodeURIComponent(sessionId)}/transcription/status`,
        { credentials: "same-origin" },
      );
      const data = (await res.json().catch(() => ({}))) as {
        transcriptionSession?: { status?: string };
      };
      if (res.ok) {
        applyStatus(data.transcriptionSession?.status ?? null);
      }
    } catch {
      /* fallback below */
    }
  }, [applyStatus, enabled, sessionId]);

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
      applyStatus((data as { status?: string }).status);
    } else {
      await loadFromApi();
    }
    setLoading(false);
  }, [applyStatus, enabled, loadFromApi, sessionId]);

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
          applyStatus(row?.status ?? null);
        },
      )
      .subscribe();

    const pollId = window.setInterval(() => {
      void loadFromApi();
    }, 5000);

    return () => {
      window.clearInterval(pollId);
      void supabase.removeChannel(channel);
    };
  }, [enabled, sessionId, load, loadFromApi, applyStatus]);

  return { status, loading, reload: load };
}
