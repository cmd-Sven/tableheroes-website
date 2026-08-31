import type { Dnd5eFeatureEntry, Dnd5eFeatureKind } from "./types";
import { classFeaturesUpToLevel } from "./progression/apply-class-change";
import { resolveClassId } from "./progression/class-ids";
import type { ProgressionFeature } from "./progression/types";

function normalizeMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "");
}

export function featureMatchesProgression(
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

function inferKindFromSource(entry: Dnd5eFeatureEntry): Dnd5eFeatureKind {
  if (entry.source === "srd-feat" || entry.id.startsWith("feat-")) return "feat";
  if (entry.source === "srd-subclass") return "subclass";
  if (entry.source === "srd-class" || entry.source === "level-up" || entry.source === "character-create") {
    return "class";
  }
  if (entry.source === "manual") return "custom";
  return "other";
}

/** Progressions-Feature → Sheet-Eintrag inkl. Stufe und Art. */
export function progressionFeatureToEntry(
  f: ProgressionFeature,
  source: string,
): Dnd5eFeatureEntry {
  return {
    id: f.id,
    name: f.nameDe || f.nameEn,
    nameDe: f.nameDe,
    nameEn: f.nameEn,
    description: f.descriptionDe || f.descriptionEn || null,
    descriptionDe: f.descriptionDe ?? null,
    descriptionEn: f.descriptionEn ?? null,
    source,
    level: f.level,
    subclassId: f.subclass ?? null,
    featureKind: f.subclass ? "subclass" : "class",
  };
}

/** Fehlende Metadaten aus dem Klassen-Katalog ergänzen (Bestandscharaktere). */
export function enrichFeatureFromCatalog(
  entry: Dnd5eFeatureEntry,
  className: string,
  subclassHint: string | null,
  maxLevel: number,
): Dnd5eFeatureEntry {
  const classId = resolveClassId(className);
  let enriched = { ...entry };

  if (classId) {
    const catalog = classFeaturesUpToLevel(classId, maxLevel, subclassHint);
    const match = catalog.find((f) => featureMatchesProgression(entry, f));
    if (match) {
      enriched = {
        ...enriched,
        level: enriched.level ?? match.level,
        subclassId: enriched.subclassId ?? match.subclass ?? null,
        featureKind:
          enriched.featureKind ?? (match.subclass ? "subclass" : "class"),
      };
    }
  }

  if (!enriched.featureKind) {
    enriched.featureKind = inferKindFromSource(enriched);
  }

  return enriched;
}

export type FeatureListItem = {
  feature: Dnd5eFeatureEntry;
  index: number;
};

export type FeatureDisplayGroup = {
  id: "class" | "subclass" | "feat" | "other";
  items: FeatureListItem[];
};

export function groupFeaturesForDisplay(
  features: Dnd5eFeatureEntry[],
  className: string,
  subclassHint: string | null,
  level: number,
): FeatureDisplayGroup[] {
  const items: FeatureListItem[] = features.map((feature, index) => ({
    feature: enrichFeatureFromCatalog(feature, className, subclassHint, level),
    index,
  }));

  const sortByLevel = (a: FeatureListItem, b: FeatureListItem) => {
    const la = a.feature.level ?? 99;
    const lb = b.feature.level ?? 99;
    if (la !== lb) return la - lb;
    return a.feature.name.localeCompare(b.feature.name, "de");
  };

  const classItems = items.filter((x) => x.feature.featureKind === "class").sort(sortByLevel);
  const subclassItems = items.filter((x) => x.feature.featureKind === "subclass").sort(sortByLevel);
  const featItems = items
    .filter((x) => x.feature.featureKind === "feat" || x.feature.featureKind === "race")
    .sort(sortByLevel);
  const otherItems = items
    .filter(
      (x) =>
        x.feature.featureKind === "other" ||
        x.feature.featureKind === "custom" ||
        !x.feature.featureKind,
    )
    .sort((a, b) => a.feature.name.localeCompare(b.feature.name, "de"));

  const groups: FeatureDisplayGroup[] = [];
  if (classItems.length) groups.push({ id: "class", items: classItems });
  if (subclassItems.length) groups.push({ id: "subclass", items: subclassItems });
  if (featItems.length) groups.push({ id: "feat", items: featItems });
  if (otherItems.length) groups.push({ id: "other", items: otherItems });
  return groups;
}

export function getClassFeatureGroups(
  features: Dnd5eFeatureEntry[],
  className: string,
  subclassHint: string | null,
  level: number,
): { class: FeatureListItem[]; subclass: FeatureListItem[] } {
  const groups = groupFeaturesForDisplay(features, className, subclassHint, level);
  return {
    class: groups.find((g) => g.id === "class")?.items ?? [],
    subclass: groups.find((g) => g.id === "subclass")?.items ?? [],
  };
}

export function getFeatAndOtherFeatureItems(
  features: Dnd5eFeatureEntry[],
  className: string,
  subclassHint: string | null,
  level: number,
): FeatureListItem[] {
  const groups = groupFeaturesForDisplay(features, className, subclassHint, level);
  const feat = groups.find((g) => g.id === "feat")?.items ?? [];
  const other = groups.find((g) => g.id === "other")?.items ?? [];
  return [...feat, ...other];
}
