/** Würfel-Analyse-Typen für Bestarium-Kreaturen (D&D 5e Spielerwissen). */
export const BEAST_CHECK_TYPES = [
  "Monsterkategorie",
  "Schwächen",
  "Immunität",
  "Besondere Fähigkeit",
  "Loot",
  "Lebensweise",
] as const;

export type BeastCheckType = (typeof BEAST_CHECK_TYPES)[number];

export type BeastCheckResult = {
  type: BeastCheckType | string;
  /** Empfohlene Fertigkeit, z. B. Naturkunde, Arkane Kunde */
  skill?: string | null;
  dc: number;
  result: string;
  is_critical?: boolean;
};

/** Schlüssel für freigeschaltete Infos auf der Bühne / in der Kampagne. */
export type BeastDiscoveryKey =
  | "category"
  | "weaknesses"
  | "immunities"
  | "special"
  | "loot"
  | "habitat";

export const BEAST_CHECK_TYPE_TO_DISCOVERY: Record<string, BeastDiscoveryKey> = {
  Monsterkategorie: "category",
  Schwächen: "weaknesses",
  Immunität: "immunities",
  "Besondere Fähigkeit": "special",
  Loot: "loot",
  Lebensweise: "habitat",
};

export const BEAST_DISCOVERY_LABELS: Record<BeastDiscoveryKey, string> = {
  category: "Monsterkategorie",
  weaknesses: "Schwächen",
  immunities: "Immunität",
  special: "Besondere Fähigkeit",
  loot: "Bekannter Loot",
  habitat: "Lebensweise & Lebensraum",
};

const DEFAULT_CHECKS: BeastCheckResult[] = [
  {
    type: "Monsterkategorie",
    skill: "Naturkunde",
    dc: 12,
    result: "Die Kreatur gehört zu einer bekannten Gattung – Verhalten und Größe lassen sich grob einschätzen.",
    is_critical: false,
  },
  {
    type: "Schwächen",
    skill: "Arkane Kunde",
    dc: 15,
    result: "Es gibt Hinweise auf empfindliche Schadensarten oder typische Schwachstellen.",
    is_critical: false,
  },
  {
    type: "Immunität",
    skill: "Arkane Kunde",
    dc: 16,
    result: "Bestimmte Schadensarten oder Zustände scheinen wirkungslos zu sein.",
    is_critical: false,
  },
  {
    type: "Besondere Fähigkeit",
    skill: "Wahrnehmung",
    dc: 14,
    result: "Auffällige Bewegung oder Körperbau deuten auf eine besondere Fähigkeit hin (z. B. Flug, Anhaften).",
    is_critical: false,
  },
  {
    type: "Loot",
    skill: "Überleben",
    dc: 13,
    result: "Jäger oder Alchemisten würden an bestimmten Teilen Interesse haben.",
    is_critical: false,
  },
  {
    type: "Lebensweise",
    skill: "Naturkunde",
    dc: 13,
    result: "Aus Spuren und Geruch lässt sich Lebensraum und typisches Verhalten ableiten.",
    is_critical: false,
  },
];

export function normalizeBeastCheckResults(value: unknown): BeastCheckResult[] {
  const rows = Array.isArray(value) ? value : [];
  const normalized = rows
    .filter((row): row is Record<string, unknown> => row != null && typeof row === "object")
    .map((row) => ({
      type: String(row.type ?? "Monsterkategorie"),
      skill: row.skill != null ? String(row.skill).trim() || null : null,
      dc: Number.isFinite(Number(row.dc)) ? Number(row.dc) : 15,
      result: String(row.result ?? "").trim(),
      is_critical: row.is_critical === true,
    }))
    .filter((row) => row.result.length > 0);

  if (normalized.length === 0) return [...DEFAULT_CHECKS];

  for (const def of DEFAULT_CHECKS) {
    if (!normalized.some((r) => r.type === def.type)) {
      normalized.push({
        ...def,
        skill: def.skill ?? null,
        is_critical: def.is_critical === true,
      });
    }
  }

  return normalized;
}

export type BeastDiscoveries = Partial<Record<BeastDiscoveryKey, boolean>>;

export function parseBeastDiscoveries(value: unknown): BeastDiscoveries {
  if (!value || typeof value !== "object") return {};
  const out: BeastDiscoveries = {};
  for (const key of Object.keys(BEAST_DISCOVERY_LABELS) as BeastDiscoveryKey[]) {
    if ((value as Record<string, unknown>)[key] === true) out[key] = true;
  }
  return out;
}
