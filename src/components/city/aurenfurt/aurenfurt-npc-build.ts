/**
 * Seed → AurenfurtNpc und Stadt-Sim-Startwerte.
 */

import { findBuilding } from "./aurenfurt-districts";
import { AURENFURT_FACTIONS, factionName, type FactionId } from "./aurenfurt-factions";
import type { CityInfluenceTier, CitySimulationFields } from "@/src/lib/npcs/city-simulation";
import {
  NPC_PORTRAIT_PLACEHOLDER,
  type AurenfurtNpc,
  type NpcAlignment,
  type NpcMapRole,
  type NpcSeed,
} from "./aurenfurt-npc-types";

function clamp01(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function locationName(id: string | null) {
  if (!id) return null;
  return findBuilding(id)?.name ?? id;
}

const DEITY_BY_IDEOLOGY: Record<string, string | null> = {
  elysia: "Elysia",
  chromus: "Chromus",
  malanthir: "Malanthir",
  imperial: null,
  guild: null,
  neutral: null,
};

/**
 * Stadt-Sim-Startwerte für Karten-NPCs aus Fraktion, Rolle und Agenda.
 */
export function citySimFromAurenfurtSeed(seed: {
  mapRoles: NpcMapRole[];
  factionId: FactionId;
  role: string;
  agenda: string;
  alignment: NpcAlignment;
}): CitySimulationFields {
  const isLeader = seed.mapRoles.includes("leader");
  const factionBp = AURENFURT_FACTIONS.find((f) => f.id === seed.factionId);
  const ideology = factionBp?.ideologyAlignment ?? "neutral";
  const roleL = `${seed.role}`.toLowerCase();

  let cityInfluenceTier: CityInfluenceTier = "local";
  if (isLeader && (seed.factionId === "haeuser-des-nordens" || /könig|herrscher|herzog/.test(roleL))) {
    cityInfluenceTier = "apex_global";
  } else if (isLeader || /anführer|meister|abtiss|hauptmann|kommandant|gilde|zunft/.test(roleL)) {
    cityInfluenceTier = "authority_faction";
  } else if (/händler|kauf|kontor|wirt|schmied|markt/.test(roleL)) {
    cityInfluenceTier = "regional_economy";
  }

  let loyalCriminal = 0;
  let greedyAltruist = 0;
  let piousSkeptic = 0;
  let superstitionReason = 0;

  switch (seed.factionId) {
    case "rotes-auge":
      loyalCriminal = isLeader ? 4 : 3;
      greedyAltruist = -3;
      piousSkeptic = -3;
      superstitionReason = -2;
      break;
    case "goldkelchen":
      loyalCriminal = 1;
      greedyAltruist = -1;
      piousSkeptic = 1;
      superstitionReason = 0;
      break;
    case "haus-der-seide":
      loyalCriminal = 0;
      greedyAltruist = -4;
      piousSkeptic = 2;
      superstitionReason = 2;
      cityInfluenceTier = isLeader ? "authority_faction" : "regional_economy";
      break;
    case "stadtwachen":
      loyalCriminal = -4;
      greedyAltruist = -1;
      piousSkeptic = 0;
      superstitionReason = 1;
      cityInfluenceTier = "authority_faction";
      break;
    case "haeuser-des-nordens":
      loyalCriminal = -2;
      greedyAltruist = -2;
      piousSkeptic = 1;
      superstitionReason = 2;
      cityInfluenceTier = isLeader ? "apex_global" : "authority_faction";
      break;
    case "bund-silberne-rose":
      loyalCriminal = -2;
      greedyAltruist = 3;
      piousSkeptic = -4;
      superstitionReason = -1;
      cityInfluenceTier = "authority_faction";
      break;
    case "konklave-ewige-ordnung":
      loyalCriminal = -3;
      greedyAltruist = -1;
      piousSkeptic = -4;
      superstitionReason = 3;
      cityInfluenceTier = "authority_faction";
      break;
    case "zunftbund":
      loyalCriminal = -1;
      greedyAltruist = -2;
      piousSkeptic = 1;
      superstitionReason = 2;
      cityInfluenceTier = isLeader ? "authority_faction" : "regional_economy";
      break;
    case "zirkel-observatorium":
      loyalCriminal = -1;
      greedyAltruist = 1;
      piousSkeptic = 2;
      superstitionReason = 4;
      cityInfluenceTier = isLeader ? "authority_faction" : "regional_economy";
      break;
    default:
      break;
  }

  if (/wirt|taverne|gast/.test(roleL)) {
    cityInfluenceTier = "local";
    greedyAltruist = Math.min(greedyAltruist, -1);
  }
  if (/schmugg|krimin|dieb|räuber/.test(roleL)) {
    loyalCriminal = Math.max(loyalCriminal, 3);
  }
  if (/garde|wache|gardist/.test(roleL)) {
    loyalCriminal = Math.min(loyalCriminal, -3);
    cityInfluenceTier = "authority_faction";
  }

  const deity = DEITY_BY_IDEOLOGY[ideology] ?? null;
  const cityDeity = piousSkeptic <= -1 ? deity : null;

  return {
    forCitySimulation: true,
    cityInfluenceTier,
    cityAxisLoyalCriminal: loyalCriminal,
    cityAxisGreedyAltruist: greedyAltruist,
    cityAxisPiousSkeptic: piousSkeptic,
    cityAxisSuperstitionReason: superstitionReason,
    cityDeity,
    cityFactionId: seed.factionId,
    cityAgenda: seed.agenda,
    cityEventDeck: [],
    cityAbilities: [],
    cityCardPlays: [],
  };
}

export function buildNpc(seed: NpcSeed): AurenfurtNpc {
  const faction = factionName(seed.factionId);
  const place = locationName(seed.locationId);
  const citySim = citySimFromAurenfurtSeed(seed);
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
    forCitySimulation: true,
    cityInfluenceTier: citySim.cityInfluenceTier!,
    cityAxisLoyalCriminal: citySim.cityAxisLoyalCriminal!,
    cityAxisGreedyAltruist: citySim.cityAxisGreedyAltruist!,
    cityAxisPiousSkeptic: citySim.cityAxisPiousSkeptic!,
    cityAxisSuperstitionReason: citySim.cityAxisSuperstitionReason!,
    cityDeity: citySim.cityDeity,
    cityFactionId: seed.factionId,
    cityAgenda: seed.agenda,
    cityEventDeck: [],
  };
}
