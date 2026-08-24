/**
 * Split large action files by export boundaries only (no brace parsing).
 * Helpers between exports stay with the following export; a second pass can
 * move duplicated helpers — for now prefer correct over clever.
 *
 * Usage: node scripts/split-actions-by-export.mjs <file.ts> [maxLines=450]
 */
import fs from "fs";
import path from "path";

const filePath = process.argv[2];
const maxLines = Number(process.argv[3] || 450);
if (!filePath) {
  console.error("Usage: node scripts/split-actions-by-export.mjs <file.ts> [maxLines]");
  process.exit(1);
}

const abs = path.resolve(filePath);
const original = fs.readFileSync(abs, "utf8");
const lines = original.split(/\r?\n/);
const dir = path.dirname(abs);
const base = path.basename(abs, path.extname(abs));
const outDir = path.join(dir, base);

if (fs.existsSync(outDir)) {
  console.error("Exists:", outDir);
  process.exit(1);
}

const hasUseServer = lines.some(
  (l) => l.trim() === '"use server";' || l.trim() === "'use server';"
);

const exports = [];
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(
    /^export (?:async )?function (\w+)|^export type (\w+)|^export interface (\w+)|^export const (\w+)/
  );
  if (m) {
    exports.push({
      name: m[1] || m[2] || m[3] || m[4],
      line: i + 1,
      index: i,
      isType: Boolean(m[2] || m[3]),
    });
  }
}

if (exports.length < 2) {
  console.error("Need >=2 exports, found", exports.length);
  process.exit(1);
}

const firstExportIdx = exports[0].index;
const header = lines.slice(0, firstExportIdx);
const importBlock = header
  .filter((l) => {
    const t = l.trim();
    return t !== '"use server";' && t !== "'use server';";
  })
  .join("\n")
  .trim();

function bumpRelatives(text) {
  const bump = (spec) => {
    if (spec.startsWith("./")) return `../${spec.slice(2)}`;
    if (spec.startsWith("../")) return `../${spec}`;
    return spec;
  };
  return text
    .replace(/from ["'](\.\.?\/[^"']+)["']/g, (_, s) => `from "${bump(s)}"`)
    .replace(/import\(\s*["'](\.\.?\/[^"']+)["']\s*\)/g, (_, s) => `import("${bump(s)}")`)
    .replace(
      /import\(\s*\n\s*["'](\.\.?\/[^"']+)["']\s*\n\s*\)/g,
      (_, s) => `import(\n  "${bump(s)}"\n)`
    );
}

// Ranges: from export start to next export (helpers before first stay in header)
const ranges = exports.map((e, idx) => {
  const start = e.index;
  const end = idx + 1 < exports.length ? exports[idx + 1].index : lines.length;
  return { ...e, start, end, size: end - start };
});

// Prepend non-import header helpers (after imports) into first range conceptually via _shared
let importEnd = 0;
for (let i = 0; i < header.length; i++) {
  const t = header[i].trim();
  if (
    t.startsWith("import ") ||
    t === "" ||
    t.startsWith("//") ||
    t.startsWith("/*") ||
    t.startsWith("*") ||
    t.startsWith("*/") ||
    (!t.startsWith("import") && importEnd === 0 && i === 0)
  ) {
    if (t.startsWith("import ")) {
      // consume multiline
      importEnd = i + 1;
      while (
        importEnd < header.length &&
        !/from ["'].*["'];?\s*$/.test(header[importEnd - 1])
      ) {
        importEnd++;
      }
      continue;
    }
    if (t.startsWith("import ") || (importEnd > 0 && (t.startsWith("}") || t.startsWith("type ")))) {
      importEnd = i + 1;
      continue;
    }
  }
}
// Simpler: header lines that are imports vs rest
const headerImports = [];
const headerHelpers = [];
let mode = "import";
for (let i = 0; i < header.length; i++) {
  const t = header[i].trim();
  if (mode === "import") {
    if (
      t.startsWith("import ") ||
      t === "" ||
      t.startsWith("//") ||
      t.startsWith("/*") ||
      t.startsWith("*") ||
      t.startsWith("*/") ||
      /^\} from /.test(t) ||
      (headerImports.length && !t.startsWith("export") && !t.startsWith("function") && !t.startsWith("const") && !t.startsWith("type") && !t.startsWith("async") && !t.startsWith("interface"))
    ) {
      if (t.startsWith("import ") || (headerImports.length && !/^(function|const|type|interface|async)/.test(t))) {
        headerImports.push(header[i]);
        continue;
      }
    }
    if (t === "" && headerImports.length === 0) continue;
    mode = "helper";
  }
  if (mode === "helper") headerHelpers.push(header[i]);
}

const chunks = [];
let cur = { exports: [], types: [], start: ranges[0].start, end: ranges[0].end, size: 0 };
for (const r of ranges) {
  if (cur.exports.length + cur.types.length > 0 && cur.size + r.size > maxLines) {
    chunks.push(cur);
    cur = { exports: [], types: [], start: r.start, end: r.end, size: 0 };
  }
  if (r.isType) cur.types.push(r.name);
  else cur.exports.push(r.name);
  if (cur.exports.length + cur.types.length === 1) cur.start = r.start;
  cur.end = r.end;
  cur.size += r.size;
}
chunks.push(cur);

fs.mkdirSync(outDir, { recursive: true });

const sharedHelpers = headerHelpers.join("\n").trim();
let sharedPath = null;
if (sharedHelpers) {
  sharedPath = "_shared.ts";
  const promoted = sharedHelpers
    .replace(/^(async function )/gm, "export $1")
    .replace(/^(function )/gm, "export $1")
    .replace(/^(const )/gm, "export $1")
    .replace(/^(type )/gm, "export $1")
    .replace(/^(interface )/gm, "export $1");
  fs.writeFileSync(
    path.join(outDir, sharedPath),
    `/**\n * Shared helpers for ${base}.\n */\n${bumpRelatives(headerImports.join("\n"))}\n\n${promoted}\n`
  );
  console.log("Wrote _shared.ts", promoted.split(/\n/).length, "lines");
}

const rewrittenImports = bumpRelatives(headerImports.join("\n"));
const partMeta = [];

chunks.forEach((chunk, idx) => {
  const partName = `part-${String(idx + 1).padStart(2, "0")}.ts`;
  const body = lines.slice(chunk.start, chunk.end).join("\n").trimEnd() + "\n";
  // Detect shared symbols used
  let sharedImport = "";
  if (sharedPath && sharedHelpers) {
    const syms = [
      ...sharedHelpers.matchAll(/^(?:async )?function (\w+)|^const (\w+)|^type (\w+)|^interface (\w+)/gm),
    ].map((m) => m[1] || m[2] || m[3] || m[4]);
    const used = [...new Set(syms.filter((s) => new RegExp(`\\b${s}\\b`).test(body)))];
    if (used.length) {
      sharedImport = `import {\n  ${used.join(",\n  ")}\n} from "./_shared";\n\n`;
    }
  }

  // Cross-part imports for referenced sibling exports
  const allNames = exports.map((e) => e.name);
  const own = new Set([...chunk.exports, ...chunk.types]);
  let cross = "";
  for (const name of allNames) {
    if (own.has(name)) continue;
    if (!new RegExp(`\\b${name}\\b`).test(body)) continue;
    const ownerIdx = chunks.findIndex(
      (c) => c.exports.includes(name) || c.types.includes(name)
    );
    if (ownerIdx >= 0 && ownerIdx !== idx) {
      const pf = `part-${String(ownerIdx + 1).padStart(2, "0")}`;
      cross += `import { ${name} } from "./${pf}";\n`;
    }
  }
  if (cross) cross += "\n";

  const content =
    `/**\n * ${base} — part ${idx + 1}: ${[...chunk.exports, ...chunk.types].join(", ")}.\n */\n` +
    (hasUseServer ? `"use server";\n\n` : "") +
    cross +
    rewrittenImports +
    "\n\n" +
    sharedImport +
    body;

  fs.writeFileSync(path.join(outDir, partName), content);
  partMeta.push({ partName, exports: chunk.exports, types: chunk.types });
  console.log(
    `Wrote ${partName} (~${content.split(/\n/).length}): ${[...chunk.exports, ...chunk.types].join(", ")}`
  );
});

const barrelLines = [
  `/**\n * ${base} — barrel re-export (see ./${base}/).\n */`,
  hasUseServer ? `"use server";\n` : "",
];
for (const p of partMeta) {
  if (p.types.length) {
    barrelLines.push(
      `export type { ${p.types.join(", ")} } from "./${base}/${p.partName.replace(/\.ts$/, "")}";`
    );
  }
  if (p.exports.length) {
    barrelLines.push(
      `export {\n  ${p.exports.join(",\n  ")}\n} from "./${base}/${p.partName.replace(/\.ts$/, "")}";`
    );
  }
}
fs.writeFileSync(abs, barrelLines.filter(Boolean).join("\n") + "\n");
console.log("Barrel OK. Parts:", partMeta.length, "Exports:", exports.length);
