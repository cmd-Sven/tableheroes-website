import type { AbilityKey, Dnd5eFeatureEntry, Dnd5eSheetData, Dnd5eSpellEntry } from "../types";
import { progressionFeatureToEntry } from "../feature-entry";
import { getFeatById, getSpells } from "./catalog";
import { featuresForLevel, subclassFeaturesUpToLevel } from "./engine";
import { matchSubclassOption } from "./class-ids";
import { appendGrantedSpellsFromFeatures } from "./catalog-bridge";
import { isThirdCasterSubclass } from "./spell-slots";
import type { AbilityKeyShort, LevelUpDraft, SlotKey } from "./types";
import { xpForLevel } from "../xp-table";
import { parseHitDiceString } from "../rest";
import { defaultSpellAbilityForClass } from "../spellcasting";

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function abilityKey(a: AbilityKeyShort): AbilityKey {
  return a;
}

function applyAbilityIncrease(
  sheet: Dnd5eSheetData,
  ability: AbilityKeyShort,
  delta: number,
): void {
  const key = abilityKey(ability);
  const current = sheet.abilities[key]?.score ?? 10;
  sheet.abilities[key] = {
    ...sheet.abilities[key],
    score: Math.min(20, Math.max(1, current + delta)),
  };
}

function featureFromProgression(
  f: import("./types").ProgressionFeature,
  source = "level-up",
): Dnd5eFeatureEntry {
  return progressionFeatureToEntry(f, source);
}

function customFeatureEntry(
  id: string,
  name: string,
  description?: string | null,
  kind: import("../types").Dnd5eFeatureKind = "custom",
  source = "level-up",
): Dnd5eFeatureEntry {
  return {
    id,
    name,
    nameDe: name,
    nameEn: name,
    description: description ?? null,
    descriptionDe: description ?? null,
    descriptionEn: description ?? null,
    source,
    featureKind: kind,
  };
}

export type AppliedLevelUp = {
  sheet: Dnd5eSheetData;
  meta: {
    level: number;
    subclass?: string | null;
    experiencePoints?: number;
  };
};

export function applyLevelUpDraft(
  sheet: Dnd5eSheetData,
  draft: LevelUpDraft,
  currentXp: number,
): AppliedLevelUp {
  const next: Dnd5eSheetData = structuredClone(sheet);
  const { plan } = draft;
  const toLevel = plan.toLevel;

  // HP
  const hpGain = Math.max(0, Math.floor(draft.hpGain));
  next.combat.hpMax = Math.max(1, (next.combat.hpMax ?? 1) + hpGain);
  next.combat.hpCurrent = Math.min(
    next.combat.hpMax,
    (next.combat.hpCurrent ?? 0) + hpGain,
  );

  // Hit dice count
  const parsed = parseHitDiceString(next.combat.hitDice);
  if (parsed) {
    next.combat.hitDice = `${toLevel}d${parsed.dieSides}`;
    const rem = next.combat.hitDiceRemaining;
    if (rem != null) {
      next.combat.hitDiceRemaining = Math.min(toLevel, rem + 1);
    }
  } else {
    next.combat.hitDice = `${toLevel}d${plan.hitDie}`;
  }

  // Class features (plan) + catch-up subclass features when picking late
  const subclassCatchUp =
    draft.subclassId && plan.classId && plan.needsSubclass
      ? subclassFeaturesUpToLevel(plan.classId, draft.subclassId, toLevel).filter(
          (f) => !plan.features.some((p) => p.id === f.id),
        )
      : draft.subclassId && plan.classId
        ? featuresForLevel(plan.classId, toLevel, draft.subclassId).filter(
            (f) => !plan.features.some((p) => p.id === f.id),
          )
        : [];
  const allClassFeatures = [...plan.features, ...subclassCatchUp];
  const selectedIds =
    draft.selectedFeatureIds.length > 0
      ? new Set([
          ...draft.selectedFeatureIds,
          // Auto-include catch-up / mid-wizard subclass features
          ...subclassCatchUp.map((f) => f.id),
        ])
      : new Set(allClassFeatures.map((f) => f.id));

  for (const f of allClassFeatures) {
    if (!selectedIds.has(f.id)) continue;
    if (
      next.features.some(
        (x) =>
          x.id === f.id ||
          x.nameEn === f.nameEn ||
          x.nameDe === f.nameDe ||
          x.name === f.nameDe ||
          x.name === f.nameEn,
      )
    ) {
      continue;
    }
    next.features.push(featureFromProgression(f));
  }

  // Domain / subclass granted spells (always prepared) from newly applied features
  const grantedFrom = allClassFeatures.filter((f) => selectedIds.has(f.id));
  next.spells = appendGrantedSpellsFromFeatures(next, grantedFrom, "domain").spells;

  for (const f of plan.raceFeatures) {
    if (!draft.selectedRaceFeatureIds.includes(f.id)) continue;
    if (next.features.some((x) => x.id === f.id || x.nameEn === f.nameEn)) continue;
    next.features.push(featureFromProgression(f));
  }

  if (draft.customFeature?.name?.trim()) {
    next.features.push(
      customFeatureEntry(
        `custom-${newId()}`,
        draft.customFeature.name.trim(),
        draft.customFeature.description,
      ),
    );
  }

  // ASI / Feat
  if (plan.needsAsi && draft.asi) {
    if (draft.asi.type === "asi") {
      for (const inc of draft.asi.increases) {
        applyAbilityIncrease(next, inc.ability, inc.delta);
      }
    } else {
      const feat = getFeatById(draft.asi.featId);
      if (feat) {
        next.features.push(
          customFeatureEntry(
            `feat-${feat.id}`,
            feat.nameDe || feat.nameEn,
            feat.descriptionDe || feat.descriptionEn,
            "feat",
            "level-up",
          ),
        );
        if (feat.abilityBonus) {
          for (const [ab, delta] of Object.entries(feat.abilityBonus)) {
            if (delta) applyAbilityIncrease(next, ab as AbilityKeyShort, delta);
          }
        }
        // Tough: +2 HP per level including current
        if (feat.id === "tough") {
          const bonus = 2 * toLevel;
          next.combat.hpMax += bonus;
          next.combat.hpCurrent = Math.min(
            next.combat.hpMax,
            next.combat.hpCurrent + bonus,
          );
        }
      } else if (draft.asi.customName?.trim()) {
        next.features.push(
          customFeatureEntry(
            `feat-custom-${newId()}`,
            draft.asi.customName.trim(),
            draft.asi.customDescription,
            "feat",
          ),
        );
      }
    }
  }

  // Spell slots (+ ability for new third-casters)
  if (plan.spellcasting) {
    const slots = { ...(next.spellcasting?.slots ?? {}) };
    for (const [key, max] of Object.entries(plan.spellcasting.slotsMax) as Array<
      [SlotKey, number]
    >) {
      const prev = slots[key];
      slots[key] = {
        max,
        used: prev ? Math.min(prev.used, max) : 0,
      };
    }
    const third =
      plan.spellcasting.caster === "third" ||
      isThirdCasterSubclass(draft.subclassId);
    const ability =
      next.spellcasting?.ability ??
      (third ? "int" : defaultSpellAbilityForClass(plan.classId));
    next.spellcasting = {
      ...(next.spellcasting ?? { ability: "int" }),
      ability,
      slots,
    };
  }

  // Spells from catalog (known vs prepared vs always-cantrip)
  const catalog = getSpells();
  const existingIds = new Set(
    (next.spells ?? []).map((s) => s.id.toLowerCase()),
  );
  const existingNames = new Set(
    (next.spells ?? []).map((s) => s.name.toLowerCase()),
  );
  next.spells = [...(next.spells ?? [])];
  const leveledMode = plan.spellcasting?.preparedHint ? "prepared" : "known";

  for (const spellId of draft.newSpellIds) {
    const def = catalog.find((s) => s.id === spellId);
    if (!def) continue;
    if (existingIds.has(def.id) || existingNames.has(def.nameEn.toLowerCase())) continue;
    const isCantrip = def.level <= 0;
    const entry: Dnd5eSpellEntry = {
      id: def.id,
      name: def.nameDe || def.nameEn,
      nameDe: def.nameDe,
      nameEn: def.nameEn,
      description: def.descriptionDe || def.descriptionEn || null,
      descriptionDe: def.descriptionDe ?? null,
      descriptionEn: def.descriptionEn ?? null,
      level: def.level,
      preparationMode: isCantrip ? "always" : leveledMode,
      prepared: isCantrip || leveledMode === "known",
    };
    next.spells.push(entry);
    existingIds.add(def.id);
  }

  for (const custom of draft.customSpells) {
    if (!custom.name.trim()) continue;
    const lvl = Math.max(0, Math.floor(custom.level));
    const isCantrip = lvl <= 0;
    next.spells.push({
      id: `custom-spell-${newId()}`,
      name: custom.name.trim(),
      nameDe: custom.name.trim(),
      nameEn: custom.name.trim(),
      description: custom.description ?? null,
      level: lvl,
      preparationMode: isCantrip ? "always" : leveledMode,
      prepared: isCantrip || leveledMode === "known",
    });
  }

  const meta: AppliedLevelUp["meta"] = {
    level: toLevel,
  };

  if (draft.subclassId) {
    const opt =
      matchSubclassOption(draft.subclassId, plan.subclassOptions) ??
      plan.subclassOptions.find((s) => s.id === draft.subclassId);
    meta.subclass = opt?.nameDe || opt?.nameEn || draft.subclassId;
  }

  if (draft.setXpToThreshold) {
    meta.experiencePoints = Math.max(currentXp, xpForLevel(toLevel));
  }

  return { sheet: next, meta };
}
