/**
 * Structural split for large "use server" action modules.
 * Groups consecutive exports into chunks under maxLines; shared helpers go to _shared.
 * Barrel keeps the original import path.
 *
 * Usage: node scripts/split-actions.mjs <file.ts> [maxLines=450]
 */
import fs from "fs";
import path from "path";

const filePath = process.argv[2];
const maxLines = Number(process.argv[3] || 450);
if (!filePath) {
  console.error("Usage: node scripts/split-actions.mjs <file.ts> [maxLines]");
  process.exit(1);
}

const abs = path.resolve(filePath);
const original = fs.readFileSync(abs, "utf8");
const lines = original.split(/\r?\n/);
const dir = path.dirname(abs);
const base = path.basename(abs, path.extname(abs));
const outDir = path.join(dir, base);

if (fs.existsSync(outDir)) {
  console.error("Output dir already exists:", outDir);
  process.exit(1);
}

// Find export starts
const exportStarts = [];
for (let i = 0; i < lines.length; i++) {
  if (
    /^export async function /.test(lines[i]) ||
    /^export function /.test(lines[i]) ||
    /^export type /.test(lines[i]) ||
    /^export interface /.test(lines[i]) ||
    /^export const \w+.*=/.test(lines[i])
  ) {
    const nameMatch = lines[i].match(
      /^export (?:async )?function (\w+)|^export type (\w+)|^export interface (\w+)|^export const (\w+)/
    );
    const name = nameMatch[1] || nameMatch[2] || nameMatch[3] || nameMatch[4];
    exportStarts.push({ line: i + 1, name, index: i });
  }
}

if (exportStarts.length < 2) {
  console.error("Need at least 2 exports to split meaningfully. Found:", exportStarts.length);
  process.exit(1);
}

const firstExportIdx = exportStarts[0].index;

// Header: everything before first export (imports + helpers)
const headerLines = lines.slice(0, firstExportIdx);
const hasUseServer = headerLines.some((l) => l.trim() === '"use server";' || l.trim() === "'use server';");

// Extract import lines vs helper body from header
const importLines = [];
const helperLines = [];
let pastImports = false;
for (const line of headerLines) {
  const trimmed = line.trim();
  if (
    !pastImports &&
    (trimmed.startsWith("import ") ||
      trimmed === '"use server";' ||
      trimmed === "'use server';" ||
      trimmed === "" ||
      trimmed.startsWith("//") ||
      trimmed.startsWith("/*") ||
      trimmed.startsWith("*") ||
      trimmed.startsWith("*/"))
  ) {
    if (trimmed.startsWith("import ") || trimmed.startsWith("} from") || trimmed.startsWith("from ")) {
      importLines.push(line);
    } else if (
      trimmed === '"use server";' ||
      trimmed === "'use server';"
    ) {
      // skip — added per file
    } else if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*") || trimmed.startsWith("*/")) {
      if (importLines.length === 0) continue;
      importLines.push(line);
    } else {
      pastImports = true;
      helperLines.push(line);
    }
  } else {
    pastImports = true;
    helperLines.push(line);
  }
}

// Better import extraction: parse multiline imports from start until first non-import code
function extractImportsAndRest(hdr) {
  const imports = [];
  let i = 0;
  while (i < hdr.length) {
    const t = hdr[i].trim();
    if (t === '"use server";' || t === "'use server';") {
      i++;
      continue;
    }
    if (t === "" && imports.length === 0) {
      i++;
      continue;
    }
    if (t.startsWith("import ") || t.startsWith("import{")) {
      let block = hdr[i];
      while (!hdr[i].includes(" from ") && !hdr[i].trim().endsWith('";') && !hdr[i].trim().endsWith("';") && i < hdr.length - 1) {
        // multiline import without from on same line yet
        if (hdr[i].includes(" from ") || /from ["']/.test(hdr[i])) break;
        i++;
        block += "\n" + hdr[i];
        if (/from ["'].*["'];?\s*$/.test(hdr[i])) break;
      }
      // If first line already complete
      if (!/from ["'].*["'];?\s*$/.test(block.split("\n").pop()) && i < hdr.length - 1) {
        while (i < hdr.length - 1 && !/from ["'].*["'];?\s*$/.test(hdr[i])) {
          i++;
          block += "\n" + hdr[i];
        }
      }
      imports.push(block);
      i++;
      continue;
    }
    break;
  }
  return { imports, rest: hdr.slice(i) };
}

const { imports, rest: helpers } = extractImportsAndRest(headerLines);

// Build export ranges [startIdx, endIdx exclusive)
const ranges = exportStarts.map((e, idx) => {
  const start = e.index;
  const end = idx + 1 < exportStarts.length ? exportStarts[idx + 1].index : lines.length;
  return { ...e, start, end, lineCount: end - start };
});

// Group consecutive exports into chunks
const chunks = [];
let current = { exports: [], start: ranges[0].start, end: ranges[0].end, lines: 0 };
for (const r of ranges) {
  if (current.exports.length > 0 && current.lines + r.lineCount > maxLines) {
    chunks.push(current);
    current = { exports: [], start: r.start, end: r.end, lines: 0 };
  }
  current.exports.push(r.name);
  current.end = r.end;
  if (current.exports.length === 1) current.start = r.start;
  current.lines += r.lineCount;
}
chunks.push(current);

fs.mkdirSync(outDir, { recursive: true });

// Shared helpers — export previously private functions/consts/types that look like helpers
let sharedBody = helpers.join("\n");
sharedBody = sharedBody
  .replace(/^(async function )/gm, "export $1")
  .replace(/^(function )/gm, "export $1")
  .replace(/^(const )/gm, "export $1")
  .replace(/^(type )/gm, "export $1")
  .replace(/^(interface )/gm, "export $1");

const importBlock = imports.join("\n");
const sharedPathFix = importBlock
  // Relative imports from parent stay same if outDir is sibling folder named after file —
  // actually outDir is dir/base so imports like ./foo become ../foo
  .replace(/from ["']\.\/([^"']+)["']/g, 'from "../$1"')
  .replace(/from ["']\.\.\/([^"']+)["']/g, (m, p) => {
    // ../x from parent stays ../x when in subfolder? Parent had ../x meaning up from dir.
    // From dir/base, need ../../x
    return `from "../../${p}"`;
  });

// Wait — rewriting ALL ../ might break @/ imports (untouched) and over-rewrite.
// Only rewrite ./ relative. For ../ already pointing outside, from subfolder need one more ../
function rewriteRelatives(importText) {
  return importText.replace(/from ["']([^"']+)["']/g, (full, spec) => {
    if (spec.startsWith("@/") || spec.startsWith("next") || !spec.startsWith(".")) return full;
    if (spec.startsWith("./")) return `from "../${spec.slice(2)}"`;
    if (spec.startsWith("../")) return `from "../${spec}"`; // add one level
    return full;
  });
}

const sharedImports = rewriteRelatives(importBlock);
const childImports = rewriteRelatives(importBlock);

const sharedContent = `/**
 * Shared helpers for ${base} modules.
 */
${sharedImports}

${sharedBody}
`.trim() + "\n";

fs.writeFileSync(path.join(outDir, "_shared.ts"), sharedContent);

const partNames = [];
const allExportNames = [];

chunks.forEach((chunk, i) => {
  const partName = `part-${String(i + 1).padStart(2, "0")}.ts`;
  partNames.push(partName);
  const body = lines.slice(chunk.start, chunk.end).join("\n").replace(/\n+$/, "\n");
  for (const name of chunk.exports) allExportNames.push(name);

  // Collect shared symbols referenced
  const sharedSymbols = [];
  const sharedExportMatches = [...sharedBody.matchAll(/^export (?:async )?function (\w+)|^export const (\w+)|^export type (\w+)|^export interface (\w+)/gm)];
  for (const m of sharedExportMatches) {
    const sym = m[1] || m[2] || m[3] || m[4];
    if (sym && new RegExp(`\\b${sym}\\b`).test(body)) sharedSymbols.push(sym);
  }

  const sharedImport =
    sharedSymbols.length > 0
      ? `import {\n  ${[...new Set(sharedSymbols)].join(",\n  ")}\n} from "./_shared";\n\n`
      : "";

  const content =
    `/**
 * ${base} — part ${i + 1}: ${chunk.exports.join(", ")}.
 */
` +
    (hasUseServer ? `"use server";\n\n` : "") +
    childImports +
    "\n\n" +
    sharedImport +
    body;

  fs.writeFileSync(path.join(outDir, partName), content);
  console.log(
    `Wrote ${partName}: ~${content.split(/\r?\n/).length} lines [${chunk.exports.join(", ")}]`
  );
});

// Barrel
const barrelExports = partNames
  .map((p, i) => {
    const names = chunks[i].exports;
    return `export {\n  ${names.join(",\n  ")}\n} from "./${base}/${p.replace(/\.ts$/, "")}";`;
  })
  .join("\n");

const barrel =
  `/**
 * ${base} — barrel re-export (implementations in ./${base}/).
 */
` +
  (hasUseServer ? `"use server";\n\n` : "\n") +
  barrelExports +
  "\n";

fs.writeFileSync(abs, barrel);
console.log("Wrote barrel", filePath);
console.log("Parts:", chunks.length, "Exports:", allExportNames.length);
