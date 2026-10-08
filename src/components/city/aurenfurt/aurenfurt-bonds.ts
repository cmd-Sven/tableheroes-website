/**
 * Lore-Beziehungen verschieben die Stadt, wenn beide NPCs zur Simulation gehören.
 * Die Intensität bestimmt Richtung und Gewicht, die Rolle nur den Kanal.
 * Widersprechen sie sich, gewinnt die Intensität.
 */

import type { CityDistrictId } from "./aurenfurt-districts";

export type BondChannel = "command" | "bond" | "fracture" | "none";

export type CityBond = {
  sourceDistrictId: CityDistrictId;
  targetDistrictId: CityDistrictId;
  sourceRole: string;
  targetRole: string;
  intensity: number;
  sameFaction: boolean;
};

export type BondShift = {
  crime: number;
  guard: number;
  malanthir: number;
};

const SUBORDINATE = new Set([
  "Untertan",
  "Schüler",
  "Diener",
  "Sklave",
  "Leibeigener",
  "Angestellter",
]);

const SUPERIOR = new Set([
  "Vorgesetzter",
  "Meister",
  "Mentor",
  "Ausbilder",
  "Lehrmeister",
  "Auftraggeber",
  "Beschützer",
]);

const CAP = 12;

export function bondChannel(sourceRole: string, targetRole: string, intensity: number): BondChannel {
  if (!intensity) return "none";
  if (intensity < 0) return "fracture";
  const roles = [sourceRole, targetRole];
  if (roles.some((role) => SUPERIOR.has(role) || SUBORDINATE.has(role))) return "command";
  return "bond";
}

function weightOf(intensity: number) {
  return Math.min(1, Math.abs(intensity) / 100);
}

function add(districtDeltas: Map<CityDistrictId, BondShift>, districtId: CityDistrictId, extra: BondShift) {
  const current = districtDeltas.get(districtId) ?? { crime: 0, guard: 0, malanthir: 0 };
  districtDeltas.set(districtId, {
    crime: current.crime + extra.crime,
    guard: current.guard + extra.guard,
    malanthir: current.malanthir + extra.malanthir,
  });
}

function subordinateDistrict(bond: CityBond): CityDistrictId | null {
  if (SUBORDINATE.has(bond.sourceRole)) return bond.sourceDistrictId;
  if (SUBORDINATE.has(bond.targetRole)) return bond.targetDistrictId;
  if (SUPERIOR.has(bond.sourceRole)) return bond.targetDistrictId;
  if (SUPERIOR.has(bond.targetRole)) return bond.sourceDistrictId;
  return null;
}

export function bondShiftForDistrict(bonds: CityBond[], districtId: CityDistrictId): BondShift {
  const totals = new Map<CityDistrictId, BondShift>();
  for (const bond of bonds) {
    const channel = bondChannel(bond.sourceRole, bond.targetRole, bond.intensity);
    const weight = weightOf(bond.intensity);
    if (channel === "none" || weight === 0) continue;
    if (channel === "command") {
      const district = subordinateDistrict(bond);
      const guard = 8 * weight;
      const crime = -4 * weight;
      if (district) {
        add(totals, district, { crime, guard, malanthir: 0 });
      } else {
        add(totals, bond.sourceDistrictId, { crime: crime / 2, guard: guard / 2, malanthir: 0 });
        if (bond.targetDistrictId !== bond.sourceDistrictId) {
          add(totals, bond.targetDistrictId, { crime: crime / 2, guard: guard / 2, malanthir: 0 });
        }
      }
      continue;
    }
    if (channel === "bond") {
      const crime = -5 * weight;
      const guard = (3 + (bond.sameFaction ? 2 : 0)) * weight;
      const touch = new Set<CityDistrictId>([bond.sourceDistrictId, bond.targetDistrictId]);
      for (const id of touch) {
        add(totals, id, { crime, guard, malanthir: 0 });
      }
      continue;
    }
    const crime = 6 * weight;
    const malanthir = 4 * weight;
    const touch = new Set<CityDistrictId>([bond.sourceDistrictId, bond.targetDistrictId]);
    for (const id of touch) {
      add(totals, id, { crime, guard: 0, malanthir });
    }
  }
  const raw = totals.get(districtId) ?? { crime: 0, guard: 0, malanthir: 0 };
  return {
    crime: Math.max(-CAP, Math.min(CAP, raw.crime)),
    guard: Math.max(-CAP, Math.min(CAP, raw.guard)),
    malanthir: Math.max(-CAP, Math.min(CAP, raw.malanthir)),
  };
}

function strengthWord(intensity: number) {
  const abs = Math.abs(intensity);
  if (abs < 20) return "kaum";
  if (abs < 50) return "spürbar";
  if (abs < 80) return "deutlich";
  return "stark";
}

/** Ein Satz für den Beziehungseditor. Leer, wenn die Beziehung die Stadt nicht trifft. */
export function bondSimReading(
  sourceRole: string,
  targetRole: string,
  intensity: number,
  bothInCity: boolean,
  affectsCity: boolean,
): string | null {
  if (!bothInCity) return null;
  if (!affectsCity) return "Diese Beziehung bleibt in der Lore und bewegt die Stadtsimulation nicht.";
  const channel = bondChannel(sourceRole, targetRole, intensity);
  const how = strengthWord(intensity);
  if (channel === "none") return "Neutral. Die Stadtsimulation bleibt davon unberührt.";
  if (channel === "command") {
    return how === "kaum"
      ? "Schwache Befehlskette. Die Garde spürt das kaum."
      : `Befehlskette. Ordnung und Garde des Untergebenen ziehen ${how} mit.`;
  }
  if (channel === "bond") {
    return `Bund. Die Kriminalität im Wirkungskreis sinkt ${how}, eine gemeinsame Fraktion steht fester.`;
  }
  return `Bruch. Kriminalität und Malanthir steigen ${how} in den Vierteln beider Seiten.`;
}
