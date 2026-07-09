import { randomUUID } from "crypto";
import type {
  AbilityKey,
  Dnd5eFeatureEntry,
  Dnd5eSheetData,
  Dnd5eSkillKey,
  SkillProficiency,
} from "./types";
import { mergeSheetWithDefaults } from "./defaults";
import { DND5E_SKILLS } from "./skills";
import { mapFoundryItemsToEquipment } from "./foundry-equipment-mapper";
import { normalizeEquipmentState } from "./equipment";

type FoundryAbilityBlock = {
  value?: number;
  proficient?: number | boolean;
};

type FoundrySkillBlock = {
  value?: number;
  ability?: string;
  bonuses?: { check?: string; passive?: string };
};

type FoundryActorSystem = {
  abilities?: Partial<Record<AbilityKey, FoundryAbilityBlock>>;
  attributes?: {
    ac?: { flat?: number; calc?: string; value?: number };
    hp?: { value?: number; max?: number; temp?: number; tempmax?: number };
    init?: { bonus?: string | number; value?: number };
    speed?: { walk?: number | string; value?: number };
    death?: { success?: number; failure?: number; failures?: number };
  };
  details?: {
    race?: string | { value?: string };
    background?: string | { value?: string };
    alignment?: string;
    level?: number | { value?: number };
    xp?: { value?: number } | number;
    class?: string | { name?: string; value?: string };
    originalClass?: string;
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

function readNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function mapFoundrySkillProficiency(value: unknown): SkillProficiency {
  const n = Number(value);
  if (n >= 2) return "expertise";
  if (n >= 1) return "proficient";
  if (n >= 0.5) return "expertise";
  return "none";
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
    const raw = skills?.[def.key];
    mapped[def.key] = {
      proficient: mapFoundrySkillProficiency(raw?.value),
    };
  }
  return mapped;
}

function mapFoundryFeatures(items: unknown): Dnd5eFeatureEntry[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      const row = item as { _id?: string; id?: string; name?: string; system?: { description?: { value?: string } } };
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
  const abilities = sys.abilities ?? {};
  const attrs = sys.attributes ?? {};
  const details = sys.details ?? {};

  const abilitiesMapped = {} as Dnd5eSheetData["abilities"];
  for (const key of ["str", "dex", "con", "int", "wis", "cha"] as AbilityKey[]) {
    abilitiesMapped[key] = {
      score: readNumber(abilities[key]?.value, 10),
    };
  }

  const hpMax = readNumber(attrs.hp?.max, readNumber(attrs.hp?.value, 1));
  const hpCurrent = readNumber(attrs.hp?.value, hpMax);
  const speedRaw = attrs.speed?.walk ?? attrs.speed?.value ?? 30;
  const speed =
    typeof speedRaw === "string"
      ? readNumber(speedRaw.replace(/[^\d.]/g, ""), 30)
      : readNumber(speedRaw, 30);

  const className =
    readStringField(details.class) ??
    readStringField(details.originalClass) ??
    null;
  const level = readNumber(
    typeof details.level === "object" ? (details.level as { value?: number }).value : details.level,
    1,
  );
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
      hitDice: `${Math.max(1, level)}d8`,
      ac: readNumber(attrs.ac?.value ?? attrs.ac?.flat, 10),
      initiativeBonus: readNumber(attrs.init?.bonus ?? attrs.init?.value, 0),
      deathSaveSuccesses: readNumber(attrs.death?.success, 0),
      deathSaveFailures: readNumber(attrs.death?.failure ?? attrs.death?.failures, 0),
    },
    proficiencies: {
      armor: [...(sys.traits?.armorProf?.value ?? [])],
      weapons: [...(sys.traits?.weaponProf?.value ?? [])],
      tools: [...(sys.traits?.toolProf?.value ?? [])],
      languages: [...(sys.traits?.languages?.value ?? [])],
    },
    features: mapFoundryFeatures(input.actorItems ?? []),
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
    subclass: null,
    race: readStringField(details.race),
    background: readStringField(details.background),
    alignment: readStringField(details.alignment),
    level: Math.max(1, Math.floor(level)),
    experiencePoints: Math.max(0, Math.floor(experiencePoints)),
  };

  return { sheet: mergeSheetWithDefaults(partial), meta, equipmentImport };
}
