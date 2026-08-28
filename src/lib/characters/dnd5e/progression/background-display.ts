/**
 * Display helpers for D&D 2024 background bonuses on the character sheet.
 */
import type { Dnd5eSkillKey, AbilityKey } from "../types";
import type { CharacterSheetMessageKey } from "@/src/lib/i18n/character-sheet/de";
import type { BackgroundDefinition } from "./types";
import { getFeatById } from "./catalog";
import {
  getProficiencyById,
  proficiencyLabel,
} from "./proficiencies-catalog";

export type BackgroundDisplayLabels = {
  locale: "de" | "en";
  skillLabel: (key: Dnd5eSkillKey) => string;
  abilityLabel: (key: AbilityKey) => string;
  t: (key: CharacterSheetMessageKey, values?: Record<string, string | number>) => string;
};

function normalizeMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/u, "")
    .replace(/[^a-z0-9]+/g, "");
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

function localizedBackgroundName(bg: BackgroundDefinition, locale: "de" | "en"): string {
  return locale === "de" ? bg.nameDe || bg.nameEn : bg.nameEn || bg.nameDe;
}

function formatAbilityBonusList(
  bg: BackgroundDefinition,
  labels: Pick<BackgroundDisplayLabels, "abilityLabel">,
): string {
  return Object.entries(bg.abilityBonus ?? {})
    .filter(([, delta]) => delta)
    .map(([key, delta]) => `${labels.abilityLabel(key as AbilityKey)} +${delta}`)
    .join(", ");
}

/** Concise bonus lines for the sheet header (skills, tools, ASI, origin feat, languages). */
export function formatBackgroundBonusLines(
  bg: BackgroundDefinition | null,
  labels: BackgroundDisplayLabels,
): string[] {
  if (!bg) return [];
  const lines: string[] = [];

  if (bg.skillProficiencies.length > 0) {
    const list = bg.skillProficiencies
      .map((key) => labels.skillLabel(key as Dnd5eSkillKey))
      .join(", ");
    lines.push(labels.t("backgroundCatalog.bonusSummary.skills", { list }));
  }

  const tools = toolLabelsForBackground(bg, labels.locale);
  if (tools.length > 0) {
    lines.push(labels.t("backgroundCatalog.bonusSummary.tools", { list: tools.join(", ") }));
  }

  const abilityList = formatAbilityBonusList(bg, labels);
  if (abilityList) {
    lines.push(labels.t("backgroundCatalog.bonusSummary.ability", { list: abilityList }));
  }

  if (bg.originFeatId) {
    const feat = getFeatById(bg.originFeatId);
    const featName = feat
      ? labels.locale === "de"
        ? feat.nameDe || feat.nameEn
        : feat.nameEn || feat.nameDe
      : bg.originFeatId;
    lines.push(labels.t("backgroundCatalog.bonusSummary.originFeat", { name: featName }));
  }

  if (bg.languageChoices && bg.languageChoices > 0) {
    lines.push(
      labels.t("backgroundCatalog.bonusSummary.languages", { count: bg.languageChoices }),
    );
  }

  return lines;
}

export type BackgroundHelpSection = {
  labelKey: CharacterSheetMessageKey;
  content: string;
};

/** Structured sections for the background help modal. */
export function buildBackgroundHelpSections(
  bg: BackgroundDefinition,
  labels: BackgroundDisplayLabels,
): BackgroundHelpSection[] {
  const { locale, t, skillLabel, abilityLabel } = labels;
  const sections: BackgroundHelpSection[] = [];

  const description =
    locale === "de"
      ? bg.descriptionDe || bg.descriptionEn
      : bg.descriptionEn || bg.descriptionDe;
  if (description?.trim()) {
    sections.push({
      labelKey: "backgroundCatalog.help.description",
      content: description.trim(),
    });
  }

  const abilityList = formatAbilityBonusList(bg, labels);
  if (abilityList) {
    sections.push({
      labelKey: "backgroundCatalog.help.ability2024",
      content: `${abilityList}\n\n${t("backgroundCatalog.help.ability2024Hint")}`,
    });
  }

  if (bg.skillProficiencies.length > 0) {
    const list = bg.skillProficiencies
      .map((key) => skillLabel(key as Dnd5eSkillKey))
      .join(", ");
    sections.push({
      labelKey: "backgroundCatalog.help.skills",
      content: list,
    });
  }

  const tools = toolLabelsForBackground(bg, locale);
  if (tools.length > 0) {
    sections.push({
      labelKey: "backgroundCatalog.help.tools",
      content: tools.join(", "),
    });
  }

  if (bg.languageChoices && bg.languageChoices > 0) {
    sections.push({
      labelKey: "backgroundCatalog.help.languages",
      content: t("backgroundCatalog.help.languagesDetail", { count: bg.languageChoices }),
    });
  }

  if (bg.originFeatId) {
    const feat = getFeatById(bg.originFeatId);
    const featName = feat
      ? locale === "de"
        ? feat.nameDe || feat.nameEn
        : feat.nameEn || feat.nameDe
      : bg.originFeatId;
    const featDesc = feat
      ? locale === "de"
        ? feat.descriptionDe || feat.descriptionEn
        : feat.descriptionEn || feat.descriptionDe
      : null;
    sections.push({
      labelKey: "backgroundCatalog.help.originFeat",
      content: featDesc?.trim()
        ? `${featName}\n\n${featDesc.trim()}`
        : featName,
    });
  }

  const featureName =
    locale === "de"
      ? bg.feature.nameDe || bg.feature.nameEn
      : bg.feature.nameEn || bg.feature.nameDe;
  const featureDesc =
    locale === "de"
      ? bg.feature.descriptionDe || bg.feature.descriptionEn
      : bg.feature.descriptionEn || bg.feature.descriptionDe;
  if (featureName?.trim() || featureDesc?.trim()) {
    sections.push({
      labelKey: "backgroundCatalog.help.feature",
      content: featureDesc?.trim()
        ? `${featureName}\n\n${featureDesc.trim()}`
        : featureName,
    });
  }

  const equipHint =
    locale === "de"
      ? bg.equipmentHintDe || bg.equipmentHintEn
      : bg.equipmentHintEn || bg.equipmentHintDe;
  if (equipHint?.trim()) {
    sections.push({
      labelKey: "backgroundCatalog.help.equipment",
      content: equipHint.trim(),
    });
  }

  return sections;
}

export function getBackgroundDisplayName(
  bg: BackgroundDefinition,
  locale: "de" | "en",
): string {
  return localizedBackgroundName(bg, locale);
}
