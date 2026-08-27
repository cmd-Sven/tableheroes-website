/**
 * DungeonMasterCamRemote — Remote Overlord-Cam preview for non-GM session participants.
 */
"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera } from "lucide-react";
import { bindWebcamVideoElement } from "@/src/lib/session/avatar-webcam-webrtc";
import { useLiveSessionWebcamOptional } from "./LiveSessionWebcamProvider";

export function DungeonMasterCamRemote() {
  const webrtc = useLiveSessionWebcamOptional();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const remoteStreamVersion = webrtc?.remoteStreamVersion ?? 0;
  const remoteStream = webrtc?.getRemoteStreamByPrefix("dm:") ?? null;

  useEffect(() => {
    bindWebcamVideoElement(videoRef.current, remoteStream);
  }, [remoteStream, remoteStreamVersion]);

  if (!remoteStream) return null;

  return (
    <div className="pointer-events-none fixed top-3 left-14 z-40 sm:top-4 sm:left-16">
      <AnimatePresence initial={false}>
        <motion.div
          key="dm-cam-remote"
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
                Overlord
              </span>
              <Camera className="h-3.5 w-3.5 shrink-0 text-accent-gold/80" aria-hidden />
            </div>

            <div className="relative aspect-[4/3] bg-black/80">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full scale-x-[-1] object-cover"
                aria-label="Spielleiter Webcam"
              />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
