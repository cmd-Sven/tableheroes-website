import type { CityDistrictId } from "./aurenfurt-districts";
import { districtMetricsOn, utcToday } from "./aurenfurt-history";
import type { SimProfile } from "./aurenfurt-sim";

export type FactionId =
  | "rotes-auge"
  | "goldkelchen"
  | "haus-der-seide"
  | "stadtwachen"
  | "haeuser-des-nordens"
  | "bund-silberne-rose"
  | "konklave-ewige-ordnung"
  | "zunftbund"
  | "zirkel-observatorium";

/** Religiöse/ideologische Ausrichtung — typisiert an der Projekt-Lore. */
export type IdeologyAlignment =
  | "elysia"
  | "chromus"
  | "malanthir"
  | "imperial"
  | "guild"
  | "neutral";

export type RelationshipKind =
  | "ally"
  | "rival"
  | "patron"
  | "client"
  | "infiltrated"
  | "tension"
  | "subordinate";

export type NetworkLink = {
  targetId: FactionId;
  kind: RelationshipKind;
  /** 0–100 */
  strength: number;
};

export type FactionBlueprint = {
  id: FactionId;
  name: string;
  role: string;
  ideologyAlignment: IdeologyAlignment;
  /** Viertel mit spürbarer Präsenz. */
  districtIds: CityDistrictId[];
  /** Ausgangs-Legalität vor Viertel-Modulation (−100…+100). */
  baseLegality: number;
  /** Statische Kanten; Stärke wird vom Generator leicht angepasst. */
  links: readonly NetworkLink[];
};

export type FactionStanding = {
  id: FactionId;
  name: string;
  role: string;
  ideologyAlignment: IdeologyAlignment;
  ideologyLabel: string;
  /** Einfluss/Macht 0–100 */
  power: number;
  /** Zwiespältigkeit/Legalität −100…+100 */
  legality: number;
  /** Wirtschafts- und Handelsmacht 0–100 */
  economicImpact: number;
  networkRelationships: NetworkLink[];
  districtIds: CityDistrictId[];
};

export const IDEOLOGY_LABELS: Record<IdeologyAlignment, string> = {
  elysia: "Elysia · Bund der Silbernen Rose",
  chromus: "Chromus · Konklave der Ewigen Ordnung",
  malanthir: "Malanthir",
  imperial: "Kaiserlich",
  guild: "Zünftig",
  neutral: "Neutral",
};

export const RELATIONSHIP_LABELS: Record<RelationshipKind, string> = {
  ally: "Verbündet",
  rival: "Rivalität",
  patron: "Patron",
  client: "Klient",
  infiltrated: "Unterwandert",
  tension: "Spannung",
  subordinate: "Unterstellt",
};

/**
 * Fest eingebettete Gruppierungen plus lore-passende Ergänzungen,
 * damit jedes der fünf Hauptviertel mindestens zwei Fraktionen trägt.
 */
export const AURENFURT_FACTIONS: readonly FactionBlueprint[] = [
  {
    id: "rotes-auge",
    name: "Das rote Auge",
    role: "Untergrundschurken und Malanthir-Schmuggler in den roten Gassen.",
    ideologyAlignment: "malanthir",
    districtIds: ["unterstadt"],
    baseLegality: -78,
    links: [
      { targetId: "stadtwachen", kind: "infiltrated", strength: 58 },
      { targetId: "haus-der-seide", kind: "tension", strength: 42 },
      { targetId: "goldkelchen", kind: "tension", strength: 28 },
    ],
  },
  {
    id: "goldkelchen",
    name: "Die Aurenfurter Goldkelchen",
    role: "Barden und Gaukler — heimliche Informanten für das Haus der Seide.",
    ideologyAlignment: "neutral",
    districtIds: ["unterstadt", "handwerkerviertel", "adelsviertel"],
    baseLegality: -12,
    links: [
      { targetId: "haus-der-seide", kind: "client", strength: 72 },
      { targetId: "rotes-auge", kind: "tension", strength: 36 },
      { targetId: "haeuser-des-nordens", kind: "ally", strength: 34 },
    ],
  },
  {
    id: "haus-der-seide",
    name: "Das Haus der Seide",
    role: "Reiche Handelsleute am Markt: hohe Standgebühren, Netz in die Adelshäuser.",
    ideologyAlignment: "neutral",
    districtIds: ["handwerkerviertel", "adelsviertel"],
    baseLegality: 48,
    links: [
      { targetId: "goldkelchen", kind: "patron", strength: 72 },
      { targetId: "haeuser-des-nordens", kind: "ally", strength: 64 },
      { targetId: "zunftbund", kind: "tension", strength: 46 },
      { targetId: "rotes-auge", kind: "rival", strength: 40 },
    ],
  },
  {
    id: "stadtwachen",
    name: "Aurenfurter Stadtwachen",
    role: "Lokale Exekutive unter den kaiserlichen Gardisten — neigt zu Willkür.",
    ideologyAlignment: "imperial",
    districtIds: ["palast", "adelsviertel", "suedtor", "unterstadt", "akademieviertel"],
    baseLegality: 55,
    links: [
      { targetId: "haeuser-des-nordens", kind: "subordinate", strength: 70 },
      { targetId: "rotes-auge", kind: "infiltrated", strength: 58 },
      { targetId: "zunftbund", kind: "tension", strength: 38 },
      { targetId: "konklave-ewige-ordnung", kind: "ally", strength: 32 },
      { targetId: "zirkel-observatorium", kind: "ally", strength: 48 },
    ],
  },
  {
    id: "haeuser-des-nordens",
    name: "Häuser des Nordens",
    role: "Blaue Salons und Wappen: Hofnähe, Gärten, und Druck auf Markt und Garde.",
    ideologyAlignment: "imperial",
    districtIds: ["adelsviertel", "palast"],
    baseLegality: 62,
    links: [
      { targetId: "haus-der-seide", kind: "ally", strength: 64 },
      { targetId: "stadtwachen", kind: "patron", strength: 70 },
      { targetId: "bund-silberne-rose", kind: "tension", strength: 28 },
      { targetId: "konklave-ewige-ordnung", kind: "tension", strength: 34 },
    ],
  },
  {
    id: "bund-silberne-rose",
    name: "Bund der Silbernen Rose",
    role: "Elysia-Anhänger: Hoffnung und offene Höfe gegen gezähltes Schicksal.",
    ideologyAlignment: "elysia",
    districtIds: ["tempelbezirk", "palast"],
    baseLegality: 44,
    links: [
      { targetId: "konklave-ewige-ordnung", kind: "rival", strength: 82 },
      { targetId: "haeuser-des-nordens", kind: "tension", strength: 28 },
      { targetId: "goldkelchen", kind: "ally", strength: 22 },
      { targetId: "zirkel-observatorium", kind: "tension", strength: 36 },
    ],
  },
  {
    id: "konklave-ewige-ordnung",
    name: "Konklave der Ewigen Ordnung",
    role: "Chromus-Liturgie: gezähltes Schicksal, strenge Höfe, Druck auf den Palast.",
    ideologyAlignment: "chromus",
    districtIds: ["tempelbezirk", "palast"],
    baseLegality: 38,
    links: [
      { targetId: "bund-silberne-rose", kind: "rival", strength: 82 },
      { targetId: "stadtwachen", kind: "ally", strength: 32 },
      { targetId: "haeuser-des-nordens", kind: "tension", strength: 34 },
      { targetId: "zirkel-observatorium", kind: "tension", strength: 40 },
    ],
  },
  {
    id: "zunftbund",
    name: "Zunftbund Aurenfurt",
    role: "Essen und Kontore: Verträge wiegen mehr als Wappen.",
    ideologyAlignment: "guild",
    districtIds: ["handwerkerviertel"],
    baseLegality: 36,
    links: [
      { targetId: "haus-der-seide", kind: "tension", strength: 46 },
      { targetId: "stadtwachen", kind: "tension", strength: 38 },
      { targetId: "haeuser-des-nordens", kind: "rival", strength: 30 },
    ],
  },
  {
    id: "zirkel-observatorium",
    name: "Zirkel des Observatoriums",
    role: "Magier und Archivare der Akademie: legale weiße Magie, Sternenkammer und Lehrstuhl zwischen den Konfessionen.",
    ideologyAlignment: "neutral",
    districtIds: ["akademieviertel"],
    baseLegality: 58,
    links: [
      { targetId: "stadtwachen", kind: "ally", strength: 48 },
      { targetId: "bund-silberne-rose", kind: "tension", strength: 36 },
      { targetId: "konklave-ewige-ordnung", kind: "tension", strength: 40 },
      { targetId: "rotes-auge", kind: "rival", strength: 44 },
    ],
  },
] as const;

function clamp01(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function clampLegality(value: number) {
  return Math.max(-100, Math.min(100, Math.round(value)));
}

function mean(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function cellStrength(sim: SimProfile, name: string) {
  return sim.underground.find((cell) => cell.name === name)?.strength ?? 0;
}

function districtSims(districtIds: CityDistrictId[], day: number): SimProfile[] {
  return districtIds.map((id) => districtMetricsOn(id, day));
}

function blendLegality(base: number, sims: SimProfile[], weightCrime = 0.35, weightMalanthir = 0.25) {
  const crime = mean(sims.map((sim) => sim.crime));
  const malanthir = mean(sims.map((sim) => sim.malanthir));
  const guard = mean(sims.map((sim) => sim.guard));
  return clampLegality(base - crime * weightCrime - malanthir * weightMalanthir + (guard - 50) * 0.12);
}

function scaleLinks(links: readonly NetworkLink[], factor: number): NetworkLink[] {
  return links.map((link) => ({
    ...link,
    strength: clamp01(link.strength * factor),
  }));
}

type StandingCore = Pick<FactionStanding, "power" | "legality" | "economicImpact"> & {
  linkFactor: number;
};

function standingFromSims(blueprint: FactionBlueprint, day: number): StandingCore {
  const sims = districtSims(blueprint.districtIds, day);
  const unterstadt = districtMetricsOn("unterstadt", day);
  const handwerk = districtMetricsOn("handwerkerviertel", day);
  const adel = districtMetricsOn("adelsviertel", day);
  const tempel = districtMetricsOn("tempelbezirk", day);
  const palast = districtMetricsOn("palast", day);
  const suedtor = districtMetricsOn("suedtor", day);
  const akademie = districtMetricsOn("akademieviertel", day);

  switch (blueprint.id) {
    case "rotes-auge": {
      const whisper = cellStrength(unterstadt, "Flüstern der Roten Gassen");
      const cells = cellStrength(unterstadt, "Malanthir-Zellen");
      return {
        power: clamp01(unterstadt.crime * 0.42 + unterstadt.malanthir * 0.38 + whisper * 0.12 + cells * 0.1),
        legality: blendLegality(blueprint.baseLegality, [unterstadt], 0.2, 0.15),
        economicImpact: clamp01(unterstadt.crime * 0.35 + unterstadt.economy * 0.25 + cells * 0.2),
        linkFactor: 0.85 + unterstadt.malanthir / 400,
      };
    }
    case "goldkelchen": {
      const econ = mean([unterstadt.economy, handwerk.economy, adel.economy]);
      const crime = mean([unterstadt.crime, handwerk.crime]);
      return {
        power: clamp01(econ * 0.35 + (100 - crime) * 0.15 + adel.vattrak * 0.2 + 18),
        legality: blendLegality(blueprint.baseLegality, sims, 0.25, 0.15),
        economicImpact: clamp01(econ * 0.45 + 12),
        linkFactor: 0.9 + econ / 500,
      };
    }
    case "haus-der-seide": {
      const econ = mean([handwerk.economy, adel.economy]);
      return {
        power: clamp01(econ * 0.55 + adel.vattrak * 0.2 + handwerk.economy * 0.15),
        legality: blendLegality(blueprint.baseLegality, [handwerk, adel], 0.2, 0.1),
        economicImpact: clamp01(econ * 0.7 + 18),
        linkFactor: 0.88 + econ / 450,
      };
    }
    case "stadtwachen": {
      const guard = mean([
        palast.guard,
        adel.guard,
        suedtor.guard,
        handwerk.guard,
        unterstadt.guard,
        tempel.guard,
        akademie.guard,
      ]);
      const corruption = mean([unterstadt.malanthir, unterstadt.crime]) * 0.2;
      return {
        power: clamp01(guard * 0.75 + palast.guard * 0.15 - corruption),
        legality: clampLegality(blueprint.baseLegality - corruption * 0.8 - unterstadt.crime * 0.15 + palast.vattrak * 0.1),
        economicImpact: clamp01(22 + suedtor.economy * 0.15),
        linkFactor: 0.85 + guard / 400,
      };
    }
    case "haeuser-des-nordens": {
      const salon = cellStrength(adel, "Salons der Häuser");
      return {
        power: clamp01(adel.vattrak * 0.4 + adel.guard * 0.25 + palast.guard * 0.15 + salon * 0.2),
        legality: blendLegality(blueprint.baseLegality, [adel, palast], 0.15, 0.1),
        economicImpact: clamp01(adel.economy * 0.55 + salon * 0.2 + 10),
        linkFactor: 0.9 + adel.vattrak / 500,
      };
    }
    case "bund-silberne-rose": {
      const rose = cellStrength(tempel, "Silberne Rose gegen das Konklave");
      return {
        power: clamp01(tempel.vattrak * 0.35 + rose * 0.45 + (100 - tempel.malanthir) * 0.1),
        legality: blendLegality(blueprint.baseLegality, [tempel], 0.15, 0.2),
        economicImpact: clamp01(tempel.economy * 0.35 + 14),
        linkFactor: 0.85 + rose / 200,
      };
    }
    case "konklave-ewige-ordnung": {
      const liturgy = cellStrength(tempel, "Goldene Liturgie");
      return {
        power: clamp01(tempel.malanthir * 0.25 + liturgy * 0.4 + palast.guard * 0.15 + tempel.guard * 0.15),
        legality: blendLegality(blueprint.baseLegality, [tempel, palast], 0.1, 0.25),
        economicImpact: clamp01(tempel.economy * 0.3 + liturgy * 0.15 + 10),
        linkFactor: 0.85 + liturgy / 220,
      };
    }
    case "zunftbund": {
      const cellar = cellStrength(handwerk, "Zunftkeller");
      return {
        power: clamp01(handwerk.economy * 0.45 + cellar * 0.35 + (100 - handwerk.guard) * 0.1),
        legality: blendLegality(blueprint.baseLegality, [handwerk], 0.2, 0.1),
        economicImpact: clamp01(handwerk.economy * 0.65 + cellar * 0.2),
        linkFactor: 0.88 + handwerk.economy / 450,
      };
    }
    case "zirkel-observatorium": {
      const stern = cellStrength(akademie, "Sternenkammer");
      const archiv = cellStrength(akademie, "Archivversuchung");
      return {
        power: clamp01(akademie.vattrak * 0.45 + stern * 0.25 + akademie.economy * 0.15 + archiv * 0.1),
        legality: blendLegality(blueprint.baseLegality, [akademie], 0.15, 0.2),
        economicImpact: clamp01(akademie.economy * 0.5 + akademie.vattrak * 0.15 + 12),
        linkFactor: 0.88 + akademie.vattrak / 450,
      };
    }
  }
}

export function generateFactionStanding(blueprint: FactionBlueprint, day = utcToday()): FactionStanding {
  const core = standingFromSims(blueprint, day);
  return {
    id: blueprint.id,
    name: blueprint.name,
    role: blueprint.role,
    ideologyAlignment: blueprint.ideologyAlignment,
    ideologyLabel: IDEOLOGY_LABELS[blueprint.ideologyAlignment],
    power: core.power,
    legality: core.legality,
    economicImpact: core.economicImpact,
    networkRelationships: scaleLinks(blueprint.links, core.linkFactor),
    districtIds: [...blueprint.districtIds],
  };
}

export function allFactionStandings(day = utcToday()): FactionStanding[] {
  return AURENFURT_FACTIONS.map((blueprint) => generateFactionStanding(blueprint, day));
}

export function factionsInDistrict(districtId: CityDistrictId, day = utcToday()): FactionStanding[] {
  return allFactionStandings(day).filter((faction) => faction.districtIds.includes(districtId));
}

export function findFaction(id: FactionId, day = utcToday()) {
  const blueprint = AURENFURT_FACTIONS.find((entry) => entry.id === id);
  if (!blueprint) return null;
  return generateFactionStanding(blueprint, day);
}

export function factionName(id: FactionId) {
  return AURENFURT_FACTIONS.find((entry) => entry.id === id)?.name ?? id;
}
