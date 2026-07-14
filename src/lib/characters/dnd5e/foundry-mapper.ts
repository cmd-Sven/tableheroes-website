import { randomUUID } from "crypto";
import type {
  AbilityKey,
  Dnd5eFeatureEntry,
  Dnd5eSheetData,
  Dnd5eSkillEntry,
  Dnd5eSkillKey,
  SkillProficiency,
} from "./types";
import { mergeSheetWithDefaults } from "./defaults";
import { DND5E_SKILLS } from "./skills";
import { abilityModifier } from "./formulas";
import { mapFoundryItemsToEquipment } from "./foundry-equipment-mapper";
import { normalizeEquipmentState } from "./equipment";
import { sanitizeActorDisplayLabel } from "@/src/lib/foundry-sync/actor-display-labels";

type FoundryAbilityBlock = {
  value?: number;
  proficient?: number | boolean;
};

type FoundrySkillBlock = {
  value?: number;
  ability?: string;
  bonuses?: { check?: string; passive?: string };
  proficient?: number;
  total?: number;
};

type FoundryItemRow = {
  _id?: string;
  id?: string;
  name?: string;
  type?: string;
  system?: {
    levels?: number;
    hd?: { denomination?: number; faces?: number };
    description?: { value?: string };
  };
};

type FoundryActorSystem = {
  abilities?: Partial<Record<AbilityKey, FoundryAbilityBlock>>;
  attributes?: {
    ac?: { flat?: number; calc?: string; value?: number };
    hp?: { value?: number; max?: number; temp?: number; tempmax?: number };
    init?: { bonus?: string | number; value?: number; total?: number };
    speed?: { walk?: number | string; value?: number };
    death?: { success?: number; failure?: number; failures?: number };
  };
  details?: {
    race?: string | { value?: string; name?: string };
    background?: string | { value?: string; name?: string };
    alignment?: string;
    level?: number | { value?: number };
    xp?: { value?: number } | number;
    class?: string | { name?: string; value?: string };
    originalClass?: string;
    /** Vom Foundry-Modul angereichert */
    raceResolved?: string;
    backgroundResolved?: string;
    classResolved?: string;
    totalLevels?: number;
  };
  skills?: Partial<Record<Dnd5eSkillKey, FoundrySkillBlock>>;
  traits?: {
    armorProf?: { value?: string[] };
    weaponProf?: { value?: string[] };
    toolProf?: { value?: string[] };
    languages?: { value?: string[] };
  };
  spells?: {
    level?: number;
    ability?: string;
    dc?: number;
    attack?: number;
  };
  currency?: Record<string, number>;
};

function readStringField(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "object" && value !== null) {
    const obj = value as { value?: unknown; name?: unknown };
    if (typeof obj.name === "string" && obj.name.trim()) return obj.name.trim();
    if (typeof obj.value === "string" && obj.value.trim()) return obj.value.trim();
  }
  return null;
}

/** Foundry-Item-IDs werden in sanitizeActorDisplayLabel gefiltert. */
function sanitizeDisplayLabel(value: string | null | undefined): string | null {
  return sanitizeActorDisplayLabel(value);
}

function findFirstItemByTypes(items: unknown[], types: string[]): FoundryItemRow | null {
  for (const type of types) {
    const found = findFirstItemByType(items, type);
    if (found) return found;
  }
  return null;
}

function findFirstItemByType(items: unknown[], type: string): FoundryItemRow | null {
  if (!Array.isArray(items)) return null;
  const wanted = type.toLowerCase();
  return (
    (items as FoundryItemRow[]).find(
      (row) => String(row.type ?? "").toLowerCase() === wanted,
    ) ?? null
  );
}

function findAllItemsByType(items: unknown[], type: string): FoundryItemRow[] {
  if (!Array.isArray(items)) return [];
  const wanted = type.toLowerCase();
  return (items as FoundryItemRow[]).filter(
    (row) => String(row.type ?? "").toLowerCase() === wanted,
  );
}

function readNumber(value: unknown, fallback = 0): number {
  if (value == null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function readPositiveNumber(value: unknown, fallback = 0): number {
  const n = readNumber(value, fallback);
  return n > 0 ? n : fallback;
}

function parseFormulaNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = String(value).trim();
  if (!raw) return null;
  const direct = Number(raw);
  if (Number.isFinite(direct)) return direct;
  const match = raw.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

function itemsById(items: unknown[]): Map<string, FoundryItemRow> {
  const map = new Map<string, FoundryItemRow>();
  if (!Array.isArray(items)) return map;
  for (const raw of items) {
    const row = raw as FoundryItemRow;
    const id = String(row._id ?? row.id ?? "").trim();
    if (id) map.set(id, row);
  }
  return map;
}

function resolveItemLabel(
  items: unknown[],
  ref: unknown,
): string | null {
  const direct = readStringField(ref);
  if (!direct) return null;

  const byId = itemsById(items);
  const item = byId.get(direct);
  if (item?.name) return sanitizeDisplayLabel(String(item.name).trim());

  return sanitizeDisplayLabel(direct);
}

function resolveRaceName(items: unknown[], details: FoundryActorSystem["details"]): string | null {
  const raceItem = findFirstItemByTypes(items, ["race", "species", "ancestry"]);
  const detailsRace = (details as { species?: unknown } | undefined)?.species ?? details?.race;
  return (
    sanitizeDisplayLabel(details?.raceResolved) ??
    sanitizeDisplayLabel(raceItem?.name ? String(raceItem.name) : null) ??
    resolveItemLabel(items, detailsRace)
  );
}

function resolveBackgroundName(
  items: unknown[],
  details: FoundryActorSystem["details"],
): string | null {
  const backgroundItem = findFirstItemByType(items, "background");
  return (
    sanitizeDisplayLabel(details?.backgroundResolved) ??
    sanitizeDisplayLabel(backgroundItem?.name ? String(backgroundItem.name) : null) ??
    resolveItemLabel(items, details?.background)
  );
}

function resolveClassInfo(items: unknown[], originalClassId: string | null) {
  if (!Array.isArray(items)) {
    return { className: null as string | null, subclass: null as string | null, level: 0, hitDie: 8 };
  }

  const classes = items.filter((raw) => String((raw as FoundryItemRow).type ?? "").toLowerCase() === "class") as FoundryItemRow[];
  const subclasses = items.filter((raw) => String((raw as FoundryItemRow).type ?? "").toLowerCase() === "subclass") as FoundryItemRow[];

  let primary: FoundryItemRow | null = null;
  if (originalClassId) {
    primary = classes.find((c) => String(c._id ?? c.id) === originalClassId) ?? null;
  }
  if (!primary && classes.length > 0) {
    primary = [...classes].sort(
      (a, b) => readNumber(b.system?.levels, 0) - readNumber(a.system?.levels, 0),
    )[0];
  }

  const level = classes.reduce((sum, row) => sum + Math.max(0, Math.floor(readNumber(row.system?.levels, 0))), 0);
  const hitDie =
    readPositiveNumber(primary?.system?.hd?.denomination, 0) ||
    readPositiveNumber(primary?.system?.hd?.faces, 0) ||
    8;

  const subclass =
    subclasses.length > 0 ? String(subclasses[0].name ?? "").trim() || null : null;

  return {
    className: primary?.name ? sanitizeDisplayLabel(String(primary.name).trim()) : null,
    subclass: subclass ? sanitizeDisplayLabel(subclass) : null,
    level,
    hitDie,
  };
}

function mapFoundrySkillProficiency(raw: FoundrySkillBlock | undefined): Dnd5eSkillEntry {
  if (!raw) return { proficient: "none" };

  const explicit = raw.proficient;
  if (explicit != null) {
    if (typeof explicit === "boolean") {
      return { proficient: explicit ? "proficient" : "none" };
    }
    const n = Number(explicit);
    if (Number.isFinite(n)) {
      if (n >= 2) return { proficient: "expertise" };
      if (n >= 1) return { proficient: "proficient" };
      if (n >= 0.5) return { proficient: "half" };
      return { proficient: "none" };
    }
  }

  // In Foundry dnd5e 5.x ist `value` oft der Attributsmodifikator (+2 bei CHA 15),
  // nicht der Übungsgrad — nur exakte Stufen 0 / 0.5 / 1 / 2 auswerten.
  const value = raw.value;
  if (value != null && Number.isFinite(Number(value))) {
    const n = Number(value);
    if (n === 2) return { proficient: "expertise" };
    if (n === 1) return { proficient: "proficient" };
    if (n === 0.5) return { proficient: "half" };
    if (n === 0) return { proficient: "none" };
    if (n > 2) {
      return { proficient: "none", bonusOverride: Math.round(n) };
    }
  }

  return { proficient: "none" };
}

function mapFoundrySavingThrows(
  abilities: Partial<Record<AbilityKey, FoundryAbilityBlock>>,
): Dnd5eSheetData["savingThrows"] {
  const saves = {} as Dnd5eSheetData["savingThrows"];
  for (const key of ["str", "dex", "con", "int", "wis", "cha"] as AbilityKey[]) {
    const block = abilities[key];
    saves[key] = {
      proficient: Boolean(block?.proficient) || Number(block?.proficient) > 0,
    };
  }
  return saves;
}

function mapFoundrySkills(
  skills: Partial<Record<Dnd5eSkillKey, FoundrySkillBlock>> | undefined,
): Dnd5eSheetData["skills"] {
  const mapped = {} as Dnd5eSheetData["skills"];
  for (const def of DND5E_SKILLS) {
    mapped[def.key] = mapFoundrySkillProficiency(skills?.[def.key]);
  }
  return mapped;
}

function mapFoundryFeats(items: unknown): Dnd5eFeatureEntry[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((raw) => String((raw as FoundryItemRow).type ?? "").toLowerCase() === "feat")
    .map((item) => {
      const row = item as FoundryItemRow & {
        system?: { description?: { value?: string } };
      };
      const name = String(row.name ?? "").trim();
      if (!name) return null;
      const descHtml = row.system?.description?.value;
      const description =
        typeof descHtml === "string"
          ? descHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
          : null;
      return {
        id: String(row._id ?? row.id ?? randomUUID()),
        name,
        description: description || null,
        source: "foundry",
      } satisfies Dnd5eFeatureEntry;
    })
    .filter(Boolean) as Dnd5eFeatureEntry[];
}

function resolveArmorClass(
  attrs: FoundryActorSystem["attributes"],
  dexMod: number,
): number {
  const value = readNumber(attrs?.ac?.value, 0);
  if (value > 0) return Math.round(value);

  const flat = readNumber(attrs?.ac?.flat, 0);
  if (flat > 0) return Math.round(flat);

  return 10 + dexMod;
}

function resolveHpMax(
  attrs: FoundryActorSystem["attributes"],
  level: number,
  conMod: number,
  hitDie: number,
): number {
  const max = readNumber(attrs?.hp?.max, 0);
  if (max > 0) return Math.round(max);

  const value = readNumber(attrs?.hp?.value, 0);
  if (value > 0) return Math.round(value);

  if (level > 0) {
    const avgPerLevel = Math.floor(hitDie / 2) + 1;
    return Math.max(1, hitDie + conMod + (level - 1) * (avgPerLevel + conMod));
  }

  return 1;
}

function resolveInitiativeBonus(
  attrs: FoundryActorSystem["attributes"],
  dexMod: number,
): number {
  const total = parseFormulaNumber(attrs?.init?.total);
  if (total != null) return Math.round(total - dexMod);

  const bonus = parseFormulaNumber(attrs?.init?.bonus);
  if (bonus != null) return Math.round(bonus);

  const value = parseFormulaNumber(attrs?.init?.value);
  if (value != null) return Math.round(value - dexMod);

  return 0;
}

export type FoundrySheetImportMeta = {
  className: string | null;
  subclass: string | null;
  race: string | null;
  background: string | null;
  alignment: string | null;
  level: number;
  experiencePoints: number;
};

export function mapFoundryActorToDnd5eSheet(input: {
  actorName?: string | null;
  actorSystem: FoundryActorSystem;
  actorItems?: unknown[];
}): { sheet: Dnd5eSheetData; meta: FoundrySheetImportMeta; equipmentImport: ReturnType<typeof mapFoundryItemsToEquipment> } {
  const equipmentImport = mapFoundryItemsToEquipment(input.actorItems);
  const sys = input.actorSystem ?? {};
  const items = input.actorItems ?? [];
  const abilities = sys.abilities ?? {};
  const attrs = sys.attributes ?? {};
  const details = sys.details ?? {};

  const abilitiesMapped = {} as Dnd5eSheetData["abilities"];
  for (const key of ["str", "dex", "con", "int", "wis", "cha"] as AbilityKey[]) {
    abilitiesMapped[key] = {
      score: readNumber(abilities[key]?.value, 10),
    };
  }

  const dexMod = abilityModifier(abilitiesMapped.dex.score);
  const conMod = abilityModifier(abilitiesMapped.con.score);

  const originalClassId = readStringField(details.originalClass);
  const classInfo = resolveClassInfo(items, originalClassId);

  const detailsLevel = readNumber(
    typeof details.level === "object" ? (details.level as { value?: number }).value : details.level,
    0,
  );
  const enrichedLevel = readNumber(details.totalLevels, 0);
  const level = Math.max(
    classInfo.level,
    enrichedLevel > 0 ? Math.floor(enrichedLevel) : 0,
    detailsLevel > 0 ? Math.floor(detailsLevel) : 0,
    1,
  );

  const className =
    sanitizeDisplayLabel(details.classResolved) ??
    classInfo.className ??
    resolveItemLabel(items, details.class) ??
    resolveItemLabel(items, details.originalClass);

  const race = resolveRaceName(items, details);
  const background = resolveBackgroundName(items, details);

  const hpMax = resolveHpMax(attrs, level, conMod, classInfo.hitDie);
  const hpCurrentRaw = readNumber(attrs.hp?.value, 0);
  const hpCurrent = hpCurrentRaw > 0 ? hpCurrentRaw : hpMax;

  const speedRaw = attrs.speed?.walk ?? attrs.speed?.value ?? 30;
  const speed =
    typeof speedRaw === "string"
      ? readNumber(speedRaw.replace(/[^\d.]/g, ""), 30)
      : readNumber(speedRaw, 30);

  const xpRaw = details.xp;
  const experiencePoints = readNumber(
    typeof xpRaw === "object" ? (xpRaw as { value?: number }).value : xpRaw,
    0,
  );

  const spellAbilityRaw = String(sys.spells?.ability ?? "int").toLowerCase();
  const spellAbility = (
    ["str", "dex", "con", "int", "wis", "cha"].includes(spellAbilityRaw)
      ? spellAbilityRaw
      : "int"
  ) as AbilityKey;

  const partial: Partial<Dnd5eSheetData> = {
    abilities: abilitiesMapped,
    savingThrows: mapFoundrySavingThrows(abilities),
    skills: mapFoundrySkills(sys.skills),
    combat: {
      hpMax,
      hpCurrent,
      hpTemp: readNumber(attrs.hp?.temp, 0),
      speed,
      hitDice: `${Math.max(1, level)}d${classInfo.hitDie}`,
      ac: resolveArmorClass(attrs, dexMod),
      initiativeBonus: resolveInitiativeBonus(attrs, dexMod),
      deathSaveSuccesses: readNumber(attrs.death?.success, 0),
      deathSaveFailures: readNumber(attrs.death?.failure ?? attrs.death?.failures, 0),
    },
    proficiencies: {
      armor: [...(sys.traits?.armorProf?.value ?? [])],
      weapons: [...(sys.traits?.weaponProf?.value ?? [])],
      tools: [...(sys.traits?.toolProf?.value ?? [])],
      languages: [...(sys.traits?.languages?.value ?? [])],
    },
    features: mapFoundryFeats(items),
    attacks: equipmentImport.attacks,
    equipment: normalizeEquipmentState(equipmentImport.equipment),
    spellcasting:
      sys.spells && (sys.spells.level ?? 0) > 0
        ? {
            ability: spellAbility,
            spellSaveDcOverride: readNumber(sys.spells.dc, NaN) || null,
            spellAttackBonusOverride: readNumber(sys.spells.attack, NaN) || null,
          }
        : undefined,
    notes: null,
  };

  const meta: FoundrySheetImportMeta = {
    className,
    subclass: classInfo.subclass,
    race,
    background,
    alignment: readStringField(details.alignment),
    level: Math.max(1, Math.floor(level)),
    experiencePoints: Math.max(0, Math.floor(experiencePoints)),
  };

  return { sheet: mergeSheetWithDefaults(partial), meta, equipmentImport };
}
