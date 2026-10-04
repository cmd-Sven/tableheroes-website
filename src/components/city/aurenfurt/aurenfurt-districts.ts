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
  | "akademieviertel"
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
  | { type: "building"; id: string }
  | { type: "poi"; id: string };

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
  /** Zellen und das frühere Porträt. Die angezeigten Zähler rechnet `aurenfurt-city-sim`. */
  sim: SimProfile;
};

export type LandmarkModel = "wirtshaus" | "kraemer" | "nordtor" | "suedtor" | "wachturm" | "palais" | "kapelle" | "hofkanzlei" | "observatorium";

export type ProsperityLevel = 1 | 2 | 3 | 4 | 5;

/** Kurzer spielmechanischer Bonus für das Viertel. */
export type SpecialBonus = {
  name: string;
  effect: string;
};

export type CityBuilding = {
  id: string;
  name: string;
  kind: BuildingKind;
  districtId: CityDistrictId;
  u: number;
  v: number;
  summary: string;
  /** Echtes GLB, einmal auf der Tafel. */
  landmark?: LandmarkModel;
  /** Fraktions-ID aus `aurenfurt-factions` (z. B. rotes-auge). */
  guildId: string;
  prosperityLevel: ProsperityLevel;
  /** Brandherd für Unruhen/Kriminalität, 0–100. */
  isHotspot: number;
  specialBonus: SpecialBonus;
  /** Feste Gebäudekategorie (Editor / Lore-Typ). */
  category?: string;
  /** Straßen-Id aus aurenfurt-streets-v1; ohne → inaktiv bei Editor-Gebäuden. */
  streetId?: string | null;
  /** Über den Viertel-Karten-Editor angelegt. */
  fromEditor?: boolean;
};

export type SimSubject = {
  id: string;
  type: HoloSelection["type"];
  name: string;
  kicker: string;
  summary: string;
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
    sim: sim(12, 76, 8, 82, 14, 84, 14, [{ name: "Salons der Häuser", strength: 24 }]),
  },
  {
    id: "tempelbezirk",
    name: "Tempelbezirk",
    tint: "#f0d85a",
    start: 32,
    end: 76,
    inner: RING_INNER,
    outer: RING_OUTER,
    summary: "Goldkuppeln im Osten. Pilger füllen die Höfe, und nicht jede Liturgie ist die offizielle.",
    sim: sim(16, 86, 29, 73, 33, 68, 34, [
      { name: "Goldene Liturgie", strength: 36 },
      { name: "Silberne Rose gegen das Konklave", strength: 44 },
    ]),
  },
  {
    id: "akademieviertel",
    name: "Akademieviertel",
    tint: "#8eb4f0",
    start: 76,
    end: 112,
    inner: RING_INNER,
    outer: RING_OUTER,
    summary:
      "Observatorium, Schwertschule und Bibliothek zwischen Tempel und Handwerk. Weiße Magie, Ausbildung und Archive — Versuchung hinter Sternenkammern, nicht auf der Straße.",
    sim: sim(22, 80, 30, 72, 12, 70, 18, [
      { name: "Sternenkammer", strength: 36 },
      { name: "Archivversuchung", strength: 28 },
    ]),
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
    sim: sim(41, 37, 17, 44, 42, 74, 27, [{ name: "Zunftkeller", strength: 57 }]),
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
    sim: sim(34, 44, 15, 71, 79, 61, 36, [{ name: "Löwentor-Schmuggler", strength: 48 }]),
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
    sim: sim(72, 18, 56, 21, 88, 26, 68, [
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
    summary: "Der Festungspalast im Zentrum. Vattrak ist hier am ruhigsten, die Garde am dichtesten.",
    sim: sim(6, 94, 11, 96, 5, 91, 12, [{ name: "Hofkanzlei", strength: 19 }]),
  },
];

export const CITY_BUILDINGS: CityBuilding[] = [
  // —— Palast ——
  {
    id: "hofwache",
    name: "Hofwache der Stadtwachen",
    kind: "gate",
    districtId: "palast",
    u: 0.46,
    v: 0.52,
    summary: "Wachstube am inneren Ring. Hier meldet die Garde dem Hof, und Willkür trägt ein Siegel.",
    guildId: "stadtwachen",
    prosperityLevel: 4,
    isHotspot: 18,
    specialBonus: {
      name: "Alarmglocke",
      effect: "Einmal pro Szene kann die Gruppe die Garde in 1 Runde herbeirufen.",
    },
  },
  {
    id: "hofkanzlei",
    name: "Hofkanzlei",
    kind: "manor",
    districtId: "palast",
    u: 0.54,
    v: 0.52,
    summary: "Akten, Siegel und stille Türen. Wer hier schreibt, formt die Stadt, bevor sie es merkt.",
    landmark: "hofkanzlei",
    guildId: "haeuser-des-nordens",
    prosperityLevel: 5,
    isHotspot: 12,
    specialBonus: {
      name: "Siegelrecht",
      effect: "Offizielle Schreiben aus der Kanzlei senken Garde-Kontrollen im Zielviertel.",
    },
  },
  {
    id: "silberkapelle",
    name: "Kapelle der Silbernen Rose",
    kind: "temple",
    districtId: "palast",
    u: 0.5,
    v: 0.4,
    summary: "Kleine Hofkapelle mit offenen Türen. Elysia-Flüstern unter kaiserlichem Stuck.",
    landmark: "kapelle",
    guildId: "bund-silberne-rose",
    prosperityLevel: 4,
    isHotspot: 22,
    specialBonus: {
      name: "Hoffnungsschwur",
      effect: "Ein kurzes Gebet entfernt 1 Stufe Erschöpfung nach einer gescheiterten Probe.",
    },
  },
  // —— Adelsviertel ——
  {
    id: "nordtor",
    name: "Nordtor",
    kind: "gate",
    districtId: "adelsviertel",
    u: 0.5,
    v: 0.1,
    summary: "Das nördliche Tor. Wer hier durchwill, hat entweder ein Wappen oder eine sehr gute Erklärung.",
    landmark: "nordtor",
    guildId: "stadtwachen",
    prosperityLevel: 4,
    isHotspot: 20,
    specialBonus: {
      name: "Wappenkontrolle",
      effect: "Mit Adelsausweis entfällt die erste Zollprobe am Nordtor.",
    },
  },
  {
    id: "blaue-gaerten",
    name: "Blaue Gärten",
    kind: "garden",
    districtId: "adelsviertel",
    u: 0.4,
    v: 0.3,
    summary: "Heckenhöfe der Häuser. Nach Sonnenuntergang schließt das letzte Gitter.",
    guildId: "haeuser-des-nordens",
    prosperityLevel: 5,
    isHotspot: 10,
    specialBonus: {
      name: "Salonluft",
      effect: "Heimliche Gespräche in den Gärten gelten als unbemerkt, solange niemand die Gitter stört.",
    },
  },
  {
    id: "blauer-hirsch",
    name: "Taverne zum Blauen Hirsch",
    kind: "tavern",
    districtId: "adelsviertel",
    u: 0.58,
    v: 0.3,
    summary:
      "Leises Haus, teure Krüge. Die Goldkelchen spielen hier für Adelsohren — und lauschen für das Haus der Seide.",
    guildId: "goldkelchen",
    prosperityLevel: 4,
    isHotspot: 28,
    specialBonus: {
      name: "Bardenohren",
      effect: "Ein Auftritt der Goldkelchen liefert 1 belastbares Gerücht aus dem Adelsviertel.",
    },
  },
  {
    id: "seidensalon",
    name: "Seidensalon der Nordhäuser",
    kind: "manor",
    districtId: "adelsviertel",
    u: 0.45,
    v: 0.22,
    summary: "Empfangszimmer mit Seidenbahnen. Das Haus der Seide verkauft hier Rang und Stoffe zugleich.",
    guildId: "haus-der-seide",
    prosperityLevel: 5,
    isHotspot: 16,
    specialBonus: {
      name: "Standgebühr",
      effect: "Handel mit Adel: +1 auf Überzeugen, wenn Luxusware im Spiel ist.",
    },
  },
  // —— Tempelbezirk ——
  {
    id: "tempel",
    name: "Goldene Tempelkuppel",
    kind: "temple",
    districtId: "tempelbezirk",
    u: 0.74,
    v: 0.42,
    summary: "Die große Ostkuppel. Tagsüber Pilger, nachts eine Liturgie, die nicht im Kalender steht.",
    guildId: "konklave-ewige-ordnung",
    prosperityLevel: 4,
    isHotspot: 35,
    specialBonus: {
      name: "Gezähltes Schicksal",
      effect: "Einmal pro Tag darf eine Probe neu gewürfelt werden — das Ergebnis zählt.",
    },
  },
  {
    id: "ostbrunnen",
    name: "Ostbrunnen",
    kind: "garden",
    districtId: "tempelbezirk",
    u: 0.64,
    v: 0.34,
    summary: "Brunnen zwischen Palastgärten und Tempeln. Opfergaben verschwinden schneller als Wasser.",
    guildId: "bund-silberne-rose",
    prosperityLevel: 3,
    isHotspot: 30,
    specialBonus: {
      name: "Opferstille",
      effect: "Eine Opfergabe am Brunnen senkt Malanthir-Spuren in der nächsten Szene um eine Stufe.",
    },
  },
  {
    id: "rose-hof",
    name: "Hof der Silbernen Rose",
    kind: "temple",
    districtId: "tempelbezirk",
    u: 0.78,
    v: 0.36,
    summary: "Offener Kreuzgang mit weißen Rosen. Hier predigen Elysia-Anhänger gegen gezähltes Schicksal.",
    guildId: "bund-silberne-rose",
    prosperityLevel: 3,
    isHotspot: 40,
    specialBonus: {
      name: "Offene Höfe",
      effect: "Verbündete der Rose erhalten Unterschlupf ohne Informationsabfluss an die Garde.",
    },
  },
  {
    id: "konklave-saal",
    name: "Saal der Ewigen Ordnung",
    kind: "temple",
    districtId: "tempelbezirk",
    u: 0.7,
    v: 0.48,
    summary: "Geschlossener Chorraum. Chromus-Liturgie tickt in Kerzen und Zahlen.",
    guildId: "konklave-ewige-ordnung",
    prosperityLevel: 4,
    isHotspot: 38,
    specialBonus: {
      name: "Liturgiezwang",
      effect: "Gegner in Sichtweite leiden −1 auf Willenskraft, solange der Chor singt.",
    },
  },
  // —— Akademieviertel ——
  {
    id: "observatorium",
    name: "Das magische Observatorium von Aurenfurt",
    kind: "temple",
    districtId: "akademieviertel",
    u: 0.72,
    v: 0.48,
    summary:
      "Kuppel und Sternenkammer der Magieakademie. Hier wird Vattrak gelehrt — und manches, das nicht im Lehrplan steht.",
    landmark: "observatorium",
    guildId: "zirkel-observatorium",
    prosperityLevel: 4,
    isHotspot: 34,
    specialBonus: {
      name: "Sternenkammer",
      effect: "Einmal pro Nacht darf eine Magie-Probe mit +1 gewürfelt werden, wenn der Himmel klar ist.",
    },
  },
  {
    id: "schwertschule",
    name: "Die Schwertschule von Aurenfurt",
    kind: "manor",
    districtId: "akademieviertel",
    u: 0.68,
    v: 0.54,
    summary:
      "Militärakademie für Gardisten und Wachleute. Drillhöfe, Stangen und der Geruch von Öl und Disziplin.",
    guildId: "stadtwachen",
    prosperityLevel: 3,
    isHotspot: 28,
    specialBonus: {
      name: "Wachnachwuchs",
      effect: "Verbündete der Garde erhalten hier eine freie Ausbildungsszene ohne öffentliche Aufmerksamkeit.",
    },
  },
  {
    id: "grosse-bibliothek",
    name: "Die Große Bibliothek von Aurenfurt",
    kind: "guild",
    districtId: "akademieviertel",
    u: 0.66,
    v: 0.5,
    summary:
      "Wissensspeicher zwischen den Konfessionen und der Akademie. Regale, Register — und Abschriften, die niemand ausleihen darf.",
    guildId: "zirkel-observatorium",
    prosperityLevel: 4,
    isHotspot: 26,
    specialBonus: {
      name: "Archivzugang",
      effect: "Eine Rechercheprobe in der Bibliothek gilt als erleichtert, wenn der Zirkel als Mittler genannt wird.",
    },
  },
  // —— Handwerkerviertel ——
  {
    id: "schmiede",
    name: "Große Schmiede",
    kind: "smithy",
    districtId: "handwerkerviertel",
    u: 0.7,
    v: 0.64,
    summary: "Esse an der Südostmauer. Die Zunft kauft Erz, bevor die Garde Fragen stellt.",
    guildId: "zunftbund",
    prosperityLevel: 3,
    isHotspot: 32,
    specialBonus: {
      name: "Zunftesse",
      effect: "Waffen und Werkzeuge reparieren kostet die Hälfte der üblichen Zeit.",
    },
  },
  {
    id: "zunft",
    name: "Zunfthaus",
    kind: "guild",
    districtId: "handwerkerviertel",
    u: 0.6,
    v: 0.6,
    summary: "Schreibstube und Lager der Zünfte. Verträge gelten hier mehr als Wappen.",
    guildId: "zunftbund",
    prosperityLevel: 3,
    isHotspot: 36,
    specialBonus: {
      name: "Vertragssiegel",
      effect: "Ein Zunftvertrag gilt vor Hof und Garde als bindender als ein Adelswort.",
    },
  },
  {
    id: "seidenkontor",
    name: "Kontor des Hauses der Seide",
    kind: "market",
    districtId: "handwerkerviertel",
    u: 0.65,
    v: 0.56,
    summary: "Stand und Schreibstube am Handwerkermarkt. Hohe Gebühren, längere Reichweite bis in die blauen Salons.",
    guildId: "haus-der-seide",
    prosperityLevel: 4,
    isHotspot: 28,
    specialBonus: {
      name: "Seidennetz",
      effect: "Handelsproben am Markt erhalten +1, wenn das Haus der Seide als Mittler genannt wird.",
    },
  },
  {
    id: "gauklerbuehne",
    name: "Gauklerbühne der Goldkelchen",
    kind: "guild",
    districtId: "handwerkerviertel",
    u: 0.55,
    v: 0.66,
    summary: "Bretter vor den Essen. Die Goldkelchen tanzen laut — und tragen leise Botschaften.",
    guildId: "goldkelchen",
    prosperityLevel: 2,
    isHotspot: 44,
    specialBonus: {
      name: "Gaukelspiel",
      effect: "Während eines Auftritts gelten Ablenkungsmanöver im Viertel als erleichtert.",
    },
  },
  // —— Südtor (bestehende Orte) ——
  {
    id: "loewentor",
    name: "Löwentor",
    kind: "gate",
    districtId: "suedtor",
    u: 0.5,
    v: 0.9,
    summary: "Zwei Löwen am Südausgang. Zoll und Garde teilen sich den Torbogen, die Schmuggler die Schatten.",
    landmark: "suedtor",
    guildId: "stadtwachen",
    prosperityLevel: 2,
    isHotspot: 55,
    specialBonus: {
      name: "Zollschatten",
      effect: "Schmuggelproben am Löwentor erhalten +1 bei Nacht oder starkem Regen.",
    },
  },
  {
    id: "allee",
    name: "Taverne zur Allee",
    kind: "tavern",
    districtId: "suedtor",
    u: 0.54,
    v: 0.72,
    summary: "An der grünen Prozessionsallee. Händler trinken, bevor sie das Tor nehmen.",
    landmark: "wirtshaus",
    guildId: "goldkelchen",
    prosperityLevel: 2,
    isHotspot: 48,
    specialBonus: {
      name: "Torgerücht",
      effect: "Ein Abend an der Allee liefert Nachrichten über ankommende Karawanen und Flüchtlinge.",
    },
  },
  // —— Unterstadt ——
  {
    id: "westmarkt",
    name: "Westmarkt",
    kind: "market",
    districtId: "unterstadt",
    u: 0.34,
    v: 0.62,
    summary:
      "Stände vor den roten Dächern. Das Haus der Seide hält den teuersten Stand — Ware, Diebstahl und Gerüchte teilen sich das Tuch.",
    landmark: "kraemer",
    guildId: "haus-der-seide",
    prosperityLevel: 2,
    isHotspot: 62,
    specialBonus: {
      name: "Marktwucher",
      effect: "Preise am Westmarkt schwanken: Würfel 1W6 — ungerade = −20 %, gerade = +20 %.",
    },
  },
  {
    id: "rote-laterne",
    name: "Taverne Rote Laterne",
    kind: "tavern",
    districtId: "unterstadt",
    u: 0.31,
    v: 0.74,
    summary: "Eng, laut, und die Wache kommt spät. Im Keller wird Malanthir nicht nur geflüstert.",
    guildId: "rotes-auge",
    prosperityLevel: 1,
    isHotspot: 78,
    specialBonus: {
      name: "Kellerflüstern",
      effect: "Kontakte zum Roten Auge starten vertrauensvoller; Garde-Proben hier sind erschwert.",
    },
  },
  {
    id: "malanthir-umschlagplatz",
    name: "Malanthir-Umschlagplatz",
    kind: "guild",
    districtId: "unterstadt",
    u: 0.28,
    v: 0.68,
    summary: "Verdeckter Hof des Roten Auges. Kisten ohne Siegel, Wege ohne Namen, Ware die niemand sehen soll.",
    guildId: "rotes-auge",
    prosperityLevel: 1,
    isHotspot: 88,
    specialBonus: {
      name: "Schwarzer Umschlag",
      effect: "Verbotene Güter können einmal pro Nacht ohne öffentliche Spur umgeschlagen werden.",
    },
  },
  {
    id: "wachenstube-rot",
    name: "Wachstube Rote Gassen",
    kind: "gate",
    districtId: "unterstadt",
    u: 0.38,
    v: 0.7,
    summary: "Dünn besetzte Stube der Stadtwachen. Unterwandert, überfordert — und trotzdem da.",
    guildId: "stadtwachen",
    prosperityLevel: 1,
    isHotspot: 70,
    specialBonus: {
      name: "Bestechliche Patrouille",
      effect: "Mit Gold oder Drohung lässt sich eine Patrouille für eine Szene abziehen.",
    },
  },
];

export function findDistrict(id: string | null) {
  if (!id) return null;
  return AURENFURT_DISTRICTS.find((district) => district.id === id) ?? null;
}

export function findBuilding(id: string | null, buildings: CityBuilding[] = CITY_BUILDINGS) {
  if (!id) return null;
  return buildings.find((building) => building.id === id) ?? null;
}

export function buildingsInDistrict(id: CityDistrictId, buildings: CityBuilding[] = CITY_BUILDINGS) {
  return buildings.filter((building) => building.districtId === id);
}

export function sameSelection(a: HoloSelection | null, b: HoloSelection | null) {
  if (!a || !b) return false;
  return a.type === b.type && a.id === b.id;
}

export function subjectFromSelection(
  selection: HoloSelection | null,
  buildings: CityBuilding[] = CITY_BUILDINGS,
  pois: Array<{
    id: string;
    name: string;
    kind: string;
    description: string;
    districtId: CityDistrictId;
  }> = [],
): SimSubject | null {
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
      districtId: district.id,
    };
  }
  if (selection.type === "poi") {
    const poi = pois.find((entry) => entry.id === selection.id);
    if (!poi) return null;
    return {
      id: poi.id,
      type: "poi",
      name: poi.name,
      kicker: poi.kind,
      summary: poi.description,
      districtId: poi.districtId,
    };
  }
  const building = findBuilding(selection.id, buildings);
  if (!building) return null;
  const district = findDistrict(building.districtId);
  return {
    id: building.id,
    type: "building",
    name: building.name,
    kicker: district?.name ?? "Ort",
    summary: building.summary,
    districtId: building.districtId,
  };
}
