/**
 * Fest datierte Stadtgeschichte und wiederkehrende Feiertage.
 * Die Werte liegen als Kurve auf dem Tagesprofil, nicht als flaches Plateau.
 */

import { AURENFURT_DISTRICTS, type CityDistrictId } from "./aurenfurt-districts";
import { formatDay, parseDay } from "./aurenfurt-time";

const DAY = 86_400_000;

export type ChronicleMeter =
  | "crime"
  | "vattrak"
  | "malanthir"
  | "guard"
  | "refugees"
  | "economy"
  | "unemployment"
  | "tension";

export type ChronicleShift = Record<Exclude<ChronicleMeter, "tension">, number> & { tension: number };

type Where = Partial<Record<CityDistrictId, number>>;

type Shape =
  | { kind: "flat"; delta: number }
  | { kind: "linear"; delta: number }
  | { kind: "rapid"; delta: number }
  | { kind: "slow"; delta: number }
  | { kind: "glide"; from: number; to: number }
  | { kind: "weekly"; step: number; weeks: number }
  | { kind: "slow-hold"; delta: number; holdAfter: number };

type Effect = {
  meter: ChronicleMeter;
  shape: Shape;
  /** Fehlt die Angabe, trifft es jedes Viertel voll. */
  where?: Where;
};

type Segment = {
  start: string;
  end: string;
  effects: Effect[];
};

type Story = {
  id: string;
  title: string;
  summary: string;
  segments: Segment[];
};

const ZERO: ChronicleShift = {
  crime: 0,
  vattrak: 0,
  malanthir: 0,
  guard: 0,
  refugees: 0,
  economy: 0,
  unemployment: 0,
  tension: 0,
};

const CITY_STORIES: Story[] = [
  {
    id: "frostwelle-2026",
    title: "Die große Frostwelle",
    summary:
      "Die Bergpässe frieren zu. Der Vattrak-Zufluss aus den nördlichen Zwergenreichen stockt, und der Bedarf der Bürger steigt von Woche zu Woche.",
    segments: [
      {
        start: "2026-01-10",
        end: "2026-01-24",
        effects: [
          { meter: "vattrak", shape: { kind: "flat", delta: -20 } },
          { meter: "economy", shape: { kind: "flat", delta: -8 } },
        ],
      },
      {
        start: "2026-01-24",
        end: "2026-02-07",
        effects: [
          { meter: "vattrak", shape: { kind: "flat", delta: -30 } },
          { meter: "economy", shape: { kind: "flat", delta: -12 } },
        ],
      },
      {
        start: "2026-01-10",
        end: "2026-02-07",
        effects: [{ meter: "tension", shape: { kind: "weekly", step: 5, weeks: 4 } }],
      },
    ],
  },
  {
    id: "razzia-altstadt-2026",
    title: "Razzia in der Altstadt",
    summary:
      "Die Stadtwache greift in der Unterstadt durch. Die Kriminalität schnellt kurz hoch und sinkt dann, während Malanthir von Woche zu Woche weiter aus den Nestern quillt.",
    segments: [
      {
        start: "2026-02-15",
        end: "2026-02-20",
        effects: [{ meter: "crime", shape: { kind: "flat", delta: 10 }, where: { unterstadt: 1 } }],
      },
      {
        start: "2026-02-20",
        end: "2026-03-08",
        effects: [{ meter: "crime", shape: { kind: "glide", from: 10, to: -20 }, where: { unterstadt: 1 } }],
      },
      {
        start: "2026-02-15",
        end: "2026-03-08",
        effects: [
          { meter: "guard", shape: { kind: "rapid", delta: 18 }, where: { unterstadt: 1, suedtor: 0.45, handwerkerviertel: 0.35 } },
          { meter: "malanthir", shape: { kind: "weekly", step: 3, weeks: 3 }, where: { unterstadt: 1 } },
        ],
      },
    ],
  },
  {
    id: "schmugglerwelle-2026",
    title: "Malanthir-Schmugglerwelle am Südtor",
    summary:
      "Gestrecktes Malanthir-Pulver flutet die Gassen am Südtor. In der Unterstadt steigt die Kriminalität rapide, die Garde am Tor dünnt langsam aus.",
    segments: [
      {
        start: "2026-03-10",
        end: "2026-04-14",
        effects: [
          { meter: "malanthir", shape: { kind: "slow", delta: 25 }, where: { suedtor: 1, unterstadt: 0.4 } },
          { meter: "crime", shape: { kind: "rapid", delta: 20 }, where: { unterstadt: 1, suedtor: 0.35 } },
          { meter: "guard", shape: { kind: "slow", delta: -10 }, where: { suedtor: 1, unterstadt: 0.4 } },
        ],
      },
    ],
  },
  {
    id: "fruehlingsfest-2026",
    title: "Frühlingsfest der Zünfte",
    summary: "Jahrmarkt und Handwerksmesse. Die Kassen klingeln, und Taschendiebe nutzen das Gedränge.",
    segments: [
      {
        start: "2026-04-15",
        end: "2026-04-29",
        effects: [
          { meter: "economy", shape: { kind: "rapid", delta: 17 } },
          { meter: "unemployment", shape: { kind: "flat", delta: -8 } },
          { meter: "crime", shape: { kind: "slow", delta: 5 } },
        ],
      },
    ],
  },
  {
    id: "tempelstreit-2026",
    title: "Streit im Tempelbezirk",
    summary:
      "Geistliche halten parallele Predigten. Der Vattrak im Tempelbezirk springt an, die Spannung wächst über die drei Wochen, die Kriminalität gibt nach.",
    segments: [
      {
        start: "2026-05-04",
        end: "2026-05-25",
        effects: [
          { meter: "vattrak", shape: { kind: "rapid", delta: 15 }, where: { tempelbezirk: 1 } },
          { meter: "tension", shape: { kind: "linear", delta: 18 }, where: { tempelbezirk: 1, adelsviertel: 0.35, palast: 0.25 } },
          { meter: "crime", shape: { kind: "flat", delta: -5 }, where: { tempelbezirk: 1 } },
        ],
      },
    ],
  },
  {
    id: "fluechtlingswelle-2026",
    title: "Flüchtlingswelle aus dem Westen",
    summary:
      "Menschen kommen über das Südtor, auf der Flucht vor dem Imperium von Xarvathar. Der Strom wächst drei Wochen und bleibt dann stehen.",
    segments: [
      {
        start: "2026-06-20",
        end: "2026-08-01",
        effects: [
          {
            meter: "refugees",
            shape: { kind: "slow-hold", delta: 30, holdAfter: 0.5 },
            where: { suedtor: 1, unterstadt: 0.85, handwerkerviertel: 0.55, tempelbezirk: 0.4, akademieviertel: 0.25, adelsviertel: 0.15, palast: 0.1 },
          },
          { meter: "unemployment", shape: { kind: "rapid", delta: 12 } },
          { meter: "economy", shape: { kind: "rapid", delta: -5 } },
        ],
      },
    ],
  },
  {
    id: "akademie-unfall-2026",
    title: "Magischer Unfall in der Akademie",
    summary:
      "Ein Experiment schlägt fehl. Malanthir-Dämpfe liegen über der Akademie, die umliegenden Gassen werden gesperrt.",
    segments: [
      {
        start: "2026-08-01",
        end: "2026-08-11",
        effects: [
          {
            meter: "malanthir",
            shape: { kind: "flat", delta: 20 },
            where: { akademieviertel: 1, tempelbezirk: 0.45, handwerkerviertel: 0.4, palast: 0.3 },
          },
          { meter: "vattrak", shape: { kind: "flat", delta: -10 }, where: { akademieviertel: 1, tempelbezirk: 0.35 } },
          { meter: "economy", shape: { kind: "flat", delta: -8 }, where: { akademieviertel: 1 } },
        ],
      },
    ],
  },
  {
    id: "ausgangssperre-2026",
    title: "Kaiserliche Ausgangssperre",
    summary: "Der Palast antwortet mit Ausgangsbeschränkungen und ständiger Garde. Der Handel leidet langsam nach.",
    segments: [
      {
        start: "2026-09-01",
        end: "2026-09-29",
        effects: [
          { meter: "guard", shape: { kind: "rapid", delta: 22 } },
          { meter: "economy", shape: { kind: "slow", delta: -15 } },
          { meter: "crime", shape: { kind: "flat", delta: -12 } },
        ],
      },
    ],
  },
  {
    id: "attentat-hauptmann-2026",
    title: "Attentat auf den Hauptmann",
    summary: "Ein Anschlag verletzt den Hauptmann der Stadtwachen schwer. Er überlebt, die Gassen nicht ihre Ruhe.",
    segments: [
      {
        start: "2026-09-22",
        end: "2026-09-29",
        effects: [
          { meter: "crime", shape: { kind: "flat", delta: 15 } },
          { meter: "tension", shape: { kind: "flat", delta: 25 } },
          { meter: "economy", shape: { kind: "flat", delta: -10 } },
        ],
      },
    ],
  },
  {
    id: "herbst-handelsboom-2026",
    title: "Herbst-Handelsboom",
    summary:
      "Vor dem Winter decken sich Händler und Bürger mit Vorräten ein. Die Wirtschaft zieht an, offene Stellen füllen sich, die Kriminalität wächst langsam mit.",
    segments: [
      {
        start: "2026-10-05",
        end: "2026-10-26",
        effects: [
          { meter: "economy", shape: { kind: "linear", delta: 18 } },
          { meter: "unemployment", shape: { kind: "linear", delta: -12 } },
          { meter: "crime", shape: { kind: "slow", delta: 4 } },
        ],
      },
    ],
  },
];

type Holiday = {
  id: string;
  title: string;
  summary: string;
  month: number;
  day: number;
  duration: number;
  effects: Effect[];
};

const HOLIDAYS: Holiday[] = [
  {
    id: "echo-verlorene-zeit",
    title: "Echo der verlorenen Zeit",
    summary: "Chrona. Papierlaternen treiben auf den Kanälen. Die Stadt hält inne, die Tempel füllen sich mit Vattrak.",
    month: 2,
    day: 2,
    duration: 7,
    effects: [
      { meter: "tension", shape: { kind: "flat", delta: -10 } },
      { meter: "vattrak", shape: { kind: "flat", delta: 10 }, where: { tempelbezirk: 1, palast: 0.25, adelsviertel: 0.2 } },
      { meter: "crime", shape: { kind: "flat", delta: -12 } },
    ],
  },
  {
    id: "tag-ewige-ordnung",
    title: "Tag der Ewigen Ordnung",
    summary: "Chromus und Imperus. Die Garde zeigt Präsenz, der Handel ruht, der Druck der Pflicht liegt auf den Gassen.",
    month: 3,
    day: 15,
    duration: 3,
    effects: [
      { meter: "guard", shape: { kind: "flat", delta: 15 } },
      { meter: "crime", shape: { kind: "flat", delta: -10 } },
      { meter: "economy", shape: { kind: "flat", delta: -5 } },
      { meter: "tension", shape: { kind: "flat", delta: 6 } },
    ],
  },
  {
    id: "fest-erbluehende-herzen",
    title: "Fest der erblühenden Herzen",
    summary: "Elysia und Amoria. Blumen, Wein und Tanz. Die Priester des Chromus schäumen, Taschendiebe auch.",
    month: 5,
    day: 1,
    duration: 7,
    effects: [
      { meter: "economy", shape: { kind: "flat", delta: 20 } },
      { meter: "unemployment", shape: { kind: "flat", delta: -10 } },
      { meter: "crime", shape: { kind: "flat", delta: 12 } },
      { meter: "tension", shape: { kind: "flat", delta: 15 } },
    ],
  },
  {
    id: "bund-gemeinschaft",
    title: "Bund der Gemeinschaft",
    summary: "Weilin. Lange Tische in den Gassen. Man achtet aufeinander, der Alltag verbraucht mehr Vattrak.",
    month: 6,
    day: 6,
    duration: 7,
    effects: [
      { meter: "unemployment", shape: { kind: "flat", delta: -8 } },
      { meter: "crime", shape: { kind: "flat", delta: -15 } },
      { meter: "vattrak", shape: { kind: "flat", delta: 5 } },
    ],
  },
  {
    id: "stunde-abrechnung",
    title: "Stunde der Abrechnung",
    summary: "Imperus zum Quartalswechsel. Steuerprüfungen und Kontrollen. Schmuggel und Malanthir tauchen ab.",
    month: 7,
    day: 1,
    duration: 7,
    effects: [
      { meter: "economy", shape: { kind: "flat", delta: -10 } },
      { meter: "guard", shape: { kind: "flat", delta: 20 } },
      { meter: "malanthir", shape: { kind: "flat", delta: -14 } },
    ],
  },
  {
    id: "fest-goldenes-laecheln",
    title: "Fest des goldenen Lächelns",
    summary: "Fedrix. Glücksspiel und überfüllte Tavernen. Chromus nennt es Zügellosigkeit.",
    month: 8,
    day: 14,
    duration: 7,
    effects: [
      { meter: "economy", shape: { kind: "flat", delta: 15 } },
      { meter: "crime", shape: { kind: "flat", delta: 10 } },
      { meter: "tension", shape: { kind: "flat", delta: 12 } },
    ],
  },
  {
    id: "nacht-langer-blick",
    title: "Nacht des langen Blickes",
    summary: "Chromus und Fundrah. Nach Einbruch der Dunkelheit sind die Straßen leer, in den Häusern wird der Zeit gedacht.",
    month: 10,
    day: 30,
    duration: 3,
    effects: [
      { meter: "guard", shape: { kind: "flat", delta: 15 } },
      { meter: "crime", shape: { kind: "flat", delta: -12 } },
      { meter: "economy", shape: { kind: "flat", delta: -10 } },
    ],
  },
];

function progress(start: number, end: number, day: number) {
  const last = end - DAY;
  if (day < start || day >= end) return null;
  if (last <= start) return 1;
  const steps = (last - start) / DAY + 1;
  const index = (day - start) / DAY + 1;
  return Math.max(0, Math.min(1, index / steps));
}

function sample(shape: Shape, t: number, day: number, start: number) {
  if (shape.kind === "flat") return shape.delta;
  if (shape.kind === "linear") return shape.delta * t;
  if (shape.kind === "rapid") {
    const rushed = Math.min(1, Math.max(t / 0.2, 0.5));
    return shape.delta * rushed;
  }
  if (shape.kind === "slow") return shape.delta * t * t;
  if (shape.kind === "glide") return shape.from + (shape.to - shape.from) * t;
  if (shape.kind === "weekly") {
    const week = Math.min(shape.weeks, Math.floor((day - start) / (7 * DAY)) + 1);
    return shape.step * Math.max(1, week);
  }
  if (t >= shape.holdAfter) return shape.delta;
  const u = t / shape.holdAfter;
  return shape.delta * u * u;
}

function scale(effect: Effect, districtId: CityDistrictId) {
  if (!effect.where) return 1;
  return effect.where[districtId] ?? 0;
}

function applySegment(shift: ChronicleShift, segment: Segment, districtId: CityDistrictId, day: number) {
  const start = parseDay(segment.start);
  const end = parseDay(segment.end);
  const t = progress(start, end, day);
  if (t == null) return false;
  let hit = false;
  for (const effect of segment.effects) {
    const gain = scale(effect, districtId);
    if (gain === 0) continue;
    shift[effect.meter] += sample(effect.shape, t, day, start) * gain;
    hit = true;
  }
  return hit;
}

function holidayStories(day: number): Story[] {
  const year = new Date(day).getUTCFullYear();
  const stories: Story[] = [];
  for (const holiday of HOLIDAYS) {
    for (const candidate of [year - 1, year, year + 1]) {
      const start = Date.UTC(candidate, holiday.month - 1, holiday.day);
      const end = start + holiday.duration * DAY;
      if (day < start || day >= end) continue;
      stories.push({
        id: `${holiday.id}-${candidate}`,
        title: holiday.title,
        summary: holiday.summary,
        segments: [{ start: formatDay(start), end: formatDay(end), effects: holiday.effects }],
      });
    }
  }
  return stories;
}

function storiesOn(day: number) {
  return [...CITY_STORIES, ...holidayStories(day)];
}

export function chronicleShift(districtId: CityDistrictId, day: number): ChronicleShift {
  const shift: ChronicleShift = { ...ZERO };
  for (const story of storiesOn(day)) {
    for (const segment of story.segments) applySegment(shift, segment, districtId, day);
  }
  return shift;
}

export type ChronicleMark = {
  id: string;
  title: string;
  summary: string;
};

function touches(story: Story, districtId: CityDistrictId | null) {
  if (!districtId) return true;
  return story.segments.some((segment) => segment.effects.some((effect) => scale(effect, districtId) > 0));
}

export function chronicleMarksOn(day: number, districtId: CityDistrictId | null = null): ChronicleMark[] {
  const marks: ChronicleMark[] = [];
  for (const story of storiesOn(day)) {
    if (!touches(story, districtId)) continue;
    const shift = { ...ZERO };
    let hit = false;
    for (const segment of story.segments) {
      if (applySegment(shift, segment, districtId ?? AURENFURT_DISTRICTS[0].id, day)) hit = true;
    }
    if (!hit && districtId) continue;
    if (!districtId) {
      let any = false;
      for (const segment of story.segments) {
        const start = parseDay(segment.start);
        const end = parseDay(segment.end);
        if (day >= start && day < end) any = true;
      }
      if (!any) continue;
    }
    marks.push({ id: story.id, title: story.title, summary: story.summary });
  }
  return marks;
}

export function chronicleInWindow(days: number[], districtId: CityDistrictId | null): ChronicleMark[] {
  const seen = new Map<string, ChronicleMark>();
  for (const day of days) {
    for (const mark of chronicleMarksOn(day, districtId)) {
      if (!seen.has(mark.id)) seen.set(mark.id, mark);
    }
  }
  return [...seen.values()];
}
