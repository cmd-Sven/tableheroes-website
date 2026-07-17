/** Dauer der 3D-/Fallback-Animation (ms). */
export const DICE_ANIMATION_DURATION_MS = 2200;

/** Nach dieser Zeit gilt ein Wurf für Late-Joiner als bereits aufgelöst. */
export const DICE_ANIMATION_STALE_MS = 5000;

export const DICE_ANIM_COMPLETE_EVENT = "th:dice-anim-complete";

export type DiceAnimCompleteDetail = {
  sourceId: string;
};

export type DiceRollAnimMeta = {
  animate?: boolean;
  faces?: number[];
  sides?: number;
  seed?: string;
  display?: string;
  formula?: string;
  total?: number;
  isCritical?: boolean;
  isFumble?: boolean;
  label?: string;
  weaponName?: string;
};

export function dispatchDiceAnimComplete(sourceId: string): void {
  if (typeof window === "undefined" || !sourceId) return;
  window.dispatchEvent(
    new CustomEvent(DICE_ANIM_COMPLETE_EVENT, {
      detail: { sourceId } satisfies DiceAnimCompleteDetail,
    }),
  );
}

export function isDiceAnimMeta(meta: unknown): meta is DiceRollAnimMeta {
  return Boolean(meta && typeof meta === "object" && !Array.isArray(meta));
}

export function shouldAnimateDiceEntry(
  entry: { id?: string | null; at?: string | null; meta?: unknown },
  now = Date.now(),
): boolean {
  if (!isDiceAnimMeta(entry.meta) || entry.meta.animate !== true) return false;
  const faces = entry.meta.faces;
  if (!Array.isArray(faces) || faces.length === 0) return false;
  const at = entry.at ? Date.parse(entry.at) : NaN;
  if (Number.isFinite(at) && now - at > DICE_ANIMATION_STALE_MS) return false;
  return true;
}

/** Chat: „würfelt…“ bis Animation durch / Eintrag veraltet. */
export function formatPendingDiceChatText(
  characterName: string,
  meta: DiceRollAnimMeta,
): string {
  const label =
    (typeof meta.label === "string" && meta.label.trim()) ||
    (typeof meta.weaponName === "string" && meta.weaponName.trim()) ||
    (typeof meta.formula === "string" && meta.formula.trim()) ||
    (typeof meta.sides === "number" ? `W${meta.sides}` : "Würfel");
  return `${characterName} würfelt ${label}…`;
}
