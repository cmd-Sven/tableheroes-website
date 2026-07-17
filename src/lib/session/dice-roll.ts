export type DiceRollMode = "normal" | "advantage" | "disadvantage";

export type ParsedRollCommand = {
  dice: number;
  sides: number;
  modifier: number;
  label?: string;
};

export type DiceRollOutcome = {
  mode: DiceRollMode;
  sides: number;
  modifier: number;
  /** Alle geworfenen Augenzahlen (inkl. VOR/NACH-Zweitwurf). */
  rolls: number[];
  /** Faces die als 3D-Würfel sichtbar gerollt werden. */
  faces: number[];
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

export function executeDiceRoll(
  parsed: ParsedRollCommand,
  mode: DiceRollMode = "normal",
  rng: () => number = Math.random,
  seed?: string,
): DiceRollOutcome {
  const { dice, sides, modifier } = parsed;
  const rolls: number[] = [];
  for (let i = 0; i < dice; i++) {
    rolls.push(rollOnce(sides, rng));
  }

  let usedRoll: number;
  let faces: number[];

  if (mode === "advantage" && dice === 1) {
    const second = rollOnce(sides, rng);
    rolls.push(second);
    usedRoll = Math.max(rolls[0]!, second);
    faces = [...rolls];
  } else if (mode === "disadvantage" && dice === 1) {
    const second = rollOnce(sides, rng);
    rolls.push(second);
    usedRoll = Math.min(rolls[0]!, second);
    faces = [...rolls];
  } else if (dice > 1) {
    usedRoll = rolls.reduce((a, b) => a + b, 0);
    faces = [...rolls];
  } else {
    usedRoll = rolls[0] ?? 0;
    faces = [...rolls];
  }

  const total = usedRoll + modifier;
  const isCritical = dice === 1 && sides === 20 && usedRoll === 20;
  const isFumble = dice === 1 && sides === 20 && usedRoll === 1;

  const modStr = formatModPart(modifier);
  const formula =
    mode === "advantage"
      ? `VOR w${sides}${modStr}`
      : mode === "disadvantage"
        ? `NACH w${sides}${modStr}`
        : dice > 1
          ? `${dice}d${sides}${modStr}`
          : `w${sides}${modStr}`;

  const display = formatDiceBreakdown(rolls, usedRoll, modifier, { mode, dice });

  return {
    mode,
    sides,
    modifier,
    rolls,
    faces,
    usedRoll,
    total,
    isCritical,
    isFumble,
    formula,
    display,
    seed,
  };
}

/** Unterstützte 3D-Polyeder (D&D-Standard). */
export const SUPPORTED_3D_SIDES = new Set([4, 6, 8, 10, 12, 20]);

export function supports3dDice(sides: number): boolean {
  return SUPPORTED_3D_SIDES.has(Math.round(sides));
}
