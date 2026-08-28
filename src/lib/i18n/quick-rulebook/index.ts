import type { QuickRuleCategory } from "@/src/lib/rules/dnd2024/types";
import type {
  QuickRuleCategoryMessageKey,
  QuickRulebookLocale,
  QuickRulebookMessageKey,
} from "./types";
import { quickRulebookMessagesDe } from "./de";
import { quickRulebookMessagesEn } from "./en";

export type {
  QuickRulebookLocale,
  QuickRulebookMessageKey,
  QuickRuleCategoryMessageKey,
} from "./types";
export {
  DEFAULT_QUICK_RULEBOOK_LOCALE,
  normalizeQuickRulebookLocale,
} from "./types";

type InterpolationValues = Record<string, string | number>;

const MESSAGES: Record<
  QuickRulebookLocale,
  Record<QuickRulebookMessageKey, string>
> = {
  de: quickRulebookMessagesDe,
  en: quickRulebookMessagesEn,
};

const CATEGORY_KEYS: Record<QuickRuleCategory, QuickRuleCategoryMessageKey> = {
  combat: "category.combat",
  action: "category.action",
  condition: "category.condition",
  item: "category.item",
  "class-feature": "category.class-feature",
  environment: "category.environment",
  general: "category.general",
};

export function createQuickRulebookT(locale: QuickRulebookLocale) {
  return function t(key: QuickRulebookMessageKey, values?: InterpolationValues): string {
    let text = MESSAGES[locale][key] ?? MESSAGES.de[key] ?? key;
    if (values) {
      for (const [k, v] of Object.entries(values)) {
        text = text.replaceAll(`{${k}}`, String(v));
      }
    }
    return text;
  };
}

export type QuickRulebookT = ReturnType<typeof createQuickRulebookT>;

export function getQuickRuleCategoryLabel(
  locale: QuickRulebookLocale,
  category: QuickRuleCategory,
): string {
  const t = createQuickRulebookT(locale);
  return t(CATEGORY_KEYS[category]);
}
