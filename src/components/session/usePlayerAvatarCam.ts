/**
 * usePlayerAvatarCam — Local webcam for a party avatar slot.
 * Display mode is session-synced (GM can toggle any character / master-mute all).
 * Only the owning player starts getUserMedia; mood/token state never replaces the feed.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AvatarWebcamDisplayMode } from "@/src/lib/session/avatar-webcam-bridge";
import { usePlayerAvatarCamSessionOptional } from "./PlayerAvatarCamSessionProvider";

export type PlayerAvatarCamPhase =
  | "idle"
  | "starting"
  | "active"
  | "denied"
  | "error";

export type UsePlayerAvatarCamOptions = {
  characterId: string;
  /** This client owns the character and may capture the local camera. */
  isCameraOwner: boolean;
  /** Owner or GM may change avatar↔webcam mode. */
  canControl: boolean;
};

export function usePlayerAvatarCam({
  characterId,
  isCameraOwner,
  canControl,
}: UsePlayerAvatarCamOptions) {
  const session = usePlayerAvatarCamSessionOptional();
  const [phase, setPhase] = useState<PlayerAvatarCamPhase>("idle");
  const [errorHint, setErrorHint] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const startInFlightRef = useRef(false);

  const displayMode: AvatarWebcamDisplayMode = session
    ? session.getMode(characterId)
    : "avatar";

  const attachVideo = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current) {
      el.srcObject = streamRef.current;
      void el.play().catch(() => {
        /* autoplay may need a gesture; stream still live */
      });
    }
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (!isCameraOwner || startInFlightRef.current) return;
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
        video: {
          facingMode: "user",
          width: { ideal: 480 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      if (!isCameraOwner) {
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
          "Kamerazugriff verweigert. Bitte in den Browser-Einstellungen erlauben.",
        );
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setPhase("error");
        setErrorHint("Keine Kamera gefunden.");
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
  }, [attachVideo, isCameraOwner, stopStream]);

  const stopCamera = useCallback(() => {
    stopStream();
    setPhase("idle");
    setErrorHint(null);
  }, [stopStream]);

  const showWebcam = useCallback(() => {
    if (!canControl || !session) return;
    session.setCharacterMode(characterId, "webcam");
  }, [canControl, characterId, session]);

  const showAvatar = useCallback(() => {
    if (!canControl || !session) return;
    session.setCharacterMode(characterId, "avatar");
  }, [canControl, characterId, session]);

  const toggleDisplayMode = useCallback(() => {
    if (!canControl || !session) return;
    session.toggleCharacterMode(characterId);
  }, [canControl, characterId, session]);

  // Owner starts/stops camera from session display mode.
  useEffect(() => {
    if (!isCameraOwner) {
      stopCamera();
      return;
    }
    if (displayMode === "webcam") {
      void startCamera();
    } else {
      stopCamera();
    }
  }, [displayMode, isCameraOwner, startCamera, stopCamera]);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  const showingWebcam =
    isCameraOwner && displayMode === "webcam" && phase === "active";

  /** Webcam mode requested for this slot (owner may still be connecting / remote viewers). */
  const webcamModeActive = displayMode === "webcam";

  return {
    phase,
    errorHint,
    displayMode,
    showingWebcam,
    webcamModeActive,
    videoRefCallback: attachVideo,
    showWebcam,
    showAvatar,
    toggleDisplayMode,
    startCamera,
    stopCamera,
  };
}

export type PlayerAvatarCamApi = ReturnType<typeof usePlayerAvatarCam>;
