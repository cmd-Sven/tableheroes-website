import { polarToCartesian, wedgeCentroid, wedgePath, PALACE_RADIUS, WALL_RADIUS } from "./aurenfurt-layout";

export const AURENFURT_LORE_ID = "d0464d29-4c2d-4c94-a1ab-2d8c069674b3";

export function isAurenfurtLore(entry: { id?: string; name?: string | null }) {
  if (entry.id === AURENFURT_LORE_ID) return true;
  return (entry.name ?? "").trim().toLowerCase() === "aurenfurt";
}

export type CityDistrictId =
  | "suedtor"
  | "adelsviertel"
  | "tempelbezirk"
  | "unterstadt"
  | "handwerkerviertel"
  | "palast";

export type KeyLocation = {
  id: string;
  name: string;
  x: number;
  y: number;
};

export type CityDistrict = {
  id: CityDistrictId;
  name: string;
  /** Dachfarbe aus der Aufsicht. */
  tint: string;
  stroke: string;
  /** 0° = Norden, im Uhrzeigersinn. */
  start: number;
  end: number;
  inner: number;
  outer: number;
  path: string;
  label: { x: number; y: number };
  /** Platzhalter für die spätere Simulation. */
  crime: number;
  vattrak: number;
  summary: string;
  locations: KeyLocation[];
};

function district(
  partial: Omit<CityDistrict, "path" | "label"> & { labelRadius: number },
): CityDistrict {
  const { labelRadius, ...rest } = partial;
  return {
    ...rest,
    path: wedgePath(rest.start, rest.end, rest.inner, rest.outer),
    label: wedgeCentroid(rest.start, rest.end, labelRadius),
  };
}

function loc(id: string, name: string, angle: number, radius: number): KeyLocation {
  const point = polarToCartesian(angle, radius);
  return { id, name, x: point.x, y: point.y };
}

/**
 * Fünf Viertel plus Palast, an der Aufsicht ausgerichtet:
 * Blau im Norden, Gold im Osten, Braun im Südosten, Rot im Südwesten, Tor im Süden.
 */
export const AURENFURT_DISTRICTS: CityDistrict[] = [
  district({
    id: "adelsviertel",
    name: "Adelsviertel",
    tint: "rgba(55, 120, 210, 0.38)",
    stroke: "#7ec8ff",
    start: 286,
    end: 28,
    inner: PALACE_RADIUS + 8,
    outer: WALL_RADIUS - 6,
    labelRadius: 280,
    crime: 12,
    vattrak: 74,
    summary: "Blaue Dächer, Gärten und das Nordtor. Sitz der Häuser.",
    locations: [
      loc("nordtor", "Nordtor", 0, 400),
      loc("blaue-gaerten", "Blaue Gärten", 330, 300),
    ],
  }),
  district({
    id: "tempelbezirk",
    name: "Tempelbezirk",
    tint: "rgba(202, 185, 38, 0.34)",
    stroke: "#f0d85a",
    start: 28,
    end: 112,
    inner: PALACE_RADIUS + 8,
    outer: WALL_RADIUS - 6,
    labelRadius: 290,
    crime: 18,
    vattrak: 81,
    summary: "Goldkuppeln und Höfe entlang der Ostmauer.",
    locations: [
      loc("goldkuppel", "Goldene Tempelkuppel", 70, 250),
      loc("ostbrunnen", "Ostbrunnen", 48, 340),
    ],
  }),
  district({
    id: "handwerkerviertel",
    name: "Handwerkerviertel",
    tint: "rgba(150, 96, 48, 0.4)",
    stroke: "#e0a36a",
    start: 112,
    end: 168,
    inner: PALACE_RADIUS + 8,
    outer: WALL_RADIUS - 6,
    labelRadius: 300,
    crime: 41,
    vattrak: 36,
    summary: "Werkhöfe und Schornsteine vor der Südostmauer.",
    locations: [
      loc("schmieden", "Schmiedegasse", 140, 310),
      loc("kontore", "Kontore", 122, 230),
    ],
  }),
  district({
    id: "suedtor",
    name: "Südtor",
    tint: "rgba(90, 140, 70, 0.28)",
    stroke: "#b7e38a",
    start: 168,
    end: 198,
    inner: PALACE_RADIUS + 8,
    outer: WALL_RADIUS - 6,
    labelRadius: 320,
    crime: 33,
    vattrak: 44,
    summary: "Löwentor und die grüne Prozessionsallee nach Süden.",
    locations: [
      loc("loewentor", "Löwentor", 183, 410),
      loc("allee", "Prozessionsallee", 183, 280),
    ],
  }),
  district({
    id: "unterstadt",
    name: "Unterstadt",
    tint: "rgba(180, 64, 42, 0.4)",
    stroke: "#ff8a6a",
    start: 198,
    end: 286,
    inner: PALACE_RADIUS + 8,
    outer: WALL_RADIUS - 6,
    labelRadius: 300,
    crime: 68,
    vattrak: 22,
    summary: "Dichte rote Dächer zwischen Westklippe und Südtor.",
    locations: [
      loc("gassen", "Enge Gassen", 240, 310),
      loc("westmarkt", "Westmarkt", 214, 240),
    ],
  }),
];

export const PALACE_DISTRICT: CityDistrict = {
  id: "palast",
  name: "Palast",
  tint: "rgba(202, 185, 38, 0.45)",
  stroke: "#ffe38a",
  start: 0,
  end: 360,
  inner: 0,
  outer: PALACE_RADIUS,
  path: "",
  label: { x: 500, y: 500 },
  crime: 8,
  vattrak: 92,
  summary: "Die goldene Zentralkuppel und der innere Ring.",
  locations: [loc("thron", "Goldene Kuppel", 0, 0)],
};

export function findDistrict(id: CityDistrictId | null) {
  if (id === "palast") return PALACE_DISTRICT;
  return AURENFURT_DISTRICTS.find((district) => district.id === id) ?? null;
}
