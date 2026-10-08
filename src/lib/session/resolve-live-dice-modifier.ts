import { createClient } from "@/src/lib/supabase/server";
import {
  createEmptyDnd5eSheet,
  parseSheetData,
} from "@/src/lib/characters/dnd5e/defaults";
import { computeDerivedDnd5eSheet } from "@/src/lib/characters/dnd5e/derived";
import {
  computeEquippedWeaponAttacks,
  normalizeEquipmentState,
} from "@/src/lib/characters/dnd5e/equipment";
import type { AbilityKey, Dnd5eSkillKey } from "@/src/lib/characters/dnd5e/types";
import { ABILITY_KEYS } from "@/src/lib/characters/dnd5e/types";
import { DND5E_SKILL_BY_KEY } from "@/src/lib/characters/dnd5e/skills";
import { parseCharacterFlaws } from "@/src/lib/characters/character-flaws";
import { applyFlawModifiersToDerived } from "@/src/lib/characters/flaw-modifiers";
import {
  clampExhaustionLevel,
  exhaustionD20Penalty,
} from "@/src/lib/characters/dnd5e/exhaustion";
import {
  proficiencyBonus,
  skillProficiencyBonus,
} from "@/src/lib/characters/dnd5e/formulas";
import { matchProficiencyEntry } from "@/src/lib/characters/dnd5e/progression/proficiencies-catalog";
import { isGmDiceRollerId } from "@/src/lib/session/dice-skins";
import type { CharacterItem, InventoryCategory } from "@/src/types/inventory";
import { INVENTORY_CATEGORIES } from "@/src/types/inventory";

export type LiveDiceRollKind = "dice" | "attack" | "skill" | "save" | "damage";

export type ResolvedSheetModifier = {
  modifier: number;
  label?: string;
  weaponName?: string;
  damage?: string | null;
  attackBonus?: number;
  source: "sheet" | "client" | "none";
  exhaustionLevel?: number;
  /**
   * Anteil, der bereits in `modifier` steckt und im Chat separat
   * als „Erschöpfung −N“ gezeigt wird. 0, wenn nicht angewendet.
   */
  exhaustionPenalty?: number;
  /**
   * Anteil, der bereits in `modifier` steckt und im Chat separat
   * als „Übung +N“ gezeigt wird. 0, wenn keine Übung greift.
   */
  proficiencyBonus?: number;
};

const SKILL_KEYS = new Set(Object.keys(DND5E_SKILL_BY_KEY));

function toolProficiencyBonus(tools: string[], label: string, pb: number): number {
  const needle = label.trim().toLowerCase();
  if (!needle || pb <= 0) return 0;
  for (const tool of tools) {
    const raw = tool.trim();
    if (!raw) continue;
    const lower = raw.toLowerCase();
    if (needle.includes(lower) || lower.includes(needle)) return pb;
    const listed = matchProficiencyEntry(raw, "tools");
    const asked = matchProficiencyEntry(label, "tools");
    if (listed && asked && listed.id === asked.id) return pb;
  }
  return 0;
}

function isAbilityKey(v: string): v is AbilityKey {
  return (ABILITY_KEYS as readonly string[]).includes(v);
}

function isSkillKey(v: string): v is Dnd5eSkillKey {
  return SKILL_KEYS.has(v);
}

function normalizeCategory(value: unknown): InventoryCategory {
  return INVENTORY_CATEGORIES.includes(value as InventoryCategory)
    ? (value as InventoryCategory)
    : "Equipment";
}

/**
 * Liest Charakterbogen (+ Makel + Ausrüstung) und liefert den korrekten Wurf-Modifikator.
 * Für skill/save/attack: Sheet gewinnt (Anti-Cheat). Für dice/damage: Client-Formel.
 */
export async function resolveLiveDiceSheetModifier(input: {
  characterId: string;
  kind: LiveDiceRollKind;
  clientModifier?: number;
  /** Temporäre Mali/Boni aus dem Würfelfenster (nur W20-Würfe). */
  bonusMalus?: number;
  skillKey?: string;
  saveAbility?: string;
  label?: string;
  weaponName?: string;
  /** true = freier Pool enthält einen W20 → Erschöpfung anwenden */
  applyExhaustionToD20?: boolean;
}): Promise<ResolvedSheetModifier> {
  const clientMod = Number.isFinite(input.clientModifier)
    ? Math.round(input.clientModifier!)
    : 0;
  const bonusMalus = Number.isFinite(input.bonusMalus)
    ? Math.round(input.bonusMalus!)
    : 0;

  if (isGmDiceRollerId(input.characterId)) {
    return { modifier: clientMod, source: "none", label: input.label, exhaustionPenalty: 0 };
  }

  if (input.kind === "damage") {
    return {
      modifier: clientMod + bonusMalus,
      source: "client",
      label: input.label,
      exhaustionPenalty: 0,
    };
  }

  const supabase = await createClient();
  const { data: chRaw, error } = await (supabase.from("characters") as any)
    .select("sheet_data, level, character_flaws, name")
    .eq("id", input.characterId)
    .maybeSingle();

  if (error || !chRaw) {
    return { modifier: clientMod, source: "client", label: input.label, exhaustionPenalty: 0 };
  }

  const level = Math.max(1, Math.floor(Number(chRaw.level) || 1));
  const sheet = parseSheetData(chRaw.sheet_data) ?? createEmptyDnd5eSheet(level);
  const exhaustionLevel = clampExhaustionLevel(sheet.combat?.exhaustionLevel);
  const exhaustionPenalty = exhaustionD20Penalty(exhaustionLevel);
  const flaws = parseCharacterFlaws(chRaw.character_flaws);
  const baseDerived = computeDerivedDnd5eSheet(sheet, level);
  const adjusted = applyFlawModifiersToDerived(baseDerived, sheet.combat.speed, flaws);
  const derived = adjusted.derived;

  if (input.kind === "dice") {
    // Freie Würfe: Erschöpfung nur auf W20-Proben (nicht auf reinen Schaden-Pools).
    const applyD20Extras = input.applyExhaustionToD20 !== false;
    const appliedExhaustion = applyD20Extras ? exhaustionPenalty : 0;
    const toolPb =
      applyD20Extras && input.label
        ? toolProficiencyBonus(sheet.proficiencies?.tools ?? [], input.label, proficiencyBonus(level))
        : 0;
    const mod =
      clientMod +
      appliedExhaustion +
      toolPb +
      (applyD20Extras ? bonusMalus : 0);
    return {
      modifier: mod,
      source: "client",
      label: input.label,
      exhaustionLevel,
      exhaustionPenalty: appliedExhaustion,
      proficiencyBonus: toolPb,
    };
  }

  if (input.kind === "skill") {
    const key = input.skillKey?.trim() ?? "";
    if (!isSkillKey(key)) {
      return {
        modifier: clientMod + exhaustionPenalty + bonusMalus,
        source: "client",
        label: input.label,
        exhaustionLevel,
        exhaustionPenalty,
      };
    }
    const total = derived.skills[key]?.total ?? 0;
    const def = DND5E_SKILL_BY_KEY[key];
    const skillEntry = sheet.skills[key] ?? { proficient: "none" as const };
    const pb = proficiencyBonus(level);
    const skillPb =
      skillEntry.bonusOverride != null && !Number.isNaN(skillEntry.bonusOverride)
        ? 0
        : skillProficiencyBonus(skillEntry.proficient, pb);
    const toolPb =
      skillPb > 0
        ? 0
        : toolProficiencyBonus(sheet.proficiencies?.tools ?? [], def.labelDe, pb);
    return {
      modifier: Math.round(total) + toolPb + bonusMalus,
      label: input.label ?? def.labelDe,
      source: "sheet",
      exhaustionLevel,
      exhaustionPenalty,
      proficiencyBonus: skillPb || toolPb,
    };
  }

  if (input.kind === "save") {
    const key = input.saveAbility?.trim() ?? "";
    if (!isAbilityKey(key)) {
      return {
        modifier: clientMod + exhaustionPenalty + bonusMalus,
        source: "client",
        label: input.label,
        exhaustionLevel,
        exhaustionPenalty,
      };
    }
    const total = derived.savingThrows[key]?.total ?? 0;
    const saveProficient = sheet.savingThrows[key]?.proficient === true;
    return {
      modifier: Math.round(total) + bonusMalus,
      label: input.label,
      source: "sheet",
      exhaustionLevel,
      exhaustionPenalty,
      proficiencyBonus: saveProficient ? proficiencyBonus(level) : 0,
    };
  }

  if (input.kind === "attack") {
    const { data: itemRows } = await (supabase.from("character_items") as any)
      .select(
        "id, character_id, name, description, category, icon_type, is_deleted, target_fap, current_fap, created_at",
      )
      .eq("character_id", input.characterId)
      .eq("is_deleted", false);

    const items: CharacterItem[] = (Array.isArray(itemRows) ? itemRows : []).map(
      (item: Record<string, unknown>) => ({
        id: String(item.id),
        character_id: String(item.character_id),
        name: String(item.name ?? ""),
        description: item.description != null ? String(item.description) : null,
        category: normalizeCategory(item.category),
        icon_type: item.icon_type != null ? String(item.icon_type) : null,
        is_deleted: Boolean(item.is_deleted),
        target_fap: Math.max(0, Math.round(Number(item.target_fap ?? 0))),
        current_fap: Math.max(0, Math.round(Number(item.current_fap ?? 0))),
        created_at: item.created_at != null ? String(item.created_at) : undefined,
      }),
    );

    const equipment = normalizeEquipmentState(sheet.equipment);
    const attacks = computeEquippedWeaponAttacks(
      sheet,
      derived,
      items,
      equipment,
      level,
    );
    const weaponFilter = input.weaponName?.trim();
    const matched =
      weaponFilter != null && weaponFilter.length > 0
        ? attacks.find((a) => a.name === weaponFilter) ?? attacks[0] ?? null
        : attacks[0] ?? null;
    // Angriffswurf ist ein W20-Test → Erschöpfung nur in `modifier` (Wurf),
    // nicht in `attackBonus`. Der Klammerwert im Chat bleibt Stärke/Übung/Magie.
    const weaponBonus = (matched?.attackBonus ?? 0) + bonusMalus;
    const bonus = weaponBonus + exhaustionPenalty;
    return {
      modifier: Math.round(bonus),
      attackBonus: Math.round(weaponBonus),
      weaponName: matched?.name ?? input.weaponName ?? "Waffe",
      damage: matched?.damage ?? null,
      source: matched ? "sheet" : "client",
      exhaustionLevel,
      exhaustionPenalty,
      proficiencyBonus: matched?.proficiencyBonus ?? 0,
    };
  }

  return {
    modifier: clientMod,
    source: "client",
    label: input.label,
    exhaustionLevel,
    exhaustionPenalty: 0,
  };
}
