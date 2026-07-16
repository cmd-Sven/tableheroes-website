import { randomUUID } from "crypto";
import type {
  AbilityKey,
  Dnd5eFeatureEntry,
  Dnd5eSheetData,
  Dnd5eSkillEntry,
  Dnd5eSkillKey,
  Dnd5eSpellEntry,
  Dnd5eSpellPreparationMode,
  Dnd5eSpellSlots,
} from "./types";
import { mergeSheetWithDefaults } from "./defaults";
import { DND5E_SKILLS } from "./skills";
import { abilityModifier } from "./formulas";
import { mapFoundryItemsToEquipment } from "./foundry-equipment-mapper";
import { normalizeEquipmentState } from "./equipment";
import { sanitizeActorDisplayLabel } from "@/src/lib/foundry-sync/actor-display-labels";
import { defaultSpellAbilityForClass } from "./spellcasting";

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

type FoundryLocalizedFlags = {
  nameDe?: string;
  nameEn?: string;
  descriptionDe?: string;
  descriptionEn?: string;
};

type FoundryItemRow = {
  _id?: string;
  id?: string;
  name?: string;
  type?: string;
  flags?: Record<string, unknown>;
  system?: {
    levels?: number;
    hd?: { denomination?: number; faces?: number };
    description?: { value?: string };
    level?: number;
    school?: string;
    preparation?: { mode?: string; prepared?: boolean };
    components?: {
      vocal?: boolean;
      somatic?: boolean;
      material?: boolean;
      ritual?: boolean;
      concentration?: boolean;
    };
    properties?: Record<string, boolean> | string[];
    activation?: { type?: string; cost?: number; condition?: string };
    duration?: { value?: string | number; units?: string; concentration?: boolean };
    range?: { value?: string | number; units?: string; special?: string };
    materials?: { value?: string };
  };
};

type FoundrySpellSlotBlock = {
  value?: number;
  max?: number;
  override?: number | null;
  spent?: number;
  level?: number;
};

type FoundryActorSystem = {
  abilities?: Partial<Record<AbilityKey, FoundryAbilityBlock>>;
  attributes?: {
    ac?: { flat?: number; calc?: string; value?: number };
    hp?: { value?: number; max?: number; temp?: number; tempmax?: number };
    init?: { bonus?: string | number; value?: number; total?: number };
    speed?: { walk?: number | string; value?: number };
    death?: { success?: number; failure?: number; failures?: number };
    spellcasting?: string;
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
    spell1?: FoundrySpellSlotBlock;
    spell2?: FoundrySpellSlotBlock;
    spell3?: FoundrySpellSlotBlock;
    spell4?: FoundrySpellSlotBlock;
    spell5?: FoundrySpellSlotBlock;
    spell6?: FoundrySpellSlotBlock;
    spell7?: FoundrySpellSlotBlock;
    spell8?: FoundrySpellSlotBlock;
    spell9?: FoundrySpellSlotBlock;
    pact?: FoundrySpellSlotBlock;
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

function resolveItemLabel(items: unknown[], ref: unknown): string | null {
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

  const classes = items.filter(
    (raw) => String((raw as FoundryItemRow).type ?? "").toLowerCase() === "class",
  ) as FoundryItemRow[];
  const subclasses = items.filter(
    (raw) => String((raw as FoundryItemRow).type ?? "").toLowerCase() === "subclass",
  ) as FoundryItemRow[];

  let primary: FoundryItemRow | null = null;
  if (originalClassId) {
    primary = classes.find((c) => String(c._id ?? c.id) === originalClassId) ?? null;
  }
  if (!primary && classes.length > 0) {
    primary = [...classes].sort(
      (a, b) => readNumber(b.system?.levels, 0) - readNumber(a.system?.levels, 0),
    )[0];
  }

  const level = classes.reduce(
    (sum, row) => sum + Math.max(0, Math.floor(readNumber(row.system?.levels, 0))),
    0,
  );
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

function stripHtml(html: string | null | undefined): string | null {
  if (!html || typeof html !== "string") return null;
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text || null;
}

function readOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t || null;
}

/** DE/EN-Namen aus Foundry-Flags (TableHeroes, Babele, …). */
function readBilingualLabels(row: FoundryItemRow): {
  nameDe: string | null;
  nameEn: string | null;
  descriptionDe: string | null;
  descriptionEn: string | null;
} {
  const flags = row.flags ?? {};
  const th = (flags.tableheroes ?? flags["table-heroes"] ?? {}) as FoundryLocalizedFlags;
  const babele = (flags.babele ?? {}) as { originalName?: string; translated?: boolean };
  const name = String(row.name ?? "").trim();
  const originalName = readOptionalString(babele.originalName);

  let nameDe = readOptionalString(th.nameDe);
  let nameEn = readOptionalString(th.nameEn);

  if (!nameDe && !nameEn && originalName && originalName !== name) {
    nameEn = originalName;
    nameDe = name || null;
  }

  return {
    nameDe,
    nameEn,
    descriptionDe: readOptionalString(th.descriptionDe),
    descriptionEn: readOptionalString(th.descriptionEn),
  };
}

function mapFoundryFeats(items: unknown): Dnd5eFeatureEntry[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((raw) => String((raw as FoundryItemRow).type ?? "").toLowerCase() === "feat")
    .map((item) => {
      const row = item as FoundryItemRow;
      const name = String(row.name ?? "").trim();
      if (!name) return null;
      const bilingual = readBilingualLabels(row);
      const description = stripHtml(row.system?.description?.value);
      return {
        id: String(row._id ?? row.id ?? randomUUID()),
        name,
        nameDe: bilingual.nameDe,
        nameEn: bilingual.nameEn,
        description,
        descriptionDe: bilingual.descriptionDe,
        descriptionEn: bilingual.descriptionEn,
        source: "foundry",
      } satisfies Dnd5eFeatureEntry;
    })
    .filter(Boolean) as Dnd5eFeatureEntry[];
}

function normalizePreparationMode(raw: string | undefined): Dnd5eSpellPreparationMode | null {
  if (!raw) return null;
  const mode = raw.toLowerCase().trim();
  if (
    mode === "prepared" ||
    mode === "always" ||
    mode === "innate" ||
    mode === "pact" ||
    mode === "atwill" ||
    mode === "known"
  ) {
    return mode;
  }
  return null;
}

function hasProperty(
  properties: Record<string, boolean> | string[] | undefined,
  key: string,
): boolean {
  if (!properties) return false;
  if (Array.isArray(properties)) {
    return properties.some((p) => String(p).toLowerCase() === key);
  }
  return Boolean(properties[key]);
}

function formatActivation(sys: FoundryItemRow["system"]): string | null {
  const type = sys?.activation?.type;
  if (!type) return null;
  const cost = sys.activation?.cost;
  if (cost != null && cost > 0) return `${cost} ${type}`;
  return String(type);
}

function formatRange(sys: FoundryItemRow["system"]): string | null {
  const range = sys?.range;
  if (!range) return null;
  if (range.special) return String(range.special);
  const units = range.units ? String(range.units) : "";
  if (range.value != null && range.value !== "") {
    return `${range.value}${units ? ` ${units}` : ""}`.trim();
  }
  return units || null;
}

function formatDuration(sys: FoundryItemRow["system"]): string | null {
  const duration = sys?.duration;
  if (!duration) return null;
  const units = duration.units ? String(duration.units) : "";
  if (duration.value != null && duration.value !== "") {
    return `${duration.value}${units ? ` ${units}` : ""}`.trim();
  }
  return units || null;
}

function readComponentFlags(sys: FoundryItemRow["system"]): {
  vocal: boolean;
  somatic: boolean;
  material: boolean;
  materials: string | null;
} {
  const c = sys?.components;
  const props = sys?.properties;
  return {
    vocal: Boolean(c?.vocal) || hasProperty(props, "vocal") || hasProperty(props, "v"),
    somatic: Boolean(c?.somatic) || hasProperty(props, "somatic") || hasProperty(props, "s"),
    material: Boolean(c?.material) || hasProperty(props, "material") || hasProperty(props, "m"),
    materials: readOptionalString(sys?.materials?.value),
  };
}

function formatComponents(sys: FoundryItemRow["system"]): string | null {
  const flags = readComponentFlags(sys);
  const parts: string[] = [];
  if (flags.vocal) parts.push("V");
  if (flags.somatic) parts.push("S");
  if (flags.material) {
    parts.push(flags.materials ? `M (${flags.materials})` : "M");
  }
  return parts.length > 0 ? parts.join(", ") : null;
}

function mapFoundrySpells(items: unknown): Dnd5eSpellEntry[] {
  if (!Array.isArray(items)) return [];
  return findAllItemsByType(items, "spell")
    .map((row) => {
      const name = String(row.name ?? "").trim();
      if (!name) return null;
      const sys = row.system;
      const bilingual = readBilingualLabels(row);
      const description = stripHtml(sys?.description?.value);
      const mode = normalizePreparationMode(sys?.preparation?.mode);
      const ritual =
        Boolean(sys?.components?.ritual) || hasProperty(sys?.properties, "ritual");
      const concentration =
        Boolean(sys?.components?.concentration) ||
        Boolean(sys?.duration?.concentration) ||
        hasProperty(sys?.properties, "concentration");
      const comps = readComponentFlags(sys);

      return {
        id: String(row._id ?? row.id ?? randomUUID()),
        name,
        nameDe: bilingual.nameDe,
        nameEn: bilingual.nameEn,
        description,
        descriptionDe: bilingual.descriptionDe,
        descriptionEn: bilingual.descriptionEn,
        level: Math.max(0, Math.min(9, Math.floor(readNumber(sys?.level, 0)))),
        school: readOptionalString(sys?.school),
        preparationMode: mode,
        prepared: Boolean(sys?.preparation?.prepared) || mode === "always" || mode === "atwill",
        ritual,
        concentration,
        castingTime: formatActivation(sys),
        range: formatRange(sys),
        duration: formatDuration(sys),
        components: formatComponents(sys),
        componentVocal: comps.vocal,
        componentSomatic: comps.somatic,
        componentMaterial: comps.material,
        materials: comps.materials,
        source: "foundry",
      } satisfies Dnd5eSpellEntry;
    })
    .filter(Boolean) as Dnd5eSpellEntry[];
}

function mapFoundrySpellSlots(
  spells: FoundryActorSystem["spells"] | undefined,
): Dnd5eSpellSlots | undefined {
  if (!spells) return undefined;
  const slots: Dnd5eSpellSlots = {};

  const mapBlock = (key: string, block: FoundrySpellSlotBlock | undefined) => {
    if (!block) return;
    const maxOverride = readNumber(block.override, NaN);
    const max = Math.max(
      0,
      Math.floor(
        Number.isFinite(maxOverride) && maxOverride > 0 ? maxOverride : readNumber(block.max, 0),
      ),
    );
    if (max <= 0) return;

    let used: number;
    if (block.spent != null && Number.isFinite(Number(block.spent))) {
      used = Math.max(0, Math.min(max, Math.floor(Number(block.spent))));
    } else {
      // Foundry dnd5e: value = verbleibende Slots
      const remaining = Math.max(0, Math.floor(readNumber(block.value, max)));
      used = Math.max(0, Math.min(max, max - remaining));
    }
    slots[key] = { max, used };
  };

  for (let lvl = 1; lvl <= 9; lvl++) {
    const key = `spell${lvl}` as keyof NonNullable<FoundryActorSystem["spells"]>;
    mapBlock(String(lvl), spells[key] as FoundrySpellSlotBlock | undefined);
  }
  mapBlock("pact", spells.pact);

  return Object.keys(slots).length > 0 ? slots : undefined;
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
}): {
  sheet: Dnd5eSheetData;
  meta: FoundrySheetImportMeta;
  equipmentImport: ReturnType<typeof mapFoundryItemsToEquipment>;
} {
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
    typeof details.level === "object"
      ? (details.level as { value?: number }).value
      : details.level,
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

  const mappedSpells = mapFoundrySpells(items);
  const mappedSlots = mapFoundrySpellSlots(sys.spells);

  const spellAbilityRaw = String(
    sys.spells?.ability ??
      attrs.spellcasting ??
      defaultSpellAbilityForClass(className) ??
      "int",
  ).toLowerCase();
  const spellAbility = (
    ["str", "dex", "con", "int", "wis", "cha"].includes(spellAbilityRaw)
      ? spellAbilityRaw
      : defaultSpellAbilityForClass(className)
  ) as AbilityKey;

  const hasSpellcasting =
    mappedSpells.length > 0 ||
    Boolean(mappedSlots) ||
    (sys.spells != null && (sys.spells.level ?? 0) > 0) ||
    Boolean(attrs.spellcasting);

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
    spells: mappedSpells,
    attacks: equipmentImport.attacks,
    equipment: normalizeEquipmentState(equipmentImport.equipment),
    spellcasting: hasSpellcasting
      ? {
          ability: spellAbility,
          spellSaveDcOverride: readNumber(sys.spells?.dc, NaN) || null,
          spellAttackBonusOverride: readNumber(sys.spells?.attack, NaN) || null,
          slots: mappedSlots,
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
