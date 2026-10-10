/**
 * PlayerAvatarCamSessionProvider — Coordinates avatar webcam modes across the live session.
 * GM can toggle any character and master-mute all webcams; owners start/stop local MediaStreams.
 */
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  AVATAR_WEBCAM_MASTER_EVENT,
  AVATAR_WEBCAM_MODE_EVENT,
  dispatchAvatarWebcamMaster,
  dispatchAvatarWebcamMode,
  type AvatarWebcamDisplayMode,
  type AvatarWebcamMasterDetail,
  type AvatarWebcamModeDetail,
} from "@/src/lib/session/avatar-webcam-bridge";

type ModesMap = Record<string, AvatarWebcamDisplayMode>;

type PlayerAvatarCamSessionApi = {
  masterEnabled: boolean;
  getMode: (characterId: string) => AvatarWebcamDisplayMode;
  setCharacterMode: (characterId: string, mode: AvatarWebcamDisplayMode) => void;
  toggleCharacterMode: (characterId: string) => void;
  setAllWebcamsEnabled: (enabled: boolean) => void;
};

const PlayerAvatarCamSessionContext = createContext<PlayerAvatarCamSessionApi | null>(
  null,
);

type Props = {
  children: ReactNode;
  userId: string;
  liveChannelRef: MutableRefObject<RealtimeChannel | null>;
};

export function PlayerAvatarCamSessionProvider({
  children,
  userId,
  liveChannelRef,
}: Props) {
  const [modes, setModes] = useState<ModesMap>({});
  const [masterEnabled, setMasterEnabled] = useState(true);
  const modesRef = useRef<ModesMap>({});
  const masterRef = useRef(true);
  const modeSeqRef = useRef<Record<string, number>>({});
  const masterSeqRef = useRef(0);
  // Kanal bleibt am Provider, der Versand läuft über das Realtime-Hook (Outbox).
  void liveChannelRef;

  const getMode = useCallback(
    (characterId: string): AvatarWebcamDisplayMode => {
      if (!masterEnabled) return "avatar";
      return modes[characterId] === "webcam" ? "webcam" : "avatar";
    },
    [masterEnabled, modes],
  );

  const applyModeLocal = useCallback((characterId: string, mode: AvatarWebcamDisplayMode, seq?: number) => {
    if (seq != null) {
      const prevSeq = modeSeqRef.current[characterId] ?? 0;
      if (seq < prevSeq) return;
      modeSeqRef.current[characterId] = seq;
    }
    if (modesRef.current[characterId] === mode) return;
    const next = { ...modesRef.current, [characterId]: mode };
    modesRef.current = next;
    setModes(next);
  }, []);

  const publishMode = useCallback(
    (characterId: string, mode: AvatarWebcamDisplayMode) => {
      const seq = (modeSeqRef.current[characterId] ?? 0) + 1;
      applyModeLocal(characterId, mode, seq);
      dispatchAvatarWebcamMode({
        characterId,
        mode,
        senderId: userId,
        seq,
        remote: false,
      });
    },
    [applyModeLocal, userId],
  );

  const publishMaster = useCallback(
    (enabled: boolean) => {
      const seq = masterSeqRef.current + 1;
      masterSeqRef.current = seq;
      masterRef.current = enabled;
      setMasterEnabled(enabled);
      dispatchAvatarWebcamMaster({
        enabled,
        senderId: userId,
        seq,
        remote: false,
      });
    },
    [userId],
  );

  const setCharacterMode = useCallback(
    (characterId: string, mode: AvatarWebcamDisplayMode) => {
      publishMode(characterId, mode);
    },
    [publishMode],
  );

  const toggleCharacterMode = useCallback(
    (characterId: string) => {
      const showing: AvatarWebcamDisplayMode =
        masterRef.current && modesRef.current[characterId] === "webcam" ? "webcam" : "avatar";
      const next: AvatarWebcamDisplayMode = showing === "webcam" ? "avatar" : "webcam";
      if (next === "webcam" && !masterRef.current) {
        publishMaster(true);
      }
      publishMode(characterId, next);
    },
    [publishMaster, publishMode],
  );

  const setAllWebcamsEnabled = useCallback(
    (enabled: boolean) => {
      publishMaster(enabled);
    },
    [publishMaster],
  );

  useEffect(() => {
    const onMode = (ev: Event) => {
      const detail = (ev as CustomEvent<AvatarWebcamModeDetail>).detail;
      if (!detail?.characterId || !detail.remote) return;
      if (detail.senderId != null && String(detail.senderId) === userId) return;
      applyModeLocal(
        detail.characterId,
        detail.mode === "webcam" ? "webcam" : "avatar",
        typeof detail.seq === "number" ? detail.seq : undefined,
      );
    };
    const onMaster = (ev: Event) => {
      const detail = (ev as CustomEvent<AvatarWebcamMasterDetail>).detail;
      if (!detail?.remote) return;
      if (detail.senderId != null && String(detail.senderId) === userId) return;
      if (typeof detail.seq === "number") {
        if (detail.seq < masterSeqRef.current) return;
        masterSeqRef.current = detail.seq;
      }
      const enabled = detail.enabled !== false;
      masterRef.current = enabled;
      setMasterEnabled(enabled);
    };
    window.addEventListener(AVATAR_WEBCAM_MODE_EVENT, onMode);
    window.addEventListener(AVATAR_WEBCAM_MASTER_EVENT, onMaster);
    return () => {
      window.removeEventListener(AVATAR_WEBCAM_MODE_EVENT, onMode);
      window.removeEventListener(AVATAR_WEBCAM_MASTER_EVENT, onMaster);
    };
  }, [applyModeLocal, userId]);

  const api = useMemo<PlayerAvatarCamSessionApi>(
    () => ({
      masterEnabled,
      getMode,
      setCharacterMode,
      toggleCharacterMode,
      setAllWebcamsEnabled,
    }),
    [getMode, masterEnabled, setAllWebcamsEnabled, setCharacterMode, toggleCharacterMode],
  );

  return (
    <PlayerAvatarCamSessionContext.Provider value={api}>
      {children}
    </PlayerAvatarCamSessionContext.Provider>
  );
}

export function usePlayerAvatarCamSession(): PlayerAvatarCamSessionApi {
  const ctx = useContext(PlayerAvatarCamSessionContext);
  if (!ctx) {
    throw new Error(
      "usePlayerAvatarCamSession must be used within PlayerAvatarCamSessionProvider",
    );
  }
  return ctx;
}

/** Optional hook when provider may be absent (tests / isolated previews). */
export function usePlayerAvatarCamSessionOptional(): PlayerAvatarCamSessionApi | null {
  return useContext(PlayerAvatarCamSessionContext);
}
