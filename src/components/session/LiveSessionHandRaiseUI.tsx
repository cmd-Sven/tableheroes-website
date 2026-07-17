"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Hand, X } from "lucide-react";
import type { SessionHandRaise } from "@/src/lib/session/hand-raises";

type Props = {
  raises: SessionHandRaise[];
  onDismiss: (raiseId: string) => void;
  pending?: boolean;
};

function formatTime(at: string): string {
  try {
    return new Date(at).toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "";
  }
}

/** SL-Warteschlange der Meldungen (Reihenfolge = zuerst gemeldet). */
export function LiveSessionHandRaiseQueue({ raises, onDismiss, pending }: Props) {
  if (raises.length === 0) return null;

  return (
    <div className="pointer-events-auto fixed left-3 top-20 z-[85] w-[min(18rem,calc(100vw-1.5rem))] rounded-lg border border-hero-border/70 bg-background-card/95 p-2 shadow-2xl backdrop-blur-md">
      <div className="mb-1.5 flex items-center gap-1.5 border-b border-hero-border/40 pb-1.5">
        <Hand className="h-4 w-4 text-accent-gold" />
        <h2 className="font-barlow text-xs font-bold uppercase tracking-wide text-accent-gold">
          Meldungen ({raises.length})
        </h2>
      </div>
      <ul className="max-h-56 space-y-1 overflow-y-auto">
        {raises.map((raise, index) => (
          <li
            key={raise.id}
            className={`flex items-center gap-2 rounded border px-2 py-1.5 ${
              raise.urgent
                ? "border-accent-blood/70 bg-accent-blood/20"
                : "border-hero-border/40 bg-hero-dark/40"
            }`}
          >
            <span className="font-barlow text-[10px] font-bold text-gray-500">#{index + 1}</span>
            {raise.urgent ? (
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-accent-gold" />
            ) : (
              <Hand className="h-3.5 w-3.5 shrink-0 text-hero-vibrant" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-barlow text-xs font-bold uppercase text-gray-100">
                {raise.displayName}
              </p>
              <p className="font-libre text-[9px] text-gray-500">
                {formatTime(raise.at)}
                {raise.urgent ? " · dringend" : ""}
              </p>
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() => onDismiss(raise.id)}
              title="Meldung entfernen"
              aria-label={`${raise.displayName} entfernen`}
              className="rounded p-1 text-gray-500 hover:bg-red-950/50 hover:text-red-300 disabled:opacity-40"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

type UrgentProps = {
  raise: SessionHandRaise | null;
  onDismiss: (raiseId: string) => void;
  pending?: boolean;
};

/** Zentrale dringende Meldung nur für den SL. */
export function LiveSessionUrgentHandBanner({ raise, onDismiss, pending }: UrgentProps) {
  return (
    <AnimatePresence>
      {raise ? (
        <motion.div
          key={raise.id}
          role="alertdialog"
          aria-modal="true"
          aria-label={`Dringende Meldung von ${raise.displayName}`}
          className="pointer-events-auto fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="w-full max-w-md rounded-xl border-2 border-accent-gold bg-background-card p-5 shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-center gap-2 text-accent-gold">
              <Hand className="h-8 w-8" />
              <AlertTriangle className="h-7 w-7" />
            </div>
            <p className="text-center font-barlow text-sm font-bold uppercase tracking-wide text-accent-gold">
              Dringende Meldung
            </p>
            <p className="mt-2 text-center font-cinzel text-2xl font-bold text-hero-vibrant">
              {raise.displayName}
            </p>
            <p className="mt-1 text-center font-libre text-xs text-gray-400">
              gemeldet um {formatTime(raise.at)}
            </p>
            <button
              type="button"
              disabled={pending}
              onClick={() => onDismiss(raise.id)}
              className="mt-5 w-full rounded border border-hero-vibrant bg-hero-vibrant/20 px-3 py-2.5 font-barlow text-sm font-bold uppercase tracking-wide text-hero-vibrant hover:bg-hero-vibrant/30 disabled:opacity-40"
            >
              Zur Kenntnis genommen
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
