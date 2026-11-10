"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useProgress } from "@react-three/drei";
import {
  getHeavyGlbCompleted,
  getHeavyGlbCurrentUrl,
  getHeavyGlbPending,
  resetHeavyGlbLoadStats,
  subscribeHeavyGlbLoads,
} from "./scene/HeavyGlbSlot";
import { spookyLoadLine } from "./holo-city-load-lines";

const MAP_ICON_SRC = "/images/city/loading-map-icon.png";
const MAP_ICON_EMPTY_SRC = "/images/city/loading-map-icon-empty.png";
/** Dieselbe Schreibfeder wie im Marketing-Header. */
const QUILL_SRC = "/images/feder-frei.webp";
/** Nach dem letzten GLB kurz halten. */
const SETTLE_MS = 1000;
/** Mindestanzeige. */
const MIN_VISIBLE_MS = 1400;
/** Notausstieg. */
const MAX_WAIT_MS = 60000;
/** Ein Zeichenzyklus (radiales Enthüllen), läuft in der Schleife. */
const DRAW_LOOP_SEC = 4.8;
/**
 * Schreiblinien auf dem flachen Pergament (nicht am Rollrand).
 * Werte = Spitzen-Anker in % der Medaillon-Fläche.
 */
const QUILL_LINE_TIPS: { left: string; top: string }[] = [
  { left: "40%", top: "34%" },
  { left: "58%", top: "34%" },
  { left: "39%", top: "42%" },
  { left: "56%", top: "42%" },
  { left: "41%", top: "50%" },
  { left: "54%", top: "50%" },
];
const QUILL_WRITE_SEC = 8.2;

type Props = {
  enabled?: boolean;
  sceneBooted?: boolean;
  /** Erwartete HeavyGlb-Slots (Landmark-Typen auf der Karte). */
  expectedHeavyCount?: number;
  /** true, solange der Cover sichtbar ist (Blitze/Layer erst danach). */
  onCoverVisibleChange?: (visible: boolean) => void;
};

function getHeavySnapshot() {
  return `${getHeavyGlbPending()}\0${getHeavyGlbCompleted()}\0${getHeavyGlbCurrentUrl() ?? ""}`;
}

function parseHeavySnapshot(raw: string) {
  const [pendingRaw, completedRaw, ...urlParts] = raw.split("\0");
  return {
    pending: Number(pendingRaw) || 0,
    completed: Number(completedRaw) || 0,
    url: urlParts.join("\0") || null,
  };
}

function useHeavyLoadSnapshot() {
  const raw = useSyncExternalStore(subscribeHeavyGlbLoads, getHeavySnapshot, () => "0\0\0");
  return parseHeavySnapshot(raw);
}

/**
 * Spielleiter-Cover: bleibt, bis alle erwarteten Heavy-GLBs fertig sind.
 * Texturen allein schließen das Overlay nicht — die Bauwerke laden oft erst danach.
 */
export function HoloCityLoadingOverlay({
  enabled = true,
  sceneBooted = false,
  expectedHeavyCount = 0,
  onCoverVisibleChange,
}: Props) {
  const { active, progress, item } = useProgress();
  const heavy = useHeavyLoadSnapshot();
  const [visible, setVisible] = useState(true);
  const [portalReady, setPortalReady] = useState(false);
  const [idleTick, setIdleTick] = useState(0);
  const [nowTick, setNowTick] = useState(0);
  /** 0–1 innerhalb des Zeichen-Loops (läuft weiter, auch wenn der Balken steht). */
  const [loopT, setLoopT] = useState(0);
  const mountedAt = useRef(typeof performance !== "undefined" ? performance.now() : 0);
  const bootAt = useRef<number | null>(null);
  const peakPending = useRef(0);
  const loopStartedAt = useRef(typeof performance !== "undefined" ? performance.now() : 0);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    onCoverVisibleChange?.(enabled && visible);
  }, [enabled, visible, onCoverVisibleChange]);

  const busy = active || heavy.pending > 0;
  const texturePct = Math.max(0, Math.min(100, Math.round(progress || 0)));
  const targetTotal = Math.max(expectedHeavyCount, peakPending.current, heavy.completed + heavy.pending);
  const heavyPct =
    targetTotal > 0 ? Math.round((Math.min(heavy.completed, targetTotal) / targetTotal) * 100) : 0;
  const currentUrl = heavy.url || item || null;
  const heaviesReady =
    expectedHeavyCount > 0
      ? heavy.completed >= expectedHeavyCount && heavy.pending === 0
      : heavy.pending === 0 && heavy.completed > 0;

  const speech = useMemo(
    () => spookyLoadLine(currentUrl, idleTick),
    [currentUrl, idleTick],
  );

  useEffect(() => {
    resetHeavyGlbLoadStats();
    peakPending.current = 0;
    setVisible(true);
    mountedAt.current = performance.now();
    loopStartedAt.current = performance.now();
    bootAt.current = null;
  }, []);

  useEffect(() => {
    if (sceneBooted && bootAt.current == null) bootAt.current = performance.now();
  }, [sceneBooted]);

  useEffect(() => {
    if (heavy.pending > peakPending.current) peakPending.current = heavy.pending;
  }, [heavy.pending]);

  useEffect(() => {
    if (!visible) return;
    const timer = window.setInterval(() => setNowTick((n) => n + 1), 250);
    return () => window.clearInterval(timer);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let frame = 0;
    const tick = (now: number) => {
      const elapsed = (now - loopStartedAt.current) / 1000;
      setLoopT((elapsed % DRAW_LOOP_SEC) / DRAW_LOOP_SEC);
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [visible]);

  useEffect(() => {
    if (!visible || currentUrl) return;
    const timer = window.setInterval(() => setIdleTick((n) => n + 1), 3200);
    return () => window.clearInterval(timer);
  }, [visible, currentUrl]);

  useEffect(() => {
    if (!enabled || !visible) return;

    const elapsed = () => performance.now() - mountedAt.current;
    if (elapsed() >= MAX_WAIT_MS) {
      setVisible(false);
      return;
    }

    // Keine Landmark-GLBs erwartet: nach Boot + idle Texturen ausblenden.
    const noLandmarks = expectedHeavyCount === 0;
    const texturesIdle = !active;
    const canDismiss = sceneBooted && !busy && (
      noLandmarks
        ? texturesIdle
        : heaviesReady
    );

    if (!canDismiss) {
      const maxTimer = window.setTimeout(() => setVisible(false), Math.max(0, MAX_WAIT_MS - elapsed()));
      return () => window.clearTimeout(maxTimer);
    }

    const remainingMin = Math.max(0, MIN_VISIBLE_MS - elapsed());
    // Ohne Landmarks etwas kürzer; mit Landmarks Settle nach letztem GLB.
    const settle = noLandmarks ? 500 : SETTLE_MS;
    const timer = window.setTimeout(() => setVisible(false), remainingMin + settle);
    return () => window.clearTimeout(timer);
  }, [
    active,
    busy,
    enabled,
    expectedHeavyCount,
    heaviesReady,
    sceneBooted,
    visible,
    nowTick,
  ]);

  if (!enabled) return null;

  const barWidth =
    expectedHeavyCount > 0 || heavy.completed > 0 || heavy.pending > 0
      ? Math.max(heavyPct, heaviesReady ? 100 : heavy.pending > 0 ? 6 : 4)
      : Math.max(texturePct, busy ? 8 : 4);

  void nowTick;

  const progressPct = Math.max(0, Math.min(100, barWidth));
  /**
   * Zeichen-Loop: Radius wächst 0 → progress (mind. 18 %), weiches Ease.
   * Feder-Spitze wandert zeilenweise über das Pergament.
   */
  const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const loopEase = easeInOut(loopT);
  const maxReveal = Math.max(18, progressPct);
  const revealRadius = Math.max(6, loopEase * maxReveal);
  const softEdge = 10 + (1 - loopEase) * 8;
  const maskImage = `radial-gradient(circle at 50% 48%, #000 0%, #000 ${Math.max(0, revealRadius - softEdge * 0.35)}%, transparent ${revealRadius + softEdge}%)`;
  const quillLeftKeys = [...QUILL_LINE_TIPS.map((tip) => tip.left), QUILL_LINE_TIPS[0].left];
  const quillTopKeys = [...QUILL_LINE_TIPS.map((tip) => tip.top), QUILL_LINE_TIPS[0].top];

  const overlay = (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="pointer-events-auto fixed inset-0 z-[220] flex flex-col items-center justify-center overflow-hidden bg-[#07140c]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          aria-busy="true"
          aria-live="polite"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(55,152,6,0.18),transparent_55%)]" />
          <motion.div
            className="pointer-events-none absolute left-1/2 top-[42%] h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-100/25 blur-3xl"
            animate={{ opacity: [0.35, 0.7, 0.4, 0.75, 0.35], scale: [1, 1.08, 0.96, 1.05, 1] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="relative z-10 flex w-full max-w-lg flex-col items-center px-5">
            <motion.div
              className="mb-5 w-full max-w-sm"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 }}
            >
              <div className="mb-2 flex items-end justify-between gap-3">
                <p className="font-cinzel text-sm font-bold tracking-wide text-accent-gold sm:text-base">
                  Aurenfurt erwacht…
                </p>
                <p className="font-barlow text-xs font-bold uppercase tracking-widest text-hero-vibrant">
                  {barWidth}%
                </p>
              </div>
              <div
                className="h-2.5 overflow-hidden rounded-full border border-hero-border/50 bg-black/55 shadow-[0_0_18px_rgba(35,199,99,0.2)]"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={barWidth}
              >
                <motion.div
                  className="relative h-full rounded-full bg-gradient-to-r from-hero-dark via-hero-vibrant to-accent-gold"
                  initial={false}
                  animate={{ width: `${barWidth}%` }}
                  transition={{ type: "tween", duration: 0.35, ease: "easeOut" }}
                >
                  <motion.span
                    className="absolute inset-y-0 right-0 w-8 bg-white/35 blur-[2px]"
                    animate={{ opacity: [0.2, 0.7, 0.2] }}
                    transition={{ duration: 1.1, repeat: Infinity }}
                  />
                </motion.div>
              </div>
            </motion.div>

            <div className="relative mb-2 min-h-[4.5rem] w-full max-w-md">
              <AnimatePresence mode="wait">
                <motion.div
                  key={speech}
                  className="relative rounded-2xl border border-hero-border/40 bg-[#132e1b]/95 px-4 py-3 shadow-lg backdrop-blur-sm"
                  initial={{ opacity: 0, y: 10, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 380, damping: 24 }}
                >
                  <p className="font-libre text-sm leading-relaxed text-gray-100 sm:text-[15px]">
                    {speech}
                  </p>
                  <span
                    className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b border-r border-hero-border/40 bg-[#132e1b]/95"
                    aria-hidden
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            <motion.div
              className="relative mt-1 aspect-square w-[min(72vw,20rem)] sm:w-[22rem]"
              initial={{ opacity: 0, y: 24, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
            >
              <motion.div
                className="absolute inset-[12%] rounded-full bg-amber-50/10 blur-2xl"
                animate={{ opacity: [0.25, 0.55, 0.3, 0.6, 0.25] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              />
              <div className="relative h-full w-full">
                {/* Leeres Pergament als Basis. */}
                <Image
                  src={MAP_ICON_EMPTY_SRC}
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 640px) 72vw, 352px"
                  className="object-contain drop-shadow-[0_12px_28px_rgba(0,0,0,0.55)]"
                />
                {/* Volle Karte: radial aus der Mitte, soft fade — Loop während des Ladens. */}
                <div
                  className="absolute inset-0"
                  aria-hidden
                  style={{
                    WebkitMaskImage: maskImage,
                    maskImage,
                    WebkitMaskRepeat: "no-repeat",
                    maskRepeat: "no-repeat",
                    WebkitMaskSize: "100% 100%",
                    maskSize: "100% 100%",
                  }}
                >
                  <Image
                    src={MAP_ICON_SRC}
                    alt="Stadtkarte wird gezeichnet"
                    fill
                    priority
                    sizes="(max-width: 640px) 72vw, 352px"
                    className="object-contain"
                  />
                </div>
                {/* Weicher Leuchtring am aktuellen Reveal-Rand. */}
                <div
                  className="pointer-events-none absolute left-1/2 top-[48%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-100/25"
                  style={{
                    width: `${revealRadius * 0.92}%`,
                    height: `${revealRadius * 0.92}%`,
                    boxShadow: "0 0 18px rgba(255, 220, 150, 0.18)",
                    opacity: 0.35 + loopEase * 0.4,
                  }}
                  aria-hidden
                />
                {/* Schreibfeder: Anker = Spitze auf dem Pergament, springt ruhig Zeile für Zeile. */}
                <motion.div
                  className="pointer-events-none absolute z-10"
                  aria-hidden
                  initial={false}
                  animate={{ left: quillLeftKeys, top: quillTopKeys }}
                  transition={{
                    duration: QUILL_WRITE_SEC,
                    repeat: Infinity,
                    ease: "easeInOut",
                    times: [0, 0.14, 0.28, 0.42, 0.56, 0.72, 1],
                  }}
                >
                  <div className="-translate-x-[28%] -translate-y-[90%]">
                    <motion.div
                      className="h-[4.25rem] w-[4.25rem] origin-[28%_90%] sm:h-[5.25rem] sm:w-[5.25rem]"
                      animate={{
                        rotate: [-32, -26, -34, -28, -33, -25, -32],
                        y: [0, 1, 0, 1.5, 0, 1, 0],
                      }}
                      transition={{
                        rotate: {
                          duration: QUILL_WRITE_SEC,
                          repeat: Infinity,
                          ease: "easeInOut",
                          times: [0, 0.14, 0.28, 0.42, 0.56, 0.72, 1],
                        },
                        y: { duration: 1.45, repeat: Infinity, ease: "easeInOut" },
                      }}
                    >
                      <Image
                        src={QUILL_SRC}
                        alt=""
                        width={84}
                        height={84}
                        priority
                        className="h-full w-full object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.55)]"
                      />
                    </motion.div>
                  </div>
                </motion.div>
              </div>
            </motion.div>

            <motion.p
              className="mt-3 font-barlow text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-100/55"
              animate={{ opacity: [0.4, 0.85, 0.4] }}
              transition={{ duration: 2.2, repeat: Infinity }}
            >
              {expectedHeavyCount > 0
                ? `Bauwerke ${heavy.completed}/${expectedHeavyCount} beschworen…`
                : "Stadttafel wird vorbereitet…"}
              {heavy.pending > 0 ? ` · ${heavy.pending} noch im Off` : ""}
            </motion.p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  /* Portal: über Layer-Leiste (z-95) und Blitz-Html (z~110), sonst scheinen sie durch. */
  if (!portalReady) return null;
  return createPortal(overlay, document.body);
}
