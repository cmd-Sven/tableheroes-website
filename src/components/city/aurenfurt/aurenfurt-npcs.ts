/**
 * Lokales Karten-Datenmodell für Aurenfurt-NPCs.
 * Felder decken den Narrative-/NPC-Wizard (NPCSchema / GeneratedNPCResult) ab
 * und ergänzen Karten-Attribute. Keine Schreibzugriffe auf Supabase.
 *
 * Barrel: Types/Build/Seeds leben in eigenen Modulen; öffentliche API bleibt hier.
 */

import {
  CITY_BUILDINGS,
  findDistrict,
  type CityDistrictId,
} from "./aurenfurt-districts";
import {
  AURENFURT_FACTIONS,
  findFaction,
  type FactionId,
} from "./aurenfurt-factions";
import { bindNpcSnaps } from "./aurenfurt-city-sim";
import { faithLineOf } from "./aurenfurt-faith";
import { districtMetricsOn, utcToday } from "./aurenfurt-history";
import type { KeyLocation } from "./aurenfurt-locations";
import type { CityInfluenceTier } from "@/src/lib/npcs/city-simulation";
import { buildNpc } from "./aurenfurt-npc-build";
import { FACTION_LEADER_SEEDS } from "./data/aurenfurt-npc-leader-seeds";
import { OPERATOR_ONLY_SEEDS } from "./data/aurenfurt-npc-operator-seeds";
import {
  FACTION_HQ_LOCATION,
  type AurenfurtNpc,
  type AurenfurtNpcWizardPrefill,
  type NpcAlignment,
  type NpcCatalogStats,
} from "./aurenfurt-npc-types";

export {
  NPC_PORTRAIT_PLACEHOLDER,
  DISPOSITION_LABELS,
  FACTION_HQ_LOCATION,
  npcDetailHref,
  type NpcMapRole,
  type NpcDisposition,
  type InfluenceAndLoyalty,
  type NpcNarrativeHook,
  type NpcCheckResult,
  type NpcAlignment,
  type NpcStatus,
  type AurenfurtNpc,
  type AurenfurtNpcWizardPrefill,
  type NpcSeed,
  type NpcDetailLinkContext,
  type NpcCatalogStats,
} from "./aurenfurt-npc-types";

export { buildNpc, citySimFromAurenfurtSeed } from "./aurenfurt-npc-build";

function clamp01(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

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

  const kaiser = buildNpc({
    id: "npc-kaiser-artheus",
    mapRoles: ["leader", "operator"],
    districtId: "palast",
    factionId: "haeuser-des-nordens",
    locationId: "98fd35d1-f789-4c91-afef-0215ed4b21e7",
    name: "Kaiser Artheus Flammguard der Zweite",
    title: "Kaiser von Aurelis",
    role: "Kaiser",
    race: "Mensch",
    alignment: "Lawful Neutral",
    description:
      "Artheus Flammguard der Zweite sitzt im Festungspalast und spricht Recht für die ganze Stadt. Sein Wort wird Gesetz, sein Befehl geht an Garde, Zölle und den knappen Vattrak-Vorrat.",
    appearance: "Hager, grau an den Schläfen, der Mantel mit dem Flammenwappen schwer auf den Schultern.",
    personality_traits: "Gemessen, ungeduldig gegen Widerspruch, präzise in jeder Formulierung.",
    gm_notes:
      "Mächtigste Figur der Stadtsimulation. Gesetze und Befehle legt der SL als Stadtereignis aus. Der Katalogeintrag ist der Betreiber des Festungspalasts.",
    true_nature: "Der Thron ist seine Waffe. Wer ihn bedient, bedient die Stadt.",
    hidden_agenda: "Den Vorrat und die Garde so verteilen, dass kein Viertel stark genug wird, ihm zu widersprechen.",
    secret_entry: "Eine private Treppe führt von seinem Arbeitszimmer in den inneren Hof der Wache.",
    hooks: [
      {
        role: "Audienz",
        description: "Wer ein Gesetz will, muss es vor ihm in einem Satz sagen können.",
        is_alive: true,
      },
    ],
    checks: [],
    influence: 96,
    loyalty: 90,
    agenda: "Gesetze erlassen und Befehle erteilen, die die ganze Stadt binden.",
    darkSecret:
      "Er hat schon einmal Malanthir in einer Nacht der Knappheit an die Hofwache ausgeben lassen und die Spur im Protokoll getilgt.",
    intelValue: 28,
    disposition: "misstrauisch",
  });
  kaiser.cityInfluenceTier = "apex_global";
  kaiser.cityAxisLoyalCriminal = -5;
  kaiser.cityAxisGreedyAltruist = -2;
  kaiser.cityAxisPiousSkeptic = -1;
  kaiser.cityAxisSuperstitionReason = 3;
  kaiser.cityDeity = "Elysia";
  kaiser.cityAgenda = "Gesetze erlassen, Befehle erteilen und den Vattrak-Vorrat nach seinem Rang verteilen.";
  byId.set(kaiser.id, kaiser);

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
function clampAxis(value: number) {
  return Math.max(-5, Math.min(5, Math.round(value)));
}

/** Anhaltendes Malanthir schiebt die Gesinnung von gut nach böse, ohne den Katalog zu überschreiben. */
function corruptAlignment(alignment: NpcAlignment, malanthir: number): NpcAlignment {
  const steps = malanthir >= 70 ? 2 : malanthir >= 42 ? 1 : 0;
  if (steps === 0) return alignment;
  let order: "Lawful" | "Neutral" | "Chaotic" = "Neutral";
  let moral = 1;
  if (alignment.startsWith("Lawful")) order = "Lawful";
  else if (alignment.startsWith("Chaotic")) order = "Chaotic";
  if (alignment.includes("Good")) moral = 0;
  else if (alignment.includes("Evil")) moral = 2;
  moral = Math.min(2, moral + steps);
  if (order === "Neutral" && moral === 1) return "True Neutral";
  const moralWord = moral === 0 ? "Good" : moral === 2 ? "Evil" : "Neutral";
  return `${order} ${moralWord}` as NpcAlignment;
}

export function withDistrictModulation(npc: AurenfurtNpc, day = utcToday()): AurenfurtNpc {
  const sim = districtMetricsOn(npc.districtId, day);
  const standing = findFaction(npc.factionId, day);
  const influenceBoost = standing
    ? standing.power * 0.08 + standing.economicImpact * 0.05
    : 0;
  const intelBoost = sim.crime * 0.12 + sim.malanthir * 0.05;
  const rot = sim.malanthir / 100;

  return {
    ...npc,
    alignment: corruptAlignment(npc.alignment, sim.malanthir),
    influenceAndLoyalty: {
      ...npc.influenceAndLoyalty,
      influence: clamp01(npc.influenceAndLoyalty.influence * 0.9 + influenceBoost),
      loyalty: clamp01(npc.influenceAndLoyalty.loyalty * (1 - rot * 0.55) + sim.vattrak * 0.04),
      agenda: npc.influenceAndLoyalty.agenda,
    },
    intelValue: clamp01(npc.intelValue * 0.88 + intelBoost),
    cityAxisLoyalCriminal: clampAxis(npc.cityAxisLoyalCriminal + rot * 3.2),
    cityAxisGreedyAltruist: clampAxis(npc.cityAxisGreedyAltruist - rot * 3.2),
    cityAxisSuperstitionReason: clampAxis(npc.cityAxisSuperstitionReason - rot * 2.4),
    cityAxisPiousSkeptic: clampAxis(npc.cityAxisPiousSkeptic + rot * 1.2),
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

const NPC_TIER_WEIGHT: Record<CityInfluenceTier, number> = {
  local: 1,
  regional_economy: 2,
  authority_faction: 3,
  apex_global: 5,
};

bindNpcSnaps(
  allAurenfurtNpcs()
    .filter((npc) => npc.forCitySimulation)
    .map((npc) => ({
      districtId: npc.districtId,
      loyalCriminal: npc.cityAxisLoyalCriminal,
      greedyAltruist: npc.cityAxisGreedyAltruist,
      influence: npc.influenceAndLoyalty.influence,
      tierWeight: NPC_TIER_WEIGHT[npc.cityInfluenceTier] ?? 1,
      tier: npc.cityInfluenceTier,
      locationId: npc.locationId,
      faith: faithLineOf(npc.cityDeity),
    })),
);
