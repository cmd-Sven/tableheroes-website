"use client";

import { useMemo } from "react";
import type { DistrictDay } from "./aurenfurt-history";
import { SIM_METERS, type SimMeterKey } from "./aurenfurt-sim";
import type { DayWeather } from "./aurenfurt-weather";

const CULT_STROKES = ["#cab926", "#f0a070", "#9af6ff", "#c4b5fd", "#86efac", "#fb7185"];
const PLOT_W = 268;
const PLOT_H = 78;

export type ChartMetric = SimMeterKey | "cults" | "weather";

type Props = {
  series: DistrictDay[];
  metric: ChartMetric;
  weather?: DayWeather[];
  /** Markiert den betrachteten Tag in der 3-Jahres-Reihe. */
  markDay?: string | null;
};

function shortDate(iso: string) {
  const [year, month] = iso.split("-");
  return `${month}.${year.slice(2)}`;
}

function linePoints(values: number[], width: number, height: number, min: number, max: number) {
  if (values.length === 0) return "";
  const last = Math.max(1, values.length - 1);
  const span = Math.max(1, max - min);
  return values
    .map((value, index) => {
      const x = (index / last) * width;
      const y = height - ((value - min) / span) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function marksFor(min: number, max: number) {
  const mid = Math.round((min + max) / 2);
  return [max, mid, min].map((value) => ({
    label: String(value),
    y: PLOT_H - ((value - min) / Math.max(1, max - min)) * PLOT_H,
  }));
}

export function HoloMetricChart({ series, metric, weather = [], markDay = null }: Props) {
  const plot = useMemo(() => {
    if (metric === "weather") {
      if (weather.length < 2) return null;
      const temps = weather.map((day) => day.tempC);
      const min = Math.floor(Math.min(-12, ...temps) / 5) * 5;
      const max = Math.ceil(Math.max(28, ...temps) / 5) * 5;
      return {
        label: "Wetter",
        marks: marksFor(min, max),
        lines: [
          {
            name: "Temperatur",
            stroke: "#9af6ff",
            points: linePoints(temps, PLOT_W, PLOT_H, min, max),
          },
        ],
        days: weather.map((day) => day.day),
      };
    }
    if (series.length < 2) return null;
    if (metric === "cults") {
      const names: string[] = [];
      for (const day of series) {
        for (const cell of day.underground) {
          if (cell.strength > 0 && !names.includes(cell.name)) names.push(cell.name);
        }
      }
      return {
        label: "Kulte & Untergrund",
        marks: marksFor(0, 100),
        days: series.map((day) => day.day),
        lines: names.map((name, index) => ({
          name,
          stroke: CULT_STROKES[index % CULT_STROKES.length],
          points: linePoints(
            series.map((day) => day.underground.find((cell) => cell.name === name)?.strength ?? 0),
            PLOT_W,
            PLOT_H,
            0,
            100,
          ),
        })),
      };
    }
    const meter = SIM_METERS.find((entry) => entry.key === metric);
    return {
      label: meter?.label ?? metric,
      marks: marksFor(0, 100),
      days: series.map((day) => day.day),
      lines: [
        {
          name: meter?.label ?? metric,
          stroke: meter?.stroke ?? "#9af6ff",
          points: linePoints(
            series.map((day) => day[metric]),
            PLOT_W,
            PLOT_H,
            0,
            100,
          ),
        },
      ],
    };
  }, [series, metric, weather]);

  if (!plot) return null;

  const first = plot.days[0];
  const mid = plot.days[Math.floor((plot.days.length - 1) / 2)];
  const last = plot.days[plot.days.length - 1];
  const markIndex = markDay ? plot.days.indexOf(markDay) : -1;
  const markX =
    markIndex >= 0 && plot.days.length > 1
      ? (markIndex / Math.max(1, plot.days.length - 1)) * PLOT_W
      : null;
  const markY = (() => {
    if (markIndex < 0 || markX === null) return null;
    const primary = plot.lines[0];
    if (!primary?.points) return PLOT_H / 2;
    const pair = primary.points.split(" ")[markIndex];
    if (!pair) return PLOT_H / 2;
    const y = Number(pair.split(",")[1]);
    return Number.isFinite(y) ? y : PLOT_H / 2;
  })();

  return (
    <figure className="mt-3">
      <figcaption className="mb-1 font-barlow text-[10px] font-bold uppercase tracking-wide text-cyan-200">
        {plot.label}
        {first && last ? ` · ${shortDate(first)}–${shortDate(last)}` : ""}
      </figcaption>
      <svg
        viewBox={`0 0 ${32 + PLOT_W} ${10 + PLOT_H}`}
        className="h-36 w-full"
        role="img"
        aria-label={`${plot.label} über drei Jahre`}
      >
        <g transform="translate(28 4)">
          {plot.marks.map((mark) => (
            <g key={mark.label}>
              <line
                x1="0"
                x2={PLOT_W}
                y1={mark.y}
                y2={mark.y}
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="0.4"
                vectorEffect="non-scaling-stroke"
              />
              <text x="-4" y={mark.y + 3} textAnchor="end" fill="#d1d5db" fontSize="9">
                {mark.label}
              </text>
            </g>
          ))}
          {plot.lines.map((line) => (
            <polyline
              key={line.name}
              points={line.points}
              fill="none"
              stroke={line.stroke}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {markX !== null && markY !== null ? (
            <g aria-hidden>
              <line
                x1={markX}
                x2={markX}
                y1={0}
                y2={PLOT_H}
                stroke="#cab926"
                strokeWidth="1.2"
                strokeDasharray="3 2"
                vectorEffect="non-scaling-stroke"
                opacity="0.9"
              />
              <circle cx={markX} cy={markY} r="3" fill="#cab926" stroke="#0a1f10" strokeWidth="0.8" />
            </g>
          ) : null}
        </g>
      </svg>
      <div className="flex justify-between font-barlow text-[9px] font-bold uppercase tracking-wide text-gray-400">
        <span>{first ? shortDate(first) : ""}</span>
        <span>{mid ? shortDate(mid) : ""}</span>
        <span>{last ? shortDate(last) : ""}</span>
      </div>
      {metric === "cults" && plot.lines.length > 0 ? (
        <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
          {plot.lines.map((line) => (
            <li key={line.name} className="flex items-center gap-1 font-barlow text-[9px] font-bold uppercase tracking-wide text-gray-300">
              <span className="inline-block h-1.5 w-3 rounded-full" style={{ backgroundColor: line.stroke }} />
              {line.name}
            </li>
          ))}
        </ul>
      ) : null}
    </figure>
  );
}
