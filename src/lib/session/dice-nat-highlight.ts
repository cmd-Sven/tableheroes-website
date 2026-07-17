/** Natürliche 20 / 1 auf einem W20 — pro Würfel-Face, nicht Mod-Total. */
export type DieNatHighlight = "crit" | "fumble";

export const DICE_NAT_CRIT_LABEL_DE = "Heroischer Moment";
export const DICE_NAT_FUMBLE_LABEL_DE = "Ups, peinlich!";

/** Einzelwürfel: Face-Wert auf W20 → Crit (20) oder Patzer (1). */
export function dieNatHighlight(sides: number, face: number): DieNatHighlight | null {
  if (Math.round(sides) !== 20) return null;
  const f = Math.round(face);
  if (f === 20) return "crit";
  if (f === 1) return "fumble";
  return null;
}

/**
 * Screen-Mood für den gesamten Wurf.
 * Bei gemischtem VOR/NACH (z. B. 1 und 20 sichtbar): Crit hat Priorität vor Patzer.
 */
export function rollMoodFromFaces(faces: number[], sides: number): DieNatHighlight | null {
  if (Math.round(sides) !== 20 || faces.length === 0) return null;
  if (faces.some((f) => Math.round(f) === 20)) return "crit";
  if (faces.some((f) => Math.round(f) === 1)) return "fumble";
  return null;
}

export function natHighlightLabelDe(kind: DieNatHighlight): string {
  return kind === "crit" ? DICE_NAT_CRIT_LABEL_DE : DICE_NAT_FUMBLE_LABEL_DE;
}
