export type QuickRulebookLocale = "de" | "en";

export const DEFAULT_QUICK_RULEBOOK_LOCALE: QuickRulebookLocale = "de";

export function normalizeQuickRulebookLocale(
  value: string | null | undefined,
): QuickRulebookLocale {
  return value === "en" ? "en" : "de";
}

export type QuickRulebookMessageKey =
  | "modal.title"
  | "modal.subtitle"
  | "modal.close"
  | "search.placeholder"
  | "search.noResults"
  | "search.hint"
  | "search.resultsCount"
  | "category.combat"
  | "category.action"
  | "category.condition"
  | "category.item"
  | "category.class-feature"
  | "category.feat"
  | "category.spell"
  | "category.environment"
  | "category.general"
  | "edition.badge"
  | "locale.de"
  | "locale.en"
  | "toolbar.open";

export type QuickRuleCategoryMessageKey =
  | "category.combat"
  | "category.action"
  | "category.condition"
  | "category.item"
  | "category.class-feature"
  | "category.feat"
  | "category.spell"
  | "category.environment"
  | "category.general";
