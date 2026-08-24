/**
 * Improved structural split for large action modules.
 * 1) Hoist all non-exported helpers/types to _shared
 * 2) Slice each export into domain parts under maxLines
 * 3) Rewrite ./ relatives to ../ ; inject cross-part imports when needed
 * 4) Replace original file with barrel
 *
 * Usage: node scripts/split-actions-v2.mjs <file.ts> [maxLines=420]
 */
import fs from "fs";
import path from "path";

const filePath = process.argv[2];
const maxLines = Number(process.argv[3] || 420);
if (!filePath) {
  console.error("Usage: node scripts/split-actions-v2.mjs <file.ts> [maxLines]");
  process.exit(1);
}

const abs = path.resolve(filePath);
if (!fs.existsSync(abs)) {
  console.error("Missing", abs);
  process.exit(1);
}
const original = fs.readFileSync(abs, "utf8");
const lines = original.split(/\r?\n/);
const dir = path.dirname(abs);
const base = path.basename(abs, path.extname(abs));
const outDir = path.join(dir, base);

if (fs.existsSync(outDir)) {
  console.error("Output dir already exists:", outDir);
  process.exit(1);
}

const hasUseServer = lines.some(
  (l) => l.trim() === '"use server";' || l.trim() === "'use server';"
);

// Collect top-level declarations
function isTopLevelStart(line, indentOk = true) {
  return (
    /^(export )?async function /.test(line) ||
    /^(export )?function /.test(line) ||
    /^(export )?type /.test(line) ||
    /^(export )?interface /.test(line) ||
    /^(export )?const \w+\s*[:=]/.test(line) ||
    /^(export )?class /.test(line)
  );
}

const blocks = [];
let i = 0;
// skip use server + imports
while (i < lines.length) {
  const t = lines[i].trim();
  if (
    t === '"use server";' ||
    t === "'use server';" ||
    t.startsWith("import ") ||
    t === "" ||
    t.startsWith("//") ||
    t.startsWith("/*") ||
    t.startsWith("*") ||
    t.startsWith("*/") ||
    t.startsWith("} from") ||
    (t.startsWith("type ") && lines[i].includes(" from ")) // rare
  ) {
    // continue through multiline import
    if (t.startsWith("import ") && !/from ["']/.test(lines[i])) {
      while (i < lines.length && !/from ["'].*["'];?\s*$/.test(lines[i])) i++;
    }
    i++;
    continue;
  }
  break;
}
const importEnd = i;
const importBlock = lines
  .slice(0, importEnd)
  .filter((l) => {
    const t = l.trim();
    return t !== '"use server";' && t !== "'use server';";
  })
  .join("\n")
  .trim();

function rewriteRelatives(text) {
  const bump = (spec) => {
    if (spec.startsWith("./")) return `../${spec.slice(2)}`;
    if (spec.startsWith("../")) return `../${spec}`;
    return spec;
  };
  return text
    .replace(/from ["'](\.\.?\/[^"']+)["']/g, (_, spec) => `from "${bump(spec)}"`)
    .replace(/import\(\s*["'](\.\.?\/[^"']+)["']\s*\)/g, (_, spec) => `import("${bump(spec)}")`)
    .replace(
      /import\(\s*\n\s*["'](\.\.?\/[^"']+)["']\s*\n\s*\)/g,
      (_, spec) => `import(\n  "${bump(spec)}"\n)`
    );
}

// Parse remaining into blocks by brace/depth for functions, or until next top-level for type/const
while (i < lines.length) {
  if (!lines[i].trim() || lines[i].trim().startsWith("//") || lines[i].trim().startsWith("/*")) {
    // skip comments between blocks — attach to next
    i++;
    continue;
  }
  // rewind to include preceding comment block
  let start = i;
  while (
    start > importEnd &&
    (lines[start - 1].trim().startsWith("//") ||
      lines[start - 1].trim().startsWith("*") ||
      lines[start - 1].trim().startsWith("/*") ||
      lines[start - 1].trim() === "" ||
      lines[start - 1].trim().startsWith("*/"))
  ) {
    start--;
  }
  // don't eat into previous block
  if (blocks.length) start = Math.max(start, blocks[blocks.length - 1].end);

  const line = lines[i];
  const exportMatch = line.match(
    /^export (?:async )?function (\w+)|^export type (\w+)|^export interface (\w+)|^export const (\w+)/
  );
  const privMatch = line.match(
    /^(?:async )?function (\w+)|^type (\w+)|^interface (\w+)|^const (\w+)/
  );
  const name = exportMatch
    ? exportMatch[1] || exportMatch[2] || exportMatch[3] || exportMatch[4]
    : privMatch
      ? privMatch[1] || privMatch[2] || privMatch[3] || privMatch[4]
      : `anon_${i}`;
  const isExport = Boolean(exportMatch);

  let end = i + 1;
  if (/^(export )?type /.test(line) && line.includes("=") && line.includes(";")) {
    // single-line type
  } else if (/^(export )?const /.test(line) && /[;=]\s*$/.test(line) && !line.includes("{") && !line.includes("(")) {
    // simple const
  } else {
    // brace matching
    let depth = 0;
    let started = false;
    let inTypeAlias = /^(export )?type /.test(line);
    for (let j = i; j < lines.length; j++) {
      const L = lines[j];
      for (const ch of L) {
        if (ch === "{" || ch === "(") {
          depth++;
          started = true;
        } else if (ch === "}" || ch === ")") {
          depth--;
        }
      }
      end = j + 1;
      if (inTypeAlias && /;\s*$/.test(L) && depth <= 0) break;
      if (started && depth <= 0) break;
      // function without braces yet (signature multiline)
    }
  }

  blocks.push({
    name,
    isExport,
    start,
    end,
    text: lines.slice(start, end).join("\n"),
  });
  i = end;
}

const helpers = blocks.filter((b) => !b.isExport);
const exports = blocks.filter((b) => b.isExport);

if (exports.length < 2) {
  console.error("Need >=2 exports, found", exports.length);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

let sharedBody = helpers
  .map((h) =>
    h.text
      .replace(/^(async function )/gm, "export $1")
      .replace(/^(function )/gm, "export $1")
      .replace(/^(const )/gm, "export $1")
      .replace(/^(type )/gm, "export $1")
      .replace(/^(interface )/gm, "export $1")
  )
  .join("\n\n");

const sharedImports = rewriteRelatives(importBlock);
fs.writeFileSync(
  path.join(outDir, "_shared.ts"),
  `/**
 * Shared helpers for ${base}.
 */
${sharedImports ? sharedImports + "\n\n" : ""}${sharedBody}\n`
);

// Group exports
const chunks = [];
let cur = { exports: [], texts: [], lines: 0 };
for (const e of exports) {
  const n = e.text.split(/\r?\n/).length;
  if (cur.exports.length > 0 && cur.lines + n > maxLines) {
    chunks.push(cur);
    cur = { exports: [], texts: [], lines: 0 };
  }
  cur.exports.push(e.name);
  cur.texts.push(e.text);
  cur.lines += n;
}
chunks.push(cur);

const sharedSyms = [...sharedBody.matchAll(/^export (?:async )?function (\w+)|^export const (\w+)|^export type (\w+)|^export interface (\w+)/gm)].map(
  (m) => m[1] || m[2] || m[3] || m[4]
);

const partFiles = [];
chunks.forEach((chunk, idx) => {
  const partName = `part-${String(idx + 1).padStart(2, "0")}.ts`;
  partFiles.push({ partName, exports: chunk.exports });
  const body = chunk.texts.join("\n\n");
  const neededShared = sharedSyms.filter((s) => new RegExp(`\\b${s}\\b`).test(body));
  const sharedImport =
    neededShared.length > 0
      ? `import {\n  ${[...new Set(neededShared)].join(",\n  ")}\n} from "./_shared";\n\n`
      : "";

  // Cross-part: if body references other exported names not in this chunk
  const otherExports = exports.map((e) => e.name).filter((n) => !chunk.exports.includes(n));
  const crossNeeded = otherExports.filter((n) => new RegExp(`\\b${n}\\b`).test(body));
  let crossImport = "";
  for (const name of crossNeeded) {
    const owner = chunks.findIndex((c) => c.exports.includes(name));
    if (owner >= 0 && owner !== idx) {
      const pf = `part-${String(owner + 1).padStart(2, "0")}`;
      crossImport += `import { ${name} } from "./${pf}";\n`;
    }
  }
  if (crossImport) crossImport += "\n";

  const content =
    `/**
 * ${base} — part ${idx + 1}: ${chunk.exports.join(", ")}.
 */
` +
    (hasUseServer ? `"use server";\n\n` : "") +
    crossImport +
    rewriteRelatives(importBlock) +
    "\n\n" +
    sharedImport +
    body +
    "\n";

  fs.writeFileSync(path.join(outDir, partName), content);
  console.log(`Wrote ${partName} (~${content.split(/\n/).length} lines): ${chunk.exports.join(", ")}`);
});

const barrel =
  `/**
 * ${base} — barrel re-export (see ./${base}/).
 */
` +
  (hasUseServer ? `"use server";\n\n` : "\n") +
  partFiles
    .map(
      (p) =>
        `export {\n  ${p.exports.join(",\n  ")}\n} from "./${base}/${p.partName.replace(/\.ts$/, "")}";`
    )
    .join("\n") +
  "\n";

fs.writeFileSync(abs, barrel);
console.log("Barrel written. Parts:", partFiles.length, "Helpers:", helpers.length);
