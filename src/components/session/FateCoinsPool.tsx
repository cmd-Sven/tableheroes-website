"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, RotateCcw, Settings, Skull, X } from "lucide-react";
import {
  destroyFateCoin,
  flipFateCoin,
  resetFateCoins,
} from "@/src/lib/actions/fate-coins-actions";

export type FateCoin = {
  id: string;
  side: "white" | "black";
};

type Props = {
  sessionId: string;
  coins: FateCoin[];
  destroyedCount: number;
  isGM?: boolean;
  showControls?: boolean;
  compact?: boolean;
  /** Kompakteres Panel für die Session-Leiste neben der Ortsanzeige */
  inlineHeader?: boolean;
  /** GM: Pool-Anzahl / Setzen hinter Zahnrad (open/toggle nur lokal im Parent) */
  collapsibleGmSettings?: boolean;
  gmSettingsOpen?: boolean;
  onGmSettingsToggle?: () => void;
};

function coinClasses(side: FateCoin["side"]) {
  if (side === "white") {
    return "border-amber-200 bg-radial-[circle_at_30%_25%] from-white via-amber-100 to-amber-400 text-amber-950 shadow-[0_0_22px_rgba(255,255,255,0.55)]";
  }
  return "border-slate-500 bg-radial-[circle_at_30%_25%] from-slate-500 via-slate-950 to-black text-slate-100 shadow-[0_0_24px_rgba(15,23,42,0.95)]";
}

function PoolResetControls({
  destroyedCount,
  isPending,
  whiteCount,
  blackCount,
  setWhiteCount,
  setBlackCount,
  onReset,
}: {
  destroyedCount: number;
  isPending: boolean;
  whiteCount: number;
  blackCount: number;
  setWhiteCount: (n: number) => void;
  setBlackCount: (n: number) => void;
  onReset: () => void;
}) {
  return (
    <div className="rounded-lg border border-white/20 bg-white/5 p-3">
      <p className="mb-2 font-barlow text-[9px] font-bold uppercase text-accent-gold">
        Pool-Einstellungen · Zerstört:{" "}
        <span className="text-red-300">{destroyedCount}</span>
      </p>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-barlow text-[10px] font-bold uppercase text-gray-400">
          Pool neu setzen
        </span>
        <button
          type="button"
          onClick={onReset}
          disabled={isPending}
          className="inline-flex items-center gap-1 rounded border border-accent-gold/60 bg-accent-gold/10 px-2 py-1 font-barlow text-[10px] font-bold uppercase text-accent-gold hover:bg-accent-gold hover:text-black disabled:opacity-50"
        >
          <RotateCcw className="h-3 w-3" />
          Setzen
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="font-barlow text-[9px] font-bold uppercase text-gray-500">Weiß</span>
          <input
            type="number"
            min={0}
            max={50}
            value={whiteCount}
            onChange={(event) => setWhiteCount(Number(event.target.value))}
            className="rounded border border-hero-dark bg-slate-900 px-2 py-1 text-sm text-white outline-none focus:border-accent-gold"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-barlow text-[9px] font-bold uppercase text-gray-500">Schwarz</span>
          <input
            type="number"
            min={0}
            max={50}
            value={blackCount}
            onChange={(event) => setBlackCount(Number(event.target.value))}
            className="rounded border border-hero-dark bg-slate-900 px-2 py-1 text-sm text-white outline-none focus:border-accent-gold"
          />
        </label>
      </div>
    </div>
  );
}

export function FateCoinsPool({
  sessionId,
  coins,
  destroyedCount,
  isGM = false,
  showControls = false,
  compact = false,
  inlineHeader = false,
  collapsibleGmSettings = false,
  gmSettingsOpen = false,
  onGmSettingsToggle,
}: Props) {
  const [whiteCount, setWhiteCount] = useState(3);
  const [blackCount, setBlackCount] = useState(3);
  const [pendingCoinId, setPendingCoinId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const useCollapsibleGm =
    Boolean(collapsibleGmSettings && showControls && isGM && onGmSettingsToggle);

  const handleFlip = (coinId: string) => {
    setPendingCoinId(coinId);
    startTransition(async () => {
      try {
        await flipFateCoin(sessionId, coinId);
      } finally {
        setPendingCoinId(null);
      }
    });
  };

  const handleDestroy = (coinId: string) => {
    setPendingCoinId(coinId);
    startTransition(async () => {
      try {
        await destroyFateCoin(sessionId, coinId);
      } finally {
        setPendingCoinId(null);
      }
    });
  };

  const handleReset = () => {
    startTransition(async () => {
      await resetFateCoins(sessionId, whiteCount, blackCount);
    });
  };

  const showInlineControlsBlock = showControls && isGM && !useCollapsibleGm;

  const shellClass = useCollapsibleGm
    ? "rounded-xl border border-white/15 bg-white/5 p-2 shadow-md backdrop-blur-md"
    : `border border-accent-gold/45 bg-background-card/90 shadow-black/40 backdrop-blur ${
        inlineHeader
          ? "rounded-xl p-2 shadow-md"
          : `rounded-2xl shadow-2xl ${compact ? "p-3" : "p-4"}`
      }`;

  return (
    <section className={shellClass}>
      {!useCollapsibleGm ? (
        <div
          className={`flex items-center justify-between gap-3 ${inlineHeader ? "mb-2" : "mb-3"}`}
        >
          <div>
            <p
              className={`font-barlow font-bold uppercase tracking-wide text-accent-gold ${
                inlineHeader ? "text-[9px]" : "text-[10px]"
              }`}
            >
              Schicksalsmünzen
            </p>
            <p
              className={`font-libre text-gray-400 ${inlineHeader ? "text-[11px]" : "text-xs"}`}
            >
              Zerstörte Münzen:{" "}
              <span className="font-barlow font-extrabold text-red-300">{destroyedCount}</span>
            </p>
          </div>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin text-accent-gold" /> : null}
        </div>
      ) : (
        <div className="mb-1 flex items-center justify-end gap-2">
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-gold" /> : null}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className={`flex min-w-0 flex-1 flex-wrap ${inlineHeader ? "gap-2" : "gap-3"}`}>
          <AnimatePresence mode="popLayout">
            {coins.map((coin) => {
              const pending = pendingCoinId === coin.id;
              return (
                <motion.button
                  key={coin.id}
                  type="button"
                  layout
                  initial={{ opacity: 0, scale: 0.5, y: -16, rotateZ: -20 }}
                  animate={{
                    opacity: pending ? 0.55 : 1,
                    scale: 1,
                    y: 0,
                    rotateY: coin.side === "white" ? 0 : 180,
                    rotateZ: 0,
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0,
                    y: 24,
                    rotateZ: 35,
                    filter: "blur(6px)",
                  }}
                  transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  onClick={() => handleFlip(coin.id)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    handleDestroy(coin.id);
                  }}
                  className={`group relative grid transform-3d place-items-center rounded-full border-2 font-cinzel font-bold ${
                    inlineHeader || compact ? "size-15 text-base" : "size-18 text-lg"
                  } ${coinClasses(coin.side)}`}
                  title="Klick: wenden. Rechtsklick oder X: zerstören."
                >
                  <span className="backface-hidden">
                    {coin.side === "white" ? "☼" : "●"}
                  </span>
                  <span className="pointer-events-none absolute inset-1.5 rounded-full border border-white/35" />
                  <span className="pointer-events-none absolute left-3 top-1.5 h-4 w-4 rounded-full bg-white/60 blur-sm" />
                  <span
                    role="button"
                    tabIndex={-1}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDestroy(coin.id);
                    }}
                    className="absolute -right-0.5 -top-0.5 hidden h-6 w-6 place-items-center rounded-full border border-red-500/70 bg-red-950 text-red-100 shadow-lg group-hover:grid"
                    title="Münze zerstören"
                  >
                    <X className="h-4 w-4" />
                  </span>
                </motion.button>
              );
            })}
          </AnimatePresence>
          {coins.length === 0 ? (
            <div className="flex items-center gap-2 rounded border border-red-900/50 bg-red-950/30 px-3 py-2 font-libre text-xs text-red-200">
              <Skull className="h-4 w-4" />
              Keine Schicksalsmünzen im Pool.
            </div>
          ) : null}
        </div>
        {useCollapsibleGm ? (
          <button
            type="button"
            onClick={onGmSettingsToggle}
            aria-expanded={gmSettingsOpen}
            aria-label="Schicksalsmünzen: Einstellungen"
            title="Einstellungen"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/20 bg-white/10 text-gray-200 backdrop-blur-md transition-colors hover:border-accent-gold/50 hover:text-accent-gold"
          >
            <Settings className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {useCollapsibleGm ? (
        <AnimatePresence initial={false}>
          {gmSettingsOpen ? (
            <motion.div
              key="fate-gm-panel"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="mt-2 rounded-lg border border-white/20 bg-white/10 p-3 backdrop-blur-md"
            >
              <PoolResetControls
                destroyedCount={destroyedCount}
                isPending={isPending}
                whiteCount={whiteCount}
                blackCount={blackCount}
                setWhiteCount={setWhiteCount}
                setBlackCount={setBlackCount}
                onReset={handleReset}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      ) : null}

      {showInlineControlsBlock ? (
        <div
          className={`rounded-xl border border-hero-border/40 bg-background-dark/70 ${
            inlineHeader ? "mt-2 p-2" : "mt-4 p-3"
          }`}
        >
          <div
            className={`flex items-center justify-between gap-2 ${inlineHeader ? "mb-2" : "mb-3"}`}
          >
            <span className="font-barlow text-[10px] font-bold uppercase text-gray-400">
              Pool neu setzen
            </span>
            <button
              type="button"
              onClick={handleReset}
              disabled={isPending}
              className="inline-flex items-center gap-1 rounded border border-accent-gold/60 bg-accent-gold/10 px-2 py-1 font-barlow text-[10px] font-bold uppercase text-accent-gold hover:bg-accent-gold hover:text-black disabled:opacity-50"
            >
              <RotateCcw className="h-3 w-3" />
              Setzen
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="font-barlow text-[9px] font-bold uppercase text-gray-500">Weiß</span>
              <input
                type="number"
                min={0}
                max={50}
                value={whiteCount}
                onChange={(event) => setWhiteCount(Number(event.target.value))}
                className="rounded border border-hero-dark bg-slate-900 px-2 py-1 text-sm text-white outline-none focus:border-accent-gold"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-barlow text-[9px] font-bold uppercase text-gray-500">
                Schwarz
              </span>
              <input
                type="number"
                min={0}
                max={50}
                value={blackCount}
                onChange={(event) => setBlackCount(Number(event.target.value))}
                className="rounded border border-hero-dark bg-slate-900 px-2 py-1 text-sm text-white outline-none focus:border-accent-gold"
              />
            </label>
          </div>
        </div>
      ) : null}
    </section>
  );
}
