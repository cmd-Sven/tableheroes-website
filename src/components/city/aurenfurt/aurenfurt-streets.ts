import { AURENFURT_DISTRICTS, type CityDistrictId } from "./aurenfurt-districts";
import {
  clampUvPoint,
  pointInPolygon,
  type DistrictPolygons,
  type UvPoint,
} from "./aurenfurt-district-polygons";
import { formatDay, parseDay, utcToday } from "./aurenfurt-history";
import type { DayWeather, WeatherKind } from "./aurenfurt-weather";

export const STREETS_STORAGE_KEY = "aurenfurt-streets-v1";
/** Hauptansicht: Straßen-Sichtbarkeit für Spielleiter (getrennt vom Spieler). */
export const STREETS_VISIBLE_GM_KEY = "aurenfurt-streets-visible-gm";
/** Hauptansicht: Straßen-Sichtbarkeit für Spieler (getrennt vom SL). */
export const STREETS_VISIBLE_PLAYER_KEY = "aurenfurt-streets-visible-player";
const STORAGE_VERSION = 1;
const DAY_MS = 86_400_000;

/** Baumaßnahme / Sperrzustand — genau eine Variante. */
export type StreetWorks =
  | { kind: "none" }
  | { kind: "full_closure"; closureDays: number; closureStart: string }
  | {
      kind: "full_closure_detour";
      closureDays: number;
      closureStart: string;
      /** Offizielle Umgehungsstraße (andere Street-Id). */
      detourStreetId?: string;
      /** Kurze Umgehungs-Polyline, falls keine Street-Id. */
      detourPoints?: UvPoint[];
    }
  | { kind: "partial" }
  | { kind: "works" };

/** Wichtigkeit der Straße — steuert Farbe/Muster und Verbindungsregeln. */
export type StreetCategory = "main" | "side" | "alley";

export type StreetLinePattern = "solid" | "dashed" | "dotted";

export const STREET_WIDTH_MIN = 1;
export const STREET_WIDTH_MAX = 12;

export const STREET_CATEGORY_META: Record<
  StreetCategory,
  { label: string; color: string; defaultWidth: number; pattern: StreetLinePattern }
> = {
  main: { label: "Hauptstraße", color: "#3b82f6", defaultWidth: 6, pattern: "solid" },
  side: { label: "Nebenstraße", color: "#f97316", defaultWidth: 4, pattern: "dashed" },
  alley: { label: "Seitengasse", color: "#eab308", defaultWidth: 2, pattern: "dotted" },
};

export type AurenfurtStreet = {
  id: string;
  name: string;
  /**
   * Freitext für Lage, Höhen, Aufgänge, Kontrollen u. Ä. —
   * gedacht als Kontext für eine spätere KI (kein Live-API-Call).
   */
  description: string;
  /** Polyline in derselben UV-Fläche wie die Viertel-Polygone. */
  points: UvPoint[];
  /** Sektoren, die die Linie schneidet (automatisch ermittelt). */
  districtIds: CityDistrictId[];
  /** Kategorie (Migration: fehlend → main). */
  category: StreetCategory;
  /** Linienbreite 1–12 (Migration: Default der Kategorie). */
  width: number;
  /** Ids anderer Straßen, mit denen diese verbunden ist. */
  connectsTo: string[];
  works: StreetWorks;
  /** 0–100: hoch = strengere Wachen. */
  security: number;
  /** 0–100: wirkt auf Begegnungen. */
  crime: number;
  /** 0–100: Basis-Straßenzustand (hoch = gut). */
  condition: number;
  /** 0–100: Verkehrsdichte. */
  traffic: number;
};

export type StreetPassability =
  | "closed"
  | "detour_only"
  | "partial"
  | "works_slow"
  | "weather_poor"
  | "good";

export type EffectiveStreet = {
  street: AurenfurtStreet;
  /** Effektiver Zustand nach Wetter (Basis bleibt gespeichert). */
  effectiveCondition: number;
  /** Wetterbedingter Abzug von `condition` (0…). */
  weatherPenalty: number;
  passability: StreetPassability;
  passabilityLabel: string;
  /** Closure-Fenster aktiv am betrachteten Tag. */
  closureActive: boolean;
  /** Baumaßnahme abgelaufen (Sperrfenster vorbei). */
  worksExpired: boolean;
  /** Kurzer deutscher Ereignissatz, deterministisch pro Tag. */
  eventText: string | null;
};

const PASSABILITY_LABEL: Record<StreetPassability, string> = {
  closed: "Gesperrt",
  detour_only: "Nur Umgehung",
  partial: "Teils passierbar",
  works_slow: "Bauverlangsamt",
  weather_poor: "Witterungsbedingt schlecht",
  good: "Gut passierbar",
};

/** Gestaffelte, deterministische Abzüge auf den Straßenzustand. */
export const WEATHER_CONDITION_PENALTY: Record<WeatherKind, number> = {
  clear: 0,
  cloudy: 2,
  fog: 6,
  heat: 4,
  rain: 12,
  frost: 18,
  snow: 22,
  storm: 28,
};

/** Extra-Abzug ab intensity ≥ 70 (Dauerregen / harter Sturm). */
export const WEATHER_HIGH_INTENSITY_EXTRA = 8;
const HIGH_INTENSITY_THRESHOLD = 70;

function unitHash(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function isStreetCategory(value: unknown): value is StreetCategory {
  return value === "main" || value === "side" || value === "alley";
}

export function clampStreetWidth(value: number, category: StreetCategory = "main"): number {
  if (!Number.isFinite(value)) return STREET_CATEGORY_META[category].defaultWidth;
  return Math.min(STREET_WIDTH_MAX, Math.max(STREET_WIDTH_MIN, Math.round(value)));
}

export function streetCategoryLabel(category: StreetCategory): string {
  return STREET_CATEGORY_META[category].label;
}

export function streetCategoryColor(category: StreetCategory): string {
  return STREET_CATEGORY_META[category].color;
}

/**
 * Verbindungsregeln (Hierarchie):
 * - Nebenstraße → mind. eine Hauptstraße
 * - Seitengasse → mind. eine Nebenstraße oder Hauptstraße
 * - Hauptstraße darf ohne Verbindung existieren
 * @returns deutscher Fehlertext oder `null` wenn gültig
 */
export function validateStreetConnections(
  street: Pick<AurenfurtStreet, "category" | "connectsTo">,
  allStreets: AurenfurtStreet[],
): string | null {
  if (street.category === "main") return null;

  const byId = new Map(allStreets.map((entry) => [entry.id, entry]));
  const linked = street.connectsTo
    .map((id) => byId.get(id))
    .filter((entry): entry is AurenfurtStreet => Boolean(entry));

  if (street.category === "side") {
    const hasMain = linked.some((entry) => entry.category === "main");
    if (!hasMain) {
      return "Eine Nebenstraße muss mit mindestens einer Hauptstraße verbunden sein.";
    }
    return null;
  }

  if (street.category === "alley") {
    const hasUpper = linked.some((entry) => entry.category === "side" || entry.category === "main");
    if (!hasUpper) {
      return "Eine Seitengasse muss mit mindestens einer Nebenstraße oder Hauptstraße verbunden sein.";
    }
    return null;
  }

  return null;
}

/** Andere Straßen, die mindestens ein Viertel teilen — sonst alle übrigen. */
export function candidateConnectStreets(
  street: Pick<AurenfurtStreet, "id" | "districtIds">,
  allStreets: AurenfurtStreet[],
): AurenfurtStreet[] {
  const others = allStreets.filter((entry) => entry.id !== street.id);
  if (others.length === 0) return [];
  if (street.districtIds.length === 0) return others;
  const districtSet = new Set(street.districtIds);
  const overlapping = others.filter((entry) => entry.districtIds.some((id) => districtSet.has(id)));
  return overlapping.length > 0 ? overlapping : others;
}

function isUvPoint(value: unknown): value is UvPoint {
  if (!value || typeof value !== "object") return false;
  const point = value as UvPoint;
  return (
    typeof point.u === "number" &&
    typeof point.v === "number" &&
    Number.isFinite(point.u) &&
    Number.isFinite(point.v)
  );
}

function isDistrictId(value: unknown): value is CityDistrictId {
  return typeof value === "string" && AURENFURT_DISTRICTS.some((d) => d.id === value);
}

export function weatherConditionPenalty(weather: DayWeather): number {
  const base = WEATHER_CONDITION_PENALTY[weather.kind] ?? 0;
  const wetKinds: WeatherKind[] = ["rain", "storm", "snow", "frost"];
  const intensityExtra =
    wetKinds.includes(weather.kind) && weather.intensity >= HIGH_INTENSITY_THRESHOLD
      ? WEATHER_HIGH_INTENSITY_EXTRA
      : 0;
  return base + intensityExtra;
}

export function isClosureActiveOnDay(works: StreetWorks, viewedDay: string): boolean {
  if (works.kind !== "full_closure" && works.kind !== "full_closure_detour") return false;
  const start = parseDay(works.closureStart);
  const end = start + works.closureDays * DAY_MS;
  const day = parseDay(viewedDay);
  return day >= start && day < end;
}

export function isWorksExpired(works: StreetWorks, viewedDay: string): boolean {
  if (works.kind !== "full_closure" && works.kind !== "full_closure_detour") return false;
  if (works.closureDays <= 0) return true;
  const end = parseDay(works.closureStart) + works.closureDays * DAY_MS;
  return parseDay(viewedDay) >= end;
}

/**
 * Samples Punkte entlang der Polyline und sammelt alle Viertel, die getroffen werden.
 */
export function districtsIntersectingPolyline(
  points: UvPoint[],
  polygons: DistrictPolygons,
  samplesPerSegment = 8,
): CityDistrictId[] {
  if (points.length === 0) return [];
  const found = new Set<CityDistrictId>();
  const samples: UvPoint[] = [points[0]];

  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    for (let s = 1; s <= samplesPerSegment; s += 1) {
      const t = s / samplesPerSegment;
      samples.push({
        u: a.u + (b.u - a.u) * t,
        v: a.v + (b.v - a.v) * t,
      });
    }
  }

  for (const sample of samples) {
    for (const district of AURENFURT_DISTRICTS) {
      const poly = polygons[district.id]?.points;
      if (!poly || poly.length < 3) continue;
      if (pointInPolygon(sample, poly)) found.add(district.id);
    }
  }

  return AURENFURT_DISTRICTS.map((d) => d.id).filter((id) => found.has(id));
}

function streetEventText(
  street: AurenfurtStreet,
  viewedDay: string,
  effectiveCondition: number,
  passability: StreetPassability,
  weather: DayWeather,
): string | null {
  const roll = unitHash(`street-evt|${street.id}|${viewedDay}|${passability}|${effectiveCondition}`);
  if (roll < 0.42) return null;

  if (passability === "closed") {
    return roll > 0.7
      ? "Absperrung bewacht — Fußgänger werden umgeleitet."
      : "Kontrollposten an der Sperre; Umweg empfohlen.";
  }
  if (passability === "detour_only") {
    return "Offizielle Umleitung ausgeschildert; Hauptweg gesperrt.";
  }
  if (passability === "works_slow") {
    return "Bauarbeiter und Gerüste verengen die Spur.";
  }
  if (passability === "partial") {
    return "Eine Fahrbahn gesperrt; Gegenverkehr staut sich.";
  }

  if (weather.kind === "frost" || weather.kind === "snow") {
    if (roll > 0.55) return "Glätte auf dem Pflaster — Vorsicht beim Reiten.";
  }
  if (weather.kind === "rain" || weather.kind === "storm") {
    if (roll > 0.6) return "Pfützen und Schlamm erschweren den Weg.";
  }

  const threat = street.crime - street.security * 0.55 + (100 - effectiveCondition) * 0.15;
  const threatRoll = unitHash(`street-threat|${street.id}|${viewedDay}`);
  if (threat > 35 && threatRoll > 0.55) {
    return threat > 55
      ? "Gerücht von einem Überfall in einer Seitengasse."
      : "Verdächtige Gestalten mustern Vorbeigehende.";
  }
  if (street.security > 65 && roll > 0.62) {
    return "Stadtwache kontrolliert Pässe und Waren.";
  }
  if (street.traffic > 70 && roll > 0.58) {
    return "Dichter Verkehr — Karren und Fußvolk blockieren die Spur.";
  }
  if (effectiveCondition < 40 && roll > 0.5) {
    return "Schlaglöcher und brüchiges Pflaster verlangsamen jeden Schritt.";
  }
  return null;
}

function resolvePassability(
  street: AurenfurtStreet,
  viewedDay: string,
  effectiveCondition: number,
): { passability: StreetPassability; closureActive: boolean; worksExpired: boolean } {
  const { works } = street;
  const closureActive = isClosureActiveOnDay(works, viewedDay);
  const worksExpired = isWorksExpired(works, viewedDay);

  if (closureActive) {
    if (works.kind === "full_closure_detour") {
      return { passability: "detour_only", closureActive, worksExpired: false };
    }
    return { passability: "closed", closureActive, worksExpired: false };
  }

  // Abgelaufene Sperre zählt nicht mehr; partial/works bleiben bis manuell geändert.
  if (works.kind === "partial" && !worksExpired) {
    return { passability: "partial", closureActive: false, worksExpired: false };
  }
  if (works.kind === "works" && !worksExpired) {
    return { passability: "works_slow", closureActive: false, worksExpired: false };
  }

  if (effectiveCondition < 45) {
    return { passability: "weather_poor", closureActive: false, worksExpired };
  }
  return { passability: "good", closureActive: false, worksExpired };
}

/**
 * Effektive Straße am betrachteten Kalendertag.
 * Basis-Zustand bleibt gespeichert; Wetter senkt nur den effektiven Zustand.
 */
export function effectiveStreet(
  street: AurenfurtStreet,
  dayWeather: DayWeather,
  viewedDay: string,
): EffectiveStreet {
  const weatherPenalty = weatherConditionPenalty(dayWeather);
  const effectiveCondition = clampScore(street.condition - weatherPenalty);
  const { passability, closureActive, worksExpired } = resolvePassability(
    street,
    viewedDay,
    effectiveCondition,
  );
  const eventText = streetEventText(street, viewedDay, effectiveCondition, passability, dayWeather);

  return {
    street,
    effectiveCondition,
    weatherPenalty,
    passability,
    passabilityLabel: PASSABILITY_LABEL[passability],
    closureActive,
    worksExpired,
    eventText,
  };
}

export function passabilityColor(passability: StreetPassability): string {
  switch (passability) {
    case "good":
      return "#cab926";
    case "weather_poor":
      return "#379806";
    case "works_slow":
    case "partial":
      return "#f59e0b";
    case "detour_only":
    case "closed":
      return "#ef4444";
    default:
      return "#cab926";
  }
}

export function createStreetId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `street-${crypto.randomUUID()}`;
  }
  return `street-${Date.now().toString(36)}-${Math.floor(unitHash(String(Date.now())) * 1e6)}`;
}

export function defaultStreet(partial?: Partial<AurenfurtStreet>): AurenfurtStreet {
  const category: StreetCategory = isStreetCategory(partial?.category) ? partial.category : "main";
  const width =
    typeof partial?.width === "number"
      ? clampStreetWidth(partial.width, category)
      : STREET_CATEGORY_META[category].defaultWidth;
  const connectsTo = Array.isArray(partial?.connectsTo)
    ? partial.connectsTo.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];
  return {
    id: partial?.id ?? createStreetId(),
    name: partial?.name ?? "Neue Straße",
    description: typeof partial?.description === "string" ? partial.description : "",
    points: partial?.points?.map((p) => clampUvPoint(p)) ?? [],
    districtIds: partial?.districtIds ?? [],
    category,
    width,
    connectsTo,
    works: partial?.works ?? { kind: "none" },
    security: clampScore(partial?.security ?? 40),
    crime: clampScore(partial?.crime ?? 30),
    condition: clampScore(partial?.condition ?? 70),
    traffic: clampScore(partial?.traffic ?? 40),
  };
}

function parseWorks(raw: unknown): StreetWorks {
  if (!raw || typeof raw !== "object") return { kind: "none" };
  const row = raw as Record<string, unknown>;
  const kind = row.kind;
  if (kind === "none" || kind === "partial" || kind === "works") {
    return { kind };
  }
  if (kind === "full_closure") {
    const closureDays = typeof row.closureDays === "number" && row.closureDays > 0 ? Math.round(row.closureDays) : 1;
    const closureStart =
      typeof row.closureStart === "string" && /^\d{4}-\d{2}-\d{2}$/.test(row.closureStart)
        ? row.closureStart
        : formatDay(utcToday());
    return { kind: "full_closure", closureDays, closureStart };
  }
  if (kind === "full_closure_detour") {
    const closureDays = typeof row.closureDays === "number" && row.closureDays > 0 ? Math.round(row.closureDays) : 1;
    const closureStart =
      typeof row.closureStart === "string" && /^\d{4}-\d{2}-\d{2}$/.test(row.closureStart)
        ? row.closureStart
        : formatDay(utcToday());
    const detourStreetId = typeof row.detourStreetId === "string" ? row.detourStreetId : undefined;
    const detourPoints = Array.isArray(row.detourPoints)
      ? row.detourPoints.filter(isUvPoint).map((p) => clampUvPoint(p))
      : undefined;
    return {
      kind: "full_closure_detour",
      closureDays,
      closureStart,
      detourStreetId,
      detourPoints: detourPoints && detourPoints.length >= 2 ? detourPoints : undefined,
    };
  }
  return { kind: "none" };
}

function parseStreet(raw: unknown): AurenfurtStreet | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== "string" || !row.id) return null;
  if (typeof row.name !== "string") return null;
  if (!Array.isArray(row.points) || row.points.length < 2 || !row.points.every(isUvPoint)) return null;
  const districtIds = Array.isArray(row.districtIds)
    ? (row.districtIds.filter(isDistrictId) as CityDistrictId[])
    : [];
  // Migration: fehlende Kategorie → Hauptstraße; fehlende Breite → Default der Kategorie.
  const category: StreetCategory = isStreetCategory(row.category) ? row.category : "main";
  const width =
    typeof row.width === "number"
      ? clampStreetWidth(row.width, category)
      : STREET_CATEGORY_META[category].defaultWidth;
  const connectsTo = Array.isArray(row.connectsTo)
    ? row.connectsTo.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];
  return {
    id: row.id,
    name: row.name.trim() || "Straße",
    // Fehlendes Feld beim Lesen → "".
    description: typeof row.description === "string" ? row.description : "",
    points: row.points.map((p) => clampUvPoint(p)),
    districtIds,
    category,
    width,
    connectsTo,
    works: parseWorks(row.works),
    security: clampScore(typeof row.security === "number" ? row.security : 40),
    crime: clampScore(typeof row.crime === "number" ? row.crime : 30),
    condition: clampScore(typeof row.condition === "number" ? row.condition : 70),
    traffic: clampScore(typeof row.traffic === "number" ? row.traffic : 40),
  };
}

export function parseStoredStreets(raw: string | null): AurenfurtStreet[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Record<string, unknown>;
    const list = Array.isArray(record.streets) ? record.streets : Array.isArray(parsed) ? parsed : null;
    if (!list) return null;
    const streets = list.map(parseStreet).filter((s): s is AurenfurtStreet => s !== null);
    return streets;
  } catch {
    return null;
  }
}

export function serializeStreets(streets: AurenfurtStreet[]): string {
  return JSON.stringify({ version: STORAGE_VERSION, streets });
}

export function syncStreetDistricts(
  street: AurenfurtStreet,
  polygons: DistrictPolygons,
): AurenfurtStreet {
  return {
    ...street,
    districtIds: districtsIntersectingPolyline(street.points, polygons),
  };
}

export function worksKindLabel(kind: StreetWorks["kind"]): string {
  switch (kind) {
    case "none":
      return "Normal";
    case "full_closure":
      return "Komplettsperrung";
    case "full_closure_detour":
      return "Sperrung mit Umgehung";
    case "partial":
      return "Teilsperrung";
    case "works":
      return "Bauarbeiten";
    default:
      return kind;
  }
}
