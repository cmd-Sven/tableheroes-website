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
};

const SKILL_KEYS = new Set(Object.keys(DND5E_SKILL_BY_KEY));

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
  skillKey?: string;
  saveAbility?: string;
  label?: string;
  weaponName?: string;
}): Promise<ResolvedSheetModifier> {
  const clientMod = Number.isFinite(input.clientModifier)
    ? Math.round(input.clientModifier!)
    : 0;

  if (input.kind === "dice" || input.kind === "damage") {
    return { modifier: clientMod, source: "client", label: input.label };
  }

  const supabase = await createClient();
  const { data: chRaw, error } = await (supabase.from("characters") as any)
    .select("sheet_data, level, character_flaws, name")
    .eq("id", input.characterId)
    .maybeSingle();

  if (error || !chRaw) {
    return { modifier: clientMod, source: "client", label: input.label };
  }

  const level = Math.max(1, Math.floor(Number(chRaw.level) || 1));
  const sheet = parseSheetData(chRaw.sheet_data) ?? createEmptyDnd5eSheet(level);
  const flaws = parseCharacterFlaws(chRaw.character_flaws);
  const baseDerived = computeDerivedDnd5eSheet(sheet, level);
  const adjusted = applyFlawModifiersToDerived(baseDerived, sheet.combat.speed, flaws);
  const derived = adjusted.derived;

  if (input.kind === "skill") {
    const key = input.skillKey?.trim() ?? "";
    if (!isSkillKey(key)) {
      return { modifier: clientMod, source: "client", label: input.label };
    }
    const total = derived.skills[key]?.total ?? 0;
    const def = DND5E_SKILL_BY_KEY[key];
    return {
      modifier: Math.round(total),
      label: input.label ?? def.labelDe,
      source: "sheet",
    };
  }

  if (input.kind === "save") {
    const key = input.saveAbility?.trim() ?? "";
    if (!isAbilityKey(key)) {
      return { modifier: clientMod, source: "client", label: input.label };
    }
    const total = derived.savingThrows[key]?.total ?? 0;
    return {
      modifier: Math.round(total),
      label: input.label,
      source: "sheet",
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
    const primary = attacks[0] ?? null;
    const bonus = primary?.attackBonus ?? 0;
    return {
      modifier: Math.round(bonus),
      attackBonus: Math.round(bonus),
      weaponName: primary?.name ?? input.weaponName ?? "Waffe",
      damage: primary?.damage ?? null,
      source: primary ? "sheet" : "client",
    };
  }

  return { modifier: clientMod, source: "client", label: input.label };
}
