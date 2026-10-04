"use client";

/**
 * LiveSessionLoadingScreen — Cinematic intro video gate before the live board unlocks.
 * A stalled, failed, or never-ending video must not keep the table locked.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/** Public URL for the session intro cinematic (file lives in `public/videos/`). */
export const LIVE_SESSION_INTRO_VIDEO_SRC = "/videos/intro-session.mp4";

const OVERLAY_APPEAR_AT_SEC = 7;
/** Kein Fortschritt / `stalled` / `waiting` länger als das: Fortsetzen freigeben. */
const STALL_UNLOCK_MS = 3500;
/** Nach der bekannten Dauer, falls `ended` nicht kommt. */
const ENDED_GRACE_MS = 1500;
/** Fallback, solange `duration` noch unbekannt ist (Intro liegt bei ~10s). */
const UNKNOWN_DURATION_CAP_MS = 12000;
const WATCHDOG_MS = 400;

export type PreloadStep = {
  id: string;
  label: string;
  icon: "shield" | "swords" | "map" | "users" | "dices";
  status: "pending" | "loading" | "done" | "error";
};

type Props = {
  characterName: string;
  onContinue: () => void;
  /** Einmal-Flag setzen, sobald das Intro zu Ende ist oder übersprungen wird. */
  onIntroSettled?: () => void;
};

function endedFallbackMs(duration: number): number {
  if (Number.isFinite(duration) && duration >= 1) return duration * 1000 + ENDED_GRACE_MS;
  return UNKNOWN_DURATION_CAP_MS;
}

function reachedNaturalEnd(video: HTMLVideoElement): boolean {
  if (video.ended) return true;
  const duration = video.duration;
  if (!Number.isFinite(duration) || duration < 1) return false;
  return video.currentTime >= duration - 0.5;
}

export function LiveSessionLoadingScreen({ characterName, onContinue, onIntroSettled }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const continueButtonRef = useRef<HTMLButtonElement | null>(null);
  const overlayShownRef = useRef(false);
  const finishedRef = useRef(false);
  const onIntroSettledRef = useRef(onIntroSettled);
  onIntroSettledRef.current = onIntroSettled;

  const [showOverlay, setShowOverlay] = useState(false);
  const [canContinue, setCanContinue] = useState(false);
  const [releasedEarly, setReleasedEarly] = useState(false);

  const revealOverlay = useCallback(() => {
    if (overlayShownRef.current) return;
    overlayShownRef.current = true;
    setShowOverlay(true);
  }, []);

  const releaseContinue = useCallback(
    (early: boolean) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      revealOverlay();
      setReleasedEarly(early);
      setCanContinue(true);
      onIntroSettledRef.current?.();
    },
    [revealOverlay],
  );

  useEffect(() => {
    if (!canContinue) return;
    continueButtonRef.current?.focus();
  }, [canContinue]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let disposed = false;
    let endedTimer: number | null = null;
    let watchdog: number | null = null;
    const startedAt = performance.now();
    let lastTime = video.currentTime;
    let lastAdvanceAt = startedAt;
    let stallMarkedAt: number | null = null;

    const unlock = (early: boolean) => {
      if (disposed || finishedRef.current) return;
      if (early) {
        try {
          video.pause();
        } catch {
          /* Decoder hängt — Pause ist nur ein Versuch, den Overlay-Layer loszuwerden. */
        }
      }
      releaseContinue(early);
    };

    const noteAdvance = (time: number) => {
      if (time <= lastTime + 0.05) return;
      lastTime = time;
      lastAdvanceAt = performance.now();
      stallMarkedAt = null;
    };

    const armEndedFallback = () => {
      if (endedTimer != null) window.clearTimeout(endedTimer);
      const remaining = Math.max(0, endedFallbackMs(video.duration) - (performance.now() - startedAt));
      endedTimer = window.setTimeout(() => {
        endedTimer = null;
        unlock(!reachedNaturalEnd(video));
      }, remaining);
    };

    const onTimeUpdate = () => {
      if (video.currentTime >= OVERLAY_APPEAR_AT_SEC) revealOverlay();
      noteAdvance(video.currentTime);
      if (reachedNaturalEnd(video)) unlock(false);
    };

    const onEnded = () => unlock(false);
    const onError = () => unlock(true);
    const onStallSignal = () => {
      if (stallMarkedAt == null) stallMarkedAt = performance.now();
    };
    const onPlaying = () => {
      stallMarkedAt = null;
      noteAdvance(video.currentTime);
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ended", onEnded);
    video.addEventListener("error", onError);
    video.addEventListener("stalled", onStallSignal);
    video.addEventListener("waiting", onStallSignal);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("loadedmetadata", armEndedFallback);
    video.addEventListener("durationchange", armEndedFallback);

    if (video.error) unlock(true);
    armEndedFallback();

    watchdog = window.setInterval(() => {
      if (disposed || finishedRef.current) return;
      if (video.error) {
        unlock(true);
        return;
      }
      if (reachedNaturalEnd(video)) {
        unlock(false);
        return;
      }
      if (video.currentTime + 0.5 < lastTime) {
        unlock(false);
        return;
      }
      if (video.currentTime >= OVERLAY_APPEAR_AT_SEC) revealOverlay();
      noteAdvance(video.currentTime);

      const now = performance.now();
      const stalledTooLong = stallMarkedAt != null && now - stallMarkedAt >= STALL_UNLOCK_MS;
      const noProgress = now - lastAdvanceAt >= STALL_UNLOCK_MS;
      if (stalledTooLong || noProgress) unlock(true);
    }, WATCHDOG_MS);

    video.playsInline = true;
    video.loop = false;

    const startPlayback = async () => {
      const attempt = async (muted: boolean) => {
        video.muted = muted;
        await video.play();
      };
      try {
        await attempt(false);
      } catch {
        if (disposed || finishedRef.current) return;
        try {
          await attempt(true);
        } catch {
          if (!disposed) unlock(true);
          return;
        }
      }
      if (disposed || !finishedRef.current) return;
      try {
        video.pause();
      } catch {
        /* Spät eingetroffenes play() soll ein schon freigegebenes Intro nicht neu starten. */
      }
    };

    void startPlayback();

    return () => {
      disposed = true;
      if (endedTimer != null) window.clearTimeout(endedTimer);
      if (watchdog != null) window.clearInterval(watchdog);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("error", onError);
      video.removeEventListener("stalled", onStallSignal);
      video.removeEventListener("waiting", onStallSignal);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("loadedmetadata", armEndedFallback);
      video.removeEventListener("durationchange", armEndedFallback);
    };
  }, [releaseContinue, revealOverlay]);

  return (
    <div
      className="fixed inset-0 z-[200] overflow-hidden bg-background-dark"
      role="dialog"
      aria-modal="true"
      aria-label="Session-Intro"
    >
      <div className="pointer-events-none absolute inset-0 z-0">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          src={LIVE_SESSION_INTRO_VIDEO_SRC}
          autoPlay
          playsInline
          preload="auto"
          aria-label="Session-Intro"
        />
      </div>

      <div className="pointer-events-none absolute inset-0 z-[1] bg-linear-to-b from-black/55 via-transparent to-background-dark/80" />

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
        <div className="flex flex-1 items-start justify-center px-6 pt-[12vh] sm:pt-[14vh]">
          <AnimatePresence>
            {showOverlay ? (
              <motion.p
                key="ready-overlay"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="max-w-3xl text-center font-cinzel text-2xl font-bold leading-snug text-accent-gold drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)] sm:text-3xl md:text-4xl"
              >
                {characterName}, mach Dich bereit für Dein Abenteuer!
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="flex items-end justify-center px-6 pb-16 sm:pb-20">
          <AnimatePresence>
            {canContinue ? (
              <motion.div
                key="continue-block"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
                className="pointer-events-auto flex flex-col items-center gap-4"
              >
                {releasedEarly ? (
                  <p className="max-w-md text-center font-libre text-sm leading-relaxed text-gray-200">
                    Das Intro stockt. Du kannst das Abenteuer trotzdem fortsetzen.
                  </p>
                ) : null}
                <motion.button
                  ref={continueButtonRef}
                  type="button"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onContinue}
                  className="rounded border-2 border-accent-gold/80 bg-background-card/90 px-10 py-4 font-cinzel text-lg font-bold tracking-wide text-accent-gold shadow-[0_0_24px_rgba(202,185,38,0.25)] backdrop-blur-sm transition-colors hover:border-accent-gold hover:bg-background-card hover:text-accent-white focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold sm:text-xl"
                >
                  Abenteuer fortsetzen
                </motion.button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
