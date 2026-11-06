/**
 * Ereigniskarten + Automatisierungen für die 9 Aurenfurt-Straßenhändler
 * (IDs aus scripts/seed-aurenfurt-street-merchants.mjs).
 */

import type { CityEventCard, NpcAbility } from "@/src/lib/npcs/city-simulation";
import { makeAbility, makeEventCard } from "../aurenfurt-card-factory";

const MERCHANT_NPC = (n: number) => `aaf30001-0001-4000-8000-00000000000${n}`;

export type NpcEventPack = {
  cards: CityEventCard[];
  abilities: NpcAbility[];
};

function localCloseShop(id: string, title: string, days: number): CityEventCard {
  return makeEventCard({
    id,
    title,
    text: `Der Laden bleibt ${days} Tage geschlossen. Lokaler Handel stockt, die Gasse wird unruhiger.`,
    sortOrder: 0,
    durationDays: days,
    range: "district",
    effects: [
      { meter: "economy", delta: -5 },
      { meter: "unemployment", delta: 3 },
    ],
  });
}

function localPriceHike(id: string, title: string): CityEventCard {
  return makeEventCard({
    id,
    title,
    text: "Preise steigen scharf. Wenige kaufen noch — Knappheit wird sichtbar, Unmut wächst.",
    sortOrder: 1,
    durationDays: 5,
    range: "district",
    effects: [
      { meter: "economy", delta: -3 },
      { meter: "crime", delta: 4 },
      { meter: "unemployment", delta: 2 },
    ],
  });
}

function scarcityCloseAbility(id: string, title: string): NpcAbility {
  return makeAbility({
    id,
    title,
    enabled: true,
    conditions: [{ meter: "economy", op: "lt", value: 35 }],
    effects: [
      { meter: "economy", delta: -4 },
      { meter: "unemployment", delta: 3 },
    ],
    durationDays: 4,
    cooldownDays: 12,
  });
}

/** Packs keyed by seeded merchant NPC UUID. */
export const STREET_MERCHANT_EVENT_PACKS: Record<string, NpcEventPack> = {
  [MERCHANT_NPC(1)]: {
    cards: [
      localCloseShop("m1-laden-zu", "Fundstücke schließen", 3),
      localPriceHike("m1-preise", "Heiße Preise"),
      makeEventCard({
        id: "m1-dietriche",
        title: "Dietriche unter dem Tisch",
        text: "Findus schiebt Diebeswerkzeug. Kriminalität steigt lokal, die Garde wird misstrauisch.",
        sortOrder: 2,
        durationDays: 4,
        range: "district",
        effects: [
          { meter: "crime", delta: 7 },
          { meter: "malanthir", delta: 3 },
          { meter: "guard", delta: -2 },
        ],
      }),
    ],
    abilities: [scarcityCloseAbility("m1-auto-knappheit", "Bei Knappheit: Stand dichtmachen")],
  },
  [MERCHANT_NPC(2)]: {
    cards: [
      localCloseShop("m2-laden-zu", "Straßenesse schließt", 2),
      localPriceHike("m2-preise", "Fleischpreise hoch"),
    ],
    abilities: [
      makeAbility({
        id: "m2-auto-hunger",
        title: "Bei Hunger: Rationen verknappen",
        enabled: true,
        conditions: [{ meter: "refugees", op: "gt", value: 55 }],
        effects: [
          { meter: "economy", delta: -3 },
          { meter: "crime", delta: 4 },
        ],
        durationDays: 5,
        cooldownDays: 14,
      }),
    ],
  },
  [MERCHANT_NPC(3)]: {
    cards: [
      localCloseShop("m3-laden-zu", "Mixturenpause", 3),
      makeEventCard({
        id: "m3-heiltrank-aktion",
        title: "Heiltrank-Spende",
        text: "Gaysimir gibt verbilligte Tränke aus. Wirtschaft und Vertrauen steigen kurz.",
        sortOrder: 1,
        durationDays: 4,
        range: "district",
        effects: [
          { meter: "economy", delta: 4 },
          { meter: "crime", delta: -2 },
        ],
      }),
    ],
    abilities: [scarcityCloseAbility("m3-auto-knappheit", "Bei Knappheit: Labor schließen")],
  },
  [MERCHANT_NPC(4)]: {
    cards: [
      localCloseShop("m4-laden-zu", "Kuriositäten zu", 4),
      makeEventCard({
        id: "m4-ritualnacht",
        title: "Flüsternde Regale",
        text: "Konrad öffnet nachts für Sammler. Malanthir und Aberglaube steigen.",
        sortOrder: 1,
        durationDays: 3,
        range: "district",
        effects: [
          { meter: "malanthir", delta: 6 },
          { meter: "crime", delta: 3 },
          { meter: "chromus", delta: 4 },
        ],
      }),
    ],
    abilities: [
      makeAbility({
        id: "m4-auto-malanthir",
        title: "Bei Malanthir-Hoch: Ware verstecken",
        enabled: true,
        conditions: [{ meter: "malanthir", op: "gt", value: 60 }],
        effects: [
          { meter: "malanthir", delta: -4 },
          { meter: "economy", delta: -3 },
        ],
        durationDays: 4,
        cooldownDays: 16,
      }),
    ],
  },
  [MERCHANT_NPC(5)]: {
    cards: [
      localCloseShop("m5-laden-zu", "Holzwerk pausiert", 3),
      localPriceHike("m5-preise", "Bogenpreise hoch"),
    ],
    abilities: [scarcityCloseAbility("m5-auto-knappheit", "Bei Knappheit: Werkstatt zu")],
  },
  [MERCHANT_NPC(6)]: {
    cards: [
      localCloseShop("m6-laden-zu", "Instrumente verstummen", 2),
      makeEventCard({
        id: "m6-gassenkonzert",
        title: "Gassenkonzert",
        text: "Goward spielt gratis. Stimmung und Wirtschaft heben sich lokal.",
        sortOrder: 1,
        durationDays: 2,
        range: "district",
        effects: [
          { meter: "economy", delta: 5 },
          { meter: "crime", delta: -3 },
        ],
      }),
    ],
    abilities: [
      makeAbility({
        id: "m6-auto-kriminalitaet",
        title: "Bei hoher Kriminalität: nur noch Tagsüber",
        enabled: true,
        conditions: [{ meter: "crime", op: "gt", value: 65 }],
        effects: [
          { meter: "economy", delta: -2 },
          { meter: "crime", delta: -2 },
        ],
        durationDays: 5,
        cooldownDays: 12,
      }),
    ],
  },
  [MERCHANT_NPC(7)]: {
    cards: [
      localCloseShop("m7-laden-zu", "Backofen kalt", 2),
      makeEventCard({
        id: "m7-brotspende",
        title: "Brot an Flüchtlinge",
        text: "Ratali verteilt Tagesrationen. Fluchtdruck sinkt, Vorräte leiden.",
        sortOrder: 1,
        durationDays: 4,
        range: "district",
        effects: [
          { meter: "refugees", delta: -6 },
          { meter: "economy", delta: -2 },
          { meter: "vattrak", delta: -3 },
        ],
      }),
    ],
    abilities: [
      makeAbility({
        id: "m7-auto-fluechtlinge",
        title: "Bei Flüchtlingshoch: Brotpreise erhöhen",
        enabled: true,
        conditions: [{ meter: "refugees", op: "gt", value: 50 }],
        effects: [
          { meter: "economy", delta: -3 },
          { meter: "crime", delta: 3 },
        ],
        durationDays: 5,
        cooldownDays: 10,
      }),
    ],
  },
  [MERCHANT_NPC(8)]: {
    cards: [
      localCloseShop("m8-laden-zu", "Beschaffung pausiert", 3),
      localPriceHike("m8-preise", "Adelsware teurer"),
    ],
    abilities: [scarcityCloseAbility("m8-auto-knappheit", "Bei Knappheit: nur Stammkunden")],
  },
  [MERCHANT_NPC(9)]: {
    cards: [
      localCloseShop("m9-laden-zu", "Wissenschatz zu", 3),
      makeEventCard({
        id: "m9-lesung",
        title: "Öffentliche Lesung",
        text: "Kramm liest aus Stadtchroniken. Bildung und Ruhe in der Gasse.",
        sortOrder: 1,
        durationDays: 2,
        range: "district",
        effects: [
          { meter: "crime", delta: -3 },
          { meter: "economy", delta: 2 },
          { meter: "elysia", delta: 2 },
        ],
      }),
    ],
    abilities: [
      makeAbility({
        id: "m9-auto-unruhe",
        title: "Bei Unruhe: Laden verriegeln",
        enabled: true,
        conditions: [{ meter: "crime", op: "gt", value: 70 }],
        effects: [
          { meter: "economy", delta: -4 },
          { meter: "crime", delta: -2 },
        ],
        durationDays: 3,
        cooldownDays: 14,
      }),
    ],
  },
};

export function streetMerchantPack(npcId: string): NpcEventPack | null {
  return STREET_MERCHANT_EVENT_PACKS[npcId] ?? null;
}

export const STREET_MERCHANT_NPC_IDS = Object.keys(STREET_MERCHANT_EVENT_PACKS);
