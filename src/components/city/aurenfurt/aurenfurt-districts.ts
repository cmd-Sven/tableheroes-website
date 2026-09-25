import { sim, type SimProfile } from "./aurenfurt-sim";

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
  | "manor"
  | "guild";

export type HoloSelection =
  | { type: "district"; id: CityDistrictId }
  | { type: "building"; id: string };

/** Winkel: 0° Norden, im Uhrzeigersinn. inner/outer als Anteil am Mauer-Radius. */
export type CityDistrict = {
  id: CityDistrictId;
  name: string;
  summary: string;
  tint: string;
  start: number;
  end: number;
  inner: number;
  outer: number;
  sim: SimProfile;
};

export type CityBuilding = {
  id: string;
  name: string;
  kind: BuildingKind;
  districtId: CityDistrictId;
  u: number;
  v: number;
  summary: string;
  sim: SimProfile;
};

export type SimSubject = {
  id: string;
  type: HoloSelection["type"];
  name: string;
  kicker: string;
  summary: string;
  sim: SimProfile;
  districtId: CityDistrictId;
};

const PALACE_OUTER = 0.2;
const RING_INNER = 0.24;
const RING_OUTER = 0.96;

export const AURENFURT_DISTRICTS: CityDistrict[] = [
  {
    id: "adelsviertel",
    name: "Adelsviertel",
    tint: "#7ec8ff",
    start: 292,
    end: 32,
    inner: RING_INNER,
    outer: RING_OUTER,
    summary: "Blaue Dächer und Gärten im Norden. Die Häuser halten die Gassen sauber und die Tore zu.",
    sim: sim(12, 76, 8, 82, 14, 84, [{ name: "Salons der Häuser", strength: 24 }]),
  },
  {
    id: "tempelbezirk",
    name: "Tempelbezirk",
    tint: "#f0d85a",
    start: 32,
    end: 112,
    inner: RING_INNER,
    outer: RING_OUTER,
    summary: "Goldkuppeln im Osten. Pilger füllen die Höfe, und nicht jede Liturgie ist die offizielle.",
    sim: sim(16, 86, 29, 73, 33, 68, [{ name: "Goldene Liturgie", strength: 36 }]),
  },
  {
    id: "handwerkerviertel",
    name: "Handwerkerviertel",
    tint: "#e0a36a",
    start: 112,
    end: 166,
    inner: RING_INNER,
    outer: RING_OUTER,
    summary: "Essen und Kontore vor der Südostmauer. Die Zünfte wiegen mehr als die Garde.",
    sim: sim(41, 37, 17, 44, 42, 74, [{ name: "Zunftkeller", strength: 57 }]),
  },
  {
    id: "suedtor",
    name: "Südtor",
    tint: "#b7e38a",
    start: 166,
    end: 198,
    inner: RING_INNER,
    outer: RING_OUTER,
    summary: "Löwentor und Prozessionsallee. Hier kommt die Stadt hinein, und nicht alles wird verzollt.",
    sim: sim(34, 44, 15, 71, 79, 61, [{ name: "Löwentor-Schmuggler", strength: 48 }]),
  },
  {
    id: "unterstadt",
    name: "Unterstadt",
    tint: "#ff8a6a",
    start: 198,
    end: 292,
    inner: RING_INNER,
    outer: RING_OUTER,
    summary: "Dichte rote Dächer im Südwesten. Zu viele Menschen, zu wenig Wachen, zu laute Keller.",
    sim: sim(72, 18, 56, 21, 88, 26, [
      { name: "Flüstern der Roten Gassen", strength: 74 },
      { name: "Malanthir-Zellen", strength: 63 },
    ]),
  },
  {
    id: "palast",
    name: "Palast",
    tint: "#ffe38a",
    start: 0,
    end: 360,
    inner: 0,
    outer: PALACE_OUTER,
    summary: "Die goldene Zentralkuppel. Vattrak ist hier am ruhigsten, die Garde am dichtesten.",
    sim: sim(6, 94, 11, 96, 5, 91, [{ name: "Hofkanzlei", strength: 19 }]),
  },
];

export const CITY_BUILDINGS: CityBuilding[] = [
  {
    id: "goldkuppel",
    name: "Goldene Kuppel",
    kind: "palace",
    districtId: "palast",
    u: 0.5,
    v: 0.47,
    summary: "Thronsaal unter der Kuppel. Jeder Bogen hat eine Wache, jeder Flur ein Protokoll.",
    sim: sim(4, 96, 7, 98, 2, 93, [{ name: "Hofkanzlei", strength: 16 }]),
  },
  {
    id: "nordtor",
    name: "Nordtor",
    kind: "gate",
    districtId: "adelsviertel",
    u: 0.5,
    v: 0.1,
    summary: "Das nördliche Tor. Wer hier durchwill, hat entweder ein Wappen oder eine sehr gute Erklärung.",
    sim: sim(13, 71, 6, 86, 18, 70, []),
  },
  {
    id: "blaue-gaerten",
    name: "Blaue Gärten",
    kind: "garden",
    districtId: "adelsviertel",
    u: 0.4,
    v: 0.3,
    summary: "Heckenhöfe der Häuser. Nach Sonnenuntergang schließt das letzte Gitter.",
    sim: sim(8, 80, 5, 77, 9, 82, [{ name: "Salons der Häuser", strength: 28 }]),
  },
  {
    id: "blauer-hirsch",
    name: "Taverne zum Blauen Hirsch",
    kind: "tavern",
    districtId: "adelsviertel",
    u: 0.58,
    v: 0.3,
    summary: "Leises Haus, teure Krüge. Die Garde trinkt hier umsonst, solange niemand laut wird.",
    sim: sim(18, 66, 9, 64, 16, 73, [{ name: "Salons der Häuser", strength: 20 }]),
  },
  {
    id: "tempel",
    name: "Goldene Tempelkuppel",
    kind: "temple",
    districtId: "tempelbezirk",
    u: 0.74,
    v: 0.42,
    summary: "Die große Ostkuppel. Tagsüber Pilger, nachts eine Liturgie, die nicht im Kalender steht.",
    sim: sim(10, 90, 34, 70, 28, 66, [{ name: "Goldene Liturgie", strength: 48 }]),
  },
  {
    id: "ostbrunnen",
    name: "Ostbrunnen",
    kind: "garden",
    districtId: "tempelbezirk",
    u: 0.64,
    v: 0.34,
    summary: "Brunnen zwischen Palastgärten und Tempeln. Opfergaben verschwinden schneller als Wasser.",
    sim: sim(15, 74, 22, 68, 30, 58, [{ name: "Goldene Liturgie", strength: 21 }]),
  },
  {
    id: "schmiede",
    name: "Große Schmiede",
    kind: "smithy",
    districtId: "handwerkerviertel",
    u: 0.7,
    v: 0.64,
    summary: "Esse an der Südostmauer. Die Zunft kauft Erz, bevor die Garde Fragen stellt.",
    sim: sim(44, 31, 14, 38, 34, 81, [{ name: "Esse-Zunft", strength: 62 }]),
  },
  {
    id: "zunft",
    name: "Zunfthaus",
    kind: "guild",
    districtId: "handwerkerviertel",
    u: 0.6,
    v: 0.6,
    summary: "Schreibstube und Lager der Zünfte. Verträge gelten hier mehr als Wappen.",
    sim: sim(32, 42, 12, 49, 27, 86, [{ name: "Zunftkeller", strength: 70 }]),
  },
  {
    id: "loewentor",
    name: "Löwentor",
    kind: "gate",
    districtId: "suedtor",
    u: 0.5,
    v: 0.9,
    summary: "Zwei Löwen am Südausgang. Zoll und Garde teilen sich den Torbogen, die Schmuggler die Schatten.",
    sim: sim(36, 46, 13, 78, 84, 64, [{ name: "Löwentor-Schmuggler", strength: 55 }]),
  },
  {
    id: "allee",
    name: "Taverne zur Allee",
    kind: "tavern",
    districtId: "suedtor",
    u: 0.54,
    v: 0.72,
    summary: "An der grünen Prozessionsallee. Händler trinken, bevor sie das Tor nehmen.",
    sim: sim(30, 40, 16, 52, 61, 58, [{ name: "Löwentor-Schmuggler", strength: 33 }]),
  },
  {
    id: "westmarkt",
    name: "Westmarkt",
    kind: "market",
    districtId: "unterstadt",
    u: 0.34,
    v: 0.62,
    summary: "Stände vor den roten Dächern. Ware, Diebstahl und Gerüchte liegen auf demselben Tuch.",
    sim: sim(64, 22, 28, 24, 81, 47, [{ name: "Flüstern der Roten Gassen", strength: 46 }]),
  },
  {
    id: "rote-laterne",
    name: "Taverne Rote Laterne",
    kind: "tavern",
    districtId: "unterstadt",
    u: 0.31,
    v: 0.74,
    summary: "Eng, laut, und die Wache kommt spät. Im Keller wird Malanthir nicht nur geflüstert.",
    sim: sim(81, 11, 70, 12, 76, 19, [
      { name: "Keller der Roten Laterne", strength: 82 },
      { name: "Malanthir-Zellen", strength: 68 },
    ]),
  },
];

export function findDistrict(id: string | null) {
  if (!id) return null;
  return AURENFURT_DISTRICTS.find((district) => district.id === id) ?? null;
}

export function findBuilding(id: string | null) {
  if (!id) return null;
  return CITY_BUILDINGS.find((building) => building.id === id) ?? null;
}

export function buildingsInDistrict(id: CityDistrictId) {
  return CITY_BUILDINGS.filter((building) => building.districtId === id);
}

export function sameSelection(a: HoloSelection | null, b: HoloSelection | null) {
  if (!a || !b) return false;
  return a.type === b.type && a.id === b.id;
}

export function subjectFromSelection(selection: HoloSelection | null): SimSubject | null {
  if (!selection) return null;
  if (selection.type === "district") {
    const district = findDistrict(selection.id);
    if (!district) return null;
    return {
      id: district.id,
      type: "district",
      name: district.name,
      kicker: "Viertel",
      summary: district.summary,
      sim: district.sim,
      districtId: district.id,
    };
  }
  const building = findBuilding(selection.id);
  if (!building) return null;
  const district = findDistrict(building.districtId);
  return {
    id: building.id,
    type: "building",
    name: building.name,
    kicker: district?.name ?? "Ort",
    summary: building.summary,
    sim: building.sim,
    districtId: building.districtId,
  };
}
