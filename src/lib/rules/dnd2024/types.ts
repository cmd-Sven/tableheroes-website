export const DND_2024_RULES_EDITION = "dnd-2024" as const;

export type QuickRuleCategory =
  | "combat"
  | "action"
  | "condition"
  | "item"
  | "class-feature"
  | "environment"
  | "general";

export type QuickRuleEntry = {
  id: string;
  category: QuickRuleCategory;
  titleDe: string;
  titleEn: string;
  summaryDe: string;
  summaryEn: string;
  /** Lowercase search tokens (DE + EN aliases, normalized). */
  aliases: string[];
  source: string;
  rulesEdition: typeof DND_2024_RULES_EDITION;
};

export type QuickRuleSearchResult = QuickRuleEntry & { score: number };
