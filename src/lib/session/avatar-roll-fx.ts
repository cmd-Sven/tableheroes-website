import type { MoodStateKey } from "@/src/lib/characters/mood-states";

export const AVATAR_ROLL_FX_EVENT = "th:avatar-roll-fx";

export const AVATAR_ROLL_FX_DURATION_MS = 3000;

/** Crit → temporärer Display-Override auf diesen Gemütszustand. */
export const AVATAR_ROLL_FX_CRIT_MOOD = "heroischer-moment" as const satisfies MoodStateKey;

/** Patzer → temporärer Display-Override auf diesen Gemütszustand. */
export const AVATAR_ROLL_FX_FUMBLE_MOOD = "ups-peinlich" as const satisfies MoodStateKey;

export type AvatarRollFxKind = "crit" | "fumble";

export type AvatarRollFxDetail = {
  characterId: string;
  kind: AvatarRollFxKind;
  /** Optional: Activity-Log-ID zur Deduplizierung (lokal + remote). */
  sourceId?: string;
  durationMs?: number;
};

export function moodKeyForRollFx(kind: AvatarRollFxKind): MoodStateKey {
  return kind === "crit" ? AVATAR_ROLL_FX_CRIT_MOOD : AVATAR_ROLL_FX_FUMBLE_MOOD;
}

export function dispatchAvatarRollFx(detail: AvatarRollFxDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AVATAR_ROLL_FX_EVENT, { detail }));
}

/** Liest Crit/Fumble aus Dice-/Angriffs-Meta (executeDiceRoll Outcome). */
export function rollFxKindFromMeta(meta: unknown): AvatarRollFxKind | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const row = meta as Record<string, unknown>;
  if (row.isCritical === true) return "crit";
  if (row.isFumble === true) return "fumble";
  return null;
}
