"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ExternalLink, X } from "lucide-react";
import { synthesizePlaceBrief } from "./aurenfurt-brief";
import { findBuilding, type HoloSelection, type LandmarkModel, type SimSubject } from "./aurenfurt-districts";

const HoloLandmarkPreview = dynamic(() => import("./scene/HoloLandmarkPreview"), {
  ssr: false,
});
import {
  factionName,
  RELATIONSHIP_LABELS,
  type FactionStanding,
} from "./aurenfurt-factions";
import type { ActiveInfluence, DistrictDay } from "./aurenfurt-history";
import type { KeyLocation } from "./aurenfurt-locations";
import {
  DISPOSITION_LABELS,
  npcDetailHref,
  npcMapRoleLabel,
  type AurenfurtNpc,
  type NpcDetailLinkContext,
} from "./aurenfurt-npcs";
import { HoloMetricChart, type ChartMetric } from "./HoloMetricChart";
import { loreExcerpt, type AurenfurtPlaceLore } from "./aurenfurt-lore";
import { SIM_METERS, type SimProfile } from "./aurenfurt-sim";
import type { DayWeather } from "./aurenfurt-weather";
import { SimKpiBar } from "@/src/components/ui/KpiIcons";
import {
  formatInfluenceDelta,
  influenceInWords,
  sumPoiInfluences,
  type AurenfurtMapPoi,
} from "./aurenfurt-map-pois";

type Props = {
  subject: SimSubject | null;
  lore: AurenfurtPlaceLore | null;
  sim: SimProfile;
  series: DistrictDay[] | null;
  weather: DayWeather;
  weatherSeries: DayWeather[];
  influences: ActiveInfluence[];
  factions: FactionStanding[];
  factionRecordIds?: Record<string, string>;
  locations: KeyLocation[];
  selectedLocation: KeyLocation | null;
  /** Anführer mit Fraktionspräsenz im Viertel */
  leaders?: AurenfurtNpc[];
  /** Betreiber der gewählten Key-Location */
  operator?: AurenfurtNpc | null;
  /** Kontext für NPC-Detail-Links (nur bei vorhandener recordId) */
  npcLinkContext?: NpcDetailLinkContext;
  /** Betrachteter Kalendertag `YYYY-MM-DD` für Diagramm-Marke */
  viewDay?: string;
  isGm?: boolean;
  selectedPoi?: AurenfurtMapPoi | null;
  districtPois?: AurenfurtMapPoi[];
  /** 3D-Modell des gewählten Gebäudes, auch wenn es nur im Editor liegt. */
  landmark?: LandmarkModel | null;
  onClose: () => void;
  onSelect: (selection: HoloSelection) => void;
};

function Meter({
  label,
  value,
  tone,
  active,
  onSelect,
}: {
  label: string;
  value: number;
  tone: string;
  active: boolean;
  onSelect?: () => void;
}) {
  const body = (
    <>
      <div className="mb-1 flex items-center justify-between gap-3 font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-300">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-black/50">
        <div className={`h-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </>
  );
  if (!onSelect) return <div>{body}</div>;
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={`w-full rounded px-1 py-0.5 text-left ${active ? "bg-white/10 ring-1 ring-hero-border" : "hover:bg-white/5"}`}
    >
      {body}
    </button>
  );
}

function SimReadout({
  sim,
  chart,
  onChart,
}: {
  sim: SimProfile;
  chart: ChartMetric | null;
  onChart: ((metric: ChartMetric) => void) | null;
}) {
  const choose = (metric: ChartMetric) => (onChart ? () => onChart(metric) : undefined);
  return (
    <div className="space-y-2">
      {SIM_METERS.map((meter) => (
        <Meter
          key={meter.key}
          label={meter.label}
          value={sim[meter.key]}
          tone={meter.tone}
          active={chart === meter.key}
          onSelect={choose(meter.key)}
        />
      ))}
      <div className="pt-1">
        {onChart ? (
          <button
            type="button"
            aria-pressed={chart === "cults"}
            onClick={() => onChart("cults")}
            className={`mb-1.5 w-full rounded px-1 text-left font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-300 ${chart === "cults" ? "bg-white/10 ring-1 ring-hero-border" : "hover:bg-white/5"}`}
          >
            Kulte & Untergrund
          </button>
        ) : (
          <p className="mb-1.5 font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-300">
            Kulte & Untergrund
          </p>
        )}
        {sim.underground.length === 0 ? (
          <p className="font-libre text-sm text-gray-400">Keine bekannte Zelle.</p>
        ) : (
          <ul className="space-y-2">
            {sim.underground.map((cell) => (
              <li key={cell.name}>
                <Meter label={cell.name} value={cell.strength} tone="bg-[#58180D]" active={chart === "cults"} onSelect={choose("cults")} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function formatLegality(value: number) {
  if (value > 0) return `+${value}`;
  return String(value);
}

function FactionCard({
  faction,
  href,
}: {
  faction: FactionStanding;
  href: string | null;
}) {
  return (
    <li className="border-b border-hero-border/20 pb-2 last:border-b-0 last:pb-0">
      <h3 className="font-cinzel text-sm font-bold text-accent-gold">
        {href ? (
          <Link href={href} className="hover:underline">
            {faction.name}
          </Link>
        ) : (
          faction.name
        )}
      </h3>
      <p className="mt-0.5 font-libre text-sm leading-relaxed text-gray-300">{faction.role}</p>
      <p className="mt-1 font-barlow text-[10px] font-bold uppercase tracking-wide text-cyan-200/80">
        {faction.ideologyLabel}
      </p>
      <dl className="mt-1.5 grid grid-cols-3 gap-1 font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-300">
        <div>
          <dt className="text-gray-500">Macht</dt>
          <dd className="text-gray-200">{faction.power}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Legalität</dt>
          <dd className="text-gray-200">{formatLegality(faction.legality)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Wirtschaft</dt>
          <dd className="text-gray-200">{faction.economicImpact}</dd>
        </div>
      </dl>
      {faction.networkRelationships.length > 0 ? (
        <ul className="mt-1.5 space-y-0.5">
          {faction.networkRelationships.map((link) => (
            <li
              key={`${faction.id}-${link.targetId}-${link.kind}`}
              className="font-libre text-xs leading-snug text-gray-400"
            >
              <span className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">
                {RELATIONSHIP_LABELS[link.kind]}
              </span>{" "}
              {factionName(link.targetId)} · {link.strength}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function LocationStats({ location }: { location: KeyLocation }) {
  return (
    <div className="mb-3 border-b border-hero-border/30 pb-3">
      <p className="mb-1.5 font-barlow text-[10px] font-bold uppercase tracking-wide text-cyan-200">
        Standort
      </p>
      <dl className="grid grid-cols-3 gap-1 font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-300">
        <div>
          <dt className="text-gray-500">Gilde</dt>
          <dd className="font-cinzel text-xs font-bold normal-case tracking-normal text-accent-gold">
            {location.guildName}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">Wohlstand</dt>
          <dd className="text-gray-200">{location.prosperityLevel}/5</dd>
        </div>
        <div>
          <dt className="text-gray-500">Hotspot</dt>
          <dd className="text-gray-200">{location.isHotspot}</dd>
        </div>
      </dl>
      <div className="mt-2">
        <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold">
          {location.specialBonus.name}
        </p>
        <p className="font-libre text-sm leading-relaxed text-gray-300">{location.specialBonus.effect}</p>
      </div>
      <div className="mt-2">
        <Meter label="Brandherd" value={location.isHotspot} tone="bg-[#58180D]" active={false} />
      </div>
    </div>
  );
}

function NpcCleanCard({
  npc,
  kicker,
  linkContext,
}: {
  npc: AurenfurtNpc;
  kicker: string;
  linkContext: NpcDetailLinkContext;
}) {
  const [secretOpen, setSecretOpen] = useState(false);
  const href = npcDetailHref(npc, linkContext);

  return (
    <li className="rounded border border-hero-border/30 bg-background-dark/40 p-2.5">
      <p className="mb-1.5 font-barlow text-[10px] font-bold uppercase tracking-wide text-cyan-200">
        {kicker}
      </p>
      <div className="flex gap-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded border border-hero-border/40 bg-background-dark">
          <Image
            src={npc.portraitUrl}
            alt={npc.name}
            fill
            sizes="3rem"
            className="object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-cinzel text-sm font-bold text-accent-gold">{npc.name}</h3>
          <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-hero-vibrant">
            {npcMapRoleLabel(npc)}
          </p>
          <p className="mt-0.5 font-libre text-xs leading-snug text-gray-400">
            {factionName(npc.factionId)} · {DISPOSITION_LABELS[npc.disposition]}
          </p>
          {href ? (
            <Link
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-flex items-center gap-1 font-barlow text-[10px] font-bold uppercase tracking-wide text-cyan-200 hover:text-accent-gold"
            >
              Eintrag öffnen
              <ExternalLink className="h-3 w-3" aria-hidden />
            </Link>
          ) : (
            <p className="mt-1.5 font-libre text-[10px] leading-snug text-gray-500">
              Noch kein öffentlicher NPC-Eintrag verknüpft.
            </p>
          )}
        </div>
      </div>
      <div className="mt-2">
        <button
          type="button"
          aria-expanded={secretOpen}
          onClick={() => setSecretOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-2 rounded px-1 py-0.5 text-left font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500 hover:bg-white/5 hover:text-accent-gold"
        >
          Geheimnis (Spielleitung)
          <motion.span
            animate={{ rotate: secretOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="inline-flex"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </motion.span>
        </button>
        <AnimatePresence initial={false}>
          {secretOpen ? (
            <motion.p
              key="secret"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="mt-1 font-libre text-xs leading-relaxed text-accent-blood/90"
            >
              {npc.darkSecret}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </li>
  );
}

function AnalysisPanel({
  open,
  onToggle,
  subject,
  sim,
  series,
  weather,
  weatherSeries,
  influences,
  factions,
  factionRecordIds = {},
  worldId = null,
  selectedLocation,
  chart,
  onToggleChart,
  correlationHint,
  viewDay,
}: {
  open: boolean;
  onToggle: () => void;
  subject: SimSubject;
  sim: SimProfile;
  series: DistrictDay[] | null;
  weather: DayWeather;
  weatherSeries: DayWeather[];
  influences: ActiveInfluence[];
  factions: FactionStanding[];
  factionRecordIds?: Record<string, string>;
  worldId?: string | null;
  selectedLocation: KeyLocation | null;
  chart: ChartMetric | null;
  onToggleChart: (metric: ChartMetric) => void;
  correlationHint: string;
  viewDay?: string;
}) {
  const districtOpen = subject.type === "district";

  return (
    <div className="mt-3 border-t border-hero-border/30 pt-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 rounded px-1 py-1.5 text-left font-barlow text-xs font-bold uppercase tracking-wide text-hero-vibrant hover:bg-white/5"
      >
        Daten/Analyse
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="inline-flex text-gray-400"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="analysis"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
            className="mt-2 max-h-[min(48vh,22rem)] space-y-3 overflow-y-auto pr-0.5"
          >
            <p className="font-libre text-sm leading-relaxed text-gray-300">{correlationHint}</p>

            {selectedLocation ? <LocationStats location={selectedLocation} /> : null}

            {subject.type === "building" ? (
              <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-cyan-200/80">
                Kennzahlen des Viertels
              </p>
            ) : null}

            {districtOpen ? (
              <button
                type="button"
                aria-pressed={chart === "weather"}
                onClick={() => onToggleChart("weather")}
                className={`w-full rounded px-1 py-0.5 text-left font-barlow text-[10px] font-bold uppercase tracking-wide text-cyan-100 ${chart === "weather" ? "bg-white/10 ring-1 ring-hero-border" : "hover:bg-white/5"}`}
              >
                Wetter · {weather.label} {weather.tempC} °C{weather.source === "live" ? " · live" : ""}
              </button>
            ) : (
              <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-cyan-100">
                Wetter · {weather.label} {weather.tempC} °C{weather.source === "live" ? " · live" : ""}
              </p>
            )}

            <SimReadout sim={sim} chart={chart} onChart={districtOpen ? onToggleChart : null} />

            {districtOpen && chart && (chart === "weather" ? weatherSeries.length > 1 : series) ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
                <HoloMetricChart
                  series={series ?? []}
                  metric={chart}
                  weather={weatherSeries}
                  markDay={viewDay}
                />
              </motion.div>
            ) : null}

            {influences.length > 0 ? (
              <ul className="space-y-2 border-t border-hero-border/30 pt-3">
                {influences.map((influence) => (
                  <li key={influence.id}>
                    <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold">
                      {influence.title}
                    </p>
                    <p className="font-libre text-sm leading-relaxed text-gray-300">{influence.summary}</p>
                  </li>
                ))}
              </ul>
            ) : null}

            {districtOpen && factions.length > 0 ? (
              <div className="border-t border-hero-border/30 pt-3">
                <p className="mb-2 font-barlow text-[10px] font-bold uppercase tracking-wide text-cyan-200">
                  Fraktionen & Gilden
                </p>
                <ul className="space-y-3">
                  {factions.map((faction) => {
                    const recordId = factionRecordIds[faction.id];
                    const href =
                      worldId && recordId
                        ? `/dashboard/worlds/${worldId}/factions/${recordId}`
                        : null;
                    return <FactionCard key={faction.id} faction={faction} href={href} />;
                  })}
                </ul>
              </div>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function HoloOverlay({
  subject,
  lore,
  sim,
  series,
  weather,
  weatherSeries,
  influences,
  factions,
  factionRecordIds = {},
  locations,
  selectedLocation,
  leaders = [],
  operator = null,
  npcLinkContext = {},
  viewDay,
  isGm = false,
  selectedPoi = null,
  districtPois = [],
  landmark = null,
  onClose,
  onSelect,
}: Props) {
  const [chart, setChart] = useState<ChartMetric | null>(null);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const subjectKey = subject ? `${subject.type}:${subject.id}` : "";

  useEffect(() => {
    setChart(null);
    setAnalysisOpen(false);
  }, [subjectKey]);

  const toggleChart = (metric: ChartMetric) => {
    setChart((current) => (current === metric ? null : metric));
  };

  const brief = useMemo(() => {
    if (!subject || subject.type === "poi") return null;
    return synthesizePlaceBrief({
      placeName: subject.name,
      scope: subject.type === "building" ? "building" : "district",
      weather,
      sim,
      location: selectedLocation,
      operator,
      leaders: subject.type === "district" ? leaders : [],
      influences,
    });
  }, [subject, weather, sim, selectedLocation, operator, leaders, influences]);

  const featuredNpcs = useMemo(() => {
    if (!subject) return [] as { npc: AurenfurtNpc; kicker: string }[];
    if (subject.type === "building" && operator) {
      return [{ npc: operator, kicker: "Betreiber" }];
    }
    if (subject.type === "district") {
      return leaders.slice(0, 3).map((npc) => ({ npc, kicker: "Anführer" }));
    }
    return [];
  }, [subject, operator, leaders]);

  const districtPoiTotals = useMemo(() => sumPoiInfluences(districtPois), [districtPois]);

  const landmarkModel: LandmarkModel | undefined =
    landmark ?? (subject?.type === "building" ? findBuilding(subject.id)?.landmark : undefined);

  if (subject?.type === "poi" && selectedPoi) {
    return (
      <AnimatePresence>
        <motion.aside
          key={`poi:${selectedPoi.id}`}
          initial={{ opacity: 0, x: -48 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -48 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-auto relative z-[80] flex h-full max-h-full w-sm max-w-[min(calc(100vw-2.75rem),24rem)] shrink-0 flex-col overflow-hidden border-r border-hero-border/40 bg-linear-to-b from-background-card/98 via-background-card/95 to-background-dark/98 shadow-2xl backdrop-blur-md"
        >
          <div className="flex shrink-0 items-start justify-between gap-2 border-b border-hero-border/40 px-3 py-2">
            <div className="min-w-0">
              <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold">
                {selectedPoi.kind}
              </p>
              <h2 className="truncate font-cinzel text-lg font-bold text-accent-gold">{selectedPoi.name}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded p-1 text-gray-400 hover:text-white"
              aria-label="Auswahl aufheben"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pt-3 pb-4">
            {selectedPoi.imageUrl ? (
              <div className="relative aspect-[2.4/1] max-h-28 overflow-hidden rounded border border-accent-gold/40">
                <Image
                  src={selectedPoi.imageUrl}
                  alt={selectedPoi.name}
                  fill
                  sizes="24rem"
                  className="object-cover"
                />
              </div>
            ) : null}
            {selectedPoi.description ? (
              <p className="font-libre text-sm leading-relaxed text-gray-200">
                {selectedPoi.description}
              </p>
            ) : null}
            {selectedPoi.influences.length > 0 ? (
              <div>
                <p className="mb-1 font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold">
                  Einfluss
                </p>
                <ul className="space-y-1">
                  {selectedPoi.influences.map((entry) => (
                    <li key={`${entry.aspect}-${entry.delta}`} className="font-libre text-xs text-gray-300">
                      {influenceInWords(entry)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => onSelect({ type: "district", id: selectedPoi.districtId })}
              className="font-barlow text-[10px] font-bold uppercase tracking-wide text-cyan-200 hover:text-white"
            >
              Viertel öffnen
            </button>
          </div>
        </motion.aside>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {subject && brief ? (
        <motion.aside
          key={`${subject.type}:${subject.id}`}
          initial={{ opacity: 0, x: -48 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -48 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-auto relative z-[80] flex h-full max-h-full w-sm max-w-[min(calc(100vw-2.75rem),24rem)] shrink-0 flex-col overflow-hidden border-r border-hero-border/40 bg-linear-to-b from-background-card/98 via-background-card/95 to-background-dark/98 shadow-2xl backdrop-blur-md"
        >
          <div className="flex shrink-0 items-start justify-between gap-2 border-b border-hero-border/40 px-3 py-2">
            <div className="min-w-0">
              <p className="font-barlow text-[10px] font-bold uppercase tracking-wide text-cyan-200">{subject.kicker}</p>
              <h2 className="truncate font-cinzel text-lg font-bold text-accent-gold">{subject.name}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded p-1 text-gray-400 hover:text-white"
              aria-label="Auswahl aufheben"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* Clean View — Kernfakten ohne Rohdaten-Wand */}
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pt-3 pb-1">
              <SimKpiBar
                sim={sim}
                weather={weather}
                scopeHint={subject.type === "building" ? "Kennzahlen des Viertels" : undefined}
              />

              {lore?.imageUrl ? (
                <div className="relative aspect-[2.4/1] max-h-28 overflow-hidden rounded border border-hero-border/40">
                  <Image
                    src={lore.imageUrl}
                    alt={subject.name}
                    fill
                    sizes="24rem"
                    className="object-cover"
                  />
                </div>
              ) : null}

              {landmarkModel ? (
                <HoloLandmarkPreview key={subject.id} model={landmarkModel} />
              ) : null}

              <p className="font-libre text-sm leading-relaxed text-gray-200">
                {brief.statusText}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <span className="font-barlow text-[10px] font-bold uppercase tracking-wide text-gray-500">
                  Stimmung
                </span>
                {brief.moodParts.map((part) => (
                  <span
                    key={part}
                    className="rounded border border-hero-border/50 bg-background-dark/60 px-2 py-0.5 font-barlow text-[11px] font-bold uppercase tracking-wide text-hero-vibrant"
                  >
                    {part}
                  </span>
                ))}
              </div>

              {featuredNpcs.length > 0 ? (
                <ul className="space-y-2">
                  {featuredNpcs.map(({ npc, kicker }) => (
                    <NpcCleanCard
                      key={npc.id}
                      npc={npc}
                      kicker={kicker}
                      linkContext={npcLinkContext}
                    />
                  ))}
                  {subject.type === "district" && leaders.length > 3 ? (
                    <li className="font-libre text-xs text-gray-500">
                      Weitere Anführer unter Daten/Analyse.
                    </li>
                  ) : null}
                </ul>
              ) : null}

              {brief.concerns.length > 0 ? (
                <div>
                  <p className="mb-1 font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold">
                    Akute Sorgen
                  </p>
                  <ul className="space-y-1">
                    {brief.concerns.map((line) => (
                      <li key={line} className="font-libre text-xs leading-snug text-gray-300">
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {lore?.description ? (
                <p className="font-libre text-xs leading-relaxed text-gray-500">
                  {loreExcerpt(lore.description, subject.summary)}
                </p>
              ) : null}

              {isGm && subject.type === "district" && districtPoiTotals.length > 0 ? (
                <div className="rounded border border-accent-gold/30 bg-accent-gold/5 px-2 py-2">
                  <p className="mb-1 font-barlow text-[10px] font-bold uppercase tracking-wide text-accent-gold">
                    POI-Einfluss (Summe)
                  </p>
                  <ul className="space-y-0.5">
                    {districtPoiTotals.map((entry) => (
                      <li
                        key={entry.aspect}
                        className="font-libre text-xs text-gray-300"
                      >
                        {formatInfluenceDelta(entry)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <AnalysisPanel
                open={analysisOpen}
                onToggle={() => setAnalysisOpen((value) => !value)}
                subject={subject}
                sim={sim}
                series={series}
                weather={weather}
                weatherSeries={weatherSeries}
                influences={influences}
                factions={factions}
                factionRecordIds={factionRecordIds}
                worldId={npcLinkContext.worldId ?? null}
                selectedLocation={selectedLocation}
                chart={chart}
                onToggleChart={toggleChart}
                correlationHint={brief.correlationHint}
                viewDay={viewDay}
              />

              {subject.type === "building" ? (
                <button
                  type="button"
                  onClick={() => onSelect({ type: "district", id: subject.districtId })}
                  className="mb-3 font-barlow text-[10px] font-bold uppercase tracking-wide text-cyan-200 hover:text-white"
                >
                  Viertel öffnen
                </button>
              ) : (
                <ul className="mb-3 space-y-1 border-t border-hero-border/30 pt-3">
                  {locations.map((place) => (
                    <li key={place.id}>
                      <button
                        type="button"
                        onClick={() => onSelect({ type: "building", id: place.id })}
                        className="w-full text-left"
                      >
                        <span className="font-barlow text-xs font-bold uppercase tracking-wide text-cyan-100 hover:text-accent-gold">
                          {place.name}
                        </span>
                        <span className="mt-0.5 block font-libre text-xs text-gray-400">
                          {place.guildName}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
