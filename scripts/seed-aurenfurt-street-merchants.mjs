/**
 * Seed: 9 Laden/Geschäft-POIs + Unique-Shops + Merchant-NPCs (Aurenfurt).
 * Run: node scripts/seed-aurenfurt-street-merchants.mjs
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnv() {
  const envPath = path.join(root, ".env.local");
  const raw = fs.readFileSync(envPath, "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    env[m[1]] = m[2].replace(/^"|"$/g, "").trim();
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase env");

const sb = createClient(url, key, { auth: { persistSession: false } });

const WORLD = "689a0f11-7aa3-440b-9527-c6da0a84aebb";
const CAMPAIGN = "6477a162-4c6d-484b-9bbe-7084cc2e6500";

const DIST = {
  unterstadt: "334d42e3-d15c-488a-9ae0-213ec914ba12",
  handwerkerviertel: "38c8a9fc-75cb-41fc-a8fc-4fa98996bf1a",
  adelsviertel: "7a7b969e-cb22-4bc6-9356-4119442986fe",
  akademieviertel: "ac085f28-1167-4a29-9494-074f3ce61012",
  suedtor: "a0a973ce-e497-48f9-87cf-75cad40e8ea3",
  tempelbezirk: "404d414c-7005-43b9-979a-077ea531177d",
};

const FACTION = {
  auge: "d7881e53-c195-6a9b-0f27-7a661916f0cb",
  zunft: "ae059a20-92ee-be1e-f2eb-e7ef7805136a",
  seide: "dbc3ce0c-7b2b-e503-1220-75cddf54be7e",
  gold: "4fcde874-a3e9-8157-4c1a-c8fbd942cb11",
  rose: "9ee8263f-ca61-3ced-de1d-490a3bc2d0c4",
  zirkel: "222e7ed3-3511-3e12-1997-7f5f6198efd6",
  nord: "d00e912f-930b-083c-2d08-1a58e888cea2",
};

const LOC = (n) => `aaf10001-0001-4000-8000-00000000000${n}`;
const SHOP = (n) => `aaf20001-0001-4000-8000-00000000000${n}`;
const NPC = (n) => `aaf30001-0001-4000-8000-00000000000${n}`;

const merchants = [
  {
    n: 1,
    shopName: "Fundstücke vom Kieselschweif",
    shopNotes: "Findus — Hehlerware & Schnäppchen",
    priceMod: 0,
    locName: "Stand des Kieselschweifs",
    district: "unterstadt",
    parent: DIST.unterstadt,
    u: 0.312,
    v: 0.71,
    locDesc:
      "Ein überladener Tuchstand zwischen den roten Gassen. Findus Kieselschweif preist „kostbare Fundstücke“ an — manches ist ein Schnäppchen, manches fiel vom Wagen.",
    reach: { mode: "sector", radius: 2 },
    influences: [
      { aspect: "crime", delta: 8 },
      { aspect: "malanthir", delta: 4 },
      { aspect: "economy", delta: 3 },
      { aspect: "guard", delta: -3 },
    ],
    npc: {
      name: "Findus Kieselschweif",
      title: "Fundstückhändler",
      role: "Straßenhändler / Hehler",
      race: "Gnom",
      alignment: "Neutral Evil",
      description:
        "Ein gieriger kleiner Gnom, der scheinbar kostbare Stücke an den Mann bringt. Er wirkt ehrlich, verschweigt aber, dass seine Ware oft „vom Wagen gefallen“ ist. Dietriche und Diebeswerkzeug bekommt man bei ihm ebenso wie Schnäppchen.",
      appearance: "Spitze Mütze, flinke Finger, immer ein Lächeln und eine Ausrede bereit.",
      personality_traits: "Gierig, charmant, nie ganz ehrlich.",
      gm_notes: "Zahlt Schutz an das Rote Auge; gute Quelle für Diebeswerkzeug.",
      hidden_agenda: "Heiße Ware umschlagen, ohne Spuren.",
      true_nature: "Hehler hinter Händlerlächeln.",
      city_faction_id: "rotes-auge",
      faction_id: FACTION.auge,
      city_influence_tier: "local",
      axes: { loyal: 3, greedy: -4, pious: 1, reason: -1 },
      city_agenda: "Schnäppchen und Hehlerware in der Unterstadt halten.",
    },
    items: [
      {
        name: "Dietriche (Diebeswerkzeug)",
        description: "Komplettes Set nach PHB — Findus schwört, es sei „gefunden“.",
        base_price_gp: 18,
        item_type: "gear",
        rarity: "common",
        is_legal: false,
      },
      {
        name: "Brecheisen",
        description: "Solides Eisen; nützlich für Türen und Kisten.",
        base_price_gp: 2,
        item_type: "gear",
        rarity: "common",
      },
      {
        name: "Kugellager (Beutel)",
        description: "100 Stahlkugeln — klassische Stolperfalle (PHB).",
        base_price_gp: 1,
        item_type: "gear",
        rarity: "common",
      },
      {
        name: "Verkleidungsset",
        description: "Perücken, Schminke, Requisiten (PHB).",
        base_price_gp: 22,
        item_type: "gear",
        rarity: "common",
        is_legal: false,
      },
      {
        name: "Trank des Kletterns",
        description: "Gewöhnlicher Klettertrank (DMG) — Etikett halb abgerissen.",
        base_price_gp: 40,
        item_type: "potion",
        rarity: "common",
        is_magical: true,
      },
      {
        name: "Dolch „Zufallsfund“",
        description: "Einfacher Dolch mit fremdem Wappen am Heft.",
        base_price_gp: 1.5,
        item_type: "weapon",
        rarity: "common",
      },
    ],
  },
  {
    n: 2,
    shopName: "Straßenesse Hauerkopf",
    shopNotes: "Troldorksch — ehrliche Metallarbeit",
    priceMod: 0,
    locName: "Offene Esse Hauerkopf",
    district: "handwerkerviertel",
    parent: DIST.handwerkerviertel,
    u: 0.705,
    v: 0.735,
    locDesc:
      "Offener Straßenstand am Kupfermarkt: Amboss, Funken, ehrliche Arbeit. Troldorksch Hauerkopf repariert Räder, richtet Nägel und verkauft taugliche Waffen.",
    reach: { mode: "sector", radius: 2 },
    influences: [
      { aspect: "economy", delta: 6 },
      { aspect: "unemployment", delta: -4 },
      { aspect: "prestige", delta: 2 },
    ],
    npc: {
      name: "Troldorksch Hauerkopf",
      title: "Straßenschmied",
      role: "Schmied / Straßenhändler",
      race: "Halbork",
      alignment: "Lawful Neutral",
      description:
        "Ein fleißiger Halborkschmied mit offenem Stand. Äußerlich durchtrieben und animalisch — innerlich ehrlich. Er krümmt keiner Fliege etwas und passt sich den Gegebenheiten an.",
      appearance: "Breite Schultern, Stoßzähne, rußige Schürze, ruhige Augen.",
      personality_traits: "Wortkarg, fair, arbeitsam.",
      gm_notes: "Zunftfreundlich; gute Einstiegsquellen für einfache Waffen.",
      hidden_agenda: "Unabhängig bleiben von Seiden-Standgebühren.",
      true_nature: "Sanfter Riese hinter Orkaußenhaut.",
      city_faction_id: "zunftbund",
      faction_id: FACTION.zunft,
      city_influence_tier: "local",
      axes: { loyal: -2, greedy: 1, pious: 0, reason: 2 },
      city_agenda: "Ehrliche Metallarbeit am Kupfermarkt.",
    },
    items: [
      {
        name: "Handaxt",
        description: "Einfache Handaxt (PHB).",
        base_price_gp: 5,
        item_type: "weapon",
        rarity: "common",
      },
      {
        name: "Streitkolben",
        description: "Solider Kolben — Troldorkschs Lieblingsform.",
        base_price_gp: 5,
        item_type: "weapon",
        rarity: "common",
      },
      {
        name: "Schmiedewerkzeug",
        description: "Handwerkszeug-Set für Metallarbeit (PHB).",
        base_price_gp: 20,
        item_type: "gear",
        rarity: "common",
      },
      {
        name: "Nagelsack & Radreparatur",
        description: "Service: Wagenrad richten und Nägel nachschlagen (ein Einsatz).",
        base_price_gp: 3,
        item_type: "service",
        rarity: "common",
      },
      {
        name: "Leichter Hammer",
        description: "Werkzeug und Waffe (PHB).",
        base_price_gp: 2,
        item_type: "weapon",
        rarity: "common",
      },
      {
        name: "Dolch (zunftgeprüft)",
        description: "Sauber geschmiedeter Dolch mit Zunftstempel.",
        base_price_gp: 2,
        item_type: "weapon",
        rarity: "common",
      },
    ],
  },
  {
    n: 3,
    shopName: "Mixturen Ferrendisch",
    shopNotes: "Gaysimir — Kräuter & Versuchstränke",
    priceMod: -5,
    locName: "Kräuterbude Ferrendisch",
    district: "tempelbezirk",
    parent: DIST.tempelbezirk,
    u: 0.74,
    v: 0.41,
    locDesc:
      "Duftende Kräuterbude nahe den heiligen Höfen. Gaysimir Ferrendisch verkauft Mixturen — manche widerlich, manche mit „durchschlagendem“ Erfolg. Tester willkommen.",
    reach: { mode: "sector", radius: 2 },
    influences: [
      { aspect: "vattrak", delta: 3 },
      { aspect: "economy", delta: 2 },
      { aspect: "religion", delta: 2 },
    ],
    npc: {
      name: "Gaysimir Ferrendisch",
      title: "Kräutermixtierer",
      role: "Alchemist / Kräuterhändler",
      race: "Mensch",
      alignment: "Chaotic Neutral",
      description:
        "Verkauft seltene Kräutermixturen, auch solche, die angeblich Haupthaar sprießen lassen. Manche Tränke riechen widerlich; einige wirken stark. Er verkauft günstig und sucht Tester.",
      appearance: "Fleckiger Mantel, grüne Finger, immer ein Fläschchen in der Hand.",
      personality_traits: "Enthusiastisch, unvorsichtig, überzeugend.",
      gm_notes: "Homebrew-Haartrank unzuverlässig; echte Heiltränke korrekt.",
      hidden_agenda: "Tester für riskante Mixturen finden.",
      true_nature: "Forscher mit zu wenig Geduld.",
      city_faction_id: null,
      faction_id: null,
      city_influence_tier: "local",
      axes: { loyal: 0, greedy: 1, pious: -1, reason: -2 },
      city_agenda: "Mixturen testen und verkaufen.",
    },
    items: [
      {
        name: "Heiltrank",
        description: "Potion of Healing (DMG) — 2W4+2 TP.",
        base_price_gp: 45,
        item_type: "potion",
        rarity: "common",
        is_magical: true,
      },
      {
        name: "Gegengift",
        description: "Antitoxin (PHB) — Vorteil gegen Gift für 1 Stunde.",
        base_price_gp: 50,
        item_type: "potion",
        rarity: "common",
      },
      {
        name: "Kräuterkunde-Set",
        description: "Herbalism kit (PHB).",
        base_price_gp: 5,
        item_type: "gear",
        rarity: "common",
      },
      {
        name: "Trank der Tierfreundschaft",
        description: "Potion of Animal Friendship (DMG).",
        base_price_gp: 150,
        item_type: "potion",
        rarity: "uncommon",
        is_magical: true,
      },
      {
        name: "Ferrendischs Haarwuchs-Elixier",
        description:
          "Homebrew: 50% Chance auf sichtbares Haarwachstum für 24h, sonst nur Gestank (Kon-SG 12 oder angewidert).",
        base_price_gp: 8,
        item_type: "potion",
        rarity: "common",
        is_magical: true,
      },
      {
        name: "„Durchschlagende“ Magenmixtur",
        description:
          "Homebrew-Testertrank: heilt 1W4 TP, aber SG 13 Kon oder 1 Runde Unwohlsein (Nachteil auf Charisma).",
        base_price_gp: 12,
        item_type: "potion",
        rarity: "common",
        is_magical: true,
      },
    ],
  },
  {
    n: 4,
    shopName: "Kuriositäten Himmel",
    shopNotes: "Konrad — Antiquitäten & Risiko",
    priceMod: 10,
    locName: "Kuriositätenladen Himmel",
    district: "adelsviertel",
    parent: DIST.adelsviertel,
    u: 0.48,
    v: 0.18,
    locDesc:
      "Gedämpfter Salonladen mit Vitrinen. Konrad Himmel sammelt sonderliche Artefakte — manches unverkäuflich, manches „Gebrauch auf eigene Gefahr“.",
    reach: { mode: "sector", radius: 2 },
    influences: [
      { aspect: "prestige", delta: 5 },
      { aspect: "knowledge", delta: 4 },
      { aspect: "malanthir", delta: 3 },
      { aspect: "economy", delta: 3 },
    ],
    npc: {
      name: "Konrad Himmel",
      title: "Antiquar",
      role: "Sammler / Händler",
      race: "Mensch",
      alignment: "True Neutral",
      description:
        "Sammler von Antiquitäten und sonderlichen Artefakten. Seltsames und angeblich Verfluchtes findet man bei ihm. Manches behält er nur; Verkaufenes trägt den Hinweis „Gebrauch auf eigene Gefahr“.",
      appearance: "Graue Schläfen, Samtweste, Handschuhe, immer ein Monokel.",
      personality_traits: "Zurückhaltend, kenntnisreich, preisbewusst.",
      gm_notes: "Gute Quelle für cursed/strange Hooks; teure Raritäten.",
      hidden_agenda: "Ein bestimmtes Artefakt vervollständigen.",
      true_nature: "Besessener Sammler hinter Höflichkeit.",
      city_faction_id: "haeuser-des-nordens",
      faction_id: FACTION.nord,
      city_influence_tier: "regional_economy",
      axes: { loyal: 0, greedy: -2, pious: 1, reason: -1 },
      city_agenda: "Kuriositätenhandel im Adelsviertel.",
    },
    items: [
      {
        name: "Staub des Verschwindens",
        description: "Dust of Disappearance (DMG).",
        base_price_gp: 300,
        item_type: "gear",
        rarity: "uncommon",
        is_magical: true,
      },
      {
        name: "Beutel der Tricks (grau)",
        description: "Bag of Tricks, gray (DMG).",
        base_price_gp: 250,
        item_type: "gear",
        rarity: "uncommon",
        is_magical: true,
      },
      {
        name: "Sendestein (einzelner)",
        description: "Ein Stein ohne Partner — Konrad sucht den Zwilling.",
        base_price_gp: 100,
        item_type: "gear",
        rarity: "uncommon",
        is_magical: true,
      },
      {
        name: "Spiegel der flüsternden Namen",
        description:
          "Homebrew: 1/Tag flüstert er einen wahren Namen in der Nähe (SG 14 Einsicht). 10% Chance auf leichten Fluch (Nachteil auf Wahrnehmung bis Entfernung).",
        base_price_gp: 450,
        item_type: "gear",
        rarity: "rare",
        is_magical: true,
        is_legal: true,
      },
      {
        name: "Verzierter Ritualdolch",
        description: "Nicht magisch, aber unheimlich — guter Story-Hook.",
        base_price_gp: 75,
        item_type: "weapon",
        rarity: "common",
      },
      {
        name: "Idolkopf aus Basalt",
        description: "Unverkäuflich laut Schild — Konrad nennt trotzdem einen irren Preis.",
        base_price_gp: 2000,
        item_type: "gear",
        rarity: "rare",
      },
    ],
  },
  {
    n: 5,
    shopName: "Holzwerk Jesspin",
    shopNotes: "Sharlandi — Bögen & druidisches Holz",
    priceMod: 0,
    locName: "Holzwerkstatt Jesspin",
    district: "tempelbezirk",
    parent: DIST.tempelbezirk,
    u: 0.78,
    v: 0.26,
    locDesc:
      "Ruhige Werkstatt bei den heiligen Bäumen. Sharlandi Jesspin ehrt jedes Holzstück — Bögen, Pfeile und erfinderische Holzmagie.",
    reach: { mode: "sector", radius: 2 },
    influences: [
      { aspect: "elysia", delta: 4 },
      { aspect: "vattrak", delta: 3 },
      { aspect: "economy", delta: 2 },
    ],
    npc: {
      name: "Sharlandi Jesspin",
      title: "Meisterin des Holzes",
      role: "Bogenmacherin / Holzmagierin",
      race: "Halbelfin",
      alignment: "Neutral Good",
      description:
        "Halbelfin und Meisterin des Holzes: besondere Bögen, Pfeile, Bolzen — und erfinderische Stücke wie ein magischer Stuhl, der auf Handgröße schrumpft. Druidische Natur, verehrt Holz.",
      appearance: "Blätter im Haar, geschickte Hände, ruhige Stimme.",
      personality_traits: "Geduldig, erfinderisch, respektvoll gegenüber Natur.",
      gm_notes: "Passt zu Elysia/Rose; gute Fernkampfquelle.",
      hidden_agenda: "Heilige Haine vor Abholzung schützen.",
      true_nature: "Druidin im Handwerksmantel.",
      city_faction_id: "bund-silberne-rose",
      faction_id: FACTION.rose,
      city_influence_tier: "local",
      axes: { loyal: -1, greedy: 3, pious: -3, reason: 0 },
      city_agenda: "Holzwerk und Bogenkunst ehren.",
    },
    items: [
      {
        name: "Langbogen",
        description: "Longbow (PHB).",
        base_price_gp: 50,
        item_type: "weapon",
        rarity: "common",
      },
      {
        name: "Kurzbogen",
        description: "Shortbow (PHB).",
        base_price_gp: 25,
        item_type: "weapon",
        rarity: "common",
      },
      {
        name: "Pfeile (20)",
        description: "Köcher mit 20 Pfeilen.",
        base_price_gp: 1,
        item_type: "gear",
        rarity: "common",
      },
      {
        name: "Armbrustbolzen (20)",
        description: "20 Bolzen.",
        base_price_gp: 1,
        item_type: "gear",
        rarity: "common",
      },
      {
        name: "Pfeile +1 (10)",
        description: "Ammunition +1 (DMG) — Jesspin-Holz.",
        base_price_gp: 80,
        item_type: "gear",
        rarity: "uncommon",
        is_magical: true,
      },
      {
        name: "Wanderstuhl der Handfläche",
        description:
          "Homebrew: Bonusaktion schrumpfen auf Handgröße / zurück. Bequem wie ein Stuhl; kein Kampfvorteil.",
        base_price_gp: 120,
        item_type: "gear",
        rarity: "uncommon",
        is_magical: true,
      },
    ],
  },
  {
    n: 6,
    shopName: "Instrumente Goward",
    shopNotes: "Goward — Meisterinstrumente",
    priceMod: 5,
    locName: "Klangstand Goward",
    district: "handwerkerviertel",
    parent: DIST.handwerkerviertel,
    u: 0.575,
    v: 0.675,
    locDesc:
      "Neben der Gauklerbühne: Trommeln, Saiten und Absurditäten. Goward, Bärwesen, baut und spielt Instrumente — auch einen Dudelsack aus Riesenauster.",
    reach: { mode: "sector", radius: 2 },
    influences: [
      { aspect: "prestige", delta: 3 },
      { aspect: "economy", delta: 3 },
      { aspect: "crime", delta: -1 },
    ],
    npc: {
      name: "Goward",
      title: "Klangmeister",
      role: "Instrumentenbauer / Musiker",
      race: "Tiermensch (Bärwesen)",
      alignment: "Chaotic Good",
      description:
        "Ein Bärwesen, halb Mensch halb Bär, Meister im Bau und Spiel von Instrumenten — auch Absurditäten wie dem Dudelsack aus einer Riesenauster.",
      appearance: "Braunes Fell, große Tatzen, überraschend zärtlich an Saiten.",
      personality_traits: "Warmherzig, laut, künstlerisch.",
      gm_notes: "Goldkelchen-freundlich; Bardengerät.",
      hidden_agenda: "Ein Konzert für ganz Aurenfurt organisieren.",
      true_nature: "Künstlerseele in Bärenkörper.",
      city_faction_id: "goldkelchen",
      faction_id: FACTION.gold,
      city_influence_tier: "local",
      axes: { loyal: -1, greedy: 0, pious: 0, reason: -1 },
      city_agenda: "Musik und Instrumente verbreiten.",
    },
    items: [
      {
        name: "Laute",
        description: "Lute (PHB).",
        base_price_gp: 35,
        item_type: "gear",
        rarity: "common",
      },
      {
        name: "Flöte",
        description: "Flute (PHB).",
        base_price_gp: 2,
        item_type: "gear",
        rarity: "common",
      },
      {
        name: "Trommel",
        description: "Drum (PHB).",
        base_price_gp: 6,
        item_type: "gear",
        rarity: "common",
      },
      {
        name: "Horn",
        description: "Horn (PHB).",
        base_price_gp: 3,
        item_type: "gear",
        rarity: "common",
      },
      {
        name: "Dudelsack der Riesenauster",
        description:
          "Homebrew: als Dudelsack. 1/Tag: alle in 15 ft SG 13 Kon oder taub 1 Minute (Lärm). Vorteil auf Aufführungsproben bei Hafenvolk.",
        base_price_gp: 180,
        item_type: "gear",
        rarity: "uncommon",
        is_magical: true,
      },
      {
        name: "Saitenersatz-Set",
        description: "Ersatzsaiten und Harz für Pflege.",
        base_price_gp: 5,
        item_type: "gear",
        rarity: "common",
      },
    ],
  },
  {
    n: 7,
    shopName: "Backofen Finkenfauch",
    shopNotes: "Ratali — belebende Gebäcke",
    priceMod: 0,
    locName: "Backstand Finkenfauch",
    district: "suedtor",
    parent: DIST.suedtor,
    u: 0.52,
    v: 0.86,
    locDesc:
      "Duftender Stand am Südtor. Ratali Finkenfauchs wilde Gebäcke halten Soldaten und Abenteurer wach — beliebt vor dem Ausmarsch.",
    reach: { mode: "sector", radius: 2 },
    influences: [
      { aspect: "economy", delta: 4 },
      { aspect: "refugees", delta: -2 },
      { aspect: "unemployment", delta: -2 },
    ],
    npc: {
      name: "Ratali Finkenfauch",
      title: "Meisterbäcker",
      role: "Bäcker",
      race: "Gnom",
      alignment: "Neutral Good",
      description:
        "Dickbäuchiger Gnom und besonderer Bäcker. Seine wilden Gebäcke sind bei Soldaten und Abenteurern beliebt — belebend, halten lange wach.",
      appearance: "Mehlstaub, runder Bauch, immer ein Brezel am Gürtel.",
      personality_traits: "Jovial, experimentierfreudig, großzügig mit Kostproben.",
      gm_notes: "Gute Rations-/Buff-Quelle; Südtor-Karawanen.",
      hidden_agenda: "Das ultimative Wachgebäck erfinden.",
      true_nature: "Fürsorglicher Versorger.",
      city_faction_id: null,
      faction_id: null,
      city_influence_tier: "local",
      axes: { loyal: -1, greedy: 2, pious: 0, reason: 1 },
      city_agenda: "Torwache und Reisende stärken.",
    },
    items: [
      {
        name: "Tagesrationen (1 Tag)",
        description: "Rations (PHB).",
        base_price_gp: 0.5,
        item_type: "gear",
        rarity: "common",
        is_ration_package: true,
      },
      {
        name: "Wachbrot der Wachsamkeit",
        description:
          "Homebrew: 8 Stunden kein Erschöpfungsvorteil durch Schlafmangel (kein Ersatz für Lange Rast-Zauberheilung). Danach 1 Stufe Erschöpfung wenn missbraucht.",
        base_price_gp: 15,
        item_type: "potion",
        rarity: "common",
        is_magical: true,
        is_ration_package: true,
      },
      {
        name: "Heldenbrezel",
        description: "Homebrew: einmalig +1W4 auf einen Angriffs- oder Attributswurf in der nächsten Stunde.",
        base_price_gp: 25,
        item_type: "potion",
        rarity: "uncommon",
        is_magical: true,
        is_ration_package: true,
      },
      {
        name: "Reisekekse (7 Tage)",
        description: "Kompakte Rationen für eine Woche.",
        base_price_gp: 3,
        item_type: "gear",
        rarity: "common",
        is_ration_package: true,
      },
      {
        name: "Honigkuchen der Widerstandskraft",
        description: "Homebrew: Vorteil auf den nächsten Kon-Rettungswurf innerhalb 1 Stunde.",
        base_price_gp: 20,
        item_type: "potion",
        rarity: "common",
        is_magical: true,
        is_ration_package: true,
      },
      {
        name: "Frischbrotlaib",
        description: "Nicht magisch, aber berühmt — Moralhoch für die Gruppe.",
        base_price_gp: 0.2,
        item_type: "gear",
        rarity: "common",
        is_ration_package: true,
      },
    ],
  },
  {
    n: 8,
    shopName: "Salvanders Beschaffung",
    shopNotes: "Sekur — Luxus & Kontakte",
    priceMod: 15,
    locName: "Salon Salvander",
    district: "adelsviertel",
    parent: DIST.adelsviertel,
    u: 0.42,
    v: 0.2,
    locDesc:
      "Orientalisch anmutender Salon nahe dem Seidenmarkt. Sekur Salvander beschafft fast alles — zwielichtig, aber treu, wer zahlt.",
    reach: { mode: "sector", radius: 3 },
    influences: [
      { aspect: "prestige", delta: 6 },
      { aspect: "economy", delta: 5 },
      { aspect: "crime", delta: 3 },
    ],
    npc: {
      name: "Sekur Salvander",
      title: "Beschaffer",
      role: "Fixer / Luxushändler",
      race: "Mensch",
      alignment: "Lawful Evil",
      description:
        "Orientalisch angehauchter älterer Mann. Behauptet, fast alles besorgen zu können. Zwielichtig, aber treu ergeben, wer zahlt — weitreichende Kontakte und luxuriöse Güter.",
      appearance: "Seidene Schärpe, dunkle Augen, goldene Ringe, ruhige Stimme.",
      personality_traits: "Höflich, berechnend, absolut diskret bei Zahlern.",
      gm_notes: "Seide-nah; gute Quest-Beschaffer-Figur.",
      hidden_agenda: "Schuldner im Adel anbinden.",
      true_nature: "Netzwerker mit zwei Preisschildern.",
      city_faction_id: "haus-der-seide",
      faction_id: FACTION.seide,
      city_influence_tier: "regional_economy",
      axes: { loyal: 1, greedy: -4, pious: 2, reason: 1 },
      city_agenda: "Luxus und Gefälligkeiten gegen Gold.",
    },
    items: [
      {
        name: "Feine Kleidung",
        description: "Fine clothes (PHB).",
        base_price_gp: 15,
        item_type: "gear",
        rarity: "common",
      },
      {
        name: "Parfüm (Flakon)",
        description: "Kostbares Parfüm für Salons.",
        base_price_gp: 5,
        item_type: "gear",
        rarity: "common",
      },
      {
        name: "Fernrohr",
        description: "Spyglass (PHB).",
        base_price_gp: 1000,
        item_type: "gear",
        rarity: "common",
      },
      {
        name: "Seidenes Seil (50 ft)",
        description: "Silk rope (PHB).",
        base_price_gp: 10,
        item_type: "gear",
        rarity: "common",
      },
      {
        name: "Einführungsschreiben (Adel)",
        description: "Service: ein glaubwürdiges Empfehlungsschreiben für einen Salonbesuch.",
        base_price_gp: 50,
        item_type: "service",
        rarity: "common",
      },
      {
        name: "Gewürzschatulle aus dem Süden",
        description: "Luxusware — Statussymbol mehr als Nahrung.",
        base_price_gp: 80,
        item_type: "material",
        rarity: "uncommon",
      },
    ],
  },
  {
    n: 9,
    shopName: "Kramms Wissenschatz",
    shopNotes: "Robert — Bücher & Übersetzung",
    priceMod: 8,
    locName: "Buchladen Kramm",
    district: "akademieviertel",
    parent: DIST.akademieviertel,
    u: 0.22,
    v: 0.39,
    locDesc:
      "Am Runenmarkt: Vitrinen, Staub und Wissen. Robert Kramm jagt dem nächsten Wissenschatz hinterher und übersetzt Schriften — gut bezahlt.",
    reach: { mode: "sector", radius: 2 },
    influences: [
      { aspect: "knowledge", delta: 8 },
      { aspect: "prestige", delta: 3 },
      { aspect: "economy", delta: 2 },
    ],
    npc: {
      name: "Robert Kramm",
      title: "Bücherjäger",
      role: "Buchhändler / Übersetzer",
      race: "Mensch",
      alignment: "Lawful Neutral",
      description:
        "Fasziniert von Büchern; behauptet eine umfassende Sammlung wertvoller Unikate zu besitzen (viele in Vitrinen). Hervorragender Schriftenübersetzer, lässt sich gut bezahlen.",
      appearance: "Brille, Tintenfinger, Tweed und Kreidegeruch.",
      personality_traits: "Pedantisch, neugierig, preisbewusst bei Wissen.",
      gm_notes: "Zirkel-freundlich; Lore-Hooks und Scrolls.",
      hidden_agenda: "Ein verbotenes Grimoire aufspüren.",
      true_nature: "Wissensgieriger Archivar.",
      city_faction_id: "zirkel-observatorium",
      faction_id: FACTION.zirkel,
      city_influence_tier: "regional_economy",
      axes: { loyal: -1, greedy: -2, pious: 1, reason: 3 },
      city_agenda: "Wissen sammeln und verkaufen.",
    },
    items: [
      {
        name: "Leeres Zauberbuch",
        description: "Spellbook (leer) — 100 Seiten.",
        base_price_gp: 50,
        item_type: "gear",
        rarity: "common",
      },
      {
        name: "Buch der Geschichte Aurenfurts",
        description: "Vorteil auf eine Wissensprobe zu Aurenfurt (einmalig).",
        base_price_gp: 40,
        item_type: "gear",
        rarity: "common",
      },
      {
        name: "Schriftrolle Schutz vor Bösem und Gutem",
        description: "Spell scroll Protection from Evil and Good (1st).",
        base_price_gp: 90,
        item_type: "gear",
        rarity: "common",
        is_magical: true,
      },
      {
        name: "Übersetzung (1 Seite)",
        description: "Service: fachgerechte Übersetzung einer Seite.",
        base_price_gp: 15,
        item_type: "service",
        rarity: "common",
      },
      {
        name: "Traktat der Verständigung",
        description:
          "Homebrew-Ausgabe angelehnt an Tome of Understanding — nicht der legendäre Wälzer, sondern Studie: nach 48h Studium Sprache +1 Tag Vorteil auf Wissensproben.",
        base_price_gp: 200,
        item_type: "gear",
        rarity: "uncommon",
        is_magical: true,
      },
      {
        name: "Vitrinen-Unikat: Sternenkarte",
        description: "Seltene Karte — teuer, akademisch begehrt.",
        base_price_gp: 350,
        item_type: "gear",
        rarity: "rare",
      },
    ],
  },
];

async function must(label, res) {
  if (res.error) {
    console.error(label, res.error);
    throw new Error(`${label}: ${res.error.message}`);
  }
  return res.data;
}

async function main() {
  const locIds = merchants.map((m) => LOC(m.n));
  const shopIds = merchants.map((m) => SHOP(m.n));
  const npcIds = merchants.map((m) => NPC(m.n));

  await sb.from("campaign_shop_items").delete().in("shop_id", shopIds);
  await sb.from("npcs").delete().in("id", npcIds);
  await sb.from("campaign_shops").delete().in("id", shopIds);
  await sb.from("locations").delete().in("id", locIds);
  await sb.from("world_lore").delete().in("id", locIds);

  const shops = merchants.map((m) => ({
    id: SHOP(m.n),
    campaign_id: CAMPAIGN,
    name: m.shopName,
    shop_mode: "unique",
    archetype_key: null,
    price_modifier_percent: m.priceMod,
    notes: m.shopNotes,
  }));
  await must("shops", await sb.from("campaign_shops").insert(shops));

  const items = [];
  for (const m of merchants) {
    m.items.forEach((item, i) => {
      items.push({
        shop_id: SHOP(m.n),
        sort_order: i,
        name: item.name,
        description: item.description,
        base_price_gp: item.base_price_gp,
        is_magical: Boolean(item.is_magical),
        is_legal: item.is_legal !== false,
        rarity: item.rarity,
        item_type: item.item_type,
        target_fap: 0,
        is_ration_package: Boolean(item.is_ration_package),
      });
    });
  }
  await must("items", await sb.from("campaign_shop_items").insert(items));

  const loreRows = merchants.map((m) => ({
    id: LOC(m.n),
    world_id: WORLD,
    name: m.locName,
    type: "Laden/Geschäft",
    description: m.locDesc,
    parent_id: m.parent,
    is_revealed: false,
    image_is_ai_generated: false,
    gm_notes: `Karten-POI für ${m.npc.name}. Shop: ${m.shopName}`,
  }));
  await must("lore", await sb.from("world_lore").insert(loreRows));

  const locRows = merchants.map((m) => ({
    id: LOC(m.n),
    world_id: WORLD,
    name: m.locName,
    type: "Laden/Geschäft",
    description: m.locDesc,
    parent_location_id: m.parent,
    map_u: m.u,
    map_v: m.v,
    map_district_id: m.district,
    map_poi_kind: "Laden/Geschäft",
    map_poi_influences: { influences: m.influences, reach: m.reach },
    created_via_map_editor: true,
    gm_notes: `Merchant-POI ${m.npc.name}`,
  }));
  await must("locations", await sb.from("locations").insert(locRows));

  const npcRows = merchants.map((m) => ({
    id: NPC(m.n),
    world_id: WORLD,
    name: m.npc.name,
    title: m.npc.title,
    role: m.npc.role,
    race: m.npc.race,
    alignment: m.npc.alignment,
    description: m.npc.description,
    appearance: m.npc.appearance,
    personality_traits: m.npc.personality_traits,
    gm_notes: m.npc.gm_notes,
    hidden_agenda: m.npc.hidden_agenda,
    true_nature: m.npc.true_nature,
    status: "Alive",
    faction_id: m.npc.faction_id,
    home_location_id: LOC(m.n),
    current_location_id: LOC(m.n),
    is_merchant: true,
    shop_id: SHOP(m.n),
    for_city_simulation: true,
    city_influence_tier: m.npc.city_influence_tier,
    city_faction_id: m.npc.city_faction_id,
    city_agenda: m.npc.city_agenda,
    city_axis_loyal_criminal: m.npc.axes.loyal,
    city_axis_greedy_altruist: m.npc.axes.greedy,
    city_axis_pious_skeptic: m.npc.axes.pious,
    city_axis_superstition_reason: m.npc.axes.reason,
    city_event_deck: [],
    city_abilities: [],
    city_card_plays: [],
    image_is_ai_generated: false,
    token_size_category: "medium",
  }));
  await must("npcs", await sb.from("npcs").insert(npcRows));

  console.log(
    JSON.stringify(
      {
        shops: shops.length,
        items: items.length,
        locations: locRows.length,
        npcs: npcRows.length,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
