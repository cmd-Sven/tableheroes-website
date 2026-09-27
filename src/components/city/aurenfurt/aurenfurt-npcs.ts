/**
 * Lokales Karten-Datenmodell für Aurenfurt-NPCs.
 * Felder decken den Narrative-/NPC-Wizard (NPCSchema / GeneratedNPCResult) ab
 * und ergänzen Karten-Attribute. Keine Schreibzugriffe auf Supabase.
 */

import {
  CITY_BUILDINGS,
  findBuilding,
  findDistrict,
  type CityDistrictId,
} from "./aurenfurt-districts";
import {
  AURENFURT_FACTIONS,
  factionName,
  findFaction,
  type FactionId,
} from "./aurenfurt-factions";
import { districtMetricsOn, utcToday } from "./aurenfurt-history";
import type { KeyLocation } from "./aurenfurt-locations";

export const NPC_PORTRAIT_PLACEHOLDER = "/images/npcs/npc-platzhalter.png";

/** Kartenrolle — getrennt vom Wizard-Feld `role` (Beruf/Titel). */
export type NpcMapRole = "leader" | "operator";

export type NpcDisposition =
  | "bestechlich"
  | "feindselig"
  | "neutral"
  | "opportunistisch"
  | "wohlwollend"
  | "misstrauisch";

export const DISPOSITION_LABELS: Record<NpcDisposition, string> = {
  bestechlich: "Bestechlich",
  feindselig: "Feindselig",
  neutral: "Neutral",
  opportunistisch: "Opportunistisch",
  wohlwollend: "Wohlwollend",
  misstrauisch: "Misstrauisch",
};

export type InfluenceAndLoyalty = {
  /** Einfluss im Viertel, 0–100 */
  influence: number;
  /** Tatsächliche Loyalität zur eigenen Fraktion/Agenda, 0–100 */
  loyalty: number;
  /** Kurze verborgene Agenda */
  agenda: string;
};

export type NpcNarrativeHook = {
  name?: string | null;
  role: string;
  description: string;
  is_alive: boolean;
};

export type NpcCheckResult = {
  type: string;
  dc: number;
  result: string;
  is_critical: boolean;
};

export type NpcAlignment =
  | "Lawful Good"
  | "Neutral Good"
  | "Chaotic Good"
  | "Lawful Neutral"
  | "True Neutral"
  | "Chaotic Neutral"
  | "Lawful Evil"
  | "Neutral Evil"
  | "Chaotic Evil";

export type NpcStatus = "Alive" | "Deceased" | "Missing" | "Unknown";

/**
 * Karten-NPC mit Wizard-Feldern (später als Prefill nutzbar)
 * plus map-spezifischen Verknüpfungen und Achsen.
 */
export type AurenfurtNpc = {
  id: string;
  mapRoles: NpcMapRole[];
  districtId: CityDistrictId;
  factionId: FactionId;
  /** Gesetzt, wenn Betreiber einer Key-Location */
  locationId: string | null;
  /**
   * Echte App-/DB-NPC-ID (UUID), sobald der Karten-NPC mit einem Eintrag verknüpft ist.
   * Ohne `recordId` gibt es keinen Detail-Link — lokale Map-IDs sind keine UUIDs.
   */
  recordId: string | null;

  // —— Wizard / NPCSchema ——
  name: string;
  title: string | null;
  /** Beruf / Rollentitel für den Wizard (nicht mapRoles) */
  role: string;
  race: string | null;
  status: NpcStatus;
  alignment: NpcAlignment;
  description: string;
  appearance: string | null;
  personality_traits: string | null;
  gm_notes: string | null;
  true_nature: string | null;
  hidden_agenda: string | null;
  secret_entry: string | null;
  faction_name_suggestion: string | null;
  current_location_name_suggestion: string | null;
  narrative_hooks: NpcNarrativeHook[];
  check_results: NpcCheckResult[];
  suggested_secret: { title: string; content: string } | null;

  // —— Neue Karten-Attribute ——
  influenceAndLoyalty: InfluenceAndLoyalty;
  darkSecret: string;
  /** Basis-Intel 0–100; Hook moduliert leicht an Kriminalität */
  intelValue: number;
  disposition: NpcDisposition;
  portraitUrl: string;
};

/** Prefill-Form für den Narrative-/KI-NPC-Wizard. */
export type AurenfurtNpcWizardPrefill = {
  name: string;
  title: string | null;
  role: string | null;
  race: string | null;
  status: string;
  alignment: string;
  description: string;
  appearance: string | null;
  personality_traits: string | null;
  gm_notes: string | null;
  narrative_hooks: NpcNarrativeHook[] | null;
  check_results: NpcCheckResult[];
  faction_name_suggestion: string | null;
  current_location_name_suggestion: string | null;
  true_nature: string | null;
  hidden_agenda: string | null;
  secret_entry: string | null;
  suggested_secret: { title: string; content: string } | null;
};

type NpcSeed = {
  id: string;
  mapRoles: NpcMapRole[];
  districtId: CityDistrictId;
  factionId: FactionId;
  locationId: string | null;
  name: string;
  title: string | null;
  role: string;
  race: string;
  alignment: NpcAlignment;
  description: string;
  appearance: string;
  personality_traits: string;
  gm_notes: string;
  true_nature: string;
  hidden_agenda: string;
  secret_entry: string;
  hooks: NpcNarrativeHook[];
  checks: NpcCheckResult[];
  influence: number;
  loyalty: number;
  agenda: string;
  darkSecret: string;
  intelValue: number;
  disposition: NpcDisposition;
};

/**
 * Lore-logische Hauptquartiere: Anführer = Betreiber dieses Ortes (kein Klon).
 */
export const FACTION_HQ_LOCATION: Record<FactionId, string> = {
  "rotes-auge": "malanthir-umschlagplatz",
  goldkelchen: "gauklerbuehne",
  "haus-der-seide": "seidenkontor",
  stadtwachen: "hofwache",
  "haeuser-des-nordens": "goldkuppel",
  "bund-silberne-rose": "rose-hof",
  "konklave-ewige-ordnung": "konklave-saal",
  zunftbund: "zunft",
};

function clamp01(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function locationName(id: string | null) {
  if (!id) return null;
  return findBuilding(id)?.name ?? id;
}

export type NpcDetailLinkContext = {
  worldId?: string | null;
  campaignId?: string | null;
};

/**
 * Baut die Detail-URL nur aus vorhandener DB-ID + Kontext.
 * Map-lokale IDs (`npc-op-…`) erzeugen keinen Link.
 */
export function npcDetailHref(
  npc: Pick<AurenfurtNpc, "recordId">,
  ctx: NpcDetailLinkContext = {},
): string | null {
  const recordId = npc.recordId?.trim();
  if (!recordId) return null;
  if (ctx.campaignId) return `/dashboard/campaigns/${ctx.campaignId}/npcs/${recordId}`;
  if (ctx.worldId) return `/dashboard/worlds/${ctx.worldId}/npcs/${recordId}`;
  return null;
}

function buildNpc(seed: NpcSeed): AurenfurtNpc {
  const faction = factionName(seed.factionId);
  const place = locationName(seed.locationId);
  return {
    id: seed.id,
    mapRoles: [...seed.mapRoles],
    districtId: seed.districtId,
    factionId: seed.factionId,
    locationId: seed.locationId,
    recordId: null,
    name: seed.name,
    title: seed.title,
    role: seed.role,
    race: seed.race,
    status: "Alive",
    alignment: seed.alignment,
    description: seed.description,
    appearance: seed.appearance,
    personality_traits: seed.personality_traits,
    gm_notes: seed.gm_notes,
    true_nature: seed.true_nature,
    hidden_agenda: seed.hidden_agenda,
    secret_entry: seed.secret_entry,
    faction_name_suggestion: faction,
    current_location_name_suggestion: place,
    narrative_hooks: seed.hooks,
    check_results: seed.checks,
    suggested_secret: {
      title: "Dunkles Geheimnis",
      content: seed.darkSecret,
    },
    influenceAndLoyalty: {
      influence: clamp01(seed.influence),
      loyalty: clamp01(seed.loyalty),
      agenda: seed.agenda,
    },
    darkSecret: seed.darkSecret,
    intelValue: clamp01(seed.intelValue),
    disposition: seed.disposition,
    portraitUrl: NPC_PORTRAIT_PLACEHOLDER,
  };
}

/** Anführer je Fraktion (teilweise zugleich HQ-Betreiber). */
const FACTION_LEADER_SEEDS: readonly NpcSeed[] = [
  {
    id: "npc-leader-rotes-auge",
    mapRoles: ["leader", "operator"],
    districtId: "unterstadt",
    factionId: "rotes-auge",
    locationId: "malanthir-umschlagplatz",
    name: "Vespera Nachtklaue",
    title: "Rote Äbtissin",
    role: "Anführerin des Roten Auges",
    race: "Halbelfin",
    alignment: "Neutral Evil",
    description:
      "Vespera führt das Malanthir-Netz der Unterstadt vom Umschlagplatz aus. Wer sie sieht, sieht oft nur einen Schatten zwischen Kisten.",
    appearance:
      "Schlank, aschfahle Haut, eine Narbe über dem linken Auge, dunkler Kapuzenmantel mit rotem Fadenstick.",
    personality_traits: "Ruhig, berechnend, selten laut — aber gnadenlos, wenn jemand ihre Routen verrät.",
    gm_notes: "Kennt bestochene Wachen in der Wachstube Rote Gassen; nutzt Goldkelchen-Gerüchte als Deckung.",
    true_nature: "Malanthir-Kultistin unter der Maske einer Schmuggelkönigin.",
    hidden_agenda: "Die Stadtwache weiter unterwandern und den Westmarkt mit Seidenhaus-Schulden lähmen.",
    secret_entry: "Im Keller des Umschlagplatzes lagert sie Reliquien, die kein Zoll jemals sehen darf.",
    hooks: [
      {
        name: "Kellerbote",
        role: "Kurier",
        description: "Ein Junge mit roter Laterne bringt Nachrichten nur nachts.",
        is_alive: true,
      },
      {
        name: null,
        role: "Rivalin",
        description: "Eine ehemalige Partnerin will den Umschlagplatz übernehmen.",
        is_alive: true,
      },
    ],
    checks: [
      {
        type: "Insight",
        dc: 16,
        result: "Ihre Höflichkeit maskiert Drohungen; sie misst, wer käuflich ist.",
        is_critical: false,
      },
      {
        type: "Investigation",
        dc: 18,
        result: "Rote Kreidespuren führen zu einem verdeckten Hof hinter dem Westmarkt.",
        is_critical: false,
      },
    ],
    influence: 82,
    loyalty: 48,
    agenda: "Malanthir-Ware fließen lassen, Wache kaufen, Seide erpressen.",
    darkSecret:
      "Sie hat einen Stadtwachen-Hauptmann erpresst: Seine Schwester liegt als Geisel in einem Malanthir-Keller.",
    intelValue: 88,
    disposition: "opportunistisch",
  },
  {
    id: "npc-leader-goldkelchen",
    mapRoles: ["leader", "operator"],
    districtId: "handwerkerviertel",
    factionId: "goldkelchen",
    locationId: "gauklerbuehne",
    name: "Lirian Goldkehle",
    title: "Meister der Goldkelchen",
    role: "Anführer der Goldkelchen",
    race: "Mensch",
    alignment: "Chaotic Neutral",
    description:
      "Lirian tanzt und singt auf der Gauklerbühne, während seine Barden Gerüchte für das Haus der Seide sammeln.",
    appearance:
      "Goldene Ohrringe, bunte Weste, geschwärzte Fingernägel vom Schminken; Stimme trägt über drei Gassen.",
    personality_traits: "Charmant, witzig, immer eine Strophe voraus — und nie ganz ehrlich.",
    gm_notes: "Client des Hauses der Seide; meidet offene Konflikte mit dem Roten Auge.",
    true_nature: "Spitzelnetz unter Bardenkutte.",
    hidden_agenda: "Adelsohren füttern und Seidenhaus-Aufträge priorisieren.",
    secret_entry: "Jedes Lied enthält Codezeilen für Kurierläufe.",
    hooks: [
      {
        name: "Mirena Flüsterton",
        role: "Bardin",
        description: "Spielt im Blauen Hirsch und lauscht Salon-Klatsch.",
        is_alive: true,
      },
    ],
    checks: [
      {
        type: "Persuasion",
        dc: 13,
        result: "Er teilt ein harmloses Gerücht — und behält das brisante zurück.",
        is_critical: false,
      },
      {
        type: "Insight",
        dc: 15,
        result: "Seine Scherze lenken von Beobachtungen am Publikum ab.",
        is_critical: false,
      },
    ],
    influence: 58,
    loyalty: 62,
    agenda: "Informantennetz für Seide pflegen, ohne die Bühne zu verlieren.",
    darkSecret:
      "Er verkauft Namen von Flüchtlingen an das Haus der Seide — und behauptet, es sei nur Kunst.",
    intelValue: 79,
    disposition: "opportunistisch",
  },
  {
    id: "npc-leader-haus-der-seide",
    mapRoles: ["leader", "operator"],
    districtId: "handwerkerviertel",
    factionId: "haus-der-seide",
    locationId: "seidenkontor",
    name: "Seraphine Seidenhand",
    title: "Handelskonsulin",
    role: "Anführerin des Hauses der Seide",
    race: "Mensch",
    alignment: "Lawful Neutral",
    description:
      "Seraphine führt das Kontor am Handwerkermarkt: hohe Standgelder, längere Arme bis in die blauen Salons.",
    appearance:
      "Silbernes Haar streng gebunden, Seidenhandschuhe, ein Siegelring mit Spinnweben-Motiv.",
    personality_traits: "Höflich, unnachgiebig, spricht in Preisen und Fristen.",
    gm_notes: "Patron der Goldkelchen; Rivalität zum Zunftbund und Druck auf Adelskontakte.",
    true_nature: "Macht durch Schulden und Standgebühren.",
    hidden_agenda: "Adelshäuser über Luxusware anbinden und Zunftverträge aushebeln.",
    secret_entry: "Die Kontorbücher führen zwei Spalten: öffentlich und erpresserisch.",
    hooks: [
      {
        name: "Torren Quill",
        role: "Buchhalter",
        description: "Kennt jede Standgebühr — und jede Ausnahme.",
        is_alive: true,
      },
    ],
    checks: [
      {
        type: "Insight",
        dc: 14,
        result: "Jedes Lächeln ist eine Rechnung, die noch nicht gestellt wurde.",
        is_critical: false,
      },
      {
        type: "Investigation",
        dc: 16,
        result: "Doppelte Quittungen im Kontor belegen erzwungene „Schutzspenden“.",
        is_critical: false,
      },
    ],
    influence: 76,
    loyalty: 71,
    agenda: "Handelsnetz und Adelsschulden ausbauen.",
    darkSecret:
      "Sie lässt Westmarkt-Diebstähle zu, solange die Beute über Goldkelchen zurück an ihre Lager geht.",
    intelValue: 64,
    disposition: "misstrauisch",
  },
  {
    id: "npc-leader-stadtwachen",
    mapRoles: ["leader", "operator"],
    districtId: "palast",
    factionId: "stadtwachen",
    locationId: "hofwache",
    name: "Hauptmann Brann Eisenwall",
    title: "Stadtkommandant",
    role: "Anführer der Stadtwachen",
    race: "Mensch",
    alignment: "Lawful Neutral",
    description:
      "Brann befehligt die lokale Exekutive unter imperialer Aufsicht. Willkür trägt bei ihm oft ein Siegel.",
    appearance:
      "Breitschultrig, grauer Bart, Harnisch mit Löwenemblem, Knöchel von alten Paraden vernarbt.",
    personality_traits: "Kurz angebunden, ehrgeizig, glaubt Ordnung sei Härte.",
    gm_notes: "Unterstellt den Häusern des Nordens; Teile der Truppe sind vom Roten Auge unterwandert.",
    true_nature: "Karrierist, der Blindheit für Beförderung tauscht.",
    hidden_agenda: "Imperialen Vorgesetzten Ruhe melden, lokale Bestechung dulden.",
    secret_entry: "Patrouillenpläne für die Unterstadt werden „aus Versehen“ verspätet.",
    hooks: [
      {
        name: "Wachtmeisterin Halda",
        role: "Adjutantin",
        description: "Loyaler als Brann — und ahnt seine Deals.",
        is_alive: true,
      },
    ],
    checks: [
      {
        type: "Intimidation",
        dc: 14,
        result: "Er droht mit Haft, aber lässt Raum für „Gebühren“.",
        is_critical: false,
      },
      {
        type: "Insight",
        dc: 15,
        result: "Seine Blicke weichen, wenn vom Roten Auge die Rede ist.",
        is_critical: false,
      },
    ],
    influence: 74,
    loyalty: 55,
    agenda: "Macht sichern, Unterwanderung leugnen, Hof ruhig halten.",
    darkSecret:
      "Er nimmt Silber vom Roten Auge, damit die Patrouillen in den Roten Gassen „zu spät“ kommen.",
    intelValue: 52,
    disposition: "bestechlich",
  },
  {
    id: "npc-leader-haeuser-des-nordens",
    mapRoles: ["leader", "operator"],
    districtId: "palast",
    factionId: "haeuser-des-nordens",
    locationId: "goldkuppel",
    name: "Lady Isolde von Nordwacht",
    title: "Sprecherin der Nordhäuser",
    role: "Anführerin der Häuser des Nordens",
    race: "Mensch",
    alignment: "Lawful Neutral",
    description:
      "Isolde spricht unter der Goldenen Kuppel für die blauen Salons: Hofnähe, Gärten und Druck auf Garde und Markt.",
    appearance:
      "Hohe Frisur mit Silberkamm, kobaltblaues Gewand, kühle Augen, Stimme wie Glas.",
    personality_traits: "Elegant, unnahbar, denkt in Allianzen und Erblinien.",
    gm_notes: "Patron der Stadtwachen; Spannung zu beiden Tempelorden.",
    true_nature: "Machtpolitikerin hinter Höflichkeit.",
    hidden_agenda: "Tempelstreit als Hebel nutzen und Seidenhaus als Verbündeten halten.",
    secret_entry: "Hofprotokolle werden so geschrieben, dass Rivalen zu spät kommen.",
    hooks: [
      {
        name: "Kanzler Orwin",
        role: "Hofschreiber",
        description: "Fertigt Siegel — und vergisst auf Befehl Namen.",
        is_alive: true,
      },
    ],
    checks: [
      {
        type: "Persuasion",
        dc: 16,
        result: "Sie gewährt Audienz — gegen Gefälligkeiten für die Salons.",
        is_critical: false,
      },
      {
        type: "History",
        dc: 14,
        result: "Ihr Haus hält alte Schulden über drei Generationen.",
        is_critical: false,
      },
    ],
    influence: 88,
    loyalty: 80,
    agenda: "Hofmacht und Gartenpolitik der Nordhäuser absichern.",
    darkSecret:
      "Sie hat eine Chromus-Schriftrolle aus dem Tempelbezirk gestohlen, um das Konklave zu erpressen.",
    intelValue: 45,
    disposition: "misstrauisch",
  },
  {
    id: "npc-leader-bund-silberne-rose",
    mapRoles: ["leader", "operator"],
    districtId: "tempelbezirk",
    factionId: "bund-silberne-rose",
    locationId: "rose-hof",
    name: "Priorin Elowen Silberblatt",
    title: "Hüterin der offenen Höfe",
    role: "Anführerin des Bundes der Silbernen Rose",
    race: "Elfin",
    alignment: "Neutral Good",
    description:
      "Elowen predigt im Hof der Silbernen Rose gegen gezähltes Schicksal und bietet Unterschlupf ohne Garde-Ohren.",
    appearance:
      "Weiße Rosen im Haar, schlichte Robe, warme Augen, eine silberne Brosche in Form einer Rose.",
    personality_traits: "Hoffnungsvoll, standhaft, weigert sich, Namen an die Garde zu geben.",
    gm_notes: "Rivalin des Konklaves; leichte Allianz zu Goldkelchen.",
    true_nature: "Elysia-Gläubige, die Ordnung als Käfig sieht.",
    hidden_agenda: "Konklave-Liturgie öffentlich entlarven und Hofkapelle stärken.",
    secret_entry: "Im Kreuzgang lagern Flüchtlingslisten, die nie die Wache erreichen.",
    hooks: [
      {
        name: "Bruder Calen",
        role: "Heilkundiger",
        description: "Versorgt Verletzte ohne Fragen nach Kulten.",
        is_alive: true,
      },
    ],
    checks: [
      {
        type: "Religion",
        dc: 12,
        result: "Ihre Worte gegen Chromus sind klar und gefährlich.",
        is_critical: false,
      },
      {
        type: "Insight",
        dc: 14,
        result: "Sie verheimlicht, wie viele sie bereits versteckt.",
        is_critical: false,
      },
    ],
    influence: 61,
    loyalty: 92,
    agenda: "Elysia-Hoffnung gegen Chromus-Zwang stellen.",
    darkSecret:
      "Sie hat einmal einem Malanthir-Flüchtling Asyl gegeben — und schweigt, weil die Stadt ihn sonst henkte.",
    intelValue: 55,
    disposition: "wohlwollend",
  },
  {
    id: "npc-leader-konklave-ewige-ordnung",
    mapRoles: ["leader", "operator"],
    districtId: "tempelbezirk",
    factionId: "konklave-ewige-ordnung",
    locationId: "konklave-saal",
    name: "Numerus Kael Chronosiegel",
    title: "Erster Liturg",
    role: "Anführer des Konklaves der Ewigen Ordnung",
    race: "Mensch",
    alignment: "Lawful Evil",
    description:
      "Kael leitet die Chromus-Liturgie im Saal der Ewigen Ordnung: Kerzen, Zahlen, Zwang auf den Palast.",
    appearance:
      "Kahle Schädelhaut mit goldenen Zahlentätowierungen, schwere Kettenrobe, metronomische Gesten.",
    personality_traits: "Kalt, präzise, hält Mitgefühl für Rechenfehler.",
    gm_notes: "Rivalität zur Silbernen Rose; Allianz zu Teilen der Stadtwache.",
    true_nature: "Fanatiker der gezählten Ordnung.",
    hidden_agenda: "Hof und Garde an Liturgiezeiten binden und die Rose isolieren.",
    secret_entry: "Nachtliturgien stehen in keinem öffentlichen Kalender.",
    hooks: [
      {
        name: "Novizin Thessa",
        role: "Chronistin",
        description: "Schreibt Schicksalszahlen — und zweifelt heimlich.",
        is_alive: true,
      },
    ],
    checks: [
      {
        type: "Religion",
        dc: 15,
        result: "Seine Zitate aus Chromus-Texten sind drohend korrekt.",
        is_critical: false,
      },
      {
        type: "Insight",
        dc: 16,
        result: "Er plant den nächsten öffentlichen Disput mit der Rose.",
        is_critical: false,
      },
    ],
    influence: 68,
    loyalty: 95,
    agenda: "Chromus-Ordnung über Tempel und Palast legen.",
    darkSecret:
      "Er hat einen Rivalen im Konklave „gezählt“ — die Leiche liegt unter dem Chorraum vermauert.",
    intelValue: 48,
    disposition: "feindselig",
  },
  {
    id: "npc-leader-zunftbund",
    mapRoles: ["leader", "operator"],
    districtId: "handwerkerviertel",
    factionId: "zunftbund",
    locationId: "zunft",
    name: "Meisterin Greta Hammerklang",
    title: "Zunftvögtin",
    role: "Anführerin des Zunftbunds Aurenfurt",
    race: "Zwergin",
    alignment: "Lawful Neutral",
    description:
      "Greta führt das Zunfthaus: Verträge wiegen mehr als Wappen, Essen und Kontore halten zusammen.",
    appearance:
      "Rußige Schürze über guter Wolle, Hammeramulett, kurze graue Zöpfe, feste Handschläge.",
    personality_traits: "Direkt, fair unter Zünftigen, misstrauisch gegen Adel und Seide.",
    gm_notes: "Spannung zu Haus der Seide und Stadtwachen; Rivalität zu Nordhäusern.",
    true_nature: "Pragmatikerin, die Unabhängigkeit der Handwerker verteidigt.",
    hidden_agenda: "Seidenhaus-Gebühren brechen und Hofprivilegien abwehren.",
    secret_entry: "Im Zunftkeller lagern Verträge, die den Adel bloßstellen könnten.",
    hooks: [
      {
        name: "Joran Esse",
        role: "Schmiedegeselle",
        description: "Kennt jede Lieferung Erz vor der Garde.",
        is_alive: true,
      },
    ],
    checks: [
      {
        type: "Persuasion",
        dc: 13,
        result: "Sie handelt hart, aber hält Wort, wenn gesiegelt ist.",
        is_critical: false,
      },
      {
        type: "Investigation",
        dc: 14,
        result: "Zunftsiegel auf Dokumenten entlarven gefälschte Seidenhaus-Quittungen.",
        is_critical: false,
      },
    ],
    influence: 66,
    loyalty: 84,
    agenda: "Zunftautonomie und faire Preise gegen Seidennetz.",
    darkSecret:
      "Sie deckt einen Schmuggel von Zunftstahl an das Rote Auge — gegen Schutz der Essen vor Brandstiftung.",
    intelValue: 57,
    disposition: "neutral",
  },
] as const;

/** Betreiber nur für Orte ohne Anführer-HQ-Überlappung. */
const OPERATOR_ONLY_SEEDS: readonly NpcSeed[] = [
  {
    id: "npc-op-hofkanzlei",
    mapRoles: ["operator"],
    districtId: "palast",
    factionId: "haeuser-des-nordens",
    locationId: "hofkanzlei",
    name: "Schreiber Aldric Pergament",
    title: "Hofkanzlist",
    role: "Betreiber der Hofkanzlei",
    race: "Mensch",
    alignment: "Lawful Neutral",
    description: "Aldric führt Siegel und Akten der Hofkanzlei — und formt die Stadt, bevor sie es merkt.",
    appearance: "Dünne Finger, Tintenflecken, Brille aus Messing, graue Robe.",
    personality_traits: "Pedantisch, leise, genießt Macht ohne Titel.",
    gm_notes: "Loyal zu Isolde, verkauft gelegentlich Abschriften.",
    true_nature: "Informationshändler hinter Beamtenmaske.",
    hidden_agenda: "Wichtige Siegel verzögern, wenn Gold fließt.",
    secret_entry: "Doppelte Kopien heikler Erlasse liegen in seinem Privattresor.",
    hooks: [{ name: null, role: "Kurierin", description: "Bringt nächtliche Siegelanfragen.", is_alive: true }],
    checks: [
      { type: "Investigation", dc: 15, result: "Tintenarten verraten gefälschte Siegeldaten.", is_critical: false },
      { type: "Insight", dc: 14, result: "Er zögert bei Fragen nach Unterstadt-Erlassen.", is_critical: false },
    ],
    influence: 54,
    loyalty: 68,
    agenda: "Aktenmacht und stille Gebühren.",
    darkSecret: "Er hat einen Todesbefehl „verlegt“, damit ein Nordhaus-Schuldner entkam.",
    intelValue: 70,
    disposition: "bestechlich",
  },
  {
    id: "npc-op-silberkapelle",
    mapRoles: ["operator"],
    districtId: "palast",
    factionId: "bund-silberne-rose",
    locationId: "silberkapelle",
    name: "Kapellan Mira Lichtkelch",
    title: "Hofkapellanin",
    role: "Betreiberin der Kapelle der Silbernen Rose",
    race: "Halbelfin",
    alignment: "Neutral Good",
    description: "Mira hält die Hofkapelle offen — Elysia-Flüstern unter kaiserlichem Stuck.",
    appearance: "Sanfte Gesichtszüge, silberner Kelch am Gürtel, weiße Stola.",
    personality_traits: "Mitfühlend, behutsam, politisch vorsichtig am Hof.",
    gm_notes: "Brücke zwischen Rose und Palast; beobachtet Isolde.",
    true_nature: "Hoffnungsträgerin, die Angst vor dem Konklave hat.",
    hidden_agenda: "Hofbedienstete der Rose zuführen.",
    secret_entry: "Beichtgeheimnisse notiert sie in einem Codebuch.",
    hooks: [{ name: null, role: "Novize", description: "Putzt Kerzen und hört Hofklatsch.", is_alive: true }],
    checks: [
      { type: "Religion", dc: 12, result: "Ihr Ritus hebt die Stimmung, ohne Chromus zu beleidigen.", is_critical: false },
      { type: "Insight", dc: 13, result: "Sie fürchtet, dass die Kapelle geschlossen wird.", is_critical: false },
    ],
    influence: 42,
    loyalty: 88,
    agenda: "Elysia am Hof lebendig halten.",
    darkSecret: "Sie hat eine Beichte über einen Mord im Palast nie weitergegeben.",
    intelValue: 50,
    disposition: "wohlwollend",
  },
  {
    id: "npc-op-nordtor",
    mapRoles: ["operator"],
    districtId: "adelsviertel",
    factionId: "stadtwachen",
    locationId: "nordtor",
    name: "Wachtmeister Torvald Wappenfels",
    title: "Torhauptmann Nord",
    role: "Betreiber des Nordtors",
    race: "Mensch",
    alignment: "Lawful Neutral",
    description: "Torvald prüft Wappen und Ausreden am Nordtor — oft zu streng, selten gerecht.",
    appearance: "Rote Nase, blanke Helmspange, Speer immer greifbereit.",
    personality_traits: "Misstrauisch, stolz, leicht beleidigt.",
    gm_notes: "Willkür bei Nicht-Adligen; respektiert Isolde.",
    true_nature: "Kleiner Tyrann mit Siegel.",
    hidden_agenda: "Adelsgunst erlangen durch harte Kontrollen.",
    secret_entry: "Manche Wappen lässt er gegen Wein durch.",
    hooks: [{ name: null, role: "Zöllner", description: "Zählt Karren und Bestechung.", is_alive: true }],
    checks: [
      { type: "Intimidation", dc: 13, result: "Er droht mit Durchsuchung, wenn kein Wappen da ist.", is_critical: false },
      { type: "Persuasion", dc: 15, result: "Mit Adelsbrief wird er plötzlich höflich.", is_critical: false },
    ],
    influence: 48,
    loyalty: 60,
    agenda: "Tor als Machtbühne nutzen.",
    darkSecret: "Er lässt Schmuggel für ein Nordhaus durch — gegen Versprechen auf Beförderung.",
    intelValue: 40,
    disposition: "misstrauisch",
  },
  {
    id: "npc-op-blaue-gaerten",
    mapRoles: ["operator"],
    districtId: "adelsviertel",
    factionId: "haeuser-des-nordens",
    locationId: "blaue-gaerten",
    name: "Gärtnerin Ysolda Blaulaub",
    title: "Hüterin der Hecken",
    role: "Betreiberin der Blauen Gärten",
    race: "Mensch",
    alignment: "True Neutral",
    description: "Ysolda schließt nach Sonnenuntergang die Gitter der Blauen Gärten und kennt jeden heimlichen Pfad.",
    appearance: "Erde unter den Nägeln, blauer Schal, scharfe Augen.",
    personality_traits: "Schweigsam, loyal zu den Gärten, nicht zu jedem Haus.",
    gm_notes: "Weiß, wer nachts die Gitter nutzt.",
    true_nature: "Schweigepflichtiger Zeuge der Salons.",
    hidden_agenda: "Gartengeheimnisse nur teuer verkaufen.",
    secret_entry: "Ein Seiteneingang ist nur ihr und Isolde bekannt.",
    hooks: [{ name: null, role: "Lehrling", description: "Harkt Laub und hört Küsse.", is_alive: true }],
    checks: [
      { type: "Stealth", dc: 14, result: "Sie bemerkt Eindringlinge früher als die Wache.", is_critical: false },
      { type: "Insight", dc: 13, result: "Sie weiß mehr über nächtliche Treffen als sie sagt.", is_critical: false },
    ],
    influence: 38,
    loyalty: 72,
    agenda: "Gärten ruhig und nützlich halten.",
    darkSecret: "Unter einer Hecke liegt die Asche eines Duellanten, den kein Protokoll nennt.",
    intelValue: 66,
    disposition: "neutral",
  },
  {
    id: "npc-op-blauer-hirsch",
    mapRoles: ["operator"],
    districtId: "adelsviertel",
    factionId: "goldkelchen",
    locationId: "blauer-hirsch",
    name: "Wirtin Fennel Hirschkrug",
    title: "Krugin des Blauen Hirsch",
    role: "Betreiberin der Taverne zum Blauen Hirsch",
    race: "Halbling",
    alignment: "Chaotic Neutral",
    description: "Fennel führt das leise Haus mit teuren Krügen — Goldkelchen spielen, Seide lauscht.",
    appearance: "Lockiges Haar, gepflegte Schürze, immer ein Lächeln für zahlende Gäste.",
    personality_traits: "Gastfreundlich, neugierig, sammelt Trinkgeld und Geheimnisse.",
    gm_notes: "Arbeitet mit Lirian; Adelsohren sind Kunden.",
    true_nature: "Informantin hinter Wirtslächeln.",
    hidden_agenda: "Salon-Gerüchte an Lirian weiterreichen.",
    secret_entry: "Privatkabinett mit dünner Wand zum Nebenzimmer.",
    hooks: [{ name: "Mirena Flüsterton", role: "Bardin", description: "Stammgast auf der Bühne.", is_alive: true }],
    checks: [
      { type: "Persuasion", dc: 12, result: "Gegen gutes Trinkgeld fällt ein Name.", is_critical: false },
      { type: "Insight", dc: 14, result: "Sie hört mit, während sie einschenkt.", is_critical: false },
    ],
    influence: 44,
    loyalty: 58,
    agenda: "Bardennetz im Adel füttern.",
    darkSecret: "Sie notiert, wer mit wem trinkt — und verkauft die Liste an Seraphine.",
    intelValue: 74,
    disposition: "opportunistisch",
  },
  {
    id: "npc-op-seidensalon",
    mapRoles: ["operator"],
    districtId: "adelsviertel",
    factionId: "haus-der-seide",
    locationId: "seidensalon",
    name: "Madame Coralie Fadenreich",
    title: "Salonmeisterin",
    role: "Betreiberin des Seidensalons der Nordhäuser",
    race: "Mensch",
    alignment: "Lawful Neutral",
    description: "Coralie verkauft Rang und Stoffe im Seidensalon — Standgebühr inklusive Höflichkeit.",
    appearance: "Perfekte Frisur, seidene Handschuhe, Stimme wie Samt.",
    personality_traits: "Elegant, berechnend, nie ohne Rechnung.",
    gm_notes: "Arm Seraphines im Adelsviertel.",
    true_nature: "Schuldenbinderin der Mode.",
    hidden_agenda: "Adlige über Luxusware anbinden.",
    secret_entry: "Kreditbücher unter dem Podest der Schneiderpuppe.",
    hooks: [{ name: null, role: "Schneider", description: "Misst Röcke und Gerüchte.", is_alive: true }],
    checks: [
      { type: "Persuasion", dc: 14, result: "Sie bietet Rabatt gegen Informationen.", is_critical: false },
      { type: "Investigation", dc: 15, result: "Schuldscheine nennen halb Aurenfurt.", is_critical: false },
    ],
    influence: 56,
    loyalty: 74,
    agenda: "Salon als Schuldennetz der Seide.",
    darkSecret: "Sie erpresst eine Nordhaus-Tochter mit einem kompromittierenden Brief.",
    intelValue: 61,
    disposition: "misstrauisch",
  },
  {
    id: "npc-op-tempel",
    mapRoles: ["operator"],
    districtId: "tempelbezirk",
    factionId: "konklave-ewige-ordnung",
    locationId: "tempel",
    name: "Küsterin Valeria Goldchor",
    title: "Hüterin der Ostkuppel",
    role: "Betreiberin der Goldenen Tempelkuppel",
    race: "Mensch",
    alignment: "Lawful Neutral",
    description: "Valeria hält Tagsüber Pilger und nachts die geheime Liturgie unter der Ostkuppel.",
    appearance: "Goldene Stola, strenge Haltung, Kerzenwachs an den Ärmeln.",
    personality_traits: "Diszipliniert, fromm nach Chromus, ungeduldig mit Zweifel.",
    gm_notes: "Unterstellt Kael; beobachtet die Rose am Ostbrunnen.",
    true_nature: "Liturgie-Vollstreckerin.",
    hidden_agenda: "Nachtliturgie vor der Rose geheim halten.",
    secret_entry: "Ein Nebenaltar öffnet nur bei bestimmten Uhrzeiten.",
    hooks: [{ name: null, role: "Pilgerführer", description: "Leitet Touren — und Spitzel.", is_alive: true }],
    checks: [
      { type: "Religion", dc: 14, result: "Sie zitiert gezähltes Schicksal wie Gesetz.", is_critical: false },
      { type: "Perception", dc: 15, result: "Nachts fehlen Kerzen, die tagsüber da waren.", is_critical: false },
    ],
    influence: 52,
    loyalty: 86,
    agenda: "Ostkuppel als Chromus-Machtzeichen.",
    darkSecret: "Sie lässt Opfergaben verschwinden und füllt die Konklave-Kasse.",
    intelValue: 42,
    disposition: "feindselig",
  },
  {
    id: "npc-op-ostbrunnen",
    mapRoles: ["operator"],
    districtId: "tempelbezirk",
    factionId: "bund-silberne-rose",
    locationId: "ostbrunnen",
    name: "Brunnenhüter Soren Klarwasser",
    title: "Wächter der Opfer",
    role: "Betreiber des Ostbrunnens",
    race: "Mensch",
    alignment: "Neutral Good",
    description: "Soren wacht am Ostbrunnen: Opfergaben verschwinden schneller als Wasser — und er weiß, wohin.",
    appearance: "Nasse Stiefel, schlichte Kutte, silberne Rose am Kragen.",
    personality_traits: "Ruhig, observant, teilt Wasser und Warnungen.",
    gm_notes: "Loyal zu Elowen; sieht Konklave-Späher.",
    true_nature: "Stillschweiger für Flüchtlinge.",
    hidden_agenda: "Opferstille nutzen, um Spuren zu tilgen.",
    secret_entry: "Unter dem Brunnenrand liegt ein Notversteck.",
    hooks: [{ name: null, role: "Bettlerin", description: "Hört Pilger und meldet Soren.", is_alive: true }],
    checks: [
      { type: "Perception", dc: 13, result: "Er bemerkt, wer Gaben nur vortäuscht.", is_critical: false },
      { type: "Insight", dc: 14, result: "Er kennt Fluchtwege besser als Tempelpläne.", is_critical: false },
    ],
    influence: 36,
    loyalty: 90,
    agenda: "Brunnen als stiller Schutz für die Rose.",
    darkSecret: "Er hat einmal eine Opfergabe an Malanthir-Spione umgeleitet, um einen Freund zu retten.",
    intelValue: 58,
    disposition: "wohlwollend",
  },
  {
    id: "npc-op-schmiede",
    mapRoles: ["operator"],
    districtId: "handwerkerviertel",
    factionId: "zunftbund",
    locationId: "schmiede",
    name: "Schmied Borin Funkenschlag",
    title: "Meister der Großen Esse",
    role: "Betreiber der Großen Schmiede",
    race: "Zwerg",
    alignment: "Lawful Neutral",
    description: "Borin kauft Erz, bevor die Garde fragt, und hält die Zunftesse heiß.",
    appearance: "Brandnarben, breite Schultern, Lederschürze, dunkler Bart mit Messingringen.",
    personality_traits: "Wortkarg, stolz auf Arbeit, hasst Standgebühren.",
    gm_notes: "Unter Greta; kennt Stahlschmuggel-Gerüchte.",
    true_nature: "Handwerker zuerst, Politiker nie.",
    hidden_agenda: "Seidenhaus-Preise unterlaufen.",
    secret_entry: "Nachtlieferung ohne Zollstempel.",
    hooks: [{ name: "Joran Esse", role: "Geselle", description: "Hämmert und hält den Mund.", is_alive: true }],
    checks: [
      { type: "Athletics", dc: 12, result: "Er respektiert Kraft und ehrliche Arbeit.", is_critical: false },
      { type: "Insight", dc: 14, result: "Er weiß, welche Klingen nicht legal sind.", is_critical: false },
    ],
    influence: 49,
    loyalty: 78,
    agenda: "Esse und Zunftstahl schützen.",
    darkSecret: "Er schmiedet heimlich Waffenmarkierungen für das Rote Auge um.",
    intelValue: 46,
    disposition: "neutral",
  },
  {
    id: "npc-op-loewentor",
    mapRoles: ["operator"],
    districtId: "suedtor",
    factionId: "stadtwachen",
    locationId: "loewentor",
    name: "Sergeant Mael Löwenkralle",
    title: "Torwächter Süd",
    role: "Betreiber des Löwentors",
    race: "Mensch",
    alignment: "True Neutral",
    description: "Mael teilt den Torbogen mit Zoll und Schatten — und weiß, wer bei Regen schmuggelt.",
    appearance: "Löwenhelmzier, nasser Umhang, müde Augen.",
    personality_traits: "Zynisch, käuflich, überlebt durch Wegsehen.",
    gm_notes: "Unterwandert vom Roten Auge; meldet Brann selten die Wahrheit.",
    true_nature: "Zöllner mit zwei Kassen.",
    hidden_agenda: "Schmuggel gegen Anteil dulden.",
    secret_entry: "Nachtliste der „vergessenen“ Wagen.",
    hooks: [{ name: null, role: "Zöllnerin", description: "Zählt Fässer und Bestechung.", is_alive: true }],
    checks: [
      { type: "Persuasion", dc: 12, result: "Gold öffnet den Torbogen schneller als Stempel.", is_critical: false },
      { type: "Insight", dc: 13, result: "Er fürchtet Vesperas Boten mehr als Brann.", is_critical: false },
    ],
    influence: 51,
    loyalty: 34,
    agenda: "Überleben zwischen Garde und Schmuggel.",
    darkSecret: "Er lässt Malanthir-Kisten durch, die als „Wein für den Hof“ deklariert sind.",
    intelValue: 72,
    disposition: "bestechlich",
  },
  {
    id: "npc-op-allee",
    mapRoles: ["operator"],
    districtId: "suedtor",
    factionId: "goldkelchen",
    locationId: "allee",
    name: "Wirt Tamrin Alleenkrug",
    title: "Wirt zur Allee",
    role: "Betreiber der Taverne zur Allee",
    race: "Mensch",
    alignment: "Chaotic Neutral",
    description: "Tamrin bewirtet Händler vor dem Tor und sammelt Nachrichten über Karawanen und Flüchtlinge.",
    appearance: "Runder Bauch, ölige Schürze, immer ein Krug in der Hand.",
    personality_traits: "Gesprächig, gierig nach Neuigkeiten, loyal zum Trinkgeld.",
    gm_notes: "Goldkelchen-Ohr am Südtor; meldet Lirian.",
    true_nature: "Gerüchtewirt.",
    hidden_agenda: "Torverkehr an Seide/Goldkelchen melden.",
    secret_entry: "Hinterzimmer mit Blick auf die Allee.",
    hooks: [{ name: null, role: "Kellnerin", description: "Hört Flüchtlingsgeschichten.", is_alive: true }],
    checks: [
      { type: "Persuasion", dc: 11, result: "Ein Abend und er plappert Karawanenrouten.", is_critical: false },
      { type: "Insight", dc: 13, result: "Er übertreibt, behält aber Kernwahrheiten.", is_critical: false },
    ],
    influence: 40,
    loyalty: 52,
    agenda: "Torgerüchte verkaufen.",
    darkSecret: "Er verrät Flüchtlingsnamen an die Wache, wenn der Preis stimmt — und an Seide, wenn er höher ist.",
    intelValue: 68,
    disposition: "opportunistisch",
  },
  {
    id: "npc-op-westmarkt",
    mapRoles: ["operator"],
    districtId: "unterstadt",
    factionId: "haus-der-seide",
    locationId: "westmarkt",
    name: "Händlerin Nessa Markttuch",
    title: "Standmeisterin Westmarkt",
    role: "Betreiberin des Westmarkts",
    race: "Mensch",
    alignment: "Neutral Evil",
    description: "Nessa hält den teuersten Stand: Ware, Diebstahl und Gerüchte teilen sich das Tuch.",
    appearance: "Bunte Tücher, scharfe Stimme, Ring an jedem Finger.",
    personality_traits: "Laut, geizig, immer im Handel.",
    gm_notes: "Seraphines Arm in der Unterstadt; zahlt Schutz an Vespera.",
    true_nature: "Wucherin mit Marktprivileg.",
    hidden_agenda: "Preise und Gerüchte steuern.",
    secret_entry: "Falsche Waagen unter dem Stand.",
    hooks: [{ name: null, role: "Dieb", description: "Arbeitet für und gegen Nessa.", is_alive: true }],
    checks: [
      { type: "Persuasion", dc: 13, result: "Sie handelt, solange man zahlt und schweigt.", is_critical: false },
      { type: "Investigation", dc: 14, result: "Gewichte sind manipuliert.", is_critical: false },
    ],
    influence: 58,
    loyalty: 50,
    agenda: "Markt und Seidenanteil sichern.",
    darkSecret: "Sie lässt Diebe stehlen und kauft die Beute billig zurück — mit Vesperas Segen.",
    intelValue: 76,
    disposition: "opportunistisch",
  },
  {
    id: "npc-op-rote-laterne",
    mapRoles: ["operator"],
    districtId: "unterstadt",
    factionId: "rotes-auge",
    locationId: "rote-laterne",
    name: "Wirtin Rhessa Glutwein",
    title: "Laternenwirtin",
    role: "Betreiberin der Taverne Rote Laterne",
    race: "Tiefling",
    alignment: "Chaotic Neutral",
    description: "Rhessa führt die enge, laute Laterne — im Keller wird Malanthir nicht nur geflüstert.",
    appearance: "Rote Hörnerenden bemalt, Laternenohrringe, raue Stimme.",
    personality_traits: "Laut, loyal zu Stammgästen, hasst die Wache.",
    gm_notes: "Unter Vespera; Kellerflüstern-Zugang.",
    true_nature: "Türhüterin des Roten Auges.",
    hidden_agenda: "Kellerkontakte schützen.",
    secret_entry: "Falltür hinter dem Fasslager.",
    hooks: [{ name: "Kellerbote", role: "Kurier", description: "Kommt nur nachts.", is_alive: true }],
    checks: [
      { type: "Insight", dc: 14, result: "Sie prüft, ob man zur Wache gehört.", is_critical: false },
      { type: "Persuasion", dc: 15, result: "Mit dem richtigen Zeichen öffnet sich der Keller.", is_critical: false },
    ],
    influence: 62,
    loyalty: 70,
    agenda: "Laterne als Vorzimmer des Auges.",
    darkSecret: "Unter dem Keller lagern Leichen von Spionen, die zu viel fragten.",
    intelValue: 84,
    disposition: "misstrauisch",
  },
  {
    id: "npc-op-wachenstube-rot",
    mapRoles: ["operator"],
    districtId: "unterstadt",
    factionId: "stadtwachen",
    locationId: "wachenstube-rot",
    name: "Korporal Drenn Schattenhelm",
    title: "Wachkorporal Rote Gassen",
    role: "Betreiber der Wachstube Rote Gassen",
    race: "Mensch",
    alignment: "Neutral Evil",
    description: "Drenn führt die dünn besetzte Stube — unterwandert, überfordert, trotzdem da.",
    appearance: "Schiefer Helm, müde Haltung, immer Silber in der Tasche.",
    personality_traits: "Feig, käuflich, gibt Befehle, die niemand befolgt.",
    gm_notes: "Direkt von Vespera erpresst; Brann weiß es halb.",
    true_nature: "Marionette des Roten Auges in Uniform.",
    hidden_agenda: "Patrouillen abziehen, wenn bezahlt.",
    secret_entry: "Schichtpläne mit Lücken für Schmuggel.",
    hooks: [{ name: null, role: "Wachmann", description: "Trinkt statt zu patrouillieren.", is_alive: true }],
    checks: [
      { type: "Intimidation", dc: 12, result: "Er knickt bei Drohungen sofort ein.", is_critical: false },
      { type: "Insight", dc: 11, result: "Seine Angst vor dem Roten Auge ist offensichtlich.", is_critical: false },
    ],
    influence: 35,
    loyalty: 22,
    agenda: "Überleben und Silber.",
    darkSecret: "Er hat eine Patrouille bewusst in einen Hinterhalt gelockt — drei Wachen tot, Vespera zufrieden.",
    intelValue: 80,
    disposition: "bestechlich",
  },
] as const;

function assertCoverage(npcs: AurenfurtNpc[]) {
  const factionIds = new Set(AURENFURT_FACTIONS.map((f) => f.id));
  const buildingIds = new Set(CITY_BUILDINGS.map((b) => b.id));
  const leaders = npcs.filter((n) => n.mapRoles.includes("leader"));
  const operators = npcs.filter((n) => n.mapRoles.includes("operator"));
  const leaderFactions = new Set(leaders.map((n) => n.factionId));
  const operatorLocations = new Set(operators.map((n) => n.locationId).filter(Boolean));

  for (const id of factionIds) {
    if (!leaderFactions.has(id)) {
      throw new Error(`Fehlender Anführer für Fraktion ${id}`);
    }
  }
  for (const id of buildingIds) {
    if (!operatorLocations.has(id)) {
      throw new Error(`Fehlender Betreiber für Location ${id}`);
    }
  }
  if (leaders.length !== factionIds.size) {
    throw new Error(`Erwarte ${factionIds.size} Anführer, habe ${leaders.length}`);
  }
}

/**
 * Deterministischer Katalog: ein Anführer je Fraktion, ein Betreiber je Key-Location.
 * HQ-Überlappungen sind als ein NPC mit beiden mapRoles modelliert.
 */
export function generateNpcs(): AurenfurtNpc[] {
  const byId = new Map<string, AurenfurtNpc>();

  for (const seed of FACTION_LEADER_SEEDS) {
    const npc = buildNpc(seed);
    byId.set(npc.id, npc);
  }

  for (const seed of OPERATOR_ONLY_SEEDS) {
    const npc = buildNpc(seed);
    byId.set(npc.id, npc);
  }

  // Sicherheit: fehlende Buildings bekommen Fallback-Betreiber (deterministisch).
  for (const building of CITY_BUILDINGS) {
    const existing = [...byId.values()].find((n) => n.locationId === building.id);
    if (existing) continue;
    const hqLeader = [...byId.values()].find(
      (n) => n.mapRoles.includes("leader") && FACTION_HQ_LOCATION[n.factionId] === building.id,
    );
    if (hqLeader) {
      hqLeader.locationId = building.id;
      if (!hqLeader.mapRoles.includes("operator")) hqLeader.mapRoles.push("operator");
      continue;
    }
    const factionId = building.guildId as FactionId;
    const fallback = buildNpc({
      id: `npc-op-${building.id}`,
      mapRoles: ["operator"],
      districtId: building.districtId,
      factionId,
      locationId: building.id,
      name: `Hüter von ${building.name}`,
      title: null,
      role: `Betreiber von ${building.name}`,
      race: "Mensch",
      alignment: "True Neutral",
      description: building.summary,
      appearance: "Unauffällig gekleidet, aufmerksam.",
      personality_traits: "Zurückhaltend, ortskundig.",
      gm_notes: "Automatisch ergänzter Betreiber für neue Key-Location.",
      true_nature: "Ortshüter.",
      hidden_agenda: "Den Standort sichern.",
      secret_entry: "Kennt einen Nebenweg.",
      hooks: [
        {
          name: null,
          role: "Gehilfe",
          description: `Hilft bei ${building.name}.`,
          is_alive: true,
        },
      ],
      checks: [
        {
          type: "Insight",
          dc: 12,
          result: "Kennt das Gebäude besser als Fremde.",
          is_critical: false,
        },
        {
          type: "Persuasion",
          dc: 13,
          result: "Öffnet sich bei fairer Behandlung.",
          is_critical: false,
        },
      ],
      influence: 40,
      loyalty: 60,
      agenda: `${building.name} führen.`,
      darkSecret: `Am Ort ${building.name} lagert etwas, das die Gilde nicht öffentlich zugibt.`,
      intelValue: 40,
      disposition: "neutral",
    });
    byId.set(fallback.id, fallback);
  }

  const npcs = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
  assertCoverage(npcs);
  return npcs;
}

let cachedNpcs: AurenfurtNpc[] | null = null;

export function allAurenfurtNpcs(): AurenfurtNpc[] {
  if (!cachedNpcs) cachedNpcs = generateNpcs();
  return cachedNpcs;
}

export function findNpc(id: string | null) {
  if (!id) return null;
  return allAurenfurtNpcs().find((npc) => npc.id === id) ?? null;
}

export function leadersInDistrict(districtId: CityDistrictId) {
  return allAurenfurtNpcs().filter(
    (npc) => npc.mapRoles.includes("leader") && npc.districtId === districtId,
  );
}

/** Anführer von Fraktionen mit Präsenz im Viertel (auch wenn HQ woanders liegt). */
export function factionLeadersForDistrict(districtId: CityDistrictId) {
  const presentFactionIds = new Set(
    AURENFURT_FACTIONS.filter((f) => f.districtIds.includes(districtId)).map((f) => f.id),
  );
  return allAurenfurtNpcs().filter(
    (npc) => npc.mapRoles.includes("leader") && presentFactionIds.has(npc.factionId),
  );
}

export function operatorForLocation(locationId: string | null) {
  if (!locationId) return null;
  return (
    allAurenfurtNpcs().find(
      (npc) => npc.mapRoles.includes("operator") && npc.locationId === locationId,
    ) ?? null
  );
}

export function npcForFaction(factionId: FactionId) {
  return (
    allAurenfurtNpcs().find(
      (npc) => npc.mapRoles.includes("leader") && npc.factionId === factionId,
    ) ?? null
  );
}

/**
 * Moduliert Einfluss/Intel leicht an Viertel-Kennzahlen.
 * Identität und darkSecret bleiben unverändert.
 */
export function withDistrictModulation(npc: AurenfurtNpc, day = utcToday()): AurenfurtNpc {
  const sim = districtMetricsOn(npc.districtId, day);
  const standing = findFaction(npc.factionId, day);
  const influenceBoost = standing
    ? (standing.power * 0.08 + standing.economicImpact * 0.05)
    : 0;
  const intelBoost = sim.crime * 0.12 + sim.malanthir * 0.05;

  return {
    ...npc,
    influenceAndLoyalty: {
      ...npc.influenceAndLoyalty,
      influence: clamp01(npc.influenceAndLoyalty.influence * 0.9 + influenceBoost),
      loyalty: npc.influenceAndLoyalty.loyalty,
      agenda: npc.influenceAndLoyalty.agenda,
    },
    intelValue: clamp01(npc.intelValue * 0.88 + intelBoost),
  };
}

export function toWizardPrefill(npc: AurenfurtNpc): AurenfurtNpcWizardPrefill {
  return {
    name: npc.name,
    title: npc.title,
    role: npc.role,
    race: npc.race,
    status: npc.status,
    alignment: npc.alignment,
    description: npc.description,
    appearance: npc.appearance,
    personality_traits: npc.personality_traits,
    gm_notes: npc.gm_notes,
    narrative_hooks: npc.narrative_hooks,
    check_results: npc.check_results,
    faction_name_suggestion: npc.faction_name_suggestion,
    current_location_name_suggestion: npc.current_location_name_suggestion,
    true_nature: npc.true_nature,
    hidden_agenda: npc.hidden_agenda,
    secret_entry: npc.secret_entry,
    suggested_secret: npc.suggested_secret,
  };
}

export function npcMapRoleLabel(npc: AurenfurtNpc) {
  const hasLeader = npc.mapRoles.includes("leader");
  const hasOperator = npc.mapRoles.includes("operator");
  if (hasLeader && hasOperator) return "Anführer & Betreiber";
  if (hasLeader) return "Anführer";
  return "Betreiber";
}

export function districtLabel(districtId: CityDistrictId) {
  return findDistrict(districtId)?.name ?? districtId;
}

export type NpcCatalogStats = {
  total: number;
  leaders: number;
  operators: number;
  overlaps: number;
};

export function npcCatalogStats(): NpcCatalogStats {
  const npcs = allAurenfurtNpcs();
  const leaders = npcs.filter((n) => n.mapRoles.includes("leader"));
  const operators = npcs.filter((n) => n.mapRoles.includes("operator"));
  const overlaps = npcs.filter(
    (n) => n.mapRoles.includes("leader") && n.mapRoles.includes("operator"),
  );
  return {
    total: npcs.length,
    leaders: leaders.length,
    operators: operators.length,
    overlaps: overlaps.length,
  };
}

/** Für Tests / Hook: Operator an KeyLocation. */
export function operatorForKeyLocation(location: KeyLocation | null) {
  return operatorForLocation(location?.id ?? null);
}
