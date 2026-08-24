"use client";

/**
 * LiveSessionLoadingScreen — Cinematic intro video gate before the live board unlocks.
 */

import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";

/** Public URL for the session intro cinematic (file lives in `public/videos/`). */
export const LIVE_SESSION_INTRO_VIDEO_SRC = "/videos/intro-session.mp4";

const OVERLAY_APPEAR_AT_SEC = 7;

export type PreloadStep = {
  id: string;
  label: string;
  icon: "shield" | "swords" | "map" | "users" | "dices";
  status: "pending" | "loading" | "done" | "error";
};

type Props = {
  characterName: string;
  onContinue: () => void;
};

export function LiveSessionLoadingScreen({ characterName, onContinue }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayShownRef = useRef(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);

  const revealOverlay = useCallback(() => {
    if (overlayShownRef.current) return;
    overlayShownRef.current = true;
    setShowOverlay(true);
  }, []);

  const markVideoFinished = useCallback(() => {
    revealOverlay();
    setVideoEnded(true);
  }, [revealOverlay]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = false;
    const playAttempt = video.play();
    if (playAttempt) {
      void playAttempt.catch(() => {
        video.muted = true;
        void video.play().catch(() => {
          markVideoFinished();
        });
      });
    }
  }, [markVideoFinished]);

  const handleTimeUpdate = useCallback(
    (event: SyntheticEvent<HTMLVideoElement>) => {
      if (event.currentTarget.currentTime >= OVERLAY_APPEAR_AT_SEC) {
        revealOverlay();
      }
    },
    [revealOverlay],
  );

  return (
    <div className="fixed inset-0 z-[200] overflow-hidden bg-background-dark">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        src={LIVE_SESSION_INTRO_VIDEO_SRC}
        autoPlay
        playsInline
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onEnded={markVideoFinished}
        onError={markVideoFinished}
        aria-label="Session-Intro"
      />

      <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-black/55 via-transparent to-background-dark/80" />

      <div className="absolute inset-0 flex flex-col">
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
            {videoEnded ? (
              <motion.button
                key="continue-btn"
                type="button"
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={onContinue}
                className="pointer-events-auto rounded border-2 border-accent-gold/80 bg-background-card/90 px-10 py-4 font-cinzel text-lg font-bold tracking-wide text-accent-gold shadow-[0_0_24px_rgba(202,185,38,0.25)] backdrop-blur-sm transition-colors hover:border-accent-gold hover:bg-background-card hover:text-accent-white focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold sm:text-xl"
              >
                Abenteuer fortsetzen
              </motion.button>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
