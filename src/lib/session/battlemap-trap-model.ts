import type {
  BattlemapTrapDifficulty,
  SessionBattlemapTrap,
} from "@/src/lib/session/battlemap-types";

/** Ein recoverable Bestandteil einer Falle (in ai_payload.components). */
export type TrapComponent = {
  id: string;
  name: string;
  description?: string;
  category: "consumable" | "ammo" | "mechanical" | "gem" | "scroll" | "poison" | "other";
  quantity: number;
  iconType?: string | null;
  isMagical?: boolean;
};

export type TrapDisarmRollKind =
  | "investigation"
  | "arcana"
  | "disarm_dex"
  | "disarm_sleight";

export type TrapDisarmPending = {
  status: "player_submitted" | "gm_confirmed";
  characterId: string;
  characterName: string;
  investigate: boolean;
  trapMasteryDex: boolean;
  hasThievesTools: boolean;
  thievesToolsProficient: boolean;
  sleightProficient: boolean;
  sleightExpertise: boolean;
  /** Spieler hat Würfe abgeschlossen und Ergebnis gemeldet */
  playerClaimsSuccess: boolean;
  investigationSuccess?: boolean;
  disarmSuccess?: boolean;
  submittedAt: string;
  gmConfirmedAt?: string;
};

export type TrapAiPayload = {
  components?: TrapComponent[];
  disarm?: TrapDisarmPending | null;
  buildTimeSimple?: string;
  buildTimeExpert?: string;
  [key: string]: unknown;
};

const TRAP_COMPONENT_CATEGORIES = new Set<TrapComponent["category"]>([
  "consumable",
  "ammo",
  "mechanical",
  "gem",
  "scroll",
  "poison",
  "other",
]);

export function parseTrapAiPayload(
  raw: Record<string, unknown> | null | undefined,
): TrapAiPayload {
  if (!raw || typeof raw !== "object") return {};
  const componentsRaw = Array.isArray(raw.components) ? raw.components : [];
  const components: TrapComponent[] = [];
  for (let index = 0; index < componentsRaw.length; index += 1) {
    const c = componentsRaw[index] as Record<string, unknown>;
    const categoryRaw = String(c.category ?? "other");
    const category: TrapComponent["category"] = TRAP_COMPONENT_CATEGORIES.has(
      categoryRaw as TrapComponent["category"],
    )
      ? (categoryRaw as TrapComponent["category"])
      : "other";
    const name = String(c.name ?? "").trim();
    if (!name) continue;
    const qty = Math.max(1, Math.round(Number(c.quantity ?? 1)));
    components.push({
      id: String(c.id ?? `comp-${index}`),
      name,
      description: c.description != null ? String(c.description) : undefined,
      category,
      quantity: qty,
      iconType: c.iconType != null ? String(c.iconType) : null,
      isMagical: c.isMagical === true,
    });
  }

  const disarm =
    raw.disarm && typeof raw.disarm === "object"
      ? (raw.disarm as TrapDisarmPending)
      : null;

  return {
    ...raw,
    components,
    disarm,
  };
}

export function trapComponents(trap: SessionBattlemapTrap): TrapComponent[] {
  return parseTrapAiPayload(trap.ai_payload).components ?? [];
}

export function trapDisarmPending(trap: SessionBattlemapTrap): TrapDisarmPending | null {
  return parseTrapAiPayload(trap.ai_payload).disarm ?? null;
}

export function isMechanicalTrap(trap: SessionBattlemapTrap): boolean {
  const t = String(trap.trap_type ?? "mechanical").toLowerCase();
  return t !== "magical";
}

export function isMagicalTrap(trap: SessionBattlemapTrap): boolean {
  return !isMechanicalTrap(trap);
}

/** Goldwert Rezept-Pergament nach Schwierigkeit (50–500 GP). */
export function recipeScrollGoldValue(difficulty: BattlemapTrapDifficulty): number {
  const map: Record<BattlemapTrapDifficulty, [number, number]> = {
    easy: [50, 120],
    medium: [100, 250],
    hard: [200, 400],
    deadly: [350, 500],
  };
  const [min, max] = map[difficulty] ?? map.medium;
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function buildRecipeScrollDescription(
  trap: SessionBattlemapTrap,
  components: TrapComponent[],
): string {
  const lines = [
    `Bauanleitung: ${trap.name}`,
    "",
    trap.description?.trim() || "Keine Beschreibung.",
    "",
    "Benötigte Komponenten:",
    ...components.map((c) => `• ${c.quantity}× ${c.name}`),
    "",
    `Bauzeit (einfach): ${parseTrapAiPayload(trap.ai_payload).buildTimeSimple ?? "1 Stunde"}`,
    `Bauzeit (Experte): ${parseTrapAiPayload(trap.ai_payload).buildTimeExpert ?? "1 FAP + Fertigkeitswurf"}`,
  ];
  return lines.join("\n");
}
