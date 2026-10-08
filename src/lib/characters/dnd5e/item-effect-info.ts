import type { CharacterItem } from "@/src/types/inventory";
import type { CharacterSheetLocale } from "@/src/lib/i18n/character-sheet/types";
import { SHOP_ARCHETYPES } from "@/src/lib/shop-archetypes";
import { getCatalogForArchetype, type ShopCatalogItem } from "@/src/lib/shop-catalog";
import { getSpells } from "@/src/lib/characters/dnd5e/progression/catalog";
import type { SpellDefinition } from "@/src/lib/characters/dnd5e/progression/types";
import { spellSchoolLabel } from "@/src/lib/characters/dnd5e/spellcasting";
import { isMagicalItem } from "./inventory-categories";
import {
  parseDnd5eMetaFromDescription,
  stripMachineTags,
} from "./item-meta";
import {
  parseCatalogTagFromDescription,
  resolveCharacterItemStats,
  resolveItemAcBonus,
} from "./item-resolve";

export type SpecialItemFlags = {
  isMagical: boolean;
  isPotion: boolean;
  isScroll: boolean;
};

export type ItemEffectInfo = SpecialItemFlags & {
  body: string | null;
  spellName: string | null;
  /** 0 = Zaubertrick */
  spellLevel: number | null;
  spellSchool: string | null;
  dice: string[];
  duration: string | null;
  charges: string | null;
  attunement: boolean;
  magicalBonus: number | null;
  damageLine: string | null;
  acBonus: number | null;
};

const POTION_RE = /heiltrank|(?:^|[^a-z])trank(?:[^a-z]|$)|potion|elixier|elixir/;
const DICE_RE = /\d+\s*[wWdD]\s*\d+(?:\s*[+-]\s*\d+)?/g;

function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ß/g, "ss");
}

function normalizeKey(value: string): string {
  return fold(value).replace(/[^a-z0-9]+/g, "");
}

function cleanText(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const text = raw
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  return text || null;
}

function textContains(haystack: string | null, needle: string | null | undefined): boolean {
  if (!haystack || !needle?.trim()) return false;
  const h = normalizeKey(haystack);
  const n = normalizeKey(needle);
  if (!n) return false;
  if (h.includes(n)) return true;
  const slice = n.slice(0, 80);
  return slice.length >= 40 && h.includes(slice);
}

let shopByName: Map<string, ShopCatalogItem> | null = null;

function shopCatalogByExactName(name: string): ShopCatalogItem | null {
  if (!shopByName) {
    shopByName = new Map();
    for (const { key } of SHOP_ARCHETYPES) {
      for (const entry of getCatalogForArchetype(key)) {
        const norm = normalizeKey(entry.name);
        if (norm && !shopByName.has(norm)) shopByName.set(norm, entry);
      }
    }
  }
  return shopByName.get(normalizeKey(name)) ?? null;
}

function findShopEntry(item: CharacterItem): ShopCatalogItem | null {
  const tag = parseCatalogTagFromDescription(item.description);
  if (tag) {
    const entry = getCatalogForArchetype(tag.archetypeKey).find((e) => e.id === tag.catalogId);
    if (entry) return entry;
  }
  return shopCatalogByExactName(item.name);
}

let spellByName: Map<string, SpellDefinition> | null = null;

function findSpellByName(query: string): SpellDefinition | null {
  if (!spellByName) {
    spellByName = new Map();
    for (const spell of getSpells()) {
      for (const label of [spell.nameDe, spell.nameEn]) {
        const key = normalizeKey(label);
        if (key && !spellByName.has(key)) spellByName.set(key, spell);
      }
    }
  }
  return spellByName.get(normalizeKey(query)) ?? null;
}

function spellQueriesFromName(name: string): string[] {
  const queries: string[] = [];
  const paren = name.match(/\(([^)]+)\)/);
  if (paren?.[1]) {
    const inner = paren[1]
      .replace(/,?\s*(?:grad|stufe|level|rank)\s*\d+.*/i, "")
      .replace(/\b\d+\s*(?:st|nd|rd|th)?\s*(?:level|grad|stufe)\b/gi, "")
      .trim();
    if (inner) queries.push(inner);
  }
  const stripped = name
    .replace(/\([^)]*\)/g, " ")
    .replace(/^(?:spell\s*scroll|spruchrolle|zauberrolle|scroll of|scroll)\s*[:\-–]?\s*/i, "")
    .replace(/^(?:of|der|des|die|von)\s+/i, "")
    .trim();
  if (stripped && fold(stripped) !== fold(name)) queries.push(stripped);
  return queries;
}

function parseSpellLevelHint(text: string): number | null {
  const match =
    text.match(/(?:grad|stufe|level)\s*(\d+)/i) ||
    text.match(/(\d+)\s*\.?\s*(?:grad|stufe)/i);
  if (!match) return null;
  const level = Number(match[1]);
  if (!Number.isFinite(level) || level < 0 || level > 9) return null;
  return level;
}

function extractDice(texts: Array<string | null | undefined>): string[] {
  const found: string[] = [];
  for (const text of texts) {
    if (!text) continue;
    const matches = text.match(DICE_RE);
    if (!matches) continue;
    for (const raw of matches) {
      const compact = raw.replace(/\s+/g, " ").trim();
      if (!found.some((entry) => entry.toLowerCase() === compact.toLowerCase())) {
        found.push(compact);
      }
    }
  }
  return found;
}

function addUniquePart(parts: string[], raw: string | null | undefined) {
  const cleaned = cleanText(raw);
  if (!cleaned) return;
  const key = normalizeKey(cleaned);
  const existing = parts.findIndex((part) => {
    const partKey = normalizeKey(part);
    return partKey === key || partKey.includes(key) || key.includes(partKey);
  });
  if (existing >= 0) {
    if (key.length > normalizeKey(parts[existing]).length + 12) {
      parts[existing] = cleaned;
    }
    return;
  }
  parts.push(cleaned);
}

export function getSpecialItemFlags(item: CharacterItem): SpecialItemFlags | null {
  const meta = parseDnd5eMetaFromDescription(item.description);
  const user = stripMachineTags(item.description ?? "");
  const blob = fold(`${item.name}\n${user}\n${meta?.effect ?? ""}`);
  const isPotion = POTION_RE.test(blob);
  const isScroll =
    meta?.inventoryCategory === "scrolls" ||
    /spruchrolle|zauberrolle|spell\s*scroll/.test(blob) ||
    fold(item.name).includes("scroll");
  const isMagical = isMagicalItem(item);
  if (!isMagical && !isPotion && !isScroll) return null;
  return { isMagical, isPotion, isScroll };
}

export function resolveItemEffectInfo(
  item: CharacterItem,
  locale: CharacterSheetLocale,
): ItemEffectInfo | null {
  const flags = getSpecialItemFlags(item);
  if (!flags) return null;

  const meta = parseDnd5eMetaFromDescription(item.description);
  const stats = resolveCharacterItemStats(item);
  const shop = findShopEntry(item);
  const parts: string[] = [];
  addUniquePart(parts, stripMachineTags(item.description ?? ""));
  addUniquePart(parts, meta?.effect);
  addUniquePart(parts, stats.effect);
  addUniquePart(parts, shop?.effect);

  let spellName: string | null = null;
  let spellLevel: number | null = null;
  let spellSchool: string | null = null;
  let spellDescription: string | null = null;

  if (flags.isScroll) {
    const queries = spellQueriesFromName(item.name);
    const spell = queries.map((query) => findSpellByName(query)).find(Boolean) ?? null;
    if (spell) {
      spellName = locale === "de" ? spell.nameDe || spell.nameEn : spell.nameEn || spell.nameDe;
      spellLevel = spell.level;
      spellSchool = spellSchoolLabel(spell.school, locale);
      spellDescription =
        locale === "de"
          ? spell.descriptionDe?.trim() || spell.descriptionEn?.trim() || null
          : spell.descriptionEn?.trim() || spell.descriptionDe?.trim() || null;
    } else if (queries[0]) {
      spellName = queries[0];
      spellLevel = parseSpellLevelHint(item.name);
    }
    const joined = parts.join("\n");
    const storedIsThin = joined.trim().length < 40;
    if (
      spellDescription &&
      storedIsThin &&
      !textContains(joined, spellDescription)
    ) {
      addUniquePart(parts, spellDescription);
    }
  }

  const body = parts.length > 0 ? parts.join("\n\n") : null;
  const dice = extractDice([body, meta?.effect, stats.effect, shop?.effect, stats.damage, shop?.damage]);

  const damageLine =
    !flags.isPotion && stats.damage
      ? [stats.damage, stats.damageType].filter(Boolean).join(" ")
      : null;

  const ac = flags.isMagical ? resolveItemAcBonus(stats, item.name) : 0;

  return {
    ...flags,
    body,
    spellName,
    spellLevel,
    spellSchool,
    dice,
    duration: shop?.duration && !textContains(body, shop.duration) ? shop.duration : null,
    charges: shop?.charges && !textContains(body, shop.charges) ? shop.charges : null,
    attunement:
      Boolean(stats.attunement || meta?.attunement) &&
      !textContains(body, "einstimmung") &&
      !textContains(body, "attunement"),
    magicalBonus:
      stats.magicalBonus != null && stats.magicalBonus !== 0 ? stats.magicalBonus : null,
    damageLine: damageLine && !textContains(body, damageLine) ? damageLine : null,
    acBonus: ac !== 0 ? ac : null,
  };
}
