"use client";

import {
  FAP_NIGHT_PART_LABELS,
  FAP_PART_LABELS,
  FAP_PARTS_PER_DAY,
  type DowntimeConfig,
  playerFapBudgetPerDay,
  totalLeisureFap,
  travelFapCostPerDay,
} from "@/src/lib/travel-fap-config";
import type { FapAllocationLine } from "@/src/lib/downtime-fap-types";

type Props = {
  config: DowntimeConfig | null;
  /** Aktueller Reise-/Freizeittag (1-basiert) */
  currentDay?: number;
  totalDays?: number;
  /** Spieler-Verteilung für heute (optional) */
  allocations?: FapAllocationLine[];
  /** Kompakte Darstellung im Charakterbogen */
  compact?: boolean;
};

function sumAllocated(allocations: FapAllocationLine[] | undefined): number {
  if (!allocations?.length) return 0;
  return allocations.reduce((s, a) => s + Math.max(0, Math.round(a.fap)), 0);
}

/** 6-Segment-Anzeige: 3 Tag + 3 Nacht */
export function CharacterFapPanel({
  config,
  currentDay = 1,
  totalDays = 1,
  allocations = [],
  compact = false,
}: Props) {
  const cfg = config ?? { mode: "leisure" as const };
  const isLeisure = cfg.mode === "leisure";
  const travelCost = travelFapCostPerDay(cfg);
  const playerBudget = playerFapBudgetPerDay(cfg);
  const allocated = sumAllocated(allocations);
  const totalPool = isLeisure ? totalLeisureFap(totalDays) : playerBudget;
  const remaining = Math.max(0, playerBudget - allocated);

  const segments = FAP_PART_LABELS.map((label, idx) => {
    const isNight = idx >= 3;
    const filled = idx < allocated;
    return { label, isNight, filled, idx };
  });

  return (
    <section
      className={`rounded-md border border-hero-border/50 bg-background-dark/40 ${compact ? "p-3" : "p-4"}`}
      aria-label="Freizeitaktionspunkte"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="font-barlow text-xs font-bold uppercase tracking-wide text-accent-gold">
          FAP — Freizeitaktionspunkte
        </h3>
        {!isLeisure && currentDay > 0 ? (
          <span className="font-barlow text-[10px] font-bold uppercase text-gray-500">
            Tag {currentDay}/{totalDays}
          </span>
        ) : null}
      </div>

      <p className="mb-3 font-libre text-[11px] leading-relaxed text-gray-400">
        {isLeisure ? (
          <>
            Freizeit: <strong className="text-gray-200">{FAP_PARTS_PER_DAY} FAP/Tag</strong> (3 Tages- +
            3 Nachtabschnitte). Bei {totalDays} Tag{totalDays === 1 ? "" : "en"}:{" "}
            <strong className="text-accent-gold">{totalPool} FAP</strong> gesamt.
          </>
        ) : (
          <>
            Reise: <strong className="text-gray-200">{travelCost} FAP</strong> für Fortbewegung ·{" "}
            <strong className="text-accent-gold">{playerBudget} FAP</strong> frei planbar
            {cfg.provisions === "hunt_daily" ? " (Jagd kostet 1 FAP Gruppe)" : ""}.
          </>
        )}
      </p>

      <div className="mb-1">
        <p className="font-barlow text-[9px] font-bold uppercase text-gray-500">Tag</p>
        <div className="mt-1 grid grid-cols-3 gap-1.5">
          {segments.slice(0, 3).map(({ label, filled, idx }) => (
            <FapSegment key={label} label={label} filled={filled} index={idx} />
          ))}
        </div>
      </div>

      <div>
        <p className="font-barlow text-[9px] font-bold uppercase text-gray-500">Nacht</p>
        <div className="mt-1 grid grid-cols-3 gap-1.5">
          {segments.slice(3, 6).map(({ label, filled, idx }) => (
            <FapSegment key={label} label={label} filled={filled} index={idx} isNight />
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 font-barlow text-[10px] uppercase">
        <span className="text-gray-400">
          Heute:{" "}
          <span className="font-bold text-white">
            {allocated}/{playerBudget}
          </span>{" "}
          geplant
        </span>
        {remaining > 0 ? (
          <span className="text-hero-vibrant">{remaining} frei</span>
        ) : allocated >= playerBudget ? (
          <span className="text-accent-gold">Budget voll</span>
        ) : null}
      </div>

      <p className="mt-2 font-libre text-[9px] text-gray-600">
        1 FAP = 1 Abschnitt ({FAP_NIGHT_PART_LABELS.join(", ")})
      </p>
    </section>
  );
}

function FapSegment({
  label,
  filled,
  index,
  isNight = false,
}: {
  label: string;
  filled: boolean;
  index: number;
  isNight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center rounded border px-1 py-2 transition-colors ${
        filled
          ? isNight
            ? "border-indigo-500/60 bg-indigo-950/50"
            : "border-hero-vibrant/60 bg-hero-vibrant/15"
          : "border-hero-border/30 bg-background-card/30"
      }`}
      title={`${label} (${index + 1}/${FAP_PARTS_PER_DAY})`}
    >
      <span
        className={`font-barlow text-lg font-extrabold ${filled ? "text-white" : "text-gray-600"}`}
      >
        {filled ? "✓" : "○"}
      </span>
      <span className="mt-0.5 text-center font-barlow text-[8px] font-bold uppercase leading-tight text-gray-500">
        {label}
      </span>
    </div>
  );
}
