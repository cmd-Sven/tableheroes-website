/**
 * Fix shared imports after ai-actions split (verifyGM, getWorldBlueprintContext, etc.).
 */
import fs from "fs";
import path from "path";

const dir = "src/app/dashboard/campaigns/[id]/ai-actions";

const patches = {
  "quest.ts": [
    "callOpenAI",
    "getWorldContext",
    "getRootWorldContext",
    "validateAIResponseAgainstWorld",
    "verifyGM",
  ],
  "secret.ts": ["callOpenAI", "getWorldContext", "getRootWorldContext", "verifyGM"],
  "conspiracy.ts": ["callOpenAI", "getWorldContext", "getRootWorldContext", "verifyGM"],
  "npc.ts": [
    "callOpenAI",
    "getWorldContext",
    "getRootWorldContext",
    "validateAIResponseAgainstWorld",
    "verifyGM",
    "getWorldBlueprintContext",
  ],
  "npc-analysis.ts": [
    "callOpenAI",
    "getWorldContext",
    "getRootWorldContext",
    "verifyGM",
  ],
  "faction.ts": [
    "callOpenAI",
    "getWorldContext",
    "getRootWorldContext",
    "validateAIResponseAgainstWorld",
    "verifyGM",
  ],
  "lore.ts": [
    "callOpenAI",
    "getWorldContext",
    "getRootWorldContext",
    "validateAIResponseAgainstWorld",
    "verifyGM",
    "getWorldBlueprintContext",
  ],
  "session.ts": ["callOpenAI", "getWorldContext", "getRootWorldContext", "verifyGM"],
  "character.ts": ["callOpenAI", "getWorldContext", "getRootWorldContext", "verifyGM"],
  "world.ts": ["callOpenAI", "verifyGM"],
};

for (const [file, names] of Object.entries(patches)) {
  const p = path.join(dir, file);
  let content = fs.readFileSync(p, "utf8");
  const importBlock = `import {\n  ${names.join(",\n  ")}\n} from "./_shared";`;
  content = content.replace(/import \{[\s\S]*?\} from "\.\/_shared";/, importBlock);

  // Extra imports per file
  if (file === "secret.ts" && !content.includes("getNPCRelations")) {
    content = content.replace(
      '"use server";\n\n',
      '"use server";\n\nimport { getNPCRelations } from "../npc-relations-actions";\n'
    );
  }
  if (file === "npc.ts" && content.includes("getNPCRelations")) {
    // keep existing getNPCRelations import; remove if unused in npc.ts body after split
    // generateNPC may use it - check
  }
  if (file === "world.ts") {
    if (!content.includes("VALID_FACTION_TYPES")) {
      content = content.replace(
        'import type { WorldBlueprint } from "@/src/types/world";\n',
        `import type { WorldBlueprint } from "@/src/types/world";
import { VALID_LORE_TYPES } from "@/src/lib/lore-types";
import { VALID_FACTION_TYPES } from "@/src/lib/faction-types";
`
      );
    }
  }
  if (file === "npc-analysis.ts") {
    if (!content.includes("LOCATION_TYPES")) {
      content = content.replace(
        '"use server";\n\n',
        `"use server";

import { LOCATION_TYPES } from "@/src/lib/lore-types";
import { VALID_FACTION_TYPES } from "@/src/lib/faction-types";
`
      );
    }
  }
  if (file === "faction.ts" && !content.includes("WorldBlueprint")) {
    content = content.replace(
      'import { createClient } from "@/src/lib/supabase/server";\n',
      `import { createClient } from "@/src/lib/supabase/server";
import type { WorldBlueprint } from "@/src/types/world";
`
    );
  }
  if (file === "lore.ts" && content.includes("LOCATION_TYPES") && !/LOCATION_TYPES\b/.test(content.split("import")[0] + content.slice(content.indexOf("export")))) {
    // LOCATION_TYPES may be unused in lore — leave import if used
  }

  fs.writeFileSync(p, content);
  console.log("Patched", file);
}

// Remove unused getNPCRelations from npc.ts if not referenced in body
{
  const p = path.join(dir, "npc.ts");
  let content = fs.readFileSync(p, "utf8");
  const body = content.slice(content.indexOf("export async"));
  if (!/\bgetNPCRelations\b/.test(body)) {
    content = content.replace(
      /import \{ getNPCRelations \} from "\.\.\/npc-relations-actions";\n/,
      ""
    );
    fs.writeFileSync(p, content);
    console.log("Removed unused getNPCRelations from npc.ts");
  }
}

// Check createClient unused in files that only use verifyGM
for (const file of Object.keys(patches)) {
  const p = path.join(dir, file);
  let content = fs.readFileSync(p, "utf8");
  const bodyStart = content.indexOf("export async");
  const body = content.slice(bodyStart);
  if (
    content.includes('from "@/src/lib/supabase/server"') &&
    !/\bcreateClient\b/.test(body)
  ) {
    content = content.replace(
      /import \{ createClient \} from "@\/src\/lib\/supabase\/server";\n/,
      ""
    );
    // also remove WorldBlueprint-only line adjacency ok
    fs.writeFileSync(p, content);
    console.log("Removed unused createClient from", file);
  }
}
