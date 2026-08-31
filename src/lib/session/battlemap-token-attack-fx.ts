export const BATTLEMAP_TOKEN_ATTACK_FX_EVENT = "th:battlemap-token-attack-fx";

/** Einmal-Schwung neben dem Token (ca. 1 s). */
export const BATTLEMAP_TOKEN_ATTACK_FX_DURATION_MS = 1100;

export type BattlemapTokenAttackFxDetail = {
  characterId: string;
  critical?: boolean;
  /** Activity-Log-ID zur Deduplizierung (lokal + remote). */
  sourceId?: string;
  durationMs?: number;
};

export function dispatchBattlemapTokenAttackFx(
  detail: BattlemapTokenAttackFxDetail,
): void {
  if (typeof window === "undefined") return;
  const characterId = detail.characterId?.trim();
  if (!characterId) return;
  window.dispatchEvent(
    new CustomEvent(BATTLEMAP_TOKEN_ATTACK_FX_EVENT, { detail }),
  );
}
