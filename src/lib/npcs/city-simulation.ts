/**
 * Stadt-Simulations-Attribute für NPCs (Aurenfurt u. a.).
 * Wizard-Pflicht nur wenn forCitySimulation === true.
 */

import { z } from "zod";
import type { FactionId } from "@/src/components/city/aurenfurt/aurenfurt-factions";
import { AURENFURT_FACTIONS } from "@/src/components/city/aurenfurt/aurenfurt-factions";

export const CITY_INFLUENCE_TIERS = [
  "local",
  "regional_economy",
  "authority_faction",
  "apex_global",
] as const;

export type CityInfluenceTier = (typeof CITY_INFLUENCE_TIERS)[number];

export const CITY_INFLUENCE_TIER_LABELS: Record<CityInfluenceTier, string> = {
  local: "Lokal",
  regional_economy: "Regional/Wirtschaft",
  authority_faction: "Autorität/Fraktion",
  apex_global: "Apex/Global",
};

/** Ganzzahlig −5…+5 */
export const CityAxisSchema = z.number().int().min(-5).max(5);

export const CITY_METERS = [
  "crime",
  "guard",
  "vattrak",
  "malanthir",
  "economy",
  "unemployment",
  "refugees",
] as const;

export type CityMeter = (typeof CITY_METERS)[number];

export const CITY_METER_LABELS: Record<CityMeter, string> = {
  crime: "Kriminalität",
  guard: "Sicherheit",
  vattrak: "Vattrak",
  malanthir: "Malanthir",
  economy: "Wirtschaft",
  unemployment: "Arbeitslosigkeit",
  refugees: "Flüchtlinge",
};

export const MeterConditionSchema = z.object({
  meter: z.enum(CITY_METERS),
  op: z.enum(["gt", "lt"]),
  value: z.number().min(0).max(100),
});

export const MeterEffectSchema = z.object({
  meter: z.enum(CITY_METERS),
  delta: z.number().min(-20).max(20),
});

export type MeterCondition = z.infer<typeof MeterConditionSchema>;
export type MeterEffect = z.infer<typeof MeterEffectSchema>;

export const CARD_RANGES = ["district", "adjacent", "sector", "city"] as const;
export type CardRange = (typeof CARD_RANGES)[number];

export const CARD_RANGE_LABELS: Record<CardRange, string> = {
  district: "Viertel des NPC",
  adjacent: "Viertel und Nachbarn",
  sector: "Sektor im Viertel",
  city: "Ganze Stadt",
};

export const CityEventCardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  text: z.string().min(1),
  trigger: z.string().optional().nullable(),
  sortOrder: z.number().int().min(0),
  durationDays: z.number().int().min(1).max(90).optional(),
  range: z.enum(CARD_RANGES).optional(),
  sectorLabel: z.string().optional().nullable(),
  extraDistrictIds: z.array(z.string()).max(6).optional(),
  effects: z.array(MeterEffectSchema).max(4).optional(),
});

export type CityEventCard = z.infer<typeof CityEventCardSchema>;

export const AbilityAxisSchema = z.enum([
  "loyalCriminal",
  "greedyAltruist",
  "piousSkeptic",
  "superstitionReason",
]);

export const NpcAbilitySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  enabled: z.boolean(),
  roleGate: z.string().nullable(),
  factionGate: z.string().nullable(),
  axisGate: z
    .object({
      axis: AbilityAxisSchema,
      min: z.number().int().min(-5).max(5),
      max: z.number().int().min(-5).max(5),
    })
    .nullable(),
  conditions: z.array(MeterConditionSchema).max(4),
  effects: z.array(MeterEffectSchema).max(4),
  durationDays: z.number().int().min(1).max(60),
  cooldownDays: z.number().int().min(1).max(180),
  relationshipTarget: z.enum(["none", "same_faction", "rival_faction"]),
  relationshipDelta: z.number().int().min(-30).max(30),
  counterFactionId: z.string().nullable(),
  counterDelayDays: z.number().int().min(1).max(30),
  counterDurationDays: z.number().int().min(1).max(30),
  counterEffects: z.array(MeterEffectSchema).max(3),
});

export type NpcAbility = z.infer<typeof NpcAbilitySchema>;

export const CityCardPlaySchema = z.object({
  cardId: z.string().min(1),
  startedOn: z.string().min(8),
});

export type CityCardPlay = z.infer<typeof CityCardPlaySchema>;

export const CITY_FACTION_IDS = AURENFURT_FACTIONS.map((f) => f.id) as [
  FactionId,
  ...FactionId[],
];

export const CityFactionIdSchema = z.enum(CITY_FACTION_IDS);

/**
 * Gemeinsames Schema. Pflichtfelder greifen nur bei forCitySimulation === true
 * (siehe refineCitySimulationPayload).
 */
export const CitySimulationFieldsSchema = z.object({
  forCitySimulation: z.boolean(),
  cityInfluenceTier: z.enum(CITY_INFLUENCE_TIERS).nullable(),
  cityAxisLoyalCriminal: CityAxisSchema.nullable(),
  cityAxisGreedyAltruist: CityAxisSchema.nullable(),
  cityAxisPiousSkeptic: CityAxisSchema.nullable(),
  cityAxisSuperstitionReason: CityAxisSchema.nullable(),
  cityDeity: z.string().nullable(),
  /** Aurenfurt-Fraktions-ID aus aurenfurt-factions; null = keine */
  cityFactionId: CityFactionIdSchema.nullable(),
  cityAgenda: z.string().nullable(),
  cityEventDeck: z.array(CityEventCardSchema),
  cityAbilities: z.array(NpcAbilitySchema),
  cityCardPlays: z.array(CityCardPlaySchema),
});

export type CitySimulationFields = z.infer<typeof CitySimulationFieldsSchema>;

export const EMPTY_CITY_SIMULATION: CitySimulationFields = {
  forCitySimulation: false,
  cityInfluenceTier: null,
  cityAxisLoyalCriminal: null,
  cityAxisGreedyAltruist: null,
  cityAxisPiousSkeptic: null,
  cityAxisSuperstitionReason: null,
  cityDeity: null,
  cityFactionId: null,
  cityAgenda: null,
  cityEventDeck: [],
  cityAbilities: [],
  cityCardPlays: [],
};

export type CitySimulationDbColumns = {
  for_city_simulation: boolean;
  city_influence_tier: CityInfluenceTier | null;
  city_axis_loyal_criminal: number | null;
  city_axis_greedy_altruist: number | null;
  city_axis_pious_skeptic: number | null;
  city_axis_superstition_reason: number | null;
  city_deity: string | null;
  city_faction_id: string | null;
  city_agenda: string | null;
  city_event_deck: CityEventCard[];
  city_abilities: NpcAbility[];
  city_card_plays: CityCardPlay[];
};

export function citySimulationToDb(
  fields: CitySimulationFields,
): CitySimulationDbColumns {
  /** Bei Nein: Flag false; Startwerte dürfen trotzdem liegen (Migration / später aktivieren). */
  return {
    for_city_simulation: fields.forCitySimulation,
    city_influence_tier: fields.cityInfluenceTier,
    city_axis_loyal_criminal: fields.cityAxisLoyalCriminal,
    city_axis_greedy_altruist: fields.cityAxisGreedyAltruist,
    city_axis_pious_skeptic: fields.cityAxisPiousSkeptic,
    city_axis_superstition_reason: fields.cityAxisSuperstitionReason,
    city_deity: fields.cityDeity?.trim() ? fields.cityDeity.trim() : null,
    city_faction_id: fields.cityFactionId,
    city_agenda: fields.cityAgenda?.trim() ? fields.cityAgenda.trim() : null,
    city_event_deck: fields.cityEventDeck ?? [],
    city_abilities: fields.cityAbilities ?? [],
    city_card_plays: fields.cityCardPlays ?? [],
  };
}

export function citySimulationFromDb(
  row: Partial<CitySimulationDbColumns> | null | undefined,
): CitySimulationFields {
  if (!row) return { ...EMPTY_CITY_SIMULATION };
  const deckRaw = row.city_event_deck;
  const deck = Array.isArray(deckRaw)
    ? deckRaw
        .map((c, i) => {
          const parsed = CityEventCardSchema.safeParse({
            ...c,
            sortOrder:
              typeof (c as CityEventCard)?.sortOrder === "number"
                ? (c as CityEventCard).sortOrder
                : i,
          });
          return parsed.success ? parsed.data : null;
        })
        .filter((c): c is CityEventCard => c != null)
        .sort((a, b) => a.sortOrder - b.sortOrder)
    : [];
  const abilities = parseList(row.city_abilities, NpcAbilitySchema);
  const plays = parseList(row.city_card_plays, CityCardPlaySchema);

  const factionRaw = row.city_faction_id;
  const factionParsed =
    factionRaw && CITY_FACTION_IDS.includes(factionRaw as FactionId)
      ? (factionRaw as FactionId)
      : null;

  return {
    forCitySimulation: Boolean(row.for_city_simulation),
    cityInfluenceTier:
      row.city_influence_tier &&
      (CITY_INFLUENCE_TIERS as readonly string[]).includes(row.city_influence_tier)
        ? row.city_influence_tier
        : null,
    cityAxisLoyalCriminal:
      typeof row.city_axis_loyal_criminal === "number"
        ? row.city_axis_loyal_criminal
        : null,
    cityAxisGreedyAltruist:
      typeof row.city_axis_greedy_altruist === "number"
        ? row.city_axis_greedy_altruist
        : null,
    cityAxisPiousSkeptic:
      typeof row.city_axis_pious_skeptic === "number"
        ? row.city_axis_pious_skeptic
        : null,
    cityAxisSuperstitionReason:
      typeof row.city_axis_superstition_reason === "number"
        ? row.city_axis_superstition_reason
        : null,
    cityDeity: row.city_deity ?? null,
    cityFactionId: factionParsed,
    cityAgenda: row.city_agenda ?? null,
    cityEventDeck: deck,
    cityAbilities: abilities,
    cityCardPlays: plays,
  };
}

function parseList<T>(raw: unknown, schema: z.ZodType<T>): T[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    const parsed = schema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
}

/** Gläubig-Seite des Sliders (links = −5). */
export function requiresCityDeity(piousSkeptic: number | null | undefined): boolean {
  return typeof piousSkeptic === "number" && piousSkeptic <= -1;
}

export function refineCitySimulationPayload(
  fields: CitySimulationFields,
): { ok: true; data: CitySimulationFields } | { ok: false; error: string } {
  if (!fields.forCitySimulation) {
    return {
      ok: true,
      data: {
        ...fields,
        forCitySimulation: false,
        cityEventDeck: fields.cityEventDeck ?? [],
        cityAbilities: fields.cityAbilities ?? [],
        cityCardPlays: fields.cityCardPlays ?? [],
      },
    };
  }

  if (!fields.cityInfluenceTier) {
    return { ok: false, error: "Bitte wähle eine Kategorie / Einflussradius." };
  }
  for (const [key, label] of [
    ["cityAxisLoyalCriminal", "Loyal vs. Kriminell"],
    ["cityAxisGreedyAltruist", "Habgierig vs. Gutmensch"],
    ["cityAxisPiousSkeptic", "Gläubig vs. Ungläubig"],
    ["cityAxisSuperstitionReason", "Aberglaube vs. Aufgeklärt"],
  ] as const) {
    const v = fields[key];
    if (typeof v !== "number" || v < -5 || v > 5 || !Number.isInteger(v)) {
      return { ok: false, error: `Bitte setze den Slider „${label}“ (−5 bis +5).` };
    }
  }
  if (!fields.cityAgenda?.trim()) {
    return { ok: false, error: "Bitte gib eine individuelle Zielvorgabe an." };
  }
  if ((fields.cityAbilities ?? []).some((ability) => !ability.title.trim())) {
    return { ok: false, error: "Jede Situationsfähigkeit braucht einen Titel." };
  }
  if (requiresCityDeity(fields.cityAxisPiousSkeptic) && !fields.cityDeity?.trim()) {
    return {
      ok: false,
      error: "Bei gläubiger Ausprägung ist eine zugehörige Gottheit Pflicht.",
    };
  }

  return {
    ok: true,
    data: {
      ...fields,
      cityDeity: fields.cityDeity?.trim() || null,
      cityAgenda: fields.cityAgenda.trim(),
      cityEventDeck: fields.cityEventDeck ?? [],
      cityAbilities: fields.cityAbilities ?? [],
      cityCardPlays: fields.cityCardPlays ?? [],
    },
  };
}

export function newCityEventCard(partial?: Partial<CityEventCard>): CityEventCard {
  return {
    id:
      partial?.id ??
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    title: partial?.title ?? "",
    text: partial?.text ?? "",
    trigger: partial?.trigger ?? null,
    sortOrder: partial?.sortOrder ?? 0,
    durationDays: partial?.durationDays,
    range: partial?.range,
    sectorLabel: partial?.sectorLabel ?? null,
    extraDistrictIds: partial?.extraDistrictIds ?? [],
    effects: partial?.effects ?? [],
  };
}

export function defaultCardDuration(tier: CityInfluenceTier | null | undefined) {
  if (tier === "apex_global") return 14;
  if (tier === "authority_faction") return 10;
  if (tier === "regional_economy") return 7;
  return 3;
}

export function defaultCardRange(tier: CityInfluenceTier | null | undefined): CardRange {
  if (tier === "apex_global") return "city";
  if (tier === "authority_faction" || tier === "regional_economy") return "adjacent";
  return "district";
}

function freshId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function newNpcAbility(partial?: Partial<NpcAbility>): NpcAbility {
  return {
    id: partial?.id ?? freshId(),
    title: partial?.title ?? "",
    enabled: partial?.enabled ?? true,
    roleGate: partial?.roleGate ?? null,
    factionGate: partial?.factionGate ?? null,
    axisGate: partial?.axisGate ?? null,
    conditions: partial?.conditions ?? [{ meter: "crime", op: "gt", value: 80 }],
    effects: partial?.effects ?? [{ meter: "guard", delta: 6 }],
    durationDays: partial?.durationDays ?? 5,
    cooldownDays: partial?.cooldownDays ?? 14,
    relationshipTarget: partial?.relationshipTarget ?? "none",
    relationshipDelta: partial?.relationshipDelta ?? 0,
    counterFactionId: partial?.counterFactionId ?? null,
    counterDelayDays: partial?.counterDelayDays ?? 2,
    counterDurationDays: partial?.counterDurationDays ?? 3,
    counterEffects: partial?.counterEffects ?? [],
  };
}
