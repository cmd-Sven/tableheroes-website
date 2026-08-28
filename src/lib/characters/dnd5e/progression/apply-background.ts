/**
 * Apply / remove SRD-style background grants on a character sheet.
 * Only reverses tags with source `srd-background` and skill/tool grants
 * from the previous catalog background (expertise / manual tools kept).
 */
import type {
  AbilityKey,
  Dnd5eFeatureEntry,
  Dnd5eSheetData,
  Dnd5eSkillKey,
} from "../types";
import type { AbilityKeyShort, BackgroundDefinition } from "./types";
import {
  findBackgroundByName,
  getFeatById,
  getBackgroundById,
  getBackgrounds,
} from "./catalog";
import {
  getProficiencyById,
  proficiencyLabel,
} from "./proficiencies-catalog";
import {
  getSheetCampaignLore,
  setSheetCampaignLore,
  type LoreRaceAbilityBonuses,
} from "@/src/lib/lore-race-bonuses";

export const BACKGROUND_SOURCE = "srd-background";
const BACKGROUND_ORIGIN_FEAT_SOURCE = "srd-background-origin-feat";

function normalizeMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "");
}

function featureIdForBackground(bg: BackgroundDefinition): string {
  return `bg-${bg.id}-feature`;
}

function equipmentFeatureId(bg: BackgroundDefinition): string {
  return `bg-${bg.id}-equipment`;
}

function toolLabelsForBackground(
  bg: BackgroundDefinition,
  locale: "de" | "en",
): string[] {
  const fromIds = (bg.toolProficiencyIds ?? [])
    .map((id) => getProficiencyById(id))
    .filter(Boolean)
    .map((d) => proficiencyLabel(d!, locale));
  const free =
    locale === "de"
      ? (bg.toolLabelsDe ?? bg.toolLabelsEn ?? [])
      : (bg.toolLabelsEn ?? bg.toolLabelsDe ?? []);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const label of [...fromIds, ...free]) {
    const key = normalizeMatch(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

function applyAbilityDelta(
  sheet: Dnd5eSheetData,
  ability: AbilityKeyShort,
  delta: number,
): void {
  const key = ability as AbilityKey;
  const current = sheet.abilities[key]?.score ?? 10;
  sheet.abilities[key] = {
    ...sheet.abilities[key],
    score: Math.min(20, Math.max(1, current + delta)),
  };
}

function applyTrackedAbilityDelta(
  sheet: Dnd5eSheetData,
  delta: LoreRaceAbilityBonuses,
  sign: 1 | -1,
): void {
  for (const [ab, value] of Object.entries(delta)) {
    if (value) applyAbilityDelta(sheet, ab as AbilityKeyShort, sign * value);
  }
}

function catalogAbilityBonus(bg: BackgroundDefinition): LoreRaceAbilityBonuses {
  const out: LoreRaceAbilityBonuses = {};
  for (const [ab, delta] of Object.entries(bg.abilityBonus ?? {})) {
    if (delta) out[ab as AbilityKeyShort] = delta;
  }
  return out;
}

function sheetHasBackgroundFeature(sheet: Dnd5eSheetData, bg: BackgroundDefinition): boolean {
  return (sheet.features ?? []).some((f) => f.id === featureIdForBackground(bg));
}

function removeMatchingLabels(list: string[], toRemove: string[]): string[] {
  const removeKeys = new Set(toRemove.map(normalizeMatch).filter(Boolean));
  if (removeKeys.size === 0) return list;
  return list.filter((x) => !removeKeys.has(normalizeMatch(x)));
}

function mergeLabels(existing: string[], add: string[]): string[] {
  const seen = new Set(existing.map(normalizeMatch).filter(Boolean));
  const out = [...existing];
  for (const label of add) {
    const key = normalizeMatch(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

/** Detect currently applied catalog background from features or meta name. */
export function resolveAppliedBackgroundId(
  sheet: Dnd5eSheetData,
  backgroundMeta?: string | null,
): string | null {
  for (const f of sheet.features ?? []) {
    if (f.source !== BACKGROUND_SOURCE) continue;
    const m = /^bg-([a-z0-9-]+)-feature$/i.exec(f.id);
    if (m?.[1] && getBackgroundById(m[1])) return m[1];
  }
  if (backgroundMeta?.trim()) {
    return findBackgroundByName(backgroundMeta)?.id ?? null;
  }
  return null;
}

export function removeBackgroundGrants(
  sheet: Dnd5eSheetData,
  backgroundIdOrMeta?: string | null,
  locale: "de" | "en" = "de",
): Dnd5eSheetData {
  const next: Dnd5eSheetData = structuredClone(sheet);
  const bgId =
    (backgroundIdOrMeta && getBackgroundById(backgroundIdOrMeta)?.id) ||
    (backgroundIdOrMeta ? findBackgroundByName(backgroundIdOrMeta)?.id : null) ||
    resolveAppliedBackgroundId(next, backgroundIdOrMeta);

  const bg = bgId ? getBackgroundById(bgId) : null;

  next.features = (next.features ?? []).filter((f) => {
    if (f.source === BACKGROUND_SOURCE) return false;
    if (bg && (f.id === featureIdForBackground(bg) || f.id === equipmentFeatureId(bg))) {
      return false;
    }
    return true;
  });

  if (bg) {
    for (const skill of bg.skillProficiencies) {
      const entry = next.skills[skill as Dnd5eSkillKey];
      if (!entry) continue;
      // Preserve expertise / half (player or class upgrades)
      if (entry.proficient === "proficient") {
        next.skills[skill as Dnd5eSkillKey] = {
          ...entry,
          proficient: "none",
        };
      }
    }

    const tools = toolLabelsForBackground(bg, locale);
    next.proficiencies = {
      ...next.proficiencies,
      tools: removeMatchingLabels(next.proficiencies.tools, tools),
    };

    const lore = getSheetCampaignLore(next);
    const tracked = lore.appliedBackgroundAbilityBonuses;
    if (tracked && Object.keys(tracked).length > 0) {
      applyTrackedAbilityDelta(next, tracked, -1);
    } else if (sheetHasBackgroundFeature(next, bg) && bg.abilityBonus) {
      applyTrackedAbilityDelta(next, catalogAbilityBonus(bg), -1);
    }

    if (bg.originFeatId) {
      const originFeatFeatureId = `feat-${bg.originFeatId}`;
      next.features = (next.features ?? []).filter((f) => {
        if (f.id !== originFeatFeatureId) return true;
        return f.source !== BACKGROUND_ORIGIN_FEAT_SOURCE;
      });
    }
  }

  return setSheetCampaignLore(next, {
    ...getSheetCampaignLore(next),
    appliedBackgroundId: null,
    appliedBackgroundAbilityBonuses: undefined,
  });
}

export function applyBackgroundGrants(
  sheet: Dnd5eSheetData,
  backgroundId: string,
  locale: "de" | "en" = "de",
): Dnd5eSheetData {
  const bg = getBackgroundById(backgroundId);
  if (!bg) return sheet;

  const next: Dnd5eSheetData = structuredClone(sheet);

  for (const skill of bg.skillProficiencies) {
    const key = skill as Dnd5eSkillKey;
    const entry = next.skills[key] ?? { proficient: "none" as const };
    if (entry.proficient === "none" || entry.proficient === "half") {
      next.skills[key] = { ...entry, proficient: "proficient" };
    }
  }

  const tools = toolLabelsForBackground(bg, locale);
  next.proficiencies = {
    ...next.proficiencies,
    tools: mergeLabels(next.proficiencies.tools, tools),
  };

  const appliedAbility = catalogAbilityBonus(bg);
  if (Object.keys(appliedAbility).length > 0) {
    applyTrackedAbilityDelta(next, appliedAbility, 1);
  }

  const featureName = locale === "de" ? bg.feature.nameDe || bg.feature.nameEn : bg.feature.nameEn;
  const featureDesc =
    locale === "de"
      ? bg.feature.descriptionDe || bg.feature.descriptionEn
      : bg.feature.descriptionEn || bg.feature.descriptionDe;

  const langNote =
    bg.languageChoices && bg.languageChoices > 0
      ? locale === "de"
        ? `\n\n(Sprachwahl: ${bg.languageChoices} Sprache(n) — manuell im Sprachen-Bereich wählen.)`
        : `\n\n(Language choice: pick ${bg.languageChoices} language(s) manually.)`
      : "";

  const mainFeature: Dnd5eFeatureEntry = {
    id: featureIdForBackground(bg),
    name: featureName,
    nameDe: bg.feature.nameDe,
    nameEn: bg.feature.nameEn,
    description: (featureDesc || null) ? `${featureDesc || ""}${langNote}` : langNote || null,
    descriptionDe: bg.feature.descriptionDe
      ? `${bg.feature.descriptionDe}${
          bg.languageChoices
            ? `\n\n(Sprachwahl: ${bg.languageChoices} Sprache(n) — manuell wählen.)`
            : ""
        }`
      : null,
    descriptionEn: bg.feature.descriptionEn
      ? `${bg.feature.descriptionEn}${
          bg.languageChoices
            ? `\n\n(Language choice: pick ${bg.languageChoices} language(s) manually.)`
            : ""
        }`
      : null,
    source: BACKGROUND_SOURCE,
  };

  if (!next.features.some((f) => f.id === mainFeature.id)) {
    next.features.push(mainFeature);
  }

  if (bg.originFeatId) {
    const feat = getFeatById(bg.originFeatId);
    if (feat) {
      const originFeatFeatureId = `feat-${feat.id}`;
      const alreadyHas = next.features.some((f) => f.id === originFeatFeatureId);
      if (!alreadyHas) {
        next.features.push({
          id: originFeatFeatureId,
          name: feat.nameDe || feat.nameEn,
          nameDe: feat.nameDe,
          nameEn: feat.nameEn,
          description: feat.descriptionDe || feat.descriptionEn || null,
          descriptionDe: feat.descriptionDe ?? null,
          descriptionEn: feat.descriptionEn ?? null,
          source: BACKGROUND_ORIGIN_FEAT_SOURCE,
        });
      }
    }
  }

  const equipHint =
    locale === "de"
      ? bg.equipmentHintDe || bg.equipmentHintEn
      : bg.equipmentHintEn || bg.equipmentHintDe;
  if (equipHint) {
    const equipFeature: Dnd5eFeatureEntry = {
      id: equipmentFeatureId(bg),
      name:
        locale === "de"
          ? `Ausrüstungshinweis: ${bg.nameDe}`
          : `Equipment hint: ${bg.nameEn}`,
      nameDe: `Ausrüstungshinweis: ${bg.nameDe}`,
      nameEn: `Equipment hint: ${bg.nameEn}`,
      description: equipHint,
      descriptionDe: bg.equipmentHintDe ?? null,
      descriptionEn: bg.equipmentHintEn ?? null,
      source: BACKGROUND_SOURCE,
    };
    if (!next.features.some((f) => f.id === equipFeature.id)) {
      next.features.push(equipFeature);
    }
  }

  return setSheetCampaignLore(next, {
    ...getSheetCampaignLore(next),
    appliedBackgroundId: bg.id,
    appliedBackgroundAbilityBonuses:
      Object.keys(appliedAbility).length > 0 ? appliedAbility : undefined,
  });
}

export type AppliedBackground = {
  sheet: Dnd5eSheetData;
  /** Display name for characters.background / meta */
  backgroundLabel: string | null;
  backgroundId: string | null;
};

/**
 * Replace previous background grants with the new catalog background (or clear).
 */
export function setCharacterBackground(
  sheet: Dnd5eSheetData,
  nextBackgroundId: string | null,
  options?: {
    previousBackgroundMeta?: string | null;
    locale?: "de" | "en";
  },
): AppliedBackground {
  const locale = options?.locale ?? "de";
  let next = removeBackgroundGrants(
    sheet,
    options?.previousBackgroundMeta ?? resolveAppliedBackgroundId(sheet, options?.previousBackgroundMeta),
    locale,
  );

  if (!nextBackgroundId) {
    return { sheet: next, backgroundLabel: null, backgroundId: null };
  }

  const bg = getBackgroundById(nextBackgroundId);
  if (!bg) {
    return { sheet: next, backgroundLabel: null, backgroundId: null };
  }

  next = applyBackgroundGrants(next, bg.id, locale);
  return {
    sheet: next,
    backgroundLabel: locale === "de" ? bg.nameDe || bg.nameEn : bg.nameEn,
    backgroundId: bg.id,
  };
}

/**
 * Stellt sicher, dass Katalog-Hintergrund-Boni (Features, Skills, ASI) im Blatt
 * angewendet sind — z. B. nach Laden, wenn nur meta.background gesetzt war.
 */
export function ensureBackgroundGrantsSynced(
  sheet: Dnd5eSheetData,
  backgroundMeta?: string | null,
  locale: "de" | "en" = "de",
): Dnd5eSheetData {
  const bgId =
    resolveAppliedBackgroundId(sheet, backgroundMeta) ??
    (backgroundMeta?.trim() ? findBackgroundByName(backgroundMeta)?.id : null);
  if (!bgId) return sheet;

  const bg = getBackgroundById(bgId);
  if (!bg) return sheet;

  const lore = getSheetCampaignLore(sheet);
  const hasFeature = sheetHasBackgroundFeature(sheet, bg);
  const trackedId = lore.appliedBackgroundId ?? null;
  const trackedBonuses = lore.appliedBackgroundAbilityBonuses;

  if (
    hasFeature &&
    trackedId === bg.id &&
    (trackedBonuses || !bg.abilityBonus || Object.keys(bg.abilityBonus).length === 0)
  ) {
    return sheet;
  }

  if (hasFeature && trackedId !== bg.id) {
    return setCharacterBackground(sheet, bg.id, {
      previousBackgroundMeta: backgroundMeta,
      locale,
    }).sheet;
  }

  if (hasFeature && !trackedBonuses && bg.abilityBonus) {
    const appliedAbility = catalogAbilityBonus(bg);
    if (Object.keys(appliedAbility).length === 0) return sheet;
    return setSheetCampaignLore(sheet, {
      ...lore,
      appliedBackgroundId: bg.id,
      appliedBackgroundAbilityBonuses: appliedAbility,
    });
  }

  if (!hasFeature) {
    return applyBackgroundGrants(sheet, bg.id, locale);
  }

  return sheet;
}

export function listBackgroundOptions(locale: "de" | "en" = "de"): Array<{
  id: string;
  label: string;
}> {
  return getBackgrounds()
    .map((b) => ({
      id: b.id,
      label: locale === "de" ? b.nameDe || b.nameEn : b.nameEn,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, locale));
}
