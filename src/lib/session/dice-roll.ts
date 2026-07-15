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
  rolls: number[];
  usedRoll: number;
  total: number;
  isCritical: boolean;
  isFumble: boolean;
  formula: string;
  display: string;
};

const ROLL_RE =
  /^(?:\/roll\s+)?(?:(\d+)d(\d+)|w(\d+)|d(\d+))(?:\s*([+-]\s*\d+))?$/i;

export function parseRollCommand(input: string): ParsedRollCommand | null {
  const trimmed = input.trim();
  const m = trimmed.match(ROLL_RE);
  if (!m) return null;

  const dice = m[1] ? Math.max(1, parseInt(m[1], 10)) : 1;
  const sides = Math.max(2, parseInt(m[2] ?? m[3] ?? m[4] ?? "20", 10));
  const modRaw = (m[5] ?? "").replace(/\s/g, "");
  const modifier = modRaw ? parseInt(modRaw, 10) : 0;

  return { dice, sides, modifier: Number.isFinite(modifier) ? modifier : 0 };
}

export function rollOnce(sides: number): number {
  const s = Math.max(2, Math.round(sides));
  return Math.floor(Math.random() * s) + 1;
}

export function executeDiceRoll(
  parsed: ParsedRollCommand,
  mode: DiceRollMode = "normal",
): DiceRollOutcome {
  const { dice, sides, modifier } = parsed;
  const rolls: number[] = [];
  for (let i = 0; i < dice; i++) {
    rolls.push(rollOnce(sides));
  }

  let usedRoll = rolls[0] ?? 0;
  if (mode === "advantage" && dice === 1) {
    const second = rollOnce(sides);
    rolls.push(second);
    usedRoll = Math.max(rolls[0], second);
  } else if (mode === "disadvantage" && dice === 1) {
    const second = rollOnce(sides);
    rolls.push(second);
    usedRoll = Math.min(rolls[0], second);
  }

  const total = usedRoll + modifier;
  const isCritical = dice === 1 && sides === 20 && usedRoll === 20;
  const isFumble = dice === 1 && sides === 20 && usedRoll === 1;

  const modStr = modifier === 0 ? "" : modifier > 0 ? ` + ${modifier}` : ` − ${Math.abs(modifier)}`;
  const formula =
    mode === "advantage"
      ? `VOR w${sides}${modStr}`
      : mode === "disadvantage"
        ? `NACH w${sides}${modStr}`
        : dice > 1
          ? `${dice}d${sides}${modStr}`
          : `w${sides}${modStr}`;

  let display: string;
  if (mode === "advantage" || mode === "disadvantage") {
    const tag = mode === "advantage" ? "VOR" : "NACH";
    const parts = rolls.map((r) => `${r}${modifier >= 0 ? `+${modifier}` : modifier}`);
    display = `${tag}: [${parts.join(" / ")}] → ${total}`;
  } else if (dice > 1) {
    display = `[${rolls.join(" + ")}]${modStr} = ${total}`;
  } else {
    display = `${usedRoll}${modStr} = ${total}`;
  }

  return {
    mode,
    sides,
    modifier,
    rolls,
    usedRoll,
    total,
    isCritical,
    isFumble,
    formula,
    display,
  };
}
