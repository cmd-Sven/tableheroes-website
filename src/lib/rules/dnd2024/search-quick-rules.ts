import type { QuickRuleEntry, QuickRuleSearchResult } from "./types";
import { QUICK_RULEBOOK_ENTRIES } from "./quick-rulebook-data";

function normalizeSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ß/g, "ss");
}

function tokenizeQuery(query: string): string[] {
  return normalizeSearchText(query)
    .split(/\s+/)
    .filter((part) => part.length > 0);
}

function entrySearchBlob(entry: QuickRuleEntry): string {
  return normalizeSearchText(
    [
      entry.titleDe,
      entry.titleEn,
      entry.summaryDe,
      entry.summaryEn,
      ...entry.aliases,
    ].join(" "),
  );
}

function scoreEntry(entry: QuickRuleEntry, tokens: string[], rawQuery: string): number {
  if (tokens.length === 0) return 0;

  const normalizedQuery = normalizeSearchText(rawQuery);
  const blob = entrySearchBlob(entry);
  const titleDe = normalizeSearchText(entry.titleDe);
  const titleEn = normalizeSearchText(entry.titleEn);
  const aliasSet = new Set(entry.aliases.map(normalizeSearchText));

  let score = 0;

  if (normalizedQuery.length >= 2) {
    if (titleDe === normalizedQuery || titleEn === normalizedQuery) score += 120;
    else if (aliasSet.has(normalizedQuery)) score += 110;
    else if (titleDe.includes(normalizedQuery) || titleEn.includes(normalizedQuery)) score += 70;
    else if (blob.includes(normalizedQuery)) score += 40;
  }

  for (const token of tokens) {
    if (aliasSet.has(token)) score += 35;
    if (titleDe.includes(token) || titleEn.includes(token)) score += 25;
    if (blob.includes(token)) score += 12;
  }

  return score;
}

export function searchQuickRules(
  query: string,
  entries: QuickRuleEntry[] = QUICK_RULEBOOK_ENTRIES,
): QuickRuleSearchResult[] {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) return [];

  const results: QuickRuleSearchResult[] = [];
  for (const entry of entries) {
    if (entry.rulesEdition !== "dnd-2024") continue;
    const score = scoreEntry(entry, tokens, query);
    if (score > 0) results.push({ ...entry, score });
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.titleDe.localeCompare(b.titleDe, "de");
  });

  return results;
}

export function getQuickRuleCategories(): QuickRuleEntry["category"][] {
  return [
    "combat",
    "action",
    "condition",
    "item",
    "class-feature",
    "feat",
    "spell",
    "environment",
    "general",
  ];
}
