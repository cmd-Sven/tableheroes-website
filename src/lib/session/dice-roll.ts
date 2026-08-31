export type DiceRollMode = "normal" | "advantage" | "disadvantage";

export type ParsedRollCommand = {
  dice: number;
  sides: number;
  modifier: number;
  label?: string;
};

export type DicePoolGroup = {
  count: number;
  sides: number;
};

export type DiceBubblePart = {
  sides: number;
  value: number;
};

export type DiceRollOutcome = {
  mode: DiceRollMode;
  sides: number;
  modifier: number;
  /** Alle geworfenen Augenzahlen (inkl. VOR/NACH-Zweitwurf). */
  rolls: number[];
  /** Faces die als 3D-Würfel sichtbar gerollt werden. */
  faces: number[];
  /** Seiten je 3D-Face (parallel zu faces). */
  dieSides: number[];
  /** Sprechblase: nur genutzte Würfel (VOR/NACH = Gewinner). */
  bubbleParts: DiceBubblePart[];
  /** Summe der genutzten Würfel (ohne Mod), bei VOR/NACH der gewählte Einzelwurf. */
  usedRoll: number;
  total: number;
  isCritical: boolean;
  isFumble: boolean;
  formula: string;
  display: string;
  seed?: string;
};

const ROLL_RE =
  /^(?:\/roll\s+)?(?:(\d+)d(\d+)|w(\d+)|d(\d+))(?:\s*([+-]\s*\d+))?$/i;

/** Kompakte Mali/Boni-Eingabe: „+2“, „-1“, „+2-1“ → Summe. */
export function parseBonusMalus(input: string): number {
  const trimmed = input.trim();
  if (!trimmed) return 0;
  const parts = trimmed.match(/[+-]?\d+/g);
  if (!parts?.length) return 0;
  return parts.reduce((sum, part) => {
    const n = parseInt(part, 10);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
}

export function parseRollCommand(input: string): ParsedRollCommand | null {
  const trimmed = input.trim();
  const m = trimmed.match(ROLL_RE);
  if (m) {
    const dice = m[1] ? Math.max(1, parseInt(m[1], 10)) : 1;
    const sides = Math.max(2, parseInt(m[2] ?? m[3] ?? m[4] ?? "20", 10));
    const modRaw = (m[5] ?? "").replace(/\s+/g, "");
    const modifier = modRaw ? parseInt(modRaw, 10) : 0;
    return { dice, sides, modifier: Number.isFinite(modifier) ? modifier : 0 };
  }

  // Schaden: „2d6+3“ / „1d8Feuer+3“ (nach Whitespace-Strip) / „1d8 − 1“
  const damageM = trimmed.match(/(\d+)d(\d+)(?:[^\d+-]*([+-])\s*(\d+))?/i);
  if (damageM) {
    const dice = Math.max(1, parseInt(damageM[1], 10));
    const sides = Math.max(2, parseInt(damageM[2], 10));
    const sign = damageM[3] === "-" ? -1 : 1;
    const mod = damageM[4] ? sign * parseInt(damageM[4], 10) : 0;
    return { dice, sides, modifier: mod };
  }

  return null;
}

/** Mulberry32 — deterministisch aus Seed-String. */
export function createSeededRng(seed: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let t = h >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function rollOnce(sides: number, rng: () => number = Math.random): number {
  const s = Math.max(2, Math.round(sides));
  return Math.floor(rng() * s) + 1;
}

function formatModPart(modifier: number): string {
  if (modifier === 0) return "";
  return modifier > 0 ? ` + ${modifier}` : ` − ${Math.abs(modifier)}`;
}

/** Chat-/Overlay-Breakdown: „14 + 3 = 17“ bzw. „[4 + 6] + 2 = 12“. */
export function formatDiceBreakdown(
  rolls: number[],
  usedRoll: number,
  modifier: number,
  opts?: { mode?: DiceRollMode; dice?: number },
): string {
  const modStr = formatModPart(modifier);
  const mode = opts?.mode ?? "normal";
  const dice = opts?.dice ?? rolls.length;

  if (mode === "advantage" || mode === "disadvantage") {
    const tag = mode === "advantage" ? "VOR" : "NACH";
    const parts = rolls.map((r) => String(r));
    const pick = `${usedRoll}${modStr} = ${usedRoll + modifier}`;
    return `${tag}: [${parts.join(" / ")}] → ${pick}`;
  }

  if (dice > 1 || rolls.length > 1) {
    const sum = rolls.reduce((a, b) => a + b, 0);
    if (modifier === 0) return `[${rolls.join(" + ")}] = ${sum}`;
    return `[${rolls.join(" + ")}]${modStr} = ${sum + modifier}`;
  }

  if (modifier === 0) return `${usedRoll}`;
  return `${usedRoll}${modStr} = ${usedRoll + modifier}`;
}

export function normalizeDicePool(groups: DicePoolGroup[]): DicePoolGroup[] {
  const bySides = new Map<number, number>();
  for (const g of groups) {
    const sides = Math.max(2, Math.min(100, Math.round(g.sides)));
    const count = Math.max(0, Math.min(12, Math.round(g.count)));
    if (count <= 0) continue;
    bySides.set(sides, (bySides.get(sides) ?? 0) + count);
  }
  const out: DicePoolGroup[] = [];
  let remaining = 12;
  for (const [sides, count] of bySides) {
    if (remaining <= 0) break;
    const n = Math.min(count, remaining);
    out.push({ sides, count: n });
    remaining -= n;
  }
  return out;
}

export function dicePoolSize(groups: DicePoolGroup[]): number {
  return groups.reduce((sum, g) => sum + g.count, 0);
}

export function formatDicePoolFormula(groups: DicePoolGroup[], modifier = 0): string {
  const core = groups.map((g) => `${g.count}w${g.sides}`).join(" + ");
  return `${core}${formatModPart(modifier)}`;
}

export function executeDicePool(
  groups: DicePoolGroup[],
  modifier: number,
  mode: DiceRollMode = "normal",
  rng: () => number = Math.random,
  seed?: string,
): DiceRollOutcome {
  const pool = normalizeDicePool(groups);
  if (pool.length === 0) {
    pool.push({ count: 1, sides: 20 });
  }

  const rolls: number[] = [];
  const faces: number[] = [];
  const dieSides: number[] = [];
  const bubbleParts: DiceBubblePart[] = [];
  const chatChunks: string[] = [];
  let usedRoll = 0;

  const applyAdv = mode === "advantage" || mode === "disadvantage";

  for (const group of pool) {
    const groupRolls: number[] = [];
    for (let i = 0; i < group.count; i++) {
      groupRolls.push(rollOnce(group.sides, rng));
    }

    const isAdvPair = applyAdv && group.sides === 20 && group.count === 1;
    if (isAdvPair) {
      const second = rollOnce(group.sides, rng);
      const first = groupRolls[0]!;
      const winner =
        mode === "advantage" ? Math.max(first, second) : Math.min(first, second);
      rolls.push(first, second);
      faces.push(first, second);
      dieSides.push(20, 20);
      bubbleParts.push({ sides: 20, value: winner });
      usedRoll += winner;
      const tag = mode === "advantage" ? "VOR" : "NACH";
      chatChunks.push(`${tag}: [${first} / ${second}] → ${winner}`);
    } else {
      const sum = groupRolls.reduce((a, b) => a + b, 0);
      rolls.push(...groupRolls);
      faces.push(...groupRolls);
      for (const value of groupRolls) {
        dieSides.push(group.sides);
        bubbleParts.push({ sides: group.sides, value });
      }
      usedRoll += sum;
      chatChunks.push(
        group.count > 1 ? `[${groupRolls.join(" + ")}]` : String(groupRolls[0]),
      );
    }
  }

  const total = usedRoll + modifier;
  const onlySingleD20 = pool.length === 1 && pool[0]!.sides === 20 && pool[0]!.count === 1;
  const isCritical = onlySingleD20 && usedRoll === 20;
  const isFumble = onlySingleD20 && usedRoll === 1;
  const primarySides = pool[0]!.sides;
  const formula = formatDicePoolFormula(pool, modifier);
  const modStr = formatModPart(modifier);
  const display =
    chatChunks.length === 1 && !applyAdv
      ? formatDiceBreakdown(rolls, usedRoll, modifier, {
          mode,
          dice: pool[0]!.count,
        })
      : `${chatChunks.join(" + ")}${modStr} = ${total}`;

  return {
    mode,
    sides: primarySides,
    modifier,
    rolls,
    faces,
    dieSides,
    bubbleParts,
    usedRoll,
    total,
    isCritical,
    isFumble,
    formula,
    display,
    seed,
  };
}

export function executeDiceRoll(
  parsed: ParsedRollCommand,
  mode: DiceRollMode = "normal",
  rng: () => number = Math.random,
  seed?: string,
): DiceRollOutcome {
  return executeDicePool(
    [{ count: parsed.dice, sides: parsed.sides }],
    parsed.modifier,
    mode,
    rng,
    seed,
  );
}

/** Unterstützte 3D-Polyeder (D&D-Standard). */
export const SUPPORTED_3D_SIDES = new Set([4, 6, 8, 10, 12, 20]);

export function supports3dDice(sides: number): boolean {
  return SUPPORTED_3D_SIDES.has(Math.round(sides));
}
