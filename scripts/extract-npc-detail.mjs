/**
 * Extract NPCDetailPage helpers into npc-detail/ folder (structural only).
 */
import fs from "fs";
import path from "path";

const srcPath = "src/components/dashboard/campaigns/NPCDetailPage.tsx";
const outDir = "src/components/dashboard/campaigns/npc-detail";
const lines = fs.readFileSync(srcPath, "utf8").split(/\r?\n/);

fs.mkdirSync(outDir, { recursive: true });

function slice(a, b) {
  return lines.slice(a - 1, b).join("\n");
}

// Find import block end (first blank after imports, or first type)
let importEnd = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].startsWith("type Quest")) {
    importEnd = i;
    break;
  }
}
const imports = lines.slice(0, importEnd).join("\n");

const typesBody = slice(77, 180); // Quest through Props-related constants? Props at 138
// Actually Props is 138-160, constants 162-180
const typesContent = `/**
 * Shared types and constants for the NPC detail page.
 */
${typesBody}
`;
fs.writeFileSync(path.join(outDir, "types.ts"), typesContent + "\n");

const inlineBody = slice(182, 258);
const inlineContent = `/**
 * Inline editable text/select field used on the NPC detail page.
 */
"use client";

import { Loader2 } from "lucide-react";
import type { InlineEditFieldProps } from "./types";

${inlineBody}
`;
fs.writeFileSync(path.join(outDir, "InlineEditField.tsx"), inlineContent + "\n");

const travelStart = lines.findIndex((l) => l.startsWith("type TravelQuickActionProps"));
const travelBody = lines.slice(travelStart).join("\n");
const travelContent = `/**
 * Quick travel / relocate control for an NPC on the detail page.
 */
"use client";

import { MapPin, Loader2 } from "lucide-react";
import type { TravelQuickActionProps } from "./types";

${travelBody}
`;
// TravelQuickActionProps is defined in travel file itself - fix types
const travelFixed = travelContent.replace(
  'import type { TravelQuickActionProps } from "./types";\n\n',
  ""
);
fs.writeFileSync(path.join(outDir, "TravelQuickAction.tsx"), travelFixed + "\n");

// Move TravelQuickActionProps into types? Keep local in Travel file - already has type inline.

console.log("Wrote types, InlineEditField, TravelQuickAction");
console.log("importEnd", importEnd, "travelStart", travelStart + 1);
