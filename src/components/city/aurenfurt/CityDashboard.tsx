"use client";

import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AURENFURT_DISTRICTS, type CityDistrictId } from "./aurenfurt-districts";
import {
  ANALYTICS_RANGES,
  RANGE_LABEL,
  buildCityAnalytics,
  deltaTone,
  type AnalyticsRange,
  type CityAnalytics,
  type DistrictRank,
} from "./aurenfurt-analytics";
import { citySimVersion, subscribeCitySim } from "./aurenfurt-city-sim";
import { HoloDayCalendar } from "./HoloDayCalendar";
import { SIM_METERS, type SimMeterKey } from "./aurenfurt-sim";
import type { DayWeather, WeatherKind } from "./aurenfurt-weather";
import { CityViewSwitch } from "./CityViewSwitch";
import { CityHudChrome } from "./CityHudFrame";
const WEATHER_COLOR: Record<WeatherKind, string> = {
  clear: "#f0d85a",
  cloudy: "#94a3b8",
  fog: "#cbd5e1",
  rain: "#38bdf8",
  storm: "#818cf8",
  snow: "#e2e8f0",
  frost: "#7dd3fc",
  heat: "#fb7185",
};

type ChartMetric = SimMeterKey | "tension";
type LineKey = SimMeterKey | "tension";

const LINE_OPTIONS: { key: LineKey; label: string; stroke: string }[] = [
  ...SIM_METERS.map((meter) => ({ key: meter.key, label: meter.label, stroke: meter.stroke })),
  { key: "tension", label: "Spannung", stroke: "#f0a36b" },
];

type TipRow = { name?: string; value?: number | string; color?: string; dataKey?: string | number };

type Props = {
  day: string;
  minDay: string;
  maxDay: string;
  isToday: boolean;
  liveWeather: DayWeather | null;
  scopeId: CityDistrictId | null;
  onScopeId: (id: CityDistrictId | null) => void;
  onDayChange: (day: string) => void;
  onStepDay: (delta: number) => void;
  onStepYear: (delta: number) => void;
  onGoToday: () => void;
  onShowMap: () => void;
};

export default function CityDashboard({
  day,
  minDay,
  maxDay,
  isToday,
  liveWeather,
  scopeId,
  onScopeId,
  onDayChange,
  onStepDay,
  onStepYear,
  onGoToday,
  onShowMap,
}: Props) {
  const [range, setRange] = useState<AnalyticsRange>("month");
  const [chartMetric, setChartMetric] = useState<ChartMetric>("economy");
  const [lines, setLines] = useState<LineKey[]>(["economy", "crime", "guard", "tension"]);
  const simVersion = useSyncExternalStore(subscribeCitySim, citySimVersion, citySimVersion);

  const report = useMemo(
    () =>
      buildCityAnalytics({
        range,
        anchorIso: day,
        scopeId,
        liveWeather: liveWeather
          ? { day: liveWeather.day, kind: liveWeather.kind, label: liveWeather.label, source: liveWeather.source }
          : null,
      }),
    [range, day, scopeId, simVersion, liveWeather],
  );

  const valueKey = range === "day" ? "current" : "average";

  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-background-dark text-gray-200">
      <CityHudChrome density="panel" />
      <header className="relative z-10 flex flex-wrap items-center gap-3 border-b border-hero-dark/50 px-5 pb-3 pt-14">
        <div className="min-w-0">
          <p className="font-cinzel text-sm font-bold text-accent-gold">Aurenfurt</p>
          <h2 className="font-barlow text-xl font-extrabold uppercase tracking-wide text-hero-vibrant">Stadt-Dashboard</h2>
        </div>
        <CityViewSwitch mode="dashboard" onChange={(mode) => (mode === "map" ? onShowMap() : undefined)} />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Zeitraum" className="inline-flex rounded-md border border-hero-dark bg-background-dark p-0.5">
            {ANALYTICS_RANGES.map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={range === id}
                onClick={() => setRange(id)}
                className={`rounded px-3 py-1.5 font-barlow text-[11px] font-bold uppercase tracking-wide ${
                  range === id ? "bg-hero-vibrant text-white" : "text-gray-300 hover:text-white"
                }`}
              >
                {RANGE_LABEL[id]}
              </button>
            ))}
          </div>
          <HoloDayCalendar
            day={day}
            minDay={minDay}
            maxDay={maxDay}
            isToday={isToday}
            onDayChange={onDayChange}
            onStepDay={onStepDay}
            onStepYear={onStepYear}
            onGoToday={onGoToday}
          />
        </div>
      </header>

      <div className="relative z-10 flex gap-2 overflow-x-auto border-b border-hero-dark/40 px-5 py-2 [scrollbar-width:thin]">
        <ScopeChip active={scopeId === null} label="Ganze Stadt" onClick={() => onScopeId(null)} />
        {AURENFURT_DISTRICTS.map((district) => (
          <ScopeChip
            key={district.id}
            active={scopeId === district.id}
            label={district.name}
            tint={district.tint}
            onClick={() => onScopeId(district.id)}
          />
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-5 pb-14 pt-4">
        <div className="h-full overflow-y-auto">
        <p className="font-libre text-sm leading-relaxed text-gray-300">
          {report.periodLabel} · {report.scopeLabel} · {report.dayCount} {report.dayCount === 1 ? "Tag" : "Tage"} ·{" "}
          {report.compareLabel}. Jeder Tag folgt den Stadt-Ereignissen und dem simulierten Wetter.
          {report.clamped ? " Das Fenster beginnt am 26. September 2023, dem ersten simulierten Tag." : ""}
          {report.liveWeatherNote ? ` ${report.liveWeatherNote}` : ""}
        </p>

        <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
          {SIM_METERS.map((meter) => {
            const delta = report.deltas[meter.key];
            return (
            <KpiCard
              key={meter.key}
              label={meter.label}
              value={report[valueKey][meter.key]}
              anchor={report.current[meter.key]}
              showAnchor={range !== "day"}
              delta={delta}
              tone={delta == null ? "neutral" : deltaTone(meter.key, delta)}
              stroke={meter.stroke}
              active={chartMetric === meter.key}
              onSelect={() => setChartMetric(meter.key)}
            />
            );
          })}
        </section>

        <section className="mt-4 grid gap-3 lg:grid-cols-2">
          {report.insights.map((insight) => (
            <article key={insight.id} className="rounded-md border border-hero-dark bg-background-card p-4 shadow-lg">
              <h3 className="font-cinzel text-base font-bold text-accent-gold">{insight.title}</h3>
              <p className="mt-2 font-libre text-sm leading-relaxed text-gray-200">{insight.text}</p>
            </article>
          ))}
        </section>

        <section className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
          <ChartCard
            title={range === "day" ? "14 Tage bis zum Stichtag" : `Verlauf · ${report.periodLabel}`}
            note={range === "year" ? "Monatsmittel" : "Tageswerte"}
          >
            <div className="mb-3 flex flex-wrap gap-1.5">
              {LINE_OPTIONS.map((meter) => {
                const on = lines.includes(meter.key);
                return (
                  <button
                    key={meter.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setLines((current) =>
                        current.includes(meter.key)
                          ? current.filter((key) => key !== meter.key)
                          : [...current, meter.key],
                      )
                    }
                    className={`rounded border px-2 py-1 font-barlow text-[10px] font-bold uppercase tracking-wide ${
                      on ? "border-transparent text-[#04140a]" : "border-hero-border/50 bg-transparent text-gray-400"
                    }`}
                    style={on ? { backgroundColor: meter.stroke } : undefined}
                  >
                    {meter.label}
                  </button>
                );
              })}
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={report.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#217d4233" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "#d1d5db", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#d1d5db", fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip content={<LineTooltip />} />
                  {LINE_OPTIONS.filter((meter) => lines.includes(meter.key)).map((meter) => (
                    <Line
                      key={meter.key}
                      type="monotone"
                      dataKey={meter.key}
                      name={meter.label}
                      stroke={meter.stroke}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Wetter im Fenster" note="Tage je Witterung">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.weather} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#217d4233" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "#d1d5db", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: "#d1d5db", fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip content={<BarTooltip />} />
                  <Bar dataKey="days" name="Tage" radius={[4, 4, 0, 0]}>
                    {report.weather.map((share) => (
                      <Cell key={share.kind} fill={WEATHER_COLOR[share.kind]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Spotlight title="Höchste Wirtschaft" rows={topRows(report, (district) => district.average.economy)} onOpen={() => setChartMetric("economy")} />
          <Spotlight title="Höchste Kriminalität" rows={topRows(report, (district) => district.average.crime)} onOpen={() => setChartMetric("crime")} />
          <Spotlight title="Stärkste Sicherheit" rows={topRows(report, (district) => district.average.guard)} onOpen={() => setChartMetric("guard")} />
          <Spotlight title="Höchste Arbeitslosigkeit" rows={topRows(report, (district) => district.average.unemployment)} onOpen={() => setChartMetric("unemployment")} />
          <Spotlight title="Höchste Spannung" rows={topRows(report, (district) => district.tension)} onOpen={() => setChartMetric("tension")} />
        </section>

        <section className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <ChartCard
            title={chartMetric === "tension" ? "Spannung nach Viertel" : `${meterName(chartMetric)} nach Viertel`}
            note="Klick auf ein Viertel filtert das Dashboard"
          >
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={districtBars(report, chartMetric)}
                  layout="vertical"
                  margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid stroke="#217d4233" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: "#d1d5db", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={118} tick={{ fill: "#f3f4f6", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<BarTooltip />} />
                  <Bar
                    dataKey="value"
                    name={chartMetric === "tension" ? "Spannung" : meterName(chartMetric)}
                    radius={[0, 4, 4, 0]}
                    cursor="pointer"
                    onClick={(bar) => {
                      const id = (bar as { payload?: { id?: CityDistrictId } }).payload?.id;
                      if (id) onScopeId(id);
                    }}
                  >
                    {districtBars(report, chartMetric).map((row) => (
                      <Cell key={row.id} fill={row.id === scopeId ? "#379806" : row.tint} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Fraktionen am Stichtag" note={report.anchorLabel}>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={report.factions.map((faction) => ({
                    name: faction.name,
                    value: faction.power,
                    legality: faction.legality,
                  }))}
                  layout="vertical"
                  margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid stroke="#217d4233" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: "#d1d5db", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={132} tick={{ fill: "#f3f4f6", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<FactionTooltip />} />
                  <Bar dataKey="value" name="Macht" fill="#cab926" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </section>

        <section className="mt-4 overflow-x-auto rounded-md border border-hero-dark bg-background-card shadow-lg">
          <table className="w-full min-w-[46rem] text-left">
            <caption className="px-4 py-3 text-left font-cinzel text-base font-bold text-accent-gold">
              Viertel im Fenster
            </caption>
            <thead>
              <tr className="font-barlow text-[11px] font-bold uppercase tracking-wide text-gray-400">
                <th className="px-4 py-2">Viertel</th>
                <th className="px-3 py-2">Wirtschaft</th>
                <th className="px-3 py-2">Kriminalität</th>
                <th className="px-3 py-2">Sicherheit</th>
                <th className="px-3 py-2">Arbeit</th>
                <th className="px-3 py-2">Vattrak</th>
                <th className="px-3 py-2">Malanthir</th>
                <th className="px-3 py-2">Spannung</th>
              </tr>
            </thead>
            <tbody>
              {[...report.districts]
                .sort((a, b) => b.tension - a.tension)
                .map((district) => (
                  <tr
                    key={district.id}
                    className={`cursor-pointer border-t border-hero-border/20 font-libre text-sm ${
                      district.id === scopeId ? "bg-hero-vibrant/10 text-white" : "text-gray-200 hover:bg-white/5"
                    }`}
                    onClick={() => onScopeId(district.id === scopeId ? null : district.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onScopeId(district.id === scopeId ? null : district.id);
                      }
                    }}
                    tabIndex={0}
                  >
                    <td className="px-4 py-2">{district.name}</td>
                    <td className="px-3 py-2 tabular-nums">{district.average.economy}</td>
                    <td className="px-3 py-2 tabular-nums">{district.average.crime}</td>
                    <td className="px-3 py-2 tabular-nums">{district.average.guard}</td>
                    <td className="px-3 py-2 tabular-nums">{district.average.unemployment}</td>
                    <td className="px-3 py-2 tabular-nums">{district.average.vattrak}</td>
                    <td className="px-3 py-2 tabular-nums">{district.average.malanthir}</td>
                    <td className="px-3 py-2 tabular-nums">{district.tension}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          <p className="px-4 pb-3 font-libre text-xs leading-relaxed text-gray-400">
            Spannung bündelt Kriminalität, Arbeitslosigkeit, Malanthir, Flucht, schwache Garde und schwache Wirtschaft. Datierte Stadtgeschichten legen ihren eigenen Spannungswert oben drauf.
          </p>
        </section>

        <section className="mt-4 grid gap-3 lg:grid-cols-2">
          <article className="rounded-md border border-hero-dark bg-background-card p-4 shadow-lg">
            <h3 className="font-cinzel text-base font-bold text-accent-gold">Ereignisse im Fenster</h3>
            <ul className="mt-3 space-y-3">
              {report.events.length === 0 ? (
                <li className="font-libre text-sm text-gray-300">Kein Geschichtsereignis liegt stark genug auf diesem Fenster.</li>
              ) : (
                report.events.map((event) => (
                  <li key={event.id}>
                    <p className="font-barlow text-sm font-bold uppercase tracking-wide text-hero-vibrant">{event.title}</p>
                    <p className="font-libre text-sm leading-relaxed text-gray-200">{event.summary}</p>
                  </li>
                ))
              )}
            </ul>
          </article>
          <article className="rounded-md border border-hero-dark bg-background-card p-4 shadow-lg">
            <h3 className="font-cinzel text-base font-bold text-accent-gold">Untergrund am Stichtag</h3>
            <ul className="mt-3 space-y-2">
              {report.cells.length === 0 ? (
                <li className="font-libre text-sm text-gray-300">Keine Zelle ist in diesem Zuschnitt hörbar.</li>
              ) : (
                report.cells.map((cell) => (
                  <li key={cell.name} className="flex items-center justify-between gap-3">
                    <span className="font-libre text-sm text-gray-200">{cell.name}</span>
                    <span className="font-barlow text-sm font-bold tabular-nums text-accent-gold">{cell.strength}</span>
                  </li>
                ))
              )}
            </ul>
            <h3 className="mt-5 font-cinzel text-base font-bold text-accent-gold">Fraktionen</h3>
            <ul className="mt-3 space-y-2">
              {report.factions.map((faction) => (
                <li key={faction.id} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block font-libre text-sm text-gray-100">{faction.name}</span>
                    <span className="block font-libre text-xs text-gray-400">{faction.role}</span>
                  </span>
                  <span className="shrink-0 text-right font-barlow text-xs font-bold uppercase text-gray-300">
                    Macht {faction.power}
                    <span className="block normal-case">Legalität {faction.legality}</span>
                  </span>
                </li>
              ))}
            </ul>
          </article>
        </section>
        </div>
      </div>
    </div>
  );
}

function ScopeChip({
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

function KpiCard({
  label,
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
      className={`rounded-md border bg-background-card p-3 text-left shadow-lg ${active ? "border-hero-vibrant" : "border-hero-dark"}`}
    >
      <span className="block h-1 w-8 rounded-full" style={{ backgroundColor: stroke }} />
      <span className="mt-2 block font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</span>
      <span className="mt-1 block font-barlow text-3xl font-extrabold tabular-nums text-white">{value}</span>
      <span className={`block font-barlow text-xs font-bold tabular-nums ${deltaClass}`}>
        {delta == null ? "—" : `${delta > 0 ? "+" : ""}${delta}`}
      </span>
      {showAnchor ? <span className="block font-libre text-[11px] text-gray-400">Stichtag {anchor}</span> : null}
    </button>
  );
}

function ChartCard({ title, note, children }: { title: string; note: string; children: ReactNode }) {
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

function Spotlight({
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

function topRows(report: CityAnalytics, pick: (district: DistrictRank) => number) {
  return [...report.districts]
    .sort((a, b) => pick(b) - pick(a))
    .slice(0, 3)
    .map((district) => ({ name: district.name, value: pick(district) }));
}

function meterName(metric: ChartMetric) {
  if (metric === "tension") return "Spannung";
  return SIM_METERS.find((meter) => meter.key === metric)?.label ?? metric;
}

function districtBars(report: CityAnalytics, metric: ChartMetric) {
  return [...report.districts]
    .sort((a, b) => (metric === "tension" ? b.tension - a.tension : b.average[metric] - a.average[metric]))
    .map((district) => ({
      id: district.id,
      name: district.name,
      tint: district.tint,
      value: metric === "tension" ? district.tension : district.average[metric],
    }));
}

function LineTooltip({ active, payload, label }: { active?: boolean; payload?: TipRow[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-hero-dark bg-background-card px-3 py-2 shadow-lg">
      <p className="font-barlow text-[11px] font-bold uppercase text-accent-gold">{label}</p>
      {payload.map((row) => (
        <p key={String(row.dataKey)} className="font-libre text-xs text-gray-100">
          <span style={{ color: row.color }}>{row.name}</span> {row.value}
        </p>
      ))}
    </div>
  );
}

function BarTooltip({ active, payload, label }: { active?: boolean; payload?: TipRow[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const row = payload[0];
  return (
    <div className="rounded-md border border-hero-dark bg-background-card px-3 py-2 shadow-lg">
      <p className="font-barlow text-[11px] font-bold uppercase text-accent-gold">{label ?? row?.name}</p>
      <p className="font-libre text-xs text-gray-100">{row?.value}</p>
    </div>
  );
}

function FactionTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<TipRow & { payload?: { legality?: number; name?: string } }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0];
  return (
    <div className="rounded-md border border-hero-dark bg-background-card px-3 py-2 shadow-lg">
      <p className="font-barlow text-[11px] font-bold uppercase text-accent-gold">{row?.payload?.name}</p>
      <p className="font-libre text-xs text-gray-100">Macht {row?.value}</p>
      <p className="font-libre text-xs text-gray-300">Legalität {row?.payload?.legality}</p>
    </div>
  );
}
