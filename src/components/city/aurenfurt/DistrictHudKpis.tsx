"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  Briefcase,
  Coins,
  Shield,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Minus,
  type LucideIcon,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { tensionOf } from "./aurenfurt-analytics";
import type { CityDistrictId } from "./aurenfurt-districts";
import { cityMetricsOn, districtMetricsOn, formatDay, parseDay } from "./aurenfurt-history";
import type { SimProfile } from "./aurenfurt-sim";

export type KpiTrend = "up" | "down" | "flat";

export type DistrictHudKpi = {
  key: string;
  label: string;
  value: number;
  trend: KpiTrend;
};

const DAY_MS = 86_400_000;
const WEEK_DAYS = 7;
const WEEKDAY_SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"] as const;
const TREND_EPS = 0.75;

const KPI_ICON: Record<string, { Icon: LucideIcon; stroke: string }> = {
  crime: { Icon: ShieldAlert, stroke: "#ef4444" },
  economy: { Icon: Coins, stroke: "#cab926" },
  guard: { Icon: Shield, stroke: "#38bdf8" },
  unemployment: { Icon: Briefcase, stroke: "#d4a574" },
  vattrak: { Icon: Sparkles, stroke: "#379806" },
  tension: { Icon: Activity, stroke: "#f0a36b" },
};

function trendOf(current: number, reference: number): KpiTrend {
  const delta = current - reference;
  if (delta > TREND_EPS) return "up";
  if (delta < -TREND_EPS) return "down";
  return "flat";
}

function valueOf(profile: SimProfile, key: string): number {
  if (key === "tension") return tensionOf(profile);
  return profile[key as keyof SimProfile] as number;
}

/** Letzte 7 Tage bis zum Stichtag (inkl.), für Stadt oder Viertel. */
export function buildHudKpiWeekSeries(
  districtId: CityDistrictId | null,
  anchorIso: string,
  key: string,
): { label: string; day: string; value: number }[] {
  const anchor = parseDay(anchorIso);
  const points: { label: string; day: string; value: number }[] = [];
  for (let offset = WEEK_DAYS - 1; offset >= 0; offset -= 1) {
    const dayMs = anchor - offset * DAY_MS;
    const iso = formatDay(dayMs);
    const profile = districtId ? districtMetricsOn(districtId, dayMs) : cityMetricsOn(dayMs);
    const date = new Date(`${iso}T12:00:00Z`);
    points.push({
      label: WEEKDAY_SHORT[date.getUTCDay()],
      day: iso,
      value: Math.round(valueOf(profile, key)),
    });
  }
  return points;
}

/**
 * Wichtigste Viertel-KPIs.
 * `display` = angezeigter Tageswert.
 * `compare` = Folgetag (Vorausschau) oder Vortag (`fromPast`).
 * Trend up = Wert steigt (Richtung Zukunft bzw. seit gestern).
 */
export function buildDistrictHudKpis(
  display: SimProfile,
  compare: SimProfile,
  options?: { fromPast?: boolean },
): DistrictHudKpi[] {
  const fromPast = Boolean(options?.fromPast);
  const slope = (compareValue: number, displayValue: number): KpiTrend =>
    fromPast ? trendOf(displayValue, compareValue) : trendOf(compareValue, displayValue);
  const tensionNow = tensionOf(display);
  const tensionCompare = tensionOf(compare);
  return [
    { key: "crime", label: "Kriminalität", value: display.crime, trend: slope(compare.crime, display.crime) },
    { key: "economy", label: "Wirtschaft", value: display.economy, trend: slope(compare.economy, display.economy) },
    { key: "guard", label: "Garde", value: display.guard, trend: slope(compare.guard, display.guard) },
    {
      key: "unemployment",
      label: "Arbeitslos",
      value: display.unemployment,
      trend: slope(compare.unemployment, display.unemployment),
    },
    { key: "vattrak", label: "Religion", value: display.vattrak, trend: slope(compare.vattrak, display.vattrak) },
    { key: "tension", label: "Spannung", value: tensionNow, trend: slope(tensionCompare, tensionNow) },
  ];
}

function TrendMark({ trend }: { trend: KpiTrend }) {
  if (trend === "up") {
    return <TrendingUp className="h-3.5 w-3.5 shrink-0 text-hero-vibrant" aria-label="steigend" />;
  }
  if (trend === "down") {
    return <TrendingDown className="h-3.5 w-3.5 shrink-0 text-red-400" aria-label="sinkend" />;
  }
  return <Minus className="h-3.5 w-3.5 shrink-0 text-accent-gold" aria-label="unverändert" />;
}

type Props = {
  title: string;
  kpis: DistrictHudKpi[];
  day: string;
  districtId: CityDistrictId | null;
  hint?: string | null;
  layoutError?: string | null;
};

export function DistrictHudKpis({ title, kpis, day, districtId, hint, layoutError }: Props) {
  const cityWide = title === "Aurenfurt";
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const active = kpis.find((kpi) => kpi.key === hoverKey) ?? null;
  const stroke = active ? (KPI_ICON[active.key]?.stroke ?? "#cab926") : "#cab926";

  const weekSeries = useMemo(() => {
    if (!active) return [];
    return buildHudKpiWeekSeries(districtId, day, active.key);
  }, [active, day, districtId]);

  const weekDelta =
    weekSeries.length >= 2 ? weekSeries[weekSeries.length - 1].value - weekSeries[0].value : 0;

  return (
    <div data-cal-hint="" className="relative ml-auto flex min-w-0 flex-1 flex-col justify-end gap-1.5 pr-1">
      <div className="min-w-0">
        <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">
          {cityWide ? "Stadt gesamt" : "Ausgewähltes Viertel"}
        </p>
        <p className="truncate font-cinzel text-xl font-bold leading-tight text-accent-gold sm:text-2xl">{title}</p>
      </div>
      {layoutError ? (
        <p className="truncate font-libre text-[11px] leading-snug text-red-300" role="alert">
          {layoutError}
        </p>
      ) : null}
      <div className="relative" onMouseLeave={() => setHoverKey(null)}>
      <div className="flex min-w-0 gap-2 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
        {kpis.map((kpi) => {
          const meta = KPI_ICON[kpi.key];
          const Icon = meta?.Icon;
          const color = meta?.stroke ?? "#cab926";
          const rounded = Math.round(kpi.value);
          const hot = hoverKey === kpi.key;
          return (
            <div
              key={kpi.key}
              onMouseEnter={() => setHoverKey(kpi.key)}
              onFocus={() => setHoverKey(kpi.key)}
              tabIndex={0}
              role="button"
              aria-expanded={hot}
              aria-label={`${kpi.label}: ${rounded}. Wochenverlauf anzeigen.`}
              className={`min-w-[5.5rem] shrink-0 rounded-md border bg-background-card px-2.5 py-2 shadow-lg outline-none transition ${
                hot ? "border-hero-vibrant ring-1 ring-hero-vibrant/40" : "border-hero-dark"
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">
                  {kpi.label}
                </span>
                {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} aria-hidden /> : null}
              </div>
              <div className="mt-1 flex items-end justify-between gap-1">
                <span className="font-barlow text-2xl font-extrabold leading-none tabular-nums tracking-wide text-white sm:text-3xl">
                  {rounded}
                </span>
                <TrendMark trend={kpi.trend} />
              </div>
            </div>
          );
        })}
      </div>
      <AnimatePresence>
        {active ? (
          <motion.div
            key={active.key}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 right-0 top-full z-50 pt-1.5"
          >
            <div className="rounded-md border border-hero-border bg-background-card p-3 shadow-xl">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">
                  Verlauf · 7 Tage · {title}
                </p>
                <p className="font-cinzel text-base font-bold text-accent-gold">{active.label}</p>
              </div>
              <p
                className={`shrink-0 font-barlow text-xs font-bold tabular-nums ${
                  weekDelta > 0 ? "text-hero-vibrant" : weekDelta < 0 ? "text-red-300" : "text-gray-400"
                }`}
              >
                {weekDelta > 0 ? "+" : ""}
                {weekDelta} seit Wochenstart
              </p>
            </div>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weekSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#217d4233" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "#d1d5db", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "#d1d5db", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0a1f10",
                      border: "1px solid #217d42",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "#cab926" }}
                    formatter={(value) => [value, active.label]}
                    labelFormatter={(_, payload) => {
                      const point = payload?.[0]?.payload as { day?: string } | undefined;
                      return point?.day ?? "";
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name={active.label}
                    stroke={stroke}
                    strokeWidth={2}
                    dot={{ r: 3, fill: stroke }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      </div>
      {hint ? (
        <p className="truncate font-libre text-[10px] leading-snug text-gray-400" title={hint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
