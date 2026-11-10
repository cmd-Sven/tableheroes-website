"use client";

/**
 * Connected Scatter: Kriminalität × Wirtschaft als Monatspfad.
 * Zeigt, wie sich die Stadt über ~3 Jahre im Zustandsraum bewegt —
 * mit Markern für prägende Geschichtsereignisse.
 */

import { startTransition, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { CityDistrictId } from "./aurenfurt-districts";
import {
  buildLongTermMonthlySeries,
  longTermPathMarkers,
  type LongTermMonthPoint,
  type LongTermPathMarker,
} from "./aurenfurt-analytics";
import { HISTORY_START } from "./aurenfurt-history";

type Props = {
  day: string;
  scopeId: CityDistrictId | null;
  scopeLabel: string;
  /** Fertige Serie von CityLongTermOverview — vermeidet Doppelrechnung. */
  series?: LongTermMonthPoint[];
};

type PathPoint = {
  crime: number;
  economy: number;
  label: string;
  day: string;
  index: number;
  kind: "path" | "event";
  title?: string;
};

function PathTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: PathPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <div className="rounded border border-hero-border/60 bg-background-card px-2.5 py-1.5 shadow-lg">
      <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">
        {point.kind === "event" ? point.title : point.label}
      </p>
      {point.kind === "event" ? (
        <p className="font-libre text-[10px] text-accent-gold">{point.label}</p>
      ) : null}
      <p className="mt-1 font-barlow text-sm font-extrabold tabular-nums text-white">
        Kri {Math.round(point.crime)} · Wirt {Math.round(point.economy)}
      </p>
    </div>
  );
}

function pathFill(index: number, total: number) {
  if (index === 0) return "#38bdf8";
  if (index === total - 1) return "#cab926";
  const t = total <= 1 ? 0 : index / (total - 1);
  // Grün → Gold entlang des Pfads
  if (t < 0.5) return "#217d42";
  return "#379806";
}

export function CityPathScatter({ day, scopeId, scopeLabel, series: sharedSeries }: Props) {
  const [ready, setReady] = useState(Boolean(sharedSeries?.length));

  useEffect(() => {
    if (sharedSeries && sharedSeries.length > 0) {
      setReady(true);
      return;
    }
    setReady(false);
    const handle = window.setTimeout(() => {
      startTransition(() => setReady(true));
    }, 0);
    return () => window.clearTimeout(handle);
  }, [day, scopeId, sharedSeries]);

  const series = useMemo(() => {
    if (!ready) return [] as LongTermMonthPoint[];
    if (sharedSeries && sharedSeries.length > 0) return sharedSeries;
    return buildLongTermMonthlySeries(day, scopeId);
  }, [ready, day, scopeId, sharedSeries]);

  const pathPoints = useMemo<PathPoint[]>(
    () =>
      series.map((point, index) => ({
        crime: point.crime,
        economy: point.economy,
        label: point.label,
        day: point.day,
        index,
        kind: "path" as const,
      })),
    [series],
  );

  const markers = useMemo(() => longTermPathMarkers(series, scopeId), [series, scopeId]);

  const eventPoints = useMemo<PathPoint[]>(
    () =>
      markers.map((marker: LongTermPathMarker, index) => ({
        crime: marker.crime,
        economy: marker.economy,
        label: marker.label,
        day: marker.day,
        index,
        kind: "event" as const,
        title: marker.title,
      })),
    [markers],
  );

  const fromLabel = useMemo(() => {
    const [y, m] = HISTORY_START.split("-");
    return `${Number(m)}.${y}`;
  }, []);

  const start = pathPoints[0];
  const end = pathPoints[pathPoints.length - 1];

  if (!ready) {
    return (
      <div className="mt-4 rounded-md border border-hero-dark/60 bg-background-dark/40 p-4">
        <p className="font-cinzel text-base font-bold text-accent-gold">Zustandsraum</p>
        <p className="mt-2 font-libre text-sm text-gray-400">Pfad wird gerechnet…</p>
      </div>
    );
  }

  if (pathPoints.length < 2) {
    return null;
  }

  return (
    <div className="mt-4 rounded-md border border-hero-dark/60 bg-background-dark/40 p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="font-cinzel text-base font-bold text-accent-gold">
            Zustandsraum · Kriminalität × Wirtschaft
          </h3>
          <p className="mt-1 font-libre text-xs text-gray-400">
            Monatspfad · {scopeLabel} · {fromLabel} bis Stichtag · jeder Punkt = ein Monat
          </p>
        </div>
        <div className="flex flex-wrap gap-3 font-barlow text-[10px] font-bold uppercase tracking-wide">
          <span className="text-sky-400">Start · {start?.label}</span>
          <span className="text-accent-gold">Jetzt · {end?.label}</span>
        </div>
      </div>

      <div className="mt-3 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 12, right: 16, bottom: 8, left: 4 }}>
            <CartesianGrid stroke="#217d4233" strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="crime"
              name="Kriminalität"
              domain={[0, 100]}
              tick={{ fill: "#9ca3af", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              label={{
                value: "Kriminalität →",
                position: "insideBottom",
                offset: -2,
                fill: "#6b7280",
                fontSize: 10,
              }}
            />
            <YAxis
              type="number"
              dataKey="economy"
              name="Wirtschaft"
              domain={[0, 100]}
              tick={{ fill: "#9ca3af", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={32}
              label={{
                value: "Wirtschaft →",
                angle: -90,
                position: "insideLeft",
                offset: 12,
                fill: "#6b7280",
                fontSize: 10,
              }}
            />
            <ZAxis range={[48, 48]} />
            <Tooltip content={<PathTooltip />} isAnimationActive={false} cursor={{ strokeDasharray: "3 3" }} />
            <Scatter
              name="Pfad"
              data={pathPoints}
              line={{ stroke: "#cab92699", strokeWidth: 2 }}
              lineJointType="monotone"
              isAnimationActive={false}
            >
              {pathPoints.map((point) => (
                <Cell
                  key={`path-${point.day}`}
                  fill={pathFill(point.index, pathPoints.length)}
                  stroke="#04140a"
                  strokeWidth={point.index === 0 || point.index === pathPoints.length - 1 ? 1.5 : 0.5}
                />
              ))}
            </Scatter>
            {eventPoints.length > 0 ? (
              <Scatter
                name="Ereignisse"
                data={eventPoints}
                fill="#58180D"
                shape="diamond"
                isAnimationActive={false}
              >
                {eventPoints.map((point) => (
                  <Cell key={`ev-${point.title}-${point.day}`} fill="#cab926" stroke="#58180D" strokeWidth={1.5} />
                ))}
              </Scatter>
            ) : null}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {eventPoints.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {eventPoints.map((point) => (
            <li
              key={`${point.title}-${point.day}`}
              className="font-libre text-[10px] text-gray-400"
              title={`Kri ${Math.round(point.crime)} · Wirt ${Math.round(point.economy)}`}
            >
              <span className="mr-1 inline-block h-2 w-2 rotate-45 bg-accent-gold align-middle" aria-hidden />
              <span className="text-accent-gold">{point.title}</span>
              <span className="text-gray-500"> · {point.label}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-3 font-libre text-[11px] leading-relaxed text-gray-500">
        Der Pfad zeigt, wie Kriminalität und Wirtschaft gemeinsam wandern — nicht nur parallel in
        Liniencharts. Rauten markieren prägende Ereignisse. Idealerweise driftet die Stadt nach links
        oben (weniger Kriminalität, mehr Wirtschaft).
      </p>
    </div>
  );
}
