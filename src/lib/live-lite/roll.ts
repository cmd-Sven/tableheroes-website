/**
 * Lokaler SL-Wurf für die Lite-Bühne.
 * Dieselbe Physik und dasselbe Wurf-Meta wie die Live-Session, ohne Session-Aktivität.
 */
import type { SessionActivityEntry } from "@/src/lib/actions/session-activity-actions";
import { requestDiceDropPlacement } from "@/src/lib/session/dice-placement-store";
import {
  createSeededRng,
  executeDicePool,
  type DicePoolGroup,
} from "@/src/lib/session/dice-roll";
import type { DiceSkinId } from "@/src/lib/session/dice-skins";

export async function rollLiteDice(input: {
  groups: DicePoolGroup[];
  skinId: DiceSkinId;
}): Promise<SessionActivityEntry | null> {
  const groups = input.groups.filter((group) => group.count > 0);
  if (groups.length === 0) return null;

  const count = groups.reduce((sum, group) => sum + group.count, 0);
  let drop;
  try {
    drop = await requestDiceDropPlacement({
      sides: groups[0]?.sides ?? 20,
      count,
    });
  } catch {
    return null;
  }

  const seed =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
  const outcome = executeDicePool(groups, 0, "normal", createSeededRng(seed), seed);
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `lite-roll-${seed}`;

  return {
    id,
    at: new Date().toISOString(),
    text: outcome.display,
    type: "dice_roll",
    author_name: "Spielleiter",
    meta: {
      ...outcome,
      animate: true,
      faces: outcome.faces,
      dieSides: outcome.dieSides,
      seed,
      modifier: outcome.modifier,
      usedRoll: outcome.usedRoll,
      total: outcome.total,
      display: outcome.display,
      formula: outcome.formula,
      dropNx: drop.dropNx,
      dropNy: drop.dropNy,
      throwDirX: drop.throwDirX,
      throwDirZ: drop.throwDirZ,
      throwStrength: drop.throwStrength,
      isTap: drop.isTap === true,
      diceSkin: input.skinId,
    },
  };
}
