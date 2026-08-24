/**
 * Removes extracted code blocks from LiveSessionBoard.tsx (phase 2).
 */
import fs from "fs";
import path from "path";

const boardPath = path.resolve("src/app/session/[sessionId]/LiveSessionBoard.tsx");
const lines = fs.readFileSync(boardPath, "utf8").split("\n");

const removeRanges = [
  [392, 430],
  [456, 462],
  [512, 1074],
  [1170, 1745],
  [2289, 2546],
  [2548, 2586],
  [2824, 2893],
  [3314, 3583],
  [4466, 4648],
].sort((a, b) => b[0] - a[0]);

let patched = [...lines];
for (const [start, end] of removeRanges) {
  patched.splice(start - 1, end - start + 1);
}

let text = patched.join("\n");

const importAnchor = `import { LiveSessionStageManager } from "@/src/components/session/live-board/LiveSessionStageManager";`;
const newImports = `${importAnchor}
import { useLiveSessionBattlemap } from "@/src/components/session/live-board/useLiveSessionBattlemap";
import { useLiveSessionCombat } from "@/src/components/session/live-board/useLiveSessionCombat";
import { useLiveSessionRealtime } from "@/src/components/session/live-board/useLiveSessionRealtime";
import { LiveSessionStageRoster } from "@/src/components/session/live-board/LiveSessionStageRoster";`;

text = text.replace(importAnchor, newImports);

fs.writeFileSync(boardPath, text, "utf8");
console.log(`Removed blocks. LiveSessionBoard.tsx: ${text.split("\n").length} lines`);
