"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const VIDEO_SRC = "/videos/battle_begins.mp4";
const TITLE_DELAY_MS = 2000;

type Props = {
  onComplete: () => void;
};

export function CombatStartVideoModal({ onComplete }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showTitle, setShowTitle] = useState(false);
  const [visible, setVisible] = useState(true);

  const handleVideoEnded = useCallback(() => {
    setVisible(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowTitle(true), TITLE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = false;
    video.volume = 1;

    const playPromise = video.play();
    if (playPromise) {
      playPromise.catch(() => {
        video.muted = true;
        void video.play();
      });
    }

    video.addEventListener("ended", handleVideoEnded);
    return () => video.removeEventListener("ended", handleVideoEnded);
  }, [handleVideoEnded]);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {visible ? (
        <motion.div
          key="combat-video-modal"
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ duration: 0.65, ease: [0.32, 0.72, 0, 1] }}
          role="dialog"
          aria-modal="true"
          aria-label="Kampfbeginn"
        >
          <motion.p
            initial={{ opacity: 0, y: -24, scale: 0.92 }}
            animate={
              showTitle
                ? { opacity: 1, y: 0, scale: 1 }
                : { opacity: 0, y: -24, scale: 0.92 }
            }
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none relative z-[210] mb-6 max-w-4xl px-6 text-center font-cinzel text-3xl font-bold uppercase tracking-[0.14em] text-accent-gold sm:text-5xl md:text-6xl"
            style={{
              textShadow:
                "0 0 18px rgba(255,120,40,0.95), 0 0 42px rgba(202,185,38,0.75), 0 4px 0 rgba(88,24,13,0.9), 0 0 80px rgba(255,60,0,0.45)",
              filter: "drop-shadow(0 0 12px rgba(255,140,0,0.6))",
            }}
          >
            Lasst die Schlacht beginnen
          </motion.p>

          <motion.div
            className="relative mx-4 w-full max-w-3xl overflow-visible rounded-2xl border-2 border-orange-500/60 bg-black"
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08 }}
            style={{
              boxShadow:
                "0 0 24px rgba(255,100,0,0.55), 0 0 48px rgba(255,60,0,0.35), 0 0 80px rgba(202,185,38,0.25), inset 0 0 30px rgba(255,80,0,0.15)",
            }}
          >
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -inset-4 rounded-[1.35rem] bg-orange-500/40 blur-2xl"
              animate={{ opacity: [0.45, 0.85, 0.45], scale: [0.98, 1.04, 0.98] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -inset-2 rounded-2xl border-2 border-amber-400/40"
              animate={{ opacity: [0.35, 0.75, 0.35] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />

            <div className="relative z-10 overflow-hidden rounded-2xl">
              <video
                ref={videoRef}
                src={VIDEO_SRC}
                className="block aspect-video w-full object-cover"
                playsInline
                preload="auto"
              />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
