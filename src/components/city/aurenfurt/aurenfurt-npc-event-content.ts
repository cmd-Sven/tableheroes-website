/**
 * ≥2 Ereigniskarten + ≥1 Automatisierung je Stadt-NPC (Katalog + Straßenhändler).
 * Scope folgt Einfluss-Tier / Rolle; keine Fake-NPCs.
 */

import type { CityDistrictId } from "./aurenfurt-districts";
import type {
  CityInfluenceTier,
  CityEventCard,
  NpcAbility,
} from "@/src/lib/npcs/city-simulation";
import { makeAbility, makeEventCard, tierDuration, tierRange } from "./aurenfurt-card-factory";
import { KAISER_EVENT_CARDS } from "./aurenfurt-kaiser-cards";
import {
  STREET_MERCHANT_EVENT_PACKS,
  type NpcEventPack,
} from "./data/aurenfurt-street-merchant-event-content";

export type { NpcEventPack };

type ContentSeed = {
  id: string;
  name: string;
  role: string;
  districtId: CityDistrictId;
  tier: CityInfluenceTier;
  isLeader: boolean;
  factionId: string;
};

function kaiserPack(): NpcEventPack {
  const cards: CityEventCard[] = KAISER_EVENT_CARDS.map((card, index) =>
    makeEventCard({
      id: card.id,
      title: card.title,
      text: card.description,
      sortOrder: index,
      durationDays: card.durationDays,
      range: card.scope === "district" ? "district" : "city",
      extraDistrictIds: card.scope === "palace" ? ["palast"] : [],
      effects: card.effects,
      imageUrl: card.imageUrl ?? null,
    }),
  );
  return {
    cards,
    abilities: [
      makeAbility({
        id: "kaiser-auto-fluechtlingsstopp",
        title: "Flüchtlingsstopp an den Toren",
        enabled: true,
        roleGate: "Kaiser",
        /** Beliebiges Viertel > 70 löst aus; Wirkung nur dort, bis wieder ≤ 70. */
        conditionScope: "city",
        range: "city",
        conditions: [{ meter: "refugees", op: "gt", value: 70 }],
        effects: [
          { meter: "refugees", delta: -6 },
          { meter: "guard", delta: 3 },
          { meter: "economy", delta: -2 },
        ],
        durationDays: 5,
        /** Keine Pause: greift weiter, solange ein Viertel über der Schwelle liegt. */
        cooldownDays: 0,
      }),
      makeAbility({
        id: "kaiser-auto-garde-obergrenze",
        title: "Garde-Obergrenze der Hofkanzlei",
        enabled: true,
        roleGate: "Kaiser",
        /** Überbesetzte Wache irgendwo in der Stadt → Sold und Präsenz drosseln. */
        conditionScope: "city",
        range: "city",
        conditions: [{ meter: "guard", op: "gte", value: 72 }],
        effects: [
          { meter: "guard", delta: -6 },
          { meter: "economy", delta: 2 },
          { meter: "crime", delta: 2 },
        ],
        durationDays: 6,
        cooldownDays: 0,
      }),
    ],
  };
}

function hauptmannPack(seed: ContentSeed): NpcEventPack {
  return {
    cards: [
      makeEventCard({
        id: `${seed.id}-patrouille`,
        title: "Verstärkte Patrouille",
        text: "Die Garde verdichtet die Runden im Viertel und an den Nachbartoren.",
        sortOrder: 0,
        durationDays: tierDuration(seed.tier),
        range: "adjacent",
        effects: [
          { meter: "guard", delta: 6 },
          { meter: "crime", delta: -5 },
        ],
      }),
      makeEventCard({
        id: `${seed.id}-tor-sperre`,
        title: "Tor teilweise sperren",
        text: "Ein Tor wird kontrolliert geschlossen. Flüchtlinge stauen sich, Sicherheit steigt.",
        sortOrder: 1,
        durationDays: 5,
        range: "city",
        effects: [
          { meter: "refugees", delta: -5 },
          { meter: "guard", delta: 4 },
          { meter: "economy", delta: -4 },
        ],
      }),
    ],
    abilities: [
      makeAbility({
        id: `${seed.id}-auto-extremkriminalitaet`,
        title: "Stadtweite Sicherheitslage",
        enabled: true,
        factionGate: "stadtwachen",
        conditionScope: "city",
        range: "city",
        conditions: [{ meter: "crime", op: "gte", value: 90 }],
        effects: [
          { meter: "crime", delta: -7 },
          { meter: "guard", delta: 6 },
          { meter: "economy", delta: -3 },
        ],
        durationDays: 6,
        cooldownDays: 16,
        relationshipTarget: "rival_faction",
        relationshipDelta: -6,
        counterFactionId: "rotes-auge",
        counterDelayDays: 2,
        counterDurationDays: 3,
        counterEffects: [{ meter: "crime", delta: 4 }],
      }),
    ],
  };
}

function guardLikePack(seed: ContentSeed): NpcEventPack {
  return {
    cards: [
      makeEventCard({
        id: `${seed.id}-posten`,
        title: "Posten verdoppeln",
        text: "Mehr Helme an diesem Tor oder dieser Stube — das Viertel atmet auf.",
        sortOrder: 0,
        durationDays: tierDuration(seed.tier),
        range: tierRange(seed.tier),
        effects: [
          { meter: "guard", delta: 5 },
          { meter: "crime", delta: -4 },
        ],
      }),
      makeEventCard({
        id: `${seed.id}-kontrolle`,
        title: "Personenkontrolle",
        text: "Jeder Wagen wird geprüft. Schmuggel stockt, Handel auch.",
        sortOrder: 1,
        durationDays: 4,
        range: "district",
        effects: [
          { meter: "malanthir", delta: -5 },
          { meter: "crime", delta: -3 },
          { meter: "economy", delta: -3 },
        ],
      }),
    ],
    abilities: [
      makeAbility({
        id: `${seed.id}-auto-crime`,
        title: "Bei hoher Kriminalität: Sperrstunde",
        enabled: true,
        conditions: [{ meter: "crime", op: "gt", value: 65 }],
        effects: [
          { meter: "crime", delta: -4 },
          { meter: "economy", delta: -2 },
        ],
        durationDays: 4,
        cooldownDays: 12,
      }),
    ],
  };
}

function merchantLikePack(seed: ContentSeed): NpcEventPack {
  return {
    cards: [
      makeEventCard({
        id: `${seed.id}-laden-zu`,
        title: "Laden schließen",
        text: `${seed.name} schließt für einige Tage. Die Gasse spürt den Ausfall.`,
        sortOrder: 0,
        durationDays: 3,
        range: "district",
        effects: [
          { meter: "economy", delta: -5 },
          { meter: "unemployment", delta: 3 },
        ],
      }),
      makeEventCard({
        id: `${seed.id}-preise`,
        title: "Preise erhöhen",
        text: "Waren werden teurer. Knappheit wird spürbar, Unmut steigt.",
        sortOrder: 1,
        durationDays: 5,
        range: "district",
        effects: [
          { meter: "economy", delta: -3 },
          { meter: "crime", delta: 3 },
        ],
      }),
    ],
    abilities: [
      makeAbility({
        id: `${seed.id}-auto-knappheit`,
        title: "Bei schwacher Wirtschaft: Laden schließen",
        enabled: true,
        conditions: [{ meter: "economy", op: "lt", value: 40 }],
        effects: [
          { meter: "economy", delta: -4 },
          { meter: "unemployment", delta: 2 },
        ],
        durationDays: 4,
        cooldownDays: 12,
      }),
    ],
  };
}

function faithPack(seed: ContentSeed): NpcEventPack {
  return {
    cards: [
      makeEventCard({
        id: `${seed.id}-prozession`,
        title: "Prozession",
        text: "Fahnen und Gesang durchs Viertel. Ordnung und Elysia steigen.",
        sortOrder: 0,
        durationDays: tierDuration(seed.tier),
        range: tierRange(seed.tier),
        effects: [
          { meter: "elysia", delta: 6 },
          { meter: "crime", delta: -3 },
        ],
      }),
      makeEventCard({
        id: `${seed.id}-almosen`,
        title: "Almosen ausgeben",
        text: "Brot und Trost für Bedürftige. Fluchtdruck sinkt leicht.",
        sortOrder: 1,
        durationDays: 4,
        range: "district",
        effects: [
          { meter: "refugees", delta: -4 },
          { meter: "unemployment", delta: -2 },
          { meter: "economy", delta: -2 },
        ],
      }),
    ],
    abilities: [
      makeAbility({
        id: `${seed.id}-auto-unruhe`,
        title: "Bei Unruhe: Mahnwache",
        enabled: true,
        conditions: [{ meter: "crime", op: "gt", value: 55 }],
        effects: [
          { meter: "crime", delta: -3 },
          { meter: "elysia", delta: 3 },
        ],
        durationDays: 5,
        cooldownDays: 14,
      }),
    ],
  };
}

function underworldPack(seed: ContentSeed): NpcEventPack {
  return {
    cards: [
      makeEventCard({
        id: `${seed.id}-schattenmarkt`,
        title: "Schattenmarkt öffnen",
        text: "Versteckte Stände blühen. Malanthir und Verbrechen steigen.",
        sortOrder: 0,
        durationDays: tierDuration(seed.tier),
        range: tierRange(seed.tier),
        effects: [
          { meter: "malanthir", delta: 6 },
          { meter: "crime", delta: 5 },
          { meter: "economy", delta: 3 },
        ],
      }),
      makeEventCard({
        id: `${seed.id}-einschuechtern`,
        title: "Einschüchtern",
        text: "Zeugen schweigen. Die Garde findet nichts — die Gasse auch nicht.",
        sortOrder: 1,
        durationDays: 4,
        range: "district",
        effects: [
          { meter: "crime", delta: 4 },
          { meter: "guard", delta: -4 },
        ],
      }),
    ],
    abilities: [
      makeAbility({
        id: `${seed.id}-auto-garde-schwach`,
        title: "Bei schwacher Garde: Revier ausweiten",
        enabled: true,
        conditions: [{ meter: "guard", op: "lt", value: 40 }],
        effects: [
          { meter: "crime", delta: 5 },
          { meter: "malanthir", delta: 3 },
        ],
        durationDays: 5,
        cooldownDays: 16,
      }),
    ],
  };
}

function leaderDefaultPack(seed: ContentSeed): NpcEventPack {
  return {
    cards: [
      makeEventCard({
        id: `${seed.id}-aufruf`,
        title: "Öffentlicher Aufruf",
        text: `${seed.name} spricht zu Anhängern. Einfluss und Ordnung verschieben sich.`,
        sortOrder: 0,
        durationDays: tierDuration(seed.tier),
        range: tierRange(seed.tier),
        effects: [
          { meter: "economy", delta: 3 },
          { meter: "crime", delta: -2 },
        ],
      }),
      makeEventCard({
        id: `${seed.id}-sanktion`,
        title: "Fraktionssanktion",
        text: "Druck auf Rivalen und Säumige. Wirtschaft und Unruhe schwanken.",
        sortOrder: 1,
        durationDays: 5,
        range: "adjacent",
        effects: [
          { meter: "economy", delta: -3 },
          { meter: "unemployment", delta: 3 },
          { meter: "crime", delta: 2 },
        ],
      }),
    ],
    abilities: [
      makeAbility({
        id: `${seed.id}-auto-wirtschaft`,
        title: "Bei Wirtschaftstief: Notmaßnahme",
        enabled: true,
        conditions: [{ meter: "economy", op: "lt", value: 35 }],
        effects: [
          { meter: "economy", delta: 4 },
          { meter: "vattrak", delta: -3 },
        ],
        durationDays: 5,
        cooldownDays: 18,
      }),
    ],
  };
}

function operatorDefaultPack(seed: ContentSeed): NpcEventPack {
  return {
    cards: [
      makeEventCard({
        id: `${seed.id}-oeffnen`,
        title: "Ort besonders öffnen",
        text: `${seed.name} zieht mehr Besucher an. Handel und Betrieb steigen.`,
        sortOrder: 0,
        durationDays: 4,
        range: "district",
        effects: [
          { meter: "economy", delta: 4 },
          { meter: "crime", delta: 2 },
        ],
      }),
      makeEventCard({
        id: `${seed.id}-schliessen`,
        title: "Ort vorübergehend schließen",
        text: "Tore zu. Die unmittelbare Umgebung spürt die Lücke.",
        sortOrder: 1,
        durationDays: 3,
        range: "district",
        effects: [
          { meter: "economy", delta: -4 },
          { meter: "unemployment", delta: 2 },
        ],
      }),
    ],
    abilities: [
      makeAbility({
        id: `${seed.id}-auto-crime`,
        title: "Bei hoher Kriminalität: früher schließen",
        enabled: true,
        conditions: [{ meter: "crime", op: "gt", value: 60 }],
        effects: [
          { meter: "economy", delta: -3 },
          { meter: "crime", delta: -2 },
        ],
        durationDays: 4,
        cooldownDays: 12,
      }),
    ],
  };
}

function packForCatalog(seed: ContentSeed): NpcEventPack {
  if (seed.id === "npc-kaiser-artheus") return kaiserPack();
  const role = seed.role.toLowerCase();
  if (seed.id === "npc-leader-stadtwachen" || /hauptmann/.test(role)) {
    return hauptmannPack(seed);
  }
  if (/wache|wachtmeister|sergeant|korporal|garde|tor/.test(role)) {
    return guardLikePack(seed);
  }
  if (seed.factionId === "rotes-auge" || /schmugg|hehl|schatten/.test(role)) {
    return underworldPack(seed);
  }
  if (/kapell|küster|prior|konklave|gärtner|licht|goldchor|numerus/.test(role)) {
    return faithPack(seed);
  }
  if (/wirt|händler|markt|schmied|salon|archiv|bibliothek/.test(role)) {
    return merchantLikePack(seed);
  }
  if (seed.isLeader) return leaderDefaultPack(seed);
  return operatorDefaultPack(seed);
}

const catalogCache = new Map<string, NpcEventPack>();

/** Ereignis-Pack für einen Katalog-NPC (id wie npc-leader-…). */
export function catalogNpcEventPack(seed: ContentSeed): NpcEventPack {
  const hit = catalogCache.get(seed.id);
  if (hit) return hit;
  const pack = packForCatalog(seed);
  catalogCache.set(seed.id, pack);
  return pack;
}

/** Anreichern: leere Decks/Fähigkeiten aus Content füllen. */
export function enrichNpcEventContent(input: {
  id: string;
  catalogId?: string | null;
  name: string;
  role: string;
  districtId: CityDistrictId;
  tier: CityInfluenceTier | null;
  isLeader?: boolean;
  factionId: string | null;
  cards: CityEventCard[];
  abilities: NpcAbility[];
}): { cards: CityEventCard[]; abilities: NpcAbility[] } {
  let cards = input.cards;
  let abilities = input.abilities;

  const merchant = STREET_MERCHANT_EVENT_PACKS[input.id];
  if (merchant) {
    if (cards.length < 2) cards = merchant.cards;
    if (abilities.length < 1) abilities = merchant.abilities;
    return { cards, abilities };
  }

  const catalogId = input.catalogId?.trim() || (/^npc-/.test(input.id) ? input.id : null);
  if (catalogId && input.tier) {
    const pack = catalogNpcEventPack({
      id: catalogId,
      name: input.name,
      role: input.role,
      districtId: input.districtId,
      tier: input.tier,
      isLeader: Boolean(input.isLeader),
      factionId: input.factionId ?? "",
    });
    if (cards.length < 2) cards = pack.cards;
    if (abilities.length < 1) {
      abilities = pack.abilities;
    } else if (catalogId === "npc-leader-stadtwachen") {
      // Alte Flüchtlings-Auto durch stadtweite Crime-Auto ersetzen.
      const nextId = `${catalogId}-auto-extremkriminalitaet`;
      if (!abilities.some((ability) => ability.id === nextId)) {
        abilities = [
          ...abilities.filter((ability) => ability.id !== `${catalogId}-auto-fluechtlinge`),
          ...pack.abilities.filter((ability) => ability.id === nextId),
        ];
      }
    } else if (catalogId === "npc-kaiser-artheus") {
      // Kaiser-Autos aus dem Pack nachziehen (Flüchtlingsstopp + Garde-Obergrenze).
      const keepIds = new Set([
        "kaiser-auto-fluechtlingsstopp",
        "kaiser-auto-garde-obergrenze",
      ]);
      const refreshed = pack.abilities.filter((ability) => keepIds.has(ability.id));
      if (refreshed.length > 0) {
        abilities = [
          ...abilities.filter((ability) => !keepIds.has(ability.id)),
          ...refreshed,
        ];
      }
    }
  }

  return { cards, abilities };
}

export function allStreetMerchantPacks() {
  return STREET_MERCHANT_EVENT_PACKS;
}
