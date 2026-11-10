/**
 * Kennzahlen der Stadt für Tag, Woche, Monat und Jahr.
 * Jeder Tag stammt aus der laufenden Simulation: Ereignisse verschieben die Ziele,
 * das Wetter des Tages bestimmt die Versorgung. Tage vor dem Simulationsstart werden
 * nicht erfunden, das Fenster rückt auf den ersten berechneten Tag.
 */

import {
  AURENFURT_DISTRICTS,
  findBuilding,
  findDistrict,
  type CityDistrictId,
} from "./aurenfurt-districts";
import { buildingWeights, citySimVersion } from "./aurenfurt-city-sim";
import {
  allFactionStandings,
  factionName,
  RELATIONSHIP_LABELS,
  type FactionId,
} from "./aurenfurt-factions";
import { allAurenfurtNpcs, withDistrictModulation } from "./aurenfurt-npcs";
import { chronicleInWindow, chronicleMarksOn } from "./aurenfurt-chronicle";
import {
  AURENFURT_HISTORY,
  HISTORY_START,
  districtMetricsOn,
  eventWeight,
  formatDay,
  parseDay,
  pressureNotesOn,
  utcToday,
} from "./aurenfurt-history";
import { SIM_METERS, type SimMeterKey, type SimProfile } from "./aurenfurt-sim";
import { weatherOn, type DayWeather, type WeatherKind } from "./aurenfurt-weather";
import { listActiveMeasures } from "./aurenfurt-active-measures";
import { NPC_PORTRAIT_PLACEHOLDER } from "./aurenfurt-npcs";

const DAY_MS = 86_400_000;

const MONTHS = [
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

const MONTHS_SHORT = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"] as const;

export const ANALYTICS_RANGES = ["day", "week", "month", "year"] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

export const RANGE_LABEL: Record<AnalyticsRange, string> = {
  day: "Tag",
  week: "Woche",
  month: "Monat",
  year: "Jahr",
};

export const HIGHER_IS_WORSE = new Set<SimMeterKey>(["crime", "malanthir", "refugees", "unemployment"]);

export type AnalyticsPoint = {
  label: string;
  crime: number;
  vattrak: number;
  malanthir: number;
  guard: number;
  refugees: number;
  economy: number;
  unemployment: number;
  elysia: number;
  chromus: number;
  tension: number;
  /** Namen, die an den Tagen dieses Punktes aktiv sind. */
  events: string[];
  /** Erster ISO-Tag, den der Punkt bündelt. */
  day: string;
  /** Letzter ISO-Tag, den der Punkt bündelt. */
  until: string;
};

export type DistrictRank = {
  id: CityDistrictId;
  name: string;
  tint: string;
  average: SimProfile;
  tension: number;
};

export type WeatherShare = {
  kind: WeatherKind;
  label: string;
  days: number;
};

export type AnalyticsEvent = {
  id: string;
  title: string;
  summary: string;
  weight: number;
  /** ISO-Anfang, wenn die Quelle einen hat. */
  start: string | null;
  /** ISO-Ende, wenn die Quelle eines hat. Offen oder fehlend: keine Fläche. */
  end: string | null;
};

export type AnalyticsFaction = {
  id: string;
  name: string;
  role: string;
  power: number;
  legality: number;
  economicImpact: number;
  ideologyLabel: string;
  districtNames: string[];
  relationships: { label: string; strength: number; targetName: string }[];
};

export type AnalyticsNpcActiveItem = {
  id: string;
  title: string;
  detail: string;
  effectsLabel: string | null;
};

export type AnalyticsNpc = {
  id: string;
  name: string;
  title: string;
  role: string;
  factionId: FactionId;
  factionName: string;
  districtId: CityDistrictId;
  districtName: string;
  /** Gebäude-/Ortssitz in der Stadt, falls bekannt. */
  seatName: string | null;
  influence: number;
  description: string;
  agenda: string;
  portraitUrl: string;
  recordId: string | null;
  /** Aktive Automatismen dieses NPCs am Stichtag. */
  activeAutomations: AnalyticsNpcActiveItem[];
  /** Aktive NPC-Ereigniskarten dieses NPCs am Stichtag. */
  activeEventCards: AnalyticsNpcActiveItem[];
};

export type AnalyticsInsight = {
  id: string;
  title: string;
  text: string;
  tone: "up" | "down" | "alert" | "neutral";
};

export type CityAnalytics = {
  range: AnalyticsRange;
  scopeId: CityDistrictId | null;
  scopeLabel: string;
  periodLabel: string;
  anchorLabel: string;
  compareLabel: string;
  clamped: boolean;
  dayCount: number;
  current: SimProfile;
  average: SimProfile;
  previous: SimProfile | null;
  deltas: Partial<Record<SimMeterKey, number>>;
  series: AnalyticsPoint[];
  districts: DistrictRank[];
  weather: WeatherShare[];
  events: AnalyticsEvent[];
  factions: AnalyticsFaction[];
  npcs: AnalyticsNpc[];
  cells: { name: string; strength: number }[];
  insights: AnalyticsInsight[];
  liveWeatherNote: string | null;
};

export type AnalyticsInput = {
  range: AnalyticsRange;
  anchorIso: string;
  scopeId: CityDistrictId | null;
  liveWeather?: Pick<DayWeather, "day" | "kind" | "label" | "source"> | null;
};

type DayBundle = Record<CityDistrictId, SimProfile>;

const bundleCache = new Map<string, DayBundle>();

function rememberBundle(day: number): DayBundle {
  const key = `${citySimVersion()}|${day}`;
  const hit = bundleCache.get(key);
  if (hit) return hit;
  const bundle = {} as DayBundle;
  for (const district of AURENFURT_DISTRICTS) {
    bundle[district.id] = districtMetricsOn(district.id, day);
  }
  if (bundleCache.size > 2500) bundleCache.clear();
  bundleCache.set(key, bundle);
  return bundle;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function weightedCity(bundle: DayBundle): SimProfile {
  const weights = buildingWeights();
  const rows = AURENFURT_DISTRICTS.map((district) => ({
    weight: weights[district.id] ?? 1,
    sim: bundle[district.id],
  }));
  const weightSum = rows.reduce((sum, row) => sum + row.weight, 0) || 1;
  const avg = (pick: (profile: SimProfile) => number) =>
    Math.round(rows.reduce((sum, row) => sum + pick(row.sim) * row.weight, 0) / weightSum);
  const names = new Set(rows.flatMap((row) => row.sim.underground.map((cell) => cell.name)));
  const underground = [...names].flatMap((name) => {
    let strength = 0;
    let seen = 0;
    for (const row of rows) {
      const cell = row.sim.underground.find((item) => item.name === name);
      if (!cell) continue;
      strength += cell.strength * row.weight;
      seen += row.weight;
    }
    if (!seen) return [];
    return [{ name, strength: clampScore(strength / seen) }];
  });
  return {
    crime: avg((profile) => profile.crime),
    vattrak: avg((profile) => profile.vattrak),
    malanthir: avg((profile) => profile.malanthir),
    guard: avg((profile) => profile.guard),
    refugees: avg((profile) => profile.refugees),
    economy: avg((profile) => profile.economy),
    unemployment: avg((profile) => profile.unemployment),
    elysia: avg((profile) => profile.elysia),
    chromus: avg((profile) => profile.chromus),
    underground,
    tensionBias: avg((profile) => profile.tensionBias ?? 0),
  };
}

function scopeProfile(bundle: DayBundle, scopeId: CityDistrictId | null) {
  return scopeId ? bundle[scopeId] : weightedCity(bundle);
}

function averageProfiles(profiles: SimProfile[]): SimProfile {
  const count = profiles.length || 1;
  const avg = (pick: (profile: SimProfile) => number) =>
    Math.round(profiles.reduce((sum, profile) => sum + pick(profile), 0) / count);
  const names = new Set(profiles.flatMap((profile) => profile.underground.map((cell) => cell.name)));
  const underground = [...names]
    .map((name) => {
      const values = profiles.flatMap((profile) => {
        const cell = profile.underground.find((item) => item.name === name);
        return cell ? [cell.strength] : [];
      });
      const strength = values.reduce((sum, value) => sum + value, 0) / (values.length || 1);
      return { name, strength: clampScore(strength) };
    })
    .sort((a, b) => b.strength - a.strength);
  return {
    crime: avg((profile) => profile.crime),
    vattrak: avg((profile) => profile.vattrak),
    malanthir: avg((profile) => profile.malanthir),
    guard: avg((profile) => profile.guard),
    refugees: avg((profile) => profile.refugees),
    economy: avg((profile) => profile.economy),
    unemployment: avg((profile) => profile.unemployment),
    elysia: avg((profile) => profile.elysia),
    chromus: avg((profile) => profile.chromus),
    underground,
    tensionBias: avg((profile) => profile.tensionBias ?? 0),
  };
}

/**
 * Unzufriedenheit / Spannung der Region.
 * Crime, Arbeitslosigkeit, Unruhe-Proxy (schwache Wirtschaft), Malanthir und
 * überzogene Garde-Präsenz treiben; Religion (Vattrak) und Wohlstand dämpfen.
 */
export function tensionOf(profile: SimProfile) {
  const dissatisfaction =
    profile.crime * 0.26 +
    profile.unemployment * 0.2 +
    profile.malanthir * 0.14 +
    profile.refugees * 0.1 +
    (100 - profile.economy) * 0.12 +
    Math.max(0, profile.guard - 55) * 0.14;
  const satisfaction =
    Math.max(0, profile.economy - 45) * 0.1 +
    Math.max(0, profile.vattrak - 40) * 0.12 +
    Math.max(0, profile.elysia - 45) * 0.04;
  return clampScore(dissatisfaction - satisfaction + (profile.tensionBias ?? 0));
}

function germanDay(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return `${day}. ${MONTHS[month - 1]} ${year}`;
}

function shortDay(utc: number) {
  const date = new Date(utc);
  return `${date.getUTCDate()}.${String(date.getUTCMonth() + 1).padStart(2, "0")}.`;
}

function eachDay(from: number, to: number) {
  const start = parseDay(HISTORY_START);
  const end = utcToday();
  const days: number[] = [];
  for (let day = Math.max(from, start); day <= Math.min(to, end); day += DAY_MS) days.push(day);
  return days;
}

function lastOfMonth(anchor: number) {
  const date = new Date(anchor);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0);
}

function weekMonday(anchor: number) {
  const weekday = new Date(anchor).getUTCDay();
  const offset = weekday === 0 ? 6 : weekday - 1;
  return anchor - offset * DAY_MS;
}

function requestedWindow(range: AnalyticsRange, anchor: number) {
  const date = new Date(anchor);
  if (range === "day") return { from: anchor, to: anchor };
  if (range === "week") {
    const from = weekMonday(anchor);
    return { from, to: Math.min(from + 6 * DAY_MS, utcToday()) };
  }
  if (range === "month") {
    return {
      from: Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1),
      to: Math.min(lastOfMonth(anchor), utcToday()),
    };
  }
  return {
    from: Date.UTC(date.getUTCFullYear(), 0, 1),
    to: Math.min(Date.UTC(date.getUTCFullYear(), 11, 31), utcToday()),
  };
}

function periodLabel(range: AnalyticsRange, from: number, to: number) {
  const start = new Date(from);
  const end = new Date(to);
  if (range === "day") return germanDay(formatDay(to));
  if (range === "year") return String(end.getUTCFullYear());
  if (range === "month" && start.getUTCMonth() === end.getUTCMonth()) {
    return `${MONTHS[start.getUTCMonth()]} ${start.getUTCFullYear()}`;
  }
  return `${germanDay(formatDay(from))} – ${germanDay(formatDay(to))}`;
}

function comparePhrase(range: AnalyticsRange, to: number, hasPrevious: boolean) {
  if (!hasPrevious) return "ohne Vergleichszeitraum";
  if (range === "day") return "gegen den Vortag";
  if (range === "week") return "gegen die Vorwoche";
  if (range === "year") return "gegen das Vorjahr";
  const end = new Date(to);
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  if (end.getUTCDate() < last) return "gegen dieselben Tage im Vormonat";
  return "gegen den Vormonat";
}
function pointFrom(
  label: string,
  profile: SimProfile,
  events: string[],
  day: string,
  until: string,
): AnalyticsPoint {
  return {
    label,
    crime: profile.crime,
    vattrak: profile.vattrak,
    malanthir: profile.malanthir,
    guard: profile.guard,
    refugees: profile.refugees,
    economy: profile.economy,
    unemployment: profile.unemployment,
    elysia: profile.elysia,
    chromus: profile.chromus,
    tension: tensionOf(profile),
    events,
    day,
    until,
  };
}

function activeRanked(day: number, scopeId: CityDistrictId | null): Array<{ name: string; weight: number }> {
  const ranked: Array<{ name: string; weight: number }> = [];
  const seen = new Set<string>();
  const add = (name: string, weight: number) => {
    const title = name.trim();
    if (!title || seen.has(title)) return;
    seen.add(title);
    ranked.push({ name: title, weight });
  };
  for (const event of AURENFURT_HISTORY) {
    const weight = eventWeight(event, day);
    if (weight < 0.2) continue;
    if (scopeId && !event.impact[scopeId]) continue;
    add(event.title, weight);
  }
  for (const mark of chronicleMarksOn(day, scopeId)) add(mark.title, 0.85);
  for (const note of pressureNotesOn(day)) {
    const weight = note.kind === "ability" || note.kind === "counter" ? 0.95 : 0.75;
    add(note.title, weight);
  }
  return ranked.sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name, "de"));
}

function activeNames(day: number, scopeId: CityDistrictId | null): string[] {
  return activeRanked(day, scopeId).map((entry) => entry.name);
}

function namesOnDays(days: number[], scopeId: CityDistrictId | null) {
  const best = new Map<string, number>();
  for (const day of days) {
    for (const entry of activeRanked(day, scopeId)) {
      const prev = best.get(entry.name) ?? 0;
      if (entry.weight > prev) best.set(entry.name, entry.weight);
    }
  }
  return [...best.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "de"))
    .map(([name]) => name);
}

function previousWindow(range: AnalyticsRange, from: number, to: number) {
  if (range === "day") return { from: to - DAY_MS, to: to - DAY_MS };
  if (range === "week") return { from: from - 7 * DAY_MS, to: to - 7 * DAY_MS };
  if (range === "month") {
    const start = new Date(from);
    const end = new Date(to);
    const prevLast = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 0);
    const prevEndDay = Math.min(end.getUTCDate(), new Date(prevLast).getUTCDate());
    return {
      from: Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 1, 1),
      to: Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 1, prevEndDay),
    };
  }
  const start = new Date(from);
  const end = new Date(to);
  return {
    from: Date.UTC(start.getUTCFullYear() - 1, start.getUTCMonth(), start.getUTCDate()),
    to: Date.UTC(end.getUTCFullYear() - 1, end.getUTCMonth(), end.getUTCDate()),
  };
}
function chartSeries(
  range: AnalyticsRange,
  anchor: number,
  windowDays: number[],
  scopeId: CityDistrictId | null,
) {
  if (range === "year") {
    const buckets = new Map<string, { profiles: SimProfile[]; days: number[] }>();
    for (const day of windowDays) {
      const date = new Date(day);
      const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
      const bucket = buckets.get(key) ?? { profiles: [], days: [] };
      bucket.profiles.push(scopeProfile(rememberBundle(day), scopeId));
      bucket.days.push(day);
      buckets.set(key, bucket);
    }
    return [...buckets.entries()].map(([key, bucket]) => {
      const month = Number(key.split("-")[1]);
      return pointFrom(
        MONTHS_SHORT[month] ?? key,
        averageProfiles(bucket.profiles),
        namesOnDays(bucket.days, scopeId),
        formatDay(bucket.days[0]),
        formatDay(bucket.days[bucket.days.length - 1]),
      );
    });
  }

  const plotted = range === "day" ? eachDay(anchor - 13 * DAY_MS, anchor) : windowDays;
  return plotted.map((day) => {
    const iso = formatDay(day);
    return pointFrom(shortDay(day), scopeProfile(rememberBundle(day), scopeId), activeNames(day, scopeId), iso, iso);
  });
}

function weatherShares(
  days: number[],
  liveWeather: AnalyticsInput["liveWeather"],
): { shares: WeatherShare[]; liveNote: string | null } {
  const counts = new Map<WeatherKind, number>();
  let liveNote: string | null = null;
  for (const day of days) {
    const iso = formatDay(day);
    const simulated = weatherOn(day);
    const useLive = Boolean(liveWeather && liveWeather.day === iso && liveWeather.source === "live");
    const kind = useLive && liveWeather ? liveWeather.kind : simulated.kind;
    if (useLive && liveWeather) {
      liveNote = `Der ${germanDay(iso)} nutzt die gemessene Witterung (${liveWeather.label}). Die übrigen Tage folgen dem simulierten Wetter.`;
    }
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }
  const shares = [...counts.entries()]
    .map(([kind, count]) => ({ kind, label: labelForKind(kind), days: count }))
    .sort((a, b) => b.days - a.days);
  return { shares, liveNote };
}

const KIND_LABEL: Record<WeatherKind, string> = {
  clear: "Klar",
  cloudy: "Bedeckt",
  fog: "Nebel",
  rain: "Regen",
  storm: "Sturm",
  snow: "Schnee",
  frost: "Frost",
  heat: "Hitze",
};

function labelForKind(kind: WeatherKind) {
  return KIND_LABEL[kind];
}

function eventsIn(days: number[], scopeId: CityDistrictId | null): AnalyticsEvent[] {
  const history = AURENFURT_HISTORY.flatMap((event) => {
    let peak = 0;
    for (const day of days) peak = Math.max(peak, eventWeight(event, day));
    if (peak < 0.2) return [];
    if (scopeId && !event.impact[scopeId]) return [];
    return [
      {
        id: event.id,
        title: event.title,
        summary: event.summary,
        weight: peak,
        start: event.start,
        end: event.end,
      },
    ];
  });
  const chronicle = chronicleInWindow(days, scopeId).map((mark) => ({
    id: mark.id,
    title: mark.title,
    summary: mark.summary,
    weight: 1,
    start: null,
    end: null,
  }));
  const ranked = [...history, ...chronicle].sort((a, b) => b.weight - a.weight);
  const taken = new Set(ranked.map((event) => event.title));
  const seenIds = new Set<string>();
  const pressure: AnalyticsEvent[] = [];
  for (const day of days) {
    const dayNames = new Set<string>();
    for (const note of pressureNotesOn(day)) {
      if (dayNames.has(note.title)) continue;
      dayNames.add(note.title);
      if (taken.has(note.title) || seenIds.has(note.id)) continue;
      seenIds.add(note.id);
      taken.add(note.title);
      pressure.push({
        id: note.id,
        title: note.title,
        summary: note.detail,
        weight: 0,
        start: null,
        end: null,
      });
    }
  }
  return [...ranked, ...pressure];
}

function signed(value: number) {
  if (value > 0) return `+${value}`;
  return String(value);
}

function buildInsights(input: {
  range: AnalyticsRange;
  scopeLabel: string;
  average: SimProfile;
  previous: SimProfile | null;
  deltas: Partial<Record<SimMeterKey, number>>;
  districts: DistrictRank[];
  weather: WeatherShare[];
  events: AnalyticsEvent[];
  factions: AnalyticsFaction[];
  cells: { name: string; strength: number }[];
  dayCount: number;
}): AnalyticsInsight[] {
  const insights: AnalyticsInsight[] = [];
  const compare =
    input.range === "day"
      ? "den Vortag"
      : input.range === "week"
        ? "die Vorwoche"
        : input.range === "month"
          ? "den Vormonat"
          : "das Vorjahr";

  const push = (insight: AnalyticsInsight) => {
    if (insights.some((entry) => entry.id === insight.id || entry.title === insight.title)) return;
    insights.push(insight);
  };

  const byCrime = [...input.districts].sort((a, b) => b.average.crime - a.average.crime);
  const byGuard = [...input.districts].sort((a, b) => b.average.guard - a.average.guard);
  const crimeLead = byCrime[0];
  const guardLead = byGuard[0];
  const unterstadt = input.districts.find((district) => district.id === "unterstadt");
  const tempel = input.districts.find((district) => district.id === "tempelbezirk");
  const crimeHot = byCrime.filter((district) => district.average.crime >= 65);
  const moves = SIM_METERS.flatMap((meter) => {
    const delta = input.deltas[meter.key];
    if (delta == null || delta === 0) return [];
    return [{ key: meter.key, delta, label: meter.label }];
  }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const lead = moves[0];

  // 1) Konkrete Hotspots & Alltagsfolgen
  if (unterstadt && unterstadt.average.crime >= 55) {
    push({
      id: "crime-unterstadt",
      title: "Kriminalität in der Unterstadt weiterhin hoch",
      tone: "alert",
      text: `Die Unterstadt liegt bei ${unterstadt.average.crime} Kriminalität${
        unterstadt.average.guard <= 45
          ? `, die Garde hält dort nur ${unterstadt.average.guard}`
          : ""
      }.`,
    });
  } else if (crimeLead && crimeLead.average.crime >= 60) {
    push({
      id: "crime-lead",
      title: `Kriminalität in ${crimeLead.name} besonders hoch`,
      tone: "alert",
      text: `${crimeLead.name} führt mit ${crimeLead.average.crime} — die Garde dort bei ${crimeLead.average.guard}.`,
    });
  }

  if (crimeHot.length > 0) {
    const names = crimeHot.map((district) => district.name).join(", ");
    push({
      id: "shops-early",
      title: "Einige Läden schließen früher",
      tone: "alert",
      text: `Bei Kriminalität über 65 greift die Sperrstunde: betroffen u. a. ${names}.`,
    });
  }

  // 2) Konfession / Tempel
  const confessionEvent = input.events.find((event) =>
    /konfession|elysia|chromus|glaube|tempel/i.test(`${event.title} ${event.summary}`),
  );
  const faithClash = Boolean(
    tempel &&
      (Math.abs(tempel.average.elysia - tempel.average.chromus) >= 12 ||
        tempel.average.malanthir >= 45 ||
        confessionEvent),
  );
  if (faithClash) {
    push({
      id: "confession",
      title: "Konfessionsstreit im Tempelbezirk",
      tone: "alert",
      text: confessionEvent
        ? confessionEvent.summary
        : `Elysia ${tempel!.average.elysia} gegen Chromus ${tempel!.average.chromus} — die Höfe sind gespalten.`,
    });
  }

  // 3) Sicherheit konkret (kein vages „Viertel im Vergleich“)
  if (crimeLead && guardLead) {
    const gap = input.average.crime - input.average.guard;
    if (gap >= 8) {
      push({
        id: "security-gap",
        title: "Sicherheitslücke: Kriminalität überholt die Garde",
        tone: "alert",
        text: `Stadtweit Crime ${input.average.crime} vs. Garde ${input.average.guard}. Heißester Herd: ${crimeLead.name}.`,
      });
    } else if (crimeLead.id !== guardLead.id) {
      push({
        id: "district-hot",
        title: `${crimeLead.name} unsicherer als ${guardLead.name}`,
        tone: "neutral",
        text: `${crimeLead.name} führt bei Kriminalität (${crimeLead.average.crime}), ${guardLead.name} bei Garde (${guardLead.average.guard}).`,
      });
    }
  }

  // 4) Laufende Ereignisse (Titel + Zusammenfassung)
  for (const event of input.events.slice(0, 3)) {
    if (/konfession/i.test(event.title) && insights.some((entry) => entry.id === "confession")) {
      continue;
    }
    push({
      id: `event-${event.id}`,
      title: event.title,
      tone: "neutral",
      text: event.summary,
    });
  }

  // 5) Fraktion / Untergrund — mit Namen, nicht als Kategorie
  const faction = input.factions[0];
  const topCell = input.cells[0];
  if (faction) {
    const where =
      faction.districtNames.length > 0
        ? `Schwerpunkt: ${faction.districtNames.slice(0, 2).join(", ")}`
        : "stadtweit aktiv";
    push({
      id: "faction-lead",
      title:
        faction.legality < 0
          ? `${faction.name} stärkt den Untergrund`
          : `${faction.name} hält den größten Einfluss`,
      tone: faction.legality < 0 ? "alert" : "neutral",
      text: `Macht ${faction.power} · ${where}${
        topCell ? ` · Nest „${topCell.name}“ (${topCell.strength})` : ""
      }.`,
    });
  } else if (topCell) {
    push({
      id: "underground-cell",
      title: `Untergrundnest „${topCell.name}“ aktiv`,
      tone: "alert",
      text: `Stärke ${topCell.strength} — die Schattenwirtschaft bleibt spürbar.`,
    });
  }

  // 6) Stärkste Meter-Bewegung nur, wenn noch Platz
  if (insights.length < 4 && lead && input.previous) {
    const good = HIGHER_IS_WORSE.has(lead.key) ? lead.delta < 0 : lead.delta > 0;
    push({
      id: "meter-move",
      title: `${lead.label} ${lead.delta > 0 ? "steigt" : "sinkt"} spürbar`,
      tone: good ? "up" : "down",
      text: `In ${input.scopeLabel} ${signed(lead.delta)} gegenüber ${compare} (aktuell ${input.average[lead.key]}).`,
    });
  }

  if (insights.length === 0) {
    push({
      id: "quiet",
      title: "Keine besonderen Spannungen im Fenster",
      tone: "neutral",
      text: `${input.scopeLabel} wirkt im gewählten Zeitraum vergleichsweise ruhig.`,
    });
  }

  return insights.slice(0, 5);
}

export function buildCityAnalytics(input: AnalyticsInput): CityAnalytics {
  const anchor = Math.max(parseDay(HISTORY_START), Math.min(utcToday(), parseDay(input.anchorIso)));
  const requested = requestedWindow(input.range, anchor);
  const historyStart = parseDay(HISTORY_START);
  const clamped = requested.from < historyStart;
  const days = eachDay(requested.from, requested.to);
  const safeDays = days.length > 0 ? days : [anchor];
  const length = safeDays.length;
  const earlier = previousWindow(input.range, safeDays[0], safeDays[safeDays.length - 1]);
  const previousDays = eachDay(earlier.from, earlier.to);

  const currentBundle = rememberBundle(anchor);
  const current = scopeProfile(currentBundle, input.scopeId);
  const windowProfiles = safeDays.map((day) => scopeProfile(rememberBundle(day), input.scopeId));
  const average = averageProfiles(windowProfiles);
  const previous = previousDays.length
    ? averageProfiles(previousDays.map((day) => scopeProfile(rememberBundle(day), input.scopeId)))
    : null;
  const deltas: Partial<Record<SimMeterKey, number>> = {};
  if (previous) {
    for (const meter of SIM_METERS) {
      deltas[meter.key] = average[meter.key] - previous[meter.key];
    }
  }

  const districtBundles = safeDays.map((day) => rememberBundle(day));
  const districts: DistrictRank[] = AURENFURT_DISTRICTS.map((district) => {
    const averageProfile = averageProfiles(districtBundles.map((bundle) => bundle[district.id]));
    return {
      id: district.id,
      name: district.name,
      tint: district.tint,
      average: averageProfile,
      tension: tensionOf(averageProfile),
    };
  });

  const { shares, liveNote } = weatherShares(safeDays, input.liveWeather);
  const events = eventsIn(safeDays, input.scopeId);
  const factionScope = input.scopeId;
  const factions = allFactionStandings(anchor)
    .filter((faction) => !factionScope || faction.districtIds.includes(factionScope))
    .map((faction) => ({
      id: faction.id,
      name: faction.name,
      role: faction.role,
      power: faction.power,
      legality: faction.legality,
      economicImpact: faction.economicImpact,
      ideologyLabel: faction.ideologyLabel,
      districtNames: faction.districtIds.map(
        (id) => findDistrict(id)?.name ?? id,
      ),
      relationships: faction.networkRelationships.map((link) => ({
        label: RELATIONSHIP_LABELS[link.kind],
        strength: link.strength,
        targetName: factionName(link.targetId),
      })),
    }))
    .sort((a, b) => b.power - a.power);

  const dayMeasures = listActiveMeasures(formatDay(anchor));
  const npcs: AnalyticsNpc[] = allAurenfurtNpcs()
    .filter((npc) => !factionScope || npc.districtId === factionScope)
    .map((npc) => {
      const modulated = withDistrictModulation(npc, anchor);
      const prefix = `${modulated.id}:`;
      const forNpc = dayMeasures.filter(
        (measure) => measure.id === modulated.id || measure.id.startsWith(prefix),
      );
      return {
        id: modulated.id,
        name: modulated.name,
        title: modulated.title ?? modulated.role,
        role: modulated.role,
        factionId: modulated.factionId,
        factionName: factionName(modulated.factionId),
        districtId: modulated.districtId,
        districtName: findDistrict(modulated.districtId)?.name ?? modulated.districtId,
        seatName:
          modulated.current_location_name_suggestion?.trim() ||
          findBuilding(modulated.locationId)?.name ||
          null,
        influence: modulated.influenceAndLoyalty.influence,
        description: modulated.description,
        agenda: modulated.influenceAndLoyalty.agenda,
        portraitUrl: modulated.portraitUrl?.trim() || NPC_PORTRAIT_PLACEHOLDER,
        recordId: modulated.recordId,
        activeAutomations: forNpc
          .filter((measure) => measure.kind === "ability" || measure.kind === "counter")
          .map((measure) => ({
            id: measure.id,
            title: measure.title.replace(`${modulated.name}: `, ""),
            detail: measure.detail,
            effectsLabel: measure.effectsLabel,
          })),
        activeEventCards: forNpc
          .filter((measure) => measure.kind === "npc-card")
          .map((measure) => ({
            id: measure.id,
            title: measure.title,
            detail: measure.detail,
            effectsLabel: measure.effectsLabel,
          })),
      };
    })
    .sort((a, b) => b.influence - a.influence)
    .slice(0, 8);

  const scopeLabel = input.scopeId
    ? (AURENFURT_DISTRICTS.find((district) => district.id === input.scopeId)?.name ?? "Viertel")
    : "Ganz Aurenfurt";

  const cells = [...current.underground].sort((a, b) => b.strength - a.strength).slice(0, 5);

  return {
    range: input.range,
    scopeId: input.scopeId,
    scopeLabel,
    periodLabel: periodLabel(input.range, safeDays[0], safeDays[safeDays.length - 1]),
    anchorLabel: germanDay(formatDay(anchor)),
    compareLabel: comparePhrase(input.range, safeDays[safeDays.length - 1], Boolean(previous)),
    clamped,
    dayCount: length,
    current,
    average,
    previous,
    deltas,
    series: chartSeries(input.range, anchor, safeDays, input.scopeId),
    districts,
    weather: shares,
    events,
    factions,
    npcs,
    cells,
    liveWeatherNote: liveNote,
    insights: buildInsights({
      range: input.range,
      scopeLabel,
      average,
      previous,
      deltas,
      districts,
      weather: shares,
      events,
      factions,
      cells,
      dayCount: length,
    }),
  };
}

export function deltaTone(key: SimMeterKey, delta: number): "up" | "down" | "neutral" {
  if (delta === 0) return "neutral";
  const good = HIGHER_IS_WORSE.has(key) ? delta < 0 : delta > 0;
  return good ? "up" : "down";
}

/** Monatspunkt für die Tableau-artige 3-Jahres-Übersicht. */
export type LongTermMonthPoint = {
  /** Achsenlabel, z. B. „Sep 23“. */
  label: string;
  /** ISO-Monatsanfang. */
  day: string;
  year: number;
  month: number;
  crime: number;
  vattrak: number;
  malanthir: number;
  guard: number;
  refugees: number;
  economy: number;
  unemployment: number;
  elysia: number;
  chromus: number;
  tension: number;
  /** Bevölkerung im Zuschnitt (Stadt oder Viertel), Köpfe. */
  population: number;
};

type LongTermCacheEntry = {
  version: number;
  throughIso: string;
  scopeKey: string;
  points: LongTermMonthPoint[];
};

let longTermCache: LongTermCacheEntry | null = null;

/**
 * Monatliche Mittelwerte von HISTORY_START bis Stichtag — für Small-Multiples
 * (Kriminalität, Wirtschaft, Bevölkerung auf einen Blick).
 * Ergebnis wird je Sim-Version / Stichtag / Zuschnitt gecacht.
 */
export function buildLongTermMonthlySeries(
  throughIso: string,
  scopeId: CityDistrictId | null = null,
): LongTermMonthPoint[] {
  const version = citySimVersion();
  const scopeKey = scopeId ?? "city";
  if (
    longTermCache &&
    longTermCache.version === version &&
    longTermCache.throughIso === throughIso &&
    longTermCache.scopeKey === scopeKey
  ) {
    return longTermCache.points;
  }

  const through = Math.max(parseDay(HISTORY_START), Math.min(utcToday(), parseDay(throughIso)));
  const start = parseDay(HISTORY_START);
  const startDate = new Date(start);
  let cursor = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1);
  const points: LongTermMonthPoint[] = [];

  while (cursor <= through) {
    const monthEnd = Math.min(lastOfMonth(cursor), through);
    // Monatsserie: statt aller Tage nur 3 Stützstellen (Start/Mitte/Ende) — spart ~10× Rechenzeit.
    const sampleDays = sampleMonthDays(Math.max(cursor, start), monthEnd);
    if (sampleDays.length === 0) {
      const next = new Date(cursor);
      cursor = Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 1);
      continue;
    }
    const profiles = sampleDays.map((day) => scopeProfile(rememberBundle(day), scopeId));
    const avg = averageProfiles(profiles);
    const date = new Date(cursor);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    points.push({
      label: `${MONTHS_SHORT[month]} ${String(year).slice(2)}`,
      day: formatDay(cursor),
      year,
      month,
      crime: avg.crime,
      vattrak: avg.vattrak,
      malanthir: avg.malanthir,
      guard: avg.guard,
      refugees: avg.refugees,
      economy: avg.economy,
      unemployment: avg.unemployment,
      elysia: avg.elysia,
      chromus: avg.chromus,
      tension: tensionOf(avg),
      population: 0,
    });
    cursor = Date.UTC(year, month + 1, 1);
  }

  longTermCache = { version, throughIso, scopeKey, points };
  return points;
}

/** Drei Stützstellen pro Monat — reicht für Monatsmittel, spart Tagesloops. */
function sampleMonthDays(fromMs: number, toMs: number): number[] {
  if (toMs < fromMs) return [];
  if (toMs === fromMs) return [fromMs];
  const mid = fromMs + Math.floor((toMs - fromMs) / 2);
  const days = [fromMs];
  if (mid > fromMs && mid < toMs) days.push(mid);
  days.push(toMs);
  return days;
}

export type LongTermPathMarker = {
  id: string;
  title: string;
  label: string;
  crime: number;
  economy: number;
  day: string;
};

/**
 * Wichtige Geschichtsereignisse auf den nächsten Monatspunkt der Long-Term-Serie legen.
 * Max. 6 Marker — für den Pfad-Scatter lesbar.
 */
export function longTermPathMarkers(
  points: LongTermMonthPoint[],
  scopeId: CityDistrictId | null = null,
): LongTermPathMarker[] {
  if (points.length === 0) return [];
  const fromMs = parseDay(points[0].day);
  const toMs = parseDay(points[points.length - 1].day);
  const candidates = AURENFURT_HISTORY.filter((event) => {
    const startMs = parseDay(event.start);
    if (startMs < fromMs || startMs > toMs) return false;
    if (scopeId && !event.impact[scopeId]) return false;
    return true;
  })
    .map((event) => {
      const startMs = parseDay(event.start);
      let peak = 0;
      for (const key of Object.keys(event.impact) as CityDistrictId[]) {
        const impact = event.impact[key];
        if (!impact) continue;
        peak = Math.max(
          peak,
          Math.abs(impact.crime ?? 0) +
            Math.abs(impact.economy ?? 0) +
            Math.abs(impact.refugees ?? 0) +
            Math.abs(impact.guard ?? 0),
        );
      }
      return { event, startMs, peak };
    })
    .sort((a, b) => b.peak - a.peak || a.startMs - b.startMs)
    .slice(0, 6);

  const markers: LongTermPathMarker[] = [];
  for (const candidate of candidates) {
    let best = points[0];
    let bestDist = Math.abs(parseDay(best.day) - candidate.startMs);
    for (const point of points) {
      const dist = Math.abs(parseDay(point.day) - candidate.startMs);
      if (dist < bestDist) {
        best = point;
        bestDist = dist;
      }
    }
    markers.push({
      id: candidate.event.id,
      title: candidate.event.title,
      label: best.label,
      crime: best.crime,
      economy: best.economy,
      day: best.day,
    });
  }
  return markers;
}
