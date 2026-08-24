/**
 * Extract small UI helpers from Dnd5eCharacterSheetPanel into sibling files.
 */
import fs from "fs";

const src = "src/components/characters/Dnd5eCharacterSheetPanel.tsx";
const lines = fs.readFileSync(src, "utf8").split(/\r?\n/);

// Find function ToggleSwitch through TextInput end (before type Props)
const start = lines.findIndex((l) => l.startsWith("function ToggleSwitch"));
const propsIdx = lines.findIndex((l) => l.startsWith("type Props ="));
if (start < 0 || propsIdx < 0) {
  console.error("markers not found", start, propsIdx);
  process.exit(1);
}

const helpers = lines.slice(start, propsIdx).join("\n").trimEnd();

// Detect needed imports from helpers
const needs = {
  Loader2: /\bLoader2\b/.test(helpers),
  Save: /\bSave\b/.test(helpers),
  CharacterSheetMessageKey: /\bCharacterSheetMessageKey\b/.test(helpers),
};

const importLines = [];
if (needs.Loader2 || needs.Save) {
  const icons = [needs.Loader2 && "Loader2", needs.Save && "Save"].filter(Boolean);
  importLines.push(`import { ${icons.join(", ")} } from "lucide-react";`);
}
if (needs.CharacterSheetMessageKey) {
  importLines.push(
    `import type { CharacterSheetMessageKey } from "@/src/lib/i18n/character-sheet/types";`
  );
}

const out = `/**
 * Small shared inputs/controls for the D&D 5e character sheet panel.
 */
"use client";

${importLines.join("\n")}

${helpers}
`;

fs.writeFileSync("src/components/characters/dnd5e-sheet-controls.tsx", out + "\n");

// Remove helpers from main and add import
const before = lines.slice(0, start).join("\n");
const after = lines.slice(propsIdx).join("\n");
const importStmt = `import {
  ToggleSwitch,
  CharacterSheetModeBar,
  NumberInput,
  TextInput,
} from "./dnd5e-sheet-controls";
`;

// Insert import after last import in before
const beforeLines = before.split(/\n/);
let lastImport = 0;
for (let i = 0; i < beforeLines.length; i++) {
  if (beforeLines[i].startsWith("import ") || beforeLines[i].startsWith("} from")) lastImport = i;
}
beforeLines.splice(lastImport + 1, 0, importStmt);
const newMain = beforeLines.join("\n") + "\n\n" + after;
fs.writeFileSync(src, newMain.endsWith("\n") ? newMain : newMain + "\n");

console.log("Extracted controls. Main lines:", newMain.split(/\n/).length);
console.log("Controls lines:", out.split(/\n/).length);
