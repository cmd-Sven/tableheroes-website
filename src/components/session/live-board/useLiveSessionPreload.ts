/**
 * useLiveSessionPreload — Asset preload manifest, cinematic loading gate, and token warm-cache.
 */
"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { usePreloadSessionAssets } from "@/src/hooks/usePreloadSessionAssets";
import type { CampaignNpc, LiveState, PartyCharacter } from "./live-session-types";
import type { SessionBattlemap, SessionBattlemapToken } from "@/src/lib/session/battlemap-types";

/** Einmal pro Account. Gäste ohne Account teilen sich den Key auf diesem Browser. */
const LIVE_SESSION_INTRO_SEEN_KEY = "th:live-session-intro-seen";

function liveSessionIntroSeenKey(userId: string | null | undefined, isGuest: boolean): string {
  const id = userId?.trim();
  if (!isGuest && id) return `${LIVE_SESSION_INTRO_SEEN_KEY}:${id}`;
  return LIVE_SESSION_INTRO_SEEN_KEY;
}

function readLiveSessionIntroSeen(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function markLiveSessionIntroSeen(key: string): void {
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    /* Privater Modus oder voller Speicher — Intro darf trotzdem weiterlaufen. */
  }
}

type IntroGate = "pending" | "play" | "skip";

type Params = {
  liveState: LiveState | null;
  activeBattlemap: SessionBattlemap | null;
  allCampaignNpcs: CampaignNpc[];
  partyCharacters: PartyCharacter[];
  battlemapTokens: SessionBattlemapToken[];
  userId?: string | null;
  isGuest?: boolean;
};

export function useLiveSessionPreload({
  liveState,
  activeBattlemap,
  allCampaignNpcs,
  partyCharacters,
  battlemapTokens,
  userId,
  isGuest = false,
}: Params) {
  const preloadManifest = useMemo(() => {
    if (!liveState) return null;
    return {
      backgroundUrl: liveState.background_url || null,
      battlemapUrl: activeBattlemap?.image_url || null,
      npcPortraits: (liveState.visible_npc_ids ?? [])
        .map((id: string) => allCampaignNpcs.find((n) => String(n.id) === id)?.image_url)
        .filter(Boolean) as string[],
      characterPortraits: partyCharacters
        .map((c) => c.avatar_url)
        .filter(Boolean) as string[],
      weatherIcons: true,
      diceAssets: true,
    };
  }, [liveState, activeBattlemap, allCampaignNpcs, partyCharacters]);

  const preload = usePreloadSessionAssets(preloadManifest);
  const [preloadDismissed, setPreloadDismissed] = useState(false);
  const [introGate, setIntroGate] = useState<IntroGate>("pending");
  const introSeenKey = liveSessionIntroSeenKey(userId, isGuest);

  useLayoutEffect(() => {
    if (readLiveSessionIntroSeen(introSeenKey)) {
      setIntroGate("skip");
      return;
    }

    setIntroGate("play");
    // Nach dem Effect schreiben, damit Strict-Mode-Remounts das Video nicht überspringen.
    const timeoutId = window.setTimeout(() => {
      markLiveSessionIntroSeen(introSeenKey);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [introSeenKey]);

  /** Erstes Mal: Video bis „Abenteuer fortsetzen“. Danach direkt der Tisch. */
  const showLoadingScreen = introGate === "play" && !preloadDismissed;
  const rememberLiveSessionIntro = useCallback(() => {
    markLiveSessionIntroSeen(introSeenKey);
  }, [introSeenKey]);
  const dismissLoadingScreen = useCallback(() => {
    markLiveSessionIntroSeen(introSeenKey);
    setPreloadDismissed(true);
  }, [introSeenKey]);

  useEffect(() => {
    if (!preload.done || battlemapTokens.length === 0) return;
    const urls = new Set<string>();
    for (const t of battlemapTokens) {
      if (t.image_url) urls.add(t.image_url);
    }
    for (const url of urls) {
      const img = new window.Image();
      img.decoding = "async";
      img.src = url;
    }
  }, [preload.done, battlemapTokens]);

  return { preload, showLoadingScreen, dismissLoadingScreen, rememberLiveSessionIntro };
}
