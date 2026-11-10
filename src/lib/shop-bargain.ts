/**
 * Feilschen am Händler: SG aus Habgier, Kriminalität und gewünschtem Nachlass.
 */

export const BARGAIN_DISCOUNTS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50] as const;
export type BargainDiscount = (typeof BARGAIN_DISCOUNTS)[number];

/**
 * @param greedyAltruist Habgier↔Gutmensch (−5 … +5), negativ = habgierig
 * @param crimeMeter Kriminalität 0–100 (Viertel / Stadt)
 * @param discountPercent gewünschter Nachlass 5–50
 */
export function bargainDifficulty(
  greedyAltruist: number,
  crimeMeter: number,
  discountPercent: number,
): number {
  const greed = Math.max(-5, Math.min(5, Math.round(greedyAltruist)));
  const crime = Math.max(0, Math.min(100, Math.round(crimeMeter)));
  const discount = Math.max(5, Math.min(50, Math.round(discountPercent / 5) * 5));
  const greedBias = Math.max(0, -greed); // 0–5
  const crimeBias = Math.floor(crime / 20); // 0–5
  const discountSteps = discount / 5; // 1–10
  return Math.max(5, Math.min(30, 8 + greedBias * 2 + crimeBias + discountSteps));
}

/** Nach erfolgreichem Feilschen: reduzierter Kupferpreis. */
export function applyBargainDiscount(priceCp: number, discountPercent: number): number {
  const d = Math.max(0, Math.min(50, discountPercent)) / 100;
  return Math.max(1, Math.round(priceCp * (1 - d)));
}
