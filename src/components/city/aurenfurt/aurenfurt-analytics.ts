/**
 * Kennzahlen der Stadt für Tag, Woche, Monat und Jahr.
 * Jeder Tag stammt aus der laufenden Simulation: Ereignisse verschieben die Ziele,
 * das Wetter des Tages bestimmt die Versorgung. Tage vor dem Simulationsstart werden
 * nicht erfunden, das Fenster rückt auf den ersten berechneten Tag.
 */

import { AURENFURT_DISTRICTS, type CityDistrictId } from "./aurenfurt-districts";
import { buildingWeights, citySimVersion } from "./aurenfurt-city-sim";
import { allFactionStandings } from "./aurenfurt-factions";
import {
  AURENFURT_HISTORY,
  HISTORY_START,
  districtMetricsOn,
  eventWeight,
  formatDay,
  parseDay,
  utcToday,
} from "./aurenfurt-history";
import { SIM_METERS, type SimMeterKey, type SimProfile } from "./aurenfurt-sim";
import { weatherOn, type DayWeather, type WeatherKind } from "./aurenfurt-weather";

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
};

export type AnalyticsFaction = {
  id: string;
  name: string;
  role: string;
  power: number;
  legality: number;
  economicImpact: number;
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
    underground,
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
    underground,
  };
}

export function tensionOf(profile: SimProfile) {
  const raw =
    profile.crime * 0.28 +
    profile.unemployment * 0.22 +
    profile.malanthir * 0.18 +
    profile.refugees * 0.12 +
    (100 - profile.guard) * 0.12 +
    (100 - profile.economy) * 0.08;
  return clampScore(raw);
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
function pointFrom(label: string, profile: SimProfile): AnalyticsPoint {
  return {
    label,
    crime: profile.crime,
    vattrak: profile.vattrak,
    malanthir: profile.malanthir,
    guard: profile.guard,
    refugees: profile.refugees,
    economy: profile.economy,
    unemployment: profile.unemployment,
  };
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
    const buckets = new Map<string, SimProfile[]>();
    for (const day of windowDays) {
      const date = new Date(day);
      const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
      const list = buckets.get(key) ?? [];
      list.push(scopeProfile(rememberBundle(day), scopeId));
      buckets.set(key, list);
    }
    return [...buckets.entries()].map(([key, profiles]) => {
      const month = Number(key.split("-")[1]);
      return pointFrom(MONTHS_SHORT[month] ?? key, averageProfiles(profiles));
    });
  }

  const plotted = range === "day" ? eachDay(anchor - 13 * DAY_MS, anchor) : windowDays;
  return plotted.map((day) => pointFrom(shortDay(day), scopeProfile(rememberBundle(day), scopeId)));
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
  return AURENFURT_HISTORY.flatMap((event) => {
    let peak = 0;
    for (const day of days) peak = Math.max(peak, eventWeight(event, day));
    if (peak < 0.2) return [];
    if (scopeId && !event.impact[scopeId]) return [];
    return [{ id: event.id, title: event.title, summary: event.summary, weight: peak }];
  }).sort((a, b) => b.weight - a.weight);
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

  const moves = SIM_METERS.flatMap((meter) => {
    const delta = input.deltas[meter.key];
    if (delta == null || delta === 0) return [];
    return [{ key: meter.key, delta, label: meter.label }];
  }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const lead = moves[0];
  if (lead && input.previous) {
    const good = HIGHER_IS_WORSE.has(lead.key) ? lead.delta < 0 : lead.delta > 0;
    insights.push({
      id: "move",
      title: good ? "Bewegung zugunsten der Stadt" : "Bewegung zu Lasten der Stadt",
      tone: good ? "up" : "down",
      text: `${lead.label} von ${input.scopeLabel} liegt im Fenster bei ${input.average[lead.key]} und hat sich gegenüber ${compare} um ${signed(lead.delta)} verändert.`,
    });
  } else {
    insights.push({
      id: "move",
      title: "Stand ohne Vergleich",
      tone: "neutral",
      text: `Für ${input.scopeLabel} fehlt ein gleich langer Zeitraum davor. Der Wirtschaftsindex steht bei ${input.average.economy}, die Kriminalität bei ${input.average.crime}.`,
    });
  }

  const byEconomy = [...input.districts].sort((a, b) => b.average.economy - a.average.economy);
  const byCrime = [...input.districts].sort((a, b) => b.average.crime - a.average.crime);
  const byGuard = [...input.districts].sort((a, b) => b.average.guard - a.average.guard);
  const richest = byEconomy[0];
  const poorest = byEconomy[byEconomy.length - 1];
  const crimeLead = byCrime[0];
  const guardLead = byGuard[0];
  if (richest && poorest && crimeLead && guardLead) {
    const gap = input.average.crime - input.average.guard;
    const balance =
      gap >= 8
        ? ` In ${input.scopeLabel} liegt die Kriminalität ${gap} Punkte über der Garde.`
        : input.average.guard - input.average.crime >= 12
          ? ` Die Garde von ${input.scopeLabel} liegt ${input.average.guard - input.average.crime} Punkte über der Kriminalität.`
          : "";
    insights.push({
      id: "districts",
      title: gap >= 8 ? "Sicherheitsdefizit" : "Viertel im Vergleich",
      tone: gap >= 8 ? "alert" : "neutral",
      text: `${richest.name} führt die Wirtschaft mit ${richest.average.economy}, ${poorest.name} liegt bei ${poorest.average.economy}. ${crimeLead.name} hat die höchste Kriminalität (${crimeLead.average.crime}), ${guardLead.name} die stärkste Garde (${guardLead.average.guard}).${balance}`,
    });
  }

  const harsh = input.weather.filter((share) => share.kind === "rain" || share.kind === "storm" || share.kind === "snow" || share.kind === "frost");
  const harshDays = harsh.reduce((sum, share) => sum + share.days, 0);
  const dominant = input.weather[0];
  const driver = input.events[0];
  if (dominant && input.dayCount > 1) {
    const weatherText = harshDays
      ? `An ${harshDays} von ${input.dayCount} Tagen war das Wetter hart, am häufigsten ${dominant.label.toLowerCase()}. Das sitzt in der Simulation auf Versorgung, Wirtschaft und Kriminalität.`
      : `Das Wetter ist überwiegend ${dominant.label.toLowerCase()} (${dominant.days} von ${input.dayCount} Tagen) und drückt die Reihe kaum.`;
    insights.push({
      id: "drivers",
      title: driver ? driver.title : "Wetter als Treiber",
      tone: harshDays > input.dayCount * 0.35 ? "down" : "neutral",
      text: driver ? `${weatherText} Dazu wirkt „${driver.title}“: ${driver.summary}` : weatherText,
    });
  } else if (dominant) {
    insights.push({
      id: "drivers",
      title: "Wetter des Tages",
      tone: "neutral",
      text: driver
        ? `Der Tag ist ${dominant.label.toLowerCase()}. „${driver.title}“ liegt auf der Stadt: ${driver.summary}`
        : `Der Tag ist ${dominant.label.toLowerCase()}. Kein Geschichtsereignis liegt stark genug auf diesem Fenster, die Lage kommt aus Vierteln, Versorgung und Wetter.`,
    });
  }

  const faction = input.factions[0];
  const cell = input.cells[0];
  if (faction) {
    const law = faction.legality >= 0 ? `Legalität ${faction.legality}` : `Legalität ${faction.legality}, also im Schatten`;
    insights.push({
      id: "power",
      title: "Macht und Untergrund",
      tone: faction.legality < 0 ? "alert" : "neutral",
      text: `${faction.name} ist die stärkste Fraktion (Macht ${faction.power}, ${law}, Wirtschaft ${faction.economicImpact}).${
        cell ? ` Die lauteste Zelle ist ${cell.name} mit Stärke ${cell.strength}.` : ""
      }`,
    });
  }

  return insights.slice(0, 4);
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
    }))
    .sort((a, b) => b.power - a.power);

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
