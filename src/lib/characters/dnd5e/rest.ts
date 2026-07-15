import type { AbilityKey, Dnd5eClassResource, Dnd5eSheetData } from "./types";

export type ParsedHitDice = {
  total: number;
  dieSides: number;
  label: string;
};

export function parseHitDiceString(hitDice: string): ParsedHitDice | null {
  const m = String(hitDice ?? "").trim().match(/^(\d+)\s*d\s*(\d+)$/i);
  if (!m) return null;
  const total = Math.max(0, parseInt(m[1], 10));
  const dieSides = Math.max(4, parseInt(m[2], 10));
  return { total, dieSides, label: `${total}d${dieSides}` };
}

export function getHitDiceRemaining(sheet: Dnd5eSheetData): number {
  const parsed = parseHitDiceString(sheet.combat.hitDice);
  if (!parsed) return 0;
  const stored = sheet.combat.hitDiceRemaining;
  if (stored == null || !Number.isFinite(stored)) return parsed.total;
  return Math.max(0, Math.min(parsed.total, Math.round(stored)));
}

export function abilityModifier(score: number): number {
  return Math.floor((Math.max(1, score) - 10) / 2);
}

export function rollDie(sides: number): number {
  const s = Math.max(4, Math.round(sides));
  return Math.floor(Math.random() * s) + 1;
}

export function rollHitDiceRecovery(
  count: number,
  dieSides: number,
  conScore: number,
): { rolls: number[]; total: number } {
  const rolls: number[] = [];
  const mod = abilityModifier(conScore);
  for (let i = 0; i < count; i++) {
    rolls.push(Math.max(1, rollDie(dieSides) + mod));
  }
  return { rolls, total: rolls.reduce((a, b) => a + b, 0) };
}

function resetSpellSlots(sheet: Dnd5eSheetData): Dnd5eSheetData {
  if (!sheet.spellcasting?.slots) return sheet;
  const slots = { ...sheet.spellcasting.slots };
  for (const key of Object.keys(slots)) {
    slots[key] = { ...slots[key], used: 0 };
  }
  return {
    ...sheet,
    spellcasting: { ...sheet.spellcasting, slots },
  };
}

function resetClassResources(
  resources: Dnd5eClassResource[],
  restType: "short" | "long",
): Dnd5eClassResource[] {
  return resources.map((r) => {
    const recovers =
      restType === "long" || (restType === "short" && r.shortRest);
    return recovers ? { ...r, current: r.max } : r;
  });
}

/** Standard-Ressourcen anhand Klassennamen (heuristisch). */
export function defaultClassResources(className: string): Dnd5eClassResource[] {
  const c = className.toLowerCase();
  const mk = (
    id: string,
    label: string,
    max: number,
    shortRest = false,
  ): Dnd5eClassResource => ({
    id,
    label,
    max,
    current: max,
    shortRest,
  });

  if (c.includes("mönch") || c.includes("monk")) {
    return [mk("ki", "Ki-Punkte", 4, false)];
  }
  if (c.includes("barbar") || c.includes("barbarian")) {
    return [mk("rage", "Raserei", 2, false)];
  }
  if (c.includes("kämpfer") || c.includes("fighter")) {
    return [
      mk("secondWind", "Second Wind", 1, true),
      mk("actionSurge", "Action Surge", 1, false),
    ];
  }
  if (c.includes("kleriker") || c.includes("cleric")) {
    return [mk("channelDivinity", "Channel Divinity", 1, false)];
  }
  if (c.includes("paladin")) {
    return [mk("channelDivinity", "Channel Divinity", 1, false)];
  }
  if (c.includes("barde") || c.includes("bard")) {
    return [mk("bardicInspiration", "Bardische Inspiration", 3, true)];
  }
  if (c.includes("hexer") || c.includes("warlock")) {
    return [mk("pactSlots", "Paktzauber-Slots", 2, true)];
  }
  if (c.includes("zauberer") || c.includes("sorcerer")) {
    return [mk("sorceryPoints", "Zauberpunkte", 2, false)];
  }
  if (c.includes("druide") || c.includes("druid")) {
    return [mk("wildShape", "Wild Shape", 2, false)];
  }
  return [];
}

export function ensureClassResources(
  sheet: Dnd5eSheetData,
  className: string,
): Dnd5eSheetData {
  if (sheet.classResources && sheet.classResources.length > 0) return sheet;
  const defaults = defaultClassResources(className);
  if (defaults.length === 0) return sheet;
  return { ...sheet, classResources: defaults };
}

export type ShortRestResult = {
  sheet: Dnd5eSheetData;
  hpRecovered: number;
  hitDiceSpent: number;
  rolls: number[];
};

export function applyShortRest(
  sheet: Dnd5eSheetData,
  className: string,
  conScore: number,
  hitDiceToSpend = 0,
  manualRollTotal?: number,
): ShortRestResult {
  let next = ensureClassResources(sheet, className);
  next = resetSpellSlots(next);
  if (next.classResources?.length) {
    next = {
      ...next,
      classResources: resetClassResources(next.classResources, "short"),
    };
  }

  const parsed = parseHitDiceString(next.combat.hitDice);
  const remaining = getHitDiceRemaining(next);
  const spend = Math.max(0, Math.min(hitDiceToSpend, remaining));

  let hpRecovered = 0;
  let rolls: number[] = [];
  if (spend > 0 && parsed) {
    if (manualRollTotal != null && Number.isFinite(manualRollTotal)) {
      hpRecovered = Math.max(0, Math.round(manualRollTotal));
    } else {
      const rolled = rollHitDiceRecovery(spend, parsed.dieSides, conScore);
      rolls = rolled.rolls;
      hpRecovered = rolled.total;
    }
    const newRemaining = remaining - spend;
    const hpMax = next.combat.hpMax;
    const hpCurrent = Math.min(hpMax, next.combat.hpCurrent + hpRecovered);
    next = {
      ...next,
      combat: {
        ...next.combat,
        hpCurrent,
        hitDiceRemaining: newRemaining,
      },
    };
  }

  return { sheet: next, hpRecovered, hitDiceSpent: spend, rolls };
}

export function applyLongRest(
  sheet: Dnd5eSheetData,
  className: string,
): Dnd5eSheetData {
  let next = ensureClassResources(sheet, className);
  next = resetSpellSlots(next);

  const parsed = parseHitDiceString(next.combat.hitDice);
  const total = parsed?.total ?? 0;
  const remaining = getHitDiceRemaining(next);
  const recovered = Math.max(1, Math.floor(total / 2));
  const newRemaining = Math.min(total, remaining + recovered);

  if (next.classResources?.length) {
    next = {
      ...next,
      classResources: resetClassResources(next.classResources, "long"),
    };
  }

  return {
    ...next,
    combat: {
      ...next.combat,
      hpCurrent: next.combat.hpMax,
      hpTemp: 0,
      hitDiceRemaining: newRemaining,
      deathSaveSuccesses: 0,
      deathSaveFailures: 0,
    },
  };
}

export function updateClassResource(
  sheet: Dnd5eSheetData,
  id: string,
  current: number,
): Dnd5eSheetData {
  if (!sheet.classResources) return sheet;
  return {
    ...sheet,
    classResources: sheet.classResources.map((r) =>
      r.id === id ? { ...r, current: Math.max(0, Math.min(r.max, current)) } : r,
    ),
  };
}

export function conScoreFromSheet(sheet: Dnd5eSheetData): number {
  return sheet.abilities.con?.score ?? 10;
}
