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
  unemployment: number;
  underground: UndergroundCell[];
  /** Zusätzliche Spannung aus datierten Stadtgeschichten, oben auf die Formel. */
  tensionBias?: number;
};

export function meanSim(profiles: SimProfile[]): SimProfile {
  const count = profiles.length || 1;
  const avg = (pick: (profile: SimProfile) => number) =>
    Math.round(profiles.reduce((sum, profile) => sum + pick(profile), 0) / count);
  return sim(
    avg((profile) => profile.crime),
    avg((profile) => profile.vattrak),
    avg((profile) => profile.malanthir),
    avg((profile) => profile.guard),
    avg((profile) => profile.refugees),
    avg((profile) => profile.economy),
    avg((profile) => profile.unemployment),
  );
}

export function sim(
  crime: number,
  vattrak: number,
  malanthir: number,
  guard: number,
  refugees: number,
  economy: number,
  unemployment: number,
  underground: UndergroundCell[] = [],
): SimProfile {
  return { crime, vattrak, malanthir, guard, refugees, economy, unemployment, underground };
}

export const SIM_METERS = [
  { key: "crime", label: "Kriminalitätsrate", tone: "bg-red-500", stroke: "#ef4444" },
  { key: "vattrak", label: "Vattrak-Wert", tone: "bg-hero-vibrant", stroke: "#379806" },
  { key: "malanthir", label: "Malanthir-Korruption", tone: "bg-violet-400", stroke: "#a78bfa" },
  { key: "guard", label: "Garde & Sicherheit", tone: "bg-sky-400", stroke: "#38bdf8" },
  { key: "refugees", label: "Flüchtlingsstrom", tone: "bg-amber-500", stroke: "#f59e0b" },
  { key: "economy", label: "Wirtschaftsindex", tone: "bg-[#cab926]", stroke: "#cab926" },
  { key: "unemployment", label: "Arbeitslosigkeit", tone: "bg-[#d4a574]", stroke: "#d4a574" },
] as const satisfies ReadonlyArray<{ key: keyof SimProfile; label: string; tone: string; stroke: string }>;

export type SimMeterKey = (typeof SIM_METERS)[number]["key"];
