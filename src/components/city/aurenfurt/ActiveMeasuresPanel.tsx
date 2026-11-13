"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Activity, X } from "lucide-react";
import {
  activeMeasureKindLabel,
  type ActiveMeasure,
} from "./aurenfurt-active-measures";

type Props = {
  open: boolean;
  onToggle: () => void;
  measures: ActiveMeasure[];
};

const KIND_COLOR: Record<ActiveMeasure["kind"], string> = {
  ability: "#cab926",
  counter: "#e85d04",
  "npc-card": "#7ec8e3",
  "city-event": "#379806",
  kaiser: "#d4af37",
};

export function ActiveMeasuresPanel({ open, onToggle, measures }: Props) {
  const count = measures.length;
  const automations = measures.filter((m) => m.kind === "ability" || m.kind === "counter").length;

  return (
    <div className="pointer-events-auto relative flex h-10 shrink-0 items-stretch">
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,82vw)] overflow-hidden rounded border border-hero-border/80 bg-background-dark/95 shadow-2xl backdrop-blur-sm"
            role="dialog"
            aria-label="Aktive Maßnahmen"
          >
            <div className="flex items-center justify-between gap-2 border-b border-hero-dark px-3 py-2">
              <div className="min-w-0">
                <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-hero-vibrant">
                  Aktive Maßnahmen
                </p>
                <p className="font-libre text-[10px] text-gray-400">
                  {count === 0
                    ? "Keine Automatismen oder Ereignisse"
                    : `${count} aktiv · ${automations} Automatismus${automations === 1 ? "" : "en"}`}
                </p>
              </div>
              <button
                type="button"
                onClick={onToggle}
                className="rounded p-1 text-gray-400 hover:text-white"
                aria-label="Maßnahmen schließen"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
            <ul className="max-h-[min(42vh,22rem)] space-y-2 overflow-y-auto px-3 py-2">
              {count === 0 ? (
                <li className="font-libre text-[11px] leading-relaxed text-gray-400">
                  Sobald Stadtereignisse, Kaiser-Befehle oder NPC-Automatismen wirken, erscheinen
                  sie hier.
                </li>
              ) : (
                measures.map((measure) => (
                  <li
                    key={measure.id}
                    className="rounded border border-hero-dark/70 bg-background-card/70 px-2.5 py-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="min-w-0 font-cinzel text-xs font-bold leading-snug text-accent-gold">
                        {measure.title}
                      </h3>
                      <span
                        className="shrink-0 font-barlow text-[9px] font-bold uppercase tracking-wide"
                        style={{ color: KIND_COLOR[measure.kind] }}
                      >
                        {activeMeasureKindLabel(measure.kind)}
                      </span>
                    </div>
                    {measure.detail && measure.detail !== measure.title ? (
                      <p className="mt-1 font-libre text-[10px] leading-snug text-gray-300">
                        {measure.detail}
                      </p>
                    ) : null}
                    {measure.effectsLabel ? (
                      <p className="mt-1 font-barlow text-[10px] font-bold uppercase tracking-wide text-hero-vibrant">
                        {measure.effectsLabel}
                      </p>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <button
        type="button"
        aria-pressed={open}
        aria-label={
          open
            ? "Aktive Maßnahmen ausblenden"
            : count > 0
              ? `Aktive Maßnahmen einblenden, ${count}`
              : "Aktive Maßnahmen einblenden"
        }
        title="Aktive Maßnahmen"
        onClick={onToggle}
        className={`relative inline-flex h-10 w-10 items-center justify-center border border-hero-dark bg-hero-dark text-accent-gold hover:bg-background-card ${
          open ? "bg-background-card text-hero-vibrant" : ""
        }`}
      >
        <Activity className="h-4 w-4" aria-hidden />
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-gold px-1 font-barlow text-[9px] font-extrabold text-background-dark">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>
    </div>
  );
}
