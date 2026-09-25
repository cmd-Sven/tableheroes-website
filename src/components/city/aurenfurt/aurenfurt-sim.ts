export type UndergroundCell = {
  name: string;
  strength: number;
};

/** Werte 0–100, außer die benannten Zellen. */
export type SimProfile = {
  crime: number;
  vattrak: number;
  malanthir: number;
  guard: number;
  refugees: number;
  economy: number;
  underground: UndergroundCell[];
};

export function sim(
  crime: number,
  vattrak: number,
  malanthir: number,
  guard: number,
  refugees: number,
  economy: number,
  underground: UndergroundCell[] = [],
): SimProfile {
  return { crime, vattrak, malanthir, guard, refugees, economy, underground };
}

export const SIM_METERS = [
  { key: "crime", label: "Kriminalitätsrate", tone: "bg-red-500" },
  { key: "vattrak", label: "Vattrak-Wert", tone: "bg-hero-vibrant" },
  { key: "malanthir", label: "Malanthir-Korruption", tone: "bg-violet-400" },
  { key: "guard", label: "Garde & Sicherheit", tone: "bg-sky-400" },
  { key: "refugees", label: "Flüchtlingsstrom", tone: "bg-amber-500" },
  { key: "economy", label: "Wirtschaftsindex", tone: "bg-[#cab926]" },
] as const satisfies ReadonlyArray<{ key: keyof SimProfile; label: string; tone: string }>;
