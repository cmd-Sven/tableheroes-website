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
  AVATAR_WEBCAM_MASTER_BROADCAST,
  AVATAR_WEBCAM_MASTER_EVENT,
  AVATAR_WEBCAM_MODE_BROADCAST,
  AVATAR_WEBCAM_MODE_EVENT,
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
  const modesBeforeMasterOffRef = useRef<ModesMap>({});

  const getMode = useCallback(
    (characterId: string): AvatarWebcamDisplayMode => {
      if (!masterEnabled) return "avatar";
      return modes[characterId] === "webcam" ? "webcam" : "avatar";
    },
    [masterEnabled, modes],
  );

  const applyModeLocal = useCallback((characterId: string, mode: AvatarWebcamDisplayMode) => {
    setModes((prev) => {
      if (prev[characterId] === mode) return prev;
      return { ...prev, [characterId]: mode };
    });
  }, []);

  const setCharacterMode = useCallback(
    (characterId: string, mode: AvatarWebcamDisplayMode) => {
      applyModeLocal(characterId, mode);
      void liveChannelRef.current?.send({
        type: "broadcast",
        event: AVATAR_WEBCAM_MODE_BROADCAST,
        payload: {
          characterId,
          mode,
          senderId: userId,
        } satisfies AvatarWebcamModeDetail,
      });
    },
    [applyModeLocal, liveChannelRef, userId],
  );

  const toggleCharacterMode = useCallback(
    (characterId: string) => {
      const next: AvatarWebcamDisplayMode =
        getMode(characterId) === "webcam" ? "avatar" : "webcam";
      if (next === "webcam" && !masterEnabled) {
        setMasterEnabled(true);
        const restored = { ...modesBeforeMasterOffRef.current };
        restored[characterId] = "webcam";
        setModes(restored);
        void liveChannelRef.current?.send({
          type: "broadcast",
          event: AVATAR_WEBCAM_MASTER_BROADCAST,
          payload: { enabled: true, senderId: userId } satisfies AvatarWebcamMasterDetail,
        });
        void liveChannelRef.current?.send({
          type: "broadcast",
          event: AVATAR_WEBCAM_MODE_BROADCAST,
          payload: {
            characterId,
            mode: "webcam",
            senderId: userId,
          } satisfies AvatarWebcamModeDetail,
        });
        return;
      }
      setCharacterMode(characterId, next);
    },
    [getMode, liveChannelRef, masterEnabled, setCharacterMode, userId],
  );

  const setAllWebcamsEnabled = useCallback(
    (enabled: boolean) => {
      if (!enabled) {
        setModes((prev) => {
          modesBeforeMasterOffRef.current = { ...prev };
          const next: ModesMap = {};
          for (const id of Object.keys(prev)) {
            next[id] = "avatar";
          }
          return next;
        });
        setMasterEnabled(false);
      } else {
        setMasterEnabled(true);
        setModes({ ...modesBeforeMasterOffRef.current });
      }
      void liveChannelRef.current?.send({
        type: "broadcast",
        event: AVATAR_WEBCAM_MASTER_BROADCAST,
        payload: { enabled, senderId: userId } satisfies AvatarWebcamMasterDetail,
      });
    },
    [liveChannelRef, userId],
  );

  useEffect(() => {
    const onMode = (ev: Event) => {
      const detail = (ev as CustomEvent<AvatarWebcamModeDetail>).detail;
      if (!detail?.characterId) return;
      if (detail.remote && detail.senderId != null && String(detail.senderId) === userId) {
        return;
      }
      applyModeLocal(detail.characterId, detail.mode === "webcam" ? "webcam" : "avatar");
    };
    const onMaster = (ev: Event) => {
      const detail = (ev as CustomEvent<AvatarWebcamMasterDetail>).detail;
      if (!detail) return;
      if (detail.remote && detail.senderId != null && String(detail.senderId) === userId) {
        return;
      }
      if (detail.enabled === false) {
        setModes((prev) => {
          modesBeforeMasterOffRef.current = { ...prev };
          const next: ModesMap = {};
          for (const id of Object.keys(prev)) {
            next[id] = "avatar";
          }
          return next;
        });
        setMasterEnabled(false);
      } else {
        setMasterEnabled(true);
        setModes({ ...modesBeforeMasterOffRef.current });
      }
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
