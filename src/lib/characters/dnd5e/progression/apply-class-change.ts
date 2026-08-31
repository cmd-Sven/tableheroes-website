/**
 * Swap class on an existing sheet: remove old class/subclass features & grants,
 * apply new class basics (hit die, slots, spell ability, proficiencies, saves).
 */
import type { AbilityKey, Dnd5eFeatureEntry, Dnd5eSheetData } from "../types";
import { progressionFeatureToEntry } from "../feature-entry";
import {
  appendGrantedSpellsFromFeatures,
  applyClassBasicsFromCatalog,
} from "./catalog-bridge";
import { applyClassProficienciesFromCatalog } from "./proficiencies-catalog";
import { getClassProgression } from "./catalog";
import { resolveClassId } from "./class-ids";
import { featuresForLevel } from "./engine";
import { CLASS_SAVE_PROFICIENCIES } from "./character-create";
import type { ClassId, ProgressionFeature } from "./types";
import { ensureClassResources } from "@/src/lib/characters/dnd5e/rest";

function normalizeMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "");
}

function featureMatchesProgression(
  entry: Dnd5eFeatureEntry,
  f: ProgressionFeature,
): boolean {
  if (entry.id === f.id) return true;
  if (entry.nameEn && entry.nameEn === f.nameEn) return true;
  if (entry.nameDe && entry.nameDe === f.nameDe) return true;
  if (entry.name === f.nameDe || entry.name === f.nameEn) return true;
  return (
    normalizeMatch(entry.name) === normalizeMatch(f.nameDe) ||
    normalizeMatch(entry.name) === normalizeMatch(f.nameEn)
  );
}

function progressionToFeature(f: ProgressionFeature): Dnd5eFeatureEntry {
  return progressionFeatureToEntry(f, "srd-class");
}

/** All non-ASI class (+ optional subclass) features with level ≤ maxLevel. */
export function classFeaturesUpToLevel(
  classId: ClassId,
  maxLevel: number,
  subclassIdOrHint: string | null,
): ProgressionFeature[] {
  const byId = new Map<string, ProgressionFeature>();
  const capped = Math.max(1, Math.floor(maxLevel));
  for (let lvl = 1; lvl <= capped; lvl++) {
    for (const f of featuresForLevel(classId, lvl, subclassIdOrHint)) {
      byId.set(f.id, f);
    }
  }
  return [...byId.values()].sort(
    (a, b) => a.level - b.level || a.id.localeCompare(b.id),
  );
}

function grantedSpellIdSet(features: ProgressionFeature[]): Set<string> {
  const ids = new Set<string>();
  for (const f of features) {
    for (const id of f.grantedSpellIds ?? []) {
      if (!id) continue;
      ids.add(id.toLowerCase());
      ids.add(`srd-${id}`.toLowerCase());
    }
  }
  return ids;
}

function removeClassArtifacts(
  sheet: Dnd5eSheetData,
  classId: ClassId,
  subclassHint: string | null,
  level: number,
): Dnd5eSheetData {
  const oldFeatures = classFeaturesUpToLevel(classId, level, subclassHint);
  if (oldFeatures.length === 0) return sheet;

  const next: Dnd5eSheetData = structuredClone(sheet);
  const spellIds = grantedSpellIdSet(oldFeatures);

  next.features = (next.features ?? []).filter(
    (entry) => !oldFeatures.some((f) => featureMatchesProgression(entry, f)),
  );

  if (spellIds.size > 0 && next.spells?.length) {
    next.spells = next.spells.filter((s) => {
      const id = s.id.toLowerCase();
      const bare = id.replace(/^srd-/, "");
      const isGrant =
        s.source === "domain" ||
        s.preparationMode === "always" ||
        s.source === "srd-subclass" ||
        s.source === "srd-class";
      if (!isGrant) return true;
      if (spellIds.has(id) || spellIds.has(bare)) return false;
      return true;
    });
  }

  return next;
}

function swapSavingThrows(
  sheet: Dnd5eSheetData,
  previousClassId: ClassId | null,
  nextClassId: ClassId | null,
): Dnd5eSheetData {
  const next: Dnd5eSheetData = structuredClone(sheet);
  const prevSaves = previousClassId
    ? new Set(CLASS_SAVE_PROFICIENCIES[previousClassId] ?? [])
    : new Set<AbilityKey>();
  const newSaves = nextClassId
    ? new Set(CLASS_SAVE_PROFICIENCIES[nextClassId] ?? [])
    : new Set<AbilityKey>();

  for (const key of Object.keys(next.savingThrows) as AbilityKey[]) {
    if (prevSaves.has(key) && !newSaves.has(key)) {
      next.savingThrows[key] = { proficient: false };
    }
  }
  for (const key of newSaves) {
    next.savingThrows[key] = { proficient: true };
  }
  return next;
}

export type AppliedClassChange = {
  sheet: Dnd5eSheetData;
  classLabel: string;
  subclassLabel: string | null;
};

/**
 * Change class for a character at the given level.
 * Clears subclass grants (subclasses are class-specific) and re-applies
 * catalog hit die / slots / spell ability / armor-weapon-tool grants.
 */
export function applyClassChange(
  sheet: Dnd5eSheetData,
  options: {
    previousClassName: string | null;
    nextClassName: string | null;
    level: number;
    previousSubclass?: string | null;
    locale?: "de" | "en";
  },
): AppliedClassChange {
  const locale = options.locale ?? "de";
  const level = Math.max(1, Math.floor(options.level));
  const prevClassId = resolveClassId(options.previousClassName);
  const nextClassId = resolveClassId(options.nextClassName);
  let next = structuredClone(sheet);

  if (prevClassId) {
    // Includes subclass features when previousSubclass is set
    next = removeClassArtifacts(
      next,
      prevClassId,
      options.previousSubclass ?? null,
      level,
    );
  }

  next = swapSavingThrows(next, prevClassId, nextClassId);

  const prog = nextClassId ? getClassProgression(nextClassId) : null;
  const classLabel =
    options.nextClassName?.trim() ||
    (prog
      ? locale === "de"
        ? prog.nameDe
        : prog.nameEn
      : "") ||
    "";

  if (nextClassId && prog) {
    const newFeatures = classFeaturesUpToLevel(nextClassId, level, null);
    for (const f of newFeatures) {
      if (next.features.some((x) => featureMatchesProgression(x, f))) continue;
      next.features.push(progressionToFeature(f));
    }
    next = appendGrantedSpellsFromFeatures(next, newFeatures, "domain");
  }

  next = ensureClassResources(next, classLabel || "");
  next = applyClassBasicsFromCatalog(
    next,
    classLabel || null,
    level,
    null,
    locale,
  );
  next = applyClassProficienciesFromCatalog(next, classLabel || null, locale, {
    replaceClassGrants: true,
  });

  return {
    sheet: next,
    classLabel,
    subclassLabel: null,
  };
}
