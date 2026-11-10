"use client";

import Image from "next/image";
import { startTransition, useEffect, useMemo, useState, useSyncExternalStore, type Dispatch, type SetStateAction } from "react";
import { Undo2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AURENFURT_DISTRICTS, type CityDistrictId } from "./aurenfurt-districts";
import { districtCrestSrc } from "./aurenfurt-district-crests";
import {
  ANALYTICS_RANGES,
  RANGE_LABEL,
  buildCityAnalytics,
  deltaTone,
  tensionOf,
  type AnalyticsRange,
} from "./aurenfurt-analytics";
import { citySimVersion, subscribeCitySim } from "./aurenfurt-city-sim";
import { HoloDayCalendar } from "./HoloDayCalendar";
import { SIM_METERS, type SimMeterKey } from "./aurenfurt-sim";
import type { DayWeather } from "./aurenfurt-weather";
import { npcDetailHref } from "./aurenfurt-npcs";
import { CityViewSwitch } from "./CityViewSwitch";
import { CityHudChrome } from "./CityHudFrame";
import { CitySocietyPanels } from "./CitySocietyPanels";
import { CityLongTermOverview } from "./CityLongTermOverview";
import {
  BarTooltip,
  ChartCard,
  DashboardAccordion,
  FactionDetail,
  FactionListButton,
  DERIVED_KPI_META,
  KPI_META,
  KpiCard,
  LineTooltip,
  NpcDetail,
  ScopeChip,
  Spotlight,
  bandsFor,
  districtBars,
  meterName,
  topRows,
  type ChartMetric,
} from "./CityDashboardParts";
import {
  loadAurenfurtFactionListMedia,
  type CityFactionListMedia,
} from "./load-aurenfurt-npc-records";

export type { ChartMetric } from "./CityDashboardParts";
export type LineKey = SimMeterKey | "tension";

const LINE_OPTIONS: { key: LineKey; label: string; stroke: string }[] = [
  ...SIM_METERS.map((meter) => ({ key: meter.key, label: meter.label, stroke: meter.stroke })),
  { key: "tension", label: "Spannung", stroke: "#f0a36b" },
];


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
  onShowVerwaltung?: () => void;
  showVerwaltung?: boolean;
  onLeave: () => void;
  leaveLabel?: string;
  range: AnalyticsRange;
  setRange: Dispatch<SetStateAction<AnalyticsRange>>;
  chartMetric: ChartMetric;
  setChartMetric: Dispatch<SetStateAction<ChartMetric>>;
  lines: LineKey[];
  setLines: Dispatch<SetStateAction<LineKey[]>>;
  worldId?: string | null;
  campaignId?: string | null;
  npcRecordIds?: Record<string, string> | null;
  factionRecordIds?: Record<string, string>;
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
  onShowVerwaltung,
  showVerwaltung = false,
  onLeave,
  leaveLabel = "Zurück zur Lore",
  range,
  setRange,
  chartMetric,
  setChartMetric,
  lines,
  setLines,
  worldId = null,
  campaignId = null,
  npcRecordIds = null,
  factionRecordIds = {},
}: Props) {
  const simVersion = useSyncExternalStore(subscribeCitySim, citySimVersion, citySimVersion);
  const [selectedFactionId, setSelectedFactionId] = useState<string | null>(null);
  const [selectedNpcId, setSelectedNpcId] = useState<string | null>(null);
  const [reportReady, setReportReady] = useState(false);
  const [factionMedia, setFactionMedia] = useState<Record<string, CityFactionListMedia>>({});

  useEffect(() => {
    setReportReady(false);
    const id = requestAnimationFrame(() => {
      startTransition(() => setReportReady(true));
    });
    return () => cancelAnimationFrame(id);
  }, [range, day, scopeId, simVersion, liveWeather]);

  useEffect(() => {
    let active = true;
    void loadAurenfurtFactionListMedia().then((media) => {
      if (active) setFactionMedia(media);
    });
    return () => {
      active = false;
    };
  }, []);

  const report = useMemo(() => {
    if (!reportReady) return null;
    return buildCityAnalytics({
      range,
      anchorIso: day,
      scopeId,
      liveWeather: liveWeather
        ? { day: liveWeather.day, kind: liveWeather.kind, label: liveWeather.label, source: liveWeather.source }
        : null,
    });
  }, [range, day, scopeId, simVersion, liveWeather, reportReady]);

  const valueKey = range === "day" ? "current" : "average";
  const eventBands = useMemo(
    () => (report ? bandsFor(report.series, report.events) : []),
    [report],
  );
  const selectedFaction = report?.factions.find((faction) => faction.id === selectedFactionId) ?? null;
  const selectedNpc = report?.npcs.find((npc) => npc.id === selectedNpcId) ?? null;

  if (!report) {
    return (
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background-dark text-gray-200">
        <CityHudChrome density="panel" />
        <p className="relative z-10 font-barlow text-xs font-bold uppercase tracking-wide text-accent-gold">
          Stadtbericht wird gerechnet…
        </p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-background-dark text-gray-200">
      <CityHudChrome density="panel" />
      <header className="relative z-10 flex flex-wrap items-end gap-3 border-b border-hero-dark/50 px-5 pb-3 pt-4">
        <CityViewSwitch
          mode="dashboard"
          showVerwaltung={showVerwaltung}
          onChange={(mode) => {
            if (mode === "map") onShowMap();
            if (mode === "verwaltung") onShowVerwaltung?.();
          }}
        />
        <div className="min-w-0 pb-2">
          <p className="font-cinzel text-sm font-bold text-accent-gold">Aurenfurt</p>
          <h2 className="font-barlow text-xl font-extrabold uppercase tracking-wide text-hero-vibrant">
            Stadt-Dashboard
          </h2>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2 pb-2">
          <button
            type="button"
            onClick={onLeave}
            className="inline-flex items-center gap-1.5 border border-hero-dark bg-hero-dark px-3 py-2 font-barlow text-[11px] font-bold uppercase tracking-wide text-accent-gold hover:bg-background-card"
          >
            <Undo2 className="h-4 w-4" aria-hidden />
            {leaveLabel}
          </button>
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
            crestSrc={districtCrestSrc(district.id)}
            onClick={() => onScopeId(district.id)}
          />
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-5 pb-14 pt-4">
        <div className="h-full overflow-y-auto">
          <p className="font-libre text-sm leading-relaxed text-gray-300">
            {report.periodLabel} · {report.scopeLabel} · {report.dayCount}{" "}
            {report.dayCount === 1 ? "Tag" : "Tage"} · {report.compareLabel}.
            {report.clamped
              ? " Das Fenster beginnt am 26. September 2023, dem ersten simulierten Tag."
              : ""}
          </p>

          <DashboardAccordion
            title="Überblick"
            subtitle="Kennzahlen für den gewählten Zuschnitt"
            defaultOpen
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {SIM_METERS.map((meter) => {
                const delta = report.deltas[meter.key];
                const meta = KPI_META[meter.key];
                return (
                  <KpiCard
                    key={meter.key}
                    label={meta.short}
                    fullLabel={meter.label}
                    Icon={meta.Icon}
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
              {(() => {
                const tensionNow = tensionOf(report[valueKey]);
                const tensionAnchor = tensionOf(report.current);
                const tensionPrev = report.previous ? tensionOf(report.previous) : null;
                const tensionDelta =
                  tensionPrev == null ? undefined : tensionNow - tensionPrev;
                const meta = DERIVED_KPI_META.tension;
                return (
                  <KpiCard
                    key="tension"
                    label={meta.short}
                    fullLabel={meta.fullLabel}
                    Icon={meta.Icon}
                    value={tensionNow}
                    anchor={tensionAnchor}
                    showAnchor={range !== "day"}
                    delta={tensionDelta}
                    tone={
                      tensionDelta == null || tensionDelta === 0
                        ? "neutral"
                        : tensionDelta < 0
                          ? "up"
                          : "down"
                    }
                    stroke={meta.stroke}
                    active={chartMetric === "tension"}
                    onSelect={() => setChartMetric("tension")}
                  />
                );
              })()}
            </div>
            <div className="mt-4">
              <CityLongTermOverview
                day={day}
                scopeId={scopeId}
                scopeLabel={report.scopeLabel}
              />
            </div>
          </DashboardAccordion>

          <DashboardAccordion
            title="Verläufe"
            subtitle={range === "year" ? "Monatsmittel im Zeitraum" : "Tageswerte im Zeitraum"}
            defaultOpen
          >
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
                        on
                          ? "border-transparent text-[#04140a]"
                          : "border-hero-border/50 bg-transparent text-gray-400"
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
                      width={32}
                    />
                    {eventBands.map((band) => (
                      <ReferenceArea
                        key={`${band.x1}|${band.x2}`}
                        x1={band.x1}
                        x2={band.x2}
                        fill="#217d42"
                        fillOpacity={0.12}
                        stroke="#cab926"
                        strokeOpacity={0.2}
                        ifOverflow="hidden"
                      />
                    ))}
                    <Tooltip content={<LineTooltip />} isAnimationActive={false} />
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
                        isAnimationActive={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </DashboardAccordion>

          <DashboardAccordion
            title="Gesellschaft"
            subtitle="Bevölkerung, Markt und soziale Kräfte"
            defaultOpen={false}
          >
            <CitySocietyPanels day={day} range={range} scopeId={scopeId} />
          </DashboardAccordion>

          <DashboardAccordion
            title="Vergleiche"
            subtitle="Ranglisten, Viertel-Balken und Fraktionen"
            defaultOpen
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <Spotlight
                title="Höchste Wirtschaft"
                rows={topRows(report, (district) => district.average.economy)}
                onOpen={() => setChartMetric("economy")}
              />
              <Spotlight
                title="Höchste Kriminalität"
                rows={topRows(report, (district) => district.average.crime)}
                onOpen={() => setChartMetric("crime")}
              />
              <Spotlight
                title="Stärkste Sicherheit"
                rows={topRows(report, (district) => district.average.guard)}
                onOpen={() => setChartMetric("guard")}
              />
              <Spotlight
                title="Höchste Arbeitslosigkeit"
                rows={topRows(report, (district) => district.average.unemployment)}
                onOpen={() => setChartMetric("unemployment")}
              />
              <Spotlight
                title="Höchste Spannung"
                rows={topRows(report, (district) => district.tension)}
                onOpen={() => setChartMetric("tension")}
              />
            </div>

            <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <ChartCard
                title={
                  chartMetric === "tension"
                    ? "Spannung nach Viertel"
                    : `${meterName(chartMetric)} nach Viertel`
                }
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
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        tick={{ fill: "#d1d5db", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={118}
                        tick={{ fill: "#f3f4f6", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<BarTooltip />} isAnimationActive={false} />
                      <Bar
                        dataKey="value"
                        name={chartMetric === "tension" ? "Spannung" : meterName(chartMetric)}
                        radius={[0, 4, 4, 0]}
                        cursor="pointer"
                        isAnimationActive={false}
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
                <div className="h-80 overflow-y-auto pr-1">
                  <ul className="space-y-2">
                    {report.factions.map((faction) => (
                      <li key={faction.id}>
                        <FactionListButton
                          faction={faction}
                          active={selectedFactionId === faction.id}
                          emblemUrl={factionMedia[faction.id]?.emblemUrl ?? null}
                          onClick={() => {
                            setSelectedFactionId(faction.id);
                            setSelectedNpcId(null);
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              </ChartCard>
            </div>

            {selectedFaction ? (
              <div className="mt-4">
                <FactionDetail
                  faction={selectedFaction}
                  worldId={worldId}
                  campaignId={campaignId}
                  factionHref={
                    factionRecordIds[selectedFaction.id]
                      ? campaignId
                        ? `/dashboard/campaigns/${campaignId}/factions/${factionRecordIds[selectedFaction.id]}`
                        : worldId
                          ? `/dashboard/worlds/${worldId}/factions/${factionRecordIds[selectedFaction.id]}`
                          : null
                      : null
                  }
                  onClose={() => setSelectedFactionId(null)}
                  onSelectMember={(memberName) => {
                    const needle = memberName.trim().toLowerCase();
                    const match = report.npcs.find((npc) => npc.name.trim().toLowerCase() === needle);
                    if (match) {
                      setSelectedNpcId(match.id);
                      setSelectedFactionId(null);
                    }
                  }}
                />
              </div>
            ) : null}
          </DashboardAccordion>

          <DashboardAccordion
            title="Akteure & Ereignisse"
            subtitle="NPCs, Geschichtsereignisse und Detailkarten"
            defaultOpen={false}
          >
            <div className="grid gap-3 lg:grid-cols-2">
              <article className="rounded-md border border-hero-dark/60 bg-background-dark/40 p-4">
                <h3 className="font-cinzel text-base font-bold text-accent-gold">Einflussreichste NPCs</h3>
                <p className="mt-1 font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-400">
                  {report.anchorLabel}
                </p>
                <ul className="mt-3 space-y-2">
                  {report.npcs.length === 0 ? (
                    <li className="font-libre text-sm text-gray-300">Keine NPCs in diesem Zuschnitt.</li>
                  ) : (
                    report.npcs.map((npc) => (
                      <li key={npc.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedNpcId(npc.id);
                            setSelectedFactionId(null);
                          }}
                          className={`flex w-full items-baseline justify-between gap-3 rounded border px-3 py-2 text-left transition ${
                            selectedNpcId === npc.id
                              ? "border-hero-vibrant bg-hero-vibrant/10"
                              : "border-hero-dark/60 hover:border-hero-border hover:bg-white/5"
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block font-libre text-sm text-gray-100">{npc.name}</span>
                            <span className="block font-libre text-xs text-gray-400">
                              {npc.title ?? npc.role} · {npc.districtName}
                            </span>
                          </span>
                          <span className="shrink-0 font-barlow text-xs font-bold tabular-nums text-accent-gold">
                            {npc.influence}
                          </span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </article>

              <article
                className={
                  selectedNpc
                    ? "min-h-0"
                    : "rounded-md border border-hero-dark/60 bg-background-dark/40 p-4"
                }
              >
                {selectedNpc ? (
                  <NpcDetail
                    npc={selectedNpc}
                    recordId={
                      npcRecordIds?.[selectedNpc.id] ?? selectedNpc.recordId
                    }
                    loreHref={npcDetailHref(
                      {
                        recordId:
                          npcRecordIds?.[selectedNpc.id] ?? selectedNpc.recordId,
                      },
                      { worldId, campaignId },
                    )}
                    factionHref={
                      factionRecordIds[selectedNpc.factionId]
                        ? campaignId
                          ? `/dashboard/campaigns/${campaignId}/factions/${factionRecordIds[selectedNpc.factionId]}`
                          : worldId
                            ? `/dashboard/worlds/${worldId}/factions/${factionRecordIds[selectedNpc.factionId]}`
                            : null
                        : null
                    }
                    onClose={() => setSelectedNpcId(null)}
                    onOpenFaction={(factionId) => {
                      setSelectedFactionId(factionId);
                      setSelectedNpcId(null);
                    }}
                  />
                ) : (
                  <>
                    <h3 className="font-cinzel text-base font-bold text-accent-gold">
                      Ereignisse im Fenster
                    </h3>
                    <p className="mt-1 font-libre text-xs text-gray-400">
                      Wähle einen NPC oder unter Vergleiche eine Fraktion für Details.
                    </p>
                    <ul className="mt-3 space-y-2">
                      {report.events.length === 0 ? (
                        <li className="font-libre text-sm text-gray-300">
                          Kein Geschichtsereignis liegt stark genug auf diesem Fenster.
                        </li>
                      ) : (
                        report.events.map((event) => (
                          <li
                            key={event.id}
                            className="font-barlow text-sm font-bold uppercase tracking-wide text-hero-vibrant"
                          >
                            {event.title}
                          </li>
                        ))
                      )}
                    </ul>
                  </>
                )}
              </article>
            </div>
          </DashboardAccordion>

          <DashboardAccordion
            title="Vierteltabelle"
            subtitle="Alle Meterwerte im gewählten Fenster"
            defaultOpen={false}
          >
            <div className="overflow-x-auto rounded-md border border-hero-dark/60">
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
                    <th className="px-3 py-2">Elysia</th>
                    <th className="px-3 py-2">Chromus</th>
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
                          district.id === scopeId
                            ? "bg-hero-vibrant/10 text-white"
                            : "text-gray-200 hover:bg-white/5"
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
                        <td className="px-4 py-2">
                          <span className="inline-flex items-center gap-2">
                            {districtCrestSrc(district.id) ? (
                              <Image
                                src={districtCrestSrc(district.id)!}
                                alt=""
                                width={28}
                                height={28}
                                className="h-7 w-7 rounded-full object-cover"
                              />
                            ) : null}
                            {district.name}
                          </span>
                        </td>
                        <td className="px-3 py-2 tabular-nums">{district.average.economy}</td>
                        <td className="px-3 py-2 tabular-nums">{district.average.crime}</td>
                        <td className="px-3 py-2 tabular-nums">{district.average.guard}</td>
                        <td className="px-3 py-2 tabular-nums">{district.average.unemployment}</td>
                        <td className="px-3 py-2 tabular-nums">{district.average.vattrak}</td>
                        <td className="px-3 py-2 tabular-nums">{district.average.malanthir}</td>
                        <td className="px-3 py-2 tabular-nums">{district.average.elysia}</td>
                        <td className="px-3 py-2 tabular-nums">{district.average.chromus}</td>
                        <td className="px-3 py-2 tabular-nums">{district.tension}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <p className="px-4 pb-3 pt-2 font-libre text-xs leading-relaxed text-gray-400">
                Spannung bündelt Kriminalität, Arbeitslosigkeit, Malanthir, Flucht, schwache Garde und
                schwache Wirtschaft. Datierte Stadtgeschichten legen ihren eigenen Spannungswert oben
                drauf.
              </p>
            </div>
          </DashboardAccordion>
        </div>
      </div>
    </div>
  );
}
