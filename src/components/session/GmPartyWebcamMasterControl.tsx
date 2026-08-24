/**
 * GmPartyWebcamMasterControl — GM control to disable/re-enable all party avatar webcams.
 */
"use client";

import { Camera, CameraOff } from "lucide-react";
import { usePlayerAvatarCamSession } from "./PlayerAvatarCamSessionProvider";

export function GmPartyWebcamMasterControl() {
  const { masterEnabled, setAllWebcamsEnabled } = usePlayerAvatarCamSession();

  return (
    <div className="pointer-events-none fixed top-3 left-[15.5rem] z-40 sm:top-4 sm:left-[17rem]">
      <button
        type="button"
        onClick={() => setAllWebcamsEnabled(!masterEnabled)}
        className={`pointer-events-auto flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-barlow text-[10px] font-bold uppercase tracking-wide shadow-lg shadow-black/40 backdrop-blur-sm ${
          masterEnabled
            ? "border-hero-border/70 bg-background-dark/95 text-hero-vibrant hover:border-accent-gold hover:text-accent-gold"
            : "border-accent-gold/60 bg-background-dark/95 text-accent-gold hover:border-hero-border hover:text-hero-vibrant"
        }`}
        title={
          masterEnabled
            ? "Alle Spieler-Webcams ausschalten"
            : "Alle Spieler-Webcams wieder erlauben"
        }
        aria-label={
          masterEnabled
            ? "Alle Spieler-Webcams ausschalten"
            : "Alle Spieler-Webcams wieder erlauben"
        }
      >
        {masterEnabled ? (
          <CameraOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
        ) : (
          <Camera className="h-3.5 w-3.5 shrink-0" aria-hidden />
        )}
        <span>{masterEnabled ? "Cams aus" : "Cams an"}</span>
      </button>
    </div>
  );
}
