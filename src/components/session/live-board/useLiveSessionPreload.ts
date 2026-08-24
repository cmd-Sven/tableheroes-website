/**
 * useLiveSessionPreload — Asset preload manifest, cinematic loading gate, and token warm-cache.
 */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePreloadSessionAssets } from "@/src/hooks/usePreloadSessionAssets";
import type { CampaignNpc, LiveState, PartyCharacter } from "./live-session-types";
import type { SessionBattlemap, SessionBattlemapToken } from "@/src/lib/session/battlemap-types";

type Params = {
  liveState: LiveState | null;
  activeBattlemap: SessionBattlemap | null;
  allCampaignNpcs: CampaignNpc[];
  partyCharacters: PartyCharacter[];
  battlemapTokens: SessionBattlemapToken[];
};

export function useLiveSessionPreload({
  liveState,
  activeBattlemap,
  allCampaignNpcs,
  partyCharacters,
  battlemapTokens,
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

  /** Cinematic intro stays until the player explicitly continues after the video. */
  const showLoadingScreen = !preloadDismissed;
  const dismissLoadingScreen = useCallback(() => {
    setPreloadDismissed(true);
  }, []);

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

  return { preload, showLoadingScreen, dismissLoadingScreen };
}
