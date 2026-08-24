/**
 * One-shot structural split of ai-actions.ts into domain modules.
 * No behavior changes — extracts line ranges and wires shared helpers.
 */
import fs from "fs";
import path from "path";

const root = "src/app/dashboard/campaigns/[id]";
const srcPath = path.join(root, "ai-actions.ts");
const lines = fs.readFileSync(srcPath, "utf8").split(/\r?\n/);
const outDir = path.join(root, "ai-actions");
fs.mkdirSync(outDir, { recursive: true });

function slice(start1, end1Inclusive) {
  return lines.slice(start1 - 1, end1Inclusive).join("\n");
}

const helperNames = [
  "openai",
  "callOpenAI",
  "getWorldContext",
  "getRootWorldContext",
  "getSecretsForEntities",
  "validateAIResponseAgainstWorld",
  "normalizeShopItemRarity",
  "normalizeShopItemType",
  "SHOP_ITEM_RARITIES",
  "SHOP_ITEM_TYPES",
];

const exportRanges = [
  ["generateShopItemsWithAI", 386, 575],
  ["generateQuest", 576, 802],
  ["generateSecret", 803, 1245],
  ["generateConspiracy", 1246, 1562],
  ["generateNPC", 1563, 1925],
  ["generateFaction", 1926, 2055],
  ["generateFactionForWorld", 2056, 2184],
  ["generateLore", 2185, 2247],
  ["generateSessionHook", 2248, 2320],
  ["generateBackstorySuggestions", 2321, 2424],
  ["analyzeCharacterOnboarding", 2425, 2530],
  ["generateWorldSkeleton", 2531, 2608],
  ["generateCharacterQuest", 2609, 2677],
  ["generateFactionDetails", 2678, 2713],
  ["generateLocationDetails", 2714, 2749],
  ["generateNpcDetails", 2750, 2785],
  ["generateNpcDetailsFromHook", 2786, 2861],
  ["analyzeWorldContext", 2862, 2950],
  ["analyzeBriefingForNPCs", 2951, lines.length],
];

for (const [name, start, end] of exportRanges) {
  const body = slice(start, end);
  const used = helperNames.filter((h) => new RegExp(`\\b${h}\\b`).test(body));
  const also = [];
  if (/LOCATION_TYPES|VALID_LORE_TYPES/.test(body)) also.push("lore-types");
  if (/VALID_FACTION_TYPES|VALID_RELATIONSHIPS|FACTION_MEMBER_ROLES/.test(body))
    also.push("faction-types");
  if (/WorldBlueprint/.test(body)) also.push("WorldBlueprint");
  if (/NPCSchema|LoreEntrySchema|FactionAIResponseSchema/.test(body))
    also.push("schemas");
  if (/getNPCRelations/.test(body)) also.push("getNPCRelations");
  if (/createClient/.test(body)) also.push("createClient");
  console.log(`${name}: ${used.join(", ")}${also.length ? " | " + also.join(",") : ""}`);
}

// --- Build _shared.ts ---
// Original: lines 16-18 openai, 20-385 helpers (incl shop normalizers)
const helpersBody = slice(20, 385)
  // helpers that were non-exported need to become exported
  .replace(/^async function /gm, "export async function ")
  .replace(/^function /gm, "export function ")
  .replace(/^const SHOP_ITEM_/gm, "export const SHOP_ITEM_");

const sharedContent = `/**
 * Shared OpenAI client and campaign AI helper utilities.
 * Used by domain-specific ai-actions modules (shop, quest, NPC, etc.).
 */
import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

${helpersBody}
`;

fs.writeFileSync(path.join(outDir, "_shared.ts"), sharedContent);

// Domain groups: keep each file under ~500 lines
const domains = [
  {
    file: "shop.ts",
    purpose:
      "AI shop item generation server actions for campaign shops.",
    ranges: [[386, 575]],
    extraImports: `import { createClient } from "@/src/lib/supabase/server";
import {
  callOpenAI,
  getWorldContext,
  getRootWorldContext,
  normalizeShopItemRarity,
  normalizeShopItemType,
} from "./_shared";`,
  },
  {
    file: "quest.ts",
    purpose: "AI quest and character-quest generation server actions.",
    ranges: [
      [576, 802],
      [2609, 2677],
    ],
    extraImports: `import { createClient } from "@/src/lib/supabase/server";
import {
  callOpenAI,
  getWorldContext,
  getRootWorldContext,
  validateAIResponseAgainstWorld,
} from "./_shared";`,
  },
  {
    file: "secret.ts",
    purpose: "AI secret generation server actions for campaign entities.",
    ranges: [[803, 1245]],
    extraImports: `import { createClient } from "@/src/lib/supabase/server";
import {
  callOpenAI,
  getWorldContext,
  getRootWorldContext,
} from "./_shared";`,
  },
  {
    file: "conspiracy.ts",
    purpose: "AI conspiracy generation server actions linking campaign secrets.",
    ranges: [[1246, 1562]],
    extraImports: `import { createClient } from "@/src/lib/supabase/server";
import {
  callOpenAI,
  getWorldContext,
  getRootWorldContext,
} from "./_shared";`,
  },
  {
    file: "npc.ts",
    purpose: "AI NPC generation and NPC detail expansion server actions.",
    ranges: [
      [1563, 1925],
      [2786, 2861],
    ],
    extraImports: `import { createClient } from "@/src/lib/supabase/server";
import { NPCSchema } from "@/src/lib/validations/schemas";
import { getNPCRelations } from "../npc-relations-actions";
import {
  callOpenAI,
  getWorldContext,
  getRootWorldContext,
  validateAIResponseAgainstWorld,
} from "./_shared";`,
  },
  {
    file: "npc-analysis.ts",
    purpose: "AI world-context and briefing analysis helpers for NPC wizards.",
    ranges: [
      [2862, 2950],
      [2951, lines.length],
    ],
    extraImports: `import { createClient } from "@/src/lib/supabase/server";
import {
  callOpenAI,
  getWorldContext,
  getRootWorldContext,
} from "./_shared";`,
  },
  {
    file: "faction.ts",
    purpose: "AI faction generation and detail expansion server actions.",
    ranges: [
      [1926, 2055],
      [2056, 2184],
      [2678, 2713],
    ],
    extraImports: `import { createClient } from "@/src/lib/supabase/server";
import { VALID_FACTION_TYPES, VALID_RELATIONSHIPS, FACTION_MEMBER_ROLES } from "@/src/lib/faction-types";
import { FactionAIResponseSchema } from "@/src/lib/validations/schemas";
import {
  callOpenAI,
  getWorldContext,
  getRootWorldContext,
  validateAIResponseAgainstWorld,
} from "./_shared";`,
  },
  {
    file: "lore.ts",
    purpose: "AI lore and location detail generation server actions.",
    ranges: [
      [2185, 2247],
      [2714, 2749],
    ],
    extraImports: `import { createClient } from "@/src/lib/supabase/server";
import { LOCATION_TYPES, VALID_LORE_TYPES } from "@/src/lib/lore-types";
import { LoreEntrySchema } from "@/src/lib/validations/schemas";
import {
  callOpenAI,
  getWorldContext,
  getRootWorldContext,
  validateAIResponseAgainstWorld,
} from "./_shared";`,
  },
  {
    file: "session.ts",
    purpose: "AI session hook and scene detail generation server actions.",
    ranges: [
      [2248, 2320],
      [2750, 2785],
    ],
    extraImports: `import { createClient } from "@/src/lib/supabase/server";
import {
  callOpenAI,
  getWorldContext,
  getRootWorldContext,
} from "./_shared";`,
  },
  {
    file: "character.ts",
    purpose: "AI character backstory and onboarding analysis server actions.",
    ranges: [
      [2321, 2424],
      [2425, 2530],
    ],
    extraImports: `import { createClient } from "@/src/lib/supabase/server";
import {
  callOpenAI,
  getWorldContext,
  getRootWorldContext,
} from "./_shared";`,
  },
  {
    file: "world.ts",
    purpose: "AI world skeleton generation server actions.",
    ranges: [[2531, 2608]],
    extraImports: `import { createClient } from "@/src/lib/supabase/server";
import type { WorldBlueprint } from "@/src/types/world";
import { callOpenAI } from "./_shared";`,
  },
];

const allExportNames = [];

for (const domain of domains) {
  const bodies = domain.ranges.map(([s, e]) => slice(s, e));
  // Trim trailing empty from last chunk
  const body = bodies.join("\n\n").replace(/\n+$/, "\n");
  const exportMatches = [...body.matchAll(/^export async function (\w+)/gm)].map(
    (m) => m[1]
  );
  allExportNames.push(...exportMatches);

  const content = `/**
 * ${domain.purpose}
 */
"use server";

${domain.extraImports}

${body}`;
  fs.writeFileSync(path.join(outDir, domain.file), content);
  console.log(
    `Wrote ${domain.file}: ${content.split(/\r?\n/).length} lines, exports: ${exportMatches.join(", ")}`
  );
}

// Barrel: keep public import path ./ai-actions
const barrel = `/**
 * Campaign AI generation server actions — barrel re-export.
 * Domain implementations live under ./ai-actions/*.
 */
"use server";

export { generateShopItemsWithAI } from "./ai-actions/shop";
export { generateQuest, generateCharacterQuest } from "./ai-actions/quest";
export { generateSecret } from "./ai-actions/secret";
export { generateConspiracy } from "./ai-actions/conspiracy";
export { generateNPC, generateNpcDetailsFromHook } from "./ai-actions/npc";
export {
  analyzeWorldContext,
  analyzeBriefingForNPCs,
} from "./ai-actions/npc-analysis";
export {
  generateFaction,
  generateFactionForWorld,
  generateFactionDetails,
} from "./ai-actions/faction";
export { generateLore, generateLocationDetails } from "./ai-actions/lore";
export { generateSessionHook, generateNpcDetails } from "./ai-actions/session";
export {
  generateBackstorySuggestions,
  analyzeCharacterOnboarding,
} from "./ai-actions/character";
export { generateWorldSkeleton } from "./ai-actions/world";
`;

fs.writeFileSync(srcPath, barrel);
console.log("Wrote barrel ai-actions.ts");
console.log("All exports:", allExportNames.join(", "));
console.log("Count:", allExportNames.length);
