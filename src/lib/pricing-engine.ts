const LOCATION_REPUTATION_MODIFIERS: Record<number, number> = {
  [-6]: 50,
  [-5]: 40,
  [-4]: 30,
  [-3]: 20,
  [-2]: 10,
  [-1]: 5,
  0: 0,
  1: -5,
  2: -10,
  3: -20,
  4: -30,
  5: -35,
  6: -40,
};

function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function getLocationReputationModifier(locationReputation: number) {
  return LOCATION_REPUTATION_MODIFIERS[clampInt(locationReputation, -6, 6)] ?? 0;
}

function getNpcReputationModifier(npcReputation: number): number | null {
  const reputation = clampInt(npcReputation, -100, 100);

  if (reputation <= -90) return null;
  if (reputation <= -80) return 50;
  if (reputation <= -70) return 40;
  if (reputation <= -60) return 30;
  if (reputation <= -50) return 25;
  if (reputation <= -40) return 20;
  if (reputation <= -30) return 15;
  if (reputation <= -20) return 5;
  if (reputation <= -10) return 2;
  if (reputation <= 9) return 0;
  if (reputation <= 19) return -2;
  if (reputation <= 29) return -5;
  if (reputation <= 39) return -10;
  if (reputation <= 49) return -15;
  if (reputation <= 59) return -20;
  if (reputation <= 69) return -25;
  if (reputation <= 79) return -30;
  if (reputation <= 89) return -35;
  return -40;
}

export function calculateDynamicPrice(
  basePrice: number,
  shopModifierPercent: number,
  locationReputation: number,
  npcReputation: number,
): number | null {
  if (!Number.isFinite(basePrice) || basePrice < 0) return null;

  const npcModifier = getNpcReputationModifier(npcReputation);
  if (npcModifier == null) return null;

  const totalModifier =
    (Number.isFinite(shopModifierPercent) ? shopModifierPercent : 0) +
    getLocationReputationModifier(locationReputation) +
    npcModifier;

  return Math.max(0, Math.round(basePrice * (1 + totalModifier / 100)));
}
