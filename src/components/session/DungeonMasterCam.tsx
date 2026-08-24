/**
 * DungeonMasterCam — Fantasy-framed GM webcam preview only.
 * Start/stop, title, and show/hide are controlled from the left-dock Helden panel.
 */
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Camera } from "lucide-react";
import { useDungeonMasterCamContext } from "./DungeonMasterCamProvider";

export function DungeonMasterCam() {
  const {
    phase,
    title,
    isMinimized,
    setMinimized,
    prefsReady,
    videoRefCallback,
  } = useDungeonMasterCamContext();

  if (!prefsReady || isMinimized || phase === "idle") return null;

  return (
    <div className="pointer-events-none fixed top-3 left-14 z-40 sm:top-4 sm:left-16">
      <AnimatePresence initial={false}>
        <motion.div
          key="dm-cam-preview"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="pointer-events-auto w-[11.5rem] sm:w-[13rem]"
          role="region"
          aria-label="Overlord-Cam"
        >
          <div
            className="relative overflow-hidden rounded-md border-2 border-accent-gold/70 bg-background-dark shadow-[0_0_0_1px_rgba(35,199,99,0.25),0_12px_28px_rgba(0,0,0,0.55)]"
            style={{
              backgroundImage:
                "linear-gradient(160deg, rgba(19,46,27,0.95) 0%, rgba(10,31,16,0.98) 55%, rgba(8,20,12,1) 100%)",
            }}
          >
            <span
              className="pointer-events-none absolute left-0 top-0 h-3 w-3 border-l-2 border-t-2 border-accent-gold"
              aria-hidden
            />
            <span
              className="pointer-events-none absolute right-0 top-0 h-3 w-3 border-r-2 border-t-2 border-accent-gold"
              aria-hidden
            />
            <span
              className="pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-accent-gold"
              aria-hidden
            />
            <span
              className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-accent-gold"
              aria-hidden
            />

            <div className="flex items-center justify-between gap-1 border-b border-hero-dark/80 px-2 py-1">
              <span className="truncate font-cinzel text-[10px] font-bold uppercase tracking-wider text-accent-gold">
                {title.trim() || "Overlord"}
              </span>
              <button
                type="button"
                onClick={() => setMinimized(true)}
                className="rounded p-0.5 text-gray-400 transition-colors hover:bg-hero-dark/40 hover:text-accent-gold"
                aria-label="Overlord-Cam ausblenden"
                title="Ausblenden (Steuerung links unter Helden)"
              >
                <Camera className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>

            <div className="relative aspect-[4/3] bg-black/80">
              <video
                ref={videoRefCallback}
                autoPlay
                playsInline
                muted
                className={`h-full w-full scale-x-[-1] object-cover ${
                  phase === "active" ? "opacity-100" : "opacity-40"
                }`}
              />
              {phase === "starting" ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <p className="font-libre text-[10px] text-gray-300">Kamera…</p>
                </div>
              ) : null}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
