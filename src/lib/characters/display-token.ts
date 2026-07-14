import {
  type CharacterConditionKey,
  type ConditionTokenEntry,
  type ConditionTokensMap,
  parseActiveConditions,
} from "@/src/lib/characters/condition-tokens";
import {
  type MoodStateKey,
  type MoodTokenEntry,
  type MoodTokensMap,
  normalizeMoodState,
} from "@/src/lib/characters/mood-states";

export type DisplayTokenSource = "gm_condition" | "mood" | "base";

export type ResolvedDisplayToken = {
  source: DisplayTokenSource;
  key: string | null;
  url: string;
  entry?: ConditionTokenEntry | MoodTokenEntry;
};

export function getPrimaryGmCondition(raw: unknown): CharacterConditionKey | null {
  const active = parseActiveConditions(raw);
  return active[0] ?? null;
}

export function getActiveMood(raw: unknown): MoodStateKey | null {
  return normalizeMoodState(raw);
}

/**
 * GM-Zustand hat Vorrang vor Spieler-Gemütszustand.
 * Erster aktiver GM-Zustand bestimmt das Anzeige-Token.
 */
export function resolveCharacterDisplayToken(input: {
  baseTokenUrl: string | null | undefined;
  avatarUrl?: string | null;
  activeConditions: unknown;
  conditionTokens: ConditionTokensMap;
  moodState: unknown;
  moodTokens: MoodTokensMap;
}): ResolvedDisplayToken {
  const base = (input.baseTokenUrl || input.avatarUrl || "").trim();
  const active = parseActiveConditions(input.activeConditions);

  if (active.length > 0) {
    const primary = active[0];
    const entry = input.conditionTokens[primary];
    if (entry?.url?.trim()) {
      return {
        source: "gm_condition",
        key: primary,
        url: entry.url.trim(),
        entry,
      };
    }
  }

  const mood = normalizeMoodState(input.moodState);
  if (mood) {
    const entry = input.moodTokens[mood];
    if (entry?.url?.trim()) {
      return {
        source: "mood",
        key: mood,
        url: entry.url.trim(),
        entry,
      };
    }
  }

  return {
    source: "base",
    key: mood ?? (active[0] ?? null),
    url: base,
  };
}
