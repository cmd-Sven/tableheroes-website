/**
 * Fix session-actions split: move cross-cutting helpers to _shared, fix relative imports,
 * wire cross-part action imports.
 */
import fs from "fs";
import path from "path";

const dir = "src/app/dashboard/campaigns/[id]/session-actions";

function rewriteDynamicAndStaticRelatives(content) {
  return content
    .replace(/from ["']\.\/([^"']+)["']/g, 'from "../$1"')
    .replace(/import\(["']\.\/([^"']+)["']\)/g, 'import("../$1")');
}

// Extract helpers from part-02 (after updateSessionTranscriptionMode return)
const part02Path = path.join(dir, "part-02.ts");
let part02 = fs.readFileSync(part02Path, "utf8");
const helperMarker = "\n/** PostgREST: Spalte im API-Schema-Cache nicht";
const idx02 = part02.indexOf(helperMarker);
if (idx02 < 0) throw new Error("helper marker not found in part-02");
const helpers02 = part02.slice(idx02).replace(/\n\/\/ =+\n\/\/ GM: Live-State[\s\S]*$/, "\n");
part02 = part02.slice(0, idx02).trimEnd() + "\n";
fs.writeFileSync(part02Path, part02);

// Extract chronicle helpers from end of part-03
const part03Path = path.join(dir, "part-03.ts");
let part03 = fs.readFileSync(part03Path, "utf8");
const chronMarker = "\ntype ChronicleEntry = {";
const idx03 = part03.indexOf(chronMarker);
if (idx03 < 0) throw new Error("ChronicleEntry not found in part-03");
const helpers03 = part03.slice(idx03);
part03 = part03.slice(0, idx03).trimEnd() + "\n";
// add shared imports for prep helpers
if (!part03.includes("buildSessionPrepLiveStateInsertPayload")) {
  part03 = part03.replace(
    /^("use server";\n\n)/m,
    `$1import {\n  buildSessionPrepLiveStateInsertPayload,\n  buildSessionPrepCoreInsertPayload,\n  isPostgrestUnknownColumnError,\n  parseUnknownColumnFromPostgrestMessage,\n  logSupabaseInsertError,\n} from "./_shared";\n\n`
  );
}
fs.writeFileSync(part03Path, rewriteDynamicAndStaticRelatives(part03));

// Build _shared
const sharedHeader = `/**
 * Shared helpers for session-actions modules (live-state insert + chronicle snapshot).
 */
`;

const exportedHelpers02 = helpers02
  .replace(/^function /gm, "export function ")
  .replace(/^async function /gm, "export async function ");

const exportedHelpers03 = helpers03
  .replace(/^type ChronicleEntry/, "export type ChronicleEntry")
  .replace(/^function /gm, "export function ");

fs.writeFileSync(
  path.join(dir, "_shared.ts"),
  sharedHeader + exportedHelpers02.trim() + "\n\n" + exportedHelpers03.trim() + "\n"
);

// Fix part-04
let part04 = fs.readFileSync(path.join(dir, "part-04.ts"), "utf8");
part04 = rewriteDynamicAndStaticRelatives(part04);
if (!part04.includes("normalizeChronicleSnapshot")) {
  part04 = part04.replace(
    /^("use server";\n\n)/m,
    `$1import {\n  normalizeStringIds,\n  normalizeChronicleSnapshot,\n} from "./_shared";\n\n`
  );
} else {
  // still need import
  if (!part04.includes('from "./_shared"')) {
    part04 = part04.replace(
      /^("use server";\n\n)/m,
      `$1import {\n  normalizeStringIds,\n  normalizeChronicleSnapshot,\n} from "./_shared";\n\n`
    );
  }
}
fs.writeFileSync(path.join(dir, "part-04.ts"), part04);

// Fix part-05 cross imports + relatives
let part05 = fs.readFileSync(path.join(dir, "part-05.ts"), "utf8");
part05 = rewriteDynamicAndStaticRelatives(part05);
if (!part05.includes('from "./part-04"')) {
  part05 = part05.replace(
    /^("use server";\n\n)/m,
    `$1import { endSession } from "./part-04";\nimport { ensureSessionPrepLiveState } from "./part-03";\n\n`
  );
}
fs.writeFileSync(path.join(dir, "part-05.ts"), part05);

// Fix other parts relatives
for (const f of ["part-01.ts", "part-02.ts"]) {
  const p = path.join(dir, f);
  let c = fs.readFileSync(p, "utf8");
  c = rewriteDynamicAndStaticRelatives(c);
  fs.writeFileSync(p, c);
}

console.log("session-actions fix done");
console.log("_shared lines", fs.readFileSync(path.join(dir, "_shared.ts"), "utf8").split(/\n/).length);
