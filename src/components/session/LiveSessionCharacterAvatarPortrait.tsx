/** Portrait UI: speech bubble, avatar/webcam button, and HP bar for live session characters. */
"use client";

import { useLayoutEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, ImageIcon, Swords } from "lucide-react";
import { CharacterAvatarImage } from "@/src/components/dashboard/player/CharacterAvatarImage";
import { DiceGlyph } from "@/src/components/session/dice/DiceGlyph";
import type { LiveAvatarStatus } from "@/src/lib/actions/live-session-avatar-actions";
import {
  MOOD_STATE_DEFINITIONS,
  type MoodStateKey,
} from "@/src/lib/characters/mood-states";
import {
  getPlayerColorForClass,
  playerColorAlpha,
} from "@/src/lib/session/class-player-color";
import type { AvatarRollFxKind } from "@/src/lib/session/avatar-roll-fx";
import type { AvatarSpeechBubbleKind } from "@/src/lib/session/avatar-speech-bubble";

type SpeechBubbleState = {
  kind: AvatarSpeechBubbleKind;
  text: string;
  key: string;
  diceGlyphs?: { sides: number; value: number }[];
} | null;

type RollFxState = {
  kind: AvatarRollFxKind;
  moodKey: MoodStateKey;
  endsAt: number;
} | null;

type Props = {
  compact: boolean;
  characterName: string;
  canInteract: boolean;
  isDummy: boolean;
  className: string | null;
  avatarDisplay?: unknown | null;
  fallbackAvatarUrl: string | null;
  status: LiveAvatarStatus | null;
  rollFx: RollFxState;
  speechBubble: SpeechBubbleState;
  avatarBtnRef: RefObject<HTMLButtonElement | null>;
  onAvatarClick: () => void;
  /** Local webcam replaces portrait image; mood FX never override this feed. */
  showingWebcam?: boolean;
  /** Session mode is webcam (owner feed or remote indicator). */
  webcamModeActive?: boolean;
  webcamPhase?: "idle" | "starting" | "active" | "denied" | "error";
  webcamErrorHint?: string | null;
  videoRefCallback?: (el: HTMLVideoElement | null) => void;
  canControlWebcam?: boolean;
  onToggleWebcam?: () => void;
};

export function LiveSessionCharacterAvatarPortrait({
  compact,
  characterName,
  canInteract,
  isDummy,
  className,
  avatarDisplay,
  fallbackAvatarUrl,
  status,
  rollFx,
  speechBubble,
  avatarBtnRef,
  onAvatarClick,
  showingWebcam = false,
  webcamModeActive = false,
  webcamPhase = "idle",
  webcamErrorHint = null,
  videoRefCallback,
  canControlWebcam = false,
  onToggleWebcam,
}: Props) {
  const [bubbleAnchor, setBubbleAnchor] = useState<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    if (!speechBubble) {
      setBubbleAnchor(null);
      return;
    }
    const el = avatarBtnRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setBubbleAnchor({ x: rect.left + rect.width / 2, y: rect.top });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [speechBubble, avatarBtnRef, compact]);

  // Mood / roll FX only affect the portrait image — never webcam mode or live feed.
  const avatarUrl = (() => {
    if (showingWebcam || webcamModeActive) return null;
    if (rollFx) {
      const fxUrl = status?.moodTokenUrls?.[rollFx.moodKey]?.trim();
      if (fxUrl) return fxUrl;
    }
    return status?.displayAvatarUrl || fallbackAvatarUrl;
  })();
  const fxMoodLabel = rollFx
    ? MOOD_STATE_DEFINITIONS.find((d) => d.key === rollFx.moodKey)?.labelDe ?? rollFx.moodKey
    : null;
  const isCritFx = rollFx?.kind === "crit";
  const hpCurrent = status?.hpCurrent ?? 0;
  const hpMax = Math.max(1, status?.hpMax ?? 1);
  const hpPct = Math.min(100, Math.round((hpCurrent / hpMax) * 100));
  const weaponLine =
    status?.weaponLabels?.length ? status.weaponLabels.join(" · ") : "Keine Waffe";
  const playerColor = getPlayerColorForClass(className);

  const speechBubblePortal =
    typeof document !== "undefined" && speechBubble && bubbleAnchor
      ? createPortal(
          <div
            className={`pointer-events-none fixed z-[120] flex -translate-x-1/2 -translate-y-full flex-col items-center ${
              compact ? "w-[8rem]" : "w-[14rem]"
            }`}
            style={{ left: bubbleAnchor.x, top: bubbleAnchor.y - 8 }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={speechBubble.key}
                role="status"
                aria-live="polite"
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.96 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="relative max-w-full"
              >
                <div
                  className={`rounded-lg border px-2.5 py-1.5 shadow-lg ${
                    speechBubble.kind === "dice"
                      ? "bg-background-dark/95 text-accent-gold"
                      : "bg-background-card/95 text-gray-100"
                  }`}
                  style={{
                    borderColor: playerColor,
                    boxShadow: `0 8px 24px ${playerColorAlpha(playerColor, 0.35)}`,
                  }}
                >
                  {speechBubble.kind === "dice" &&
                  speechBubble.diceGlyphs &&
                  speechBubble.diceGlyphs.length > 0 ? (
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="flex items-center justify-center gap-1.5">
                        {speechBubble.diceGlyphs.map((g, i) => (
                          <span
                            key={`${g.sides}-${g.value}-${i}`}
                            className="inline-flex items-center gap-0.5 font-barlow text-sm font-extrabold tabular-nums leading-none"
                          >
                            <DiceGlyph sides={g.sides} className="h-3.5 w-3.5" />
                            {g.value}
                          </span>
                        ))}
                      </div>
                      {/* Gesamtergebnis inkl. Mods (z. B. Erschöpfung) — nicht nur Rohwürfel */}
                      {(() => {
                        const rawFaces = speechBubble.diceGlyphs
                          .map((g) => String(g.value))
                          .join(" · ");
                        if (!speechBubble.text || speechBubble.text === rawFaces) {
                          return null;
                        }
                        return (
                          <p className="text-center font-barlow text-[10px] font-bold uppercase tracking-wide leading-tight text-accent-gold/95">
                            {speechBubble.text}
                          </p>
                        );
                      })()}
                    </div>
                  ) : (
                    <p
                      className={`text-center leading-snug ${
                        speechBubble.kind === "dice"
                          ? "font-barlow text-xs font-bold uppercase tracking-wide"
                          : "font-libre text-[11px]"
                      }`}
                    >
                      {speechBubble.text}
                    </p>
                  )}
                </div>
                <span
                  aria-hidden
                  className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-[6px] border-t-[7px] border-x-transparent"
                  style={{ borderTopColor: playerColor }}
                />
              </motion.div>
            </AnimatePresence>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {speechBubblePortal}

      <motion.button
        ref={avatarBtnRef}
        type="button"
        disabled={!canInteract || isDummy}
        onClick={onAvatarClick}
        animate={{
          scale: isCritFx ? 1.28 : 1,
          opacity: 1,
        }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className={`relative z-10 flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-hero-dark shadow-xl ${
          compact ? "h-14 w-14 border-2" : "h-36 w-36 border-[3px]"
        } ${
          isDummy ? "border-dashed border-amber-600/90" : isCritFx ? "border-accent-gold" : ""
        } ${canInteract && !isDummy ? "cursor-pointer hover:brightness-110 focus-visible:outline-2 focus-visible:outline-accent-gold" : "cursor-default"}`}
        style={
          isDummy || isCritFx
            ? undefined
            : {
                borderColor: playerColor,
                boxShadow: compact
                  ? `0 0 0 1px ${playerColorAlpha(playerColor, 0.35)}, 0 4px 12px rgba(0,0,0,0.45)`
                  : `0 0 0 2px ${playerColorAlpha(playerColor, 0.35)}, 0 10px 28px rgba(0,0,0,0.45)`,
              }
        }
        title={canInteract && !isDummy ? `${characterName} — Aktionen` : characterName}
        aria-label={canInteract && !isDummy ? `Aktionen für ${characterName}` : characterName}
      >
        {showingWebcam ? (
          <div className="absolute inset-0 overflow-hidden rounded-full bg-background-dark">
            <video
              ref={videoRefCallback}
              autoPlay
              playsInline
              muted
              className="h-full w-full scale-x-[-1] object-cover"
              aria-label={`${characterName} Webcam`}
            />
          </div>
        ) : webcamModeActive || webcamPhase === "starting" ? (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 overflow-hidden rounded-full"
            style={{
              background:
                "radial-gradient(circle at 35% 30%, rgba(55,152,6,0.35) 0%, rgba(19,46,27,0.95) 45%, rgba(10,31,16,1) 100%)",
            }}
            aria-label={`${characterName} Webcam-Platzhalter`}
          >
            {/* Mirrored “live cam” stand-in so GM/players see webcam mode without a remote stream */}
            <span
              className={`flex items-center justify-center rounded-full border-2 border-accent-gold/70 bg-background-dark/80 text-accent-gold shadow-[0_0_18px_rgba(202,185,38,0.35)] ${
                compact ? "h-7 w-7" : "h-14 w-14"
              }`}
              aria-hidden
            >
              <Camera className={compact ? "h-3.5 w-3.5" : "h-7 w-7"} />
            </span>
            {!compact ? (
              <span className="px-2 text-center font-barlow text-[9px] font-extrabold uppercase tracking-wide text-accent-gold">
                {webcamPhase === "starting" ? "Kamera…" : "Live-Cam"}
              </span>
            ) : (
              <span className="font-barlow text-[6px] font-extrabold uppercase tracking-wide text-accent-gold">
                Cam
              </span>
            )}
            <span
              className={`absolute rounded-full bg-hero-vibrant shadow-[0_0_8px_rgba(55,152,6,0.9)] ${
                compact ? "right-1 top-1 h-1.5 w-1.5" : "right-3 top-3 h-2.5 w-2.5"
              }`}
              aria-hidden
              title="Webcam-Modus aktiv"
            />
            {(webcamPhase === "denied" || webcamPhase === "error") && webcamErrorHint ? (
              <span
                className="absolute inset-x-1 bottom-1 rounded bg-black/80 px-1 py-0.5 text-center font-libre text-[8px] leading-tight text-red-200"
                title={webcamErrorHint}
              >
                Kamera fehlt
              </span>
            ) : null}
            {/* Keep video element mounted for the owner while connecting */}
            {videoRefCallback && webcamPhase === "starting" ? (
              <video
                ref={videoRefCallback}
                autoPlay
                playsInline
                muted
                className="pointer-events-none absolute h-px w-px opacity-0"
                aria-hidden
              />
            ) : null}
          </div>
        ) : avatarUrl ? (
          <div className="absolute inset-0 overflow-hidden rounded-full">
            <CharacterAvatarImage
              src={avatarUrl}
              avatarDisplay={avatarDisplay}
              className="h-full w-full"
              alt={characterName}
            />
          </div>
        ) : (
          <span
            className={`font-barlow text-accent-gold ${compact ? "text-lg" : "text-4xl"}`}
          >
            {characterName[0]?.toUpperCase()}
          </span>
        )}
        {rollFx &&
        fxMoodLabel &&
        !showingWebcam &&
        !webcamModeActive &&
        !status?.moodTokenUrls?.[rollFx.moodKey] ? (
          <span
            className={`pointer-events-none absolute inset-x-1 z-10 rounded bg-black/75 px-1 py-0.5 text-center font-barlow font-bold uppercase leading-tight text-accent-gold ${
              compact ? "bottom-0.5 text-[6px]" : "bottom-2 text-[8px]"
            }`}
          >
            {fxMoodLabel}
          </span>
        ) : null}
      </motion.button>

      {canControlWebcam && onToggleWebcam ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleWebcam();
          }}
          className={`absolute z-30 flex items-center justify-center rounded-full border border-accent-gold/70 bg-background-dark/95 text-accent-gold shadow-md hover:border-hero-border hover:text-hero-vibrant ${
            compact ? "right-0 top-0 h-6 w-6" : "right-1 top-1 h-8 w-8"
          }`}
          title={webcamModeActive ? "Avatarbild anzeigen" : "Webcam anzeigen"}
          aria-label={webcamModeActive ? "Avatarbild anzeigen" : "Webcam anzeigen"}
        >
          {webcamModeActive ? (
            <ImageIcon className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />
          ) : (
            <Camera className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />
          )}
        </button>
      ) : null}

      {!isDummy && !compact ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-[-6px] z-20 flex flex-col items-center gap-1 px-2">
          <p
            className="max-w-[200px] truncate rounded bg-black/65 px-2 py-0.5 text-center font-barlow text-[9px] font-bold uppercase tracking-wide text-accent-gold"
            title={weaponLine}
          >
            <Swords className="mr-1 inline h-3 w-3" />
            {weaponLine}
          </p>
          <div className="w-[150px] rounded-full border border-black/40 bg-black/70 p-0.5 shadow-md">
            <div className="relative h-2.5 overflow-hidden rounded-full bg-red-950/80">
              <div
                className={`h-full transition-[width] ${
                  hpPct > 50 ? "bg-hero-vibrant" : hpPct > 25 ? "bg-amber-500" : "bg-red-500"
                }`}
                style={{ width: `${hpPct}%` }}
              />
            </div>
            <p className="mt-0.5 text-center font-barlow text-[8px] font-bold text-white/90">
              {hpCurrent}/{hpMax}
              {status && status.hpTemp > 0 ? ` (+${status.hpTemp})` : ""} TP
            </p>
          </div>
        </div>
      ) : !isDummy && compact ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-[-4px] z-20 flex justify-center px-1">
          <div className="w-[52px] rounded-full border border-black/40 bg-black/70 p-px shadow-md">
            <div className="relative h-1 overflow-hidden rounded-full bg-red-950/80">
              <div
                className={`h-full transition-[width] ${
                  hpPct > 50 ? "bg-hero-vibrant" : hpPct > 25 ? "bg-amber-500" : "bg-red-500"
                }`}
                style={{ width: `${hpPct}%` }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
