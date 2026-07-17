import { DICE_PHYSICS_DURATION_MS } from "@/src/lib/session/dice-physics";

/** Dauer der 3D-/Fallback-Animation (ms). */
export const DICE_ANIMATION_DURATION_MS = DICE_PHYSICS_DURATION_MS;

/** Nach dieser Zeit gilt ein Wurf für Late-Joiner als bereits aufgelöst. */
export const DICE_ANIMATION_STALE_MS = 6200;

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
  usedRoll?: number;
  modifier?: number;
  isCritical?: boolean;
  isFumble?: boolean;
  label?: string;
  weaponName?: string;
  /** Initiator-Drop: Viewport-Norm 0…1 (Sync für alle Clients). */
  dropNx?: number;
  dropNy?: number;
};

export function dispatchDiceAnimComplete(sourceId: string): void {
  if (typeof window === "undefined" || !sourceId) return;
  // Listener (Reveal-Store) nie synchron im Render/setState-Pfad anderer Komponenten
  queueMicrotask(() => {
    window.dispatchEvent(
      new CustomEvent(DICE_ANIM_COMPLETE_EVENT, {
        detail: { sourceId } satisfies DiceAnimCompleteDetail,
      }),
    );
  });
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

/** Overlay nach Landung: Rohwürfel + Mods → Total. */
export function formatDiceResultLabel(meta: DiceRollAnimMeta): string {
  if (typeof meta.display === "string" && meta.display.trim()) {
    return meta.display.trim();
  }
  const used =
    typeof meta.usedRoll === "number"
      ? meta.usedRoll
      : Array.isArray(meta.faces)
        ? meta.faces.reduce((a, b) => a + (Number(b) || 0), 0)
        : 0;
  const mod = typeof meta.modifier === "number" ? meta.modifier : 0;
  const total = typeof meta.total === "number" ? meta.total : used + mod;
  if (mod === 0) return String(total);
  const modStr = mod > 0 ? ` + ${mod}` : ` − ${Math.abs(mod)}`;
  return `${used}${modStr} = ${total}`;
}
