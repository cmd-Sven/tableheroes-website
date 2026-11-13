/**
 * Dashboard-Block: Bevölkerung (Stacked), Kräfte, Marktindizes, tägliche Kasse.
 * Einsatz: unter dem Meter-Verlauf in CityDashboard einbinden (Stadt oder Viertel).
 */

"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CityDistrictId } from "./aurenfurt-districts";
import { formatKassadrasDayShort } from "@/src/lib/world/kassadras-calendar";
import { findDistrict } from "./aurenfurt-districts";
import { districtMetricsOn } from "./aurenfurt-history";
import { buildFinanceSeries, calculateDistrictFinances, formatGp, sumFinances } from "./aurenfurt-finances";
import { kaiserTreasuryIncomeOn } from "./aurenfurt-kaiser-plays";
import { treasuryDeltaOn } from "./aurenfurt-treasury-events";
import {
  cityMarketSeriesForRange,
  districtMarketSeriesForRange,
  marketOn,
} from "./aurenfurt-market";
import { MARKET_BASKET_LABELS, MARKET_BASKETS } from "./aurenfurt-market-types";
import {
  populationOn,
  populationSeriesForRange,
} from "./aurenfurt-population";
import { POP_LAYER_LABELS } from "./aurenfurt-population-types";
import { parseDay } from "./aurenfurt-time";
import { vattrakStockOn } from "./aurenfurt-vattrak-stock";
import { VattrakLagerCard } from "./VattrakLagerCard";
import { warPhaseLabel, warPhaseLore, warPhaseOn } from "./aurenfurt-war-events";
import type { AnalyticsRange } from "./aurenfurt-analytics";

type Props = {
  day: string;
  range: AnalyticsRange;
  scopeId: CityDistrictId | null;
};

const LAYER_COLORS = {
  pop_nobles: "#cab926",
  pop_citizens: "#379806",
  pop_guards: "#38bdf8",
  pop_lowerclass: "#d4a574",
} as const;

const MARKET_COLORS: Record<string, string> = {
  food: "#e8b86d",
  raw: "#9ca3af",
  luxury: "#cab926",
  arms: "#ef4444",
  vattrak: "#379806",
  malanthir: "#a78bfa",
};

function rangeFrom(day: string, range: AnalyticsRange) {
  const end = parseDay(day);
  const dayMs = 86_400_000;
  if (range === "day") return end - 13 * dayMs;
  if (range === "week") return end - 6 * dayMs;
  if (range === "month") return end - 29 * dayMs;
  return end - 364 * dayMs;
}

function formatDayLabel(iso: string) {
  return formatKassadrasDayShort(iso);
}

export function CitySocietyPanels({ day, range, scopeId }: Props) {
  const fromIso = useMemo(() => {
    const ms = rangeFrom(day, range);
    const date = new Date(ms);
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    return `${date.getUTCFullYear()}-${m}-${d}`;
  }, [day, range]);

  // Schwere Serien erst nach Paint — vermeidet Page-Unresponsive beim Dashboard-Klick.
  const [seriesReady, setSeriesReady] = useState(false);
  useEffect(() => {
    setSeriesReady(false);
    const id = requestAnimationFrame(() => {
      startTransition(() => setSeriesReady(true));
    });
    return () => cancelAnimationFrame(id);
  }, [day, range, scopeId]);

  const popSnap = useMemo(() => (seriesReady ? populationOn(day) : null), [day, seriesReady]);
  const stock = useMemo(() => (seriesReady ? vattrakStockOn(day) : null), [day, seriesReady]);
  const market = useMemo(() => (seriesReady ? marketOn(day, scopeId) : null), [day, scopeId, seriesReady]);

  const popChart = useMemo(() => {
    if (!seriesReady) return [];
    const series = populationSeriesForRange(fromIso, day);
    return series.map((point) => {
      const row = scopeId ? point.districts[scopeId] : point;
      return {
        label: formatDayLabel(point.day),
        pop_nobles: row.pop_nobles,
        pop_citizens: row.pop_citizens,
        pop_guards: row.pop_guards,
        pop_lowerclass: row.pop_lowerclass,
        total: row.population_total,
      };
    });
  }, [seriesReady, day, fromIso, scopeId]);

  const marketChart = useMemo(() => {
    if (!seriesReady) return [];
    const series = scopeId
      ? districtMarketSeriesForRange(scopeId, fromIso, day)
      : cityMarketSeriesForRange(fromIso, day);
    return series.map((point) => ({
      label: formatDayLabel(point.day),
      food: point.food,
      raw: point.raw,
      luxury: point.luxury,
      arms: point.arms,
      vattrak: point.vattrak,
      malanthir: point.malanthir,
    }));
  }, [seriesReady, day, fromIso, scopeId]);

  const finances = useMemo(() => {
    if (!popSnap) return { income: 0, expenses: 0, net: 0, notes: [] as string[] };
    const dayMs = parseDay(day);
    const base = scopeId
      ? (() => {
          const layers = popSnap.districts[scopeId];
          const meters = districtMetricsOn(scopeId, dayMs);
          return calculateDistrictFinances(layers, meters.economy, {
            crime: meters.crime,
            guardMeter: meters.guard,
          });
        })()
      : sumFinances(
          Object.values(popSnap.districts).map((layers) => {
            const meters = districtMetricsOn(layers.districtId, dayMs);
            return calculateDistrictFinances(layers, meters.economy, {
              crime: meters.crime,
              guardMeter: meters.guard,
            });
          }),
        );
    const delta = treasuryDeltaOn(day, scopeId);
    const kaiserLoan = scopeId ? { income: 0, titles: [] as string[] } : kaiserTreasuryIncomeOn(day);
    const income = base.income + delta.income + kaiserLoan.income;
    const expenses = base.expenses + delta.expenses;
    return {
      income,
      expenses,
      net: income - expenses,
      notes: [...delta.titles, ...kaiserLoan.titles],
    };
  }, [day, popSnap, scopeId]);

  const financeChart = useMemo(() => {
    if (!seriesReady) return [];
    return buildFinanceSeries(fromIso, day, scopeId).map((point) => ({
      label: formatDayLabel(point.day),
      income: point.income,
      expenses: point.expenses,
      net: point.net,
      notes: point.notes,
    }));
  }, [seriesReady, day, fromIso, scopeId]);

  const scopeLabel = scopeId ? (findDistrict(scopeId)?.name ?? scopeId) : "Aurenfurt gesamt";

  if (!popSnap || !stock || !market) {
    return (
      <section className="mt-4 rounded-md border border-hero-dark bg-background-card p-4 shadow-lg">
        <h3 className="font-cinzel text-base font-bold text-accent-gold">Gesellschaft · {scopeLabel}</h3>
        <p className="mt-2 font-libre text-sm text-gray-400">Berechne Bevölkerung, Markt und Lager…</p>
      </section>
    );
  }

  const guardsInCity = scopeId ? popSnap.districts[scopeId].pop_guards : popSnap.pop_guards;
  const phase = warPhaseOn(parseDay(day));

  return (
    <section className="mt-4 space-y-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <article className="rounded-md border border-hero-dark bg-background-card p-4 shadow-lg">
          <h3 className="font-cinzel text-base font-bold text-accent-gold">Bevölkerung · {scopeLabel}</h3>
          <p className="mt-1 font-libre text-xs text-gray-400">
            Schichten gestapelt · {popSnap.population_total.toLocaleString("de-DE")} Köpfe Stadtweit am Stichtag
          </p>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={popChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#217d4233" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#d1d5db", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#d1d5db", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip
                  contentStyle={{ background: "#0a1f10", border: "1px solid #217d42", borderRadius: 6, fontSize: 12 }}
                />
                {(Object.keys(LAYER_COLORS) as (keyof typeof LAYER_COLORS)[]).map((key) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={POP_LAYER_LABELS[key]}
                    stackId="pop"
                    stroke={LAYER_COLORS[key]}
                    fill={LAYER_COLORS[key]}
                    fillOpacity={0.55}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <div className="grid gap-3">
          <article className="rounded-md border border-hero-dark bg-background-card p-4 shadow-lg">
            <h3 className="font-cinzel text-base font-bold text-accent-gold">Kräfte</h3>
            <p className="mt-1 font-libre text-xs text-gray-400">
              {warPhaseLabel(phase)} · Greifenberg / Xarvathar
            </p>
            <p className="mt-1 font-libre text-[10px] leading-snug text-gray-500">{warPhaseLore(phase)}</p>
            <dl className="mt-3 space-y-2 font-libre text-sm text-gray-200">
              <div className="flex justify-between gap-2">
                <dt className="text-gray-400">Garde in der Stadt</dt>
                <dd className="tabular-nums text-sky-300">{guardsInCity.toLocaleString("de-DE")}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-400">Soldaten an der Front</dt>
                <dd className="tabular-nums text-accent-gold">
                  {popSnap.soldiers_at_front.toLocaleString("de-DE")}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-400">Frontverluste (kumuliert)</dt>
                <dd className="tabular-nums text-red-300">
                  {popSnap.front_casualties.toLocaleString("de-DE")}
                </dd>
              </div>
            </dl>
          </article>

          <article className="rounded-md border border-hero-dark bg-background-card p-4 shadow-lg">
            <h3 className="font-cinzel text-base font-bold text-accent-gold">
              {scopeId ? "Tägliche Viertel-Bilanz" : "Tägliche Stadtkasse"}
            </h3>
            <dl className="mt-3 space-y-2 font-libre text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-gray-400">Einnahmen</dt>
                <dd className="tabular-nums text-hero-vibrant">{formatGp(finances.income)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-gray-400">Ausgaben</dt>
                <dd className="tabular-nums text-red-300">{formatGp(-finances.expenses)}</dd>
              </div>
              <div className="flex justify-between gap-2 border-t border-hero-border/40 pt-2">
                <dt className="font-barlow text-xs font-bold uppercase tracking-wide text-accent-gold">Netto</dt>
                <dd
                  className={`tabular-nums font-barlow font-bold ${
                    finances.net >= 0 ? "text-hero-vibrant" : "text-red-300"
                  }`}
                >
                  {formatGp(finances.net)}
                </dd>
              </div>
            </dl>
            <p className="mt-2 font-libre text-[10px] text-gray-500">
              Basis aus Bevölkerung × Wirtschaft, plus historische Kassenimpulse — ohne Rückwirkung auf Meter.
            </p>
            {finances.notes.length > 0 ? (
              <p className="mt-1 font-libre text-[10px] leading-snug text-accent-gold/80">
                Heute u. a.: {finances.notes.slice(0, 2).join(" · ")}
                {finances.notes.length > 2 ? ` · +${finances.notes.length - 2}` : ""}
              </p>
            ) : null}
          </article>
        </div>
      </div>

      <article className="rounded-md border border-hero-dark bg-background-card p-4 shadow-lg">
        <h3 className="font-cinzel text-base font-bold text-accent-gold">Kassenverlauf · {scopeLabel}</h3>
        <p className="mt-1 font-libre text-xs text-gray-400">
          Tägliche Einnahmen, Ausgaben und Netto (GP) — inkl. Bau, Ausbildung, Handelsdeals
        </p>
        <div className="mt-3 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={financeChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#217d4233" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#d1d5db", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#d1d5db", fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
              <Tooltip
                contentStyle={{ background: "#0a1f10", border: "1px solid #217d42", borderRadius: 6, fontSize: 12 }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const notes = (payload[0]?.payload as { notes?: string[] } | undefined)?.notes ?? [];
                  return (
                    <div className="max-w-xs rounded-md border border-hero-dark bg-background-dark px-3 py-2 shadow-lg">
                      <p className="font-barlow text-[11px] font-bold uppercase text-accent-gold">{label}</p>
                      {payload.map((row) => (
                        <p key={String(row.dataKey)} className="font-libre text-xs text-gray-100">
                          <span style={{ color: row.color }}>{row.name}</span>{" "}
                          {typeof row.value === "number" ? Math.round(row.value).toLocaleString("de-DE") : row.value} GP
                        </p>
                      ))}
                      {notes.length > 0 ? (
                        <div className="mt-1.5 border-t border-hero-dark/70 pt-1.5">
                          {notes.slice(0, 3).map((note) => (
                            <p key={note} className="font-libre text-[10px] leading-snug text-gray-300">
                              {note}
                            </p>
                          ))}
                          {notes.length > 3 ? (
                            <p className="font-barlow text-[9px] font-bold uppercase text-gray-500">
                              +{notes.length - 3} weitere
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                }}
              />
              <Line type="monotone" dataKey="income" name="Einnahmen" stroke="#379806" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="expenses" name="Ausgaben" stroke="#f87171" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="net" name="Netto" stroke="#cab926" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </article>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <article className="rounded-md border border-hero-dark bg-background-card p-4 shadow-lg">
          <h3 className="font-cinzel text-base font-bold text-accent-gold">Marktlage · Index 100 = 26.09.2023</h3>
          <p className="mt-1 font-libre text-xs text-gray-400">{scopeLabel}</p>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={marketChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#217d4233" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#d1d5db", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[80, "auto"]} tick={{ fill: "#d1d5db", fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
                <Tooltip
                  contentStyle={{ background: "#0a1f10", border: "1px solid #217d42", borderRadius: 6, fontSize: 12 }}
                />
                {MARKET_BASKETS.map((key) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={MARKET_BASKET_LABELS[key]}
                    stroke={MARKET_COLORS[key]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 flex flex-wrap gap-2">
            {MARKET_BASKETS.map((key) => (
              <li key={key} className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">
                <span style={{ color: MARKET_COLORS[key] }}>{MARKET_BASKET_LABELS[key]}</span>
                <span className="ml-1 tabular-nums text-white">{market[key]}</span>
              </li>
            ))}
          </ul>
        </article>

        <VattrakLagerCard stock={stock} />
      </div>
    </section>
  );
}
