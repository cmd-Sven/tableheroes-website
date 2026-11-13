"use client";

import { useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  Briefcase,
  Coins,
  Flower2,
  Hourglass,
  Shield,
  ShieldAlert,
  Skull,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Minus,
  Users,
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
import { SIM_METERS, type SimProfile } from "./aurenfurt-sim";

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
const MARBLE_BG = "/images/dark-marmor.webp";

const KPI_ICON: Record<string, { Icon: LucideIcon; stroke: string }> = {
  crime: { Icon: ShieldAlert, stroke: "#ef4444" },
  vattrak: { Icon: Sparkles, stroke: "#379806" },
  malanthir: { Icon: Skull, stroke: "#a78bfa" },
  guard: { Icon: Shield, stroke: "#38bdf8" },
  refugees: { Icon: Users, stroke: "#f59e0b" },
  economy: { Icon: Coins, stroke: "#cab926" },
  unemployment: { Icon: Briefcase, stroke: "#d4a574" },
  elysia: { Icon: Flower2, stroke: "#e7b6c9" },
  chromus: { Icon: Hourglass, stroke: "#7f93c9" },
  tension: { Icon: Activity, stroke: "#f0a36b" },
};

const KPI_SHORT: Record<string, string> = {
  crime: "Kriminalität",
  vattrak: "Vattrak",
  malanthir: "Malanthir",
  guard: "Garde",
  refugees: "Flüchtlinge",
  economy: "Wirtschaft",
  unemployment: "Arbeitslos",
  elysia: "Elysia",
  chromus: "Chromus",
  tension: "Spannung",
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
 * Alle Stadt-KPIs (Sim-Meter + Spannung) für die Karten-HUD.
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

  const meters = SIM_METERS.map((meter) => ({
    key: meter.key,
    label: KPI_SHORT[meter.key] ?? meter.label,
    value: display[meter.key] as number,
    trend: slope(compare[meter.key] as number, display[meter.key] as number),
  }));

  const tensionNow = tensionOf(display);
  const tensionCompare = tensionOf(compare);
  return [
    ...meters,
    {
      key: "tension",
      label: KPI_SHORT.tension,
      value: tensionNow,
      trend: slope(tensionCompare, tensionNow),
    },
  ];
}

function TrendMark({ trend }: { trend: KpiTrend }) {
  if (trend === "up") {
    return <TrendingUp className="h-2.5 w-2.5 shrink-0 text-hero-vibrant" aria-label="steigend" />;
  }
  if (trend === "down") {
    return <TrendingDown className="h-2.5 w-2.5 shrink-0 text-red-400" aria-label="sinkend" />;
  }
  return <Minus className="h-2.5 w-2.5 shrink-0 text-accent-gold" aria-label="unverändert" />;
}

const HUD_ROW_H = "h-10";
const HUD_CARD =
  "flex h-10 shrink-0 flex-col justify-between rounded border border-hero-dark/80 px-1.5 py-1 shadow-md";

type Props = {
  title: string;
  kpis: DistrictHudKpi[];
  day: string;
  districtId: CityDistrictId | null;
  hint?: string | null;
  layoutError?: string | null;
  population?: number;
  revenue?: number;
  /** Maßnahmen / Einstellungen — gleiche Zeilenhöhe. */
  trailing?: ReactNode;
};

export function DistrictHudKpis({
  title,
  kpis,
  day,
  districtId,
  hint,
  layoutError,
  population,
  revenue,
  trailing,
}: Props) {
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
    <div data-cal-hint="" className="relative ml-auto flex min-w-0 flex-1 flex-col justify-end gap-1 pr-1">
      <div className="flex min-w-0 items-baseline gap-1.5">
        <p className="shrink-0 font-barlow text-[8px] font-bold uppercase tracking-wide text-gray-400">
          {cityWide ? "Stadt gesamt" : "Viertel"}
        </p>
        <p className="truncate font-cinzel text-sm font-bold leading-none text-accent-gold">{title}</p>
        {hint ? (
          <p className="min-w-0 truncate font-libre text-[10px] leading-none text-gray-400" title={hint}>
            · {hint}
          </p>
        ) : null}
      </div>
      {layoutError ? (
        <p className="truncate font-libre text-[10px] leading-snug text-red-300" role="alert">
          {layoutError}
        </p>
      ) : null}

      <div className="relative" onMouseLeave={() => setHoverKey(null)}>
        <div className={`flex min-w-0 ${HUD_ROW_H} items-stretch gap-1`}>
          <div className="flex min-w-0 flex-1 items-stretch gap-1 overflow-x-auto [scrollbar-width:thin]">
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
                  className={`${HUD_CARD} min-w-[3.35rem] outline-none transition ${
                    hot ? "border-hero-vibrant ring-1 ring-hero-vibrant/40" : ""
                  }`}
                  style={{
                    backgroundImage: `url('${MARBLE_BG}')`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  <div className="flex items-center justify-between gap-0.5">
                    <span className="truncate font-barlow text-[7px] font-bold uppercase tracking-wide text-gray-300">
                      {kpi.label}
                    </span>
                    {Icon ? <Icon className="h-2.5 w-2.5 shrink-0" style={{ color }} aria-hidden /> : null}
                  </div>
                  <div className="flex items-end justify-between gap-0.5">
                    <span className="font-barlow text-sm font-extrabold leading-none tabular-nums tracking-wide text-white">
                      {rounded}
                    </span>
                    <TrendMark trend={kpi.trend} />
                  </div>
                </div>
              );
            })}
          </div>

          {population != null ? (
            <div
              data-city-map-hud="population"
              className={`${HUD_CARD} min-w-[4.5rem] items-end`}
              style={{
                backgroundImage: `url('${MARBLE_BG}')`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
              aria-label={`Bevölkerung ${population.toLocaleString("de-DE")}`}
            >
              <span className="font-barlow text-[7px] font-bold uppercase tracking-wide text-gray-300">
                Bevölkerung
              </span>
              <span className="font-barlow text-sm font-extrabold leading-none tabular-nums tracking-wide text-hero-vibrant">
                {population.toLocaleString("de-DE")}
              </span>
            </div>
          ) : null}

          {revenue != null ? (
            <div
              data-city-map-hud="revenue"
              className={`${HUD_CARD} min-w-[4.25rem] items-end`}
              style={{
                backgroundImage: `url('${MARBLE_BG}')`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
              aria-label={`Umsatz ${Math.round(revenue).toLocaleString("de-DE")} GP`}
            >
              <span className="font-barlow text-[7px] font-bold uppercase tracking-wide text-gray-300">
                Umsatz
              </span>
              <span className="font-barlow text-sm font-extrabold leading-none tabular-nums tracking-wide text-accent-gold">
                {Math.round(revenue).toLocaleString("de-DE")}
                <span className="ml-0.5 text-[8px] font-bold text-accent-gold/80">GP</span>
              </span>
            </div>
          ) : null}

          {trailing ? (
            <div className={`flex ${HUD_ROW_H} shrink-0 items-stretch gap-1`}>{trailing}</div>
          ) : null}
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
                      weekDelta > 0
                        ? "text-hero-vibrant"
                        : weekDelta < 0
                          ? "text-red-300"
                          : "text-gray-400"
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
                      <XAxis
                        dataKey="label"
                        tick={{ fill: "#d1d5db", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
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
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
