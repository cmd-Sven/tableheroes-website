"use client";

/**
 * Tableau-artige Small Multiples: komplette Simulationsgeschichte (ca. 3 Jahre)
 * als Monatsverläufe. Bis zu drei KPIs wählbar.
 */

import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CityDistrictId } from "./aurenfurt-districts";
import {
  HIGHER_IS_WORSE,
  buildLongTermMonthlySeries,
  type LongTermMonthPoint,
} from "./aurenfurt-analytics";
import { HISTORY_START } from "./aurenfurt-history";
import { populationSeriesForRange } from "./aurenfurt-population";
import { SIM_METERS, type SimMeterKey } from "./aurenfurt-sim";
import { DERIVED_KPI_META, KPI_META } from "./CityDashboardParts";
import { CityPathScatter } from "./CityPathScatter";

export type LongTermChartKey = SimMeterKey | "tension" | "population";

type Props = {
  day: string;
  scopeId: CityDistrictId | null;
  scopeLabel: string;
};

type ChartSpec = {
  key: LongTermChartKey;
  title: string;
  unit: string;
  stroke: string;
  fill: string;
  domain: [number, number] | ["auto", "auto"];
  worseUp: boolean;
};

const MAX_CHARTS = 3;

const DEFAULT_KEYS: LongTermChartKey[] = ["crime", "economy", "population"];

const CHART_OPTIONS: ChartSpec[] = [
  ...SIM_METERS.map((meter) => ({
    key: meter.key as LongTermChartKey,
    title: meter.label,
    unit: "Index 0–100",
    stroke: meter.stroke,
    fill: `${meter.stroke}48`,
    domain: [0, 100] as [number, number],
    worseUp: HIGHER_IS_WORSE.has(meter.key),
  })),
  {
    key: "tension",
    title: "Spannung",
    unit: "Index 0–100",
    stroke: "#f0a36b",
    fill: "rgba(240,163,107,0.28)",
    domain: [0, 100],
    worseUp: true,
  },
  {
    key: "population",
    title: "Bevölkerung",
    unit: "Köpfe",
    stroke: "#38bdf8",
    fill: "rgba(56,189,248,0.22)",
    domain: ["auto", "auto"],
    worseUp: false,
  },
];

const OPTION_BY_KEY = Object.fromEntries(CHART_OPTIONS.map((entry) => [entry.key, entry])) as Record<
  LongTermChartKey,
  ChartSpec
>;

function monthKey(iso: string) {
  return iso.slice(0, 7);
}

function mergePopulation(
  points: LongTermMonthPoint[],
  scopeId: CityDistrictId | null,
): LongTermMonthPoint[] {
  if (points.length === 0) return points;
  // Eine Population-Serie bis Stichtag reicht; Monatswerte daraus ableiten
  // (vermeidet N× populationOn und hält den Cache warm).
  const toIso = points[points.length - 1].day;
  const fromIso = points[0].day;
  const popSeries = populationSeriesForRange(fromIso, toIso);
  const byMonth = new Map<string, number>();
  // Nur Monatsenden / letzter Tag je Monat — O(Monate) statt O(Tage) Lookup danach.
  for (let i = 0; i < popSeries.length; i += 1) {
    const snap = popSeries[i];
    const key = monthKey(snap.day);
    const next = popSeries[i + 1];
    if (!next || monthKey(next.day) !== key) {
      const value = scopeId
        ? (snap.districts[scopeId]?.population_total ?? 0)
        : snap.population_total;
      byMonth.set(key, value);
    }
  }
  return points.map((point) => ({
    ...point,
    population: byMonth.get(monthKey(point.day)) ?? point.population,
  }));
}

function trendDelta(points: LongTermMonthPoint[], key: LongTermChartKey) {
  if (points.length < 2) return null;
  const first = points[0][key];
  const last = points[points.length - 1][key];
  return last - first;
}

function formatValue(key: LongTermChartKey, value: number) {
  if (key === "population") return Math.round(value).toLocaleString("de-DE");
  return Math.round(value).toString();
}

function deltaClass(delta: number, worseUp: boolean) {
  if (delta === 0) return "text-gray-400";
  const good = worseUp ? delta < 0 : delta > 0;
  return good ? "text-hero-vibrant" : "text-red-400";
}

function OverviewTooltip({
  active,
  payload,
  label,
  unit,
  seriesKey,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
  unit: string;
  seriesKey: LongTermChartKey;
}) {
  if (!active || !payload?.length) return null;
  const value = Number(payload[0]?.value ?? 0);
  return (
    <div className="rounded border border-hero-border/60 bg-background-card px-2.5 py-1.5 shadow-lg">
      <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="font-barlow text-sm font-extrabold tabular-nums text-white">
        {formatValue(seriesKey, value)}
      </p>
      <p className="font-libre text-[10px] text-gray-400">{unit}</p>
    </div>
  );
}

export function CityLongTermOverview({ day, scopeId, scopeLabel }: Props) {
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<LongTermChartKey[]>(DEFAULT_KEYS);

  useEffect(() => {
    setReady(false);
    const handle = window.setTimeout(() => {
      startTransition(() => setReady(true));
    }, 0);
    return () => window.clearTimeout(handle);
  }, [day, scopeId]);

  const series = useMemo(() => {
    if (!ready) return [] as LongTermMonthPoint[];
    const meters = buildLongTermMonthlySeries(day, scopeId);
    return mergePopulation(meters, scopeId);
  }, [ready, day, scopeId]);

  const populationUnit = scopeId ? `Köpfe (${scopeLabel})` : "Köpfe (Stadt)";

  const fromLabel = useMemo(() => {
    const [y, m] = HISTORY_START.split("-");
    return `${Number(m)}.${y}`;
  }, []);

  const toggleKey = useCallback((key: LongTermChartKey) => {
    setSelected((current) => {
      if (current.includes(key)) {
        if (current.length <= 1) return current;
        return current.filter((entry) => entry !== key);
      }
      if (current.length >= MAX_CHARTS) {
        return [...current.slice(1), key];
      }
      return [...current, key];
    });
  }, []);

  const activeCharts = selected
    .map((key) => OPTION_BY_KEY[key])
    .filter((entry): entry is ChartSpec => Boolean(entry));

  if (!ready) {
    return (
      <div className="rounded-md border border-hero-dark/60 bg-background-dark/40 p-4">
        <p className="font-cinzel text-base font-bold text-accent-gold">Drei Jahre auf einen Blick</p>
        <p className="mt-2 font-libre text-sm text-gray-400">Monatsverläufe werden gerechnet…</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-hero-dark/60 bg-background-dark/40 p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="font-cinzel text-base font-bold text-accent-gold">Drei Jahre auf einen Blick</h3>
          <p className="mt-1 font-libre text-xs text-gray-400">
            Monatliche Mittel · {scopeLabel} · {fromLabel} bis Stichtag · max. {MAX_CHARTS} KPIs
          </p>
        </div>
        <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">
          {selected.length}/{MAX_CHARTS} · {series.length} Monate
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {CHART_OPTIONS.map((option) => {
          const on = selected.includes(option.key);
          const atCap = !on && selected.length >= MAX_CHARTS;
          return (
            <button
              key={option.key}
              type="button"
              aria-pressed={on}
              title={
                atCap
                  ? `Maximal ${MAX_CHARTS} Charts — Klick ersetzt den ältesten`
                  : option.title
              }
              onClick={() => toggleKey(option.key)}
              className={`rounded border px-2 py-1 font-barlow text-[10px] font-bold uppercase tracking-wide transition-opacity ${
                on
                  ? "border-transparent text-[#04140a]"
                  : "border-hero-border/50 bg-transparent text-gray-400 hover:text-white"
              } ${atCap ? "opacity-70" : ""}`}
              style={on ? { backgroundColor: option.stroke } : undefined}
            >
              {option.key === "population"
                ? "Bevölkerung"
                : option.key === "tension"
                  ? DERIVED_KPI_META.tension.short
                  : KPI_META[option.key as SimMeterKey]?.short ?? option.title}
            </button>
          );
        })}
      </div>

      <div
        className={`mt-4 grid gap-3 ${
          activeCharts.length === 1
            ? "lg:grid-cols-1"
            : activeCharts.length === 2
              ? "lg:grid-cols-2"
              : "lg:grid-cols-3"
        }`}
      >
        {activeCharts.map((chart) => {
          const last = series[series.length - 1];
          const delta = trendDelta(series, chart.key);
          const yearTicks = series.filter((point) => point.month === 0).map((point) => point.label);
          const unit = chart.key === "population" ? populationUnit : chart.unit;
          return (
            <article
              key={chart.key}
              className="rounded-md border border-hero-dark/70 bg-background-card/80 p-3 shadow-lg"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">
                    {chart.title}
                  </p>
                  <p className="font-barlow text-2xl font-extrabold tabular-nums text-white">
                    {last ? formatValue(chart.key, last[chart.key]) : "—"}
                  </p>
                </div>
                {delta != null ? (
                  <span
                    className={`font-barlow text-[11px] font-bold uppercase tabular-nums ${deltaClass(
                      delta,
                      chart.worseUp,
                    )}`}
                  >
                    {delta > 0 ? "+" : ""}
                    {chart.key === "population"
                      ? Math.round(delta).toLocaleString("de-DE")
                      : Math.round(delta)}
                    <span className="block text-[9px] font-semibold text-gray-500">seit Start</span>
                  </span>
                ) : null}
              </div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series} margin={{ top: 6, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#217d4233" vertical={false} />
                    <XAxis
                      dataKey="label"
                      ticks={yearTicks.length > 0 ? yearTicks : undefined}
                      tick={{ fill: "#9ca3af", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                      minTickGap={28}
                    />
                    <YAxis
                      domain={chart.domain}
                      tick={{ fill: "#9ca3af", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={chart.key === "population" ? 42 : 28}
                      tickFormatter={(value: number) =>
                        chart.key === "population"
                          ? value >= 1000
                            ? `${Math.round(value / 1000)}k`
                            : String(Math.round(value))
                          : String(Math.round(value))
                      }
                    />
                    <Tooltip
                      content={<OverviewTooltip unit={unit} seriesKey={chart.key} />}
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey={chart.key}
                      name={chart.title}
                      stroke={chart.stroke}
                      fill={chart.fill}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 3 }}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-1 font-libre text-[10px] text-gray-500">{unit}</p>
            </article>
          );
        })}
      </div>

      <p className="mt-3 font-libre text-[11px] leading-relaxed text-gray-500">
        KPIs oben anwählen (max. {MAX_CHARTS}). Bei vollem Slot ersetzt der nächste Klick den
        ältesten. Alle Verläufe folgen dem Zuschnitt ({scopeLabel}).
      </p>

      <CityPathScatter day={day} scopeId={scopeId} scopeLabel={scopeLabel} series={series} />
    </div>
  );
}
