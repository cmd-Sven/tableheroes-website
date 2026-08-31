/**
 * Swap subclass on an existing sheet: remove old subclass features/grants,
 * apply new ones, sync spell slots (incl. third-caster AT/EK).
 */
import type { Dnd5eFeatureEntry, Dnd5eSheetData } from "../types";
import { progressionFeatureToEntry } from "../feature-entry";
import { appendGrantedSpellsFromFeatures, applyClassBasicsFromCatalog } from "./catalog-bridge";
import { getClassProgression } from "./catalog";
import { matchSubclassOption, resolveClassId } from "./class-ids";
import { subclassFeaturesUpToLevel } from "./engine";
import type { ProgressionFeature } from "./types";

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
  return progressionFeatureToEntry(f, "srd-subclass");
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

function removeSubclassArtifacts(
  sheet: Dnd5eSheetData,
  classId: NonNullable<ReturnType<typeof resolveClassId>>,
  subclassHint: string,
  level: number,
): Dnd5eSheetData {
  const oldFeatures = subclassFeaturesUpToLevel(classId, subclassHint, level);
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
      const nameEn = (s.nameEn ?? "").toLowerCase();
      const nameDe = (s.nameDe ?? "").toLowerCase();
      // Only strip domain/granted / always-prepared catalog grants, not player-known spells
      const isGrant =
        s.source === "domain" ||
        s.preparationMode === "always" ||
        s.source === "srd-subclass";
      if (!isGrant) return true;
      if (spellIds.has(id) || spellIds.has(bare)) return false;
      // Mage Hand etc. by name if id matched grant list
      for (const gid of spellIds) {
        const gBare = gid.replace(/^srd-/, "");
        if (nameEn && normalizeMatch(nameEn) === normalizeMatch(gBare)) return false;
        if (nameDe && normalizeMatch(nameDe) === normalizeMatch(gBare)) return false;
      }
      return true;
    });
  }

  return next;
}

export type AppliedSubclassChange = {
  sheet: Dnd5eSheetData;
  subclassLabel: string | null;
  subclassId: string | null;
};

/**
 * Change subclass for a character at the given level.
 * Pass nextSubclassId = null/"" to clear catalog subclass grants.
 */
export function applySubclassChange(
  sheet: Dnd5eSheetData,
  options: {
    className: string | null;
    level: number;
    previousSubclass: string | null;
    nextSubclassId: string | null;
    locale?: "de" | "en";
  },
): AppliedSubclassChange {
  const locale = options.locale ?? "de";
  const classId = resolveClassId(options.className);
  const level = Math.max(1, Math.floor(options.level));
  let next = structuredClone(sheet);

  if (!classId) {
    return {
      sheet: applyClassBasicsFromCatalog(
        next,
        options.className,
        level,
        options.nextSubclassId,
        locale,
      ),
      subclassLabel: options.nextSubclassId,
      subclassId: null,
    };
  }

  const prog = getClassProgression(classId);
  const subclassOptions = prog?.subclasses ?? [];

  if (options.previousSubclass?.trim()) {
    const prev = matchSubclassOption(options.previousSubclass, subclassOptions);
    if (prev) {
      next = removeSubclassArtifacts(next, classId, prev.id, level);
    } else {
      next = removeSubclassArtifacts(next, classId, options.previousSubclass, level);
    }
  }

  const nextOpt = options.nextSubclassId?.trim()
    ? matchSubclassOption(options.nextSubclassId, subclassOptions)
    : null;

  if (nextOpt) {
    const newFeatures = subclassFeaturesUpToLevel(classId, nextOpt.id, level);
    for (const f of newFeatures) {
      if (next.features.some((x) => featureMatchesProgression(x, f))) continue;
      next.features.push(progressionToFeature(f));
    }
    next = appendGrantedSpellsFromFeatures(next, newFeatures, "domain");
  }

  const subclassLabel = nextOpt
    ? locale === "de"
      ? nextOpt.nameDe || nextOpt.nameEn
      : nextOpt.nameEn
    : null;

  next = applyClassBasicsFromCatalog(
    next,
    options.className,
    level,
    subclassLabel ?? options.nextSubclassId,
    locale,
  );

  return {
    sheet: next,
    subclassLabel,
    subclassId: nextOpt?.id ?? null,
  };
}

/** Subclass options available in the catalog for the class (not the “coming soon” list). */
export function listCatalogSubclassOptions(
  className: string | null,
  locale: "de" | "en" = "de",
): Array<{ id: string; label: string }> {
  const classId = resolveClassId(className);
  if (!classId) return [];
  const prog = getClassProgression(classId);
  return (prog?.subclasses ?? []).map((s) => ({
    id: s.id,
    label: locale === "de" ? s.nameDe || s.nameEn : s.nameEn,
  }));
}

export function catalogSubclassLevel(className: string | null): number | null {
  const classId = resolveClassId(className);
  if (!classId) return null;
  const prog = getClassProgression(classId);
  if (!prog?.subclasses?.length) return null;
  return prog.subclassLevel ?? 3;
}
