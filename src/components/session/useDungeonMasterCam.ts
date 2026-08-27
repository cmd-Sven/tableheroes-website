/**
 * useDungeonMasterCam — Local webcam MediaStream lifecycle for the GM Overlord-Cam.
 * Keeps the stream alive across view switches; cleans up only on unmount / disable.
 * Stream is published to other session participants via LiveSessionWebcamProvider (WebRTC).
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  bindWebcamVideoElement,
  GM_WEBCAM_VIDEO_CONSTRAINTS,
} from "@/src/lib/session/avatar-webcam-webrtc";

export type DungeonMasterCamPhase =
  | "idle"
  | "starting"
  | "active"
  | "denied"
  | "error";

const TITLE_STORAGE_PREFIX = "th:dm-cam-title:";
const MINIMIZED_STORAGE_PREFIX = "th:dm-cam-minimized:";
const DEFAULT_TITLE = "Overlord";

function storageKey(prefix: string, userId: string | null | undefined): string {
  return `${prefix}${userId?.trim() || "anon"}`;
}

function readStoredTitle(userId: string | null | undefined): string {
  if (typeof window === "undefined") return DEFAULT_TITLE;
  try {
    const raw = window.localStorage.getItem(storageKey(TITLE_STORAGE_PREFIX, userId));
    const trimmed = raw?.trim();
    return trimmed || DEFAULT_TITLE;
  } catch {
    return DEFAULT_TITLE;
  }
}

function readStoredMinimized(userId: string | null | undefined): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(storageKey(MINIMIZED_STORAGE_PREFIX, userId)) === "1";
  } catch {
    return false;
  }
}

export type UseDungeonMasterCamOptions = {
  /** When false (non-GM / session leave), stream is torn down. */
  enabled: boolean;
  userId?: string | null;
};

export function useDungeonMasterCam({ enabled, userId }: UseDungeonMasterCamOptions) {
  const [phase, setPhase] = useState<DungeonMasterCamPhase>("idle");
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [title, setTitleState] = useState(DEFAULT_TITLE);
  const [isMinimized, setIsMinimizedState] = useState(false);
  const [prefsReady, setPrefsReady] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const startInFlightRef = useRef(false);

  useEffect(() => {
    setTitleState(readStoredTitle(userId));
    setIsMinimizedState(readStoredMinimized(userId));
    setPrefsReady(true);
  }, [userId]);

  const attachVideo = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    bindWebcamVideoElement(el, streamRef.current);
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    bindWebcamVideoElement(videoRef.current, null);
  }, []);

  const startCamera = useCallback(async () => {
    if (!enabled || startInFlightRef.current) return;
    if (streamRef.current) {
      setPhase("active");
      setErrorHint(null);
      attachVideo(videoRef.current);
      return;
    }

    startInFlightRef.current = true;
    setPhase("starting");
    setErrorHint(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: GM_WEBCAM_VIDEO_CONSTRAINTS,
        audio: false,
      });

      if (!enabled) {
        stream.getTracks().forEach((t) => t.stop());
        setPhase("idle");
        return;
      }

      streamRef.current = stream;
      attachVideo(videoRef.current);
      setPhase("active");
    } catch (e: unknown) {
      stopStream();
      const name =
        e && typeof e === "object" && "name" in e
          ? String((e as { name?: string }).name)
          : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setPhase("denied");
        setErrorHint(
          "Kamerazugriff verweigert. Bitte in den Browser-Einstellungen erlauben und erneut versuchen.",
        );
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setPhase("error");
        setErrorHint("Keine Kamera gefunden. Bitte ein Gerät anschließen.");
      } else {
        setPhase("error");
        setErrorHint(
          e instanceof Error && e.message
            ? e.message
            : "Kamera konnte nicht gestartet werden.",
        );
      }
    } finally {
      startInFlightRef.current = false;
    }
  }, [attachVideo, enabled, stopStream]);

  const stopCamera = useCallback(() => {
    stopStream();
    setPhase("idle");
    setErrorHint(null);
  }, [stopStream]);

  const setTitle = useCallback(
    (next: string) => {
      const trimmed = next.slice(0, 48);
      setTitleState(trimmed);
      try {
        window.localStorage.setItem(
          storageKey(TITLE_STORAGE_PREFIX, userId),
          trimmed.trim() || DEFAULT_TITLE,
        );
      } catch {
        /* ignore quota / private mode */
      }
    },
    [userId],
  );

  const setMinimized = useCallback(
    (next: boolean) => {
      setIsMinimizedState(next);
      try {
        window.localStorage.setItem(
          storageKey(MINIMIZED_STORAGE_PREFIX, userId),
          next ? "1" : "0",
        );
      } catch {
        /* ignore */
      }
    },
    [userId],
  );

  // Tear down when GM mode ends / session provider unmounts.
  useEffect(() => {
    if (!enabled) {
      stopStream();
      setPhase("idle");
      setErrorHint(null);
    }
  }, [enabled, stopStream]);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  const getStream = useCallback(() => streamRef.current, []);

  return {
    phase,
    errorHint,
    title,
    setTitle,
    isMinimized,
    setMinimized,
    prefsReady,
    /** Live local preview stream — ready for a future peer broadcast adapter. */
    stream: streamRef.current,
    getStream,
    videoRefCallback: attachVideo,
    startCamera,
    stopCamera,
  };
}

export type DungeonMasterCamApi = ReturnType<typeof useDungeonMasterCam>;
