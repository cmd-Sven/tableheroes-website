/**
 * UI-Bausteine und Chart-Helfer für das Stadt-Dashboard.
 * Einsatz: nur von CityDashboard importieren — hält die Hauptdatei unter 600 Zeilen.
 */

"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Briefcase,
  Coins,
  Flower2,
  Hourglass,
  Shield,
  ShieldAlert,
  Skull,
  Sparkles,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  type AnalyticsEvent,
  type AnalyticsFaction,
  type AnalyticsNpc,
  type AnalyticsPoint,
  type CityAnalytics,
  type DistrictRank,
} from "./aurenfurt-analytics";
import { SIM_METERS, type SimMeterKey } from "./aurenfurt-sim";

export type ChartMetric = SimMeterKey | "tension";

type TipRow = { name?: string; value?: number | string; color?: string; dataKey?: string | number };

export const KPI_META: Record<SimMeterKey, { short: string; Icon: LucideIcon }> = {
  crime: { short: "Kriminalität", Icon: ShieldAlert },
  vattrak: { short: "Vattrak", Icon: Sparkles },
  malanthir: { short: "Malanthir", Icon: Skull },
  guard: { short: "Garde", Icon: Shield },
  refugees: { short: "Flüchtlinge", Icon: Users },
  economy: { short: "Wirtschaft", Icon: Coins },
  unemployment: { short: "Arbeitslos", Icon: Briefcase },
  elysia: { short: "Elysia", Icon: Flower2 },
  chromus: { short: "Chromus", Icon: Hourglass },
};

export function ScopeChip({
  active,
  label,
  tint,
  onClick,
}: {
  active: boolean;
  label: string;
  tint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1 font-barlow text-[11px] font-bold uppercase tracking-wide ${
        active ? "border-hero-vibrant bg-hero-vibrant/20 text-white" : "border-hero-border/50 text-gray-300 hover:text-white"
      }`}
    >
      {tint ? <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: tint }} /> : null}
      {label}
    </button>
  );
}

export function KpiCard({
  label,
  fullLabel,
  Icon,
  value,
  anchor,
  showAnchor,
  delta,
  tone,
  stroke,
  active,
  onSelect,
}: {
  label: string;
  fullLabel: string;
  Icon: LucideIcon;
  value: number;
  anchor: number;
  showAnchor: boolean;
  delta: number | undefined;
  tone: "up" | "down" | "neutral";
  stroke: string;
  active: boolean;
  onSelect: () => void;
}) {
  const deltaClass = tone === "up" ? "text-hero-vibrant" : tone === "down" ? "text-red-300" : "text-gray-400";
  return (
    <button
      type="button"
      onClick={onSelect}
      title={fullLabel}
      aria-label={`${fullLabel}: ${value}`}
      className={`rounded-md border bg-background-card p-4 text-left shadow-lg transition ${
        active ? "border-hero-vibrant ring-1 ring-hero-vibrant/40" : "border-hero-dark hover:border-hero-border"
      }`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</span>
        <Icon className="h-4 w-4 shrink-0" style={{ color: stroke }} aria-hidden />
      </span>
      <span className="mt-2 block font-barlow text-5xl font-extrabold leading-none tabular-nums tracking-wide text-white">
        {value}
      </span>
      <span className={`mt-2 block font-barlow text-xs font-bold tabular-nums ${deltaClass}`}>
        {delta == null ? "—" : `${delta > 0 ? "+" : ""}${delta}`}
      </span>
      {showAnchor ? <span className="mt-0.5 block font-libre text-[11px] text-gray-400">Stichtag {anchor}</span> : null}
    </button>
  );
}

export function ChartCard({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <section className="rounded-md border border-hero-dark bg-background-card p-4 shadow-lg">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="font-cinzel text-base font-bold text-accent-gold">{title}</h3>
        <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">{note}</p>
      </div>
      {children}
    </section>
  );
}

export function Spotlight({
  title,
  rows,
  onOpen,
}: {
  title: string;
  rows: { name: string; value: number }[];
  onOpen: () => void;
}) {
  const [first, second] = rows;
  return (
    <button type="button" onClick={onOpen} className="rounded-md border border-hero-dark bg-background-card p-4 text-left shadow-lg">
      <span className="block font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">{title}</span>
      <span className="mt-1 block font-cinzel text-lg font-bold text-accent-gold">{first?.name ?? "—"}</span>
      <span className="block font-barlow text-2xl font-extrabold tabular-nums text-white">{first?.value ?? "—"}</span>
      {second ? (
        <span className="mt-1 block font-libre text-xs text-gray-400">
          danach {second.name} ({second.value})
        </span>
      ) : null}
    </button>
  );
}

export function DetailCard({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-md border border-hero-border bg-background-card p-4 shadow-lg"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="font-cinzel text-lg font-bold text-accent-gold">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-hero-dark p-1 text-gray-400 hover:text-white"
          aria-label="Detail schließen"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {children}
    </motion.article>
  );
}

export function FactionDetail({ faction }: { faction: AnalyticsFaction }) {
  return (
    <div className="space-y-4">
      <p className="font-libre text-sm leading-relaxed text-gray-200">{faction.role}</p>
      <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-cyan-200">{faction.ideologyLabel}</p>
      <dl className="grid grid-cols-3 gap-3">
        <div>
          <dt className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">Macht</dt>
          <dd className="font-barlow text-xl font-bold text-gray-100">{faction.power}</dd>
        </div>
        <div>
          <dt className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">Legalität</dt>
          <dd className="font-barlow text-xl font-bold text-gray-100">
            {faction.legality > 0 ? `+${faction.legality}` : faction.legality}
          </dd>
        </div>
        <div>
          <dt className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">Wirtschaft</dt>
          <dd className="font-barlow text-xl font-bold text-gray-100">{faction.economicImpact}</dd>
        </div>
      </dl>
      <div>
        <p className="mb-1 font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">Präsenz</p>
        <p className="font-libre text-sm text-gray-200">{faction.districtNames.join(" · ")}</p>
      </div>
      {faction.relationships.length > 0 ? (
        <div>
          <p className="mb-1 font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">Beziehungen</p>
          <ul className="space-y-1">
            {faction.relationships.map((link) => (
              <li key={`${link.targetName}-${link.label}`} className="font-libre text-sm text-gray-200">
                <span className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">
                  {link.label} · {link.strength}
                </span>
                <span className="ml-2">{link.targetName}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function NpcDetail({ npc }: { npc: AnalyticsNpc }) {
  return (
    <div className="space-y-3">
      <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">
        {npc.title ?? npc.role} · {npc.factionName} · {npc.districtName}
      </p>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <dt className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">Einfluss</dt>
          <dd className="font-barlow text-xl font-bold text-accent-gold">{npc.influence}</dd>
        </div>
        <div>
          <dt className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">Rolle</dt>
          <dd className="font-libre text-sm text-gray-100">{npc.role}</dd>
        </div>
      </dl>
      <p className="font-libre text-sm leading-relaxed text-gray-200">{npc.description}</p>
      {npc.agenda ? (
        <p className="font-libre text-sm leading-relaxed text-gray-300">
          <span className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">Agenda · </span>
          {npc.agenda}
        </p>
      ) : null}
    </div>
  );
}

export function topRows(report: CityAnalytics, pick: (district: DistrictRank) => number) {
  return [...report.districts]
    .sort((a, b) => pick(b) - pick(a))
    .slice(0, 3)
    .map((district) => ({ name: district.name, value: pick(district) }));
}

export function meterName(metric: ChartMetric) {
  if (metric === "tension") return "Spannung";
  return SIM_METERS.find((meter) => meter.key === metric)?.label ?? metric;
}

export function districtBars(report: CityAnalytics, metric: ChartMetric) {
  return [...report.districts]
    .sort((a, b) => (metric === "tension" ? b.tension - a.tension : b.average[metric] - a.average[metric]))
    .map((district) => ({
      id: district.id,
      name: district.name,
      tint: district.tint,
      value: metric === "tension" ? district.tension : district.average[metric],
    }));
}

const TIP_MONTHS = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
] as const;

function germanDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return `${day}. ${TIP_MONTHS[month - 1]} ${year}`;
}

function tipDate(point: AnalyticsPoint | undefined, label?: string) {
  if (!point?.day) return label ?? "";
  if (point.day === point.until) return germanDate(point.day);
  return `${germanDate(point.day)} – ${germanDate(point.until)}`;
}

export function bandsFor(series: AnalyticsPoint[], events: AnalyticsEvent[]) {
  const bands = new Map<string, { x1: string; x2: string }>();
  for (const event of events) {
    if (!event.start || !event.end) continue;
    const covered = series.filter((point) => point.day <= event.end! && point.until >= event.start!);
    if (covered.length === 0) continue;
    const x1 = covered[0].label;
    const x2 = covered[covered.length - 1].label;
    const key = `${x1}|${x2}`;
    if (!bands.has(key)) bands.set(key, { x1, x2 });
  }
  return [...bands.values()];
}

export function LineTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<TipRow & { payload?: AnalyticsPoint }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  const events = point?.events ?? [];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="max-w-xs rounded-md border border-hero-dark bg-background-dark px-3 py-2 shadow-lg"
    >
      <p className="font-barlow text-[11px] font-bold uppercase text-accent-gold">{tipDate(point, label)}</p>
      {payload.map((row) => (
        <p key={String(row.dataKey)} className="font-libre text-xs text-gray-100">
          <span style={{ color: row.color }}>{row.name}</span> {row.value}
        </p>
      ))}
      {events.length > 0 ? (
        <div className="mt-2 border-t border-hero-dark/70 pt-1.5">
          <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">Aktive Ereignisse</p>
          {events.map((name) => (
            <p key={name} className="font-libre text-xs leading-relaxed text-gray-200">
              {name}
            </p>
          ))}
        </div>
      ) : null}
    </motion.div>
  );
}

export function BarTooltip({ active, payload, label }: { active?: boolean; payload?: TipRow[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const row = payload[0];
  return (
    <div className="rounded-md border border-hero-dark bg-background-card px-3 py-2 shadow-lg">
      <p className="font-barlow text-[11px] font-bold uppercase text-accent-gold">{label ?? row?.name}</p>
      <p className="font-libre text-xs text-gray-100">{row?.value}</p>
    </div>
  );
}
