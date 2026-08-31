"use server";

import { randomBytes } from "crypto";
import { createClient } from "@/src/lib/supabase/server";
import { isCampaignGm } from "@/src/lib/campaign-gm";
import {
  appendSessionActivity,
  type SessionActivityEntry,
} from "@/src/lib/actions/session-activity-actions";
import {
  createSeededRng,
  executeDicePool,
  executeDiceRoll,
  normalizeDicePool,
  type DicePoolGroup,
  type DiceRollMode,
} from "@/src/lib/session/dice-roll";
import { formatSigned } from "@/src/lib/characters/dnd5e/formulas";
import {
  resolveLiveDiceSheetModifier,
  type LiveDiceRollKind,
} from "@/src/lib/session/resolve-live-dice-modifier";
import { parseDiceSkinId, isGmDiceRollerId } from "@/src/lib/session/dice-skins";

export type RequestLiveDiceRollInput = {
  sessionId: string;
  characterId: string;
  characterName: string;
  dice: number;
  sides: number;
  /** Gemischter Pool, z. B. 1w20 + 2w6. Überschreibt dice/sides wenn gesetzt. */
  diceGroups?: DicePoolGroup[];
  modifier?: number;
  mode?: DiceRollMode;
  kind: LiveDiceRollKind;
  label?: string;
  weaponName?: string;
  damage?: string | null;
  attackBonus?: number;
  /** Schaden: kritische Treffer verdoppeln Würfelanzahl. */
  critical?: boolean;
  requestId?: string;
  damageFormula?: string;
  /** Fertigkeits-Key (acr, ath, …) — Server liest Bonus aus dem Bogen. */
  skillKey?: string;
  /** Attribut-Key für Rettungswurf — Server liest Bonus aus dem Bogen. */
  saveAbility?: string;
  /** Temporäre Mali/Boni aus dem Würfelfenster (W20-Würfe). */
  bonusMalus?: number;
  /** Initiator-Drop-Punkt (Viewport 0…1) für Sync der 3D-Animation. */
  dropNx?: number;
  dropNy?: number;
  /** Slingshot-Wurf (Tisch XZ) — Sync für alle Clients. */
  throwDirX?: number;
  throwDirZ?: number;
  throwStrength?: number;
  isTap?: boolean;
  /** Würfel-Skin des Werfers — für synchrone Darstellung bei allen Clients. */
  diceSkin?: string;
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
    const bonus = extras.attackBonus ?? outcome.modifier;
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

  const  prefix = extras.label
    ? `${characterName} würfelt ${extras.label}`
    : `${characterName} würfelt ${outcome.formula}`;
  return {
    type: "dice",
    text: `${prefix}: ${outcome.display}`,
  };
}

/**
 * Serverseitig deterministisch würfeln (Seed + Faces), dann Activity broadcasten.
 * Modifikatoren für Fertigkeit/Rettung/Angriff kommen aus dem Charakterbogen (+ Makel).
 * Client animiert auf diese Faces — Endwert kommt nicht vom Client.
 */
export async function requestLiveDiceRoll(
  input: RequestLiveDiceRollInput,
): Promise<SessionActivityEntry> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert.");

  const characterId = input.characterId?.trim();
  const characterName = input.characterName?.trim();
  if (!characterId || !characterName) {
    throw new Error("Kein Charakter für den Wurf.");
  }

  const { data: sessionRaw } = await (supabase.from("sessions") as any)
    .select("campaign_id")
    .eq("id", input.sessionId)
    .maybeSingle();
  if (!sessionRaw) throw new Error("Session nicht gefunden.");

  const { data: campaignRaw } = await (supabase.from("campaigns") as any)
    .select("gm_id, owner_id")
    .eq("id", String((sessionRaw as { campaign_id: string }).campaign_id))
    .maybeSingle();
  const isGm = isCampaignGm(
    campaignRaw as { gm_id?: string | null; owner_id?: string | null } | null,
    user.id,
  );

  if (isGmDiceRollerId(characterId)) {
    if (!isGm) {
      throw new Error("Nur der Spielleiter darf als Spielleiter würfeln.");
    }
    if (input.kind !== "dice" && input.kind !== "damage") {
      throw new Error("Als Spielleiter sind nur Pool-Würfe erlaubt.");
    }
  }

  const groups = normalizeDicePool(input.diceGroups ?? []);
  const usePool = groups.length > 0;
  const dice = usePool
    ? groups.reduce((s, g) => s + g.count, 0)
    : Math.max(1, Math.min(20, Math.round(input.dice)));
  const sides = usePool
    ? groups[0]!.sides
    : Math.max(2, Math.min(100, Math.round(input.sides)));
  const mode: DiceRollMode = input.mode ?? "normal";
  const hasD20 = usePool
    ? groups.some((g) => g.sides === 20 && g.count > 0)
    : sides === 20;

  const bonusMalus = Number.isFinite(input.bonusMalus)
    ? Math.round(input.bonusMalus!)
    : 0;

  const sheetMod = await resolveLiveDiceSheetModifier({
    characterId,
    kind: input.kind,
    clientModifier: input.modifier,
    bonusMalus:
      input.kind === "damage"
        ? 0
        : input.kind === "dice"
          ? hasD20
            ? bonusMalus
            : 0
          : bonusMalus,
    skillKey: input.skillKey,
    saveAbility: input.saveAbility,
    label: input.label,
    weaponName: input.weaponName,
    applyExhaustionToD20: hasD20,
  });

  const modifier = sheetMod.modifier;
  const label = sheetMod.label ?? input.label;
  const weaponName = sheetMod.weaponName ?? input.weaponName;
  const attackBonus = sheetMod.attackBonus ?? input.attackBonus ?? modifier;
  const damage = sheetMod.damage ?? input.damage ?? null;

  const seed = randomBytes(16).toString("hex");
  const rng = createSeededRng(seed);
  const outcome = usePool
    ? executeDicePool(groups, modifier, mode, rng, seed)
    : executeDiceRoll({ dice, sides, modifier }, mode, rng, seed);

  const { type, text } = buildActivityText(input.kind, characterName, outcome, {
    label,
    weaponName,
    attackBonus,
    critical: input.critical,
  });

  const dropNx =
    typeof input.dropNx === "number" && Number.isFinite(input.dropNx)
      ? Math.min(1, Math.max(0, input.dropNx))
      : undefined;
  const dropNy =
    typeof input.dropNy === "number" && Number.isFinite(input.dropNy)
      ? Math.min(1, Math.max(0, input.dropNy))
      : undefined;

  const meta: Record<string, unknown> = {
    ...outcome,
    animate: true,
    faces: outcome.faces,
    dieSides: outcome.dieSides,
    bubbleParts: outcome.bubbleParts,
    seed,
    label,
    modifier,
    usedRoll: outcome.usedRoll,
    total: outcome.total,
    display: outcome.display,
  };
  if (dropNx !== undefined) meta.dropNx = dropNx;
  if (dropNy !== undefined) meta.dropNy = dropNy;
  if (
    typeof input.throwDirX === "number" &&
    Number.isFinite(input.throwDirX) &&
    typeof input.throwDirZ === "number" &&
    Number.isFinite(input.throwDirZ)
  ) {
    meta.throwDirX = input.throwDirX;
    meta.throwDirZ = input.throwDirZ;
  }
  if (
    typeof input.throwStrength === "number" &&
    Number.isFinite(input.throwStrength)
  ) {
    meta.throwStrength = Math.min(1, Math.max(0, input.throwStrength));
  }
  if (input.isTap === true) meta.isTap = true;

  const diceSkin = parseDiceSkinId(input.diceSkin);
  if (diceSkin) meta.diceSkin = diceSkin;

  if (input.kind === "attack") {
    meta.pending = true;
    meta.weaponName = weaponName ?? "Waffe";
    meta.damage = damage;
    meta.attackBonus = attackBonus;
  }

  if (input.kind === "damage") {
    meta.requestId = input.requestId;
    meta.critical = Boolean(input.critical);
    meta.damageFormula = input.damageFormula;
    meta.label = "Schaden";
    meta.weaponName = weaponName;
  }

  if ((input.kind === "skill" || input.kind === "save") && label) {
    meta.label = label;
  }

  if (input.skillKey) meta.skillKey = input.skillKey;
  if (input.saveAbility) meta.saveAbility = input.saveAbility;
  if (bonusMalus !== 0) meta.bonusMalus = bonusMalus;

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
