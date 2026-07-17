"use server";

import { randomBytes } from "crypto";
import {
  appendSessionActivity,
  type SessionActivityEntry,
} from "@/src/lib/actions/session-activity-actions";
import {
  createSeededRng,
  executeDiceRoll,
  type DiceRollMode,
} from "@/src/lib/session/dice-roll";
import { formatSigned } from "@/src/lib/characters/dnd5e/formulas";

export type LiveDiceRollKind = "dice" | "attack" | "skill" | "save" | "damage";

export type RequestLiveDiceRollInput = {
  sessionId: string;
  characterId: string;
  characterName: string;
  dice: number;
  sides: number;
  modifier?: number;
  mode?: DiceRollMode;
  kind: LiveDiceRollKind;
  label?: string;
  weaponName?: string;
  damage?: string | null;
  attackBonus?: number;
  /** Schaden: kritische Treffer verdoppeln Würfelanzahl (Client übergibt bereits verdoppelt oder flag). */
  critical?: boolean;
  requestId?: string;
  damageFormula?: string;
};

function buildActivityText(
  kind: LiveDiceRollKind,
  characterName: string,
  outcome: ReturnType<typeof executeDiceRoll>,
  extras: {
    label?: string;
    weaponName?: string;
    attackBonus?: number;
    critical?: boolean;
  },
): { type: string; text: string } {
  if (kind === "attack") {
    const weaponName = extras.weaponName ?? "Waffe";
    const bonus = extras.attackBonus ?? 0;
    const bonusLabel = bonus !== 0 ? ` (${formatSigned(bonus)})` : "";
    return {
      type: "attack_pending",
      text: `${characterName} — ${weaponName} Angriff${bonusLabel}: ${outcome.display} — SL: trifft?`,
    };
  }

  if (kind === "damage") {
    const critTag = extras.critical ? "KRITISCH " : "";
    return {
      type: "damage_roll",
      text: `${characterName} — ${critTag}Schaden (${extras.weaponName ?? "Waffe"}): ${outcome.display}`,
    };
  }

  if (kind === "skill") {
    const label = extras.label ?? "Fertigkeit";
    return {
      type: "skill_check",
      text: `${characterName} würfelt ${label}: ${outcome.display}`,
    };
  }

  if (kind === "save") {
    const label = extras.label ?? "Rettungswurf";
    return {
      type: "saving_throw",
      text: `${characterName} — ${label}: ${outcome.display}`,
    };
  }

  const prefix = extras.label
    ? `${characterName} würfelt ${extras.label}`
    : `${characterName} w${outcome.sides} gewürfelt`;
  return {
    type: "dice",
    text: `${prefix}: ${outcome.display}`,
  };
}

/**
 * Serverseitig deterministisch würfeln (Seed + Faces), dann Activity broadcasten.
 * Client animiert auf diese Faces — Endwert kommt nicht vom Client.
 */
export async function requestLiveDiceRoll(
  input: RequestLiveDiceRollInput,
): Promise<SessionActivityEntry> {
  const characterId = input.characterId?.trim();
  const characterName = input.characterName?.trim();
  if (!characterId || !characterName) {
    throw new Error("Kein Charakter für den Wurf.");
  }

  const dice = Math.max(1, Math.min(20, Math.round(input.dice)));
  const sides = Math.max(2, Math.min(100, Math.round(input.sides)));
  const modifier = Number.isFinite(input.modifier) ? Math.round(input.modifier!) : 0;
  const mode: DiceRollMode = input.mode ?? "normal";

  const seed = randomBytes(16).toString("hex");
  const rng = createSeededRng(seed);
  const outcome = executeDiceRoll({ dice, sides, modifier }, mode, rng, seed);

  const { type, text } = buildActivityText(input.kind, characterName, outcome, {
    label: input.label,
    weaponName: input.weaponName,
    attackBonus: input.attackBonus,
    critical: input.critical,
  });

  const meta: Record<string, unknown> = {
    ...outcome,
    animate: true,
    faces: outcome.faces,
    seed,
    label: input.label,
  };

  if (input.kind === "attack") {
    meta.pending = true;
    meta.weaponName = input.weaponName ?? "Waffe";
    meta.damage = input.damage ?? null;
    meta.attackBonus = input.attackBonus ?? 0;
  }

  if (input.kind === "damage") {
    meta.requestId = input.requestId;
    meta.critical = Boolean(input.critical);
    meta.damageFormula = input.damageFormula;
    meta.label = "Schaden";
    meta.weaponName = input.weaponName;
  }

  if ((input.kind === "skill" || input.kind === "save") && input.label) {
    meta.label = input.label;
  }

  const entry = await appendSessionActivity({
    sessionId: input.sessionId,
    type,
    text,
    characterId,
    characterName,
    meta,
  });

  if (!entry) throw new Error("Wurf konnte nicht gespeichert werden.");
  return entry;
}
