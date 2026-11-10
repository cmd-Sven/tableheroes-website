/**
 * Vorgefertigte Kaiser-Ereigniskarten für die Verwaltung / Stadt-Hand.
 * Regler = dauerhafte Präsenz; Karten = zeitlich begrenzte Intensität/Befehle/Anleihen.
 */

import type { CityDistrictId } from "./aurenfurt-districts";
import type { MeterEffect } from "@/src/lib/npcs/city-simulation";

export type KaiserCardScope = "city" | "palace" | "district";

export type KaiserNpcOrder = {
  /** Kurzer Befehl an einen Katalog-/Rollen-NPC (Anzeige / spätere Runtime). */
  targetHint: string;
  order: string;
};

export type KaiserEventCard = {
  id: string;
  title: string;
  description: string;
  durationDays: number;
  /** Symbolische Hofkasse in GP (Anzeige / Anleihe-Kosten). */
  cost: number;
  scope: KaiserCardScope;
  /** Pflicht bei scope === "district"; UI wählt Viertel. */
  districtId?: CityDistrictId | null;
  /** Wenn true: Wachen-Zahl unverändert, nur Intensität/Fokus. */
  intensityOnly?: boolean;
  effects: MeterEffect[];
  /** Tägliche GP in die Stadtkasse, solange die Karte wirkt (Anleihen). */
  treasuryIncomePerDay?: number;
  spawnedOrders?: KaiserNpcOrder[];
  /** Kartenmotiv — zur Laufzeit aus Verwaltung-Overrides gemerged. */
  imageUrl?: string | null;
};

export const KAISER_EVENT_CARDS: readonly KaiserEventCard[] = [
  {
    id: "kaiser-fest-veranstalten",
    title: "Fest veranstalten",
    description:
      "Der Hof lädt zu Wein, Musik und öffentlicher Pracht. Stadtweit hebt die Stimmung — Vattrak und Kasse bluten, Flüchtlingslager fühlen sich übergangen.",
    durationDays: 5,
    cost: 1200,
    scope: "city",
    effects: [
      { meter: "economy", delta: 6 },
      { meter: "unemployment", delta: -4 },
      { meter: "vattrak", delta: -5 },
      { meter: "refugees", delta: 3 },
    ],
    spawnedOrders: [
      {
        targetHint: "Hofkanzlei / Schreiber Aldric",
        order: "Einladungslisten und Speiseordnung für fünf Tage vorbereiten.",
      },
    ],
  },
  {
    id: "kaiser-razzia-viertel",
    title: "Razzien gezielt im Viertel",
    description:
      "Dieselbe Wachen-Zahl, aber schärfer und gezielter: Hausdurchsuchungen, Sperren, Verhöre. Kriminalität und Malanthir sinken kurz — der Handel stockt.",
    durationDays: 4,
    cost: 200,
    scope: "district",
    districtId: null,
    intensityOnly: true,
    effects: [
      { meter: "crime", delta: -10 },
      { meter: "malanthir", delta: -6 },
      { meter: "economy", delta: -4 },
      { meter: "unemployment", delta: 3 },
    ],
    spawnedOrders: [
      {
        targetHint: "Hauptmann Brann Eisenwall",
        order: "Razzia-Plan für das gewählte Viertel; keine Truppenverlegung.",
      },
    ],
  },
  {
    id: "kaiser-getreidespende",
    title: "Getreidespende",
    description:
      "Kaiserliche Speicher öffnen sich für Brot an Bedürftige. Hunger und Fluchtdruck weichen — Vattrak und Hofvorrat schwinden.",
    durationDays: 7,
    cost: 800,
    scope: "city",
    effects: [
      { meter: "refugees", delta: -8 },
      { meter: "unemployment", delta: -3 },
      { meter: "economy", delta: 3 },
      { meter: "vattrak", delta: -7 },
    ],
    spawnedOrders: [
      {
        targetHint: "Westmarkt / Bäcker Finkenfauch",
        order: "Rationen ausgeben und Schlangen an den Ständen ordnen.",
      },
    ],
  },
  {
    id: "kaiser-ausnahmezustand",
    title: "Ausnahmezustand",
    description:
      "Ausgangssperren, verstärkte Posten, keine Versammlungen. Sicherheit steigt, Wirtschaft und Freizügigkeit leiden — die Stadt hält den Atem an.",
    durationDays: 10,
    cost: 500,
    scope: "city",
    effects: [
      { meter: "guard", delta: 8 },
      { meter: "crime", delta: -8 },
      { meter: "economy", delta: -6 },
      { meter: "refugees", delta: -4 },
    ],
    spawnedOrders: [
      {
        targetHint: "Stadtwachen / Tore",
        order: "Ausgangssperre ab Dämmerung durchsetzen; Listen führen.",
      },
    ],
  },
  {
    id: "kaiser-steuererlass-audienz",
    title: "Audienz & Steuererlass",
    description:
      "Der Kaiser empfängt Bittsteller und erlässt zeitweise Abgaben. Handel atmet auf, die Kasse leidet — Unruhe in den Gassen legt sich.",
    durationDays: 6,
    cost: 900,
    scope: "palace",
    effects: [
      { meter: "economy", delta: 7 },
      { meter: "unemployment", delta: -5 },
      { meter: "crime", delta: -3 },
      { meter: "guard", delta: -2 },
    ],
    spawnedOrders: [
      {
        targetHint: "Hofkanzlei",
        order: "Steuererlass verkünden und Audienztermine staffeln.",
      },
    ],
  },
  {
    id: "kaiser-anleihe-haus-der-seide",
    title: "Anleihe beim Haus der Seide",
    description:
      "Die Seidenkontore schießen der Stadt Kredit vor. Die Kasse atmet auf — Zinsen und Einfluss der Händler wachsen, Vattrak spürt den Druck.",
    durationDays: 14,
    cost: 0,
    scope: "city",
    treasuryIncomePerDay: 4200,
    effects: [
      { meter: "economy", delta: 4 },
      { meter: "vattrak", delta: -5 },
      { meter: "unemployment", delta: -2 },
    ],
    spawnedOrders: [
      {
        targetHint: "Haus der Seide / Seidenkontor",
        order: "Anleihevertrag siegeln; Tilgungsraten und Handelsprivilegien festhalten.",
      },
    ],
  },
  {
    id: "kaiser-anleihe-haeuser-des-nordens",
    title: "Anleihe bei den Häusern des Nordens",
    description:
      "Die blauen Salons leihen dem Thron. Hofnahe Kredite füllen die Kasse — der Adel verlangt Mitspracherecht bei Garde und Steuern.",
    durationDays: 12,
    cost: 0,
    scope: "palace",
    treasuryIncomePerDay: 3600,
    effects: [
      { meter: "economy", delta: 3 },
      { meter: "guard", delta: -4 },
      { meter: "crime", delta: 2 },
    ],
    spawnedOrders: [
      {
        targetHint: "Häuser des Nordens / Hofkanzlei",
        order: "Kreditlinien und politische Zugeständnisse in der Audienz festschreiben.",
      },
    ],
  },
] as const;

export function findKaiserCard(id: string): KaiserEventCard | null {
  return KAISER_EVENT_CARDS.find((card) => card.id === id) ?? null;
}

export function kaiserCardToCityEffects(
  card: KaiserEventCard,
  districtId: CityDistrictId | null,
): { scope: "city" | "district"; districtId: CityDistrictId | null; effects: MeterEffect[] } {
  if (card.scope === "city") {
    return { scope: "city", districtId: null, effects: card.effects };
  }
  if (card.scope === "palace") {
    return { scope: "district", districtId: "palast", effects: card.effects };
  }
  return {
    scope: "district",
    districtId: districtId ?? card.districtId ?? "unterstadt",
    effects: card.effects,
  };
}
