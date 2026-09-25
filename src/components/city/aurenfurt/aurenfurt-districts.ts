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

export type BuildingKind =
  | "palace"
  | "temple"
  | "gate"
  | "smithy"
  | "tavern"
  | "market"
  | "garden"
  | "manor";

/** u/v: Bildkoordinaten der Aufsicht, Ursprung oben links. */
export type CityBuilding = {
  id: string;
  name: string;
  kind: BuildingKind;
  districtId: CityDistrictId;
  u: number;
  v: number;
  crime: number;
  vattrak: number;
  summary: string;
};

const DISTRICT_NAME: Record<CityDistrictId, string> = {
  adelsviertel: "Adelsviertel",
  tempelbezirk: "Tempelbezirk",
  handwerkerviertel: "Handwerkerviertel",
  suedtor: "Südtor",
  unterstadt: "Unterstadt",
  palast: "Palast",
};

export function districtName(id: CityDistrictId) {
  return DISTRICT_NAME[id];
}

/**
 * Marken sitzen auf der gemalten Aufsicht.
 * Goldkuppel um (0.49, 0.44), Osttempel um (0.74, 0.42), Südtor unten.
 */
export const CITY_BUILDINGS: CityBuilding[] = [
  {
    id: "palast",
    name: "Goldene Kuppel",
    kind: "palace",
    districtId: "palast",
    u: 0.488,
    v: 0.44,
    crime: 8,
    vattrak: 92,
    summary: "Die Zentralkuppel. Wachen an jedem Bogen, Vattrak fast ungestört.",
  },
  {
    id: "nordtor",
    name: "Nordtor",
    kind: "gate",
    districtId: "adelsviertel",
    u: 0.5,
    v: 0.1,
    crime: 14,
    vattrak: 70,
    summary: "Das nördliche Tor zwischen den blauen Dächern.",
  },
  {
    id: "blaue-gaerten",
    name: "Blaue Gärten",
    kind: "garden",
    districtId: "adelsviertel",
    u: 0.39,
    v: 0.3,
    crime: 9,
    vattrak: 78,
    summary: "Höfe und Hecken der Häuser. Nach Einbruch der Dunkelheit still.",
  },
  {
    id: "blauer-hirsch",
    name: "Taverne zum Blauen Hirsch",
    kind: "tavern",
    districtId: "adelsviertel",
    u: 0.58,
    v: 0.3,
    crime: 17,
    vattrak: 64,
    summary: "Ruhiges Haus. Die Rechnung ist hoch, der Lärm ist es nicht.",
  },
  {
    id: "tempel",
    name: "Goldene Tempelkuppel",
    kind: "temple",
    districtId: "tempelbezirk",
    u: 0.74,
    v: 0.42,
    crime: 11,
    vattrak: 88,
    summary: "Die große Ostkuppel. Pilger halten den Bezirk hell.",
  },
  {
    id: "ostbrunnen",
    name: "Ostbrunnen",
    kind: "garden",
    districtId: "tempelbezirk",
    u: 0.64,
    v: 0.34,
    crime: 16,
    vattrak: 73,
    summary: "Brunnenhof zwischen Palastgärten und den Tempeln.",
  },
  {
    id: "schmiede",
    name: "Große Schmiede",
    kind: "smithy",
    districtId: "handwerkerviertel",
    u: 0.7,
    v: 0.64,
    crime: 43,
    vattrak: 32,
    summary: "Esse an der Südostmauer. Funken, Lärm, und wenig Fragen.",
  },
  {
    id: "kontor",
    name: "Kontorhaus",
    kind: "manor",
    districtId: "handwerkerviertel",
    u: 0.6,
    v: 0.6,
    crime: 35,
    vattrak: 41,
    summary: "Lager und Schreibstube der Zünfte. Nachts bleibt eine Laterne an.",
  },
  {
    id: "loewentor",
    name: "Löwentor",
    kind: "gate",
    districtId: "suedtor",
    u: 0.5,
    v: 0.9,
    crime: 31,
    vattrak: 47,
    summary: "Zwei Löwen flankieren den Südausgang. Zoll und Wache teilen sich den Torbogen.",
  },
  {
    id: "allee",
    name: "Taverne zur Allee",
    kind: "tavern",
    districtId: "suedtor",
    u: 0.54,
    v: 0.72,
    crime: 29,
    vattrak: 39,
    summary: "An der grünen Prozessionsallee. Händler trinken, bevor sie das Tor nehmen.",
  },
  {
    id: "westmarkt",
    name: "Westmarkt",
    kind: "market",
    districtId: "unterstadt",
    u: 0.34,
    v: 0.62,
    crime: 62,
    vattrak: 24,
    summary: "Dichte Stände vor den roten Dächern. Taschendiebe kennen jede Gasse.",
  },
  {
    id: "rote-laterne",
    name: "Taverne Rote Laterne",
    kind: "tavern",
    districtId: "unterstadt",
    u: 0.31,
    v: 0.74,
    crime: 76,
    vattrak: 16,
    summary: "Eng, laut, und die Wache kommt spät. Vattrak hält sich hier nicht.",
  },
];

export function findBuilding(id: string | null) {
  if (!id) return null;
  return CITY_BUILDINGS.find((building) => building.id === id) ?? null;
}
