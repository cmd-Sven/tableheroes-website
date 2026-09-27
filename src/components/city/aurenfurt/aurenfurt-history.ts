import { AURENFURT_DISTRICTS, type CityDistrictId } from "./aurenfurt-districts";
import { meanSim, type SimProfile, type UndergroundCell } from "./aurenfurt-sim";

/** Stand der Viertel-Profile. Laufende Ereignisse bleiben ab ihrem Plateau wirksam. */
export const HISTORY_ANCHOR = "2026-09-26";
export const HISTORY_START = "2023-09-26";
const DAY_MS = 86_400_000;

const METRIC_KEYS = ["crime", "vattrak", "malanthir", "guard", "refugees", "economy", "unemployment"] as const;
type MetricKey = (typeof METRIC_KEYS)[number];

type CellDelta = { name: string; delta: number };
type DistrictImpact = Partial<Record<MetricKey, number>> & { cells?: CellDelta[] };

export type HistoryEvent = {
  id: string;
  title: string;
  summary: string;
  start: string;
  /** Leer: nach dem Anstieg dauerhaft wirksam. */
  end: string | null;
  /** Abweichung vom heutigen Ruhewert auf dem Plateau des Ereignisses. */
  impact: Partial<Record<CityDistrictId, DistrictImpact>>;
};

/**
 * Die Viertel-Profile in `aurenfurt-districts` sind der Stand von HISTORY_ANCHOR.
 * Ein vergangener Tag ist dieser Stand plus die Differenz der damals und heute wirksamen Ereignisse.
 */
export const AURENFURT_HISTORY: HistoryEvent[] = [
  {
    id: "fluechtlinge",
    title: "Flüchtlingsstrom",
    summary: "Vertriebene drücken durch das Südtor in die roten Dächer. Die Höfe schließen die Gitter.",
    start: "2023-10-15",
    end: "2024-04-30",
    impact: {
      unterstadt: { refugees: 10, crime: 8, economy: -10, vattrak: -6, unemployment: 12, cells: [{ name: "Flüstern der Roten Gassen", delta: 8 }] },
      suedtor: { refugees: 16, crime: 6, economy: -6, guard: -4, unemployment: 10 },
      handwerkerviertel: { refugees: 8, economy: -4, unemployment: 6 },
      tempelbezirk: { refugees: 6, vattrak: -3, unemployment: 5 },
      adelsviertel: { refugees: 3, guard: 4, unemployment: 2 },
      palast: { refugees: 2, guard: 4, unemployment: 1 },
    },
  },
  {
    id: "winter",
    title: "Harter Winter",
    summary: "Schnee schließt Gassen und Essen. Vorräte werden Portionen.",
    start: "2023-12-01",
    end: "2024-03-20",
    impact: {
      unterstadt: { economy: -16, crime: 10, vattrak: -8, unemployment: 10 },
      suedtor: { economy: -12, crime: 6, vattrak: -6, unemployment: 8 },
      handwerkerviertel: { economy: -14, vattrak: -6, unemployment: 8 },
      tempelbezirk: { economy: -8, vattrak: -4, unemployment: 6 },
      adelsviertel: { economy: -6, vattrak: -3, unemployment: 3 },
      palast: { economy: -4, vattrak: -2, unemployment: 2 },
    },
  },
  {
    id: "hunger",
    title: "Hungersnot",
    summary: "Die Speicher reichen nicht. Brot wird zur Währung, und die Keller werden lauter.",
    start: "2024-01-20",
    end: "2024-05-15",
    impact: {
      unterstadt: { economy: -20, crime: 12, malanthir: 10, vattrak: -8, unemployment: 16, cells: [{ name: "Malanthir-Zellen", delta: 12 }] },
      suedtor: { economy: -12, crime: 8, unemployment: 12 },
      handwerkerviertel: { economy: -10, crime: 4, unemployment: 10 },
      tempelbezirk: { economy: -6, vattrak: -4, refugees: 4, unemployment: 8 },
      adelsviertel: { economy: -4, unemployment: 4 },
      palast: { economy: -3, malanthir: 2, unemployment: 3 },
    },
  },
  {
    id: "aufstand",
    title: "Drohender Aufstand",
    summary: "Auf den Märkten wird nicht mehr nur gefeilscht. Die Garde zählt Köpfe statt Krüge.",
    start: "2024-02-15",
    end: "2024-04-20",
    impact: {
      unterstadt: { crime: 14, malanthir: 8, guard: -4, unemployment: 6, cells: [{ name: "Flüstern der Roten Gassen", delta: 10 }] },
      suedtor: { crime: 8, guard: 4, unemployment: 4 },
      handwerkerviertel: { crime: 6, unemployment: 4, cells: [{ name: "Zunftkeller", delta: 6 }] },
      palast: { guard: 8, malanthir: 3 },
      adelsviertel: { guard: 6, crime: 2, unemployment: 2 },
    },
  },
  {
    id: "sperre",
    title: "Kaiserliche Ausgangssperren",
    summary: "Nach der Dämmerung gehören die Gassen der Garde. Handel wird zur Genehmigung.",
    start: "2024-02-25",
    end: "2024-06-10",
    impact: {
      unterstadt: { guard: 16, crime: -6, economy: -8, vattrak: -4 },
      suedtor: { guard: 12, crime: -4, economy: -8 },
      handwerkerviertel: { guard: 8, economy: -6 },
      tempelbezirk: { guard: 6, vattrak: -3 },
      adelsviertel: { guard: 8, economy: -3 },
      palast: { guard: 6, vattrak: 2 },
    },
  },
  {
    id: "elfenweg",
    title: "Elfen-Handelsweg",
    summary: "Der neue Weg aus dem Süden füllt Speicher und Kassen, bevor irgendwer den Preis kennt.",
    start: "2024-04-10",
    end: "2024-11-01",
    impact: {
      suedtor: { economy: 20, vattrak: 10, refugees: -8, crime: -4, cells: [{ name: "Löwentor-Schmuggler", delta: -8 }] },
      handwerkerviertel: { economy: 12, vattrak: 5 },
      unterstadt: { economy: 8, refugees: -4, vattrak: 4 },
      adelsviertel: { economy: 6 },
      palast: { economy: 4, vattrak: 3 },
      tempelbezirk: { vattrak: 3 },
    },
  },
  {
    id: "zwang",
    title: "Grenz-Zwangsverpflichtungen",
    summary: "Die Grenze zieht Lehrlinge und Träger. Werkbänke stehen leer, die Listen der Garde nicht.",
    start: "2024-10-01",
    end: "2025-03-01",
    impact: {
      suedtor: { guard: 8, economy: -8, refugees: 6, unemployment: 8 },
      unterstadt: { crime: 6, economy: -6, refugees: 4, unemployment: 10 },
      handwerkerviertel: { economy: -10, guard: 4, unemployment: 12, cells: [{ name: "Zunftkeller", delta: 8 }] },
      adelsviertel: { guard: 4, unemployment: 2 },
      palast: { guard: 6, unemployment: 1 },
      tempelbezirk: { refugees: 3, unemployment: 4 },
    },
  },
  {
    id: "pakt",
    title: "Pakt mit Elfen und Zwergen",
    summary: "Süden liefert über die Elfen, Norden über die Zwerge am Nordtor. Der Hof nennt es Frieden.",
    start: "2024-11-20",
    end: "2025-03-01",
    impact: {
      suedtor: { economy: 14, vattrak: 6 },
      adelsviertel: { economy: 12, vattrak: 6, cells: [{ name: "Salons der Häuser", delta: 6 }] },
      handwerkerviertel: { economy: 8 },
      palast: { vattrak: 4, economy: 3 },
      tempelbezirk: { vattrak: 2 },
    },
  },
  {
    id: "ueberfall",
    title: "Überfall auf das Elfenland",
    summary: "Der elfische Handelsweg reißt ab. Neue Flüchtlinge kommen denselben Weg zurück, den das Korn nahm.",
    start: "2025-03-01",
    end: "2025-09-01",
    impact: {
      suedtor: { economy: -16, refugees: 14, vattrak: -8, crime: 6, unemployment: 14, cells: [{ name: "Löwentor-Schmuggler", delta: 12 }] },
      unterstadt: { refugees: 10, crime: 8, malanthir: 6, economy: -6, unemployment: 12, cells: [{ name: "Malanthir-Zellen", delta: 8 }] },
      handwerkerviertel: { economy: -10, unemployment: 10 },
      tempelbezirk: { refugees: 6, vattrak: -4, unemployment: 6 },
      palast: { vattrak: -5, malanthir: 4, unemployment: 3 },
      adelsviertel: { economy: -4, vattrak: -3, unemployment: 4 },
    },
  },
  {
    id: "brand",
    title: "Vereitelter Brandanschlag",
    summary: "Agenten wollen die Essen an der Südostmauer legen. Die Garde kommt vorher, das Gerücht danach.",
    start: "2025-05-12",
    end: "2025-06-20",
    impact: {
      handwerkerviertel: { crime: 16, malanthir: 8, economy: -6, guard: 10, cells: [{ name: "Zunftkeller", delta: 8 }] },
      suedtor: { crime: 6, guard: 6 },
      palast: { guard: 8, malanthir: 5 },
      unterstadt: { crime: 4, malanthir: 3 },
    },
  },
  {
    id: "konfession",
    title: "Konfessionsstreit",
    summary: "Der Bund der Silbernen Rose (Elysia) und das Konklave der Ewigen Ordnung (Chromus) beanspruchen dieselben Höfe. Hoffnung gegen gezähltes Schicksal.",
    start: "2025-10-01",
    end: null,
    impact: {
      tempelbezirk: {
        malanthir: 12,
        vattrak: -8,
        crime: 4,
        cells: [
          { name: "Goldene Liturgie", delta: 12 },
          { name: "Silberne Rose gegen das Konklave", delta: 44 },
        ],
      },
      palast: { malanthir: 4, vattrak: -3 },
      adelsviertel: { malanthir: 2, cells: [{ name: "Salons der Häuser", delta: 8 }] },
      unterstadt: { malanthir: 4 },
      suedtor: { crime: 2 },
    },
  },
  {
    id: "rueckkehrer",
    title: "Rückkehrer von der Front",
    summary: "Entlassene und Versehrte kommen durchs Löwentor. Manche finden ein Dach, manche nur einen Keller.",
    start: "2025-11-01",
    end: "2026-06-01",
    impact: {
      suedtor: { refugees: 14, crime: 6, guard: -4, unemployment: 12 },
      unterstadt: { refugees: 8, crime: 8, economy: -4, unemployment: 10 },
      handwerkerviertel: { refugees: 6, economy: -3, unemployment: 6 },
      tempelbezirk: { refugees: 4, unemployment: 4 },
      adelsviertel: { refugees: 2, unemployment: 2 },
    },
  },
  {
    id: "wachen",
    title: "Wachen-Aufbau",
    summary: "Der Hof verdoppelt Posten. Unter den Kuppeln steht die Garde dicht, in der Unterstadt immer noch zu dünn.",
    start: "2026-01-15",
    end: null,
    impact: {
      palast: { guard: 18, crime: -3 },
      adelsviertel: { guard: 14, crime: -2 },
      suedtor: { guard: 16, crime: -4 },
      tempelbezirk: { guard: 12 },
      handwerkerviertel: { guard: 10, crime: -3 },
      unterstadt: { guard: 8, crime: -2 },
    },
  },
  {
    id: "arbeitszucht",
    title: "Arbeitszuweisung & Reparaturdienst",
    summary:
      "Müßige werden an Mauern, Schreibstuben und Wache gebunden — in der Stadt und an der Front. Zwangszuteilung, keine Gnade; die Gassen leeren sich trotzdem nicht.",
    start: "2025-06-01",
    end: null,
    impact: {
      unterstadt: { unemployment: -18, guard: 6, economy: 4 },
      suedtor: { unemployment: -12, guard: 8, economy: 3 },
      handwerkerviertel: { unemployment: -10, guard: 5, economy: 5 },
      tempelbezirk: { unemployment: -8, guard: 4, economy: 2 },
      adelsviertel: { unemployment: -6, guard: 4, economy: 2 },
      palast: { unemployment: -8, guard: 5, economy: 2 },
    },
  },
  {
    id: "zoelle",
    title: "Zölle und Preise",
    summary: "Der Zoll am Löwentor steigt, und mit ihm Brot, Erz und Wut. Schmuggel lohnt sich wieder.",
    start: "2026-02-01",
    end: null,
    impact: {
      unterstadt: { economy: -16, crime: 6, cells: [{ name: "Flüstern der Roten Gassen", delta: 6 }] },
      handwerkerviertel: { economy: -12 },
      suedtor: { economy: -4, crime: 5, cells: [{ name: "Löwentor-Schmuggler", delta: 10 }] },
      adelsviertel: { economy: -4 },
      tempelbezirk: { economy: -3 },
      palast: { economy: -2 },
    },
  },
];

export function parseDay(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function formatDay(utc: number) {
  const date = new Date(utc);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}-${day}`;
}

export function utcToday(now = new Date()) {
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function smooth(value: number) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

/** 0 außerhalb, 1 auf dem Plateau, weicher Rand an beiden Enden. */
export function eventWeight(event: HistoryEvent, day: number) {
  const start = parseDay(event.start);
  if (day < start) return 0;
  if (!event.end) {
    const rise = 21 * DAY_MS;
    if (day >= start + rise) return 1;
    return smooth((day - start) / rise);
  }
  const end = parseDay(event.end);
  if (day > end) return 0;
  const span = Math.max(1, end - start);
  const u = (day - start) / span;
  const edge = 0.12;
  if (u < edge) return smooth(u / edge);
  if (u > 1 - edge) return smooth((1 - u) / edge);
  return 1;
}

function wobble(districtId: string, day: number, key: string) {
  let hash = 2166136261;
  const text = `${districtId}|${day}|${key}`;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) / 4294967295 - 0.5) * 2.4;
}

function restOf(districtId: CityDistrictId): SimProfile {
  const district = AURENFURT_DISTRICTS.find((entry) => entry.id === districtId);
  if (!district) {
    return { crime: 0, vattrak: 0, malanthir: 0, guard: 0, refugees: 0, economy: 0, unemployment: 0, underground: [] };
  }
  return district.sim;
}

export function districtMetricsOn(districtId: CityDistrictId, day = utcToday()): SimProfile {
  const anchor = parseDay(HISTORY_ANCHOR);
  const rest = restOf(districtId);
  const values: Record<MetricKey, number> = {
    crime: rest.crime,
    vattrak: rest.vattrak,
    malanthir: rest.malanthir,
    guard: rest.guard,
    refugees: rest.refugees,
    economy: rest.economy,
    unemployment: rest.unemployment,
  };
  const cells = new Map(rest.underground.map((cell) => [cell.name, cell.strength]));

  for (const event of AURENFURT_HISTORY) {
    const deltaWeight = eventWeight(event, day) - eventWeight(event, anchor);
    if (!deltaWeight) continue;
    const impact = event.impact[districtId];
    if (!impact) continue;
    for (const key of METRIC_KEYS) {
      values[key] += (impact[key] ?? 0) * deltaWeight;
    }
    for (const cell of impact.cells ?? []) {
      cells.set(cell.name, (cells.get(cell.name) ?? 0) + cell.delta * deltaWeight);
    }
  }

  const underground: UndergroundCell[] = [...cells.entries()].flatMap(([name, strength]) => {
    if (strength < 1) return [];
    return [{ name, strength: clamp(strength + wobble(districtId, day, name)) }];
  });

  return {
    crime: clamp(values.crime + wobble(districtId, day, "crime")),
    vattrak: clamp(values.vattrak + wobble(districtId, day, "vattrak")),
    malanthir: clamp(values.malanthir + wobble(districtId, day, "malanthir")),
    guard: clamp(values.guard + wobble(districtId, day, "guard")),
    refugees: clamp(values.refugees + wobble(districtId, day, "refugees")),
    economy: clamp(values.economy + wobble(districtId, day, "economy")),
    unemployment: clamp(values.unemployment + wobble(districtId, day, "unemployment")),
    underground,
  };
}

export function cityMetricsOn(day = utcToday()) {
  return meanSim(AURENFURT_DISTRICTS.map((district) => districtMetricsOn(district.id, day)));
}

export type DistrictDay = SimProfile & { day: string };

export function districtSeries(districtId: CityDistrictId, from = parseDay(HISTORY_START), to = utcToday()): DistrictDay[] {
  const start = Math.max(from, parseDay(HISTORY_START));
  const end = Math.min(to, utcToday());
  const points: DistrictDay[] = [];
  for (let day = start; day <= end; day += DAY_MS) {
    points.push({ day: formatDay(day), ...districtMetricsOn(districtId, day) });
  }
  return points;
}

export type ActiveInfluence = { id: string; title: string; summary: string };

export function influencesOn(districtId: CityDistrictId | null, day = utcToday()): ActiveInfluence[] {
  return AURENFURT_HISTORY.filter((event) => {
    if (eventWeight(event, day) < 0.2) return false;
    if (!districtId) return true;
    return Boolean(event.impact[districtId]);
  }).map((event) => ({ id: event.id, title: event.title, summary: event.summary }));
}
